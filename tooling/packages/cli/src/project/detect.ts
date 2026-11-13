/**
 * Workspace-config facts for `map init`: the languages to record in
 * `map.config.json` and matching analyzer/include hints.
 *
 * Derived from the root workspace of the Project Profiler (profile.ts) so there is
 * one detection implementation. Only root-level, confirmed languages are used,
 * which keeps the generated config identical to earlier releases.
 */

import type { Storage } from "../storage/index.ts";
import { profileProject } from "./profile.ts";
import type { ProjectProfile } from "./profile.ts";

export interface ProjectFacts {
  /** Detected languages, e.g. ["typescript", "python"]. */
  readonly languages: readonly string[];
  /** Suggested analyzer ids for the config. */
  readonly analyzers: readonly string[];
  /** Suggested include globs. */
  readonly include: readonly string[];
  /** Suggested exclude globs. */
  readonly exclude: readonly string[];
}

const DEFAULT_INCLUDE = "src/**";
const DEFAULT_EXCLUDE = ["**/node_modules/**", "**/dist/**", "**/.map/**"];
const INCLUDE_FOR: Readonly<Record<string, string>> = {
  typescript: "src/**",
  javascript: "src/**",
  python: "**/*.py",
  go: "**/*.go",
  rust: "src/**",
  java: "src/**",
  php: "**/*.php",
};

export async function detectProject(root: string, storage: Storage): Promise<ProjectFacts> {
  return factsFromProfile(await profileProject(root, storage, { maxDepth: 0 }));
}

export function factsFromProfile(profile: ProjectProfile): ProjectFacts {
  const languages = profile.evidence
    .filter((e) => e.category === "language" && e.certainty === "confirmed" && !e.file.includes("/"))
    .map((e) => e.signal);
  const unique = [...new Set(languages)].filter((language) => language in INCLUDE_FOR);
  const include = [...new Set(unique.map((language) => INCLUDE_FOR[language]!))];
  return {
    languages: unique,
    analyzers: unique,
    include: include.length > 0 ? include : [DEFAULT_INCLUDE],
    exclude: DEFAULT_EXCLUDE,
  };
}
