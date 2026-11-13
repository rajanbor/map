/**
 * Static security audit for skill content. Skills are untrusted input: an agent
 * that loads a skill follows its instructions and may run its bundled scripts.
 *
 * The audit has two parts with different guarantees:
 *
 *   Structure (enforced). Unsafe paths, symlinks, submodules, special files, and
 *   oversized content make a skill uninstallable. These checks are exact.
 *
 *   Content (heuristic). Pattern rules flag instructions and commands that deserve a
 *   human look: pipe-to-shell installers, destructive commands, credential access,
 *   hidden Unicode, prompt-injection phrasing, and broad tool grants. A clean result
 *   means "no known pattern matched", never "safe".
 *
 * MAP never executes anything it audits.
 */

import type { CatalogSkill } from "./catalog.ts";
import type { SnapshotEntry } from "./source.ts";

export type Severity = "block" | "high" | "medium" | "low" | "info";

export interface Finding {
  readonly severity: Severity;
  readonly rule: string;
  readonly file: string;
  readonly line?: number;
  readonly message: string;
  /** Short excerpt with secret-looking tokens redacted. */
  readonly evidence?: string;
}

export interface AuditReport {
  readonly skill: string;
  readonly findings: readonly Finding[];
  /** Structural problems: the skill cannot be installed. */
  readonly blocked: boolean;
  readonly capabilities: {
    /** Files that are executable or look like runnable scripts. */
    readonly scripts: readonly string[];
    /** Network endpoints referenced by scripts. */
    readonly network: readonly string[];
    readonly allowedTools?: string;
  };
  /** Approvals needed before installation: "scripts" and/or "risky". */
  readonly approvals: ReadonlyArray<"scripts" | "risky">;
  readonly limitations: readonly string[];
}

export interface AuditFile {
  readonly entry: SnapshotEntry;
  /** Undefined for entries that are not regular files. */
  readonly content?: Buffer;
}

export const LIMITS = { maxFiles: 1000, maxFileSize: 2 * 1024 * 1024, maxTotalSize: 20 * 1024 * 1024 } as const;

/**
 * Shell-type files are scripts wherever they are. Other languages (a `.py` or `.js`
 * template under `assets/`) count only when executable or under `scripts/`, the
 * Agent Skills directory for code an agent runs.
 */
const SHELL_EXTENSIONS = /\.(?:sh|bash|zsh|fish|ps1|psm1|bat|cmd|command)$/i;

interface ContentRule {
  readonly rule: string;
  readonly severity: Severity;
  readonly pattern: RegExp;
  readonly message: string;
  /** Apply only to script files (true) or to all text files (false). */
  readonly scriptsOnly?: boolean;
}

