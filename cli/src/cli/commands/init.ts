/**
 * `map init` — the first production command.
 *
 * Creates a `.map/` workspace in the current project: a config file, a project
 * manifest, a placeholder knowledge database, and the folders later modules use.
 * Existing files are never overwritten unless `--force` is passed (an explicit
 * confirmation), so re-running `init` is safe.
 */

import { join, basename } from "node:path";
import type { Command, CommandContext, CommandResult } from "../command.ts";
import { OK } from "../command.ts";
import {
  MAP_DIR,
  defaultConfig,
  defaultManifest,
  renderConfig,
  renderManifest,
} from "../../config/index.ts";

/** Sub-directories created inside `.map/`. */
const SUBDIRS = ["knowledge", "cache", "reports", "graphs"] as const;

export const initCommand: Command = {
  name: "init",
  summary: "Create a .map/ workspace in the current project.",
  usage: "map init [--force]",

  async run(ctx: CommandContext): Promise<CommandResult> {
    const { cwd, services, reporter } = ctx;
    const { storage } = services;
    const force = ctx.flags["force"] === true;

    const mapDir = join(cwd, MAP_DIR);
    const projectName = basename(cwd);

    reporter.info(`Initializing MAP in ${mapDir}`);

    await storage.ensureDir(mapDir);
    for (const dir of SUBDIRS) {
      await storage.ensureDir(join(mapDir, dir));
    }

    const files: ReadonlyArray<readonly [string, string]> = [
      [join(mapDir, "config.yaml"), renderConfig(defaultConfig())],
      [join(mapDir, "project.yaml"), renderManifest(defaultManifest(projectName))],
      // Placeholder knowledge database until real loaders land (TODO module-1).
      [join(mapDir, "knowledge", "patterns.json"), "[]\n"],
      [join(mapDir, "cache", ".gitkeep"), ""],
      [join(mapDir, "reports", ".gitkeep"), ""],
      [join(mapDir, "graphs", ".gitkeep"), ""],
    ];

    let created = 0;
    let skipped = 0;
    for (const [path, contents] of files) {
      const written = await storage.writeFile(path, contents, {
        overwrite: force,
      });
      const rel = path.slice(cwd.length + 1);
      if (written) {
        created += 1;
        reporter.info(`created ${rel}`);
      } else {
        skipped += 1;
        reporter.warn(`skipped ${rel} (exists; use --force to overwrite)`);
      }
    }

    if (skipped > 0 && !force) {
      reporter.success(
        `MAP workspace ready. ${created} file(s) written, ${skipped} kept.`,
      );
    } else {
      reporter.success(`MAP workspace ready. ${created} file(s) written.`);
    }
    return OK;
  },
};
