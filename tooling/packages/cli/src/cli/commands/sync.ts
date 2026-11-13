/**
 * `map sync` — compile `.map/` into every configured AI context file.
 *
 * Developers edit the Markdown under `.map/`; `sync` regenerates CLAUDE.md,
 * AGENTS.md, GEMINI.md, the Cursor rule, and the Copilot instructions. Each output
 * carries a banner with a content hash, so sync can tell its own files from hand
 * edits: MAP-generated files are regenerated, while hand-written or hand-edited
 * files are reported as conflicts and left untouched unless `--force` (which keeps
 * a backup). `--check` writes nothing and fails when outputs are out of date.
 */

import type { Command, CommandContext, CommandResult } from "../command.ts";
import { OK, FAILED } from "../command.ts";
import { applyOutputs, compileWorkspace } from "../../compiler/index.ts";
import type { OutputPlan } from "../../compiler/index.ts";

export const syncCommand: Command = {
  name: "sync",
  summary: "Compile .map/ into the AI context files (CLAUDE.md, AGENTS.md, …).",
  usage: "map sync [--check] [--force] [--json]",
  options: [
    { flags: "--check", description: "write nothing; exit 1 when outputs are missing, stale, or conflicting" },
    { flags: "-f, --force", description: "replace hand-written or edited outputs (a backup is kept)" },
    { flags: "--json", description: "machine-readable result" },
  ],

  async run(ctx: CommandContext): Promise<CommandResult> {
    const { cwd, services, reporter } = ctx;
    const check = ctx.flags["check"] === true;
    const json = ctx.flags["json"] === true;

    let compilation;
    try {
      compilation = await compileWorkspace(services.storage, cwd, services.adapters, {
        force: ctx.flags["force"] === true && !check,
      });
    } catch (error) {
      reporter.error(error instanceof Error ? error.message : String(error));
      return FAILED;
    }
    const { plans, unknownTargets, documents } = compilation;
    const conflicts = plans.filter((p) => p.action === "conflict");
    const pending = plans.filter((p) => p.action !== "unchanged");

    let backups: string[] = [];
    if (!check) backups = await applyOutputs(services.storage, cwd, plans);

    if (json) {
      reporter.data(
        JSON.stringify(
          {
            schemaVersion: 1,
            kind: "map.sync-result",
            mode: check ? "check" : "write",
            documents,
            outputs: plans.map(({ content: _content, ...plan }) => plan),
            unknownTargets,
            backups,
          },
          null,
          2,
        ),
      );
    } else {
      reporter.info(`Loaded ${documents} document(s) from .map/.`);
      for (const target of unknownTargets) {
        reporter.warn(`target '${target}' has no adapter; supported: ${services.adapters.ids().join(", ")}`);
      }
      for (const plan of plans) reportPlan(ctx, plan, check);
      for (const backup of backups) reporter.info(`backup kept at ${backup}`);
      if (plans.length === 0) reporter.warn("no outputs generated; check the 'targets' in map.config.json.");
      else if (check) {
        if (pending.length === 0) reporter.success("generated files are up to date.");
        else reporter.error(`${pending.length} file(s) need 'map sync'${conflicts.length > 0 ? ` (${conflicts.length} conflict(s))` : ""}.`);
      } else if (conflicts.length > 0) {
        reporter.error(`${conflicts.length} file(s) not written because of conflicts.`);
      } else {
        const written = plans.filter((p) => p.action !== "unchanged").length;
        reporter.success(`sync complete — ${written} file(s) written, ${plans.length - written} unchanged.`);
      }
    }

    if (unknownTargets.length > 0 || conflicts.length > 0 || plans.length === 0) return FAILED;
    if (check && pending.length > 0) return FAILED;
    return OK;
  },
};

function reportPlan(ctx: CommandContext, plan: OutputPlan, check: boolean): void {
  const verb: Record<OutputPlan["action"], string> = check
    ? { create: "missing", update: "stale", unchanged: "up to date", conflict: "conflict", "replace-with-backup": "would replace" }
    : { create: "generated", update: "updated", unchanged: "unchanged", conflict: "conflict", "replace-with-backup": "replaced" };
  const line = `${verb[plan.action]} ${plan.path} (${plan.target})${plan.reason !== undefined ? ` — ${plan.reason}` : ""}`;
  if (plan.action === "conflict") ctx.reporter.warn(line);
  else ctx.reporter.info(line);
}
