/**
 * Builds the Commander program from the command registry and runs it.
 *
 * Commander is an implementation detail of this file: commands declare their
 * surface on the `Command` contract and never import Commander themselves, so
 * plugins can register commands without depending on the parsing library.
 */

import { Command as CommanderCommand, CommanderError } from "commander";
import { CommandRegistry } from "./command-registry.ts";
import { registerBuiltinCommands } from "./commands/index.ts";
import type { Command, CommandContext, FlagValue } from "./command.ts";
import { ConsoleReporter } from "../reporting/index.ts";
import type { Reporter } from "../reporting/index.ts";
import { createDefaultServices } from "../services.ts";
import type { Services } from "../services.ts";
import { packageVersion } from "../assets.ts";

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

  let exitCode = 0;

  const program = new CommanderCommand("map")
    .description("MAP — prepare, configure, and maintain AI coding environments across projects and agents.")
    .version(packageVersion(), "-v, --version")
    .exitOverride()
    .configureOutput({
      writeOut: (text) => reporter.info(text.trimEnd()),
      writeErr: (text) => reporter.error(text.trimEnd()),
    });

  for (const command of registry.list()) {
    attach(program, command, { cwd, services, reporter }, (code) => {
      exitCode = code;
    });
  }

  if (argv.length === 0) {
    program.outputHelp();
    return 0;
  }

  try {
    await program.parseAsync([...argv], { from: "user" });
  } catch (error) {
    return handleCommanderExit(error, reporter, exitCode);
  }
  return exitCode;
}

function attach(
  program: CommanderCommand,
  command: Command,
  base: Pick<CommandContext, "cwd" | "services" | "reporter">,
  setExitCode: (code: number) => void,
): void {
  const sub = program.command(command.name).description(command.summary);
  if (command.subcommands !== undefined && command.subcommands.length > 0) {
    for (const child of command.subcommands) attach(sub, child, base, setExitCode);
    sub.action(async () => {
      sub.outputHelp();
      setExitCode(1);
    });
    return;
  }
  if (command.args !== undefined) {
    for (const arg of command.args.split(/\s+/).filter((a) => a !== "")) sub.argument(arg);
  }
  for (const option of command.options ?? []) {
    sub.option(option.flags, option.description);
  }

  sub.action(async (...invocation) => {
    // Commander passes declared positionals (variadic ones as arrays), then the
    // options object, then itself.
    const args = invocation
      .slice(0, -2)
      .flatMap((a: unknown) => (Array.isArray(a) ? a : [a]))
      .filter((a): a is string => typeof a === "string");
    const flags = invocation[invocation.length - 2] as Record<string, FlagValue>;

    try {
      const result = await command.run({ ...base, args, flags });
      setExitCode(result.exitCode);
    } catch (error) {
      base.reporter.error(error instanceof Error ? error.message : String(error));
      setExitCode(1);
    }
  });
}

/**
 * `exitOverride` turns every Commander-initiated exit (help, version, unknown
 * command, bad option) into a thrown CommanderError; map it to an exit code.
 */
function handleCommanderExit(error: unknown, reporter: Reporter, current: number): number {
  if (error instanceof CommanderError) {
    if (error.code === "commander.helpDisplayed" || error.code === "commander.version") {
      return current;
    }
    if (error.code === "commander.help") {
      // Help shown because no/unknown subcommand; Commander already printed it.
      return error.exitCode === 0 ? current : error.exitCode;
    }
    return error.exitCode;
  }
  reporter.error(error instanceof Error ? error.message : String(error));
  return 1;
}

function defaultRegistry(): CommandRegistry {
  const registry = new CommandRegistry();
  registerBuiltinCommands(registry);
  return registry;
}
