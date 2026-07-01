/**
 * Module 4 — Graph: edge types.
 *
 * Patterns are nodes; relationships are the typed edges between them. The graph
 * (see `graph/`) is intended to become the source of truth from which the flat
 * relationship lists on `Pattern` can be derived.
 */

import type { PatternId } from "./pattern.ts";

export type RelationshipType =
  | "depends_on"
  | "works_with"
  | "alternative_to"
  | "extends"
  | "conflicts_with"
  | "solves";

/** A directed, typed edge from one pattern to another. */
export interface Relationship {
  readonly from: PatternId;
  readonly type: RelationshipType;
  readonly to: PatternId;
  /** Optional human-readable note explaining the edge. */
  readonly note?: string;
}
