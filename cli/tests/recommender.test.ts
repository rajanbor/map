import { describe, it, expect } from "vitest";
import type { DetectedArchitecture } from "../src/domain/index.ts";
import type { ConceptId } from "../src/domain/index.ts";
import { RuleBasedRecommender } from "../src/recommendation/index.ts";

function architectureWith(...concepts: ConceptId[]): DetectedArchitecture {
  return {
    root: "/p",
    detectedAt: "2026-07-01T00:00:00.000Z",
    concepts: concepts.map((concept) => ({
      concept,
      confidence: 0.9,
      evidence: ["package.json: x"],
    })),
  };
}

describe("RuleBasedRecommender", () => {
  const recommender = new RuleBasedRecommender();

  it("recommends nothing when nothing was detected", async () => {
    expect(await recommender.recommend(architectureWith())).toEqual([]);
  });

  it("recommends injection defense for RAG without guards", async () => {
    const recommendations = await recommender.recommend(architectureWith("rag"));
    const patterns = recommendations.map((r) => r.pattern);
    expect(patterns).toContain("security/prompt-injection-defense");

    const defense = recommendations.find(
      (r) => r.pattern === "security/prompt-injection-defense",
    );
    expect(defense?.priority).toBe("high");
    expect(defense?.triggeredBy).toEqual(["rag"]);
  });

  it("does not recommend injection defense when guards are present", async () => {
    const recommendations = await recommender.recommend(
      architectureWith("rag", "prompt_guards"),
    );
    expect(recommendations.map((r) => r.pattern)).not.toContain(
      "security/prompt-injection-defense",
    );
  });

  it("recommends tool safety patterns for tool calling", async () => {
    const recommendations = await recommender.recommend(
      architectureWith("tool_calling"),
    );
    const patterns = recommendations.map((r) => r.pattern);
    expect(patterns).toContain("security/least-privilege-tool-access");
    expect(patterns).toContain("agents/tool-budget");
  });

  it("recommends evaluation baselines whenever AI is used without evaluation", async () => {
    const patterns = (await recommender.recommend(architectureWith("llm"))).map(
      (r) => r.pattern,
    );
    expect(patterns).toContain("evaluation/golden-dataset");
    expect(patterns).toContain("evaluation/llm-as-judge");
  });

  it("stays quiet about evaluation when an evaluation signal exists", async () => {
    const patterns = (
      await recommender.recommend(architectureWith("llm", "evaluation"))
    ).map((r) => r.pattern);
    expect(patterns).not.toContain("evaluation/golden-dataset");
  });

  it("de-duplicates a pattern suggested by several rules, keeping the highest priority", async () => {
    const custom = new RuleBasedRecommender([
      {
        id: "a",
        any: ["rag"],
        absent: [],
        recommend: [
          { pattern: "security/x", priority: "medium", rationale: "from a" },
        ],
      },
      {
        id: "b",
        any: ["embeddings"],
        absent: [],
        recommend: [
          { pattern: "security/x", priority: "high", rationale: "from b" },
        ],
      },
    ]);
    const recommendations = await custom.recommend(
      architectureWith("rag", "embeddings"),
    );
    expect(recommendations).toEqual([
      {
        pattern: "security/x",
        priority: "high",
        rationale: "from b",
        triggeredBy: ["rag", "embeddings"],
      },
    ]);
  });

  it("orders recommendations by priority", async () => {
    const recommendations = await recommender.recommend(
      architectureWith("rag", "tool_calling", "embeddings"),
    );
    const priorities = recommendations.map((r) => r.priority);
    const order = { high: 0, medium: 1, low: 2 } as const;
    const sorted = [...priorities].sort((a, b) => order[a] - order[b]);
    expect(priorities).toEqual(sorted);
  });
});
