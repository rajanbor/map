import { describe, it, expect } from "vitest";
import {
  renderStars,
  renderScoreTable,
  renderScoreBlock,
  renderScoreSummary,
} from "../src/render.ts";
import { parseScore } from "../src/score.ts";

const score = parseScore({
  pattern: "retrieval/chunking",
  complexity: 2,
  latency: 5,
  cost: 5,
  accuracyImpact: 5,
  productionReadiness: 5,
});

describe("renderStars", () => {
  it("renders filled and empty stars", () => {
    expect(renderStars(2)).toBe("★★☆☆☆");
    expect(renderStars(5)).toBe("★★★★★");
    expect(renderStars(1)).toBe("★☆☆☆☆");
  });
});

describe("renderScoreTable", () => {
  it("has a header and a row per dimension with stars and value", () => {
    const table = renderScoreTable(score);
    expect(table).toContain("| Dimension | Score | |");
    expect(table).toContain("| Complexity | ★★☆☆☆ | 2/5 |");
    expect(table).toContain("| Production Readiness | ★★★★★ | 5/5 |");
  });
});

describe("renderScoreBlock", () => {
  it("stacks each label over its stars", () => {
    const block = renderScoreBlock(score);
    expect(block).toContain("Complexity\n★★☆☆☆");
    expect(block).toContain("Latency\n★★★★★");
  });
});

describe("renderScoreSummary", () => {
  it("renders a single line with all dimensions", () => {
    const summary = renderScoreSummary(score);
    expect(summary).toContain("Complexity ★★☆☆☆");
    expect(summary.split(" · ")).toHaveLength(5);
  });
});
