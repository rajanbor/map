/**
 * The configuration planner: one read-only computation of everything MAP would set
 * up in a project. `map plan` prints it; `map init` prints it, asks, and applies it.
 *
 * Inputs are the Project Profiler result, the existing workspace (if any), selected
 * agents and profiles, the pattern recommender, and the skill catalog. The plan
 * lists proposed files with an owner and an action, conflicts, approvals that the
 * user must grant, and security notes. Building a plan never writes to the project.
 */

import { join } from "node:path";
import type { AgentId } from "../agents/index.ts";
import { agentById, skillDirectoriesFor, sortAgents } from "../agents/index.ts";
import type { MapConfig } from "../config/index.ts";
import { CONFIG_FILE, CONFIG_SCHEMA_VERSION, DEFAULT_TARGETS, MAP_DIR } from "../config/index.ts";
import { compileWorkspace, ownershipOf, readWorkspaceConfig } from "../compiler/index.ts";
import type { ProjectProfile } from "../project/index.ts";
import { allSignals, profileProject } from "../project/index.ts";
import type { Profile } from "../profiles/index.ts";
import { suggestedProfiles } from "../profiles/index.ts";
import type { Services } from "../services.ts";
import { scanArchitecture } from "../cli/commands/analyze.ts";
import type { SkillCatalog, SkillRecommendations, SkillsLock } from "../skills/index.ts";
import { DEFAULT_SKILL_SOURCES, loadCatalog, prepareSkill, readLock, recommendSkills } from "../skills/index.ts";
import type { LoadedCatalog } from "../skills/index.ts";
import type { SkillSourceConfig } from "../skills/source.ts";
import { diskStatus } from "../skills/installer.ts";

export type ChangeAction = "create" | "update" | "keep" | "conflict";
export type ChangeOwner = "map" | "user" | "generated";

export interface PlannedChange {
  readonly path: string;
  readonly action: ChangeAction;
  readonly owner: ChangeOwner;
  readonly reason: string;
}

export interface PlannedSkill {
  readonly name: string;
  readonly purpose: string;
  readonly reasons: readonly string[];
  readonly evidence: SkillRecommendations["recommendations"][number]["evidence"];
  readonly source: string;
  readonly version?: string;
  readonly compatibility?: string;
  readonly installed: boolean;
  readonly approvals: ReadonlyArray<"scripts" | "risky">;
  readonly findings: { readonly high: number; readonly medium: number };
  readonly scripts: readonly string[];
  readonly destinations: ReadonlyArray<{ readonly path: string; readonly action: ChangeAction; readonly reason?: string }>;
}

export interface PlannedPattern {
  readonly id: string;
  readonly name: string;
  readonly status: string;
  readonly priority: string;
  readonly reasons: readonly string[];
}

export interface Plan {
  readonly schemaVersion: 1;
  readonly kind: "map.plan";
  readonly root: string;
  readonly workspace: "new" | "existing";
  readonly project: ProjectProfile["project"];
  readonly probable: ProjectProfile["probable"];
  readonly workspaces: number;
  readonly agents: {
    readonly detected: readonly AgentId[];
    readonly selected: readonly AgentId[];
    readonly selectedBy: "flag" | "config" | "detected" | "default";
  };
  readonly profiles: { readonly selected: readonly string[]; readonly suggested: readonly string[] };
  readonly skills: {
    readonly sources: SkillCatalog["sources"];
    readonly recommendations: readonly PlannedSkill[];
    readonly unavailable: SkillRecommendations["unavailable"];
    readonly gaps: SkillRecommendations["gaps"];
  };
  readonly patterns: readonly PlannedPattern[];
  readonly changes: readonly PlannedChange[];
  readonly conflicts: readonly PlannedChange[];
  readonly approvals: readonly string[];
  readonly security: readonly string[];
  readonly limitations: readonly string[];
}

export interface PlanOptions {
  readonly agents?: readonly AgentId[];
  readonly profiles?: readonly Profile[];
  /** Skip loading skill sources (no network, no cache). */
  readonly skipSkills?: boolean;
  readonly refreshSkills?: boolean;
  readonly env?: Readonly<Record<string, string | undefined>>;
}

export interface PlanContext {
  readonly plan: Plan;
  readonly profile: ProjectProfile;
  readonly existingConfig?: MapConfig;
  /** The config `map init` would write (merged with the existing one). */
  readonly nextConfig: ConfigChanges;
  readonly loaded?: LoadedCatalog;
  readonly lock: SkillsLock;
  readonly skillSources: readonly SkillSourceConfig[];
}

