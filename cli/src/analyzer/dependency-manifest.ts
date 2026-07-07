/**
 * Module 2 — the first real analyzer: dependency manifests.
 *
 * Reads the project's dependency manifests (package.json, requirements.txt,
 * pyproject.toml, go.mod, Cargo.toml) at the project root and matches the declared
 * dependencies against `DEPENDENCY_SIGNALS`. Language-agnostic and cheap: no source
 * code is parsed, yet a declared `langchain` or `pinecone` is the strongest single
 * signal that a concept is in play.
 */

import { join } from "node:path";
import type { Storage } from "../storage/index.ts";
import type { ConceptId, DetectedConcept } from "../domain/index.ts";
import type { Analyzer, AnalyzerContext } from "./analyzer.ts";
import type { Ecosystem } from "./signals.ts";
import { DEPENDENCY_SIGNALS } from "./signals.ts";
import {
  parseCargoToml,
  parseGoMod,
  parsePackageJson,
  parsePyprojectToml,
  parseRequirementsTxt,
} from "./manifests.ts";

interface ManifestSpec {
  readonly file: string;
  readonly ecosystem: Ecosystem;
  readonly parse: (contents: string) => readonly string[];
}

const MANIFESTS: readonly ManifestSpec[] = [
  { file: "package.json", ecosystem: "npm", parse: parsePackageJson },
  { file: "requirements.txt", ecosystem: "pypi", parse: parseRequirementsTxt },
  { file: "pyproject.toml", ecosystem: "pypi", parse: parsePyprojectToml },
  { file: "go.mod", ecosystem: "go", parse: parseGoMod },
  { file: "Cargo.toml", ecosystem: "cargo", parse: parseCargoToml },
];

export class DependencyManifestAnalyzer implements Analyzer {
  readonly id = "dependency-manifest";
  readonly name = "Dependency Manifest Analyzer";

  private readonly storage: Storage;

  constructor(storage: Storage) {
    this.storage = storage;
  }

  async supports(context: AnalyzerContext): Promise<boolean> {
    for (const manifest of MANIFESTS) {
      if (await this.storage.exists(join(context.root, manifest.file))) return true;
    }
    return false;
  }

  async analyze(context: AnalyzerContext): Promise<readonly DetectedConcept[]> {
    const detected: DetectedConcept[] = [];

    for (const manifest of MANIFESTS) {
      const path = join(context.root, manifest.file);
      if (!(await this.storage.exists(path))) continue;

      const dependencies = manifest.parse(await this.storage.readFile(path));
      for (const signal of DEPENDENCY_SIGNALS) {
        if (signal.ecosystem !== manifest.ecosystem) continue;
        const match = dependencies.find((dep) =>
          matches(dep, signal.dependency, signal.ecosystem),
        );
        if (match === undefined) continue;
        detected.push({
          concept: signal.concept,
          confidence: signal.confidence,
          evidence: [`${manifest.file}: ${match}`],
        });
      }
    }

    return mergeConcepts(detected);
  }
}

/** Go signals match the module path exactly or as a prefix (version suffixes). */
function matches(dependency: string, signal: string, ecosystem: Ecosystem): boolean {
  if (ecosystem === "go") {
    return dependency === signal || dependency.startsWith(`${signal}/`);
  }
  return dependency === signal;
}

/**
 * Merge detections of the same concept (across signals or analyzers): the strongest
 * confidence wins and evidence is unioned. Result is sorted by confidence, strongest
 * first, so reports lead with what is most certain.
 */
export function mergeConcepts(
  detections: readonly DetectedConcept[],
): readonly DetectedConcept[] {
  const byConcept = new Map<ConceptId, { confidence: number; evidence: Set<string> }>();

  for (const detection of detections) {
    const existing = byConcept.get(detection.concept);
    if (existing) {
      existing.confidence = Math.max(existing.confidence, detection.confidence);
      for (const item of detection.evidence) existing.evidence.add(item);
    } else {
      byConcept.set(detection.concept, {
        confidence: detection.confidence,
        evidence: new Set(detection.evidence),
      });
    }
  }

  return [...byConcept.entries()]
    .map(([concept, { confidence, evidence }]) => ({
      concept,
      confidence,
      evidence: [...evidence],
    }))
    .sort((a, b) => b.confidence - a.confidence);
}
