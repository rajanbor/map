/**
 * `map recommend [path]` — the "what is missing" half of the loop.
 *
 * Analyzes the project (same pipeline as `map analyze`) and asks the recommendation
 * engine which MAP patterns the detected architecture is missing. Stateless on
 * purpose: it always analyzes fresh rather than trusting a stale saved report.
 */

import { resolve } from "node:path";
import type { Command, CommandContext, CommandResult } from "../command.ts";
import { OK } from "../command.ts";
import { detectArchitecture } from "./analyze.ts";

export const recommendCommand: Command = {
  name: "recommend",
  summary: "Recommend patterns missing from the detected architecture.",
  usage: "map recommend [path]",

  async run(ctx: CommandContext): Promise<CommandResult> {
    const { reporter, services } = ctx;
    const root = resolve(ctx.cwd, ctx.args[0] ?? ".");

    const architecture = await detectArchitecture(root, services);
    if (architecture === undefined || architecture.concepts.length === 0) {
      reporter.info("No AI usage detected — nothing to recommend.");
      reporter.info("Run 'map analyze' to see what MAP looks for.");
      return OK;
    }

    const detected = architecture.concepts.map((c) => c.concept).join(", ");
    reporter.info(`Detected: ${detected}`);

    const recommendations = await services.recommender.recommend(architecture);
    if (recommendations.length === 0) {
      reporter.success("No gaps found for the detected architecture.");
      return OK;
    }

    reporter.info("");
    for (const recommendation of recommendations) {
      reporter.info(
        `[${recommendation.priority}] ${recommendation.pattern} (triggered by: ${recommendation.triggeredBy.join(", ")})`,
      );
      reporter.info(`       ${recommendation.rationale}`);
    }
    reporter.info("");
    reporter.success(
      `${recommendations.length} recommendation(s). Patterns live under patterns/<category>/<name>/ (see ROADMAP.md).`,
    );
    return OK;
  },
};
