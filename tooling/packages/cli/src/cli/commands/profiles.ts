/** `map profiles` — list the development profiles `map init --profile` accepts. */

import type { Command, CommandContext, CommandResult } from "../command.ts";
import { OK } from "../command.ts";
import { PROFILES } from "../../profiles/index.ts";

export const profilesCommand: Command = {
  name: "profiles",
  summary: "List development profiles (bundles of recommended skills, patterns, and conventions).",
  usage: "map profiles [--json]",
  options: [{ flags: "--json", description: "machine-readable output" }],

  async run(ctx: CommandContext): Promise<CommandResult> {
    if (ctx.flags["json"] === true) {
      ctx.reporter.data(JSON.stringify({ schemaVersion: 1, kind: "map.profiles", profiles: PROFILES }, null, 2));
      return OK;
    }
    for (const profile of PROFILES) {
      ctx.reporter.info(`${profile.id.padEnd(15)} ${profile.summary}`);
      if (profile.skills.length > 0) ctx.reporter.info(`${"".padEnd(15)} skills: ${profile.skills.join(", ")}`);
      if (profile.patterns.length > 0) ctx.reporter.info(`${"".padEnd(15)} patterns: ${profile.patterns.join(", ")}`);
    }
    ctx.reporter.info("");
    ctx.reporter.info("Preview with 'map plan --profile <id>[,<id>]'; apply with 'map init --profile <id>'.");
    return OK;
  },
};
