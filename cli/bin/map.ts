#!/usr/bin/env node
/**
 * Executable entry point for the `map` CLI.
 *
 * Runs on Node's native TypeScript support (>=22), so no build step is required for
 * the foundation. It parses argv and delegates everything to the runner.
 */

import { runCli } from "../src/cli/runner.ts";

const argv = process.argv.slice(2);
const exitCode = await runCli(argv);
process.exitCode = exitCode;
