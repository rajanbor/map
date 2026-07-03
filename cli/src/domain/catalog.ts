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

export interface CatalogEntry {
  readonly id: PatternId;
  readonly name: string;
  readonly category: PatternCategory;
  readonly status: CatalogStatus;
  /** One-line summary; present when the pattern is written (from pattern.yaml). */
  readonly summary?: string;
  /** Maturity from pattern.yaml (e.g. "established"); present when written. */
  readonly maturity?: string;
}