/** The additions MAP makes to map.config.json. Existing values are never removed. */
export interface ConfigChanges {
  readonly agents: readonly AgentId[];
  readonly profiles: readonly string[];
  readonly targets: Readonly<Record<string, { readonly output: string }>>;
}

export async function buildPlan(root: string, services: Services, options: PlanOptions = {}): Promise<PlanContext> {
  const { storage } = services;
  const limitations: string[] = [];
  const security: string[] = [];
  const changes: PlannedChange[] = [];

  let existingConfig: MapConfig | undefined;
  let configError: string | undefined;
  try {
    existingConfig = await readWorkspaceConfig(storage, root);
  } catch (error) {
    configError = messageOf(error);
  }
  const workspaceExists = await storage.exists(join(root, MAP_DIR));

  const profile = await profileProject(root, storage, existingConfig !== undefined ? { exclude: existingConfig.analysis.exclude } : {});
  const signals = allSignals(profile);
  limitations.push(...profile.limitations);

  // --- agents --------------------------------------------------------------------
  const detected = sortAgents([...profile.project.agents, ...profile.probable.agents]);
  let selected: AgentId[];
  let selectedBy: Plan["agents"]["selectedBy"];
  if (options.agents !== undefined && options.agents.length > 0) {
    selected = sortAgents(options.agents);
    selectedBy = "flag";
  } else if (existingConfig?.agents !== undefined && existingConfig.agents.length > 0) {
    selected = sortAgents(existingConfig.agents);
    selectedBy = "config";
  } else if (detected.length > 0) {
    selected = detected;
    selectedBy = "detected";
  } else {
    selected = ["claude", "codex"];
    selectedBy = "default";
  }

  // --- profiles ------------------------------------------------------------------
  const selectedProfiles = options.profiles ?? [];
  const profileIds = [...new Set([...(existingConfig?.profiles ?? []), ...selectedProfiles.map((p) => p.id)])];
  const suggested = suggestedProfiles(signals).map((p) => p.id).filter((id) => !profileIds.includes(id));

  // --- config --------------------------------------------------------------------
  const existingTargets = existingConfig?.targets ?? (existingConfig !== undefined ? DEFAULT_TARGETS : {});
  const targets: Record<string, { output: string }> = {};
  for (const [id, target] of Object.entries(existingTargets)) targets[id] = { output: target.output };
  for (const agentId of selected) {
    const agent = agentById(agentId)!;
    if (!Object.values(targets).some((t) => t.output === agent.instructions.output) && targets[agent.instructions.target] === undefined) {
      targets[agent.instructions.target] = { output: agent.instructions.output };
    }
  }
  const nextConfig: ConfigChanges = {
    agents: sortAgents([...(existingConfig?.agents ?? []), ...selected]),
    profiles: profileIds,
    targets,
  };

  if (configError !== undefined) {
    changes.push({ path: `${MAP_DIR}/${CONFIG_FILE}`, action: "conflict", owner: "user", reason: `cannot parse: ${configError}` });
  } else if (existingConfig === undefined) {
    changes.push({ path: `${MAP_DIR}/`, action: workspaceExists ? "update" : "create", owner: "map", reason: "workspace folders and templates (existing files are kept)" });
    changes.push({ path: `${MAP_DIR}/${CONFIG_FILE}`, action: "create", owner: "user", reason: `project, agents (${selected.join(", ")}), and profiles` });
  } else {
    const additions = describeConfigChanges(existingConfig, nextConfig);
    changes.push({
      path: `${MAP_DIR}/${CONFIG_FILE}`,
      action: additions.length > 0 ? "update" : "keep",
      owner: "user",
      reason: additions.length > 0 ? `adds ${additions.join("; ")}` : "no changes needed",
    });
  }
  for (const profileDoc of selectedProfiles) {
    const path = `${MAP_DIR}/profiles/${profileDoc.id}.md`;
    const exists = await storage.exists(join(root, path));
    changes.push({ path, action: exists ? "keep" : "create", owner: "user", reason: exists ? "already present; not overwritten" : `${profileDoc.name} conventions` });
  }

  // --- generated agent instructions ---------------------------------------------
  if (existingConfig !== undefined && configError === undefined) {
    try {
      const merged = { ...existingConfig, targets: { ...existingConfig.targets, ...targets } } as MapConfig;
      const compilation = await compileWorkspace(storage, root, services.adapters, { force: false, config: merged });
      for (const output of compilation.plans) {
        changes.push({
          path: output.path,
          action: output.action === "unchanged" ? "keep" : output.action === "conflict" ? "conflict" : output.action === "create" ? "create" : "update",
          owner: output.ownership === "user" || output.ownership === "modified" || output.ownership === "symlink" ? "user" : "generated",
          reason: output.reason ?? `compiled for ${output.target}`,
        });
      }
    } catch (error) {
      limitations.push(`could not compile agent instructions: ${messageOf(error)}`);
    }
  } else if (configError === undefined) {
    for (const target of Object.entries(targets)) changes.push(await predictOutput(storage, root, target[0], target[1].output));
  }

  // --- patterns ------------------------------------------------------------------
  const patterns = await planPatterns(root, services, selectedProfiles);

  // --- skills --------------------------------------------------------------------
  const skillSources = existingConfig?.skills?.sources ?? DEFAULT_SKILL_SOURCES;
  let lock: SkillsLock = { lockfileVersion: 1, skills: {} };
  try {
    lock = await readLock(root);
  } catch (error) {
    changes.push({ path: `${MAP_DIR}/skills.lock.json`, action: "conflict", owner: "map", reason: messageOf(error) });
  }
  let loaded: LoadedCatalog | undefined;
  if (options.skipSkills !== true) {
    try {
      loaded = await loadCatalog(
        { root, sources: skillSources, ...(options.env !== undefined ? { env: options.env } : {}) },
        { ...(options.refreshSkills !== undefined ? { refresh: options.refreshSkills } : {}) },
      );
      limitations.push(...loaded.catalog.warnings);
      for (const source of loaded.catalog.sources) {
        if (source.stale) limitations.push(`skill source '${source.id}' could not be refreshed; recommendations use a cached revision`);
      }
    } catch (error) {
      limitations.push(`skill sources unavailable (${firstLine(messageOf(error))}); skill recommendations are limited to names`);
    }
  } else {
    limitations.push("skill sources were not loaded (--no-skills); skill recommendations are limited to names");
  }
  const recommended = recommendSkills(profile, loaded?.catalog, { profiles: selectedProfiles, lock });
  const plannedSkills: PlannedSkill[] = [];
  for (const rec of recommended.recommendations) {
    const skill = loaded!.catalog.skills.find((s) => s.name === rec.name && s.source === rec.source)!;
    const prepared = await prepareSkill(loaded!.snapshots.get(rec.source)!, skill);
    const destinations: Array<{ path: string; action: ChangeAction; reason?: string }> = [];
    for (const target of skillDirectoriesFor(selected)) {
      const path = `${target.dir}/${rec.name}`;
      const locked = lock.skills[rec.name];
      const status = await diskStatus(root, path, locked?.targets.some((t) => t.dir === target.dir) === true ? locked : undefined);
      const kind = status.state.kind;
      destinations.push(
        kind === "missing" ? { path, action: "create" }
          : kind === "clean" ? { path, action: locked?.integrity === prepared.integrity ? "keep" : "update" }
            : { path, action: "conflict", reason: kind === "unowned" ? "existing skill directory not installed by MAP" : kind === "modified" ? "edited since install" : "unsafe path" },
      );
    }
    plannedSkills.push({
      name: rec.name,
      purpose: rec.purpose,
      reasons: rec.reasons,
      evidence: rec.evidence,
      source: rec.source,
      ...(rec.version !== undefined ? { version: rec.version } : {}),
      ...(rec.compatibility !== undefined ? { compatibility: rec.compatibility } : {}),
      installed: rec.installed,
      approvals: prepared.audit.approvals,
      findings: {
        high: prepared.audit.findings.filter((f) => f.severity === "high").length,
        medium: prepared.audit.findings.filter((f) => f.severity === "medium").length,
      },
      scripts: prepared.audit.capabilities.scripts,
      destinations,
    });
  }

  // --- approvals and security ------------------------------------------------------
  const approvals: string[] = [];
  for (const skill of plannedSkills.filter((s) => !s.installed)) {
    approvals.push(`install skill '${skill.name}' (choose it interactively or pass --skills ${skill.name})`);
    if (skill.approvals.includes("scripts")) approvals.push(`'${skill.name}' bundles ${skill.scripts.length} script(s); installing it needs --allow-scripts`);
    if (skill.approvals.includes("risky")) approvals.push(`'${skill.name}' has ${skill.findings.high} high-severity audit finding(s); review 'map skills audit ${skill.name}' and pass --allow-risky`);
  }
  const conflicts = [...changes.filter((c) => c.action === "conflict"), ...plannedSkills.flatMap((s) => s.destinations.filter((d) => d.action === "conflict").map((d) => ({ path: d.path, action: "conflict" as const, owner: "user" as const, reason: d.reason ?? "conflict" })))];
  for (const conflict of conflicts) approvals.push(`resolve conflict at ${conflict.path}: ${conflict.reason}`);

  security.push(
    "MAP reads project files as data and never executes project code or skill scripts.",
    "Skills are external, untrusted content; MAP installs only the skills you approve, pinned to an exact revision.",
    "Installed skills guide agents but enforce nothing; use CI or Git hooks for checks that must always run.",
  );
  if (plannedSkills.some((s) => s.scripts.length > 0)) {
    security.push("Some recommended skills bundle scripts. MAP strips execute permission unless you pass --allow-scripts.");
  }

  const plan: Plan = {
    schemaVersion: 1,
    kind: "map.plan",
    root,
    workspace: existingConfig !== undefined ? "existing" : "new",
    project: profile.project,
    probable: profile.probable,
    workspaces: profile.workspaces.length,
    agents: { detected, selected, selectedBy },
    profiles: { selected: profileIds, suggested },
    skills: {
      sources: loaded?.catalog.sources ?? [],
      recommendations: plannedSkills,
      unavailable: recommended.unavailable,
      gaps: recommended.gaps,
    },
    patterns,
    changes,
    conflicts,
    approvals,
    security,
    limitations: [...new Set(limitations)],
  };
  return {
    plan,
    profile,
    ...(existingConfig !== undefined ? { existingConfig } : {}),
    nextConfig,
    ...(loaded !== undefined ? { loaded } : {}),
    lock,
    skillSources,
  };
}

