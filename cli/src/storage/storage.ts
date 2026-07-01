/**
 * Storage abstraction.
 *
 * Everything that touches the filesystem goes through this interface so the rest of
 * the codebase stays testable and replaceable (e.g. an in-memory storage in tests,
 * or a remote storage later). Keep it small and intention-revealing.
 */

export interface Storage {
  exists(path: string): Promise<boolean>;
  /** Create a directory (and parents). No error if it already exists. */
  ensureDir(path: string): Promise<void>;
  readFile(path: string): Promise<string>;
  /**
   * Write a file. If `overwrite` is false and the file exists, the write is skipped
   * and `false` is returned. Returns `true` when the file was written.
   */
  writeFile(
    path: string,
    contents: string,
    options?: { overwrite?: boolean },
  ): Promise<boolean>;
}
