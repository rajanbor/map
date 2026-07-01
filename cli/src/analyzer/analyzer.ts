/**
 * Module 2 — Analyzer (interfaces only for now).
 *
 * An `Analyzer` inspects a project and reports the AI-architecture concepts it finds.
 * Analyzers are pluggable and language-scoped (TypeScript, Python, Go, Java, ...).
 * The registry picks the analyzers that apply to a given project.
 *
 * TODO(module-2): implement a first analyzer (e.g. TypeScript) that detects
 * embeddings, vector search, RAG, tool calling, streaming, memory, model routing,
 * and prompt guards. Keep detection rules data-driven so new signals are cheap.
 */

import type { DetectedConcept } from "../domain/index.ts";

export interface AnalyzerContext {
  /** Absolute path of the project being analyzed. */
  readonly root: string;
  /** Optional glob-like include/exclude hints from config. */
  readonly include?: readonly string[];
  readonly exclude?: readonly string[];
}

export interface Analyzer {
  /** Unique id, e.g. "typescript". */
  readonly id: string;
  /** Human-readable name. */
  readonly name: string;
  /** Whether this analyzer can run against the given project. */
  supports(context: AnalyzerContext): Promise<boolean>;
  /** Detect concepts. Implementations must not throw on unknown code. */
  analyze(context: AnalyzerContext): Promise<readonly DetectedConcept[]>;
}

/** Holds the set of available analyzers; extension point for plugins. */
export class AnalyzerRegistry {
  private readonly analyzers = new Map<string, Analyzer>();

  register(analyzer: Analyzer): void {
    this.analyzers.set(analyzer.id, analyzer);
  }

  list(): readonly Analyzer[] {
    return [...this.analyzers.values()];
  }

  /** Analyzers that support the given project. */
  async applicable(context: AnalyzerContext): Promise<readonly Analyzer[]> {
    const result: Analyzer[] = [];
    for (const analyzer of this.analyzers.values()) {
      if (await analyzer.supports(context)) result.push(analyzer);
    }
    return result;
  }
}
