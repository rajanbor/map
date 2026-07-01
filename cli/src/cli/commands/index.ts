/**
 * Registers the built-in command set. `init`, `analyze`, and `recommend` are
 * implemented; the rest are scaffolded placeholders that map to the future modules
 * in `future/cli.md`.
 */

import type { CommandRegistry } from "../command-registry.ts";
import { initCommand } from "./init.ts";
import { analyzeCommand } from "./analyze.ts";
import { recommendCommand } from "./recommend.ts";
import { planned } from "./planned.ts";

export function registerBuiltinCommands(registry: CommandRegistry): void {
  registry.register(initCommand);
  registry.register(analyzeCommand);
  registry.register(recommendCommand);

  registry.register(
    planned({
      name: "graph",
      summary: "Build and inspect the pattern graph.",
      module: "Module 4 — Graph",
    }),
  );
  registry.register(
    planned({
      name: "doctor",
      summary: "Check the .map workspace and environment for problems.",
      module: "Module 5 — CLI",
    }),
  );
  registry.register(
    planned({
      name: "explain",
      summary: "Explain a detected architectural decision or a pattern.",
      module: "Module 1 — Knowledge Base",
    }),
  );
  registry.register(
    planned({
      name: "diff",
      summary: "Compare architecture between two revisions.",
      module: "Module 2 — Analyzer",
    }),
  );
  registry.register(
    planned({
      name: "patterns",
      summary: "List and search the MAP pattern catalog.",
      module: "Module 1 — Knowledge Base",
    }),
  );
}
