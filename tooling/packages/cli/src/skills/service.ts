/**
 * Skill use cases shared by `map skills …`, `map plan`, and `map init`:
 * catalog loading, install, reproducible reinstall, update, removal, and audit.
 *
 * Each operation returns structured results; the CLI decides how to present them.
 * Operations are idempotent: re-running an install with nothing changed reports
 * `unchanged` and leaves files and the lockfile byte-identical.
 */

import { readFile, readdir, rename, writeFile, mkdir, lstat } from "node:fs/promises";
import { join } from "node:path";
import type { AgentId } from "../agents/index.ts";
import { skillDirectoriesFor, sortAgents, AGENTS } from "../agents/index.ts";
import type { AuditFile, AuditReport } from "./audit.ts";
import { auditSkill } from "./audit.ts";
import { parseSkillMetadata } from "./metadata.ts";
import type { CatalogSkill, SkillCatalog } from "./catalog.ts";
import { buildCatalog, discoverSkills, filesOf, findSkill, skillIntegrity } from "./catalog.ts";
import type { InstallFile } from "./installer.ts";
import { assertInsideProject, diskStatus, removeSkillFiles, writeSkillDir } from "./installer.ts";
import type { LockedSkill, LockedTarget, SkillsLock } from "./lockfile.ts";
import { LOCKFILE, emptyLock, parseLock, serializeLock } from "./lockfile.ts";
import type { SkillSourceConfig, SourceSnapshot } from "./source.ts";
import { resolveSource } from "./source.ts";

export interface SkillsEnv {
  /** Project root. */
  readonly root: string;
  readonly sources: readonly SkillSourceConfig[];
  readonly env?: Readonly<Record<string, string | undefined>>;
}

export interface LoadedCatalog {
  readonly catalog: SkillCatalog;
  readonly snapshots: ReadonlyMap<string, SourceSnapshot>;
}

/** Resolve every source; one failing source is a warning unless all fail. */
export async function loadCatalog(env: SkillsEnv, options: { readonly refresh?: boolean } = {}): Promise<LoadedCatalog> {
  const snapshots: SourceSnapshot[] = [];
  const warnings: string[] = [];
  for (const source of env.sources) {
    try {
      snapshots.push(
        await resolveSource(source, {
          projectRoot: env.root,
          ...(options.refresh !== undefined ? { refresh: options.refresh } : {}),
          ...(env.env !== undefined ? { env: env.env } : {}),
        }),
      );
    } catch (error) {
      warnings.push(messageOf(error));
    }
  }
  if (snapshots.length === 0 && env.sources.length > 0) {
    throw new Error(`no skill source could be loaded:\n  ${warnings.join("\n  ")}`);
  }
  const discovered = await Promise.all(snapshots.map((snapshot) => discoverSkills(snapshot)));
  return {
    catalog: buildCatalog(snapshots, discovered, warnings),
    snapshots: new Map(snapshots.map((snapshot) => [snapshot.source.id, snapshot])),
  };
}

// --- lockfile I/O ---------------------------------------------------------------

export function lockPath(root: string): string {
  return join(root, ".map", LOCKFILE);
}

export async function readLock(root: string): Promise<SkillsLock> {
  let text: string;
  try {
    text = await readFile(lockPath(root), "utf8");
  } catch {
    return emptyLock();
  }
  return parseLock(text);
}

export async function writeLock(root: string, lock: SkillsLock): Promise<boolean> {
  await assertInsideProject(root, `.map/${LOCKFILE}`);
  const next = serializeLock(lock);
  const current = await readFile(lockPath(root), "utf8").catch(() => undefined);
  if (current === next) return false;
  await mkdir(join(root, ".map"), { recursive: true });
  await writeFile(lockPath(root), next);
  return true;
}

// --- prepare ----------------------------------------------------------------------

export interface PreparedSkill {
  readonly skill: CatalogSkill;
  readonly snapshot: SourceSnapshot;
  readonly files: readonly AuditFile[];
  readonly audit: AuditReport;
  readonly integrity: string;
}

