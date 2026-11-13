/**
 * `map doctor` — health checks for the environment, the `.map/` workspace, and the
 * platform's own data integrity.
 *
 * Each check reports ok / warning / problem. Warnings are advice (e.g. "no analysis
 * report yet"); problems mean something the other commands rely on is broken, and
 * the command exits non-zero so doctor can gate CI.
 */

import { join } from "node:path";
import type { Command, CommandContext, CommandResult } from "../command.ts";
import { OK, FAILED } from "../command.ts";
import type { Reporter } from "../../reporting/index.ts";
import {
  MAP_DIR,
  CONFIG_FILE,
  LEGACY_WORKSPACE_FILES,
  parseConfig,
} from "../../config/index.ts";
import { RECOMMENDATION_RULES } from "../../recommendation/index.ts";
import {
  RegistryPatternCatalog,
  loadRegistry,
  resolveRegistrySource,
} from "../../knowledge/index.ts";
import {
  loadContext,
  compile,
  resolveCompilerConfig,
  globToRegExp,
} from "../../compiler/index.ts";
import type { Context } from "../../compiler/index.ts";
import { LOCKFILE, auditInstalled } from "../../skills/index.ts";

const MIN_NODE_MAJOR = 20;

/** Warn when the registry in use is older than this. */
const STALE_REGISTRY_DAYS = 60;

/** Directories the workspace template creates. */
const WORKSPACE_DIRS = [
  "patterns",
  "prompts",
  "architecture",
  "decisions",
  "evals",
  "agents",
  "tools",
  "reports",
  "cache",
] as const;

type Verdict = "ok" | "warn" | "fail";

interface CheckResult {
  readonly verdict: Verdict;
  readonly message: string;
  /** What to do about it; printed for warn/fail. */
  readonly hint?: string;
}

export const doctorCommand: Command = {
  name: "doctor",
  summary: "Check the .map workspace and environment for problems.",
  usage: "map doctor",

  async run(ctx: CommandContext): Promise<CommandResult> {
    const results: CheckResult[] = [];

    results.push(checkNode());
    results.push(...(await checkWorkspace(ctx)));
    results.push(...(await checkCompiler(ctx)));
    results.push(...(await checkSkills(ctx)));
    results.push(...(await checkRegistry(ctx)));
    results.push(await checkRuleTable(ctx));

    let failures = 0;
    let warnings = 0;
    for (const result of results) {
      report(ctx.reporter, result);
      if (result.verdict === "fail") failures += 1;
      if (result.verdict === "warn") warnings += 1;
    }

    ctx.reporter.info("");
    const summary = `doctor: ${results.length - failures - warnings} ok, ${warnings} warning(s), ${failures} problem(s)`;
    if (failures > 0) {
      ctx.reporter.error(summary);
      return FAILED;
    }
    ctx.reporter.success(summary);
    return OK;
  },
};

/** Lockfile validity and on-disk integrity of MAP-installed skills. Offline. */
async function checkSkills(ctx: CommandContext): Promise<readonly CheckResult[]> {
  const lockFile = join(ctx.cwd, MAP_DIR, LOCKFILE);
  if (!(await ctx.services.storage.exists(lockFile))) return [];
  let installed;
  try {
    installed = (await auditInstalled(ctx.cwd)).filter((item) => item.managed);
  } catch (error) {
    return [{ verdict: "fail", message: `${MAP_DIR}/${LOCKFILE} is invalid: ${error instanceof Error ? error.message : String(error)}`, hint: "Fix it, or remove skills and re-add them." }];
  }
  const drifted = installed.filter((item) => item.integrity !== "clean");
  const risky = installed.filter((item) => item.audit?.findings.some((f) => f.severity === "high" || f.severity === "block") === true);
  const results: CheckResult[] = [];
  results.push(
    drifted.length === 0
      ? { verdict: "ok", message: `${installed.length} installed skill location(s) match ${LOCKFILE}` }
      : { verdict: "fail", message: `skills differ from ${LOCKFILE}: ${drifted.map((d) => `${d.path} (${d.integrity})`).join(", ")}`, hint: "Run 'map skills audit' for details; 'map skills install' restores locked content." },
  );
  if (risky.length > 0) {
    results.push({ verdict: "warn", message: `high-severity audit findings in ${risky.map((r) => r.path).join(", ")}`, hint: "Review with 'map skills audit'." });
  }
  return results;
}

