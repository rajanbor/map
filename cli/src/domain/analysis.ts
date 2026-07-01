/**
 * The output of the analyzer (Module 2): a description of the AI architecture that
 * was detected in a codebase. This is the input to the recommendation engine.
 */

import type { ConceptId } from "./concept.ts";

/** A single detected concept, with evidence and confidence. */
export interface DetectedConcept {
  readonly concept: ConceptId;
  /** 0..1 confidence that the concept is present. */
  readonly confidence: number;
  /** Where the signal was found, e.g. file paths or symbols. */
  readonly evidence: readonly string[];
}

/** The full picture the analyzer produces for a project. */
export interface DetectedArchitecture {
  /** Absolute path of the analyzed project root. */
  readonly root: string;
  readonly detectedAt: string;
  readonly concepts: readonly DetectedConcept[];
}