/** Read a skill's files from its snapshot and audit them. Nothing is written. */
export async function prepareSkill(snapshot: SourceSnapshot, skill: CatalogSkill): Promise<PreparedSkill> {
  const entries = filesOf(snapshot.entries, skill.path);
  const files: AuditFile[] = [];
  for (const entry of entries) {
    const regular = entry.kind === "file" || entry.kind === "executable";
    files.push(regular && entry.size <= 2 * 1024 * 1024 ? { entry, content: await snapshot.read(`${skill.path}/${entry.path}`) } : { entry });
  }
  const audit = auditSkill(skill, files);
  const integrity = skillIntegrity(files.filter((f) => f.content !== undefined).map((f) => ({ path: f.entry.path, content: f.content! })));
  return { skill, snapshot, files, audit, integrity };
}

// --- install ----------------------------------------------------------------------

export type TargetAction = "create" | "update" | "remove" | "unchanged" | "conflict" | "replace-with-backup" | "error";

export interface TargetResult {
  readonly dir: string;
  readonly path: string;
  readonly agents: readonly AgentId[];
  readonly action: TargetAction;
  readonly reason?: string;
  readonly backup?: string;
}

export type SkillStatus = "installed" | "removed" | "unchanged" | "blocked" | "needs-approval" | "conflict" | "error" | "planned";

export interface SkillResult {
  readonly name: string;
  readonly status: SkillStatus;
  readonly message: string;
  readonly revision?: string;
  readonly targets: readonly TargetResult[];
  readonly audit?: AuditReport;
  readonly missingApprovals?: ReadonlyArray<"scripts" | "risky">;
}

export interface InstallOptions {
  readonly agents: readonly AgentId[];
  readonly approve: { readonly scripts: boolean; readonly risky: boolean };
  /** Replace unowned or locally modified directories, keeping a backup. */
  readonly force: boolean;
  /** Compute the result without writing anything. */
  readonly dryRun: boolean;
}

/**
 * Install (or re-install) one prepared skill into every skills directory read by the
 * selected agents. All-or-nothing per skill: a conflict in one directory means no
 * directory is written.
 */
