# MVP

## Included

- Pattern Schema v1 and typed relationship vocabulary.
- Registry compatibility with current `category/slug` IDs and flat `related` input.
- Deterministic catalog commands: `list`, `search`, and `show` plus existing aliases.
- Static dependency-manifest scanning through `scan` and existing `analyze`.
- Versioned JSON scan results with evidence, certainty, and limitations.
- Explainable rule-based suggestions through `suggest` and existing `recommend`.
- Versioned JSON recommendation results.
- A working graph command over registry nodes and relationships.
- Validation of repository pattern metadata and initialized `.map` project manifests.
- GitHub-only install, offline bundled catalog, tests, documentation, and dogfooding.

## Explicitly deferred

- Source-code AST and semantic scanners.
- Runtime telemetry ingestion and automated implementation verification.
- MCP server and remote registry API.
- LLM-assisted inference, natural-language graph queries, and auto-remediation.
- Executable third-party plugin loading.
- A stable npm distribution promise.

## Acceptance scenario

Given a local JavaScript or Python AI project, a user can run:

```bash
map init
map scan . --json
map suggest . --json
map search retrieval
map show retrieval/chunking --json
map graph retrieval/chunking --json
map validate
map sync
```

All commands run without an LLM. Output identifies the registry or result schema
version, and existing command names still produce their established text behavior.

