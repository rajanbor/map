/**
 * A trivial in-memory KnowledgeBase. It is the default implementation used to boot
 * the platform before real loaders (Markdown, JSON, API) exist.
 *
 * TODO(module-1): add a MarkdownKnowledgeBase that derives Pattern data from the
 * `patterns/` directory, and a JSON loader for `.map/knowledge/`.
 */

import type { Pattern, PatternId, PatternCategory } from "../domain/index.ts";
import type { KnowledgeBase, PatternQuery } from "./knowledge-base.ts";

export class InMemoryKnowledgeBase implements KnowledgeBase {
  private readonly patterns: Map<PatternId, Pattern>;

  constructor(patterns: readonly Pattern[] = []) {
    this.patterns = new Map(patterns.map((p) => [p.id, p]));
  }

  async load(): Promise<void> {
    // Nothing to load; data is provided at construction time.
  }

  async all(): Promise<readonly Pattern[]> {
    return [...this.patterns.values()];
  }

  async get(id: PatternId): Promise<Pattern | undefined> {
    return this.patterns.get(id);
  }

  async find(query: PatternQuery): Promise<readonly Pattern[]> {
    const text = query.text?.toLowerCase();
    return [...this.patterns.values()].filter((p) => {
      const categoryOk = matchesCategory(p.category, query.category);
      const textOk =
        text === undefined ||
        p.name.toLowerCase().includes(text) ||
        p.description.toLowerCase().includes(text);
      return categoryOk && textOk;
    });
  }
}

function matchesCategory(
  category: PatternCategory,
  filter: PatternCategory | undefined,
): boolean {
  return filter === undefined || category === filter;
}
