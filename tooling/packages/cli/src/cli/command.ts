/**
 * Module 5 — CLI: the command contract.
 *
 * Every command implements this interface. Commands are thin: they read the parsed
 * context, call into the core modules through `services`, and report through
 * `reporter`. No command talks to the filesystem or console directly.
 *
 * Commands are declarative about their surface (`args`, `options`); the runner
 * maps them onto the underlying argument parser (Commander). That keeps commands
 * and plugins independent of the parsing library.
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

/** A declared option, in Commander notation (e.g. `--category <category>`). */
export interface CommandOption {
  readonly flags: string;
  readonly description: string;
}

export interface Command {
  readonly name: string;
  readonly summary: string;
  readonly usage?: string;
  /** Positional argument spec, e.g. "[path]" or "<pattern-id>". */
  readonly args?: string;
  readonly options?: readonly CommandOption[];
  /** Nested commands (`map skills add`). A group may omit `run`'s real work. */
  readonly subcommands?: readonly Command[];
  run(context: CommandContext): Promise<CommandResult>;
}

export const OK: CommandResult = { exitCode: 0 };
export const FAILED: CommandResult = { exitCode: 1 };
