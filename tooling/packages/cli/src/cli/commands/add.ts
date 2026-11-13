/**
 * `map add <pattern-id>` — adopt a pattern into the project.
 *
 * Copies the pattern's files (prompt.md, acceptance.md — embedded in the
 * registry) plus a pattern.json metadata file into
 * `.map/patterns/<category>/<slug>/`. From there, prompt.md is pasted into a
 * coding agent and acceptance.md verifies the result (see the pattern contract).
 */

import { join } from "node:path";
import type { Command, CommandContext, CommandResult } from "../command.ts";
import { OK, FAILED } from "../command.ts";
import { MAP_DIR } from "../../config/index.ts";
import type { CatalogEntry } from "../../domain/index.ts";

export const addCommand: Command = {
  name: "add",
  summary: "Add a pattern from the catalog into the .map/ workspace.",
  usage: "map add <pattern-id> [--force]",
  args: "<pattern-id>",
  options: [{ flags: "-f, --force", description: "overwrite files that already exist" }],

  async run(ctx: CommandContext): Promise<CommandResult> {
    const { reporter, services } = ctx;
    const id = ctx.args[0];
    if (id === undefined) {
      reporter.error("Usage: map add <pattern-id> (e.g. 'map add retrieval/chunking')");
      return FAILED;
    }

    const mapDir = join(ctx.cwd, MAP_DIR);
    if (!(await services.storage.exists(mapDir))) {
      reporter.error(`No ${MAP_DIR}/ workspace here. Run 'map init' first.`);
      return FAILED;
    }

    const entry = await services.catalog.get(id);
    if (entry === undefined) {
      reporter.error(`Unknown pattern id '${id}'.`);
      await suggest(ctx, id);
      return FAILED;
    }
    if (entry.status !== "published" || entry.files === undefined) {
      reporter.error(
        `'${id}' is not published yet (status: ${entry.status}) — there is nothing to add.`,
      );
      reporter.info("Track it in the MAP roadmap, or run 'map patterns --status=published'.");
      return FAILED;
    }

    // The registry may come from a downloaded cache, so its ids and file names are
    // untrusted input: refuse anything that could escape .map/patterns/.
    const unsafe = unsafePatternPaths(entry);
    if (unsafe.length > 0) {
      reporter.error(`'${id}' has unsafe registry paths (${unsafe.join(", ")}); refusing to write.`);
      reporter.info("Run 'map update' to refresh the registry, or report the registry entry.");
      return FAILED;
    }

    const targetDir = join(mapDir, "patterns", entry.id);
    const force = ctx.flags["force"] === true;
    await services.storage.ensureDir(targetDir);

    const files: ReadonlyArray<readonly [string, string]> = [
      ...Object.entries(entry.files),
      ["pattern.json", `${JSON.stringify(metadata(entry), null, 2)}\n`] as const,
    ];

    let created = 0;
    for (const [name, contents] of files) {
      const written = await services.storage.writeFile(join(targetDir, name), contents, {
        overwrite: force,
      });
      if (written) {
        created += 1;
        reporter.info(`created ${MAP_DIR}/patterns/${entry.id}/${name}`);
      } else {
        reporter.warn(`skipped ${MAP_DIR}/patterns/${entry.id}/${name} (exists; use --force)`);
      }
    }

    reporter.success(`Added '${entry.name}' (${created} file(s)).`);
    reporter.info("Paste prompt.md into your coding agent; verify with acceptance.md.");
    return OK;
  },
};

const PATTERN_ID = /^[a-z0-9-]+\/[a-z0-9-]+$/;
const FILE_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

/** Pattern ids and embedded file names that could not be written safely. */
export function unsafePatternPaths(entry: CatalogEntry): readonly string[] {
  const unsafe: string[] = [];
  if (!PATTERN_ID.test(entry.id)) unsafe.push(`id ${JSON.stringify(entry.id)}`);
  for (const name of Object.keys(entry.files ?? {})) {
    if (!FILE_NAME.test(name) || name === "pattern.json") unsafe.push(`file ${JSON.stringify(name)}`);
  }
  return unsafe;
}

/** The metadata written next to the pattern files (everything but the files). */
function metadata(entry: CatalogEntry): Omit<CatalogEntry, "files"> {
  const { files: _files, ...rest } = entry;
  return rest;
}

async function suggest(ctx: CommandContext, query: string): Promise<void> {
  const text = query.split("/").pop() ?? query;
  const matches = await ctx.services.catalog.find({ text });
  if (matches.length > 0) {
    ctx.reporter.info(
      `Did you mean: ${matches.slice(0, 5).map((m) => m.id).join(", ")}?`,
    );
  } else {
    ctx.reporter.info("Browse ids with 'map patterns'.");
  }
}
