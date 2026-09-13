# Changelog

## Unreleased — architecture-layer MVP

### Added

- Product, system, pattern graph, scanner, recommendation, verification, CLI, MCP, and
  security architecture documentation.
- AI-focused ADRs for the deterministic core, stable pattern identity, versioned CLI
  JSON, static analysis, and MCP isolation.
- Pattern Schema v1 plus scan and recommendation result schemas with fixtures.
- `map list`, `search`, `show`, `scan`, `suggest`, `graph`, and `validate`.
- Evidence certainty and explicit static-analysis limitations.
- Registry snapshot freshness enforcement in CI.

### Changed

- The YAML reader now supports folded and literal block strings used by pattern
  metadata.
- README and library documentation now use the GitHub-only installation path and
  consolidated monorepo structure.
- Saved analysis reports use the versioned scan-result envelope.

### Compatibility

- `map patterns`, `explain`, `analyze`, and `recommend` remain supported.
- Pattern IDs remain `category/slug` for schema version 1.
- Existing flat `related` metadata remains valid and maps to `works_with` graph edges.

Earlier CLI changes are recorded in [`tooling/CHANGELOG.md`](tooling/CHANGELOG.md).
