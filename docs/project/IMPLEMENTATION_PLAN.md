# Implementation plan

Tracking issue: [#103](https://github.com/rajanbor/map/issues/103)

## Workstream A — contracts

1. Freeze vocabulary, compatibility, result envelopes, and security boundaries.
2. Ship Pattern Schema v1, scan-result, and recommendation-result schemas.
3. Extend shared TypeScript types and parsers from those contracts.

Exit: schemas have guides, complete valid examples, invalid fixtures, and CI coverage.

## Workstream B — graph and registry

1. Preserve flat `related` as compatible author input.
2. Normalize it to typed `works_with` edges while accepting explicit typed relations.
3. Build the runtime graph from registry data and reject dangling edges.
4. Expose deterministic text and JSON graph queries.

Exit: every registry entry is a graph node and graph output is stable.

## Workstream C — CLI workflow

1. Add compatible discovery aliases: `list`, `search`, `show`, `scan`, `suggest`.
2. Add JSON scan and recommendation envelopes.
3. Add certainty and limitation reporting without changing raw confidence.
4. Add `validate` for public MAP artifacts.

Exit: the acceptance scenario in `MVP.md` passes locally and in CI.

## Workstream D — dogfood and release readiness

1. Refresh the bundled registry and fail CI when it drifts.
2. Scan MAP's tooling workspace and retain a sanitized example result.
3. Update README, changelog, command reference, roadmap, and implementation report.
4. Run registry/schema validation, build, lint, typecheck, tests, audit, installer, and
   CLI smoke tests.

Exit: the consolidated repository tells one accurate story and the MVP is reproducible
from a clean clone.

