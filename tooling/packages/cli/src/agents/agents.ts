/**
 * Coding-agent definitions: the one place that knows how each supported agent is
 * recognized in a project, which instruction file MAP generates for it, and where
 * it discovers project-scoped Agent Skills.
 *
 * Everything else (profiler, planner, skills installer, `map sync`) reads this
 * table, so supporting another agent is a data change here plus, when its
 * instruction format differs, one compiler adapter. Paths come from each vendor's
 * published documentation; see docs/agents.md for sources and caveats.
 */

export type AgentId = "claude" | "codex" | "cursor" | "copilot" | "gemini";

export interface AgentMarker {
  /** Project-relative path of a file or directory. */
  readonly path: string;
  /** `confirmed` when the path is specific to this agent; `probable` when shared. */
  readonly certainty: "confirmed" | "probable";
}

export interface AgentDefinition {
  readonly id: AgentId;
  readonly name: string;
  /** Files or directories whose presence indicates the agent is configured. */
  readonly markers: readonly AgentMarker[];
  /** The `map sync` target (compiler adapter id) and its default output path. */
  readonly instructions: { readonly target: string; readonly output: string };
  /** Project-scoped skills directory this agent documents as its own. */
  readonly skillsDir: string;
  /** Other project skills directories the agent also reads (shared install). */
  readonly alsoReadsSkillsFrom: readonly string[];
  /** Short, honest note about support level shown by `map agents`/docs. */
  readonly note: string;
}

export const AGENTS: readonly AgentDefinition[] = [
  {
    id: "claude",
    name: "Claude Code",
    markers: [
      { path: "CLAUDE.md", certainty: "confirmed" },
      { path: ".claude", certainty: "confirmed" },
    ],
    instructions: { target: "claude", output: "CLAUDE.md" },
    skillsDir: ".claude/skills",
    alsoReadsSkillsFrom: [],
    note: "Native project skills in .claude/skills.",
  },
  {
    id: "codex",
    name: "OpenAI Codex",
    markers: [
      { path: ".codex", certainty: "confirmed" },
      // AGENTS.md is a cross-tool convention, so it only suggests Codex.
      { path: "AGENTS.md", certainty: "probable" },
      { path: ".agents/skills", certainty: "probable" },
    ],
    instructions: { target: "agents", output: "AGENTS.md" },
    skillsDir: ".agents/skills",
    alsoReadsSkillsFrom: [],
    note: "Reads AGENTS.md and repository skills in .agents/skills.",
  },
  {
    id: "cursor",
    name: "Cursor",
    markers: [
      { path: ".cursor", certainty: "confirmed" },
      { path: ".cursorrules", certainty: "confirmed" },
    ],
    instructions: { target: "cursor", output: ".cursor/rules/map.mdc" },
    skillsDir: ".cursor/skills",
    alsoReadsSkillsFrom: [".claude/skills"],
    note: "Project rules in .cursor/rules; also reads .claude/skills.",
  },
  {
    id: "copilot",
    name: "GitHub Copilot",
    markers: [
      { path: ".github/copilot-instructions.md", certainty: "confirmed" },
      { path: ".github/instructions", certainty: "confirmed" },
      { path: ".github/skills", certainty: "probable" },
    ],
    instructions: { target: "copilot", output: ".github/copilot-instructions.md" },
    skillsDir: ".github/skills",
    alsoReadsSkillsFrom: [".claude/skills"],
    note: "Skills for Copilot agent mode, CLI, and cloud agent; also reads .claude/skills.",
  },
  {
    id: "gemini",
    name: "Gemini CLI",
    markers: [
      { path: "GEMINI.md", certainty: "confirmed" },
      { path: ".gemini", certainty: "confirmed" },
    ],
    instructions: { target: "gemini", output: "GEMINI.md" },
    skillsDir: ".gemini/skills",
    alsoReadsSkillsFrom: [],
    note: "Workspace skills in .gemini/skills (experimental in Gemini CLI; may need enabling).",
  },
];

export const AGENT_IDS: readonly AgentId[] = AGENTS.map((agent) => agent.id);

export function agentById(id: string): AgentDefinition | undefined {
  return AGENTS.find((agent) => agent.id === id);
}

/** The agent whose `map sync` target id is `target` (e.g. "agents" → codex). */
export function agentForTarget(target: string): AgentDefinition | undefined {
  return AGENTS.find((agent) => agent.instructions.target === target);
}

/**
 * Parse a comma-separated agent list from a flag. Unknown ids are returned
 * separately so the caller can report them instead of silently dropping them.
 */
export function parseAgentList(value: string): {
  readonly agents: readonly AgentId[];
  readonly unknown: readonly string[];
} {
  const agents: AgentId[] = [];
  const unknown: string[] = [];
  for (const raw of value.split(",")) {
    const id = raw.trim().toLowerCase();
    if (id === "") continue;
    const agent = agentById(id);
    if (agent === undefined) unknown.push(id);
    else if (!agents.includes(agent.id)) agents.push(agent.id);
  }
  return { agents: sortAgents(agents), unknown };
}

export function sortAgents(ids: readonly AgentId[]): AgentId[] {
  return [...new Set(ids)].sort((a, b) => AGENT_IDS.indexOf(a) - AGENT_IDS.indexOf(b));
}

/**
 * The smallest set of project skill directories that every selected agent reads.
 * Agents are visited in table order, so Claude's directory is chosen first and then
 * reused by Cursor and Copilot, which also read it. The result maps each directory
 * to the agents served by it.
 */
export function skillDirectoriesFor(
  agents: readonly AgentId[],
): ReadonlyArray<{ readonly dir: string; readonly agents: readonly AgentId[] }> {
  const chosen: Array<{ dir: string; agents: AgentId[] }> = [];
  for (const id of sortAgents(agents)) {
    const agent = agentById(id);
    if (agent === undefined) continue;
    const readable = [agent.skillsDir, ...agent.alsoReadsSkillsFrom];
    const existing = chosen.find((entry) => readable.includes(entry.dir));
    if (existing !== undefined) existing.agents.push(id);
    else chosen.push({ dir: agent.skillsDir, agents: [id] });
  }
  return chosen;
}
