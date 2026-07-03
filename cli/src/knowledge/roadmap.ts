/**
 * Parses ROADMAP.md into catalog entries.
 *
 * The roadmap is the authoritative list of the target catalog (~75 patterns). Each
 * `## <Category>` section lists patterns as `- <status symbol> Name`, where the
 * symbol follows the legend: ⬜ Planned · 🟡 In progress · ✅ Published. Sections
 * whose heading is not a pattern category (delivery phases, decision guides,
 * candidate categories) are ignored.
 */

import type { CatalogEntry, CatalogStatus, PatternCategory } from "../domain/index.ts";

/** Roadmap section headings → pattern categories (mirrors `patterns/`). */
const CATEGORY_HEADINGS: Readonly<Record<string, PatternCategory>> = {
  Retrieval: "retrieval",
  Memory: "memory",
  Agents: "agents",
  Security: "security",
  "Context Management": "context",
  Evaluation: "evaluation",
  Performance: "performance",
  Routing: "routing",
  "Tool Calling": "tool-calling",
  Observability: "observability",
};

const STATUS_SYMBOLS: Readonly<Record<string, CatalogStatus>> = {
  "✅": "published",
  "🟡": "in-progress",
  "⬜": "planned",
};

/**
 * Names whose canonical slug differs from plain slugification. These are the ids
 * the rule table and pattern cross-references use; keep them in sync with
 * `recommendation/rules.ts` and the `pattern.yaml` files under `patterns/`.
 */
const SLUG_OVERRIDES: Readonly<Record<string, string>> = {
  "Faithfulness / Groundedness Evaluation": "faithfulness-groundedness",
  "Tracing / Spans": "tracing",
};

export function parseRoadmap(markdown: string): readonly CatalogEntry[] {
  const entries: CatalogEntry[] = [];
  let category: PatternCategory | undefined;

  for (const line of markdown.split("\n")) {
    const heading = line.match(/^##\s+(.+?)\s*$/);
    if (heading) {
      category = CATEGORY_HEADINGS[heading[1]!];
      continue;
    }
    if (category === undefined) continue;

    const item = line.match(/^-\s+(\S+)\s+(.+?)\s*$/);
    if (!item) continue;
    const status = STATUS_SYMBOLS[item[1]!];
    if (status === undefined) continue;

    const name = stripMarkdownLink(item[2]!);
    entries.push({
      id: `${category}/${slugify(name)}`,
      name,
      category,
      status,
    });
  }
  return entries;
}

/** `[Chunking](patterns/retrieval/chunking/)` → `Chunking`. */
function stripMarkdownLink(text: string): string {
  const link = text.match(/^\[(.+?)\]\(.+?\)$/);
  return link ? link[1]! : text;
}

/**
 * Derives a `category/slug` id segment from a roadmap name. Parenthesized
 * qualifiers are dropped ("Reranking (cross-encoder)" → "reranking"), everything
 * else becomes hyphenated lowercase.
 */
export function slugify(name: string): string {
  const override = SLUG_OVERRIDES[name];
  if (override !== undefined) return override;
  return name
    .replace(/\(.*?\)/g, " ")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
