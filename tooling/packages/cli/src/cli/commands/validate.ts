import { join } from "node:path";
import type { Command, CommandContext, CommandResult } from "../command.ts";
import { FAILED, OK } from "../command.ts";
import { CONFIG_FILE, MAP_DIR, parseConfig } from "../../config/index.ts";

interface ValidationReport {
  readonly schemaVersion: 1;
  readonly kind: "map.validation-result";
  readonly valid: boolean;
  readonly checked: readonly string[];
  readonly errors: readonly string[];
}

export const validateCommand: Command = {
  name: "validate",
  summary: "Validate the MAP workspace and adopted pattern metadata.",
  usage: "map validate [--json]",
  options: [{ flags: "--json", description: "machine-readable validation result" }],

  async run(ctx: CommandContext): Promise<CommandResult> {
    const checked: string[] = [];
    const errors: string[] = [];
    const mapDir = join(ctx.cwd, MAP_DIR);
    const configPath = join(mapDir, CONFIG_FILE);
    if (!(await ctx.services.storage.exists(configPath))) {
      errors.push(`${MAP_DIR}/${CONFIG_FILE} is missing; run 'map init'.`);
    } else {
      checked.push(`${MAP_DIR}/${CONFIG_FILE}`);
      try {
        parseConfig(await ctx.services.storage.readFile(configPath));
      } catch (error) {
        errors.push(error instanceof Error ? error.message : String(error));
      }
    }

    const patternsRoot = join(mapDir, "patterns");
    for (const relative of await ctx.services.storage.listFiles(patternsRoot)) {
      if (!relative.endsWith("pattern.json")) continue;
      const display = `${MAP_DIR}/patterns/${relative.split("\\").join("/")}`;
      checked.push(display);
      try {
        const value: unknown = JSON.parse(await ctx.services.storage.readFile(join(patternsRoot, relative)));
        if (!isRecord(value) || typeof value.id !== "string") throw new Error(`${display}: id is required`);
        const expected = relative.split(/[\\/]/).slice(0, -1).join("/");
        if (value.id !== expected) throw new Error(`${display}: id '${value.id}' must match '${expected}'`);
        if ((await ctx.services.catalog.get(value.id)) === undefined) throw new Error(`${display}: unknown catalog id '${value.id}'`);
        for (const file of ["prompt.md", "acceptance.md"]) {
          if (!(await ctx.services.storage.exists(join(patternsRoot, expected, file)))) {
            throw new Error(`${display}: adopted pattern is missing ${file}`);
          }
        }
      } catch (error) {
        errors.push(error instanceof Error ? error.message : String(error));
      }
    }

    const report: ValidationReport = {
      schemaVersion: 1,
      kind: "map.validation-result",
      valid: errors.length === 0,
      checked: checked.sort(),
      errors,
    };
    if (ctx.flags["json"] === true) ctx.reporter.info(JSON.stringify(report, null, 2));
    else if (report.valid) ctx.reporter.success(`MAP contracts valid (${checked.length} artifact(s) checked).`);
    else errors.forEach((error) => ctx.reporter.error(error));
    return report.valid ? OK : FAILED;
  },
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
