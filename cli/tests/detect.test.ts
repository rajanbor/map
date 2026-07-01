import { describe, it, expect } from "vitest";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { detectProject } from "../src/project/detect.ts";
import { FileSystemStorage } from "../src/storage/file-system-storage.ts";

const storage = new FileSystemStorage();

async function projectWith(files: Record<string, string>): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "map-detect-"));
  for (const [name, contents] of Object.entries(files)) {
    await writeFile(join(dir, name), contents);
  }
  return dir;
}

describe("detectProject", () => {
  it("detects TypeScript when a tsconfig is present (not plain JS)", async () => {
    const dir = await projectWith({ "package.json": "{}", "tsconfig.json": "{}" });
    try {
      const facts = await detectProject(dir, storage);
      expect(facts.languages).toEqual(["typescript"]);
      expect(facts.analyzers).toEqual(["typescript"]);
      expect(facts.include).toContain("src/**");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("detects JavaScript when only package.json is present", async () => {
    const dir = await projectWith({ "package.json": "{}" });
    try {
      expect((await detectProject(dir, storage)).languages).toEqual(["javascript"]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("detects Python and suggests a python glob", async () => {
    const dir = await projectWith({ "requirements.txt": "" });
    try {
      const facts = await detectProject(dir, storage);
      expect(facts.languages).toEqual(["python"]);
      expect(facts.include).toContain("**/*.py");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("detects multiple languages (TypeScript + Go)", async () => {
    const dir = await projectWith({ "tsconfig.json": "{}", "go.mod": "module x" });
    try {
      const facts = await detectProject(dir, storage);
      expect(facts.languages).toEqual(["typescript", "go"]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("falls back to defaults for an empty project", async () => {
    const dir = await mkdtemp(join(tmpdir(), "map-detect-"));
    try {
      const facts = await detectProject(dir, storage);
      expect(facts.languages).toEqual([]);
      expect(facts.analyzers).toEqual([]);
      expect(facts.include).toEqual(["src/**"]);
      expect(facts.exclude.length).toBeGreaterThan(0);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
