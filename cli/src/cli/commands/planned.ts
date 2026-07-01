/**
 * Factory for commands that are scaffolded but not implemented yet. They exist so the
 * command surface (Module 5) is complete and discoverable via `map --help`, while the
 * underlying modules (analyzer, recommender, graph) are still interfaces.
 *
 * Each returns exit code 0 and prints what it will eventually do, plus its module.
 */

import type { Command, CommandContext, CommandResult } from "../command.ts";
import { OK } from "../command.ts";

export interface PlannedSpec {
  readonly name: string;
  readonly summary: string;
  /** Which module in future/cli.md provides this. */
  readonly module: string;
}

export function planned(spec: PlannedSpec): Command {
  return {
    name: spec.name,
    summary: spec.summary,
    usage: `map ${spec.name}`,
    async run(ctx: CommandContext): Promise<CommandResult> {
      ctx.reporter.warn(
        `'${spec.name}' is planned but not implemented yet (${spec.module}).`,
      );
      ctx.reporter.info(spec.summary);
      return OK;
    },
  };
}
