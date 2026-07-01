/**
 * Module 5 — CLI: the command contract.
 *
 * Every command implements this interface. Commands are thin: they read the parsed
 * context, call into the core modules through `services`, and report through
 * `reporter`. No command talks to the filesystem or console directly.
 */

import type { Services } from "../services.ts";
import type { Reporter } from "../reporting/index.ts";

export type FlagValue = string | boolean;

export interface CommandContext {
  /** Directory the command runs against (usually process.cwd()). */
  readonly cwd: string;
  /** Positional arguments after the command name. */
  readonly args: readonly string[];
  /** Parsed --flags. */
  readonly flags: Readonly<Record<string, FlagValue>>;
  readonly services: Services;
  readonly reporter: Reporter;
}

export interface CommandResult {
  readonly exitCode: number;
}

export interface Command {
  readonly name: string;
  readonly summary: string;
  readonly usage?: string;
  run(context: CommandContext): Promise<CommandResult>;
}

export const OK: CommandResult = { exitCode: 0 };
export const FAILED: CommandResult = { exitCode: 1 };