export async function installPrepared(
  root: string,
  lock: SkillsLock,
  prepared: PreparedSkill,
  options: InstallOptions,
): Promise<{ readonly result: SkillResult; readonly lock: SkillsLock }> {
  const { skill, audit } = prepared;
  const name = skill.name;
  const existing = lock.skills[name];
  if (existing !== undefined && (existing.source.id !== skill.source || existing.path !== skill.path)) {
    return done(lock, {
      name,
      status: "conflict",
      message: `'${name}' is already installed from ${existing.source.id}:${existing.path}; remove it first`,
      targets: [],
      audit,
    });
  }
  if (audit.blocked) {
    return done(lock, { name, status: "blocked", message: "the skill failed structural validation and cannot be installed", targets: [], audit });
  }
  const missing = audit.approvals.filter((approval) => !options.approve[approval] && !(existing?.approvals[approval] === true && existing.integrity === prepared.integrity));
  if (missing.length > 0) {
    return done(lock, {
      name,
      status: "needs-approval",
      message: approvalMessage(missing),
      targets: [],
      audit,
      missingApprovals: missing,
    });
  }

  const agents = sortAgents([...options.agents, ...(existing?.targets.flatMap((t) => t.agents) ?? [])]);
  const dirs = mergeTargets(skillDirectoriesFor(agents), existing?.targets ?? []);
  const results: TargetResult[] = [];
  for (const target of dirs) {
    const path = `${target.dir}/${name}`;
    const owned = existing?.targets.some((t) => t.dir === target.dir) === true ? existing : undefined;
    const status = await diskStatus(root, path, owned);
    const base = { dir: target.dir, path, agents: target.agents };
    switch (status.state.kind) {
      case "missing":
        results.push({ ...base, action: "create" });
        break;
      case "clean":
        results.push({ ...base, action: owned?.integrity === prepared.integrity ? "unchanged" : "update" });
        break;
      case "modified":
        results.push(
          options.force
            ? { ...base, action: "replace-with-backup", reason: "local changes will be moved to a backup" }
            : { ...base, action: "conflict", reason: "files changed since MAP installed them (use --force to replace; a backup is kept)" },
        );
        break;
      case "unowned":
        results.push(
          options.force
            ? { ...base, action: "replace-with-backup", reason: "existing directory will be moved to a backup" }
            : { ...base, action: "conflict", reason: "a skill directory MAP did not install already exists (use --force to replace; a backup is kept)" },
        );
        break;
      case "unsafe":
        results.push({ ...base, action: "error", reason: status.state.reason });
        break;
    }
  }

  const blocked = results.find((r) => r.action === "conflict" || r.action === "error");
  if (blocked !== undefined) {
    return done(lock, {
      name,
      status: blocked.action === "error" ? "error" : "conflict",
      message: `${blocked.path}: ${blocked.reason ?? blocked.action}`,
      revision: prepared.snapshot.revision,
      targets: results,
      audit,
    });
  }

  const allUnchanged = results.every((r) => r.action === "unchanged") && existing?.revision === prepared.snapshot.revision;
  if (options.dryRun) {
    return done(lock, {
      name,
      status: allUnchanged ? "unchanged" : "planned",
      message: allUnchanged ? "already installed at this revision" : "would install",
      revision: prepared.snapshot.revision,
      targets: results,
      audit,
    });
  }

  const approvals = {
    scripts: audit.approvals.includes("scripts") && (options.approve.scripts || existing?.approvals.scripts === true),
    risky: audit.approvals.includes("risky") && (options.approve.risky || existing?.approvals.risky === true),
  };
  const files: InstallFile[] = prepared.files
    .filter((file) => file.content !== undefined)
    .map((file) => ({ path: file.entry.path, content: file.content!, executable: approvals.scripts && file.entry.kind === "executable" }));

  const written: TargetResult[] = [];
  for (const target of results) {
    if (target.action === "unchanged") {
      written.push(target);
      continue;
    }
    const status = await diskStatus(root, target.path, existing);
    const { backup } = await writeSkillDir(root, target.path, files, {
      backupExisting: target.action === "replace-with-backup",
      keepExtra: target.action === "update" ? status.extra : [],
    });
    written.push({ ...target, ...(backup !== undefined ? { backup } : {}) });
  }

  const entry: LockedSkill = {
    source: prepared.snapshot.source,
    path: skill.path,
    revision: prepared.snapshot.revision,
    integrity: prepared.integrity,
    ...(skill.version !== undefined ? { version: skill.version } : {}),
    scope: "project",
    targets: dirs.map((d) => ({ dir: d.dir, agents: d.agents })),
    files: files.map((f) => f.path).sort(),
    approvals,
  };
  const nextLock: SkillsLock = { lockfileVersion: 1, skills: { ...lock.skills, [name]: entry } };
  return done(nextLock, {
    name,
    status: allUnchanged ? "unchanged" : "installed",
    message: allUnchanged ? "already installed at this revision" : `installed ${skill.version ?? ""} @ ${shortRev(entry.revision)}`.replace("  ", " "),
    revision: entry.revision,
    targets: written,
    audit,
  });
}

function mergeTargets(
  wanted: ReadonlyArray<{ readonly dir: string; readonly agents: readonly AgentId[] }>,
  existing: readonly LockedTarget[],
): LockedTarget[] {
  const merged = new Map<string, AgentId[]>();
  for (const target of [...existing, ...wanted]) {
    merged.set(target.dir, sortAgents([...(merged.get(target.dir) ?? []), ...target.agents]));
  }
  return [...merged.entries()].map(([dir, agents]) => ({ dir, agents })).sort((a, b) => a.dir.localeCompare(b.dir));
}

