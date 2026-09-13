import { describe, expect, it } from "vitest";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runCli } from "../src/cli/runner.ts";
import { capture } from "./helpers.ts";

async function project(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "map-mvp-"));
  await writeFile(join(root, "package.json"), JSON.stringify({ dependencies: { langchain: "^1" } }));
  return root;
}

describe("deterministic MVP commands", () => {
  it("emits a versioned scan result through the new alias", async () => {
    const root = await project();
    try {
      const reporter = capture();
      expect(await runCli(["scan", "--json"], { cwd: root, reporter })).toBe(0);
      const result = JSON.parse(reporter.lines[0]!);
      expect(result).toMatchObject({ schemaVersion: 1, kind: "map.scan-result" });
      expect(result.analyzers).toEqual(["dependency-manifest"]);
      expect(result.inspected).toEqual(["package.json"]);
      expect(result.concepts[0].certainty).toBe("likely");
      expect(result.limitations).not.toHaveLength(0);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("emits explainable suggestions through the new alias", async () => {
    const root = await project();
    try {
      const reporter = capture();
      expect(await runCli(["suggest", "--json"], { cwd: root, reporter })).toBe(0);
      const result = JSON.parse(reporter.lines[0]!);
      expect(result.kind).toBe("map.recommendation-result");
      expect(result.recommendations[0]).toEqual(expect.objectContaining({
        pattern: expect.any(String), rationale: expect.any(String), triggeredBy: expect.any(Array),
      }));
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("supports list, search, and show without removing the original commands", async () => {
    const listed = capture();
    expect(await runCli(["list", "--status", "published", "--json"], { reporter: listed })).toBe(0);
    expect(JSON.parse(listed.lines[0]!)).toHaveLength(5);

    const searched = capture();
    expect(await runCli(["search", "chunk", "--json"], { reporter: searched })).toBe(0);
    expect(JSON.parse(searched.lines[0]!)[0].id).toBe("retrieval/chunking");

    const shown = capture();
    expect(await runCli(["show", "retrieval/chunking", "--json"], { reporter: shown })).toBe(0);
    expect(JSON.parse(shown.lines[0]!)).toMatchObject({ id: "retrieval/chunking" });
  });

  it("projects the catalog as graph nodes and typed edges", async () => {
    const reporter = capture();
    expect(await runCli(["graph", "retrieval/chunking", "--json"], { reporter })).toBe(0);
    const result = JSON.parse(reporter.lines[0]!);
    expect(result).toMatchObject({ schemaVersion: 1, kind: "map.pattern-graph", nodes: ["retrieval/chunking"] });
    expect(result.edges.every((edge: { type: string }) => edge.type === "works_with")).toBe(true);
  });

  it("validates an initialized workspace and adopted pattern", async () => {
    const root = await project();
    try {
      expect(await runCli(["init"], { cwd: root, reporter: capture() })).toBe(0);
      expect(await runCli(["add", "retrieval/chunking"], { cwd: root, reporter: capture() })).toBe(0);
      const reporter = capture();
      expect(await runCli(["validate", "--json"], { cwd: root, reporter })).toBe(0);
      expect(JSON.parse(reporter.lines[0]!)).toMatchObject({ valid: true, kind: "map.validation-result" });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
