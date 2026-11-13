/**
 * `map init` — prepare a project for AI coding agents.
 *
 *   1. profile the project and build a plan (same planner as `map plan`);
 *   2. show the plan; interactively, offer suggested profiles and confirm;
 *   3. create or extend `.map/` (never overwriting existing files unless --force);
 *   4. compile agent instructions with `map sync` ownership rules;
 *   5. install skills only when the user picks them (interactively or --skills);
 *   6. validate the result.
 *
 * Without a TTY, or with --yes, only the safe defaults run: files are created when
 * missing, nothing user-owned is replaced, no skill is installed unless --skills
 * names it, and scripts or risky skills still need --allow-scripts/--allow-risky.
 * Re-running init is idempotent.
 */

import { join } from "node:path";
import { checkbox, confirm } from "@inquirer/prompts";
import type { Command, CommandContext, CommandResult } from "../command.ts";
import { OK, FAILED } from "../command.ts";
import { MAP_DIR, CONFIG_FILE, LEGACY_WORKSPACE_FILES } from "../../config/index.ts";
import { compileWorkspace, readWorkspaceConfig } from "../../compiler/index.ts";
import { buildPlan } from "../../plan/planner.ts";
import type { PlanContext, PlanOptions } from "../../plan/planner.ts";
import { applyWorkspace } from "../../plan/apply.ts";
import { profileById } from "../../profiles/index.ts";
import { addSkills } from "../../skills/index.ts";
import { SELECTION_OPTIONS, planOptionsFromFlags } from "./plan.ts";
import { reportSkillResults } from "./skills.ts";
import { renderPlan } from "../render-plan.ts";

export const initCommand: Command = {
  name: "init",
  summary: "Detect the project, then set up .map/, agent instructions, and approved skills.",
  usage: "map init [--profile <list>] [--agents <list>] [--skills <list>] [--yes]",
  options: [
    ...SELECTION_OPTIONS,
    { flags: "--skills <list>", description: "skills to install: comma-separated names, or 'recommended'" },
    { flags: "--allow-scripts", description: "approve installing skills that bundle scripts" },
    { flags: "--allow-risky", description: "approve skills with high-severity audit findings" },
    { flags: "-y, --yes", description: "apply safe defaults without prompting" },
    { flags: "-f, --force", description: "regenerate .map/ template files (does not touch agent files you wrote)" },
    { flags: "--json", description: "machine-readable result (implies --yes)" },
  ],

  async run(ctx: CommandContext): Promise<CommandResult> {
    const { cwd, services, reporter } = ctx;
    const json = ctx.flags["json"] === true;
    const yes = ctx.flags["yes"] === true || json;
    const interactive = !yes && isInteractive();
    const force = ctx.flags["force"] === true;

    const parsed = planOptionsFromFlags(ctx);
    if (typeof parsed === "string") {
      reporter.error(parsed);
      return FAILED;
    }
    let options: PlanOptions = parsed;
    const skillsFlag = typeof ctx.flags["skills"] === "string" ? ctx.flags["skills"] : undefined;

    const mapDir = join(cwd, MAP_DIR);
    if (await services.storage.exists(mapDir)) {
      await migrateLegacyWorkspace(ctx, mapDir, force || yes, interactive);
    }

    let context = await buildPlan(cwd, services, options);

    if (interactive && options.profiles === undefined && context.plan.profiles.suggested.length > 0) {
      renderPlan(context.plan, reporter);
      const chosen = await checkbox({
        message: "Apply development profiles?",
        choices: context.plan.profiles.suggested.map((id) => ({ name: `${id} — ${profileById(id)?.summary ?? ""}`, value: id, checked: true })),
      });
      if (chosen.length > 0) {
        options = { ...options, profiles: chosen.map((id) => profileById(id)!).filter(Boolean) };
        context = await buildPlan(cwd, services, options);
      }
    }

    if (!json) {
      renderPlan(context.plan, reporter);
      reporter.info("");
    }
    if (interactive && !(await confirm({ message: "Apply the workspace changes listed above?", default: true }))) {
      reporter.warn("Nothing changed.");
      return OK;
    }

    const applied = await applyWorkspace(cwd, services, context, { forceTemplates: force });
    const selectedSkills = await chooseSkills(ctx, context, skillsFlag, interactive);
    if (typeof selectedSkills === "string") {
      reporter.error(selectedSkills);
      return FAILED;
    }

    let skillFailures = 0;
    let skillResults: Awaited<ReturnType<typeof addSkills>>["results"] = [];
    if (selectedSkills.length > 0) {
      if (context.loaded === undefined) {
        reporter.error("skill sources are unavailable; cannot install skills (see the limitations above).");
        return FAILED;
      }
      const approve = {
        scripts: ctx.flags["allowScripts"] === true,
        risky: ctx.flags["allowRisky"] === true,
      };
      if (interactive) {
        for (const name of selectedSkills) {
          const planned = context.plan.skills.recommendations.find((s) => s.name === name);
          if (planned?.approvals.includes("scripts") === true && !approve.scripts) {
            approve.scripts = await confirm({ message: `'${name}' bundles scripts (${planned.scripts.join(", ")}). Install them? MAP never runs them; an agent may.`, default: false });
          }
          if (planned?.approvals.includes("risky") === true && !approve.risky) {
            approve.risky = await confirm({ message: `'${name}' has high-severity audit findings. Install anyway?`, default: false });
          }
        }
      }
      const outcome = await addSkills(
        { root: cwd, sources: context.skillSources, ...(options.env !== undefined ? { env: options.env } : {}) },
        context.loaded,
        selectedSkills,
        { agents: context.plan.agents.selected, approve, force: false, dryRun: false },
      );
      skillResults = outcome.results;
      skillFailures = outcome.results.filter((r) => r.status !== "installed" && r.status !== "unchanged").length;
    }

    // Validate: the config must parse and generated files must be current.
    const problems: string[] = [];
    try {
      await readWorkspaceConfig(services.storage, cwd);
      const check = await compileWorkspace(services.storage, cwd, services.adapters, { force: false });
      for (const plan of check.plans.filter((p) => p.action !== "unchanged" && p.action !== "conflict")) {
        problems.push(`${plan.path} is out of date`);
      }
    } catch (error) {
      problems.push(error instanceof Error ? error.message : String(error));
    }

    const conflicts = applied.outputs.filter((o) => o.action === "conflict");
    if (json) {
      reporter.data(JSON.stringify({
        schemaVersion: 1,
        kind: "map.init-result",
        plan: context.plan,
        created: applied.created,
        updated: applied.updated,
        outputs: applied.outputs.map(({ content: _content, ...o }) => o),
        skills: skillResults,
        problems,
      }, null, 2));
    } else {
      for (const file of applied.created) reporter.info(`created ${file}`);
      for (const file of applied.updated) reporter.info(`updated ${file}`);
      for (const output of applied.outputs) {
        if (output.action === "create" || output.action === "update") reporter.info(`generated ${output.path}`);
      }
      for (const conflict of conflicts) reporter.warn(`kept ${conflict.path}: ${conflict.reason ?? "conflict"}`);
      if (skillResults.length > 0) reportSkillResults(ctx, skillResults);
      for (const problem of problems) reporter.error(problem);
      if (problems.length === 0 && skillFailures === 0) {
        const generated = applied.outputs.filter((o) => o.action === "create" || o.action === "update").length;
        const installed = skillResults.filter((r) => r.status === "installed").length;
        const changed = applied.created.length + applied.updated.length + generated + installed;
        reporter.success(`MAP is set up for ${context.plan.agents.selected.join(", ")}.${changed === 0 ? " Nothing needed to change." : ""}`);
      }
      reporter.info("Next: edit the Markdown in .map/, then run 'map sync'. See skills with 'map skills suggest'.");
    }
    return problems.length > 0 || skillFailures > 0 ? FAILED : OK;
  },
};

