/**
 * The default PatternCatalog: a view over a loaded registry document.
 *
 * The document is loaded lazily on first use and cached for the process
 * lifetime; where it comes from (bundled snapshot, user cache, override) is the
 * registry source's concern (see registry-source.ts).
 */

import type { CatalogEntry, PatternId } from "../domain/index.ts";
import type { PatternCatalog, CatalogQuery } from "./pattern-catalog.ts";
import type { RegistryDocument } from "./registry.ts";

export class RegistryPatternCatalog implements PatternCatalog {
  private document: Promise<RegistryDocument> | undefined;

  private readonly load: () => Promise<RegistryDocument>;

  constructor(load: () => Promise<RegistryDocument>) {
    this.load = load;
  }

  /** The underlying registry document (for provenance reporting, e.g. doctor). */
  async registry(): Promise<RegistryDocument> {
    this.document ??= this.load();
    return this.document;
  }

  async entries(): Promise<readonly CatalogEntry[]> {
    return (await this.registry()).patterns;
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
}