function report(reporter: Reporter, result: CheckResult): void {
  const icon = result.verdict === "ok" ? "✓" : result.verdict === "warn" ? "!" : "✗";
  reporter.info(`${icon} ${result.message}`);
  if (result.hint !== undefined && result.verdict !== "ok") {
    reporter.info(`   → ${result.hint}`);
  }
}

function checkNode(): CheckResult {
  const version = process.versions.node;
  const major = Number.parseInt(version.split(".")[0] ?? "0", 10);
  if (major >= MIN_NODE_MAJOR) {
    return { verdict: "ok", message: `node v${version} (>= ${MIN_NODE_MAJOR} required)` };
  }
  return {
    verdict: "fail",
    message: `node v${version} is too old`,
    hint: `The MAP CLI needs Node >= ${MIN_NODE_MAJOR}.`,
  };
}

async function checkWorkspace(ctx: CommandContext): Promise<readonly CheckResult[]> {
  const { storage } = ctx.services;
  const mapDir = join(ctx.cwd, MAP_DIR);

  if (!(await storage.exists(mapDir))) {
    return [
      {
        verdict: "fail",
        message: `no ${MAP_DIR}/ workspace in ${ctx.cwd}`,
        hint: "Run 'map init' to create one.",
      },
    ];
  }

  const results: CheckResult[] = [
    { verdict: "ok", message: `${MAP_DIR}/ workspace found` },
  ];

  const legacy: string[] = [];
  for (const file of LEGACY_WORKSPACE_FILES) {
    if (await storage.exists(join(mapDir, file))) legacy.push(file);
  }
  if (legacy.length > 0) {
    results.push({
      verdict: "warn",
      message: `legacy workspace files present (${legacy.join(", ")})`,
      hint: "Run 'map init --yes' to migrate to the map.config.json format.",
    });
  }

  const configPath = join(mapDir, CONFIG_FILE);
  if (!(await storage.exists(configPath))) {
    results.push({
      verdict: "fail",
      message: `${MAP_DIR}/${CONFIG_FILE} is missing`,
      hint: "Run 'map init' to generate it.",
    });
  } else {
    try {
      const config = parseConfig(await storage.readFile(configPath));
      results.push({
        verdict: "ok",
        message: `${MAP_DIR}/${CONFIG_FILE} valid (schema v${config.version})`,
      });
    } catch (error) {
      results.push({
        verdict: "fail",
        message: `${MAP_DIR}/${CONFIG_FILE} is invalid: ${error instanceof Error ? error.message : String(error)}`,
        hint: "Fix it, or regenerate with 'map init --force'.",
      });
    }
  }

  const missingDirs: string[] = [];
  for (const dir of WORKSPACE_DIRS) {
    if (!(await storage.exists(join(mapDir, dir)))) missingDirs.push(dir);
  }
  if (missingDirs.length > 0) {
    results.push({
      verdict: "warn",
      message: `workspace directories missing: ${missingDirs.join(", ")}`,
      hint: "Run 'map init' to restore them (kept files are not touched).",
    });
  }

  results.push(await checkAnalysisReport(ctx, mapDir));
  return results;
}

/**
 * Context-compiler health: the resolved sources/targets, the adapters they need,
 * and the documents they compile — duplicate sections and broken references.
 * Skips quietly when there is no config (checkWorkspace already flags that).
 */
