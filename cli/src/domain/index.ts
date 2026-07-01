/** Domain layer: pure types and constants with no I/O. */
export type {
  Pattern,
  PatternId,
  PatternCategory,
  Rating,
  ProductionReadiness,
  TradeOff,
  ImplementationReference,
} from "./pattern.ts";
export type { Relationship, RelationshipType } from "./relationship.ts";
export type { ConceptId, ConceptDefinition } from "./concept.ts";
export { CONCEPTS } from "./concept.ts";
export type { DetectedConcept, DetectedArchitecture } from "./analysis.ts";
export type {
  Recommendation,
  RecommendationPriority,
} from "./recommendation.ts";
