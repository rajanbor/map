/**
 * Module 4 — Graph.
 *
 * The pattern graph is intended to become the source of truth: patterns are nodes
 * and relationships are typed edges. For now this is a small in-memory
 * implementation with a query surface the CLI and recommendation engine can build on.
 */

import type {
  PatternId,
  Relationship,
  RelationshipType,
} from "../domain/index.ts";

export interface PatternGraph {
  addNode(id: PatternId): void;
  addEdge(edge: Relationship): void;
  hasNode(id: PatternId): boolean;
  nodes(): readonly PatternId[];
  edges(): readonly Relationship[];
  /** Outgoing edges from `id`, optionally filtered by relationship type. */
  neighbors(id: PatternId, type?: RelationshipType): readonly Relationship[];
}

export class InMemoryPatternGraph implements PatternGraph {
  private readonly nodeSet = new Set<PatternId>();
  private readonly edgeList: Relationship[] = [];

  addNode(id: PatternId): void {
    this.nodeSet.add(id);
  }

  addEdge(edge: Relationship): void {
    this.nodeSet.add(edge.from);
    this.nodeSet.add(edge.to);
    this.edgeList.push(edge);
  }

  hasNode(id: PatternId): boolean {
    return this.nodeSet.has(id);
  }

  nodes(): readonly PatternId[] {
    return [...this.nodeSet];
  }

  edges(): readonly Relationship[] {
    return [...this.edgeList];
  }

  neighbors(id: PatternId, type?: RelationshipType): readonly Relationship[] {
    return this.edgeList.filter(
      (e) => e.from === id && (type === undefined || e.type === type),
    );
  }
}
