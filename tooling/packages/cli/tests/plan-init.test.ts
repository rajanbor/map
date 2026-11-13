import { describe, it, expect, afterEach } from "vitest";
import { readFile, readdir, rm, stat, symlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { runCli } from "../src/cli/runner.ts";
import { ownershipOf } from "../src/compiler/index.ts";
import { PROFILES, parseProfileList } from "../src/profiles/index.ts";
import { parseConfig } from "../src/config/index.ts";
import { unsafePatternPaths } from "../src/cli/commands/add.ts";
import { execFileSync } from "node:child_process";
import { capture } from "./helpers.ts";
import { gitRepo, removeTempDirs, skillMd, tempDir, writeTree } from "./skills-helpers.ts";

afterEach(removeTempDirs);

// Parsed CLI JSON; tests index into it freely.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = any;

async function cli(cwd: string, ...argv: string[]): Promise<{ code: number; out: string; json: () => Json }> {
  const reporter = capture();
  const code = await runCli(argv, { cwd, reporter });
  const out = reporter.lines.join("\n");
  return { code, out, json: () => JSON.parse(out) };
}

/** A Next.js-like project whose workspace points at a local fixture skill source. */
async function nextProject(extra: Record<string, string> = {}): Promise<{ root: string; sha: string }> {
  const repo = await gitRepo({
    "web/design-guardrails/SKILL.md": skillMd("design-guardrails", "Keeps UI consistent with DESIGN.md."),
    "web/design-guardrails/scripts/scan.py": "print('scan')\n",
    "dev/python-project/SKILL.md": skillMd("python-project"),
  });
  const root = await tempDir("map-plan-");
  await writeTree(root, {
    "package.json": JSON.stringify({ dependencies: { next: "15", react: "19" }, devDependencies: { typescript: "5" } }),
    "tsconfig.json": "{}",
    ".github/workflows/ci.yml": "on: push",
    ...extra,
  });
  expect((await cli(root, "init", "--yes", "--no-skills", "--agents", "claude,codex")).code).toBe(0);
  const configPath = join(root, ".map/map.config.json");
  const config = JSON.parse(await readFile(configPath, "utf8"));
  config.skills = { sources: [{ id: "fixture", type: "git", url: repo.url, ref: "main" }] };
  await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`);
  return { root, sha: repo.sha };
}

describe("map plan", () => {
  it("emits a versioned JSON plan with evidence-backed skill recommendations and writes nothing", async () => {
    const { root, sha } = await nextProject();
    const before = await readdir(root);
    const result = await cli(root, "plan", "--json", "--profile", "webapp,security-first");
    expect(result.code).toBe(0);
    const plan = result.json();
    expect(plan).toMatchObject({ schemaVersion: 1, kind: "map.plan", workspace: "existing" });
    expect(plan.project.frameworks).toEqual(["nextjs", "react"]);
    expect(plan.agents).toEqual({ detected: ["claude", "codex"], selected: ["claude", "codex"], selectedBy: "config" });
    expect(plan.profiles.selected).toEqual(["webapp", "security-first"]);
    expect(plan.skills.sources).toEqual([expect.objectContaining({ id: "fixture", revision: sha })]);
    const skill = plan.skills.recommendations[0];
    expect(skill).toMatchObject({ name: "design-guardrails", installed: false, approvals: ["scripts"], scripts: ["scripts/scan.py"] });
    expect(skill.evidence[0]).toMatchObject({ signal: "nextjs", file: "package.json", certainty: "confirmed" });
    expect(skill.destinations.map((d: Json) => d.path)).toEqual([".claude/skills/design-guardrails", ".agents/skills/design-guardrails"]);
    expect(plan.skills.gaps.map((g: Json) => g.need)).toContain("a code review / pull request skill");
    expect(plan.patterns.map((p: Json) => p.id)).toEqual(expect.arrayContaining(["security/prompt-injection-defense", "security/least-privilege-tool-access"]));
    expect(plan.approvals.join("\n")).toContain("--allow-scripts");
    expect(await readdir(root)).toEqual(before);
  });

  it("labels skills that no configured source provides as unavailable", async () => {
    const { root } = await nextProject({ "Cargo.toml": "[package]\nname = \"x\"\n" });
    const plan = (await cli(root, "plan", "--json")).json();
    expect(plan.skills.unavailable).toEqual([{ name: "rust-project", reason: "no configured skill source provides this skill" }]);
  });

  it("works fully offline with --no-skills and reports the limitation", async () => {
    const root = await tempDir("map-plan-offline-");
    const plan = (await cli(root, "plan", "--json", "--no-skills")).json();
    expect(plan.workspace).toBe("new");
    expect(plan.agents.selectedBy).toBe("default");
    expect(plan.skills.recommendations).toEqual([]);
    expect(plan.limitations.join(" ")).toContain("--no-skills");
    expect(plan.changes.map((c: Json) => c.path)).toEqual([".map/", ".map/map.config.json", "CLAUDE.md", "AGENTS.md"]);
  });

  it("rejects unknown agents and profiles with exit code 1", async () => {
    const root = await tempDir("map-plan-bad-");
    expect((await cli(root, "plan", "--agents", "vim")).out).toContain("unknown agent(s): vim");
    expect((await cli(root, "plan", "--profile", "nope")).code).toBe(1);
  });
});

describe("map init", () => {
  it("preserves a hand-written CLAUDE.md, generates the rest, and is idempotent", async () => {
    const root = await tempDir("map-init-");
    await writeFile(join(root, "CLAUDE.md"), "# My rules\n");
    const first = await cli(root, "init", "--yes", "--no-skills", "--agents", "claude,codex,cursor");
    expect(first.code).toBe(0);
    expect(first.out).toContain("kept CLAUDE.md");
    expect(await readFile(join(root, "CLAUDE.md"), "utf8")).toBe("# My rules\n");
    expect(ownershipOf(await readFile(join(root, "AGENTS.md"), "utf8"))).toBe("generated");
    expect(ownershipOf(await readFile(join(root, ".cursor/rules/map.mdc"), "utf8"))).toBe("generated");

    const config = parseConfig(await readFile(join(root, ".map/map.config.json"), "utf8"));
    expect(config.version).toBe(4);
    expect(config.agents).toEqual(["claude", "codex", "cursor"]);
    expect(Object.keys(config.targets ?? {})).toEqual(["claude", "agents", "cursor"]);

    const snapshot = async () => Promise.all([".map/map.config.json", "AGENTS.md", ".cursor/rules/map.mdc"].map((f) => readFile(join(root, f), "utf8")));
    const before = await snapshot();
    const second = await cli(root, "init", "--yes", "--no-skills");
    expect(second.code).toBe(0);
    expect(second.out).toContain("Nothing needed to change.");
    expect(await snapshot()).toEqual(before);
  });

  it("applies profiles as editable documents and extends an existing config without removing entries", async () => {
    const { root } = await nextProject();
    const result = await cli(root, "init", "--yes", "--no-skills", "--profile", "webapp,rust", "--agents", "gemini");
    expect(result.code).toBe(0);
    const doc = await readFile(join(root, ".map/profiles/webapp.md"), "utf8");
    expect(doc).toContain("map skills add design-guardrails");
    expect(await readFile(join(root, "AGENTS.md"), "utf8")).toContain("Web application conventions");
    await writeFile(join(root, ".map/profiles/webapp.md"), "# mine\n");
    await cli(root, "init", "--yes", "--no-skills", "--profile", "webapp");
    expect(await readFile(join(root, ".map/profiles/webapp.md"), "utf8")).toBe("# mine\n");

    const config = JSON.parse(await readFile(join(root, ".map/map.config.json"), "utf8"));
    expect(config.agents).toEqual(["claude", "codex", "gemini"]);
    expect(config.profiles).toEqual(["webapp", "rust"]);
    expect(config.skills.sources[0].id).toBe("fixture");
    expect(await readFile(join(root, "GEMINI.md"), "utf8")).toContain("Generated by MAP");
  });

  it("installs only the skills the user names, with explicit script approval", async () => {
    const { root } = await nextProject();
    const denied = await cli(root, "init", "--yes", "--skills", "recommended");
    expect(denied.code).toBe(1);
    expect(denied.out).toContain("--allow-scripts");
    await expect(stat(join(root, ".claude/skills/design-guardrails"))).rejects.toThrow();

    const approved = await cli(root, "init", "--yes", "--skills", "design-guardrails", "--allow-scripts");
    expect(approved.code).toBe(0);
    expect(await readdir(join(root, ".claude/skills/design-guardrails"))).toEqual(["SKILL.md", "scripts"]);
    expect(await readdir(join(root, ".agents/skills"))).toEqual(["design-guardrails"]);
    const lock = JSON.parse(await readFile(join(root, ".map/skills.lock.json"), "utf8"));
    expect(Object.keys(lock.skills)).toEqual(["design-guardrails"]);
  });

  it("produces a machine-readable result with --json", async () => {
    const root = await tempDir("map-init-json-");
    const result = await cli(root, "init", "--json", "--no-skills");
    expect(result.code).toBe(0);
    const payload = result.json();
    expect(payload.kind).toBe("map.init-result");
    expect(payload.created).toContain(".map/map.config.json");
    expect(payload.problems).toEqual([]);
  });
});

describe("map skills commands", () => {
  it("lists, searches, suggests, adds, audits, and removes through the CLI", async () => {
    const { root } = await nextProject();
    const list = await cli(root, "skills", "list", "--json");
    expect(list.code).toBe(0);
    expect(list.json().skills.map((s: Json) => s.name)).toEqual(["design-guardrails", "python-project"]);

    expect((await cli(root, "skills", "search", "python")).out).toContain("python-project");
    const suggest = (await cli(root, "skills", "suggest", "--json")).json();
    expect(suggest.recommendations.map((r: Json) => r.name)).toEqual(["design-guardrails"]);

    const info = (await cli(root, "skills", "info", "design-guardrails", "--json")).json();
    expect(info.audit.approvals).toEqual(["scripts"]);

    expect((await cli(root, "skills", "add", "python-project", "--agents", "claude")).code).toBe(0);
    expect((await cli(root, "skills", "add", "nope")).code).toBe(1);
    expect((await cli(root, "skills", "audit")).code).toBe(0);
    expect((await cli(root, "skills", "update", "--json")).json().results[0].status).toBe("unchanged");
    expect((await cli(root, "skills", "install")).code).toBe(0);
    expect((await cli(root, "skills", "remove", "python-project")).code).toBe(0);
    await expect(stat(join(root, ".claude/skills/python-project"))).rejects.toThrow();
  });

  it("makes map doctor fail when an installed skill drifts from the lockfile", async () => {
    const { root } = await nextProject();
    await cli(root, "skills", "add", "python-project", "--agents", "claude");
    expect((await cli(root, "doctor")).out).toContain("1 installed skill location(s) match skills.lock.json");
    await writeFile(join(root, ".claude/skills/python-project/SKILL.md"), "tampered");
    const doctor = await cli(root, "doctor");
    expect(doctor.code).toBe(1);
    expect(doctor.out).toContain(".claude/skills/python-project (modified)");
  });

  it("needs a workspace for commands that write the lockfile", async () => {
    const root = await tempDir("map-skills-nows-");
    const result = await cli(root, "skills", "add", "x");
    expect(result.code).toBe(1);
    expect(result.out).toContain("Run 'map init' first");
  });
});

describe("map sync ownership", () => {
  async function workspace(): Promise<string> {
    const root = await tempDir("map-sync-own-");
    await cli(root, "init", "--yes", "--no-skills", "--agents", "claude,codex");
    return root;
  }

  it("detects hand edits to generated files and refuses to overwrite them", async () => {
    const root = await workspace();
    expect((await cli(root, "sync", "--check")).code).toBe(0);
    await writeFile(join(root, "AGENTS.md"), `${await readFile(join(root, "AGENTS.md"), "utf8")}\nmanual edit\n`);
    expect(ownershipOf(await readFile(join(root, "AGENTS.md"), "utf8"))).toBe("modified");
    const sync = await cli(root, "sync");
    expect(sync.code).toBe(1);
    expect(await readFile(join(root, "AGENTS.md"), "utf8")).toContain("manual edit");

    const forced = await cli(root, "sync", "--force", "--json");
    expect(forced.code).toBe(0);
    const backups = forced.json().backups as string[];
    expect(backups).toHaveLength(1);
    expect(await readFile(join(root, backups[0]!), "utf8")).toContain("manual edit");
    expect(ownershipOf(await readFile(join(root, "AGENTS.md"), "utf8"))).toBe("generated");
  });

  it("reports stale outputs in --check mode without writing", async () => {
    const root = await workspace();
    await writeFile(join(root, ".map/architecture/new.md"), "# New section\n");
    const check = await cli(root, "sync", "--check");
    expect(check.code).toBe(1);
    expect(check.out).toContain("stale AGENTS.md");
    expect(await readFile(join(root, "AGENTS.md"), "utf8")).not.toContain("New section");
  });

  it("regenerates legacy MAP output without a hash, and never writes through a symlink", async () => {
    const root = await workspace();
    await writeFile(join(root, "AGENTS.md"), "<!--\n  Generated by MAP. Do not edit directly.\n-->\nold\n");
    expect(ownershipOf(await readFile(join(root, "AGENTS.md"), "utf8"))).toBe("legacy");
    const target = await tempDir("map-sync-target-");
    await writeFile(join(target, "real.md"), "outside");
    await rm(join(root, "CLAUDE.md"));
    await symlink(join(target, "real.md"), join(root, "CLAUDE.md"));
    const sync = await cli(root, "sync", "--force");
    expect(sync.code).toBe(1);
    expect(sync.out).toContain("symlink");
    expect(await readFile(join(target, "real.md"), "utf8")).toBe("outside");
    expect(ownershipOf(await readFile(join(root, "AGENTS.md"), "utf8"))).toBe("generated");
  });
});

describe("profiles", () => {
  it("reference only pattern ids that exist in the bundled registry", async () => {
    const registry = JSON.parse(await readFile(join(import.meta.dirname, "../registry-snapshot/registry.json"), "utf8"));
    const ids = new Set(registry.patterns.map((p: { id: string }) => p.id));
    for (const profile of PROFILES) for (const pattern of profile.patterns) expect(ids.has(pattern)).toBe(true);
  });

  it("parse combined lists and report unknown ids", () => {
    const parsed = parseProfileList("webapp, security-first,webapp,bogus");
    expect(parsed.profiles.map((p) => p.id)).toEqual(["webapp", "security-first"]);
    expect(parsed.unknown).toEqual(["bogus"]);
  });

  it("are listed by 'map profiles'", async () => {
    const root = await tempDir("map-profiles-");
    const result = await cli(root, "profiles", "--json");
    expect(result.json().profiles.map((p: Json) => p.id)).toEqual(["webapp", "api", "wordpress", "python", "rust", "ai-app", "security-first"]);
  });
});

describe("map add path safety", () => {
  it("rejects registry entries whose id or file names could escape .map/patterns", () => {
    const entry = { id: "retrieval/chunking", name: "x", category: "retrieval", status: "published" } as const;
    expect(unsafePatternPaths({ ...entry, files: { "prompt.md": "" } })).toEqual([]);
    expect(unsafePatternPaths({ ...entry, id: "../../etc" })).toHaveLength(1);
    expect(unsafePatternPaths({ ...entry, files: { "../x.md": "", "pattern.json": "" } })).toHaveLength(2);
  });
});

describe("JSON outputs match the published schemas", () => {
  const validator = join(import.meta.dirname, "../../../../library/scripts/validate-schemas.ts");
  const check = async (schema: string, document: string): Promise<void> => {
    const file = join(await tempDir("map-schema-check-"), "doc.json");
    await writeFile(file, document);
    execFileSync(process.execPath, [validator, "--check", schema, file], { stdio: "pipe" });
  };

  it("validates map detect, map plan, and the skills lockfile", async () => {
    const { root } = await nextProject({ Dockerfile: "FROM node", "AGENTS.md": "# notes" });
    await check("project-profile.schema.json", (await cli(root, "detect", "--json")).out);
    await check("plan.schema.json", (await cli(root, "plan", "--json", "--profile", "webapp,ai-app")).out);
    await cli(root, "skills", "add", "design-guardrails", "--allow-scripts", "--agents", "claude,codex");
    await check("skills-lock.schema.json", await readFile(join(root, ".map/skills.lock.json"), "utf8"));
    await check("project.schema.json", await readFile(join(root, ".map/map.config.json"), "utf8"));
  });
});
