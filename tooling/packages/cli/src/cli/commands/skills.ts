/**
 * `map skills …` — discover, recommend, install, update, remove, and audit Agent
 * Skills. Domain logic lives in src/skills/; this file parses flags and prints.
 *
 *   list | search <query> | info <name>   catalog (cached; --refresh to fetch)
 *   suggest [path]                        evidence-based recommendations
 *   add <name...>                         install approved skills, update the lock
 *   install                               reinstall exactly what the lock records
 *   update [name...]                      move to the latest source revision
 *   remove <name...>                      remove MAP-installed skills
 *   audit [name...]                       verify installed skills, or audit catalog ones
 */

import { resolve } from "node:path";
import type { Command, CommandContext, CommandResult } from "../command.ts";
import { OK, FAILED } from "../command.ts";
import type { AgentId } from "../../agents/index.ts";
import { parseAgentList, sortAgents } from "../../agents/index.ts";
import { readWorkspaceConfig } from "../../compiler/index.ts";
import { MAP_DIR } from "../../config/index.ts";
import { profileProject } from "../../project/index.ts";
import { parseProfileList } from "../../profiles/index.ts";
import type { AuditReport, SkillResult, SkillsEnv } from "../../skills/index.ts";
import {
  DEFAULT_SKILL_SOURCES,
  addSkills,
  auditInstalled,
  findSkill,
  installFromLock,
  loadCatalog,
  prepareSkill,
  readLock,
  recommendSkills,
  removeSkills,
  searchSkills,
  updateSkills,
} from "../../skills/index.ts";
import { purposeOf } from "../../skills/metadata.ts";

const SUCCESS: ReadonlySet<SkillResult["status"]> = new Set(["installed", "removed", "unchanged", "planned"]);
const JSON_FLAG = { flags: "--json", description: "machine-readable output" } as const;
const REFRESH_FLAG = { flags: "--refresh", description: "fetch the latest revision of each source" } as const;
const SOURCE_FLAG = { flags: "--source <id>", description: "choose the source when a name exists in several" } as const;
const DRY_RUN_FLAG = { flags: "--dry-run", description: "show what would change without writing" } as const;
const FORCE_FLAG = { flags: "-f, --force", description: "replace directories MAP did not install or that were edited (a backup is kept)" } as const;
const APPROVAL_FLAGS = [
  { flags: "--allow-scripts", description: "approve skills that bundle scripts (keeps their execute bit)" },
  { flags: "--allow-risky", description: "approve skills with high-severity audit findings" },
] as const;

async function skillsEnv(ctx: CommandContext, root = ctx.cwd): Promise<SkillsEnv> {
  const config = await readWorkspaceConfig(ctx.services.storage, root).catch(() => undefined);
  return { root, sources: config?.skills?.sources ?? DEFAULT_SKILL_SOURCES };
}

async function configuredAgents(ctx: CommandContext): Promise<readonly AgentId[]> {
  const config = await readWorkspaceConfig(ctx.services.storage, ctx.cwd).catch(() => undefined);
  if (config?.agents !== undefined && config.agents.length > 0) return config.agents;
  const profile = await profileProject(ctx.cwd, ctx.services.storage, { maxDepth: 0 });
  const detected = sortAgents([...profile.project.agents, ...profile.probable.agents]);
  return detected.length > 0 ? detected : ["claude"];
}

function json(ctx: CommandContext, kind: string, payload: Record<string, unknown>): void {
  ctx.reporter.data(JSON.stringify({ schemaVersion: 1, kind, ...payload }, null, 2));
}

async function guard(ctx: CommandContext, work: () => Promise<CommandResult>): Promise<CommandResult> {
  try {
    return await work();
  } catch (error) {
    ctx.reporter.error(error instanceof Error ? error.message : String(error));
    return FAILED;
  }
}

async function requireWorkspace(ctx: CommandContext): Promise<boolean> {
  if (await ctx.services.storage.exists(resolve(ctx.cwd, MAP_DIR))) return true;
  ctx.reporter.error(`No ${MAP_DIR}/ workspace here. Run 'map init' first (the skills lockfile lives in ${MAP_DIR}/).`);
  return false;
}

// --- catalog ------------------------------------------------------------------

