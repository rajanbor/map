import { describe, it, expect } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { FileSystemStorage } from "../src/storage/file-system-storage.ts";

describe("FileSystemStorage", () => {
  it("ensures dirs, writes without overwrite by default, and reads back", async () => {
    const dir = await mkdtemp(join(tmpdir(), "map-storage-"));
    const storage = new FileSystemStorage();
    try {
      const sub = join(dir, "a", "b");
      await storage.ensureDir(sub);
      expect(await storage.exists(sub)).toBe(true);

      const file = join(sub, "f.txt");
      expect(await storage.writeFile(file, "one")).toBe(true);
      expect(await storage.readFile(file)).toBe("one");

      // Default: do not overwrite an existing file.
      expect(await storage.writeFile(file, "two")).toBe(false);
      expect(await storage.readFile(file)).toBe("one");

      // Overwrite only when explicitly asked.
      expect(await storage.writeFile(file, "two", { overwrite: true })).toBe(true);
      expect(await storage.readFile(file)).toBe("two");

      expect(await storage.exists(join(dir, "nope"))).toBe(false);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