/** Install by name from a loaded catalog. */
export async function addSkills(
  env: SkillsEnv,
  loaded: LoadedCatalog,
  names: readonly string[],
  options: InstallOptions & { readonly source?: string },
): Promise<{ readonly results: readonly SkillResult[]; readonly lockChanged: boolean }> {
  let lock = await readLock(env.root);
  const results: SkillResult[] = [];
  for (const name of names) {
    const found = findSkill(loaded.catalog, name, options.source);
    if (found.skill === undefined) {
      results.push({ name, status: "error", message: found.error ?? "unknown skill", targets: [] });
      continue;
    }
    const snapshot = loaded.snapshots.get(found.skill.source)!;
    const prepared = await prepareSkill(snapshot, found.skill);
    const outcome = await installPrepared(env.root, lock, prepared, options);
    lock = outcome.lock;
    results.push(outcome.result);
  }
  const lockChanged = options.dryRun ? false : await writeLock(env.root, lock);
  return { results, lockChanged };
}

/**
 * Reinstall exactly what the lockfile records. Each skill is fetched at its locked
 * revision and must match its locked integrity; a mismatch fails without writing.
 */
export async function installFromLock(
  env: SkillsEnv,
  options: { readonly force: boolean; readonly dryRun: boolean },
): Promise<readonly SkillResult[]> {
  const lock = await readLock(env.root);
  const results: SkillResult[] = [];
  let next = lock;
  for (const [name, entry] of Object.entries(lock.skills).sort(([a], [b]) => a.localeCompare(b))) {
    let snapshot: SourceSnapshot;
    try {
      snapshot = await resolveSource(entry.source, {
        projectRoot: env.root,
        ...(entry.source.type === "git" ? { revision: entry.revision } : {}),
        ...(env.env !== undefined ? { env: env.env } : {}),
      });
    } catch (error) {
      results.push({ name, status: "error", message: messageOf(error), targets: [] });
      continue;
    }
    const skill = (await discoverSkills(snapshot)).find((s) => s.path === entry.path && s.name === name);
    if (skill === undefined) {
      results.push({ name, status: "error", message: `${entry.source.id}@${shortRev(entry.revision)} has no skill '${name}' at ${entry.path}`, targets: [] });
      continue;
    }
    const prepared = await prepareSkill(snapshot, skill);
    if (prepared.integrity !== entry.integrity) {
      results.push({
        name,
        status: "error",
        message: `integrity mismatch: lock has ${entry.integrity.slice(0, 19)}…, source has ${prepared.integrity.slice(0, 19)}… — the source changed or was tampered with`,
        targets: [],
      });
      continue;
    }
    const outcome = await installPrepared(env.root, next, prepared, {
      agents: entry.targets.flatMap((t) => t.agents),
      approve: entry.approvals,
      force: options.force,
      dryRun: options.dryRun,
    });
    next = outcome.lock;
    results.push(outcome.result);
  }
  if (!options.dryRun) await writeLock(env.root, next);
  return results;
}

export interface UpdateResult extends SkillResult {
  readonly from?: string;
}

/** Move locked skills to the latest revision of their source ref. */
export async function updateSkills(
  env: SkillsEnv,
  names: readonly string[],
  options: { readonly approve: { readonly scripts: boolean; readonly risky: boolean }; readonly force: boolean; readonly dryRun: boolean },
): Promise<readonly UpdateResult[]> {
  let lock = await readLock(env.root);
  const selected = names.length > 0 ? names : Object.keys(lock.skills).sort();
  const results: UpdateResult[] = [];
  const snapshots = new Map<string, SourceSnapshot>();
  for (const name of selected) {
    const entry = lock.skills[name];
    if (entry === undefined) {
      results.push({ name, status: "error", message: `'${name}' is not in ${LOCKFILE}; install it with 'map skills add ${name}'`, targets: [] });
      continue;
    }
    // Prefer the configured definition of the same source id (its URL/ref may have moved).
    const source = env.sources.find((s) => s.id === entry.source.id) ?? entry.source;
    let snapshot = snapshots.get(source.id);
    try {
      snapshot ??= await resolveSource(source, { projectRoot: env.root, refresh: true, ...(env.env !== undefined ? { env: env.env } : {}) });
      snapshots.set(source.id, snapshot);
    } catch (error) {
      results.push({ name, status: "error", message: messageOf(error), targets: [] });
      continue;
    }
    const skill = (await discoverSkills(snapshot)).find((s) => s.name === name && s.path === entry.path) ??
      (await discoverSkills(snapshot)).find((s) => s.name === name);
    if (skill === undefined) {
      results.push({ name, status: "error", message: `source '${source.id}' no longer provides '${name}'`, targets: [] });
      continue;
    }
    const prepared = await prepareSkill(snapshot, skill);
    if (prepared.integrity === entry.integrity) {
      results.push({ name, status: "unchanged", message: `up to date (${shortRev(entry.revision)})`, revision: entry.revision, targets: [], from: entry.revision });
      continue;
    }
    const outcome = await installPrepared(env.root, lock, prepared, {
      agents: entry.targets.flatMap((t) => t.agents),
      approve: options.approve,
      force: options.force,
      dryRun: options.dryRun,
    });
    lock = outcome.lock;
    results.push({ ...outcome.result, from: entry.revision });
  }
  if (!options.dryRun) await writeLock(env.root, lock);
  return results;
}

