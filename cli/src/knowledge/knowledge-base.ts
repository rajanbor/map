/**
 * Module 1 — Knowledge Base.
 *
 * A source-agnostic store of patterns. Implementations may load from Markdown, JSON,
 * a database, or a remote API; callers only depend on this interface. This is what
 * lets the same knowledge power docs, the CLI, the website, and an API.
 */

import type { Pattern, PatternId, PatternCategory } from "../domain/index.ts";

export interface PatternQuery {
  readonly category?: PatternCategory;
  readonly text?: string;
}

export interface KnowledgeBase {
  /** Load or refresh the underlying data. Safe to call more than once. */
  load(): Promise<void>;
  all(): Promise<readonly Pattern[]>;
  get(id: PatternId): Promise<Pattern | undefined>;
  find(query: PatternQuery): Promise<readonly Pattern[]>;
}
