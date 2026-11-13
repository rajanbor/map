/**
 * Filesystem implementation of `Storage` using only Node built-ins (no dependencies).
 */

import { mkdir, readdir, readFile, writeFile, access, rm } from "node:fs/promises";
import { constants } from "node:fs";
import { join } from "node:path";
import type { DirectoryEntry, Storage } from "./storage.ts";

export class FileSystemStorage implements Storage {
  async exists(path: string): Promise<boolean> {
    try {
      await access(path, constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }

  async ensureDir(path: string): Promise<void> {
    await mkdir(path, { recursive: true });
  }

  async listDirs(path: string): Promise<readonly string[]> {
    try {
      const entries = await readdir(path, { withFileTypes: true });
      return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
    } catch {
      return [];
    }
  }

  async listFiles(path: string): Promise<readonly string[]> {
    try {
      const entries = await readdir(path, { withFileTypes: true, recursive: true });
      return entries
        .filter((entry) => entry.isFile())
        .map((entry) => join(entry.parentPath, entry.name).slice(path.length + 1))
        .sort();
    } catch {
      return [];
    }
  }

  async listEntries(path: string): Promise<readonly DirectoryEntry[]> {
    try {
      const entries = await readdir(path, { withFileTypes: true });
      return entries
        .map((entry): DirectoryEntry => ({
          name: entry.name,
          type: entry.isSymbolicLink()
            ? "symlink"
            : entry.isDirectory()
              ? "dir"
              : entry.isFile()
                ? "file"
                : "other",
        }))
        .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
    } catch {
      return [];
    }
  }

  async readFile(path: string): Promise<string> {
    return readFile(path, "utf8");
  }

  async writeFile(
    path: string,
    contents: string,
    options?: { overwrite?: boolean },
  ): Promise<boolean> {
    const overwrite = options?.overwrite ?? false;
    if (!overwrite && (await this.exists(path))) {
      return false;
    }
    await writeFile(path, contents, "utf8");
    return true;
  }

  async removeFile(path: string): Promise<void> {
    await rm(path, { force: true });
  }
}