/** Remove MAP-installed skills. Edited directories are kept unless `force`, which backs them up. */
export async function removeSkills(
  env: SkillsEnv,
  names: readonly string[],
  options: { readonly force: boolean; readonly dryRun: boolean },
): Promise<readonly SkillResult[]> {
  let lock = await readLock(env.root);
  const results: SkillResult[] = [];
  for (const name of names) {
    const entry = lock.skills[name];
    if (entry === undefined) {
      results.push({ name, status: "error", message: `'${name}' was not installed by MAP (not in ${LOCKFILE}); nothing removed`, targets: [] });
      continue;
    }
    const targets: TargetResult[] = [];
    for (const target of entry.targets) {
      const path = `${target.dir}/${name}`;
      const status = await diskStatus(env.root, path, entry);
      const base = { dir: target.dir, path, agents: target.agents };
      if (status.state.kind === "missing") targets.push({ ...base, action: "unchanged", reason: "already absent" });
      else if (status.state.kind === "clean") targets.push({ ...base, action: "remove", ...(status.extra.length > 0 ? { reason: `keeps ${status.extra.length} file(s) you added` } : {}) });
      else if (status.state.kind === "unsafe") targets.push({ ...base, action: "error", reason: status.state.reason });
      else targets.push(options.force ? { ...base, action: "replace-with-backup", reason: "edited directory moved to a backup" } : { ...base, action: "conflict", reason: "files changed since install (use --force to move the directory to a backup)" });
    }
    const blocked = targets.find((t) => t.action === "conflict" || t.action === "error");
    if (blocked !== undefined) {
      results.push({ name, status: blocked.action === "error" ? "error" : "conflict", message: `${blocked.path}: ${blocked.reason ?? ""}`, targets });
      continue;
    }
    if (options.dryRun) {
      results.push({ name, status: "planned", message: "would remove", targets });
      continue;
    }
    const final: TargetResult[] = [];
    for (const target of targets) {
      if (target.action === "remove") {
        const kept = await removeSkillFiles(env.root, target.path, entry.files);
        final.push(kept.length > 0 ? { ...target, reason: `kept ${kept.length} file(s) not installed by MAP` } : target);
      } else if (target.action === "replace-with-backup") {
        const backup = `${target.path}.map-backup-${new Date().toISOString().replace(/[:.]/g, "-")}`;
        await assertInsideProject(env.root, backup);
        await rename(join(env.root, ...target.path.split("/")), join(env.root, ...backup.split("/")));
        final.push({ ...target, backup });
      } else final.push(target);
    }
    const { [name]: _removed, ...rest } = lock.skills;
    lock = { lockfileVersion: 1, skills: rest };
    results.push({ name, status: "removed", message: "removed", targets: final });
  }
  if (!options.dryRun) await writeLock(env.root, lock);
  return results;
}

// --- audit installed --------------------------------------------------------------

export interface InstalledAudit {
  readonly name: string;
  readonly managed: boolean;
  readonly path: string;
  readonly integrity: "clean" | "modified" | "missing" | "unmanaged" | "unsafe";
  readonly detail?: string;
  readonly audit?: AuditReport;
}

/**
 * Verify every installed skill against the lockfile and re-run the content audit on
 * the files actually on disk. Skill directories MAP did not install are reported as
 * `unmanaged` and audited read-only.
 */
