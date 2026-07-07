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
import { mergeConcepts } from "../../analyzer/index.ts";
import { MAP_DIR } from "../../config/index.ts";
import { CONCEPTS } from "../../domain/index.ts";
import type { DetectedArchitecture, DetectedConcept } from "../../domain/index.ts";
import type { Services } from "../../services.ts";
import type { Reporter } from "../../reporting/index.ts";

export const analyzeCommand: Command = {
  name: "analyze",
  summary: "Scan the project and detect AI architecture concepts.",
  usage: "map analyze [path]",

  async run(ctx: CommandContext): Promise<CommandResult> {
    const { reporter, services } = ctx;
    const root = resolve(ctx.cwd, ctx.args[0] ?? ".");

    const architecture = await detectArchitecture(root, services);
    if (architecture === undefined) {
      reporter.warn(`No applicable analyzers for ${root}.`);
      reporter.info("Supported signals: dependency manifests (package.json, requirements.txt, pyproject.toml, go.mod, Cargo.toml).");
      return OK;
    }

    reportConcepts(architecture.concepts, reporter);
    await saveReport(architecture, services, reporter);

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
): Promise<DetectedArchitecture | undefined> {
  const context: AnalyzerContext = { root };
  const applicable = await services.analyzers.applicable(context);
  if (applicable.length === 0) return undefined;

  const detections: DetectedConcept[] = [];
  for (const analyzer of applicable) {
    detections.push(...(await analyzer.analyze(context)));
  }

  return {
    root,
    detectedAt: new Date().toISOString(),
    concepts: mergeConcepts(detections),
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
    reporter.info(`  ${name} (${confidence}) — ${detection.evidence.join(", ")}`);
  }
}

async function saveReport(
  architecture: DetectedArchitecture,
  services: Services,
  reporter: Reporter,
): Promise<void> {
  const { storage } = services;
  const mapDir = join(architecture.root, MAP_DIR);
  if (!(await storage.exists(mapDir))) return;

  const path = join(mapDir, "reports", "analysis.json");
  await storage.ensureDir(join(mapDir, "reports"));
  await storage.writeFile(path, `${JSON.stringify(architecture, null, 2)}\n`, {
    overwrite: true,
  });
  reporter.success(`Report saved to ${path}`);
}
