/**
 * Deterministic skill recommendations from Project Profiler evidence and selected
 * development profiles — the skill counterpart of the pattern rule table in
 * recommendation/rules.ts.
 *
 * Rules name skills; a recommendation is only *available* when a configured source
 * actually provides that skill. Rules for needs no configured skill covers produce
 * `gaps` with no installable id, so MAP never invents a skill identifier.
 */

import type { Evidence, ProjectProfile } from "../project/index.ts";
import type { Profile } from "../profiles/index.ts";
import type { CatalogSkill, SkillCatalog } from "./catalog.ts";
import type { SkillsLock } from "./lockfile.ts";
import { purposeOf } from "./metadata.ts";

export interface SkillRule {
  readonly id: string;
  /** Fires when any of these signals is in the profile. */
  readonly any: readonly string[];
  /** Installable skill name, or undefined for a gap without a known skill. */
  readonly skill?: string;
  readonly reason: string;
  /** Need described when no configured skill covers it. */
  readonly need?: string;
}

export const SKILL_RULES: readonly SkillRule[] = [
  { id: "rust", any: ["rust"], skill: "rust-project", reason: "Rust code detected; the skill standardizes crate layout, error handling, clippy, and tests." },
  { id: "python", any: ["python"], skill: "python-project", reason: "Python code detected; the skill standardizes uv, src layout, ruff, mypy, and pytest." },
  { id: "wordpress-security", any: ["wordpress"], skill: "wordpress-security-audit", reason: "WordPress detected; the skill guides an evidence-based security audit (only for sites you are authorized to test)." },
  { id: "wordpress-theme", any: ["wordpress"], skill: "wordpress-tailwind-theme", reason: "WordPress detected; the skill builds classic themes from a Tailwind starter." },
  { id: "web-ui", any: ["nextjs", "react", "vue", "angular", "tailwindcss"], skill: "design-guardrails", reason: "Web UI framework detected; the skill keeps UI work consistent with the project's DESIGN.md." },
  { id: "api-security", any: ["express", "nestjs", "fastapi", "django"], reason: "HTTP API framework detected.", need: "an API security review skill (authentication, authorization, input validation)" },
  { id: "containers", any: ["docker", "docker-compose"], reason: "Container configuration detected.", need: "a deployment and container hardening skill" },
  { id: "ci-review", any: ["github-actions"], reason: "GitHub Actions workflows detected.", need: "a code review / pull request skill" },
];

export interface SkillRecommendation {
  readonly name: string;
  readonly purpose: string;
  readonly reasons: readonly string[];
  readonly evidence: ReadonlyArray<Pick<Evidence, "signal" | "file" | "certainty">>;
  /** Profiles that asked for this skill. */
  readonly profiles: readonly string[];
  readonly source: string;
  readonly path: string;
  readonly version?: string;
  readonly compatibility?: string;
  readonly installed: boolean;
}

export interface SkillGap {
  readonly need: string;
  readonly reason: string;
  readonly evidence: ReadonlyArray<Pick<Evidence, "signal" | "file" | "certainty">>;
}

export interface SkillRecommendations {
  readonly recommendations: readonly SkillRecommendation[];
  /** Rule or profile skills not offered by any configured source. */
  readonly unavailable: ReadonlyArray<{ readonly name: string; readonly reason: string }>;
  readonly gaps: readonly SkillGap[];
}

export function recommendSkills(
  profile: ProjectProfile,
  catalog: SkillCatalog | undefined,
  options: { readonly profiles?: readonly Profile[]; readonly lock?: SkillsLock; readonly rules?: readonly SkillRule[] } = {},
): SkillRecommendations {
  const rules = options.rules ?? SKILL_RULES;
  const wanted = new Map<string, { reasons: string[]; evidence: Evidence[]; profiles: string[] }>();
  const gaps: SkillGap[] = [];
  const want = (name: string): { reasons: string[]; evidence: Evidence[]; profiles: string[] } => {
    const entry = wanted.get(name) ?? { reasons: [], evidence: [], profiles: [] };
    wanted.set(name, entry);
    return entry;
  };

  for (const rule of rules) {
    const evidence = profile.evidence.filter((e) => rule.any.includes(e.signal));
    if (evidence.length === 0) continue;
    if (rule.skill !== undefined) {
      const entry = want(rule.skill);
      entry.reasons.push(rule.reason);
      entry.evidence.push(...evidence);
    } else if (rule.need !== undefined) {
      gaps.push({ need: rule.need, reason: rule.reason, evidence: evidence.slice(0, 3).map(pickEvidence) });
    }
  }
  for (const selected of options.profiles ?? []) {
    for (const name of selected.skills) {
      const entry = want(name);
      entry.profiles.push(selected.id);
      entry.reasons.push(`Part of the '${selected.id}' profile.`);
    }
  }

  const recommendations: SkillRecommendation[] = [];
  const unavailable: Array<{ name: string; reason: string }> = [];
  for (const [name, entry] of [...wanted.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const skill = catalog === undefined ? undefined : pickSkill(catalog.skills.filter((s) => s.name === name && s.errors.length === 0));
    if (skill === undefined) {
      unavailable.push({
        name,
        reason: catalog === undefined ? "skill sources were not loaded" : "no configured skill source provides this skill",
      });
      continue;
    }
    recommendations.push({
      name,
      purpose: purposeOf(skill.description),
      reasons: [...new Set(entry.reasons)],
      evidence: dedupe(entry.evidence).slice(0, 5).map(pickEvidence),
      profiles: [...new Set(entry.profiles)].sort(),
      source: skill.source,
      path: skill.path,
      ...(skill.version !== undefined ? { version: skill.version } : {}),
      ...(skill.compatibility !== undefined ? { compatibility: skill.compatibility } : {}),
      installed: options.lock?.skills[name] !== undefined,
    });
  }
  return { recommendations, unavailable, gaps };
}

/** With duplicates across sources, prefer the first source in configuration order. */
function pickSkill(candidates: readonly CatalogSkill[]): CatalogSkill | undefined {
  return candidates[0];
}

function pickEvidence(e: Evidence): Pick<Evidence, "signal" | "file" | "certainty"> {
  return { signal: e.signal, file: e.file, certainty: e.certainty };
}

function dedupe(evidence: readonly Evidence[]): Evidence[] {
  const seen = new Set<string>();
  return evidence.filter((e) => {
    const key = `${e.signal}\0${e.file}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