export async function auditInstalled(root: string): Promise<readonly InstalledAudit[]> {
  const lock = await readLock(root);
  const results: InstalledAudit[] = [];
  const seen = new Set<string>();
  for (const [name, entry] of Object.entries(lock.skills).sort(([a], [b]) => a.localeCompare(b))) {
    for (const target of entry.targets) {
      const path = `${target.dir}/${name}`;
      seen.add(path);
      const status = await diskStatus(root, path, entry);
      const kind = status.state.kind;
      const integrity = kind === "clean" ? "clean" : kind === "missing" ? "missing" : kind === "unsafe" ? "unsafe" : "modified";
      results.push({
        name,
        managed: true,
        path,
        integrity,
        ...(status.state.kind === "unsafe" ? { detail: status.state.reason } : status.state.kind === "modified" && status.state.missing.length > 0 ? { detail: `missing: ${status.state.missing.join(", ")}` } : status.state.kind === "modified" ? { detail: "content differs from the locked integrity" } : {}),
        ...(kind === "clean" || kind === "modified" ? { audit: await auditDisk(root, path, name) } : {}),
      });
    }
  }
  for (const dir of [...new Set(AGENTS.flatMap((a) => [a.skillsDir, ...a.alsoReadsSkillsFrom]))].sort()) {
    let entries;
    try {
      await assertInsideProject(root, dir);
      entries = await readdir(join(root, ...dir.split("/")), { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      const path = `${dir}/${entry.name}`;
      if (seen.has(path) || entry.name.includes(".map-")) continue;
      if (entry.isSymbolicLink()) {
        results.push({ name: entry.name, managed: false, path, integrity: "unmanaged", detail: "symlinked skill directory (not inspected)" });
      } else if (entry.isDirectory()) {
        results.push({ name: entry.name, managed: false, path, integrity: "unmanaged", audit: await auditDisk(root, path, entry.name) });
      }
    }
  }
  return results;
}

async function auditDisk(root: string, path: string, name: string): Promise<AuditReport> {
  const dir = join(root, ...path.split("/"));
  const files: AuditFile[] = [];
  const walk = async (current: string, rel: string): Promise<void> => {
    for (const entry of (await readdir(current, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
      const childRel = rel === "" ? entry.name : `${rel}/${entry.name}`;
      const abs = join(current, entry.name);
      if (entry.isSymbolicLink()) files.push({ entry: { path: childRel, kind: "symlink", size: 0 } });
      else if (entry.isDirectory()) await walk(abs, childRel);
      else if (entry.isFile()) {
        const info = await lstat(abs);
        files.push({
          entry: { path: childRel, kind: info.mode & 0o111 ? "executable" : "file", size: info.size },
          ...(info.size <= 2 * 1024 * 1024 ? { content: await readFile(abs) } : {}),
        });
      }
    }
  };
  await walk(dir, "");
  const skillMd = files.find((f) => f.entry.path === "SKILL.md")?.content;
  const meta = skillMd === undefined ? { errors: ["SKILL.md is missing"], warnings: [] } : parseSkillMetadata(skillMd.toString("utf8"), name);
  return auditSkill({ name, errors: meta.errors, ...(meta.metadata?.allowedTools !== undefined ? { allowedTools: meta.metadata.allowedTools } : {}) }, files);
}

// --- helpers ------------------------------------------------------------------------

export function approvalMessage(missing: ReadonlyArray<"scripts" | "risky">): string {
  const parts: string[] = [];
  if (missing.includes("scripts")) parts.push("it bundles scripts an agent may run (approve with --allow-scripts)");
  if (missing.includes("risky")) parts.push("the audit found high-severity patterns (review 'map skills audit', then approve with --allow-risky)");
  return `needs approval: ${parts.join("; ")}`;
}

export function shortRev(revision: string): string {
  return revision.startsWith("sha256-") ? revision.slice(0, 19) : revision.slice(0, 12);
}

function done(lock: SkillsLock, result: SkillResult): { readonly result: SkillResult; readonly lock: SkillsLock } {
  return { result, lock };
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
