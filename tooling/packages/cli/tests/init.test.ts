import { describe, it, expect } from "vitest";
import { mkdtemp, readFile, writeFile, rm, stat, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runCli } from "../src/cli/runner.ts";
import { capture } from "./helpers.ts";

const silent = () => capture();

async function tempProject(): Promise<string> {
  return mkdtemp(join(tmpdir(), "map-init-"));
}

const WORKSPACE_DIRS = [
  "patterns",
  "prompts",
  "architecture",
  "decisions",
  "evals",
  "agents",
  "tools",
  "reports",
  "cache",
];

describe("map init", () => {
  it("creates the .map workspace from the template", async () => {
    const dir = await tempProject();
    try {
      const code = await runCli(["init"], { cwd: dir, reporter: silent() });
      expect(code).toBe(0);

      const config = JSON.parse(await readFile(join(dir, ".map/map.config.json"), "utf8"));
      expect(config.version).toBe(4);
      expect(config.project.name).toBe(dir.split("/").pop());
      expect(config.registry.source).toBe("default");
      expect(config.targets.claude.output).toBe("CLAUDE.md");

      for (const sub of WORKSPACE_DIRS) {
        expect((await stat(join(dir, ".map", sub))).isDirectory()).toBe(true);
      }
      // Template underscore files land as dotfiles.
      expect(await readFile(join(dir, ".map/.gitignore"), "utf8")).toContain("cache/");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("does not overwrite existing files without --force", async () => {
    const dir = await tempProject();
    try {
      await runCli(["init"], { cwd: dir, reporter: silent() });
      await writeFile(join(dir, ".map/map.config.json"), '{"version": 2, "custom": true}');

      await runCli(["init"], { cwd: dir, reporter: silent() });
      expect(await readFile(join(dir, ".map/map.config.json"), "utf8")).toContain("custom");

      await runCli(["init", "--force"], { cwd: dir, reporter: silent() });
      const regenerated = JSON.parse(await readFile(join(dir, ".map/map.config.json"), "utf8"));
      expect(regenerated.project).toBeDefined();
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("self-configures from the detected project", async () => {
    const dir = await tempProject();
    try {
      await writeFile(join(dir, "package.json"), "{}");
      await writeFile(join(dir, "tsconfig.json"), "{}");

      await runCli(["init"], { cwd: dir, reporter: silent() });

      const config = JSON.parse(await readFile(join(dir, ".map/map.config.json"), "utf8"));
      expect(config.project.languages).toContain("typescript");
      expect(config.analysis.analyzers).toContain("typescript");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("migrates a legacy v1 workspace with --yes", async () => {
    const dir = await tempProject();
    try {
      await mkdir(join(dir, ".map/knowledge"), { recursive: true });
      await writeFile(join(dir, ".map/config.yaml"), "version: 1\n");
      await writeFile(join(dir, ".map/project.yaml"), "name: old\n");
      await writeFile(join(dir, ".map/knowledge/patterns.json"), "[]\n");

      const reporter = capture();
      const code = await runCli(["init", "--yes"], { cwd: dir, reporter });
      expect(code).toBe(0);

      const output = reporter.lines.join("\n");
      expect(output).toContain("Legacy workspace files found");
      await expect(stat(join(dir, ".map/config.yaml"))).rejects.toThrow();
      await expect(stat(join(dir, ".map/project.yaml"))).rejects.toThrow();
      expect(JSON.parse(await readFile(join(dir, ".map/map.config.json"), "utf8")).version).toBe(4);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("keeps legacy files without consent (non-interactive)", async () => {
    const dir = await tempProject();
    try {
      await mkdir(join(dir, ".map"), { recursive: true });
      await writeFile(join(dir, ".map/config.yaml"), "version: 1\n");

      const reporter = capture();
      await runCli(["init"], { cwd: dir, reporter });

      expect(await readFile(join(dir, ".map/config.yaml"), "utf8")).toBe("version: 1\n");
      expect(reporter.lines.join("\n")).toContain("--yes");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
