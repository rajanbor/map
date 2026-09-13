/**
 * `map explain <pattern-id>` — the decision-first view of one pattern.
 *
 * Renders what the registry knows: summary, when to use / when not to use,
 * MAP Score, related patterns, and references. For the full document, the
 * pattern's page in the map repository remains the source; explain is the
 * 30-second version at the terminal.
 */

import type { Command, CommandContext, CommandResult } from "../command.ts";
import { OK, FAILED } from "../command.ts";
import { DIMENSIONS, renderStars } from "@missing-ai-patterns/score";
import type { CatalogEntry } from "../../domain/index.ts";

export const explainCommand: Command = {
  name: "explain",
  summary: "Explain a pattern: what it is, when to use it, trade-offs.",
  usage: "map explain <pattern-id>",
  args: "<pattern-id>",
  options: [{ flags: "--json", description: "machine-readable pattern metadata" }],

  async run(ctx: CommandContext): Promise<CommandResult> {
    const { reporter, services } = ctx;
    const query = ctx.args[0];
    if (query === undefined) {
      reporter.error("Usage: map explain <pattern-id> (e.g. 'map explain retrieval/chunking')");
      return FAILED;
    }

    let entry = await services.catalog.get(query);
    if (entry === undefined) {
      const matches = await services.catalog.find({ text: query });
      if (matches.length === 1) {
        entry = matches[0];
      } else if (matches.length > 1) {
        reporter.warn(`'${query}' matches ${matches.length} patterns:`);
        for (const match of matches.slice(0, 10)) {
          reporter.info(`  ${match.id} — ${match.name}`);
        }
        reporter.info("Run 'map explain <id>' with one of these ids.");
        return FAILED;
      }
    }
    if (entry === undefined) {
      reporter.error(`No pattern matches '${query}'. Browse the catalog with 'map patterns'.`);
      return FAILED;
    }

    if (ctx.flags["json"] === true) {
      const { files: _files, ...metadata } = entry;
      reporter.info(JSON.stringify(metadata, null, 2));
    } else {
      render(ctx, entry);
    }
    return OK;
  },
};

export const showCommand: Command = {
  ...explainCommand,
  name: "show",
  summary: "Show one pattern, its trade-offs, score, and relationships.",
  usage: "map show <pattern-id> [--json]",
};

function render(ctx: CommandContext, entry: CatalogEntry): void {
  const { reporter } = ctx;

  reporter.info(`${entry.name}  (${entry.id})`);
  reporter.info(`status: ${entry.status}${entry.maturity !== undefined ? ` · maturity: ${entry.maturity}` : ""}`);
  if (entry.alsoKnownAs !== undefined) {
    reporter.info(`also known as: ${entry.alsoKnownAs.join(", ")}`);
  }

  if (entry.summary !== undefined) {
    reporter.info("");
    reporter.info(entry.summary);
  }

  if (entry.score !== undefined) {
    reporter.info("");
    reporter.info("MAP Score:");
    for (const dim of DIMENSIONS) {
      reporter.info(`  ${dim.label.padEnd(22)} ${renderStars(entry.score[dim.id])}`);
    }
  }

  section(reporter.info.bind(reporter), "When to use:", entry.whenToUse);
  section(reporter.info.bind(reporter), "When NOT to use:", entry.whenNotToUse);
  section(reporter.info.bind(reporter), "Related patterns:", entry.related);
  section(reporter.info.bind(reporter), "References:", entry.references);

  reporter.info("");
  if (entry.status === "published" && entry.files !== undefined) {
    reporter.success(`Adopt it: 'map add ${entry.id}'.`);
  } else {
    reporter.warn("Not written yet — this entry comes from the MAP roadmap.");
  }
}

function section(
  print: (message: string) => void,
  title: string,
  items: readonly string[] | undefined,
): void {
  if (items === undefined || items.length === 0) return;
  print("");
  print(title);
  for (const item of items) print(`  - ${item}`);
}
