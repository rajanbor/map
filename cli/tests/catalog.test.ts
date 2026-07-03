import { describe, it, expect } from "vitest";
import { join } from "node:path";
import type { Storage } from "../src/storage/index.ts";
import {
  RepoPatternCatalog,
  parseRoadmap,
  parsePatternYamlHeader,
  slugify,
} from "../src/knowledge/index.ts";
import { RECOMMENDATION_RULES } from "../src/recommendation/index.ts";
import { FileSystemStorage } from "../src/storage/index.ts";

/** In-memory storage: `files` maps absolute paths to contents. */
function fakeStorage(files: Record<string, string>): Storage {
  return {
    async exists(path) {
      return path in files || Object.keys(files).some((f) => f.startsWith(`${path}/`));
    },
    async ensureDir() {},
    async listDirs(path) {
      const names = new Set<string>();
      for (const file of Object.keys(files)) {
        if (!file.startsWith(`${path}/`)) continue;
        const rest = file.slice(path.length + 1);
        if (rest.includes("/")) names.add(rest.split("/")[0]!);
      }
      return [...names];
    },
    async readFile(path) {
      const contents = files[path];
      if (contents === undefined) throw new Error(`ENOENT: ${path}`);
      return contents;
    },
    async writeFile(path, contents) {
      files[path] = contents;
      return true;
    },
  };
}

const ROADMAP = `# MAP Roadmap

**Legend:** ⬜ Planned · 🟡 In progress · ✅ Published

## Retrieval

- ✅ [Chunking](patterns/retrieval/chunking/)
- 🟡 Reranking (cross-encoder)
- ⬜ Semantic Cache

## Observability

- ⬜ Tracing / Spans

## Cross-category decision guides (Phase 3)

- ⬜ RAG vs Fine-Tuning vs Long-Context
`;

describe("parseRoadmap", () => {
  it("parses categories, statuses, and links", () => {
    const entries = parseRoadmap(ROADMAP);
    expect(entries).toEqual([
      { id: "retrieval/chunking", name: "Chunking", category: "retrieval", status: "published" },
      {
        id: "retrieval/reranking",
        name: "Reranking (cross-encoder)",
        category: "retrieval",
        status: "in-progress",
      },
      { id: "retrieval/semantic-cache", name: "Semantic Cache", category: "retrieval", status: "planned" },
      { id: "observability/tracing", name: "Tracing / Spans", category: "observability", status: "planned" },
    ]);
  });

  it("ignores non-category sections", () => {
    const ids = parseRoadmap(ROADMAP).map((e) => e.id);
    expect(ids.some((id) => id.includes("fine-tuning"))).toBe(false);
  });
});

describe("slugify", () => {
  it("hyphenates and drops parenthesized qualifiers", () => {
    expect(slugify("Parent-Child (Small-to-Big) Retrieval")).toBe("parent-child-retrieval");
    expect(slugify("HyDE (Hypothetical Document Embeddings)")).toBe("hyde");
    expect(slugify("LLM-as-Judge")).toBe("llm-as-judge");
    expect(slugify("Memory Consolidation & Forgetting")).toBe("memory-consolidation-forgetting");
  });

  it("applies the canonical-id overrides used by the rule table", () => {
    expect(slugify("Faithfulness / Groundedness Evaluation")).toBe("faithfulness-groundedness");
    expect(slugify("Tracing / Spans")).toBe("tracing");
  });
});

describe("parsePatternYamlHeader", () => {
  it("reads scalars and folded blocks", () => {
    const header = parsePatternYamlHeader(
      [
        "# comment",
        "id: retrieval/chunking",
        "name: Chunking",
        "category: retrieval",
        "maturity: established",
        "summary: >",
        "  Split documents into smaller units",
        "  so retrieval finds the right passage.",
        "score:",
        "  complexity: 2",
      ].join("\n"),
    );
    expect(header).toEqual({
      id: "retrieval/chunking",
      name: "Chunking",
      category: "retrieval",
      maturity: "established",
      summary: "Split documents into smaller units so retrieval finds the right passage.",
    });
  });

  it("does not mistake nested keys for top-level scalars", () => {
    const header = parsePatternYamlHeader("score:\n  complexity: 2\n");
    expect(header).toEqual({});
  });
});

describe("RepoPatternCatalog", () => {
  const root = "/repo";

  it("merges roadmap entries with written pattern.yaml data", async () => {
    const storage = fakeStorage({
      [`${root}/ROADMAP.md`]: ROADMAP,
      [`${root}/patterns/retrieval/chunking/pattern.yaml`]: [
        "id: retrieval/chunking",
        "name: Chunking",
        "category: retrieval",
        "maturity: established",
        "summary: Split documents into smaller units.",
      ].join("\n"),
    });
    const catalog = new RepoPatternCatalog(storage, root);

    const chunking = await catalog.get("retrieval/chunking");
    expect(chunking).toEqual({
      id: "retrieval/chunking",
      name: "Chunking",
      category: "retrieval",
      status: "published",
      maturity: "established",
      summary: "Split documents into smaller units.",
    });
    expect((await catalog.entries()).length).toBe(4);
  });

  it("filters by category, status, and text", async () => {
    const storage = fakeStorage({ [`${root}/ROADMAP.md`]: ROADMAP });
    const catalog = new RepoPatternCatalog(storage, root);

    expect((await catalog.find({ category: "retrieval" })).length).toBe(3);
    expect((await catalog.find({ status: "planned" })).length).toBe(2);
    const cache = await catalog.find({ text: "cache" });
    expect(cache.map((e) => e.id)).toEqual(["retrieval/semantic-cache"]);
  });

  it("is empty when the repo has no roadmap or patterns", async () => {
    const catalog = new RepoPatternCatalog(fakeStorage({}), root);
    expect(await catalog.entries()).toEqual([]);
  });
});

describe("catalog integrity (real repository)", () => {
  it("every pattern id in the rule table resolves in the real catalog", async () => {
    const repoRoot = join(import.meta.dirname, "..", "..");
    const catalog = new RepoPatternCatalog(new FileSystemStorage(), repoRoot);
    const known = new Set((await catalog.entries()).map((e) => e.id));
    expect(known.size).toBeGreaterThan(50);

    for (const rule of RECOMMENDATION_RULES) {
      for (const recommendation of rule.recommend) {
        expect(known, `rule '${rule.id}' references '${recommendation.pattern}'`).toContain(
          recommendation.pattern,
        );
      }
    }
  });
});