async function checkCompiler(ctx: CommandContext): Promise<readonly CheckResult[]> {
  const { storage, adapters } = ctx.services;
  const mapDir = join(ctx.cwd, MAP_DIR);
  const configPath = join(mapDir, CONFIG_FILE);
  if (!(await storage.exists(configPath))) return [];

  let resolved;
  let projectName: string;
  try {
    const config = parseConfig(await storage.readFile(configPath));
    resolved = resolveCompilerConfig(config);
    projectName = config.project.name;
  } catch {
    return []; // checkWorkspace already reported the parse failure.
  }

  const results: CheckResult[] = [
    { verdict: "ok", message: `compiler configured (${resolved.targets.length} target(s))` },
  ];

  // Unsupported targets: every configured adapter must resolve.
  const unknown = resolved.targets
    .filter((t) => adapters.get(t.adapter) === undefined)
    .map((t) => t.id);
  results.push(
    unknown.length === 0
      ? { verdict: "ok", message: "all targets map to a known adapter" }
      : {
          verdict: "fail",
          message: `unsupported target(s): ${unknown.join(", ")}`,
          hint: `Known adapters: ${adapters.ids().join(", ")}.`,
        },
  );

  // Sources that match no files.
  const relFiles = (await storage.listFiles(mapDir))
    .map((rel) => rel.split(/[\\/]/).join("/"))
    .filter((rel) => rel.endsWith(".md"));
  const emptyGlobs = resolved.sources.filter(
    (glob) => !relFiles.some((rel) => globToRegExp(glob).test(rel)),
  );
  results.push(
    emptyGlobs.length === 0
      ? { verdict: "ok", message: "all compiler sources resolve to at least one document" }
      : {
          verdict: "warn",
          message: `source(s) match no files: ${emptyGlobs.join(", ")}`,
          hint: "Add the document(s) under .map/ or remove the source from map.config.json.",
        },
  );

  const context = await loadContext(storage, mapDir, {
    projectName,
    sources: resolved.sources,
  });
  results.push(checkDuplicateSections(context));
  results.push(checkBrokenReferences(context, relFiles));

  // A last sanity pass: compilation itself must not throw.
  compile(context, resolved, adapters);

  return results;
}

/** Duplicate top-level headings across documents muddle the compiled output. */
function checkDuplicateSections(context: Context): CheckResult {
  const seen = new Map<string, number>();
  for (const doc of context.documents) {
    const key = doc.title.trim().toLowerCase();
    seen.set(key, (seen.get(key) ?? 0) + 1);
  }
  const dupes = [...seen.entries()].filter(([, n]) => n > 1).map(([title]) => title);
  return dupes.length === 0
    ? { verdict: "ok", message: `no duplicate sections (${context.documents.length} document(s))` }
    : {
        verdict: "warn",
        message: `duplicate section title(s): ${dupes.join(", ")}`,
        hint: "Rename headings so each document contributes a distinct section.",
      };
}

/** Relative markdown links to other `.map` documents should resolve. */
function checkBrokenReferences(context: Context, relFiles: readonly string[]): CheckResult {
  const known = new Set(relFiles);
  const broken: string[] = [];
  const linkRe = /\]\(([^)]+\.md)\)/g;
  for (const doc of context.documents) {
    const dir = doc.path.includes("/") ? doc.path.slice(0, doc.path.lastIndexOf("/")) : "";
    for (const match of doc.body.matchAll(linkRe)) {
      const target = match[1]!;
      if (target.startsWith("http")) continue;
      if (!known.has(normalizeRelative(dir, target))) broken.push(`${doc.path} → ${target}`);
    }
  }
  return broken.length === 0
    ? { verdict: "ok", message: "no broken document references" }
    : {
        verdict: "warn",
        message: `broken reference(s): ${broken.join("; ")}`,
        hint: "Point the link at an existing .map document.",
      };
}

/** Resolve a POSIX relative link from `dir`, collapsing `.` and `..`. */
function normalizeRelative(dir: string, target: string): string {
  const parts = (dir ? dir.split("/") : []).concat(target.split("/"));
  const stack: string[] = [];
  for (const part of parts) {
    if (part === "." || part === "") continue;
    if (part === "..") stack.pop();
    else stack.push(part);
  }
  return stack.join("/");
}