async function planPatterns(root: string, services: Services, profiles: readonly Profile[]): Promise<PlannedPattern[]> {
  const byId = new Map<string, { priority: string; reasons: string[] }>();
  const scan = await scanArchitecture(root, services);
  if (scan.concepts.length > 0) {
    for (const rec of await services.recommender.recommend(scan)) {
      byId.set(rec.pattern, { priority: rec.priority, reasons: [`${rec.rationale} (triggered by ${rec.triggeredBy.join(", ")})`] });
    }
  }
  for (const profile of profiles) {
    for (const id of profile.patterns) {
      const entry = byId.get(id) ?? { priority: "medium", reasons: [] };
      entry.reasons.push(`Part of the '${profile.id}' profile.`);
      byId.set(id, entry);
    }
  }
  const result: PlannedPattern[] = [];
  for (const [id, entry] of byId) {
    const catalogEntry = await services.catalog.get(id);
    result.push({ id, name: catalogEntry?.name ?? id, status: catalogEntry?.status ?? "unknown", priority: entry.priority, reasons: entry.reasons });
  }
  const rank: Record<string, number> = { high: 0, medium: 1, low: 2 };
  return result.sort((a, b) => (rank[a.priority] ?? 3) - (rank[b.priority] ?? 3) || a.id.localeCompare(b.id));
}