const listCommand: Command = {
  name: "list",
  summary: "List skills available from the configured sources.",
  options: [REFRESH_FLAG, JSON_FLAG],
  run: (ctx) => guard(ctx, async () => {
    const loaded = await loadCatalog(await skillsEnv(ctx), { refresh: ctx.flags["refresh"] === true });
    const lock = await readLock(ctx.cwd).catch(() => undefined);
    if (ctx.flags["json"] === true) {
      json(ctx, "map.skill-catalog", {
        sources: loaded.catalog.sources,
        skills: loaded.catalog.skills.map((s) => ({ ...s, installed: lock?.skills[s.name] !== undefined })),
        conflicts: loaded.catalog.conflicts,
        warnings: loaded.catalog.warnings,
      });
      return OK;
    }
    for (const warning of loaded.catalog.warnings) ctx.reporter.warn(warning);
    for (const source of loaded.catalog.sources) {
      ctx.reporter.info(`${source.id} @ ${source.revision.slice(0, 12)}${source.fetchedAt !== undefined ? ` (fetched ${source.fetchedAt})` : ""}${source.stale ? " — cached, refresh failed" : ""}`);
    }
    for (const skill of loaded.catalog.skills) {
      const flags = [lock?.skills[skill.name] !== undefined ? "installed" : "", skill.errors.length > 0 ? "invalid" : ""].filter(Boolean);
      ctx.reporter.info(`  ${skill.name}${skill.version !== undefined ? ` ${skill.version}` : ""}${flags.length > 0 ? ` [${flags.join(", ")}]` : ""} — ${purposeOf(skill.description)}`);
    }
    for (const conflict of loaded.catalog.conflicts) ctx.reporter.warn(`'${conflict.name}' is provided by ${conflict.locations.join(" and ")}; use --source`);
    ctx.reporter.success(`${loaded.catalog.skills.length} skill(s). Details: 'map skills info <name>'.`);
    return OK;
  }),
};

const searchCommand: Command = {
  name: "search",
  summary: "Search skills by name, category, or description.",
  args: "<query...>",
  options: [REFRESH_FLAG, JSON_FLAG],
  run: (ctx) => guard(ctx, async () => {
    const loaded = await loadCatalog(await skillsEnv(ctx), { refresh: ctx.flags["refresh"] === true });
    const matches = searchSkills(loaded.catalog, ctx.args.join(" "));
    if (ctx.flags["json"] === true) {
      json(ctx, "map.skill-search", { query: ctx.args.join(" "), skills: matches });
      return OK;
    }
    if (matches.length === 0) ctx.reporter.warn(`No skills match '${ctx.args.join(" ")}'.`);
    for (const skill of matches) ctx.reporter.info(`  ${skill.name} (${skill.source}) — ${purposeOf(skill.description)}`);
    return OK;
  }),
};

const infoCommand: Command = {
  name: "info",
  summary: "Show a skill's metadata, files, audit summary, and install state.",
  args: "<name>",
  options: [SOURCE_FLAG, REFRESH_FLAG, JSON_FLAG],
  run: (ctx) => guard(ctx, async () => {
    const loaded = await loadCatalog(await skillsEnv(ctx), { refresh: ctx.flags["refresh"] === true });
    const found = findSkill(loaded.catalog, ctx.args[0]!, stringFlag(ctx, "source"));
    if (found.skill === undefined) {
      ctx.reporter.error(found.error!);
      return FAILED;
    }
    const prepared = await prepareSkill(loaded.snapshots.get(found.skill.source)!, found.skill);
    const locked = (await readLock(ctx.cwd).catch(() => undefined))?.skills[found.skill.name];
    if (ctx.flags["json"] === true) {
      json(ctx, "map.skill-info", {
        skill: found.skill,
        files: prepared.files.map((f) => f.entry),
        integrity: prepared.integrity,
        audit: prepared.audit,
        installed: locked ?? null,
      });
      return OK;
    }
    const s = found.skill;
    ctx.reporter.info(`${s.name}${s.version !== undefined ? ` ${s.version}` : ""} — ${s.source}:${s.path} @ ${s.revision.slice(0, 12)}`);
    ctx.reporter.info(s.description);
    if (s.compatibility !== undefined) ctx.reporter.info(`compatibility: ${s.compatibility}`);
    if (s.license !== undefined) ctx.reporter.info(`license: ${s.license}`);
    ctx.reporter.info(`files: ${prepared.files.length} (${prepared.files.reduce((n, f) => n + f.entry.size, 0)} bytes)`);
    for (const error of s.errors) ctx.reporter.error(`invalid: ${error}`);
    reportAudit(ctx, prepared.audit);
    ctx.reporter.info(locked !== undefined ? `installed: ${locked.targets.map((t) => `${t.dir}/${s.name}`).join(", ")} @ ${locked.revision.slice(0, 12)}` : `not installed — 'map skills add ${s.name}'`);
    return OK;
  }),
};

