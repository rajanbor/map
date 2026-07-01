/**
 * The output of the recommendation engine (Module 3): patterns that are missing
 * from a detected architecture, with a rationale.
 */

import type { PatternId } from "./pattern.ts";
import type { ConceptId } from "./concept.ts";

export type RecommendationPriority = "low" | "medium" | "high";

export interface Recommendation {
  readonly pattern: PatternId;
  readonly priority: RecommendationPriority;
  /** Why this pattern is recommended. */
  readonly rationale: string;
  /** The detected concepts that triggered this recommendation. */
  readonly triggeredBy: readonly ConceptId[];
}
