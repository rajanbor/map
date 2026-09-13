/**
 * `map analyze [path]` — detect AI architecture concepts in a project.
 *
 * Runs every applicable analyzer from the registry, merges their detections, and
 * reports the concepts with evidence. When a `.map/` workspace exists, the result is
 * also written to `.map/reports/analysis.json` so other tools (and `map recommend`)
 * can consume it without re-scanning.
 */

import { join, resolve } from "node:path";
import type { Command, CommandContext, CommandResult } from "../command.ts";
import { OK } from "../command.ts";
import type { AnalyzerContext } from "../../analyzer/index.ts";
import { mergeConcepts, SUPPORTED_MANIFEST_FILES } from "../../analyzer/index.ts";
import { MAP_DIR } from "../../config/index.ts";
import { CONCEPTS } from "../../domain/index.ts";
import { certaintyForConfidence } from "../../domain/index.ts";
import type { DetectedConcept, ScanResult } from "../../domain/index.ts";
import type { Services } from "../../services.ts";
import type { Reporter } from "../../reporting/index.ts";

export const analyzeCommand: Command = {
  name: "analyze",
  summary: "Scan the project and detect AI architecture concepts.",
  usage: "map analyze [path]",
  args: "[path]",
  options: [{ flags: "--json", description: "machine-readable scan result" }],

  async run(ctx: CommandContext): Promise<CommandResult> {
    const { reporter, services } = ctx;
    const root = resolve(ctx.cwd, ctx.args[0] ?? ".");

    const architecture = await scanArchitecture(root, services);
    if (ctx.flags["json"] === true) {
      reporter.info(JSON.stringify(architecture, null, 2));
      await saveReport(architecture, services, reporter, false);
      return OK;
    }
    if (architecture.analyzers.length === 0) {
      reporter.warn(`No applicable analyzers for ${root}.`);
      reporter.info("Supported signals: dependency manifests (package.json, requirements.txt, pyproject.toml, go.mod, Cargo.toml).");
      return OK;
    }

    reportConcepts(architecture.concepts, reporter);
    await saveReport(architecture, services, reporter, true);

    return OK;
  },
};

/**
 * Run all applicable analyzers against `root` and merge their detections.
 * Returns `undefined` when no analyzer applies (e.g. an empty directory).
 */
export async function detectArchitecture(
  root: string,
  services: Services,
): Promise<ScanResult | undefined> {
  const result = await scanArchitecture(root, services);
  return result.analyzers.length === 0 ? undefined : result;
}

export async function scanArchitecture(
  root: string,
  services: Services,
): Promise<ScanResult> {
  const context: AnalyzerContext = { root };
  const applicable = await services.analyzers.applicable(context);

  const detections: DetectedConcept[] = [];
  for (const analyzer of applicable) {
    detections.push(...(await analyzer.analyze(context)));
  }

  const inspected: string[] = [];
  for (const file of SUPPORTED_MANIFEST_FILES) {
    if (await services.storage.exists(join(root, file))) inspected.push(file);
  }

  return {
    schemaVersion: 1,
    kind: "map.scan-result",
    root,
    detectedAt: new Date().toISOString(),
    analyzers: applicable.map((analyzer) => analyzer.id).sort(),
    inspected: inspected.sort(),
    concepts: mergeConcepts(detections).map((detection) => ({
      ...detection,
      certainty: certaintyForConfidence(detection.confidence),
    })),
    limitations: [
      applicable.length === 0
        ? "No analyzer supports the files at this project root; architecture is unknown."
        : "Dependency manifests indicate declared packages, not whether or how code uses them.",
      "The MVP scanner does not inspect source code, runtime behavior, nested workspaces, or secret values.",
    ],
  };
}

function reportConcepts(
  concepts: readonly DetectedConcept[],
  reporter: Reporter,
): void {
  if (concepts.length === 0) {
    reporter.info("No AI architecture concepts detected.");
    return;
  }

  reporter.info(`Detected ${concepts.length} concept(s):`);
  for (const detection of concepts) {
    const name =
      CONCEPTS.find((concept) => concept.id === detection.concept)?.name ??
      detection.concept;
    const confidence = `${Math.round(detection.confidence * 100)}%`;
    const certainty = "certainty" in detection ? `, ${String(detection.certainty)}` : "";
    reporter.info(`  ${name} (${confidence}${certainty}) — ${detection.evidence.join(", ")}`);
  }
}

async function saveReport(
  architecture: ScanResult,
  services: Services,
  reporter: Reporter,
  announce: boolean,
): Promise<void> {
  const { storage } = services;
  const mapDir = join(architecture.root, MAP_DIR);
  if (!(await storage.exists(mapDir))) return;

  const path = join(mapDir, "reports", "analysis.json");
  await storage.ensureDir(join(mapDir, "reports"));
  await storage.writeFile(path, `${JSON.stringify(architecture, null, 2)}\n`, {
    overwrite: true,
  });
  if (announce) reporter.success(`Report saved to ${path}`);
}

export const scanCommand: Command = {
  ...analyzeCommand,
  name: "scan",
  summary: "Scan the project and return evidence-backed AI architecture signals.",
  usage: "map scan [path] [--json]",
};
