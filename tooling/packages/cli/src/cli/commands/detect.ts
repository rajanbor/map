/**
 * `map detect [path]` — run the Project Profiler: languages, frameworks,
 * infrastructure, tooling, and coding agents, each with file-level evidence.
 * Read-only; `map plan` builds on the same result.
 */

import { resolve } from "node:path";
import type { Command, CommandContext, CommandResult } from "../command.ts";
import { OK } from "../command.ts";
import { readWorkspaceConfig } from "../../compiler/index.ts";
import { profileProject } from "../../project/index.ts";

export const detectCommand: Command = {
  name: "detect",
  summary: "Detect the project's stack and coding agents, with evidence (read-only).",
  usage: "map detect [path] [--depth <n>] [--json]",
  args: "[path]",
  options: [
    { flags: "--depth <n>", description: "directory levels to inspect below the root (default 3)" },
    { flags: "--json", description: "machine-readable project profile" },
  ],

  async run(ctx: CommandContext): Promise<CommandResult> {
    const root = resolve(ctx.cwd, ctx.args[0] ?? ".");
    const config = await readWorkspaceConfig(ctx.services.storage, root).catch(() => undefined);
    const depth = typeof ctx.flags["depth"] === "string" ? Number.parseInt(ctx.flags["depth"], 10) : undefined;
    const profile = await profileProject(root, ctx.services.storage, {
      ...(depth !== undefined && Number.isInteger(depth) && depth >= 0 ? { maxDepth: depth } : {}),
      ...(config !== undefined ? { exclude: config.analysis.exclude } : {}),
    });
    if (ctx.flags["json"] === true) {
      ctx.reporter.data(JSON.stringify(profile, null, 2));
      return OK;
    }
    const line = (label: string, confirmed: readonly string[], probable: readonly string[]): void => {
      const text = [...confirmed, ...probable.map((p) => `${p}?`)];
      ctx.reporter.info(`${label.padEnd(15)} ${text.length > 0 ? text.join(", ") : "—"}`);
    };
    line("languages", profile.project.languages, profile.probable.languages);
    line("frameworks", profile.project.frameworks, profile.probable.frameworks);
    line("infrastructure", profile.project.infrastructure, profile.probable.infrastructure);
    line("tooling", profile.project.tooling, profile.probable.tooling);
    line("agents", profile.project.agents, profile.probable.agents);
    if (profile.workspaces.length > 1) {
      ctx.reporter.info(`workspaces      ${profile.workspaces.map((w) => w.path).join(", ")}`);
    }
    ctx.reporter.info("");
    ctx.reporter.info("Evidence:");
    for (const e of profile.evidence) {
      ctx.reporter.info(`  ${e.signal.padEnd(16)} ${e.certainty.padEnd(9)} ${e.file} — ${e.detail}`);
    }
    ctx.reporter.info("");
    ctx.reporter.info("'?' marks probable signals. Anything not listed is unknown, not absent.");
    return OK;
  },
};
