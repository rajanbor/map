import { describe, it, expect } from "vitest";
import { mkdtemp, readFile, writeFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runCli } from "../src/cli/runner.ts";
import type { Reporter } from "../src/reporting/index.ts";

const silent: Reporter = {
  info() {},
  success() {},
  warn() {},
  error() {},
};

async function tempProject(): Promise<string> {
  return mkdtemp(join(tmpdir(), "map-init-"));
}

describe("map init", () => {
  it("creates the .map workspace", async () => {
    const dir = await tempProject();
    try {
      const code = await runCli(["init"], { cwd: dir, reporter: silent });
      expect(code).toBe(0);

      const config = await readFile(join(dir, ".map/config.yaml"), "utf8");
      expect(config).toContain("version: 1");

      const patterns = await readFile(
        join(dir, ".map/knowledge/patterns.json"),
        "utf8",
      );
      expect(patterns).toBe("[]\n");

      for (const sub of ["knowledge", "cache", "reports", "graphs"]) {
        const s = await stat(join(dir, ".map", sub));
        expect(s.isDirectory()).toBe(true);
      }
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("does not overwrite existing files without --force", async () => {
    const dir = await tempProject();
    try {
      await runCli(["init"], { cwd: dir, reporter: silent });
      await writeFile(join(dir, ".map/config.yaml"), "custom: true\n");

      await runCli(["init"], { cwd: dir, reporter: silent });
      expect(await readFile(join(dir, ".map/config.yaml"), "utf8")).toBe(
        "custom: true\n",
      );

      await runCli(["init", "--force"], { cwd: dir, reporter: silent });
      expect(await readFile(join(dir, ".map/config.yaml"), "utf8")).toContain(
        "version: 1",
      );
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("returns a non-zero code for an unknown command", async () => {
    const code = await runCli(["nope"], { reporter: silent });
    expect(code).toBe(1);
  });

  it("self-initializes config/manifest from the detected project", async () => {
    const dir = await tempProject();
    try {
      await writeFile(join(dir, "package.json"), "{}");
      await writeFile(join(dir, "tsconfig.json"), "{}");

      await runCli(["init"], { cwd: dir, reporter: silent });

      const manifest = await readFile(join(dir, ".map/project.yaml"), "utf8");
      expect(manifest).toContain("typescript");

      const config = await readFile(join(dir, ".map/config.yaml"), "utf8");
      expect(config).toContain("analyzers:");
      expect(config).toContain("typescript");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
