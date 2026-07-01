/**
 * Filesystem implementation of `Storage` using only Node built-ins (no dependencies).
 */

import { mkdir, readFile, writeFile, access } from "node:fs/promises";
import { constants } from "node:fs";
import type { Storage } from "./storage.ts";

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
}
