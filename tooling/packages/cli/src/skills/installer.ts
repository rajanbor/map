/**
 * Filesystem side of skill installation, confined to the project root.
 *
 * Guarantees:
 *  - every path is checked component by component; a symlink anywhere between the
 *    project root and the destination aborts the operation (no writes through links);
 *  - new content is staged in a sibling directory and moved into place with rename,
 *    so a failed install never leaves a half-written skill;
 *  - an existing directory MAP did not install, or one whose files changed since
 *    installation, is never overwritten or deleted — with `force`, it is moved to a
 *    timestamped backup instead of being destroyed;
 *  - execute permission is only kept for scripts the user approved.
 */

import { randomBytes } from "node:crypto";
import { chmod, lstat, mkdir, readFile, readdir, rename, rm, rmdir, writeFile } from "node:fs/promises";
import { dirname, join, relative, sep } from "node:path";
import { skillIntegrity } from "./catalog.ts";
import { isSafeRelativePath } from "./audit.ts";

export interface InstallFile {
  readonly path: string;
  readonly content: Buffer;
  readonly executable: boolean;
}

export type InstalledState =
  | { readonly kind: "missing" }
  | { readonly kind: "clean" }
  | { readonly kind: "modified"; readonly missing: readonly string[] }
  | { readonly kind: "unowned" }
  | { readonly kind: "unsafe"; readonly reason: string };

export interface DiskStatus {
  readonly state: InstalledState;
  /** Files present on disk that MAP did not install (kept on update/remove). */
  readonly extra: readonly string[];
}

/** Throws when `rel` (project-relative) is unsafe or crosses a symlink. */
export async function assertInsideProject(root: string, rel: string): Promise<void> {
  if (!isSafeRelativePath(rel)) throw new Error(`refusing unsafe project path '${rel}'`);
  let current = root;
  for (const segment of rel.split("/")) {
    current = join(current, segment);
    let info;
    try {
      info = await lstat(current);
    } catch {
      return; // the rest does not exist yet; it will be created as real directories
    }
    if (info.isSymbolicLink()) throw new Error(`refusing to write through symlink ${relative(root, current)}`);
  }
}

/** Compare a destination directory with what the lockfile says MAP installed there. */
export async function diskStatus(
  root: string,
  destRel: string,
  locked: { readonly files: readonly string[]; readonly integrity: string } | undefined,
): Promise<DiskStatus> {
  try {
    await assertInsideProject(root, destRel);
  } catch (error) {
    return { state: { kind: "unsafe", reason: messageOf(error) }, extra: [] };
  }
  const dest = join(root, ...destRel.split("/"));
  let info;
  try {
    info = await lstat(dest);
  } catch {
    return { state: { kind: "missing" }, extra: [] };
  }
  if (!info.isDirectory()) return { state: { kind: "unsafe", reason: `${destRel} exists and is not a directory` }, extra: [] };

  const present = await listRegularFiles(dest);
  if (locked === undefined) return { state: { kind: "unowned" }, extra: present };

  const extra = present.filter((file) => !locked.files.includes(file));
  if (present.symlinks.length > 0) {
    return { state: { kind: "unsafe", reason: `${destRel} contains symlinks (${present.symlinks.join(", ")})` }, extra };
  }
  const contents: Array<{ path: string; content: Buffer }> = [];
  const changed: string[] = [];
  for (const file of locked.files) {
    try {
      contents.push({ path: file, content: await readFile(join(dest, ...file.split("/"))) });
    } catch {
      changed.push(file);
    }
  }
  if (changed.length === 0 && skillIntegrity(contents) === locked.integrity) return { state: { kind: "clean" }, extra };
  // `changed` lists missing files; edited content shows up only as an integrity mismatch.
  return { state: { kind: "modified", missing: changed.sort() }, extra };
}

