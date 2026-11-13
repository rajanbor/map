/**
 * Module 3 — Recommendation Engine (interface + stub).
 *
 * A `Recommender` maps a detected architecture to the patterns that are missing.
 * It is independent from the analyzer: it takes `DetectedArchitecture` in and emits
 * `Recommendation`s out, so the two modules can evolve separately.
 */

import type {
  DetectedArchitecture,
  Recommendation,
} from "../domain/index.ts";

export interface Recommender {
  recommend(
    architecture: DetectedArchitecture,
  ): Promise<readonly Recommendation[]>;
}
