/**
 * Module 3 — the recommendation rule table.
 *
 * Each rule reads the detected architecture and, when its conditions hold, recommends
 * MAP patterns (by their `category/slug` roadmap ids). Rules are data, not code, so
 * growing the recommender is a one-line change here.
 *
 * Conditions: `any` fires when at least one listed concept was detected; `absent`
 * requires that none of the listed concepts were detected. A rule with only `absent`
 * applies to every AI project (the engine never runs rules when nothing was
 * detected at all).
 */

import type { ConceptId, PatternId, RecommendationPriority } from "../domain/index.ts";

export interface RuleRecommendation {
  readonly pattern: PatternId;
  readonly priority: RecommendationPriority;
  readonly rationale: string;
}

export interface RecommendationRule {
  readonly id: string;
  /** Fires when at least one of these concepts was detected. Empty = no requirement. */
  readonly any: readonly ConceptId[];
  /** Fires only when none of these concepts were detected. */
  readonly absent: readonly ConceptId[];
  readonly recommend: readonly RuleRecommendation[];
}

export const RECOMMENDATION_RULES: readonly RecommendationRule[] = [
  {
    id: "retrieval-without-guards",
    any: ["rag", "vector_search"],
    absent: ["prompt_guards"],
    recommend: [
      {
        pattern: "security/prompt-injection-defense",
        priority: "high",
        rationale:
          "Retrieved documents flow into prompts; without guards, instructions hidden in the corpus can steer the model.",
      },
    ],
  },
  {
    id: "rag-groundedness",
    any: ["rag"],
    absent: ["evaluation"],
    recommend: [
      {
        pattern: "evaluation/faithfulness-groundedness",
        priority: "medium",
        rationale:
          "RAG answers should be checked against the retrieved sources to catch hallucination early.",
      },
    ],
  },
  {
    id: "embeddings-semantic-cache",
    any: ["embeddings", "vector_search"],
    absent: [],
    recommend: [
      {
        pattern: "retrieval/semantic-cache",
        priority: "medium",
        rationale:
          "Similar queries repeat; caching by embedding similarity cuts latency and model cost.",
      },
    ],
  },
  {
    id: "tool-calling-safety",
    any: ["tool_calling"],
    absent: [],
    recommend: [
      {
        pattern: "security/least-privilege-tool-access",
        priority: "high",
        rationale:
          "The model can invoke tools; each tool should expose only the narrowest capability it needs.",
      },
      {
        pattern: "agents/tool-budget",
        priority: "medium",
        rationale:
          "Unbounded tool loops burn cost and can run away; a budget caps calls per task.",
      },
    ],
  },
  {
    id: "no-evaluation",
    any: [],
    absent: ["evaluation"],
    recommend: [
      {
        pattern: "evaluation/golden-dataset",
        priority: "medium",
        rationale:
          "No evaluation signal found; a fixed test set is the baseline for measuring quality and regressions.",
      },
      {
        pattern: "evaluation/llm-as-judge",
        priority: "medium",
        rationale:
          "No evaluation signal found; an LLM judge scales quality checks beyond what humans can review.",
      },
    ],
  },
  {
    id: "no-observability",
    any: [],
    absent: ["observability"],
    recommend: [
      {
        pattern: "observability/tracing",
        priority: "low",
        rationale:
          "No tracing signal found; without traces of AI calls, cost and failure analysis is guesswork.",
      },
    ],
  },
];
