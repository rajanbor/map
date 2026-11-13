/**
 * `.map/skills.lock.json` — the reproducible record of installed skills.
 *
 * Each entry pins a skill to an immutable revision (a commit SHA for git sources)
 * and a content integrity digest, and lists exactly which files MAP wrote where.
 * That file list is what makes removal and updates safe: MAP only touches files it
 * installed and refuses to replace files whose content changed since.
 *
 * Output is deterministic: keys and arrays are sorted and no timestamps are stored,
 * so the lockfile only changes when the installed state changes.
 */

import type { AgentId } from "../agents/index.ts";
import { AGENT_IDS } from "../agents/index.ts";
import { COMMIT_SHA } from "./git.ts";
import type { SkillSourceConfig } from "./source.ts";
import { validateSourceConfig } from "./source.ts";
import { isSafeRelativePath } from "./audit.ts";

export const LOCKFILE = "skills.lock.json";
export const LOCKFILE_VERSION = 1;

export interface LockedTarget {
  /** Project-relative skills directory, e.g. ".claude/skills". */
  readonly dir: string;
  readonly agents: readonly AgentId[];
}

export interface LockedSkill {
  readonly source: SkillSourceConfig;
  /** Skill directory inside the source. */
  readonly path: string;
  readonly revision: string;
  readonly integrity: string;
  readonly version?: string;
  readonly scope: "project";
  readonly targets: readonly LockedTarget[];
  /** Files written, relative to the skill directory. */
  readonly files: readonly string[];
  readonly approvals: { readonly scripts: boolean; readonly risky: boolean };
}

export interface SkillsLock {
  readonly lockfileVersion: 1;
  readonly skills: Readonly<Record<string, LockedSkill>>;
}

export function emptyLock(): SkillsLock {
  return { lockfileVersion: LOCKFILE_VERSION, skills: {} };
}

const NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const INTEGRITY = /^sha256-[0-9a-f]{64}$/;
const SKILL_DIR = /^\.[a-z]+\/skills$/;

/** Parse and validate; every structural problem is an error naming its JSON path. */
export function parseLock(json: string): SkillsLock {
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    throw new Error(`${LOCKFILE} is not valid JSON`);
  }
  const root = record(data, "$");
  keys(root, ["lockfileVersion", "skills"], "$");
  if (root["lockfileVersion"] !== LOCKFILE_VERSION) {
    throw new Error(`${LOCKFILE}: $.lockfileVersion must be ${LOCKFILE_VERSION}; this CLI may be too old`);
  }
  const skills: Record<string, LockedSkill> = {};
  for (const [name, raw] of Object.entries(record(root["skills"], "$.skills"))) {
    const path = `$.skills.${name}`;
    if (!NAME.test(name)) fail(path, "has an invalid skill name");
    const entry = record(raw, path);
    keys(entry, ["source", "path", "revision", "integrity", "version", "scope", "targets", "files", "approvals"], path);
    let source: SkillSourceConfig;
    try {
      source = validateSourceConfig(entry["source"], `${path}.source`);
    } catch (error) {
      throw new Error(`${LOCKFILE}: ${error instanceof Error ? error.message : String(error)}`);
    }
    const skillPath = string(entry["path"], `${path}.path`);
    if (!isSafeRelativePath(skillPath)) fail(`${path}.path`, "must be a safe relative path");
    const revision = string(entry["revision"], `${path}.revision`);
    if (source.type === "git" ? !COMMIT_SHA.test(revision) : !INTEGRITY.test(revision)) {
      fail(`${path}.revision`, source.type === "git" ? "must be a full commit SHA" : "must be a sha256 digest");
    }
    const integrity = string(entry["integrity"], `${path}.integrity`);
    if (!INTEGRITY.test(integrity)) fail(`${path}.integrity`, "must be sha256-<64 hex>");
    if (entry["scope"] !== "project") fail(`${path}.scope`, 'must be "project"');
    const targets = array(entry["targets"], `${path}.targets`).map((value, index) => {
      const target = record(value, `${path}.targets[${index}]`);
      keys(target, ["dir", "agents"], `${path}.targets[${index}]`);
      const dir = string(target["dir"], `${path}.targets[${index}].dir`);
      if (!SKILL_DIR.test(dir)) fail(`${path}.targets[${index}].dir`, "must be a project skills directory such as .claude/skills");
      const agents = array(target["agents"], `${path}.targets[${index}].agents`).map((agent) => {
        if (typeof agent !== "string" || !(AGENT_IDS as readonly string[]).includes(agent)) {
          fail(`${path}.targets[${index}].agents`, `contains unknown agent ${JSON.stringify(agent)}`);
        }
        return agent as AgentId;
      });
      return { dir, agents };
    });
    if (targets.length === 0) fail(`${path}.targets`, "must not be empty");
    const files = array(entry["files"], `${path}.files`).map((file, index) => {
      const value = string(file, `${path}.files[${index}]`);
      if (!isSafeRelativePath(value)) fail(`${path}.files[${index}]`, "must be a safe relative path");
      return value;
    });
    if (!files.includes("SKILL.md")) fail(`${path}.files`, "must include SKILL.md");
    const approvals = record(entry["approvals"], `${path}.approvals`);
    keys(approvals, ["scripts", "risky"], `${path}.approvals`);
    if (typeof approvals["scripts"] !== "boolean" || typeof approvals["risky"] !== "boolean") {
      fail(`${path}.approvals`, "must have boolean scripts and risky");
    }
    const version = entry["version"];
    if (version !== undefined && typeof version !== "string") fail(`${path}.version`, "must be a string");
    skills[name] = {
      source,
      path: skillPath,
      revision,
      integrity,
      ...(typeof version === "string" ? { version } : {}),
      scope: "project",
      targets,
      files,
      approvals: { scripts: approvals["scripts"] as boolean, risky: approvals["risky"] as boolean },
    };
  }
  return { lockfileVersion: LOCKFILE_VERSION, skills };
}

export function serializeLock(lock: SkillsLock): string {
  const skills: Record<string, unknown> = {};
  for (const name of Object.keys(lock.skills).sort()) {
    const entry = lock.skills[name]!;
    skills[name] = {
      source: entry.source,
      path: entry.path,
      revision: entry.revision,
      integrity: entry.integrity,
      ...(entry.version !== undefined ? { version: entry.version } : {}),
      scope: entry.scope,
      targets: [...entry.targets]
        .sort((a, b) => a.dir.localeCompare(b.dir))
        .map((target) => ({ dir: target.dir, agents: [...target.agents].sort((a, b) => AGENT_IDS.indexOf(a) - AGENT_IDS.indexOf(b)) })),
      files: [...entry.files].sort(),
      approvals: entry.approvals,
    };
  }
  return `${JSON.stringify({ lockfileVersion: LOCKFILE_VERSION, skills }, null, 2)}\n`;
}

function record(value: unknown, path: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) fail(path, "must be an object");
  return value as Record<string, unknown>;
}

function array(value: unknown, path: string): unknown[] {
  if (!Array.isArray(value)) fail(path, "must be an array");
  return value;
}

function string(value: unknown, path: string): string {
  if (typeof value !== "string" || value === "") fail(path, "must be a non-empty string");
  return value;
}

function keys(value: Record<string, unknown>, allowed: readonly string[], path: string): void {
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key) && !key.startsWith("x-")) fail(`${path}.${key}`, "is not a recognized field");
  }
}

function fail(path: string, reason: string): never {
  throw new Error(`${LOCKFILE}: ${path} ${reason}`);
}