const suggestCommand: Command = {
  name: "suggest",
  summary: "Recommend skills for this project, with the evidence behind each.",
  args: "[path]",
  options: [{ flags: "-p, --profile <list>", description: "include skills from development profiles" }, REFRESH_FLAG, JSON_FLAG],
  run: (ctx) => guard(ctx, async () => {
    const root = resolve(ctx.cwd, ctx.args[0] ?? ".");
    const profiles = typeof ctx.flags["profile"] === "string" ? parseProfileList(ctx.flags["profile"]) : { profiles: [], unknown: [] };
    if (profiles.unknown.length > 0) {
      ctx.reporter.error(`unknown profile(s): ${profiles.unknown.join(", ")}`);
      return FAILED;
    }
    const [profile, env] = [await profileProject(root, ctx.services.storage), await skillsEnv(ctx, root)];
    let catalog;
    const limitations: string[] = [];
    try {
      catalog = (await loadCatalog(env, { refresh: ctx.flags["refresh"] === true })).catalog;
      limitations.push(...catalog.warnings);
    } catch (error) {
      limitations.push(error instanceof Error ? error.message.split("\n")[0]! : String(error));
    }
    const lock = await readLock(root).catch(() => undefined);
    const result = recommendSkills(profile, catalog, { profiles: profiles.profiles, ...(lock !== undefined ? { lock } : {}) });
    if (ctx.flags["json"] === true) {
      json(ctx, "map.skill-recommendations", { root, ...result, limitations: [...limitations, "Recommendations are review candidates from static evidence; nothing is installed automatically."] });
      return OK;
    }
    for (const note of limitations) ctx.reporter.warn(note);
    if (result.recommendations.length === 0) ctx.reporter.info("No configured skill matches the detected stack.");
    for (const rec of result.recommendations) {
      ctx.reporter.info(`${rec.name}${rec.installed ? " [installed]" : ""} (${rec.source}) — ${rec.purpose}`);
      ctx.reporter.info(`    why: ${rec.reasons.join(" ")}`);
      if (rec.evidence.length > 0) ctx.reporter.info(`    evidence: ${rec.evidence.map((e) => `${e.file} (${e.certainty})`).join(", ")}`);
    }
    for (const missing of result.unavailable) ctx.reporter.info(`${missing.name} — not available: ${missing.reason}`);
    for (const gap of result.gaps) ctx.reporter.info(`(no skill in configured sources) ${gap.need} — ${gap.reason}`);
    if (result.recommendations.some((r) => !r.installed)) {
      ctx.reporter.info("");
      ctx.reporter.info(`Review with 'map skills info <name>', then install with 'map skills add ${result.recommendations.filter((r) => !r.installed).map((r) => r.name).join(" ")}'.`);
    }
    return OK;
  }),
};

// --- install / update / remove ------------------------------------------------------

