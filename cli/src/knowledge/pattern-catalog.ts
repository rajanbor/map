/**
 * Module 1 — the pattern catalog interface.
 *
 * The catalog answers "which patterns exist (or are planned) and what state are they
 * in", across every source: written pattern documents, the roadmap, and later remote
 * indexes. It complements `KnowledgeBase`, which serves fully loaded `Pattern`
 * documents; the catalog is the cheap, always-available table of contents.
 */

import type { CatalogEntry, CatalogStatus, PatternCategory, PatternId } from "../domain/index.ts";

export interface CatalogQuery {
  readonly category?: PatternCategory | undefined;
  readonly status?: CatalogStatus | undefined;
  /** Case-insensitive match against id, name, and summary. */
  readonly text?: string | undefined;
}

export interface PatternCatalog {
  /** All entries, sorted by category then name. */
  entries(): Promise<readonly CatalogEntry[]>;
  get(id: PatternId): Promise<CatalogEntry | undefined>;
  find(query: CatalogQuery): Promise<readonly CatalogEntry[]>;
}
