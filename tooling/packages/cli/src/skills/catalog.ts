/**
 * Skill catalog: discover skills in resolved source snapshots.
 *
 * A skill is a directory containing `SKILL.md`. Discovery reads only `SKILL.md`
 * frontmatter — references, scripts, and assets are left untouched until a skill is
 * audited or installed. Directories whose name starts with `_` or `.` (templates,
 * tool state) are skipped, as are skills nested inside another skill.
 */

import { createHash } from "node:crypto";
import type { SkillMetadata } from "./metadata.ts";
import { parseSkillMetadata } from "./metadata.ts";
import type { SkillSourceConfig, SnapshotEntry, SourceSnapshot } from "./source.ts";

export interface CatalogSkill {
  readonly name: string;
  readonly description: string;
  readonly version?: string;
  readonly category?: string;
  readonly license?: string;
  readonly compatibility?: string;
  readonly allowedTools?: string;
  readonly source: string;
  /** Skill directory relative to the source root. */
  readonly path: string;
  readonly revision: string;
  readonly fileCount: number;
  readonly totalSize: number;
  /** Validation problems; a skill with errors is listed but cannot be installed. */
  readonly errors: readonly string[];
  readonly warnings: readonly string[];
}

export interface SkillCatalog {
  readonly skills: readonly CatalogSkill[];
  readonly sources: ReadonlyArray<{
    readonly id: string;
    readonly type: SkillSourceConfig["type"];
    readonly revision: string;
    readonly fetchedAt?: string;
    readonly stale: boolean;
  }>;
  /** Skill names offered by more than one source or path. */
  readonly conflicts: ReadonlyArray<{ readonly name: string; readonly locations: readonly string[] }>;
  readonly warnings: readonly string[];
}

const MAX_SKILL_MD = 256 * 1024;
const MAX_DEPTH = 4;

/** Skills found in one snapshot, sorted by name then path. */
export async function discoverSkills(snapshot: SourceSnapshot): Promise<CatalogSkill[]> {
  const skillDirs = snapshot.entries
    .filter((entry) => entry.path === "SKILL.md" || entry.path.endsWith("/SKILL.md"))
    .filter((entry) => entry.kind === "file" || entry.kind === "executable")
    .map((entry) => (entry.path === "SKILL.md" ? "" : entry.path.slice(0, -"/SKILL.md".length)))
    .filter((dir) => dir !== "" && dir.split("/").length <= MAX_DEPTH)
    .filter((dir) => !dir.split("/").some((segment) => segment.startsWith("_") || segment.startsWith(".")))
    .sort();
  const topLevel = skillDirs.filter((dir) => !skillDirs.some((other) => other !== dir && dir.startsWith(`${other}/`)));

  const skills: CatalogSkill[] = [];
  for (const dir of topLevel) {
    const files = filesOf(snapshot.entries, dir);
    const skillMd = files.find((entry) => entry.path === "SKILL.md")!;
    const directoryName = dir.split("/").pop()!;
    let metadata: SkillMetadata | undefined;
    let errors: string[] = [];
    let warnings: string[] = [];
    if (skillMd.size > MAX_SKILL_MD) {
      errors = [`SKILL.md is larger than ${MAX_SKILL_MD} bytes`];
    } else {
      const result = parseSkillMetadata((await snapshot.read(`${dir}/SKILL.md`)).toString("utf8"), directoryName);
      metadata = result.metadata;
      errors = [...result.errors];
      warnings = [...result.warnings];
    }
    skills.push({
      name: metadata?.name ?? directoryName,
      description: metadata?.description ?? "",
      ...(metadata?.metadata["version"] !== undefined ? { version: metadata.metadata["version"] } : {}),
      ...(metadata?.metadata["category"] !== undefined ? { category: metadata.metadata["category"] } : {}),
      ...(metadata?.license !== undefined ? { license: metadata.license } : {}),
      ...(metadata?.compatibility !== undefined ? { compatibility: metadata.compatibility } : {}),
      ...(metadata?.allowedTools !== undefined ? { allowedTools: metadata.allowedTools } : {}),
      source: snapshot.source.id,
      path: dir,
      revision: snapshot.revision,
      fileCount: files.length,
      totalSize: files.reduce((sum, entry) => sum + entry.size, 0),
      errors,
      warnings,
    });
  }
  return skills.sort((a, b) => a.name.localeCompare(b.name) || a.path.localeCompare(b.path));
}

