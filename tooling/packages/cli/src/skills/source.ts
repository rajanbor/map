/**
 * Skill sources: where skills come from, resolved into immutable snapshots.
 *
 * A source is configured data (`skills.sources` in map.config.json). Resolving it
 * yields a `SourceSnapshot`: an exact revision, a file listing, and a reader. The
 * rest of the skills module (catalog, audit, installer) only sees snapshots, so a
 * new source kind — a registry, an archive — is one more `resolve` implementation.
 *
 *   git    A Git repository. Fetched into a private bare cache under MAP_HOME and
 *          pinned to a commit SHA. Branch names are only used to *find* a commit;
 *          the lockfile always records the SHA.
 *   local  A directory on disk (relative to the project or absolute). Its revision
 *          is a content digest, so it cannot be re-fetched — only re-verified.
 *
 * Network is touched only when a git source has no cached revision, when the caller
 * asks for a refresh, or when a locked SHA is missing from the cache. With
 * `MAP_OFFLINE=1` it is never touched: only cached revisions are used.
 */

import { createHash } from "node:crypto";
import { lstat, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { isAbsolute, join, relative, resolve, sep } from "node:path";
import { COMMIT_SHA, assertSafeRef, assertSafeRemote, git, gitBuffer, listTree } from "./git.ts";

export type SkillSourceConfig =
  | { readonly id: string; readonly type: "git"; readonly url: string; readonly ref?: string }
  | { readonly id: string; readonly type: "local"; readonly path: string };

/** The source MAP knows about out of the box. Users may replace or extend it. */
export const DEFAULT_SKILL_SOURCES: readonly SkillSourceConfig[] = [
  { id: "rajanbor", type: "git", url: "https://github.com/rajanbor/skills.git", ref: "main" },
];

export type EntryKind = "file" | "executable" | "symlink" | "submodule" | "other";

export interface SnapshotEntry {
  /** POSIX path relative to the source root. */
  readonly path: string;
  readonly kind: EntryKind;
  readonly size: number;
}

export interface SourceSnapshot {
  readonly source: SkillSourceConfig;
  /** Commit SHA for git sources; `sha256-…` content digest for local ones. */
  readonly revision: string;
  /** When the revision was last fetched from the remote (git only). */
  readonly fetchedAt?: string;
  /** True when a refresh was requested or needed but failed and a cache was used. */
  readonly stale: boolean;
  readonly warnings: readonly string[];
  readonly entries: readonly SnapshotEntry[];
  read(path: string): Promise<Buffer>;
}

export interface ResolveOptions {
  /** Fetch the configured ref even when a cached revision exists. */
  readonly refresh?: boolean;
  /** Resolve this exact revision (from the lockfile) instead of the ref. */
  readonly revision?: string;
  /** Project root, for relative local sources. */
  readonly projectRoot: string;
  readonly env?: Readonly<Record<string, string | undefined>>;
}

/** MAP's per-user directory (`MAP_HOME`, default `~/.map`). */
export function mapHome(env: Readonly<Record<string, string | undefined>> = process.env): string {
  const override = env["MAP_HOME"];
  return override !== undefined && override !== "" ? override : join(homedir(), ".map");
}

const SOURCE_ID = /^[a-z0-9][a-z0-9-]{0,63}$/;

/** Structural validation for configured sources (used by config parsing too). */
export function validateSourceConfig(value: unknown, path: string): SkillSourceConfig {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error(`${path} must be an object`);
  const record = value as Record<string, unknown>;
  const id = record["id"];
  if (typeof id !== "string" || !SOURCE_ID.test(id)) throw new Error(`${path}.id must match ${SOURCE_ID.source}`);
  for (const key of Object.keys(record)) {
    if (!["id", "type", "url", "ref", "path"].includes(key) && !key.startsWith("x-")) {
      throw new Error(`${path}.${key} is not a recognized field`);
    }
  }
  if (record["type"] === "git") {
    const url = record["url"];
    if (typeof url !== "string") throw new Error(`${path}.url must be a string`);
    assertSafeRemote(url);
    const ref = record["ref"];
    if (ref !== undefined) {
      if (typeof ref !== "string") throw new Error(`${path}.ref must be a string`);
      assertSafeRef(ref);
      return { id, type: "git", url, ref };
    }
    return { id, type: "git", url };
  }
  if (record["type"] === "local") {
    const local = record["path"];
    if (typeof local !== "string" || local === "") throw new Error(`${path}.path must be a non-empty string`);
    return { id, type: "local", path: local };
  }
  throw new Error(`${path}.type must be "git" or "local"`);
}

export async function resolveSource(source: SkillSourceConfig, options: ResolveOptions): Promise<SourceSnapshot> {
  return source.type === "git" ? resolveGit(source, options) : resolveLocal(source, options);
}

// --- git -------------------------------------------------------------------

interface CacheState {
  readonly url: string;
  readonly ref: string;
  readonly revision: string;
  readonly fetchedAt: string;
}

async function resolveGit(
  source: Extract<SkillSourceConfig, { type: "git" }>,
  options: ResolveOptions,
): Promise<SourceSnapshot> {
  assertSafeRemote(source.url);
  const ref = source.ref ?? "HEAD";
  if (ref !== "HEAD") assertSafeRef(ref);

  const cacheDir = join(mapHome(options.env), "cache", "skills", source.id);
  const gitDir = join(cacheDir, "repo.git");
  const statePath = join(cacheDir, "state.json");
  await ensureBareRepo(gitDir);
  const state = await readState(statePath, source.url, ref);
  const warnings: string[] = [];
  // Local repositories are not network access, so MAP_OFFLINE still allows them.
  const remote = !source.url.startsWith("/") && !source.url.startsWith("file://");
  const offline = (options.env ?? process.env)["MAP_OFFLINE"] === "1" && remote;
  const fetch = async (what: string): Promise<void> => {
    if (offline) throw new Error("network access is disabled (MAP_OFFLINE=1)");
    await git(["fetch", "--quiet", "--no-tags", "--depth=1", source.url, what], gitDir);
  };

  let revision: string;
  let fetchedAt = state?.fetchedAt;
  let stale = false;

  if (options.revision !== undefined) {
    if (!COMMIT_SHA.test(options.revision)) throw new Error(`locked revision '${options.revision}' is not a commit SHA`);
    revision = options.revision;
    if (!(await hasCommit(gitDir, revision))) {
      try {
        await fetch(revision);
      } catch (error) {
        throw new Error(
          `cannot fetch locked revision ${revision.slice(0, 12)} of source '${source.id}': ${messageOf(error)}`,
        );
      }
      if (!(await hasCommit(gitDir, revision))) {
        throw new Error(`source '${source.id}' does not contain the locked revision ${revision}`);
      }
    }
  } else if (state !== undefined && options.refresh !== true && (await hasCommit(gitDir, state.revision))) {
    revision = state.revision;
  } else {
    try {
      await fetch(ref);
      revision = (await git(["rev-parse", "--verify", "FETCH_HEAD^{commit}"], gitDir)).trim();
      fetchedAt = new Date().toISOString();
      await writeFile(statePath, `${JSON.stringify({ url: source.url, ref, revision, fetchedAt }, null, 2)}\n`);
    } catch (error) {
      if (state === undefined || !(await hasCommit(gitDir, state.revision))) {
        throw new Error(
          `cannot fetch skill source '${source.id}' (${source.url}) and no cached copy exists: ${messageOf(error)}`,
        );
      }
      revision = state.revision;
      stale = true;
      warnings.push(
        `could not refresh '${source.id}'; using the cached revision ${revision.slice(0, 12)} fetched ${state.fetchedAt}`,
      );
    }
  }
  // Keep the commit reachable so `git gc` in the cache never prunes a locked revision.
  await git(["update-ref", `refs/map/${revision}`, revision], gitDir);

  const tree = await listTree(gitDir, revision);
  const entries: SnapshotEntry[] = tree.map((entry) => ({
    path: entry.path,
    kind:
      entry.type === "commit" ? "submodule"
        : entry.mode === "120000" ? "symlink"
          : entry.mode === "100755" ? "executable"
            : entry.mode === "100644" ? "file"
              : "other",
    size: entry.size,
  }));
  const objects = new Map(tree.map((entry) => [entry.path, entry.object]));

  return {
    source,
    revision,
    ...(fetchedAt !== undefined ? { fetchedAt } : {}),
    stale,
    warnings,
    entries,
    async read(path) {
      const object = objects.get(path);
      if (object === undefined) throw new Error(`${path} is not in ${source.id}@${revision.slice(0, 12)}`);
      return gitBuffer(["cat-file", "blob", object], gitDir);
    },
  };
}

async function ensureBareRepo(gitDir: string): Promise<void> {
  try {
    await lstat(join(gitDir, "HEAD"));
  } catch {
    await mkdir(gitDir, { recursive: true });
    // An empty template directory means no sample hooks or other template files.
    await git(["init", "--quiet", "--bare", "--template=", gitDir]);
  }
}

async function hasCommit(gitDir: string, revision: string): Promise<boolean> {
  try {
    await git(["cat-file", "-e", `${revision}^{commit}`], gitDir);
    return true;
  } catch {
    return false;
  }
}

async function readState(path: string, url: string, ref: string): Promise<CacheState | undefined> {
  try {
    const state = JSON.parse(await readFile(path, "utf8")) as Partial<CacheState>;
    if (state.url !== url || state.ref !== ref || typeof state.revision !== "string" || !COMMIT_SHA.test(state.revision)) {
      return undefined;
    }
    return { url, ref, revision: state.revision, fetchedAt: String(state.fetchedAt ?? "") };
  } catch {
    return undefined;
  }
}

// --- local -----------------------------------------------------------------

const LOCAL_LIMIT = 5000;

async function resolveLocal(
  source: Extract<SkillSourceConfig, { type: "local" }>,
  options: ResolveOptions,
): Promise<SourceSnapshot> {
  const root = isAbsolute(source.path) ? source.path : resolve(options.projectRoot, source.path);
  try {
    const info = await lstat(root);
    if (!info.isDirectory()) throw new Error("not a directory");
  } catch {
    throw new Error(`local skill source '${source.id}' does not exist or is not a directory: ${root}`);
  }

  const entries: SnapshotEntry[] = [];
  const walk = async (dir: string): Promise<void> => {
    for (const dirent of (await readdir(dir, { withFileTypes: true })).sort((a, b) => (a.name < b.name ? -1 : 1))) {
      if (entries.length >= LOCAL_LIMIT) return;
      if (dirent.name === ".git") continue;
      const abs = join(dir, dirent.name);
      const rel = relative(root, abs).split(sep).join("/");
      if (dirent.isSymbolicLink()) entries.push({ path: rel, kind: "symlink", size: 0 });
      else if (dirent.isDirectory()) await walk(abs);
      else if (dirent.isFile()) {
        const info = await lstat(abs);
        entries.push({ path: rel, kind: info.mode & 0o111 ? "executable" : "file", size: info.size });
      } else entries.push({ path: rel, kind: "other", size: 0 });
    }
  };
  await walk(root);

  const hash = createHash("sha256");
  for (const entry of entries) {
    hash.update(`${entry.path}\0${entry.kind}\0`);
    if (entry.kind === "file" || entry.kind === "executable") hash.update(await readFile(join(root, entry.path)));
    hash.update("\n");
  }

  return {
    source,
    revision: `sha256-${hash.digest("hex")}`,
    stale: false,
    warnings: entries.length >= LOCAL_LIMIT ? [`local source '${source.id}' listing stopped at ${LOCAL_LIMIT} files`] : [],
    entries,
    async read(path) {
      const entry = entries.find((candidate) => candidate.path === path);
      if (entry === undefined || (entry.kind !== "file" && entry.kind !== "executable")) {
        throw new Error(`${path} is not a regular file in ${source.id}`);
      }
      return readFile(join(root, ...path.split("/")));
    },
  };
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
