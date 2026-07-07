/**
 * `map patterns [text]` — browse the MAP pattern catalog.
 *
 * Lists every pattern the catalog knows about (written patterns from `patterns/`
 * merged with the roadmap), grouped by category. Filters compose: a positional
 * text query, `--category=<cat>`, and `--status=<published|in-progress|planned>`.
 * `--json` emits the matched entries as JSON for scripts and agents. Published
 * patterns show their MAP Score as a star line (see map-score/SPEC.md).
 */

import type { Command, CommandContext, CommandResult } from "../command.ts";
import { OK, FAILED } from "../command.ts";
import type { CatalogEntry, CatalogStatus, MapScore, PatternCategory } from "../../domain/index.ts";

const STATUS_ICONS: Readonly<Record<CatalogStatus, string>> = {
  published: "✅",
  "in-progress": "🟡",
  planned: "⬜",
};

export const patternsCommand: Command = {
  name: "patterns",
  summary: "List and search the MAP pattern catalog.",
  usage: "map patterns [text] [--category=<category>] [--status=<status>] [--json]",

  async run(ctx: CommandContext): Promise<CommandResult> {
    const { reporter, services } = ctx;

    const text = ctx.args[0];
    const category = optionalString(ctx.flags["category"]) as PatternCategory | undefined;
    const status = optionalString(ctx.flags["status"]) as CatalogStatus | undefined;
    if (status !== undefined && !(status in STATUS_ICONS)) {
      reporter.error(
        `Unknown status '${status}'. Use: ${Object.keys(STATUS_ICONS).join(", ")}.`,
      );
      return FAILED;
    }

    const matches = await services.catalog.find({ text, category, status });

    if (ctx.flags["json"] === true) {
      reporter.info(JSON.stringify(matches, null, 2));
      return OK;
    }

    if (matches.length === 0) {
      reporter.warn("No patterns match.");
      const known = [...new Set((await services.catalog.entries()).map((e) => e.category))];
      if (category !== undefined && !known.includes(category)) {
        reporter.info(`Unknown category '${category}'. Categories: ${known.join(", ")}.`);
      }
      return OK;
    }

    const published = matches.filter((e) => e.status === "published").length;
    reporter.info(
      `${matches.length} pattern(s)` +
        (published > 0 ? ` — ${published} published` : "") +
        (filtersLabel(text, category, status) ?? ""),
    );

    for (const cat of groupCategories(matches)) {
      reporter.info("");
      reporter.info(`${cat.category}:`);
      for (const entry of cat.entries) {
        reporter.info(`  ${STATUS_ICONS[entry.status]} ${entry.id} — ${entry.name}`);
        if (entry.summary) {
          reporter.info(`       ${truncate(entry.summary, 90)}`);
        }
        if (entry.score) {
          reporter.info(`       ${scoreLine(entry.score)}`);
        }
      }
    }

    reporter.info("");
    reporter.success(
      "Published patterns live under patterns/<category>/<slug>/ (see ROADMAP.md for the rest).",
    );
    return OK;
  },
};

function optionalString(value: string | boolean | undefined): string | undefined {
  return typeof value === "string" && value !== "" ? value : undefined;
}

function filtersLabel(
  text: string | undefined,
  category: string | undefined,
  status: string | undefined,
): string | undefined {
  const filters = [
    text !== undefined ? `text ~ "${text}"` : undefined,
    category !== undefined ? `category = ${category}` : undefined,
    status !== undefined ? `status = ${status}` : undefined,
  ].filter((f) => f !== undefined);
  return filters.length > 0 ? ` (filter: ${filters.join(", ")})` : undefined;
}

interface CategoryGroup {
  readonly category: string;
  readonly entries: readonly CatalogEntry[];
}

function groupCategories(entries: readonly CatalogEntry[]): readonly CategoryGroup[] {
  const groups = new Map<string, CatalogEntry[]>();
  for (const entry of entries) {
    const group = groups.get(entry.category) ?? [];
    group.push(entry);
    groups.set(entry.category, group);
  }
  return [...groups.entries()].map(([category, grouped]) => ({ category, entries: grouped }));
}

/** The MAP Score "summary" rendering from map-score/SPEC.md, one line of stars. */
function scoreLine(score: MapScore): string {
  const dims: ReadonlyArray<readonly [string, number]> = [
    ["Complexity", score.complexity],
    ["Latency", score.latency],
    ["Cost", score.cost],
    ["Accuracy", score.accuracyImpact],
    ["Readiness", score.productionReadiness],
  ];
  return dims.map(([label, n]) => `${label} ${stars(n)}`).join(" · ");
}

function stars(n: number): string {
  return "★".repeat(n) + "☆".repeat(5 - n);
}

function truncate(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`;
}
