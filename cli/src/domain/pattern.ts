/**
 * Module 1 — Knowledge Base: the core data model.
 *
 * A `Pattern` is the structured representation of a MAP pattern. It is the single
 * source of truth that can later power documentation, the CLI, the website, an API,
 * and AI agents. It is deliberately storage-agnostic: nothing here knows about
 * Markdown, files, or databases.
 */

/** Stable identifier for a pattern, e.g. "retrieval/reranking". */
export type PatternId = string;

/** The ten MAP categories. Mirrors the `patterns/` directory. */
export type PatternCategory =
  | "retrieval"
  | "memory"
  | "agents"
  | "security"
  | "context"
  | "evaluation"
  | "performance"
  | "routing"
  | "tool-calling"
  | "observability";

/** A coarse, comparable rating used across several pattern fields. */
export type Rating = "low" | "medium" | "high";

/** How battle-tested a pattern is. Mirrors the roadmap's maturity language. */
export type ProductionReadiness = "experimental" | "emerging" | "established";

/** A single trade-off: a dimension and its consequence. */
export interface TradeOff {
  readonly dimension: string;
  readonly impact: string;
}

/** A pointer to a concrete implementation of the pattern. */
export interface ImplementationReference {
  readonly label: string;
  /** Path within the repo or an external URL. */
  readonly location: string;
  readonly language?: string;
}

/**
 * The structured form of a MAP pattern. Every field maps to a section of the
 * written pattern template, so documents and data stay in sync.
 */
export interface Pattern {
  readonly id: PatternId;
  readonly name: string;
  readonly category: PatternCategory;
  readonly description: string;

  readonly problem: string;
  readonly solution: string;
  readonly tradeoffs: readonly TradeOff[];

  /** Patterns that should exist before this one makes sense. */
  readonly prerequisites: readonly PatternId[];
  /** Patterns that solve the same problem a different way. */
  readonly alternatives: readonly PatternId[];
  /** Patterns that combine well with this one. */
  readonly compatiblePatterns: readonly PatternId[];
  /** Patterns that should not be used together with this one. */
  readonly conflictingPatterns: readonly PatternId[];

  readonly implementationReferences: readonly ImplementationReference[];

  readonly complexity: Rating;
  readonly latencyImpact: Rating;
  readonly costImpact: Rating;
  readonly securityConsiderations: readonly string[];
  readonly productionReadiness: ProductionReadiness;
}
