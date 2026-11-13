# Limitations and roadmap

## Current limitations

- **Distribution.** Install from this Git repository (`scripts/install.sh`). The
  `@missing-ai-patterns/cli` 0.5.1 release on npm predates the features described
  here (no `plan`, `detect`, or `skills`).
- **Detection is static.** The profiler reads marker files and declared dependencies
  to a depth of three directories. It does not parse source code, so it cannot tell
  whether a declared library is used, and it cannot detect API authentication or
  security controls. Probable signals (database clients, `AGENTS.md`) are labeled.
- **One default skill source.** Recommendations name skills from configured sources
  only; the default source is a personal collection, partly in Polish. Add your own
  sources in `map.config.json`.
- **Skill audit is heuristic.** It catches known risky patterns, not every harmful
  instruction.
- **Project scope only.** Skills install into the project, not into `~/.claude` or
  other global directories.
- **Agent paths move.** Skill directories for Cursor, Copilot, and Gemini CLI are
  recent features; Gemini CLI marks skills experimental.
- **Agent settings are not managed.** MAP writes instruction files and skills, not
  permissions, hooks, MCP servers, or model settings.
- **Patterns.** 5 of 96 catalog patterns are published; the rest are planned or in
  progress and can be read with `map show` but not adopted with `map add`.

## Planned

- Source-code analyzers (imports, framework configuration) as separate, opt-in
  adapters with explicit provenance.
- Optional skill-to-pattern links validated in Pattern Schema v2.
- Signed or checksummed skill source indexes.
- Read-only MCP adapter over the same planner and catalog
  ([ADR-0006](../.map/decisions/0006-mcp-as-a-separate-adapter.md)).
- A verification result contract for checking pattern acceptance criteria.
- An npm release of the current CLI.
