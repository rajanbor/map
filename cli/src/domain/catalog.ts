/**
 * The pattern catalog: every pattern MAP knows about, written or not.
 *
 * A `CatalogEntry` is deliberately lighter than `Pattern`. The full `Pattern` type
 * models a completely written pattern document; the catalog also tracks patterns
 * that only exist as roadmap items, so most fields are unknown for them. Commands
 * that list, search, or cross-reference patterns (patterns, recommend, doctor)
 * work against the catalog; `Pattern` stays reserved for loaded documents.
 */

import type { PatternId, PatternCategory } from "./pattern.ts";

/** Mirrors the roadmap legend: ⬜ Planned · 🟡 In progress · ✅ Published. */
export type CatalogStatus = "published" | "in-progress" | "planned";

/** The five MAP Score dimensions, 1..5 stars each (see map-score/SPEC.md). */
export interface MapScore {
  readonly complexity: number;
  readonly latency: number;
  readonly cost: number;
  readonly accuracyImpact: number;
  readonly productionReadiness: number;
}

export interface CatalogEntry {
  readonly id: PatternId;
  readonly name: string;
  readonly category: PatternCategory;
  readonly status: CatalogStatus;
  /** One-line summary; present when the pattern is written (from pattern.yaml). */
  readonly summary?: string;
  /** Maturity from pattern.yaml (e.g. "established"); present when written. */
  readonly maturity?: string;
  /** MAP Score from pattern.yaml; present when written and complete. */
  readonly score?: MapScore;
  /** Related pattern ids from pattern.yaml; present when written. */
  readonly related?: readonly PatternId[];
}
