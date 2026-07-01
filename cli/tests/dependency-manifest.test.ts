import { describe, it, expect } from "vitest";
import type { Storage } from "../src/storage/index.ts";
import { DependencyManifestAnalyzer, mergeConcepts } from "../src/analyzer/index.ts";

/** In-memory storage: `files` maps absolute paths to contents. */
function fakeStorage(files: Record<string, string>): Storage {
  return {
    async exists(path) {
      return path in files;
    },
    async ensureDir() {},
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

describe("DependencyManifestAnalyzer", () => {
  it("does not support a project without manifests", async () => {
    const analyzer = new DependencyManifestAnalyzer(fakeStorage({}));
    expect(await analyzer.supports({ root: "/p" })).toBe(false);
  });

  it("detects concepts from package.json with evidence", async () => {
    const storage = fakeStorage({
      "/p/package.json": JSON.stringify({
        dependencies: { openai: "^4", "@pinecone-database/pinecone": "^2" },
      }),
    });
    const analyzer = new DependencyManifestAnalyzer(storage);
    expect(await analyzer.supports({ root: "/p" })).toBe(true);

    const detected = await analyzer.analyze({ root: "/p" });
    const ids = detected.map((d) => d.concept);
    expect(ids).toContain("llm");
    expect(ids).toContain("vector_search");

    const llm = detected.find((d) => d.concept === "llm");
    expect(llm?.evidence).toEqual(["package.json: openai"]);
  });

  it("combines signals across manifests in a polyglot repo", async () => {
    const storage = fakeStorage({
      "/p/package.json": JSON.stringify({ dependencies: { langchain: "^0.2" } }),
      "/p/requirements.txt": "langchain==0.2.1\nguardrails-ai==0.5\n",
    });
    const detected = await new DependencyManifestAnalyzer(storage).analyze({
      root: "/p",
    });

    const rag = detected.find((d) => d.concept === "rag");
    expect(rag?.evidence).toEqual([
      "package.json: langchain",
      "requirements.txt: langchain",
    ]);
    expect(detected.map((d) => d.concept)).toContain("prompt_guards");
  });

  it("matches Go module paths by prefix (versioned modules)", async () => {
    const storage = fakeStorage({
      "/p/go.mod": [
        "module example.com/app",
        "require github.com/milvus-io/milvus-sdk-go/v2 v2.4.0",
      ].join("\n"),
    });
    const detected = await new DependencyManifestAnalyzer(storage).analyze({
      root: "/p",
    });
    expect(detected.map((d) => d.concept)).toContain("vector_search");
  });

  it("ignores unknown dependencies", async () => {
    const storage = fakeStorage({
      "/p/package.json": JSON.stringify({ dependencies: { express: "^4" } }),
    });
    const detected = await new DependencyManifestAnalyzer(storage).analyze({
      root: "/p",
    });
    expect(detected).toEqual([]);
  });
});

describe("mergeConcepts", () => {
  it("keeps the strongest confidence, unions evidence, and sorts by confidence", () => {
    const merged = mergeConcepts([
      { concept: "rag", confidence: 0.6, evidence: ["a"] },
      { concept: "rag", confidence: 0.8, evidence: ["b", "a"] },
      { concept: "llm", confidence: 0.9, evidence: ["c"] },
    ]);
    expect(merged).toEqual([
      { concept: "llm", confidence: 0.9, evidence: ["c"] },
      { concept: "rag", confidence: 0.8, evidence: ["a", "b"] },
    ]);
  });
});
