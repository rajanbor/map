/**
 * Composition root.
 *
 * `Services` is the bundle of wired core modules that commands depend on. Building it
 * in one place keeps the layers decoupled: commands ask for capabilities through
 * interfaces and never construct concrete implementations themselves. This is the
 * "dependency injection where appropriate" the project aims for, kept as a simple
 * factory rather than a framework.
 */

import type { Storage } from "./storage/index.ts";
import { FileSystemStorage } from "./storage/index.ts";
import type { KnowledgeBase } from "./knowledge/index.ts";
import { InMemoryKnowledgeBase } from "./knowledge/index.ts";
import type { PatternGraph } from "./graph/index.ts";
import { InMemoryPatternGraph } from "./graph/index.ts";
import { AnalyzerRegistry } from "./analyzer/index.ts";
import type { Recommender } from "./recommendation/index.ts";
import { NullRecommender } from "./recommendation/index.ts";

export interface Services {
  readonly storage: Storage;
  readonly knowledgeBase: KnowledgeBase;
  readonly graph: PatternGraph;
  readonly analyzers: AnalyzerRegistry;
  readonly recommender: Recommender;
}

/** Allow callers (and tests) to override any single dependency. */
export type ServiceOverrides = Partial<Services>;

export function createDefaultServices(overrides: ServiceOverrides = {}): Services {
  return {
    storage: overrides.storage ?? new FileSystemStorage(),
    knowledgeBase: overrides.knowledgeBase ?? new InMemoryKnowledgeBase(),
    graph: overrides.graph ?? new InMemoryPatternGraph(),
    analyzers: overrides.analyzers ?? new AnalyzerRegistry(),
    recommender: overrides.recommender ?? new NullRecommender(),
  };
}
