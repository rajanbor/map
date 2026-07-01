/**
 * Module 3 — Recommendation Engine (interface + stub).
 *
 * A `Recommender` maps a detected architecture to the patterns that are missing.
 * It is independent from the analyzer: it takes `DetectedArchitecture` in and emits
 * `Recommendation`s out, so the two modules can evolve separately.
 *
 * TODO(module-3): implement a rule set backed by the pattern graph, e.g.
 *   detected RAG -> recommend Citation Grounding, Prompt Injection Guard, Semantic Cache.
 */

import type {
  DetectedArchitecture,
  Recommendation,
} from "../domain/index.ts";

export interface Recommender {
  recommend(
    architecture: DetectedArchitecture,
  ): Promise<readonly Recommendation[]>;
}

/**
 * Placeholder recommender. Returns nothing until the rule engine lands; it exists so
 * the CLI can wire the module end to end today.
 */
export class NullRecommender implements Recommender {
  async recommend(): Promise<readonly Recommendation[]> {
    // TODO(module-3): replace with a rule-based recommender.
    return [];
  }
}
