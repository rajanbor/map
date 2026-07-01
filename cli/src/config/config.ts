/**
 * Configuration system.
 *
 * Two artifacts live under `.map/`:
 *   - config.yaml   — how MAP should analyze this project (tunable by the user).
 *   - project.yaml  — a manifest describing the project (mostly generated).
 *
 * The shapes here are the schema. Rendering to YAML is dependency-free; parsing back
 * is a TODO (see config/yaml.ts).
 */

import { stringifyYaml } from "./yaml.ts";

/** Schema version for the on-disk files, bumped on breaking changes. */
export const CONFIG_SCHEMA_VERSION = 1;

/** The directory MAP creates in a project. */
export const MAP_DIR = ".map";

export interface MapConfig {
  readonly version: number;
  readonly analysis: {
    readonly include: readonly string[];
    readonly exclude: readonly string[];
    /** Analyzer ids to run; empty means "all applicable". */
    readonly analyzers: readonly string[];
  };
  readonly knowledge: {
    /** Where pattern data is loaded from. */
    readonly source: string;
  };
  readonly output: {
    readonly reports: string;
    readonly graphs: string;
  };
}

export interface ProjectManifest {
  readonly name: string;
  readonly createdAt: string;
  readonly map: {
    readonly version: number;
  };
  /** Detected languages; populated by the analyzer later. */
  readonly languages: readonly string[];
}

export function defaultConfig(): MapConfig {
  return {
    version: CONFIG_SCHEMA_VERSION,
    analysis: {
      include: ["src/**"],
      exclude: ["**/node_modules/**", "**/dist/**"],
      analyzers: [],
    },
    knowledge: {
      source: "knowledge/",
    },
    output: {
      reports: "reports/",
      graphs: "graphs/",
    },
  };
}

export function defaultManifest(projectName: string): ProjectManifest {
  return manifestFromFacts(projectName, []);
}

/** Build a config from detected project facts (see project/detect.ts). */
export function configFromFacts(facts: {
  readonly include: readonly string[];
  readonly exclude: readonly string[];
  readonly analyzers: readonly string[];
}): MapConfig {
  const base = defaultConfig();
  return {
    ...base,
    analysis: {
      include: facts.include.length > 0 ? facts.include : base.analysis.include,
      exclude: facts.exclude.length > 0 ? facts.exclude : base.analysis.exclude,
      analyzers: facts.analyzers,
    },
  };
}

/** Build a project manifest with detected languages. */
export function manifestFromFacts(
  projectName: string,
  languages: readonly string[],
): ProjectManifest {
  return {
    name: projectName,
    createdAt: new Date().toISOString(),
    map: { version: CONFIG_SCHEMA_VERSION },
    languages,
  };
}

export function renderConfig(config: MapConfig): string {
  return withHeader(
    "MAP configuration. See https://github.com/rajanbor/map",
    stringifyYaml(config),
  );
}

export function renderManifest(manifest: ProjectManifest): string {
  return withHeader(
    "MAP project manifest (generated). Safe to edit the name.",
    stringifyYaml(manifest),
  );
}

function withHeader(comment: string, body: string): string {
  return `# ${comment}\n${body}`;
}
