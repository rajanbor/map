# Supported coding agents

MAP prepares configuration for coding agents; it does not replace them. Each agent
gets the instruction file it reads natively and, where it supports Agent Skills, a
project skills directory.

| Agent | Detected by | Instructions MAP generates (`map sync`) | Project skills directory |
|---|---|---|---|
| Claude Code (`claude`) | `CLAUDE.md`, `.claude/` | `CLAUDE.md` | `.claude/skills` |
| OpenAI Codex (`codex`) | `.codex/`; `AGENTS.md` and `.agents/skills` as probable | `AGENTS.md` | `.agents/skills` |
| Cursor (`cursor`) | `.cursor/`, `.cursorrules` | `.cursor/rules/map.mdc` (always-applied rule) | `.cursor/skills`; also reads `.claude/skills` |
| GitHub Copilot (`copilot`) | `.github/copilot-instructions.md`, `.github/instructions/`; `.github/skills` as probable | `.github/copilot-instructions.md` | `.github/skills`; also reads `.claude/skills` |
| Gemini CLI (`gemini`) | `GEMINI.md`, `.gemini/` | `GEMINI.md` | `.gemini/skills` (experimental in Gemini CLI; may need enabling) |

Skill directory paths follow each vendor's documentation as of November 2026
(Claude Code's skills documentation,
[Codex](https://developers.openai.com/codex/skills),
[Cursor](https://cursor.com/docs/context/skills),
[GitHub Copilot](https://docs.github.com/en/copilot/concepts/agents/about-agent-skills),
[Gemini CLI](https://geminicli.com/docs/cli/skills/)). These products change quickly;
if a path moves, the definitions live in one table in
[`src/agents/agents.ts`](../tooling/packages/cli/src/agents/agents.ts).

## What is shared and what is agent-specific

- **Shared:** everything under `.map/` — architecture notes, decisions, profiles,
  prompts, agent guidelines — compiles into every instruction file. Installed skills
  use the same `SKILL.md` format for every agent.
- **Agent-specific:** the instruction file format (Cursor's MDC frontmatter), where
  skills live, and how each agent decides to load a skill. Per-document
  `targets: [claude]` frontmatter limits a document to some agents.
- **Not managed:** agent settings such as permissions, models, MCP servers, and
  hooks. MAP does not write `.claude/settings.json` or similar files.

## Selecting agents

`map init` and `map plan` use, in order: `--agents claude,codex`, the `agents` list in
`map.config.json`, the agents detected in the project, or Claude Code plus Codex
(`AGENTS.md` is read by several tools) when nothing is detected.

## Ownership of generated files

Generated files start with a banner that includes `map-sha256:`, a hash of the file.
`map sync` regenerates files it owns and refuses to touch:

- a file without the banner (you wrote it) — move its content into `.map/`, then run
  `map sync --force`, which keeps a `*.map-backup-*` copy;
- a generated file edited by hand (the hash no longer matches).

`map sync --check` writes nothing and exits 1 when any output is missing, stale, or in
conflict — suitable for CI.

## Context size

Generated files contain your `.map/` documents only. Skills are never inlined: agents
discover installed skills natively from their skills directory and load the full
`SKILL.md` only when relevant. `map optimize` reports the context budget of `.map/`.
