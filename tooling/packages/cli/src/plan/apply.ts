/**
 * Apply the workspace part of a plan: render the `.map/` template, merge the
 * config additions, write profile documents, and compile agent instructions.
 *
 * Every write is non-destructive: template files and profile documents are only
 * created when missing (unless `forceTemplates`), the config only gains entries,
 * and generated outputs follow `map sync` ownership rules (conflicts are reported,
 * never overwritten). Skill installation is a separate, explicitly approved step.
 */

import { basename, join } from "node:path";
import { CONFIG_FILE, CONFIG_SCHEMA_VERSION, MAP_DIR } from "../config/index.ts";
import { parseConfig } from "../config/index.ts";
import { applyOutputs, compileWorkspace } from "../compiler/index.ts";
import type { OutputPlan } from "../compiler/index.ts";
import { factsFromProfile } from "../project/index.ts";
import { profileById, renderProfileDocument } from "../profiles/index.ts";
import { renderTemplateDir } from "../scaffold/index.ts";
import { workspaceTemplateDir } from "../assets.ts";
import type { Services } from "../services.ts";
import type { PlanContext } from "./planner.ts";

export interface AppliedWorkspace {
  readonly created: readonly string[];
  readonly updated: readonly string[];
  readonly kept: number;
  readonly outputs: readonly OutputPlan[];
  readonly backups: readonly string[];
}

export async function applyWorkspace(
  root: string,
  services: Services,
  context: PlanContext,
  options: { readonly forceTemplates: boolean },
): Promise<AppliedWorkspace> {
  const { storage } = services;
  const mapDir = join(root, MAP_DIR);
  const created: string[] = [];
  const updated: string[] = [];
  let kept = 0;

  const facts = factsFromProfile(context.profile);
  const rendered = await renderTemplateDir(
    storage,
    workspaceTemplateDir(),
    mapDir,
    {
      schemaVersion: JSON.stringify(CONFIG_SCHEMA_VERSION),
      projectName: JSON.stringify(basename(root)),
      createdAt: JSON.stringify(new Date().toISOString()),
      languages: JSON.stringify(facts.languages),
      analyzers: JSON.stringify(facts.analyzers),
      include: JSON.stringify(facts.include),
      exclude: JSON.stringify(facts.exclude),
      targets: nestedJson(context.nextConfig.targets),
      agents: JSON.stringify(context.nextConfig.agents),
      profiles: JSON.stringify(context.nextConfig.profiles),
    },
    { overwrite: options.forceTemplates },
  );
  for (const file of rendered) {
    if (file.written) created.push(`${MAP_DIR}/${file.path}`);
    else kept += 1;
  }

  // Merge additions into a config that already existed (rendering kept it).
  const configPath = join(mapDir, CONFIG_FILE);
  if (!rendered.some((f) => f.path === CONFIG_FILE && f.written)) {
    const raw = JSON.parse(await storage.readFile(configPath)) as Record<string, unknown>;
    const next = mergeConfig(raw, context);
    const text = `${JSON.stringify(next, null, 2)}\n`;
    parseConfig(text); // never write a config this CLI cannot read back
    if (JSON.stringify(next) !== JSON.stringify(raw)) {
      await storage.writeFile(configPath, text, { overwrite: true });
      updated.push(`${MAP_DIR}/${CONFIG_FILE}`);
    }
  }

  for (const id of context.plan.profiles.selected) {
    const profile = profileById(id);
    if (profile === undefined) continue;
    const path = join(mapDir, "profiles", `${id}.md`);
    await storage.ensureDir(join(mapDir, "profiles"));
    if (await storage.writeFile(path, renderProfileDocument(profile), { overwrite: false })) {
      created.push(`${MAP_DIR}/profiles/${id}.md`);
    }
  }

  const compilation = await compileWorkspace(storage, root, services.adapters, { force: false });
  const backups = await applyOutputs(storage, root, compilation.plans);
  return { created, updated, kept, outputs: compilation.plans, backups };
}

function mergeConfig(raw: Record<string, unknown>, context: PlanContext): Record<string, unknown> {
  const next: Record<string, unknown> = { ...raw };
  const union = (current: unknown, added: readonly string[]): string[] =>
    [...new Set([...(Array.isArray(current) ? (current as string[]) : []), ...added])];
  const agents = union(raw["agents"], context.nextConfig.agents);
  const profiles = union(raw["profiles"], context.nextConfig.profiles);
  const targets = { ...(raw["targets"] as Record<string, unknown> | undefined ?? {}) };
  let changed = false;
  for (const [id, target] of Object.entries(context.nextConfig.targets)) {
    if (targets[id] === undefined) {
      targets[id] = target;
      changed = true;
    }
  }
  if (JSON.stringify(agents) !== JSON.stringify(raw["agents"] ?? [])) {
    next["agents"] = agents;
    changed = true;
  }
  if (JSON.stringify(profiles) !== JSON.stringify(raw["profiles"] ?? []) && profiles.length > 0) {
    next["profiles"] = profiles;
    changed = true;
  }
  if (changed) {
    next["targets"] = targets;
    if (typeof raw["version"] === "number" && raw["version"] < CONFIG_SCHEMA_VERSION) next["version"] = CONFIG_SCHEMA_VERSION;
  }
  return next;
}

/** JSON for a value nested one level inside the config template (2-space indent). */
function nestedJson(value: unknown): string {
  return JSON.stringify(value, null, 2).replace(/\n/g, "\n  ");
}
