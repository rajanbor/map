/**
 * Parses argv, selects a command, and runs it. Uses Node's built-in `parseArgs` so
 * the CLI has no argument-parsing dependency. Value flags use `--key=value`; bare
 * `--flag` is boolean.
 */

import { parseArgs } from "node:util";
import { CommandRegistry } from "./command-registry.ts";
import { registerBuiltinCommands } from "./commands/index.ts";
import type { Command, CommandContext, FlagValue } from "./command.ts";
import { ConsoleReporter } from "../reporting/index.ts";
import type { Reporter } from "../reporting/index.ts";
import { createDefaultServices } from "../services.ts";
import type { Services } from "../services.ts";

const VERSION = "0.0.0";

export interface RunnerDeps {
  readonly registry?: CommandRegistry;
  readonly services?: Services;
  readonly reporter?: Reporter;
  readonly cwd?: string;
}

export async function runCli(
  argv: readonly string[],
  deps: RunnerDeps = {},
): Promise<number> {
  const reporter = deps.reporter ?? new ConsoleReporter();
  const registry = deps.registry ?? defaultRegistry();
  const services = deps.services ?? createDefaultServices();
  const cwd = deps.cwd ?? process.cwd();

  const { values, positionals } = parseArgs({
    args: [...argv],
    allowPositionals: true,
    strict: false,
    options: {
      help: { type: "boolean", short: "h" },
      version: { type: "boolean", short: "v" },
      force: { type: "boolean", short: "f" },
    },
  });

  const flags = values as Record<string, FlagValue>;
  const [commandName, ...rest] = positionals;

  if (flags["version"] === true && commandName === undefined) {
    reporter.info(`map ${VERSION}`);
    return 0;
  }

  if (commandName === undefined) {
    printHelp(registry, reporter);
    return 0;
  }

  const command = registry.get(commandName);
  if (!command) {
    reporter.error(`Unknown command: ${commandName}`);
    printHelp(registry, reporter);
    return 1;
  }

  if (flags["help"] === true) {
    printCommandHelp(command, reporter);
    return 0;
  }

  const context: CommandContext = {
    cwd,
    args: rest,
    flags,
    services,
    reporter,
  };

  try {
    const result = await command.run(context);
    return result.exitCode;
  } catch (error) {
    reporter.error(errorMessage(error));
    return 1;
  }
}

function defaultRegistry(): CommandRegistry {
  const registry = new CommandRegistry();
  registerBuiltinCommands(registry);
  return registry;
}

function printHelp(registry: CommandRegistry, reporter: Reporter): void {
  reporter.info("MAP — AI architecture analysis (foundation)");
  reporter.info("");
  reporter.info("Usage: map <command> [options]");
  reporter.info("");
  reporter.info("Commands:");
  for (const command of registry.list()) {
    reporter.info(`  ${command.name.padEnd(12)} ${command.summary}`);
  }
  reporter.info("");
  reporter.info("Run 'map <command> --help' for details.");
}

function printCommandHelp(command: Command, reporter: Reporter): void {
  reporter.info(command.summary);
  if (command.usage) reporter.info(`Usage: ${command.usage}`);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
