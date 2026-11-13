/**
 * Project Profiler: a bounded, read-only survey of a repository's technology stack
 * and coding-agent configuration.
 *
 * The profiler reads marker files and dependency manifests as data. It never runs
 * project code, never follows symlinks, and stops at fixed depth and directory
 * limits. Every detected signal carries file-level evidence and a certainty:
 *
 *   confirmed  the file is specific to the technology (tsconfig.json, Cargo.toml,
 *              a declared `next` dependency);
 *   probable   the evidence suggests it but is shared or indirect (a Postgres
 *              client library, a `.php` file, AGENTS.md).
 *
 * Nothing found means "unknown", never "absent": limitations say so explicitly.
 */

import { join } from "node:path";
import type { Storage } from "../storage/index.ts";
import { globToRegExp } from "../compiler/loader.ts";
import { parsePackageJson, parsePyprojectToml, parseRequirementsTxt } from "../analyzer/manifests.ts";
import { AGENTS } from "../agents/index.ts";
import type { AgentId } from "../agents/index.ts";

export type SignalCategory = "language" | "framework" | "infrastructure" | "tooling" | "agent";
export type Certainty = "confirmed" | "probable";

export interface Evidence {
  readonly signal: string;
  readonly category: SignalCategory;
  readonly certainty: Certainty;
  /** Project-relative POSIX path of the file or directory that produced the signal. */
  readonly file: string;
  readonly detail: string;
}

export interface WorkspaceProfile {
  /** Project-relative directory ("." for the root). */
  readonly path: string;
  /** Manifest files that make this directory a workspace. */
  readonly manifests: readonly string[];
  readonly languages: readonly string[];
  readonly frameworks: readonly string[];
}

export interface SignalSummary {
  readonly languages: readonly string[];
  readonly frameworks: readonly string[];
  readonly infrastructure: readonly string[];
  readonly tooling: readonly string[];
  readonly agents: readonly AgentId[];
}

export interface ProjectProfile {
  readonly schemaVersion: 1;
  readonly kind: "map.project-profile";
  readonly root: string;
  /** Signals backed by at least one confirmed piece of evidence. */
  readonly project: SignalSummary;
  /** Signals backed only by probable evidence. */
  readonly probable: SignalSummary;
  readonly workspaces: readonly WorkspaceProfile[];
  readonly evidence: readonly Evidence[];
  readonly traversal: {
    readonly maxDepth: number;
    readonly maxDirectories: number;
    readonly directoriesVisited: number;
    readonly truncated: boolean;
  };
  readonly limitations: readonly string[];
}

export interface ProfileOptions {
  /** Directory depth below the root to inspect (root = 0). Default 3. */
  readonly maxDepth?: number;
  /** Upper bound on directories visited. Default 400. */
  readonly maxDirectories?: number;
  /** Extra exclude globs, relative to the root (e.g. from map.config.json). */
  readonly exclude?: readonly string[];
}

/** Directories never entered: dependencies, build output, VCS, caches, envs. */
const SKIPPED_DIRS = new Set([
  "node_modules", ".git", ".hg", ".svn", "dist", "build", "out", "target", "coverage",
  "vendor", ".venv", "venv", "env", "__pycache__", ".tox", ".mypy_cache", ".pytest_cache",
  ".ruff_cache", ".next", ".nuxt", ".svelte-kit", ".turbo", ".cache", ".parcel-cache",
  ".gradle", ".idea", ".vscode", ".map", "bower_components",
]);

const WORKSPACE_MANIFESTS = [
  "package.json", "pyproject.toml", "requirements.txt", "setup.py", "Cargo.toml",
  "go.mod", "composer.json", "pom.xml", "build.gradle", "build.gradle.kts",
] as const;

/** Stable ordering for summaries; unknown names sort after these alphabetically. */
const ORDER = [
  "typescript", "javascript", "python", "rust", "go", "java", "php",
  "nextjs", "react", "vue", "angular", "express", "nestjs", "fastapi", "django",
  "wordpress", "tailwindcss",
  "docker", "docker-compose", "github-actions", "postgresql", "redis", "prisma", "drizzle",
  "vitest", "jest", "pytest", "cargo", "eslint", "prettier", "ruff", "monorepo",
];

interface Dir {
  /** POSIX path relative to root; "" for the root itself. */
  readonly rel: string;
  readonly files: ReadonlySet<string>;
  readonly dirs: ReadonlySet<string>;
}

interface Collector {
  add(evidence: Evidence): void;
}