const addCommand: Command = {
  name: "add",
  summary: "Install skills into the project for the configured agents and pin them in the lockfile.",
  args: "<names...>",
  options: [
    { flags: "--agents <list>", description: "agents to install for (default: map.config.json agents, else detected, else claude)" },
    SOURCE_FLAG, ...APPROVAL_FLAGS, FORCE_FLAG, DRY_RUN_FLAG, REFRESH_FLAG, JSON_FLAG,
  ],
  run: (ctx) => guard(ctx, async () => {
    if (!(await requireWorkspace(ctx))) return FAILED;
    let agents = await configuredAgents(ctx);
    if (typeof ctx.flags["agents"] === "string") {
      const parsed = parseAgentList(ctx.flags["agents"]);
      if (parsed.unknown.length > 0 || parsed.agents.length === 0) {
        ctx.reporter.error(`unknown agent(s): ${parsed.unknown.join(", ") || "(none given)"}`);
        return FAILED;
      }
      agents = parsed.agents;
    }
    const env = await skillsEnv(ctx);
    const loaded = await loadCatalog(env, { refresh: ctx.flags["refresh"] === true });
    for (const warning of loaded.catalog.warnings) ctx.reporter.warn(warning);
    const source = stringFlag(ctx, "source");
    const { results } = await addSkills(env, loaded, ctx.args, {
      agents,
      approve: approvals(ctx),
      force: ctx.flags["force"] === true,
      dryRun: ctx.flags["dryRun"] === true,
      ...(source !== undefined ? { source } : {}),
    });
    return finish(ctx, "map.skill-install-result", results);
  }),
};

const installCommand: Command = {
  name: "install",
  summary: "Reinstall exactly the skill revisions recorded in .map/skills.lock.json.",
  options: [FORCE_FLAG, DRY_RUN_FLAG, JSON_FLAG],
  run: (ctx) => guard(ctx, async () => {
    if (!(await requireWorkspace(ctx))) return FAILED;
    const results = await installFromLock(await skillsEnv(ctx), { force: ctx.flags["force"] === true, dryRun: ctx.flags["dryRun"] === true });
    if (results.length === 0 && ctx.flags["json"] !== true) ctx.reporter.info("The lockfile lists no skills.");
    return finish(ctx, "map.skill-install-result", results);
  }),
};

const updateCommand: Command = {
  name: "update",
  summary: "Update installed skills to the latest revision of their source.",
  args: "[names...]",
  options: [...APPROVAL_FLAGS, FORCE_FLAG, DRY_RUN_FLAG, JSON_FLAG],
  run: (ctx) => guard(ctx, async () => {
    if (!(await requireWorkspace(ctx))) return FAILED;
    const results = await updateSkills(await skillsEnv(ctx), ctx.args, {
      approve: approvals(ctx),
      force: ctx.flags["force"] === true,
      dryRun: ctx.flags["dryRun"] === true,
    });
    if (results.length === 0 && ctx.flags["json"] !== true) ctx.reporter.info("No installed skills to update.");
    return finish(ctx, "map.skill-update-result", results);
  }),
};

const removeCommand: Command = {
  name: "remove",
  summary: "Remove skills installed by MAP (edited copies are kept unless --force).",
  args: "<names...>",
  options: [{ flags: "-f, --force", description: "move edited skill directories to a backup instead of refusing" }, DRY_RUN_FLAG, JSON_FLAG],
  run: (ctx) => guard(ctx, async () => {
    if (!(await requireWorkspace(ctx))) return FAILED;
    const results = await removeSkills(await skillsEnv(ctx), ctx.args, { force: ctx.flags["force"] === true, dryRun: ctx.flags["dryRun"] === true });
    return finish(ctx, "map.skill-remove-result", results);
  }),
};

