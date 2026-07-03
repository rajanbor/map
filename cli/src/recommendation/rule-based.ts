/**
 * Module 3 — the rule-based recommendation engine.
 *
 * Evaluates `RECOMMENDATION_RULES` against a detected architecture. The engine is
 * intentionally small: all domain knowledge lives in the rule table, and the engine
 * only handles matching, de-duplication, and ordering.
 */

import type {
  ConceptId,
  DetectedArchitecture,
  Recommendation,
  RecommendationPriority,
} from "../domain/index.ts";
import type { Recommender } from "./recommender.ts";
import type { RecommendationRule } from "./rules.ts";
import { RECOMMENDATION_RULES } from "./rules.ts";

const PRIORITY_ORDER: Record<RecommendationPriority, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

export class RuleBasedRecommender implements Recommender {
  private readonly rules: readonly RecommendationRule[];

  constructor(rules: readonly RecommendationRule[] = RECOMMENDATION_RULES) {
    this.rules = rules;
  }

  async recommend(
    architecture: DetectedArchitecture,
  ): Promise<readonly Recommendation[]> {
    const detected = new Set<ConceptId>(
      architecture.concepts.map((concept) => concept.concept),
    );
    if (detected.size === 0) return [];

    // De-duplicate by pattern: several rules may suggest the same pattern; the
    // highest priority wins and the triggering concepts are unioned.
    const byPattern = new Map<
      string,
      { priority: RecommendationPriority; rationale: string; triggeredBy: Set<ConceptId> }
    >();

    for (const rule of this.rules) {
      const matchedAny = rule.any.filter((concept) => detected.has(concept));
      if (rule.any.length > 0 && matchedAny.length === 0) continue;
      if (rule.absent.some((concept) => detected.has(concept))) continue;

      // A rule with no `any` condition is triggered by the whole detected set.
      const triggers = matchedAny.length > 0 ? matchedAny : [...detected];

      for (const item of rule.recommend) {
        const existing = byPattern.get(item.pattern);
        if (existing) {
          if (PRIORITY_ORDER[item.priority] < PRIORITY_ORDER[existing.priority]) {
            existing.priority = item.priority;
            existing.rationale = item.rationale;
          }
          for (const concept of triggers) existing.triggeredBy.add(concept);
        } else {
          byPattern.set(item.pattern, {
            priority: item.priority,
            rationale: item.rationale,
            triggeredBy: new Set(triggers),
          });
        }
      }
    }

    return [...byPattern.entries()]
      .map(([pattern, { priority, rationale, triggeredBy }]) => ({
        pattern,
        priority,
        rationale,
        triggeredBy: [...triggeredBy],
      }))
      .sort(
        (a, b) =>
          PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority] ||
          a.pattern.localeCompare(b.pattern),
      );
  }
}