export async function profileProject(
  root: string,
  storage: Storage,
  options: ProfileOptions = {},
): Promise<ProjectProfile> {
  const maxDepth = options.maxDepth ?? 3;
  const maxDirectories = options.maxDirectories ?? 400;
  const ignore = [
    ...(await gitignorePatterns(root, storage)),
    ...(options.exclude ?? []).map((glob) => globToRegExp(glob)),
  ];

  const evidence: Evidence[] = [];
  const seen = new Set<string>();
  const collector: Collector = {
    add(item) {
      const key = `${item.signal}\u0000${item.file}\u0000${item.certainty}`;
      if (seen.has(key)) return;
      seen.add(key);
      evidence.push(item);
    },
  };

  const workspaces: WorkspaceProfile[] = [];
  const queue: Array<{ rel: string; depth: number }> = [{ rel: "", depth: 0 }];
  let visited = 0;
  let truncated = false;

  while (queue.length > 0) {
    const next = queue.shift()!;
    if (visited >= maxDirectories) {
      truncated = true;
      break;
    }
    visited += 1;

    const entries = await storage.listEntries(join(root, next.rel));
    const dir: Dir = {
      rel: next.rel,
      files: new Set(entries.filter((e) => e.type === "file").map((e) => e.name)),
      dirs: new Set(entries.filter((e) => e.type === "dir").map((e) => e.name)),
    };

    const before = evidence.length;
    await inspectDirectory(dir, root, storage, collector);
    if (next.rel === "") await inspectRoot(dir, root, storage, collector);

    const manifests = WORKSPACE_MANIFESTS.filter((name) => dir.files.has(name));
    if (next.rel === "" || manifests.length > 0) {
      const local = evidence.slice(before);
      workspaces.push({
        path: next.rel === "" ? "." : next.rel,
        manifests,
        languages: ordered(local.filter((e) => e.category === "language").map((e) => e.signal)),
        frameworks: ordered(local.filter((e) => e.category === "framework").map((e) => e.signal)),
      });
    }

    if (next.depth >= maxDepth) continue;
    for (const name of [...dir.dirs].sort()) {
      if (skipDir(name)) continue;
      const rel = next.rel === "" ? name : `${next.rel}/${name}`;
      if (ignore.some((pattern) => pattern.test(rel) || pattern.test(`${rel}/`))) continue;
      queue.push({ rel, depth: next.depth + 1 });
    }
  }

  if (workspaces.filter((w) => w.manifests.length > 0).length > 1) {
    collector.add({
      signal: "monorepo",
      category: "tooling",
      certainty: "probable",
      file: ".",
      detail: `${workspaces.filter((w) => w.manifests.length > 0).length} directories declare their own manifests`,
    });
  }

  const sorted = [...evidence].sort(
    (a, b) =>
      rank(a.signal) - rank(b.signal) ||
      a.signal.localeCompare(b.signal) ||
      a.file.localeCompare(b.file) ||
      a.certainty.localeCompare(b.certainty),
  );

  return {
    schemaVersion: 1,
    kind: "map.project-profile",
    root,
    project: summarize(sorted, (e) => e.certainty === "confirmed"),
    probable: summarize(sorted, (e) => e.certainty === "probable", summarize(sorted, (e) => e.certainty === "confirmed")),
    workspaces,
    evidence: sorted,
    traversal: { maxDepth, maxDirectories, directoriesVisited: visited, truncated },
    limitations: [
      "Detection reads marker files and declared dependencies; it does not execute code or prove that a technology is used at runtime.",
      "A technology or security control that is not listed is unknown, not absent.",
      `Directories deeper than ${maxDepth} levels, dependency and build folders, symlinks, and .gitignore matches are not inspected.`,
      ...(truncated ? [`Traversal stopped after ${maxDirectories} directories; nested projects may be missing.`] : []),
    ],
  };
}

function skipDir(name: string): boolean {
  if (SKIPPED_DIRS.has(name)) return true;
  // Hidden directories hold tool state; agent and CI markers are checked at the root.
  return name.startsWith(".");
}

