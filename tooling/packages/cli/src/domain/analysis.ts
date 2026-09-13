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

export type DetectionCertainty = "detected" | "likely" | "unknown";

export interface ScanDetectedConcept extends DetectedConcept {
  readonly certainty: DetectionCertainty;
}

/** Stable JSON envelope emitted by `map scan --json`. */
export interface ScanResult extends Omit<DetectedArchitecture, "concepts"> {
  readonly schemaVersion: 1;
  readonly kind: "map.scan-result";
  readonly analyzers: readonly string[];
  readonly inspected: readonly string[];
  readonly concepts: readonly ScanDetectedConcept[];
  readonly limitations: readonly string[];
}

export function certaintyForConfidence(confidence: number): DetectionCertainty {
  if (confidence >= 0.85) return "detected";
  if (confidence >= 0.6) return "likely";
  return "unknown";
}
