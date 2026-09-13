# Pattern Schema Specification

| | |
|---|---|
| **Status** | Implemented (Pattern Schema v1) |
| **Issue** | [#77](https://github.com/rajanbor/map/issues/77) |
| **Owner** | @rajanbor |

## Summary

`pattern.yaml` is formalized as JSON Schema (`schemas/pattern.schema.json`) and enforced
in the registry build. Today validation is implicit in what `scripts/build-registry.ts`
happens to read; a wrong key or a misspelled list silently disappears from the registry
instead of failing the PR. The [pattern contract](../pattern-contract.md) promised a
formal schema "once a second pattern adopts the contract" — four patterns have.

## Motivation

Current failure modes, all silent:

- A typo'd key (`when_to_us:`) is ignored; the registry entry just lacks guidance.
- A `related:` list accidentally indented becomes a scalar and vanishes.
- New contributors have no machine-checkable definition of what a valid
  `pattern.yaml` is — they copy the newest pattern and hope.
- Tools beyond the registry builder (CLI scaffolding, the future website) each
  re-derive the shape from examples.

The registry build already fails on score ranges, category mismatches, and dangling
`related:` ids; the schema extends that to the whole document.

## Design

- **`schemas/pattern.schema.json`** — JSON Schema (draft 2020-12) describing
  `pattern.yaml` after YAML parsing. Required: `id`, `name`, `category`, `slug`,
  `summary`, `score` (all five dimensions, integer 1..5). Optional: `maturity`
  (`emerging | established | declining`), `also_known_as`, `when_to_use`,
  `when_not_to_use`, `related` (ids matching `^[a-z-]+/[a-z0-9-]+$`), `references`
  (URIs), `files`. `additionalProperties: false` — unknown keys are errors, with an
  `x_` prefix escape hatch for experiments.
- **Validation** stays in the dependency-free registry build: the builder's parser
  gains a small structural validator driven by the schema file (no ajv dependency;
  the schema is the source of truth, the validator implements the subset it uses —
  types, required, enum, pattern, integer ranges).
- **Consumers**: the CLI and website can validate scaffolded/edited files against the
  same published schema; the schema ships as a release asset next to
  `registry.json`.
- The informal shape in [`pattern-contract.md`](../pattern-contract.md) is replaced by
  a link to the schema.

## Implementation

The schema, valid examples, and malformed fixtures live under `library/schemas/`.
`scripts/validate-schemas.ts` validates the fixtures and every published
`pattern.yaml`, including directory identity, required files, duplicate IDs, and
relationship targets. The release workflow already attaches every `*.schema.json`
file alongside the registry.

## Acceptance criteria

- [x] A PR with a misspelled `pattern.yaml` key fails the `registry` check with a message naming the file and key.
- [x] All published patterns validate unchanged.
- [x] The schema is published with each release and referenced from the schema guide.

## Compatibility & risks

Additive for valid content; strict `additionalProperties` may break future in-flight
pattern PRs using ad-hoc keys — the `x_` prefix and a clear error message are the
migration path. No registry `schemaVersion` change (the artifact shape is untouched).
Rollback: remove the validator call; the schema file is inert documentation.

## Alternatives considered

- **ajv (or similar) in the build** — rejected: the repo's only script is
  deliberately dependency-free; a vendored validator for the used subset is smaller
  than the dependency's lockfile.
- **Validate in the CLI instead** — rejected: the contract must fail at content
  review time, in this repo, not downstream.
- **Keep the informal contract** — rejected: it already drifted once (four patterns
  adopted a contract documented as "first example: chunking").
