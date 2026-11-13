/** Fixtures for skills tests: throwaway Git repositories and projects on disk. */

import { execFileSync } from "node:child_process";
import { mkdtemp, mkdir, rm, symlink, writeFile, chmod } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

const cleanup: string[] = [];

export async function tempDir(prefix: string): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), prefix));
  cleanup.push(dir);
  return dir;
}

export async function removeTempDirs(): Promise<void> {
  while (cleanup.length > 0) await rm(cleanup.pop()!, { recursive: true, force: true });
}

export interface FixtureFile {
  readonly content?: string;
  readonly executable?: boolean;
  /** Create a symlink pointing at this target instead of a file. */
  readonly symlinkTo?: string;
}

export async function writeTree(root: string, files: Record<string, string | FixtureFile>): Promise<void> {
  for (const [path, spec] of Object.entries(files)) {
    const file = typeof spec === "string" ? { content: spec } : spec;
    const abs = join(root, path);
    await mkdir(dirname(abs), { recursive: true });
    if (file.symlinkTo !== undefined) await symlink(file.symlinkTo, abs);
    else {
      await writeFile(abs, file.content ?? "");
      if (file.executable === true) await chmod(abs, 0o755);
    }
  }
}

function gitIn(cwd: string, ...args: string[]): string {
  return execFileSync("git", ["-c", "user.name=MAP Test", "-c", "user.email=test@example.invalid", "-c", "commit.gpgsign=false", ...args], {
    cwd,
    encoding: "utf8",
    env: { PATH: process.env["PATH"], HOME: process.env["HOME"], GIT_CONFIG_NOSYSTEM: "1" },
  });
}

/** A Git repository with one commit containing `files`; returns its path and SHA. */
export async function gitRepo(files: Record<string, string | FixtureFile>): Promise<{ readonly url: string; readonly sha: string }> {
  const dir = await tempDir("map-skill-src-");
  gitIn(dir, "init", "-q", "-b", "main");
  await writeTree(dir, files);
  gitIn(dir, "add", "-A");
  gitIn(dir, "commit", "-q", "-m", "fixture");
  return { url: dir, sha: gitIn(dir, "rev-parse", "HEAD").trim() };
}

/** Add a commit to an existing fixture repository. */
export async function commit(url: string, files: Record<string, string | FixtureFile>): Promise<string> {
  await writeTree(url, files);
  gitIn(url, "add", "-A");
  gitIn(url, "commit", "-q", "-m", "update");
  return gitIn(url, "rev-parse", "HEAD").trim();
}

export function skillMd(name: string, description = `Does ${name} things. Use when testing.`, extra = ""): string {
  return `---\nname: ${name}\ndescription: >-\n  ${description}\n${extra}metadata:\n  version: 0.1.0\n  category: test\n---\n\n# ${name}\n\n## Goal\n\nTest.\n`;
}

/** A project directory with a `.map/` workspace and the given extra files. */
export async function project(files: Record<string, string | FixtureFile> = {}): Promise<string> {
  const root = await tempDir("map-skill-project-");
  await writeTree(root, { ".map/.keep": "", ...files });
  return root;
}
