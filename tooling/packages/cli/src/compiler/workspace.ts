/**
 * Compile a project's `.map/` workspace end to end: read the config, load the
 * context, run the adapters, and plan the writes. Shared by `map sync`, `map plan`,
 * and `map init` so all three agree on what would change.
 */

import { join } from "node:path";
import type { Storage } from "../storage/index.ts";
import type { MapConfig } from "../config/index.ts";
import { CONFIG_FILE, MAP_DIR, parseConfig } from "../config/index.ts";
import type { AdapterRegistry } from "./adapters/index.ts";
import { compile } from "./compile.ts";
import { resolveCompilerConfig } from "./compiler-config.ts";
import { loadContext } from "./loader.ts";
import type { OutputPlan } from "./outputs.ts";
import { planOutputs } from "./outputs.ts";

export interface WorkspaceCompilation {
  readonly config: MapConfig;
  readonly documents: number;
  readonly plans: readonly OutputPlan[];
  readonly unknownTargets: readonly string[];
}

export async function readWorkspaceConfig(storage: Storage, root: string): Promise<MapConfig | undefined> {
  const path = join(root, MAP_DIR, CONFIG_FILE);
  if (!(await storage.exists(path))) return undefined;
  return parseConfig(await storage.readFile(path));
}

export async function compileWorkspace(
  storage: Storage,
  root: string,
  adapters: AdapterRegistry,
  options: { readonly force: boolean; readonly config?: MapConfig },
): Promise<WorkspaceCompilation> {
  const config = options.config ?? (await readWorkspaceConfig(storage, root));
  if (config === undefined) throw new Error(`no ${MAP_DIR}/${CONFIG_FILE} found; run 'map init' first`);
  const resolved = resolveCompilerConfig(config);
  const context = await loadContext(storage, join(root, MAP_DIR), {
    projectName: config.project.name,
    sources: resolved.sources,
  });
  const { outputs, unknownTargets } = compile(context, resolved, adapters);
  return {
    config,
    documents: context.documents.length,
    plans: await planOutputs(storage, root, outputs, { force: options.force }),
    unknownTargets,
  };
}
