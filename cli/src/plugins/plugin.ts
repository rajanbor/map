/**
 * Extensibility.
 *
 * MAP is designed to grow through plugins such as `map-analyzer-typescript`,
 * `map-analyzer-python`, or provider integrations. A plugin receives a small API at
 * startup and registers new capabilities. Keeping this surface tiny now avoids
 * locking us into the wrong extension shape later.
 *
 * TODO(plugins): discovery (load plugins from config / node_modules), provider
 * plugins (e.g. openai, anthropic), and lifecycle hooks.
 */

import type { Analyzer } from "../analyzer/index.ts";
import type { Command } from "../cli/command.ts";

/** What a plugin is allowed to do during setup. */
export interface PluginApi {
  registerAnalyzer(analyzer: Analyzer): void;
  registerCommand(command: Command): void;
}

export interface Plugin {
  readonly name: string;
  setup(api: PluginApi): void | Promise<void>;
}
