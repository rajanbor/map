/**
 * The default PatternCatalog: reads the MAP repository itself.
 *
 * Two sources are merged:
 *  1. `ROADMAP.md` — the target catalog; provides every entry with its status.
 *  2. `patterns/<category>/<slug>/pattern.yaml` — written patterns; these override
 *     the roadmap entry (canonical id/name) and add summary + maturity.
 *
 * Entries found on disk are always `published`, even if the roadmap symbol lags.
 */

import { join } from "node:path";
import type { CatalogEntry, CatalogStatus, PatternCategory, PatternId } from "../domain/index.ts";
import type { Storage } from "../storage/index.ts";
import type { PatternCatalog, CatalogQuery } from "./pattern-catalog.ts";
import { parseRoadmap } from "./roadmap.ts";
import { parsePatternYamlHeader } from "./pattern-yaml.ts";

const CATEGORIES: readonly PatternCategory[] = [
  "retrieval",
  "memory",
  "agents",
  "security",
  "context",
  "evaluation",
  "performance",
  "routing",
  "tool-calling",
  "observability",
];

export class RepoPatternCatalog implements PatternCatalog {
  private cache: readonly CatalogEntry[] | undefined;

  private readonly storage: Storage;
  /** Root of the MAP repository (contains ROADMAP.md and patterns/). */
  private readonly repoRoot: string;

  constructor(storage: Storage, repoRoot: string) {
    this.storage = storage;
    this.repoRoot = repoRoot;
  }

  async entries(): Promise<readonly CatalogEntry[]> {
    this.cache ??= await this.build();
    return this.cache;
  }

  async get(id: PatternId): Promise<CatalogEntry | undefined> {
    return (await this.entries()).find((entry) => entry.id === id);
  }

  async find(query: CatalogQuery): Promise<readonly CatalogEntry[]> {
    const text = query.text?.toLowerCase();
    return (await this.entries()).filter((entry) => {
      if (query.category !== undefined && entry.category !== query.category) return false;
      if (query.status !== undefined && entry.status !== query.status) return false;
      if (text !== undefined) {
        const haystack = `${entry.id} ${entry.name} ${entry.summary ?? ""}`.toLowerCase();
        if (!haystack.includes(text)) return false;
      }
      return true;
    });
  }

  private async build(): Promise<readonly CatalogEntry[]> {
    const byId = new Map<PatternId, CatalogEntry>();

    for (const entry of await this.fromRoadmap()) {
      byId.set(entry.id, entry);
    }
    for (const entry of await this.fromPatternDirs()) {
      byId.set(entry.id, entry);
    }

    return [...byId.values()].sort(
      (a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name),
    );
  }

  private async fromRoadmap(): Promise<readonly CatalogEntry[]> {
    const path = join(this.repoRoot, "ROADMAP.md");
    if (!(await this.storage.exists(path))) return [];
    return parseRoadmap(await this.storage.readFile(path));
  }

  private async fromPatternDirs(): Promise<readonly CatalogEntry[]> {
    const entries: CatalogEntry[] = [];
    const patternsDir = join(this.repoRoot, "patterns");

    for (const category of CATEGORIES) {
      for (const slug of await this.storage.listDirs(join(patternsDir, category))) {
        const yamlPath = join(patternsDir, category, slug, "pattern.yaml");
        if (!(await this.storage.exists(yamlPath))) continue;

        const header = parsePatternYamlHeader(await this.storage.readFile(yamlPath));
        const status: CatalogStatus = "published";
        entries.push({
          id: header.id ?? `${category}/${slug}`,
          name: header.name ?? slug,
          category,
          status,
          ...(header.summary !== undefined && { summary: header.summary }),
          ...(header.maturity !== undefined && { maturity: header.maturity }),
          ...(header.score !== undefined && { score: header.score }),
          ...(header.related !== undefined && { related: header.related }),
        });
      }
    }
    return entries;
  }
}
