export { runCli } from "./runner.ts";
export type { RunnerDeps } from "./runner.ts";
export { CommandRegistry } from "./command-registry.ts";
export type {
  Command,
  CommandContext,
  CommandResult,
  FlagValue,
} from "./command.ts";
export { OK, FAILED } from "./command.ts";
export { registerBuiltinCommands } from "./commands/index.ts";
export { initCommand } from "./commands/init.ts";
