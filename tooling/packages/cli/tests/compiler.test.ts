import { describe, it, expect } from "vitest";
import type { Storage } from "../src/storage/index.ts";
import {
  parseYaml,
  parseFrontmatter,
  globToRegExp,
  loadContext,
  compile,
  documentsForTarget,
  resolveCompilerConfig,
  defaultAdapterRegistry,
} from "../src/compiler/index.ts";
import type { MapConfig } from "../src/config/index.ts";

/**
 * In-memory storage. `files` maps absolute paths to contents; `listFiles` returns
 * paths relative to the queried directory, matching FileSystemStorage.
 */
function fakeStorage(files: Record<string, string>): Storage {
  return {
    async exists(path) {
      return path in files || Object.keys(files).some((f) => f.startsWith(`${path}/`));
    },
    async ensureDir() {},
    async listDirs() {
      return [];
    },
    async listFiles(path) {
      return Object.keys(files)
        .filter((f) => f.startsWith(`${path}/`))
        .map((f) => f.slice(path.length + 1))
        .sort();
    },
    async readFile(path) {
      const c = files[path];
      if (c === undefined) throw new Error(`ENOENT: ${path}`);
      return c;
    },
    async writeFile(path, contents) {
      files[path] = contents;
      return true;
    },
    async removeFile(path) {
      delete files[path];
    },
  };
}

function config(overrides: Partial<MapConfig> = {}): MapConfig {
  return {
    version: 3,
    project: { name: "Demo", createdAt: "2026-01-01T00:00:00.000Z", languages: [] },
    analysis: { analyzers: [], include: [], exclude: [] },
    registry: { source: "default" },
    ...overrides,
  };
}

describe("parseYaml", () => {
  it("parses nested maps, sequences, and scalars", () => {
    expect(parseYaml("targets:\n  - claude\n  - cursor\npriority: high")).toEqual({
      targets: ["claude", "cursor"],
      priority: "high",
    });
  });

  it("parses folded and literal block strings without consuming following fields", () => {
    expect(
      parseYaml("summary: >\n  first line\n  second line\nscore:\n  cost: 2\nnote: |-\n  alpha\n  beta"),
    ).toEqual({
      summary: "first line second line\n",
      score: { cost: 2 },
      note: "alpha\nbeta",
    });
  });
});

describe("parseFrontmatter", () => {
  it("extracts targets and priority and strips the block", () => {
    const parsed = parseFrontmatter("---\ntargets:\n  - claude\npriority: high\n---\n\n# Body");
    expect(parsed.frontmatter.targets).toEqual(["claude"]);
    expect(parsed.frontmatter.priority).toBe("high");
    expect(parsed.body).toBe("# Body");
  });

  it("parses the canonical document envelope", () => {
    const parsed = parseFrontmatter(`---
kind: decision
id: adr-0001-example
title: Example decision
date: 2026-09-13
status: accepted
scope: [src/**, tests/**]
targets: [agents, cursor]
---
# Decision`);

    expect(parsed.frontmatter).toMatchObject({
      kind: "decision",
      id: "adr-0001-example",
      title: "Example decision",
      date: "2026-09-13",
      status: "accepted",
      scope: ["src/**", "tests/**"],
      targets: ["agents", "cursor"],
    });
  });

  it("defaults to all targets and normal priority when absent", () => {
    const parsed = parseFrontmatter("# Just a body");
    expect(parsed.frontmatter.targets).toBeNull();
    expect(parsed.frontmatter.priority).toBe("normal");
  });
});

describe("globToRegExp", () => {
  it("matches double-star globs across directories", () => {
    const re = globToRegExp("patterns/**/*.md");
    expect(re.test("patterns/backend.md")).toBe(true);
    expect(re.test("patterns/api/rest.md")).toBe(true);
    expect(re.test("other.md")).toBe(false);
  });

  it("matches a flat glob but not nested paths", () => {
    const re = globToRegExp("*.md");
    expect(re.test("project.md")).toBe(true);
    expect(re.test("patterns/x.md")).toBe(false);
  });

  it("matches every markdown file with the default source", () => {
    const re = globToRegExp("**/*.md");
    expect(re.test("architecture/README.md")).toBe(true);
    expect(re.test("top.md")).toBe(true);
  });
});

describe("resolveCompilerConfig", () => {
  it("falls back to defaults when sources/targets are absent", () => {
    const resolved = resolveCompilerConfig(config());
    expect(resolved.sources).toContain("**/*.md");
    expect(resolved.targets.map((t) => t.id)).toContain("claude");
    expect(resolved.targets.every((t) => t.adapter.length > 0)).toBe(true);
  });

  it("defaults a target's adapter to its id", () => {
    const resolved = resolveCompilerConfig(config({ targets: { claude: { output: "C.md" } } }));
    expect(resolved.targets[0]).toEqual({ id: "claude", adapter: "claude", output: "C.md" });
  });
});

describe("loadContext + compile", () => {
  const root = "/proj/.map";
  const cfg = config({
    sources: ["project.md", "patterns/**/*.md"],
    targets: { claude: { output: "CLAUDE.md" }, gemini: { output: "GEMINI.md" } },
  });

  function storage(): Storage {
    return fakeStorage({
      [`${root}/project.md`]: "# Demo\n\nOverview.",
      [`${root}/patterns/backend.md`]: "---\ntargets:\n  - claude\n---\n\n# Backend\n\nClaude only.",
      [`${root}/patterns/style.md`]: "---\npriority: high\n---\n\n# Style\n\nHigh priority.",
      [`${root}/cache/ignore.txt`]: "not markdown",
    });
  }

  async function ctx() {
    const resolved = resolveCompilerConfig(cfg);
    return loadContext(storage(), root, { projectName: cfg.project.name, sources: resolved.sources });
  }

  it("loads only markdown, deduped, in source order", async () => {
    const context = await ctx();
    expect(context.documents.map((d) => d.path)).toEqual([
      "project.md",
      "patterns/backend.md",
      "patterns/style.md",
    ]);
  });

  it("orders by priority then position for a target", async () => {
    const forClaude = documentsForTarget(await ctx(), "claude");
    expect(forClaude[0]!.path).toBe("patterns/style.md");
  });

  it("filters documents per target and adds the banner", async () => {
    const result = compile(await ctx(), resolveCompilerConfig(cfg), defaultAdapterRegistry());
    const claude = result.outputs.find((o) => o.target === "claude")!;
    const gemini = result.outputs.find((o) => o.target === "gemini")!;
    expect(claude.content).toContain("Backend");
    expect(gemini.content).not.toContain("Backend");
    expect(claude.content).toContain("Generated by MAP");
  });

  it("reports unknown targets instead of throwing", () => {
    const resolved = resolveCompilerConfig(config({ targets: { bogus: { output: "X.md" } } }));
    const result = compile({ project: { name: "x" }, documents: [] }, resolved, defaultAdapterRegistry());
    expect(result.unknownTargets).toEqual(["bogus"]);
    expect(result.outputs).toHaveLength(0);
  });

  it("keeps Cursor MDC frontmatter first, banner after it", () => {
    const resolved = resolveCompilerConfig(config({ targets: { cursor: { output: "r.mdc" } } }));
    const result = compile(
      { project: { name: "Demo" }, documents: [{ path: "a.md", title: "A", body: "# A", targets: null, priority: "normal" }] },
      resolved,
      defaultAdapterRegistry(),
    );
    const content = result.outputs[0]!.content;
    expect(content.startsWith("---\n")).toBe(true);
    expect(content.indexOf("Generated by MAP")).toBeGreaterThan(content.indexOf("alwaysApply"));
  });
});