async function predictOutput(storage: Services["storage"], root: string, target: string, output: string): Promise<PlannedChange> {
  const abs = join(root, output);
  if (!(await storage.exists(abs))) return { path: output, action: "create", owner: "generated", reason: `compiled for ${target}` };
  const ownership = ownershipOf(await storage.readFile(abs));
  if (ownership === "generated" || ownership === "legacy") return { path: output, action: "update", owner: "generated", reason: `compiled for ${target}` };
  return {
    path: output,
    action: "conflict",
    owner: "user",
    reason: ownership === "user"
      ? "existing file was not generated by MAP; it is kept (move its content into .map/ and run 'map sync --force' to adopt it)"
      : "generated file was edited by hand; it is kept",
  };
}

function describeConfigChanges(config: MapConfig, next: ConfigChanges): string[] {
  const parts: string[] = [];
  const addedAgents = next.agents.filter((a) => !(config.agents ?? []).includes(a));
  if (addedAgents.length > 0) parts.push(`agents ${addedAgents.join(", ")}`);
  const addedProfiles = next.profiles.filter((p) => !(config.profiles ?? []).includes(p));
  if (addedProfiles.length > 0) parts.push(`profiles ${addedProfiles.join(", ")}`);
  const currentTargets = config.targets ?? DEFAULT_TARGETS;
  const addedTargets = Object.keys(next.targets).filter((t) => currentTargets[t] === undefined);
  if (addedTargets.length > 0) parts.push(`targets ${addedTargets.join(", ")}`);
  if (config.version < CONFIG_SCHEMA_VERSION && parts.length > 0) parts.push(`schema version ${CONFIG_SCHEMA_VERSION}`);
  return parts;
}

function firstLine(text: string): string {
  return text.split("\n")[0] ?? text;
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
