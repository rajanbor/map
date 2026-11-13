/**
 * Registers the built-in command set. Every registered command is implemented;
 * `analyze`, `recommend`, `patterns`, and `explain` are kept as compatible names
 * for `scan`, `suggest`, `list`/`search`, and `show`.
 */

import type { CommandRegistry } from "../command-registry.ts";
import { initCommand } from "./init.ts";
import { addCommand } from "./add.ts";
import { explainCommand, showCommand } from "./explain.ts";
import { analyzeCommand, scanCommand } from "./analyze.ts";
import { recommendCommand, suggestCommand } from "./recommend.ts";
import { listCommand, patternsCommand, searchCommand } from "./patterns.ts";
import { graphCommand } from "./graph.ts";
import { validateCommand } from "./validate.ts";
import { doctorCommand } from "./doctor.ts";
import { updateCommand } from "./update.ts";
import { syncCommand } from "./sync.ts";
import { watchCommand } from "./watch.ts";
import { optimizeCommand } from "./optimize.ts";
import { planCommand } from "./plan.ts";
import { detectCommand } from "./detect.ts";
import { profilesCommand } from "./profiles.ts";
import { skillsCommand } from "./skills.ts";

export function registerBuiltinCommands(registry: CommandRegistry): void {
  registry.register(initCommand);
  registry.register(addCommand);
  registry.register(syncCommand);
  registry.register(watchCommand);
  registry.register(explainCommand);
  registry.register(showCommand);
  registry.register(analyzeCommand);
  registry.register(scanCommand);
  registry.register(recommendCommand);
  registry.register(suggestCommand);
  registry.register(patternsCommand);
  registry.register(listCommand);
  registry.register(searchCommand);
  registry.register(graphCommand);
  registry.register(validateCommand);
  registry.register(doctorCommand);
  registry.register(updateCommand);
  registry.register(optimizeCommand);
  registry.register(detectCommand);
  registry.register(planCommand);
  registry.register(profilesCommand);
  registry.register(skillsCommand);
}
