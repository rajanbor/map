/**
 * Shared test doubles: an in-memory Storage and a capturing Reporter.
 */

import type { Storage } from "../src/storage/index.ts";
import type { Reporter } from "../src/reporting/index.ts";

/** In-memory storage: `files` maps absolute paths to contents. */
export function fakeStorage(files: Record<string, string> = {}): Storage & {
  files: Record<string, string>;
} {
  return {
    files,
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
    async listFiles(path) {
      return Object.keys(files)
        .filter((f) => f.startsWith(`${path}/`))
        .map((f) => f.slice(path.length + 1))
        .sort();
    },
    async listEntries(path) {
      const entries = new Map<string, "file" | "dir">();
      for (const file of Object.keys(files)) {
        if (!file.startsWith(`${path}/`)) continue;
        const rest = file.slice(path.length + 1);
        const [head] = rest.split("/");
        if (head === undefined) continue;
        entries.set(head, rest.includes("/") ? "dir" : "file");
      }
      return [...entries.entries()]
        .map(([name, type]) => ({ name, type }))
        .sort((a, b) => (a.name < b.name ? -1 : 1));
    },
    async readFile(path) {
      const contents = files[path];
      if (contents === undefined) throw new Error(`ENOENT: ${path}`);
      return contents;
    },
    async writeFile(path, contents, options) {
      if (options?.overwrite !== true && path in files) return false;
      files[path] = contents;
      return true;
    },
    async removeFile(path) {
      delete files[path];
    },
  };
}

/** Reporter that captures all output lines for assertions. */
export function capture(): Reporter & { lines: string[] } {
  const lines: string[] = [];
  return {
    lines,
    info: (m) => void lines.push(m),
    success: (m) => void lines.push(m),
    warn: (m) => void lines.push(m),
    error: (m) => void lines.push(m),
    data: (m) => void lines.push(m),
  };
}

/** A minimal valid registry document (as JSON) for catalog tests. */
export function registryJson(
  patterns: ReadonlyArray<Record<string, unknown>>,
): string {
  return JSON.stringify({
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    source: { repository: "https://example.com/map", version: "0.0.0-test" },
    categories: ["retrieval", "memory", "observability"],
    patterns,
  });
}
