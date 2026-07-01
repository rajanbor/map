import { describe, it, expect } from "vitest";
import { InMemoryPatternGraph } from "../src/graph/pattern-graph.ts";

describe("InMemoryPatternGraph", () => {
  it("adds edges, tracks nodes, and filters neighbors by type", () => {
    const g = new InMemoryPatternGraph();
    g.addEdge({ from: "retrieval/rag", type: "works_with", to: "retrieval/reranking" });
    g.addEdge({ from: "retrieval/rag", type: "depends_on", to: "retrieval/chunking" });

    expect(g.hasNode("retrieval/rag")).toBe(true);
    expect(g.hasNode("retrieval/reranking")).toBe(true);
    expect(g.nodes()).toContain("retrieval/chunking");
    expect(g.edges()).toHaveLength(2);

    const worksWith = g.neighbors("retrieval/rag", "works_with");
    expect(worksWith).toHaveLength(1);
    expect(worksWith[0]?.to).toBe("retrieval/reranking");

    expect(g.neighbors("retrieval/rag")).toHaveLength(2);
    expect(g.neighbors("retrieval/reranking")).toHaveLength(0);
  });

  it("registers a lone node without edges", () => {
    const g = new InMemoryPatternGraph();
    g.addNode("memory/summary");
    expect(g.hasNode("memory/summary")).toBe(true);
    expect(g.edges()).toHaveLength(0);
  });
});
