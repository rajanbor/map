/**
 * Lightweight project detection for `map init`.
 *
 * This inspects marker files (package.json, pyproject.toml, go.mod, …) to guess the
 * project's languages and pre-fill the config — it does NOT analyze source code. Real
 * code analysis is the Analyzer (Module 2). Detection goes through `Storage` so it's
 * testable without touching the real filesystem.
 */

import { join } from "node:path";
import type { Storage } from "../storage/index.ts";

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

export async function detectProject(
  root: string,
  storage: Storage,
): Promise<ProjectFacts> {
  const has = (file: string): Promise<boolean> => storage.exists(join(root, file));

  const languages: string[] = [];
  const analyzers: string[] = [];
  const include: string[] = [];

  const add = (language: string, includeGlob: string): void => {
    languages.push(language);
    analyzers.push(language);
    include.push(includeGlob);
  };

  // TypeScript takes precedence over plain JavaScript when a tsconfig is present.
  if (await has("tsconfig.json")) {
    add("typescript", "src/**");
  } else if (await has("package.json")) {
    add("javascript", "src/**");
  }

  if (
    (await has("pyproject.toml")) ||
    (await has("requirements.txt")) ||
    (await has("setup.py"))
  ) {
    add("python", "**/*.py");
  }
  if (await has("go.mod")) add("go", "**/*.go");
  if (await has("Cargo.toml")) add("rust", "src/**");
  if ((await has("pom.xml")) || (await has("build.gradle"))) add("java", "src/**");

  const uniqueInclude = [...new Set(include)];
  return {
    languages,
    analyzers,
    include: uniqueInclude.length > 0 ? uniqueInclude : [DEFAULT_INCLUDE],
    exclude: DEFAULT_EXCLUDE,
  };
}
