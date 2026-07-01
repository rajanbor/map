/**
 * Public entry point for `@map/cli`.
 *
 * The CLI is one consumer of these modules; the same surface is meant to power a
 * website, an API, and AI agents later. Import from here rather than reaching into
 * deep paths.
 */

// Domain (Module 1 data model + graph/analysis/recommendation types)
export * from "./domain/index.ts";

// Core modules
export * from "./knowledge/index.ts";
export * from "./graph/index.ts";
export * from "./analyzer/index.ts";
export * from "./recommendation/index.ts";
export * from "./storage/index.ts";
export * from "./reporting/index.ts";
export * from "./config/index.ts";
export * from "./plugins/index.ts";

// Composition root
export { createDefaultServices } from "./services.ts";
export type { Services, ServiceOverrides } from "./services.ts";

// CLI (Module 5)
export { runCli } from "./cli/index.ts";
export type { RunnerDeps } from "./cli/runner.ts";
