/**
 * `map plan [path]` — show what `map init` would set up, without writing anything.
 */

import { resolve } from "node:path";
import type { Command, CommandContext, CommandResult } from "../command.ts";
import { OK, FAILED } from "../command.ts";
import { buildPlan } from "../../plan/planner.ts";
import type { PlanOptions } from "../../plan/planner.ts";
import { parseAgentList } from "../../agents/index.ts";
import { parseProfileList } from "../../profiles/index.ts";
import { renderPlan } from "../render-plan.ts";

export const SELECTION_OPTIONS = [
  { flags: "--agents <list>", description: "comma-separated agents: claude, codex, cursor, copilot, gemini" },
  { flags: "-p, --profile <list>", description: "comma-separated profiles: webapp, api, wordpress, python, rust, ai-app, security-first" },
  { flags: "--no-skills", description: "do not load skill sources (fully offline)" },
  { flags: "--refresh", description: "fetch the latest revision of skill sources" },
] as const;

/** Parse the shared --agents/--profile/--skills/--refresh flags into plan options. */
export function planOptionsFromFlags(ctx: CommandContext): PlanOptions | string {
  const options: { -readonly [K in keyof PlanOptions]: PlanOptions[K] } = {};
  const agents = ctx.flags["agents"];
  if (typeof agents === "string") {
    const parsed = parseAgentList(agents);
    if (parsed.unknown.length > 0) return `unknown agent(s): ${parsed.unknown.join(", ")}; supported: claude, codex, cursor, copilot, gemini`;
    options.agents = parsed.agents;
  }
  const profile = ctx.flags["profile"];
  if (typeof profile === "string") {
    const parsed = parseProfileList(profile);
    if (parsed.unknown.length > 0) return `unknown profile(s): ${parsed.unknown.join(", ")}; run 'map profiles' to list them`;
    options.profiles = parsed.profiles;
  }
  // Commander turns `--no-skills` into skills=false.
  if (ctx.flags["skills"] === false) options.skipSkills = true;
  if (ctx.flags["refresh"] === true) options.refreshSkills = true;
  return options;
}

export const planCommand: Command = {
  name: "plan",
  summary: "Show the agents, skills, patterns, and files MAP would set up (writes nothing).",
  usage: "map plan [path] [--agents <list>] [--profile <list>] [--json]",
  args: "[path]",
  options: [...SELECTION_OPTIONS, { flags: "--verbose", description: "include security notes and limitations" }, { flags: "--json", description: "machine-readable plan" }],

  async run(ctx: CommandContext): Promise<CommandResult> {
    const options = planOptionsFromFlags(ctx);
    if (typeof options === "string") {
      ctx.reporter.error(options);
      return FAILED;
    }
    const root = resolve(ctx.cwd, ctx.args[0] ?? ".");
    const { plan } = await buildPlan(root, ctx.services, options);
    if (ctx.flags["json"] === true) {
      ctx.reporter.data(JSON.stringify(plan, null, 2));
      return OK;
    }
    renderPlan(plan, ctx.reporter, { verbose: ctx.flags["verbose"] === true });
    ctx.reporter.info("");
    ctx.reporter.info("Nothing was written. Apply with 'map init' (add --yes for non-interactive use).");
    return OK;
  },
};
