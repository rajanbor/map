import { describe, it, expect } from "vitest";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
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

async function tempProject(prefix: string): Promise<string> {
  return mkdtemp(join(tmpdir(), prefix));
}

describe("map patterns", () => {
  it("lists the catalog grouped by category", async () => {
    const reporter = capture();
    const code = await runCli(["patterns"], { reporter });

    expect(code).toBe(0);
    const output = reporter.lines.join("\n");
    expect(output).toContain("retrieval/chunking");
    expect(output).toContain("security/prompt-injection-defense");
    expect(output).toMatch(/\d+ pattern\(s\)/);
  });

  it("filters by text and category", async () => {
    const reporter = capture();
    const code = await runCli(["patterns", "cache", "--category=retrieval"], { reporter });

    expect(code).toBe(0);
    const output = reporter.lines.join("\n");
    expect(output).toContain("retrieval/semantic-cache");
    expect(output).not.toContain("performance/prompt-cache");
  });

  it("rejects an unknown status", async () => {
    const reporter = capture();
    const code = await runCli(["patterns", "--status=nope"], { reporter });

    expect(code).toBe(1);
    expect(reporter.lines.join("\n")).toContain("Unknown status");
  });
});

describe("map doctor", () => {
  it("fails with a hint when there is no workspace", async () => {
    const dir = await tempProject("map-doctor-");
    try {
      const reporter = capture();
      const code = await runCli(["doctor"], { cwd: dir, reporter });

      expect(code).toBe(1);
      const output = reporter.lines.join("\n");
      expect(output).toContain("no .map/ workspace");
      expect(output).toContain("map init");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("passes on a healthy analyzed workspace", async () => {
    const dir = await tempProject("map-doctor-");
    try {
      await writeFile(
        join(dir, "package.json"),
        JSON.stringify({ dependencies: { openai: "^4" } }),
      );
      await runCli(["init"], { cwd: dir, reporter: capture() });
      await runCli(["analyze"], { cwd: dir, reporter: capture() });

      const reporter = capture();
      const code = await runCli(["doctor"], { cwd: dir, reporter });

      expect(code).toBe(0);
      const output = reporter.lines.join("\n");
      expect(output).toContain("workspace found");
      expect(output).toContain("analysis report valid");
      expect(output).toContain("recommendation rules consistent");
      expect(output).toContain("0 problem(s)");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("warns (but passes) when the project was never analyzed", async () => {
    const dir = await tempProject("map-doctor-");
    try {
      await runCli(["init"], { cwd: dir, reporter: capture() });

      const reporter = capture();
      const code = await runCli(["doctor"], { cwd: dir, reporter });

      expect(code).toBe(0);
      const output = reporter.lines.join("\n");
      expect(output).toContain("no analysis report yet");
      expect(output).toContain("map analyze");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("reports corrupted workspace files as problems", async () => {
    const dir = await tempProject("map-doctor-");
    try {
      await runCli(["init"], { cwd: dir, reporter: capture() });
      await writeFile(join(dir, ".map", "knowledge", "patterns.json"), "{not json");

      const reporter = capture();
      const code = await runCli(["doctor"], { cwd: dir, reporter });

      expect(code).toBe(1);
      expect(reporter.lines.join("\n")).toContain("not valid JSON");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
