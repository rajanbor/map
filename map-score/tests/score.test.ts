import { describe, it, expect } from "vitest";
import {
  DIMENSIONS,
  isRating,
  scoreErrors,
  parseScore,
} from "../src/score.ts";

const valid = {
  pattern: "retrieval/chunking",
  complexity: 2,
  latency: 5,
  cost: 5,
  accuracyImpact: 5,
  productionReadiness: 5,
};

describe("dimensions", () => {
  it("defines exactly five dimensions", () => {
    expect(DIMENSIONS).toHaveLength(5);
    expect(DIMENSIONS.map((d) => d.id)).toEqual([
      "complexity",
      "latency",
      "cost",
      "accuracyImpact",
      "productionReadiness",
    ]);
  });
});

describe("isRating", () => {
  it("accepts integers 1..5 and rejects everything else", () => {
    expect(isRating(1)).toBe(true);
    expect(isRating(5)).toBe(true);
    expect(isRating(0)).toBe(false);
    expect(isRating(6)).toBe(false);
    expect(isRating(2.5)).toBe(false);
    expect(isRating("3")).toBe(false);
    expect(isRating(null)).toBe(false);
  });
});

describe("scoreErrors", () => {
  it("returns no errors for a valid score", () => {
    expect(scoreErrors(valid)).toEqual([]);
  });

  it("flags a non-object", () => {
    expect(scoreErrors(null)).toEqual(["score must be an object"]);
  });

  it("flags out-of-range and missing dimensions", () => {
    const errors = scoreErrors({ ...valid, complexity: 9, cost: undefined });
    expect(errors.some((e) => e.includes("complexity"))).toBe(true);
    expect(errors.some((e) => e.includes("cost"))).toBe(true);
  });

  it("flags a non-string pattern", () => {
    expect(scoreErrors({ ...valid, pattern: 42 })).toContain(
      "pattern must be a string when present",
    );
  });
});

describe("parseScore", () => {
  it("parses a valid score and keeps the pattern id", () => {
    const score = parseScore(valid);
    expect(score.complexity).toBe(2);
    expect(score.productionReadiness).toBe(5);
    expect(score.pattern).toBe("retrieval/chunking");
  });

  it("omits pattern when absent", () => {
    const { pattern, ...noPattern } = valid;
    void pattern;
    expect(parseScore(noPattern).pattern).toBeUndefined();
  });

  it("throws on an invalid score", () => {
    expect(() => parseScore({ ...valid, latency: 0 })).toThrow(/Invalid MAP Score/);
  });
});
