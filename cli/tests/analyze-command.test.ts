import { describe, it, expect } from "vitest";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runCli } from "../src/cli/runner.ts";
import type { Reporter } from "../src/reporting/index.ts";

/** Reporter that captures all output lines for assertions. */
function capture(): Reporter & { lines: string[] } {
  const lines: string[] = [];
  return {
    lines,
    info: (m) => void lines.push(m),
    success: (m) => void lines.push(m),
    warn: (m) => void lines.push(m),
    error: (m) => void lines.push(m),
  };
}

async function tempProject(): Promise<string> {
  return mkdtemp(join(tmpdir(), "map-analyze-"));
}

describe("map analyze", () => {
  it("reports detected concepts with evidence", async () => {
    const dir = await tempProject();
    try {
      await writeFile(
        join(dir, "package.json"),
        JSON.stringify({ dependencies: { openai: "^4", langchain: "^0.2" } }),
      );

      const reporter = capture();
      const code = await runCli(["analyze"], { cwd: dir, reporter });

      expect(code).toBe(0);
      const output = reporter.lines.join("\n");
      expect(output).toContain("LLM Usage");
      expect(output).toContain("RAG");
      expect(output).toContain("package.json: openai");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("saves a report into an existing .map workspace", async () => {
    const dir = await tempProject();
    try {
      await writeFile(
        join(dir, "package.json"),
        JSON.stringify({ dependencies: { chromadb: "^1" } }),
      );
      await runCli(["init"], { cwd: dir, reporter: capture() });
      await runCli(["analyze"], { cwd: dir, reporter: capture() });

      const report = JSON.parse(
        await readFile(join(dir, ".map/reports/analysis.json"), "utf8"),
      );
      expect(report.root).toBe(dir);
      expect(report.concepts).toEqual([
        {
          concept: "vector_search",
          confidence: 0.9,
          evidence: ["package.json: chromadb"],
        },
      ]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("handles a directory with no manifests", async () => {
    const dir = await tempProject();
    try {
      const reporter = capture();
      const code = await runCli(["analyze"], { cwd: dir, reporter });
      expect(code).toBe(0);
      expect(reporter.lines.join("\n")).toContain("No applicable analyzers");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("analyzes an explicit path argument and reports clean projects", async () => {
    const dir = await tempProject();
    try {
      await writeFile(
        join(dir, "package.json"),
        JSON.stringify({ dependencies: { express: "^4" } }),
      );
      const reporter = capture();
      const code = await runCli(["analyze", dir], { reporter });
      expect(code).toBe(0);
      expect(reporter.lines.join("\n")).toContain(
        "No AI architecture concepts detected",
      );
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});

describe("map recommend", () => {
  it("recommends missing patterns for the detected stack", async () => {
    const dir = await tempProject();
    try {
      await writeFile(
        join(dir, "requirements.txt"),
        "langchain==0.2.1\nchromadb==0.5.0\n",
      );

      const reporter = capture();
      const code = await runCli(["recommend"], { cwd: dir, reporter });

      expect(code).toBe(0);
      const output = reporter.lines.join("\n");
      expect(output).toContain("security/prompt-injection-defense");
      expect(output).toContain("retrieval/semantic-cache");
      expect(output).toContain("evaluation/golden-dataset");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("reports no gaps when guards, evaluation, and observability are covered", async () => {
    const dir = await tempProject();
    try {
      await writeFile(
        join(dir, "requirements.txt"),
        "guardrails-ai==0.5\nragas==0.1\nlangfuse==2.0\n",
      );
      const reporter = capture();
      const code = await runCli(["recommend"], { cwd: dir, reporter });
      expect(code).toBe(0);
      expect(reporter.lines.join("\n")).toContain("No gaps found");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("stays quiet when no AI usage is detected", async () => {
    const dir = await tempProject();
    try {
      await writeFile(
        join(dir, "package.json"),
        JSON.stringify({ dependencies: { express: "^4" } }),
      );
      const reporter = capture();
      const code = await runCli(["recommend"], { cwd: dir, reporter });
      expect(code).toBe(0);
      expect(reporter.lines.join("\n")).toContain("No AI usage detected");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