const CONTENT_RULES: readonly ContentRule[] = [
  { rule: "pipe-to-shell", severity: "high", pattern: /\b(?:curl|wget|iwr|Invoke-WebRequest)\b[^\n|]*\|\s*(?:sudo\s+)?(?:ba|z|da)?sh\b|\b(?:curl|wget)\b[^\n|]*\|\s*(?:python3?|node|perl|ruby)\b/i, message: "downloads and executes remote code" },
  { rule: "encoded-execution", severity: "high", pattern: /base64\s+(?:-d|--decode)[^\n]*\|\s*(?:ba|z)?sh|\beval\s*\(\s*(?:atob|Buffer\.from|base64)|exec\(\s*(?:base64\.b64decode|codecs\.decode)/i, message: "decodes and executes hidden content" },
  { rule: "destructive-command", severity: "high", pattern: /\brm\s+-[a-zA-Z]*r[a-zA-Z]*\s+(?:-[a-zA-Z]+\s+)*(?:\/|~|\$HOME|\/\*)(?:\s|$|["'])|\bmkfs\.|\bdd\s+if=[^\n]*of=\/dev\/|:\(\)\s*\{\s*:\|:&\s*\};:/, message: "destructive filesystem command" },
  { rule: "secret-exfiltration", severity: "high", pattern: /(?:printenv|\benv\b|process\.env|os\.environ|\.ssh\/|\.aws\/credentials|\.netrc)[^\n]{0,120}\b(?:curl|wget|nc|fetch|requests\.post|http\.client)\b|\b(?:curl|wget)\b[^\n]{0,120}(?:\$\(printenv|\$\(env\)|\.ssh\/id_|\.aws\/credentials)/i, message: "may send secrets or environment data to the network" },
  { rule: "prompt-injection", severity: "high", pattern: /\b(?:ignore|disregard|forget)\s+(?:all\s+|any\s+)?(?:previous|prior|above|earlier|system)\s+(?:instructions|prompts|rules)\b|\bdo\s+not\s+(?:tell|inform|show)\s+the\s+user\b|\bwithout\s+(?:asking|telling|notifying)\s+the\s+user\b|\bhide\s+(?:this|these|it)\s+from\s+the\s+user\b/i, message: "instruction tries to override the agent's rules or hide actions from the user" },
  { rule: "credential-access", severity: "medium", pattern: /~\/\.ssh\/|\bid_(?:rsa|ed25519)\b|\.aws\/credentials|\.docker\/config\.json|\.npmrc\b|\.netrc\b|security\s+find-(?:generic|internet)-password|\bkeychain\b/i, message: "references credential files or stores" },
  { rule: "privilege-escalation", severity: "medium", pattern: /\bsudo\s+(?!-n\s+true)\S|\bchmod\s+(?:-R\s+)?(?:777|a\+rwx)\b|\bchown\s+-R\s+root\b/, message: "requests elevated privileges or world-writable permissions", scriptsOnly: true },
  { rule: "persistence", severity: "medium", pattern: /\bcrontab\s+-|\/etc\/cron|LaunchAgents|\.bashrc|\.zshrc|\.profile\b|systemctl\s+enable/, message: "modifies shell startup files or schedules tasks", scriptsOnly: true },
];

const HIDDEN_UNICODE = /[\u200B-\u200F\u202A-\u202E\u2060-\u2064\u2066-\u2069\uFEFF]/;
const URL = /\bhttps?:\/\/[^\s"'`)<>]+/g;
const SECRET = /\b(?:sk-[A-Za-z0-9_-]{10,}|gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|xox[abpr]-[A-Za-z0-9-]{10,}|AKIA[0-9A-Z]{16}|AIza[0-9A-Za-z_-]{30,})\b/g;

/** Safe relative path inside a skill: no absolute, parent, empty, or control segments. */
export function isSafeRelativePath(path: string): boolean {
  if (path === "" || path.length > 512 || path.startsWith("/") || path.includes("\\") || /^[A-Za-z]:/.test(path)) return false;
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001F\u007F]/.test(path)) return false;
  return path.split("/").every((segment) => segment !== "" && segment !== "." && segment !== "..");
}

export function auditSkill(skill: Pick<CatalogSkill, "name" | "errors" | "allowedTools">, files: readonly AuditFile[]): AuditReport {
  const findings: Finding[] = [];
  const scripts: string[] = [];
  const network = new Set<string>();

  for (const error of skill.errors) {
    findings.push({ severity: "block", rule: "invalid-metadata", file: "SKILL.md", message: error });
  }
  if (files.length > LIMITS.maxFiles) {
    findings.push({ severity: "block", rule: "too-many-files", file: ".", message: `${files.length} files exceed the limit of ${LIMITS.maxFiles}` });
  }
  const total = files.reduce((sum, file) => sum + file.entry.size, 0);
  if (total > LIMITS.maxTotalSize) {
    findings.push({ severity: "block", rule: "too-large", file: ".", message: `${total} bytes exceed the limit of ${LIMITS.maxTotalSize}` });
  }

  for (const { entry, content } of files) {
    if (!isSafeRelativePath(entry.path)) {
      findings.push({ severity: "block", rule: "unsafe-path", file: entry.path, message: "path escapes the skill directory or contains control characters" });
      continue;
    }
    if (entry.kind === "symlink") {
      findings.push({ severity: "block", rule: "symlink", file: entry.path, message: "symbolic links are not installed; they can point outside the project" });
      continue;
    }
    if (entry.kind === "submodule" || entry.kind === "other") {
      findings.push({ severity: "block", rule: "special-file", file: entry.path, message: `${entry.kind} entries are not supported` });
      continue;
    }
    if (entry.size > LIMITS.maxFileSize) {
      findings.push({ severity: "block", rule: "file-too-large", file: entry.path, message: `${entry.size} bytes exceed the per-file limit of ${LIMITS.maxFileSize}` });
      continue;
    }

    const isScript = entry.kind === "executable" || SHELL_EXTENSIONS.test(entry.path) || entry.path.startsWith("scripts/");
    if (isScript) scripts.push(entry.path);
    if (content === undefined || content.includes(0)) continue; // binary

    const text = content.toString("utf8");
    const lines = text.split("\n");
    lines.forEach((line, index) => {
      if (HIDDEN_UNICODE.test(line.replace(/^\uFEFF/, ""))) {
        findings.push({ severity: "high", rule: "hidden-unicode", file: entry.path, line: index + 1, message: "contains invisible or bidirectional control characters that can hide instructions", evidence: excerpt(line.replace(HIDDEN_UNICODE, "⟨U+hidden⟩")) });
      }
      for (const rule of CONTENT_RULES) {
        if (rule.scriptsOnly === true && !isScript) continue;
        if (rule.pattern.test(line)) {
          findings.push({ severity: rule.severity, rule: rule.rule, file: entry.path, line: index + 1, message: rule.message, evidence: excerpt(line) });
        }
      }
      if (isScript) for (const match of line.matchAll(URL)) network.add(match[0]);
    });
  }

  if (scripts.length > 0) {
    findings.push({
      severity: "info",
      rule: "bundled-scripts",
      file: scripts[0]!,
      message: `${scripts.length} script file(s) bundled; MAP never runs them, but an agent following SKILL.md may`,
    });
  }
  if (skill.allowedTools !== undefined) {
    const broad = /(?:^|\s)(?:Bash|Shell|\*)(?:\s|$)|Bash\(\*\)/.test(skill.allowedTools);
    findings.push({
      severity: broad ? "medium" : "info",
      rule: "allowed-tools",
      file: "SKILL.md",
      message: broad
        ? `pre-approves broad tool access (${skill.allowedTools}); agents that honor allowed-tools skip their usual prompt`
        : `pre-approves tools: ${skill.allowedTools}`,
    });
  }

  const order: Record<Severity, number> = { block: 0, high: 1, medium: 2, low: 3, info: 4 };
  findings.sort((a, b) => order[a.severity] - order[b.severity] || a.file.localeCompare(b.file) || (a.line ?? 0) - (b.line ?? 0) || a.rule.localeCompare(b.rule));

  const approvals: Array<"scripts" | "risky"> = [];
  if (scripts.length > 0) approvals.push("scripts");
  if (findings.some((finding) => finding.severity === "high")) approvals.push("risky");

  return {
    skill: skill.name,
    findings,
    blocked: findings.some((finding) => finding.severity === "block"),
    capabilities: {
      scripts: scripts.sort(),
      network: [...network].sort(),
      ...(skill.allowedTools !== undefined ? { allowedTools: skill.allowedTools } : {}),
    },
    approvals,
    limitations: [
      "Content checks are pattern heuristics; a skill with no findings is not proven safe.",
      "Natural-language instructions can ask an agent to do harmful things in ways no pattern catches; read SKILL.md before approving.",
    ],
  };
}

function excerpt(line: string): string {
  const redacted = line.trim().replace(SECRET, "[redacted]");
  return redacted.length > 160 ? `${redacted.slice(0, 157)}…` : redacted;
}
