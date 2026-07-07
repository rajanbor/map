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
import { MAP_DIR } from "../../config/index.ts";
import { RECOMMENDATION_RULES } from "../../recommendation/index.ts";

const MIN_NODE_MAJOR = 22;

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
    results.push(await checkCatalog(ctx));
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
    hint: `MAP runs TypeScript natively and needs Node >= ${MIN_NODE_MAJOR}.`,
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

  for (const file of ["config.yaml", "project.yaml"]) {
    const path = join(mapDir, file);
    if (await storage.exists(path)) {
      results.push({ verdict: "ok", message: `${MAP_DIR}/${file} present` });
    } else {
      results.push({
        verdict: "fail",
        message: `${MAP_DIR}/${file} is missing`,
        hint: "Run 'map init --force' to regenerate it.",
      });
    }
  }

  results.push(
    await checkJsonFile(ctx, join(mapDir, "knowledge", "patterns.json"), {
      missing: {
        verdict: "warn",
        message: `${MAP_DIR}/knowledge/patterns.json is missing`,
        hint: "Run 'map init --force' to regenerate it.",
      },
      describe: (data) =>
        Array.isArray(data)
          ? { verdict: "ok", message: `${MAP_DIR}/knowledge/patterns.json valid (${data.length} local pattern(s))` }
          : {
              verdict: "fail",
              message: `${MAP_DIR}/knowledge/patterns.json is not a JSON array`,
              hint: "It should contain a list of local pattern overrides ('[]' when empty).",
            },
    }),
  );

  results.push(
    await checkJsonFile(ctx, join(mapDir, "reports", "analysis.json"), {
      missing: {
        verdict: "warn",
        message: "no analysis report yet",
        hint: "Run 'map analyze' to detect this project's AI architecture.",
      },
      describe: (data) => {
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
      },
    }),
  );

  return results;
}

async function checkJsonFile(
  ctx: CommandContext,
  path: string,
  handlers: {
    readonly missing: CheckResult;
    readonly describe: (data: unknown) => CheckResult;
  },
): Promise<CheckResult> {
  const { storage } = ctx.services;
  if (!(await storage.exists(path))) return handlers.missing;
  try {
    return handlers.describe(JSON.parse(await storage.readFile(path)));
  } catch {
    return {
      verdict: "fail",
      message: `${path.slice(ctx.cwd.length + 1)} is not valid JSON`,
      hint: "Regenerate it ('map init --force' for workspace files, 'map analyze' for reports).",
    };
  }
}

async function checkCatalog(ctx: CommandContext): Promise<CheckResult> {
  const entries = await ctx.services.catalog.entries();
  if (entries.length === 0) {
    return {
      verdict: "fail",
      message: "pattern catalog is empty",
      hint: "The CLI could not read ROADMAP.md / patterns/ from its MAP repository.",
    };
  }
  const published = entries.filter((e) => e.status === "published").length;
  return {
    verdict: "ok",
    message: `pattern catalog loaded (${entries.length} patterns, ${published} published)`,
  };
}

/** Every pattern id the recommender can emit must exist in the catalog. */
async function checkRuleTable(ctx: CommandContext): Promise<CheckResult> {
  const known = new Set((await ctx.services.catalog.entries()).map((e) => e.id));
  if (known.size === 0) {
    return {
      verdict: "warn",
      message: "rule table not checked (catalog unavailable)",
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
      hint: "Fix the id in src/recommendation/rules.ts or add the pattern to ROADMAP.md.",
    };
  }
  return {
    verdict: "ok",
    message: `recommendation rules consistent (${referenced.size} pattern ids resolve in the catalog)`,
  };
}