async function checkAnalysisReport(
  ctx: CommandContext,
  mapDir: string,
): Promise<CheckResult> {
  const { storage } = ctx.services;
  const path = join(mapDir, "reports", "analysis.json");
  if (!(await storage.exists(path))) {
    return {
      verdict: "warn",
      message: "no analysis report yet",
      hint: "Run 'map analyze' to detect this project's AI architecture.",
    };
  }
  try {
    const data: unknown = JSON.parse(await storage.readFile(path));
    const concepts = (data as { concepts?: unknown[] }).concepts;
    const detectedAt = (data as { detectedAt?: string }).detectedAt;
    return Array.isArray(concepts)
      ? {
          verdict: "ok",
          message: `analysis report valid (${concepts.length} concept(s), ${detectedAt ?? "unknown date"})`,
        }
      : {
          verdict: "fail",
          message: "analysis report has no concepts field",
          hint: "Re-run 'map analyze' to regenerate it.",
        };
  } catch {
    return {
      verdict: "fail",
      message: `${MAP_DIR}/reports/analysis.json is not valid JSON`,
      hint: "Re-run 'map analyze' to regenerate it.",
    };
  }
}

async function checkRegistry(ctx: CommandContext): Promise<readonly CheckResult[]> {
  const { catalog, storage } = ctx.services;
  const results: CheckResult[] = [];

  let entriesCount: number;
  let published: number;
  try {
    const entries = await catalog.entries();
    entriesCount = entries.length;
    published = entries.filter((e) => e.status === "published").length;
  } catch (error) {
    return [
      {
        verdict: "fail",
        message: `pattern registry failed to load: ${error instanceof Error ? error.message : String(error)}`,
        hint: "Run 'map update' to download a fresh registry.",
      },
    ];
  }

  if (entriesCount === 0) {
    return [
      {
        verdict: "fail",
        message: "pattern registry is empty",
        hint: "Run 'map update' to download a fresh registry.",
      },
    ];
  }

  const source = await resolveRegistrySource(storage);
  let provenance = `source: ${source.kind}`;
  let stale = false;
  if (catalog instanceof RegistryPatternCatalog) {
    const registry = await catalog.registry();
    provenance += `, catalog v${registry.source.version}`;
    const age = ageInDays(registry.generatedAt);
    if (age !== undefined) {
      provenance += `, ${age} day(s) old`;
      stale = age > STALE_REGISTRY_DAYS;
    }
  }

  // Commands survive a broken cache (they degrade to the bundled snapshot),
  // so doctor must name it explicitly or nobody ever repairs it.
  if (source.kind === "cache") {
    try {
      await loadRegistry(storage, source);
    } catch {
      results.push({
        verdict: "warn",
        message: `registry cache is corrupt (${source.path}); commands are using the bundled snapshot`,
        hint: "Run 'map update' to re-download it.",
      });
    }
  }

  results.push({
    verdict: "ok",
    message: `pattern registry loaded (${entriesCount} patterns, ${published} published; ${provenance})`,
  });
  if (stale) {
    results.push({
      verdict: "warn",
      message: `registry is older than ${STALE_REGISTRY_DAYS} days`,
      hint: "Run 'map update' to fetch the latest catalog.",
    });
  }
  return results;
}

function ageInDays(generatedAt: string): number | undefined {
  const timestamp = Date.parse(generatedAt);
  if (Number.isNaN(timestamp)) return undefined;
  return Math.max(0, Math.floor((Date.now() - timestamp) / (24 * 60 * 60 * 1000)));
}

/** Every pattern id the recommender can emit must exist in the catalog. */
async function checkRuleTable(ctx: CommandContext): Promise<CheckResult> {
  let known: Set<string>;
  try {
    known = new Set((await ctx.services.catalog.entries()).map((e) => e.id));
  } catch {
    known = new Set();
  }
  if (known.size === 0) {
    return {
      verdict: "warn",
      message: "rule table not checked (registry unavailable)",
    };
  }

  const referenced = new Set(
    RECOMMENDATION_RULES.flatMap((rule) => rule.recommend.map((r) => r.pattern)),
  );
  const unknown = [...referenced].filter((id) => !known.has(id));
  if (unknown.length > 0) {
    return {
      verdict: "fail",
      message: `recommendation rules reference unknown pattern(s): ${unknown.join(", ")}`,
      hint: "Fix the id in src/recommendation/rules.ts or update the registry ('map update').",
    };
  }
  return {
    verdict: "ok",
    message: `recommendation rules consistent (${referenced.size} pattern ids resolve in the catalog)`,
  };
}