async function inspectDirectory(dir: Dir, root: string, storage: Storage, out: Collector): Promise<void> {
  const path = (name: string): string => (dir.rel === "" ? name : `${dir.rel}/${name}`);
  const has = (name: string): boolean => dir.files.has(name);
  const hasAny = (names: readonly string[]): string | undefined => names.find(has);
  const hasPrefix = (prefix: string): string | undefined =>
    [...dir.files].sort().find((name) => name.startsWith(prefix));
  const read = async (name: string): Promise<string> => {
    try {
      const text = await storage.readFile(join(root, dir.rel, name));
      return text.length > 512_000 ? text.slice(0, 512_000) : text;
    } catch {
      return "";
    }
  };
  const emit = (signal: string, category: SignalCategory, certainty: Certainty, file: string, detail: string): void =>
    out.add({ signal, category, certainty, file: path(file), detail });

  // --- JavaScript / TypeScript ---
  let npm: readonly string[] = [];
  if (has("package.json")) {
    const pkg = await read("package.json");
    npm = parsePackageJson(pkg);
    if (/"workspaces"\s*:/.test(pkg)) emit("monorepo", "tooling", "confirmed", "package.json", "declares npm workspaces");
  }
  const tsconfig = has("tsconfig.json") ? "tsconfig.json" : undefined;
  if (tsconfig !== undefined) emit("typescript", "language", "confirmed", tsconfig, "TypeScript compiler configuration");
  else if (npm.includes("typescript")) emit("typescript", "language", "confirmed", "package.json", "declares the typescript package");
  else if (has("package.json")) emit("javascript", "language", "confirmed", "package.json", "Node.js package manifest");
  if (has("pnpm-workspace.yaml")) emit("monorepo", "tooling", "confirmed", "pnpm-workspace.yaml", "pnpm workspace configuration");

  const dep = (name: string, signal: string, category: SignalCategory, certainty: Certainty = "confirmed"): void => {
    if (npm.includes(name)) emit(signal, category, certainty, "package.json", `declares ${name}`);
  };
  dep("next", "nextjs", "framework");
  dep("react", "react", "framework");
  dep("vue", "vue", "framework");
  dep("@angular/core", "angular", "framework");
  dep("express", "express", "framework");
  dep("@nestjs/core", "nestjs", "framework");
  dep("tailwindcss", "tailwindcss", "framework");
  dep("@tailwindcss/vite", "tailwindcss", "framework");
  dep("@tailwindcss/postcss", "tailwindcss", "framework");
  dep("prisma", "prisma", "infrastructure");
  dep("@prisma/client", "prisma", "infrastructure");
  dep("drizzle-orm", "drizzle", "infrastructure");
  dep("pg", "postgresql", "infrastructure", "probable");
  dep("postgres", "postgresql", "infrastructure", "probable");
  dep("redis", "redis", "infrastructure", "probable");
  dep("ioredis", "redis", "infrastructure", "probable");
  dep("vitest", "vitest", "tooling");
  dep("jest", "jest", "tooling");
  dep("eslint", "eslint", "tooling");
  dep("prettier", "prettier", "tooling");

  const configFile = (prefix: string, signal: string, category: SignalCategory, detail: string): void => {
    const file = hasPrefix(prefix);
    if (file !== undefined) emit(signal, category, "confirmed", file, detail);
  };
  configFile("next.config.", "nextjs", "framework", "Next.js configuration");
  configFile("tailwind.config.", "tailwindcss", "framework", "Tailwind CSS configuration");
  configFile("vitest.config.", "vitest", "tooling", "Vitest configuration");
  configFile("jest.config.", "jest", "tooling", "Jest configuration");
  configFile("eslint.config.", "eslint", "tooling", "ESLint flat configuration");
  configFile(".eslintrc", "eslint", "tooling", "ESLint configuration");
  configFile(".prettierrc", "prettier", "tooling", "Prettier configuration");
  configFile("prettier.config.", "prettier", "tooling", "Prettier configuration");
  configFile("drizzle.config.", "drizzle", "infrastructure", "Drizzle configuration");
  if (has("angular.json")) emit("angular", "framework", "confirmed", "angular.json", "Angular workspace configuration");
  if (has("nest-cli.json")) emit("nestjs", "framework", "confirmed", "nest-cli.json", "NestJS CLI configuration");
  if (dir.dirs.has("prisma")) {
    const schema = await read("prisma/schema.prisma");
    if (schema !== "") {
      emit("prisma", "infrastructure", "confirmed", "prisma/schema.prisma", "Prisma schema");
      if (/provider\s*=\s*"postgres(?:ql)?"/.test(schema)) {
        emit("postgresql", "infrastructure", "probable", "prisma/schema.prisma", "Prisma datasource provider is postgresql");
      }
    }
  }

  // --- Python ---
  const pythonManifest = hasAny(["pyproject.toml", "requirements.txt", "setup.py", "setup.cfg", "Pipfile"]);
  let py: readonly string[] = [];
  if (pythonManifest !== undefined) {
    emit("python", "language", "confirmed", pythonManifest, "Python project manifest");
    const pyproject = has("pyproject.toml") ? await read("pyproject.toml") : "";
    py = [
      ...parsePyprojectToml(pyproject),
      ...(has("requirements.txt") ? parseRequirementsTxt(await read("requirements.txt")) : []),
    ];
    if (/^\[tool\.ruff/m.test(pyproject)) emit("ruff", "tooling", "confirmed", "pyproject.toml", "[tool.ruff] configuration");
    if (/^\[tool\.pytest/m.test(pyproject)) emit("pytest", "tooling", "confirmed", "pyproject.toml", "[tool.pytest] configuration");
  }
  const pyDep = (name: string, signal: string, category: SignalCategory, certainty: Certainty = "confirmed"): void => {
    const file = has("pyproject.toml") ? "pyproject.toml" : "requirements.txt";
    if (py.includes(name)) emit(signal, category, certainty, file, `declares ${name}`);
  };
  pyDep("fastapi", "fastapi", "framework");
  pyDep("django", "django", "framework");
  pyDep("pytest", "pytest", "tooling");
  pyDep("ruff", "ruff", "tooling");
  for (const name of ["psycopg", "psycopg2", "psycopg2-binary", "asyncpg"]) pyDep(name, "postgresql", "infrastructure", "probable");
  pyDep("redis", "redis", "infrastructure", "probable");
  if (has("manage.py")) emit("django", "framework", "probable", "manage.py", "Django-style manage.py");
  if (hasAny(["ruff.toml", ".ruff.toml"]) !== undefined) {
    emit("ruff", "tooling", "confirmed", hasAny(["ruff.toml", ".ruff.toml"])!, "Ruff configuration");
  }
  if (has("pytest.ini")) emit("pytest", "tooling", "confirmed", "pytest.ini", "pytest configuration");
  if (has("conftest.py")) emit("pytest", "tooling", "probable", "conftest.py", "pytest fixtures file");

  // --- Rust, Go, Java ---
  if (has("Cargo.toml")) {
    emit("rust", "language", "confirmed", "Cargo.toml", "Cargo package manifest");
    emit("cargo", "tooling", "confirmed", "Cargo.toml", "Cargo build tool");
    if (/^\[workspace\]/m.test(await read("Cargo.toml"))) emit("monorepo", "tooling", "confirmed", "Cargo.toml", "Cargo workspace");
  }
  if (has("go.mod")) emit("go", "language", "confirmed", "go.mod", "Go module");
  if (has("go.work")) emit("monorepo", "tooling", "confirmed", "go.work", "Go workspace");
  const java = hasAny(["pom.xml", "build.gradle", "build.gradle.kts"]);
  if (java !== undefined) emit("java", "language", "confirmed", java, "JVM build manifest");

  // --- PHP and WordPress ---
  if (has("composer.json")) {
    emit("php", "language", "confirmed", "composer.json", "Composer manifest");
    const composer = await read("composer.json");
    const wp = /"(?:johnpbloch\/wordpress[^"]*|roots\/wordpress[^"]*|wpackagist-(?:plugin|theme)\/[^"]+)"\s*:/.exec(composer);
    if (wp !== null) emit("wordpress", "framework", "confirmed", "composer.json", `declares ${wp[0].split('"')[1]}`);
  }
  const wpCore = hasAny(["wp-config.php", "wp-config-sample.php", "wp-load.php"]);
  if (wpCore !== undefined) emit("wordpress", "framework", "confirmed", wpCore, "WordPress core file");
  if (dir.dirs.has("wp-content")) emit("wordpress", "framework", "confirmed", "wp-content", "WordPress content directory");
  if (has("style.css") && /^\s*(?:\*\s*)?Theme Name:/m.test((await read("style.css")).slice(0, 4096))) {
    emit("wordpress", "framework", "confirmed", "style.css", "WordPress theme header");
  }
  const phpFiles = [...dir.files].filter((name) => name.endsWith(".php")).sort();
  if (phpFiles.length > 0 && !has("composer.json")) {
    emit("php", "language", "probable", phpFiles[0]!, `${phpFiles.length} PHP file(s) without composer.json`);
  }
  for (const file of phpFiles.slice(0, 20)) {
    if (/^\s*\*?\s*Plugin Name:/m.test((await read(file)).slice(0, 4096))) {
      emit("wordpress", "framework", "probable", file, "WordPress plugin header");
      break;
    }
  }

  // --- Containers ---
  const dockerfile = hasAny(["Dockerfile", "Containerfile"]) ?? hasPrefix("Dockerfile.");
  if (dockerfile !== undefined) emit("docker", "infrastructure", "confirmed", dockerfile, "container build file");
  const compose = hasAny(["compose.yaml", "compose.yml", "docker-compose.yml", "docker-compose.yaml"]);
  if (compose !== undefined) {
    emit("docker-compose", "infrastructure", "confirmed", compose, "Compose file");
    const text = await read(compose);
    if (/^\s*image:\s*["']?(?:[\w.-]+\/)?postgres(?:ql)?[:\s"']/m.test(text) || /^\s*image:\s*["']?postgres\s*$/m.test(text)) {
      emit("postgresql", "infrastructure", "probable", compose, "Compose service uses a postgres image");
    }
    if (/^\s*image:\s*["']?(?:[\w.-]+\/)?redis(?:[:\s"']|$)/m.test(text)) {
      emit("redis", "infrastructure", "probable", compose, "Compose service uses a redis image");
    }
  }
}

async function inspectRoot(dir: Dir, root: string, storage: Storage, out: Collector): Promise<void> {
  const workflows = (await storage.listEntries(join(root, ".github", "workflows")))
    .filter((e) => e.type === "file" && /\.ya?ml$/.test(e.name))
    .map((e) => e.name);
  if (workflows.length > 0) {
    out.add({
      signal: "github-actions",
      category: "infrastructure",
      certainty: "confirmed",
      file: `.github/workflows/${workflows[0]!}`,
      detail: `${workflows.length} workflow file(s)`,
    });
  }

  for (const agent of AGENTS) {
    for (const marker of agent.markers) {
      const [head, ...rest] = marker.path.split("/");
      let present = false;
      if (rest.length === 0) {
        present = dir.files.has(head!) || dir.dirs.has(head!);
      } else {
        const parent = join(root, head!, ...rest.slice(0, -1));
        const leaf = rest[rest.length - 1]!;
        present = (await storage.listEntries(parent)).some(
          (e) => e.name === leaf && (e.type === "file" || e.type === "dir"),
        );
      }
      if (!present) continue;
      const generated = await isMapGenerated(join(root, marker.path), storage);
      out.add({
        signal: agent.id,
        category: "agent",
        certainty: marker.certainty,
        file: marker.path,
        detail: generated ? `${agent.name} file generated by MAP` : `${agent.name} configuration`,
      });
    }
  }
}

async function isMapGenerated(path: string, storage: Storage): Promise<boolean> {
  try {
    return (await storage.readFile(path)).slice(0, 2048).includes("Generated by MAP.");
  } catch {
    return false;
  }
}

/** Root .gitignore entries as path matchers. Negations are ignored (conservative). */
async function gitignorePatterns(root: string, storage: Storage): Promise<RegExp[]> {
  let text: string;
  try {
    text = await storage.readFile(join(root, ".gitignore"));
  } catch {
    return [];
  }
  const patterns: RegExp[] = [];
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (line === "" || line.startsWith("#") || line.startsWith("!")) continue;
    const anchored = line.startsWith("/");
    const body = line.replace(/^\//, "").replace(/\/$/, "");
    if (body === "" || body.includes("..")) continue;
    const glob = anchored || body.includes("/") ? body : `**/${body}`;
    patterns.push(globToRegExp(glob));
  }
  return patterns;
}

function summarize(
  evidence: readonly Evidence[],
  include: (e: Evidence) => boolean,
  exclude?: SignalSummary,
): SignalSummary {
  const pick = (category: SignalCategory): string[] => {
    const known = exclude === undefined ? [] : listFor(exclude, category);
    return ordered(
      evidence.filter((e) => e.category === category && include(e) && !known.includes(e.signal)).map((e) => e.signal),
    );
  };
  return {
    languages: pick("language"),
    frameworks: pick("framework"),
    infrastructure: pick("infrastructure"),
    tooling: pick("tooling"),
    agents: pick("agent") as AgentId[],
  };
}

function listFor(summary: SignalSummary, category: SignalCategory): readonly string[] {
  switch (category) {
    case "language": return summary.languages;
    case "framework": return summary.frameworks;
    case "infrastructure": return summary.infrastructure;
    case "tooling": return summary.tooling;
    case "agent": return summary.agents;
  }
}

function rank(signal: string): number {
  const agentIndex = AGENTS.findIndex((agent) => agent.id === signal);
  if (agentIndex >= 0) return ORDER.length + agentIndex;
  const index = ORDER.indexOf(signal);
  return index === -1 ? ORDER.length + AGENTS.length : index;
}

function ordered(signals: readonly string[]): string[] {
  return [...new Set(signals)].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
}

/** Every signal (confirmed or probable) present in the profile. */
export function allSignals(profile: ProjectProfile): ReadonlySet<string> {
  return new Set(profile.evidence.map((e) => e.signal));
}
