/**
 * Public entry point for `@missing-ai-patterns/cli`.
 *
 * The CLI is one consumer of these modules; the same surface is meant to power a
 * website, an API, and AI agents later. Import from here rather than reaching into
 * deep paths.
 */

// Domain types
export * from "./domain/index.ts";

// Core modules
export * from "./knowledge/index.ts";
export * from "./graph/index.ts";
export * from "./analyzer/index.ts";
export * from "./recommendation/index.ts";
export * from "./storage/index.ts";
export * from "./reporting/index.ts";
export * from "./config/index.ts";
export * from "./project/index.ts";
export * from "./scaffold/index.ts";
export * from "./optimization/index.ts";
export * from "./agents/index.ts";
export * from "./profiles/index.ts";
export * from "./skills/index.ts";
export { buildPlan } from "./plan/planner.ts";
export type { Plan, PlanContext, PlanOptions, PlannedChange, PlannedSkill } from "./plan/planner.ts";

// Composition root
export { createDefaultServices } from "./services.ts";
export type { Services, ServiceOverrides } from "./services.ts";

// CLI (Module 5)
export { runCli } from "./cli/index.ts";
export type { RunnerDeps } from "./cli/runner.ts";
