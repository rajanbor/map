/**
 * The MAP context compiler: `.map` as the single source of truth, compiled into
 * per-assistant context files.
 *
 *   map.config.json  ─┐
 *   .map markdown docs ┴─▶ loadContext ─▶ Context ─▶ compile(+adapters) ─▶ outputs
 *
 * Commands (`sync`, `watch`, `doctor`) drive this pipeline; adapters and future
 * plugins extend it. Nothing here touches the console.
 */

export { loadContext, globToRegExp } from "./loader.ts";
export { compile, ownershipOf, GENERATED_MARKER } from "./compile.ts";
export type { CompiledOutput, CompileResult, Ownership } from "./compile.ts";
export { applyOutputs, planOutputs } from "./outputs.ts";
export type { OutputAction, OutputPlan } from "./outputs.ts";
export { compileWorkspace, readWorkspaceConfig } from "./workspace.ts";
export type { WorkspaceCompilation } from "./workspace.ts";

export { resolveCompilerConfig } from "./compiler-config.ts";
export type { ResolvedCompilerConfig, ResolvedTarget } from "./compiler-config.ts";

export { documentsForTarget } from "./context.ts";
export type { Context, Document } from "./context.ts";

export { parseFrontmatter } from "./frontmatter.ts";
export type { DocumentStatus, Frontmatter, Priority } from "./frontmatter.ts";

export { parseYaml } from "./yaml-parse.ts";
export type { YamlNode } from "./yaml-parse.ts";

export {
  AdapterRegistry,
  defaultAdapterRegistry,
} from "./adapters/index.ts";
export type { Adapter, BannerStyle } from "./adapters/index.ts";