/**
 * Write a skill into `destRel` atomically. The caller decides, from `diskStatus`,
 * whether replacing is allowed; `backupExisting` moves any existing directory aside
 * instead of deleting it. Returns the backup path when one was made.
 */
export async function writeSkillDir(
  root: string,
  destRel: string,
  files: readonly InstallFile[],
  options: { readonly backupExisting: boolean; readonly keepExtra: readonly string[] },
): Promise<{ readonly backup?: string }> {
  await assertInsideProject(root, destRel);
  for (const file of files) {
    if (!isSafeRelativePath(file.path)) throw new Error(`refusing unsafe skill file path '${file.path}'`);
  }
  const dest = join(root, ...destRel.split("/"));
  await mkdir(dirname(dest), { recursive: true });
  await assertInsideProject(root, destRel);

  const stage = `${dest}.map-stage-${randomBytes(4).toString("hex")}`;
  await mkdir(stage, { recursive: false });
  try {
    for (const file of files) {
      const target = join(stage, ...file.path.split("/"));
      await mkdir(dirname(target), { recursive: true });
      await writeFile(target, file.content, { flag: "wx", mode: 0o644 });
      if (file.executable) await chmod(target, 0o755);
    }
    // Carry over files the user added inside an installed skill directory.
    for (const extra of options.keepExtra) {
      const from = join(dest, ...extra.split("/"));
      const to = join(stage, ...extra.split("/"));
      await mkdir(dirname(to), { recursive: true });
      await writeFile(to, await readFile(from), { flag: "wx", mode: 0o644 });
    }

    let backup: string | undefined;
    const exists = await lstat(dest).then(() => true, () => false);
    if (exists) {
      const aside = options.backupExisting
        ? `${dest}.map-backup-${new Date().toISOString().replace(/[:.]/g, "-")}`
        : `${dest}.map-old-${randomBytes(4).toString("hex")}`;
      await rename(dest, aside);
      try {
        await rename(stage, dest);
      } catch (error) {
        await rename(aside, dest);
        throw error;
      }
      if (options.backupExisting) backup = relative(root, aside).split(sep).join("/");
      else await rm(aside, { recursive: true, force: true });
    } else {
      await rename(stage, dest);
    }
    return backup !== undefined ? { backup } : {};
  } catch (error) {
    await rm(stage, { recursive: true, force: true });
    throw error;
  }
}

/**
 * Remove the files MAP installed from `destRel`, then any directories left empty.
 * Files that are not in `files` are left in place and returned.
 */
export async function removeSkillFiles(root: string, destRel: string, files: readonly string[]): Promise<readonly string[]> {
  await assertInsideProject(root, destRel);
  const dest = join(root, ...destRel.split("/"));
  for (const file of files) {
    if (!isSafeRelativePath(file)) continue;
    await rm(join(dest, ...file.split("/")), { force: true });
  }
  await pruneEmptyDirs(dest);
  const remaining = await lstat(dest).then(() => listRegularFiles(dest), () => Object.assign([] as string[], { symlinks: [] as string[] }));
  return remaining;
}

async function pruneEmptyDirs(dir: string): Promise<void> {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) if (entry.isDirectory()) await pruneEmptyDirs(join(dir, entry.name));
  try {
    await rmdir(dir);
  } catch {
    // not empty: user files remain
  }
}

async function listRegularFiles(dir: string): Promise<string[] & { symlinks: string[] }> {
  const files: string[] = [];
  const symlinks: string[] = [];
  const walk = async (current: string): Promise<void> => {
    for (const entry of await readdir(current, { withFileTypes: true })) {
      const abs = join(current, entry.name);
      const rel = relative(dir, abs).split(sep).join("/");
      if (entry.isSymbolicLink()) symlinks.push(rel);
      else if (entry.isDirectory()) await walk(abs);
      else if (entry.isFile()) files.push(rel);
    }
  };
  await walk(dir);
  return Object.assign(files.sort(), { symlinks: symlinks.sort() });
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
