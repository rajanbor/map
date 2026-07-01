import { describe, it, expect, vi } from "vitest";
import { InMemoryKnowledgeBase } from "../src/knowledge/in-memory-knowledge-base.ts";
import { NullRecommender } from "../src/recommendation/recommender.ts";
import { ConsoleReporter } from "../src/reporting/reporter.ts";
import { createDefaultServices } from "../src/services.ts";
import { renderManifest, defaultManifest } from "../src/config/config.ts";
import type { Pattern } from "../src/domain/index.ts";

function makePattern(overrides: Partial<Pattern>): Pattern {
  return {
    id: "retrieval/chunking",
    name: "Chunking",
    category: "retrieval",
    description: "Split documents for retrieval.",
    problem: "",
    solution: "",
    tradeoffs: [],
    prerequisites: [],
    alternatives: [],
    compatiblePatterns: [],
    conflictingPatterns: [],
    implementationReferences: [],
    complexity: "low",
    latencyImpact: "low",
    costImpact: "low",
    securityConsiderations: [],
    productionReadiness: "established",
    ...overrides,
  };
}

describe("InMemoryKnowledgeBase", () => {
  const chunking = makePattern({ id: "retrieval/chunking", name: "Chunking", category: "retrieval" });
  const summary = makePattern({
    id: "memory/summary",
    name: "Summary Memory",
    category: "memory",
    description: "Summarize past turns.",
  });
  const kb = new InMemoryKnowledgeBase([chunking, summary]);

  it("returns all patterns and looks up by id", async () => {
    await kb.load();
    expect(await kb.all()).toHaveLength(2);
    expect((await kb.get("memory/summary"))?.name).toBe("Summary Memory");
    expect(await kb.get("missing")).toBeUndefined();
  });

  it("filters by category and text", async () => {
    expect(await kb.find({ category: "retrieval" })).toHaveLength(1);
    expect(await kb.find({ text: "summarize" })).toHaveLength(1);
    expect(await kb.find({ category: "memory", text: "chunking" })).toHaveLength(0);
  });
});

describe("NullRecommender", () => {
  it("recommends nothing yet", async () => {
    expect(await new NullRecommender().recommend()).toEqual([]);
  });
});

describe("createDefaultServices", () => {
  it("wires defaults and honors overrides", () => {
    const services = createDefaultServices();
    expect(services.storage).toBeDefined();
    expect(services.graph).toBeDefined();

    const kb = new InMemoryKnowledgeBase([]);
    expect(createDefaultServices({ knowledgeBase: kb }).knowledgeBase).toBe(kb);
  });
});

describe("renderManifest", () => {
  it("renders a header and the project name", () => {
    const out = renderManifest(defaultManifest("my-project"));
    expect(out.startsWith("# MAP project manifest")).toBe(true);
    expect(out).toContain("name: my-project");
  });
});

describe("ConsoleReporter", () => {
  it("writes to stdout/stderr without throwing", () => {
    const out = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    const err = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    const reporter = new ConsoleReporter();
    reporter.info("i");
    reporter.success("s");
    reporter.warn("w");
    reporter.error("e");
    expect(out).toHaveBeenCalled();
    expect(err).toHaveBeenCalled();
    out.mockRestore();
    err.mockRestore();
  });
});