async function chooseSkills(
  ctx: CommandContext,
  context: PlanContext,
  flag: string | undefined,
  interactive: boolean,
): Promise<readonly string[] | string> {
  const available = context.plan.skills.recommendations.filter((s) => !s.installed).map((s) => s.name);
  if (flag !== undefined) {
    if (flag.trim() === "recommended") return available;
    return [...new Set(flag.split(",").map((s) => s.trim()).filter((s) => s !== ""))];
  }
  if (!interactive || available.length === 0) return [];
  return checkbox({
    message: "Install recommended skills? (space to select, enter to confirm)",
    choices: context.plan.skills.recommendations
      .filter((s) => !s.installed)
      .map((s) => ({
        name: `${s.name} — ${s.purpose}${s.approvals.length > 0 ? ` [needs approval: ${s.approvals.join(", ")}]` : ""}`,
        value: s.name,
        checked: false,
      })),
  });
}

/**
 * Removes v1 workspace files (config.yaml, project.yaml, knowledge/patterns.json)
 * after consent — `--force`/`--yes`, or an interactive confirmation.
 */
async function migrateLegacyWorkspace(ctx: CommandContext, mapDir: string, consented: boolean, interactive: boolean): Promise<void> {
  const { storage } = ctx.services;
  const present: string[] = [];
  for (const file of LEGACY_WORKSPACE_FILES) {
    if (await storage.exists(join(mapDir, file))) present.push(file);
  }
  if (present.length === 0) return;

  ctx.reporter.warn(`Legacy workspace files found (${present.join(", ")}); the workspace format is now ${CONFIG_FILE}.`);
  let migrate = consented;
  if (!migrate && interactive) {
    migrate = await confirm({ message: `Remove the legacy files? (${CONFIG_FILE} replaces them)`, default: true });
  }
  if (!migrate) {
    ctx.reporter.warn("Keeping legacy files. Re-run with --yes (or --force) to migrate.");
    return;
  }
  for (const file of present) {
    await storage.removeFile(join(mapDir, file));
    ctx.reporter.info(`removed legacy ${MAP_DIR}/${file}`);
  }
}

function isInteractive(): boolean {
  return process.stdout.isTTY === true && process.stdin.isTTY === true;
}