/** Combine per-source discoveries into one catalog with conflict detection. */
export function buildCatalog(
  snapshots: readonly SourceSnapshot[],
  discovered: readonly (readonly CatalogSkill[])[],
  warnings: readonly string[] = [],
): SkillCatalog {
  const skills = discovered.flat().sort(
    (a, b) => a.name.localeCompare(b.name) || a.source.localeCompare(b.source) || a.path.localeCompare(b.path),
  );
  const byName = new Map<string, string[]>();
  for (const skill of skills) {
    const locations = byName.get(skill.name) ?? [];
    locations.push(`${skill.source}:${skill.path}`);
    byName.set(skill.name, locations);
  }
  return {
    skills,
    sources: snapshots.map((snapshot) => ({
      id: snapshot.source.id,
      type: snapshot.source.type,
      revision: snapshot.revision,
      ...(snapshot.fetchedAt !== undefined ? { fetchedAt: snapshot.fetchedAt } : {}),
      stale: snapshot.stale,
    })),
    conflicts: [...byName.entries()]
      .filter(([, locations]) => locations.length > 1)
      .map(([name, locations]) => ({ name, locations })),
    warnings: [...warnings, ...snapshots.flatMap((snapshot) => snapshot.warnings)],
  };
}

/**
 * Find one skill by name. `source` disambiguates; an ambiguous name without it is an
 * error so MAP never picks between two different skills on the user's behalf.
 */
export function findSkill(
  catalog: SkillCatalog,
  name: string,
  source?: string,
): { readonly skill?: CatalogSkill; readonly error?: string } {
  const matches = catalog.skills.filter((skill) => skill.name === name && (source === undefined || skill.source === source));
  if (matches.length === 1) return { skill: matches[0]! };
  if (matches.length === 0) {
    const near = catalog.skills.filter((skill) => skill.name.includes(name) || name.includes(skill.name)).map((s) => s.name);
    return {
      error:
        `unknown skill '${name}'${source !== undefined ? ` in source '${source}'` : ""}` +
        (near.length > 0 ? `; did you mean ${[...new Set(near)].join(", ")}?` : "; run 'map skills list'"),
    };
  }
  return {
    error: `skill '${name}' exists in several places (${matches.map((m) => `${m.source}:${m.path}`).join(", ")}); pass --source <id>`,
  };
}

/** Case-insensitive search over name, description, and category. */
export function searchSkills(catalog: SkillCatalog, query: string): CatalogSkill[] {
  const terms = query.toLowerCase().split(/\s+/).filter((term) => term !== "");
  return catalog.skills.filter((skill) => {
    const haystack = `${skill.name} ${skill.category ?? ""} ${skill.description}`.toLowerCase();
    return terms.every((term) => haystack.includes(term));
  });
}

/** Entries under a skill directory, with paths relative to that directory. */
export function filesOf(entries: readonly SnapshotEntry[], dir: string): SnapshotEntry[] {
  const prefix = `${dir}/`;
  return entries
    .filter((entry) => entry.path.startsWith(prefix))
    .map((entry) => ({ ...entry, path: entry.path.slice(prefix.length) }));
}

/**
 * Content integrity of a skill: SHA-256 over every file's relative path and content
 * digest, in sorted order. File modes are deliberately excluded because MAP removes
 * execute permission unless scripts were approved.
 */
export function skillIntegrity(files: ReadonlyArray<{ readonly path: string; readonly content: Buffer }>): string {
  const hash = createHash("sha256");
  for (const file of [...files].sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0))) {
    hash.update(`${file.path}\0${createHash("sha256").update(file.content).digest("hex")}\n`);
  }
  return `sha256-${hash.digest("hex")}`;
}