const auditCommand: Command = {
  name: "audit",
  summary: "Verify installed skills against the lockfile and scan them; or audit catalog skills by name.",
  args: "[names...]",
  options: [SOURCE_FLAG, JSON_FLAG],
  run: (ctx) => guard(ctx, async () => {
    if (ctx.args.length > 0) {
      const loaded = await loadCatalog(await skillsEnv(ctx));
      const reports: AuditReport[] = [];
      let failed = false;
      for (const name of ctx.args) {
        const found = findSkill(loaded.catalog, name, stringFlag(ctx, "source"));
        if (found.skill === undefined) {
          ctx.reporter.error(found.error!);
          failed = true;
          continue;
        }
        const prepared = await prepareSkill(loaded.snapshots.get(found.skill.source)!, found.skill);
        reports.push(prepared.audit);
        if (ctx.flags["json"] !== true) {
          ctx.reporter.info(`${name} (${found.skill.source} @ ${found.skill.revision.slice(0, 12)})`);
          reportAudit(ctx, prepared.audit);
        }
        if (prepared.audit.blocked || prepared.audit.findings.some((f) => f.severity === "high")) failed = true;
      }
      if (ctx.flags["json"] === true) json(ctx, "map.skill-audit", { reports });
      return failed ? FAILED : OK;
    }

    const installed = await auditInstalled(ctx.cwd);
    const bad = installed.filter((r) => r.integrity === "modified" || r.integrity === "missing" || r.integrity === "unsafe" || r.audit?.blocked === true || r.audit?.findings.some((f) => f.severity === "high") === true);
    if (ctx.flags["json"] === true) {
      json(ctx, "map.skill-audit", { installed, ok: bad.length === 0 });
      return bad.length > 0 ? FAILED : OK;
    }
    if (installed.length === 0) ctx.reporter.info("No skills found in project skill directories.");
    for (const item of installed) {
      ctx.reporter.info(`${item.path} — ${item.managed ? item.integrity : "not managed by MAP"}${item.detail !== undefined ? ` (${item.detail})` : ""}`);
      if (item.audit !== undefined) reportAudit(ctx, item.audit, "    ");
    }
    if (bad.length > 0) ctx.reporter.error(`${bad.length} skill director${bad.length === 1 ? "y needs" : "ies need"} attention.`);
    else if (installed.length > 0) ctx.reporter.success("Installed skills match the lockfile; no high-severity findings.");
    return bad.length > 0 ? FAILED : OK;
  }),
};

export const skillsCommand: Command = {
  name: "skills",
  summary: "Discover, recommend, install, update, remove, and audit Agent Skills.",
  usage: "map skills <list|search|info|suggest|add|install|update|remove|audit>",
  subcommands: [listCommand, searchCommand, infoCommand, suggestCommand, addCommand, installCommand, updateCommand, removeCommand, auditCommand],
  async run() {
    return FAILED;
  },
};

// --- shared output ------------------------------------------------------------------

function finish(ctx: CommandContext, kind: string, results: readonly SkillResult[]): CommandResult {
  const failed = results.some((r) => !SUCCESS.has(r.status));
  if (ctx.flags["json"] === true) json(ctx, kind, { results });
  else reportSkillResults(ctx, results);
  return failed ? FAILED : OK;
}

export function reportSkillResults(ctx: CommandContext, results: readonly SkillResult[]): void {
  for (const result of results) {
    const line = `${result.name}: ${result.message}`;
    if (SUCCESS.has(result.status)) ctx.reporter.info(line);
    else ctx.reporter.error(line);
    for (const target of result.targets) {
      if (target.action === "unchanged" && result.status === "unchanged") continue;
      ctx.reporter.info(`    ${target.action} ${target.path}${target.reason !== undefined ? ` — ${target.reason}` : ""}${target.backup !== undefined ? ` (backup: ${target.backup})` : ""}`);
    }
    if (result.status === "needs-approval" && result.audit !== undefined) reportAudit(ctx, result.audit, "    ");
  }
}

function reportAudit(ctx: CommandContext, audit: AuditReport, indent = "  "): void {
  if (audit.capabilities.scripts.length > 0) ctx.reporter.info(`${indent}scripts: ${audit.capabilities.scripts.join(", ")}`);
  if (audit.capabilities.network.length > 0) ctx.reporter.info(`${indent}network endpoints in scripts: ${audit.capabilities.network.join(", ")}`);
  const notable = audit.findings.filter((f) => f.severity !== "info");
  if (notable.length === 0) ctx.reporter.info(`${indent}audit: no known risky pattern matched (heuristic; not a guarantee)`);
  for (const finding of notable) {
    const where = `${finding.file}${finding.line !== undefined ? `:${finding.line}` : ""}`;
    ctx.reporter.warn(`${indent}${finding.severity} ${finding.rule} ${where} — ${finding.message}${finding.evidence !== undefined ? `: ${finding.evidence}` : ""}`);
  }
}

function approvals(ctx: CommandContext): { scripts: boolean; risky: boolean } {
  return { scripts: ctx.flags["allowScripts"] === true, risky: ctx.flags["allowRisky"] === true };
}

function stringFlag(ctx: CommandContext, name: string): string | undefined {
  const value = ctx.flags[name];
  return typeof value === "string" && value !== "" ? value : undefined;
}
