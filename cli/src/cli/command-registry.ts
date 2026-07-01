/**
 * Holds the set of available commands and looks them up by name. Also an extension
 * point: plugins register commands here.
 */

import type { Command } from "./command.ts";

export class CommandRegistry {
  private readonly commands = new Map<string, Command>();

  register(command: Command): void {
    this.commands.set(command.name, command);
  }

  get(name: string): Command | undefined {
    return this.commands.get(name);
  }

  list(): readonly Command[] {
    return [...this.commands.values()].sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }
}
