# Plan v1

`map plan --json` describes what `map init` would set up, without writing anything.
`map init --json` returns the same plan plus what was applied.

Machine contract: [`plan.schema.json`](../../schemas/plan.schema.json).

## Fields

| Field | Meaning |
|---|---|
| `schemaVersion`, `kind` | `1` and `"map.plan"`. |
| `workspace` | `"new"` when no `.map/map.config.json` exists yet, else `"existing"`. |
| `project`, `probable`, `workspaces` | Summary of the [project profile](project-profile.md). |
| `agents` | `detected`, `selected`, and `selectedBy` (`flag`, `config`, `detected`, or `default`). |
| `profiles` | `selected` profiles and `suggested` ones matching the detected stack. |
| `skills.sources` | Each skill source with its resolved revision and whether a cached copy was used (`stale`). |
| `skills.recommendations[]` | Installable skills with reasons, evidence, approvals needed (`scripts`, `risky`), audit counts, and destinations. |
| `skills.unavailable[]` | Skills a rule or profile wanted that no configured source provides. |
| `skills.gaps[]` | Needs with no known skill (`need` is prose, never an installable id). |
| `patterns[]` | Pattern recommendations from the AI-architecture scan and selected profiles, with registry status. |
| `changes[]` | `{ path, action, owner, reason }`; `action` is `create`, `update`, `keep`, or `conflict`. |
| `conflicts[]` | Changes MAP will not make without explicit user action. |
| `approvals[]` | Decisions the user must make (skills to install, scripts, conflicts). |
| `security[]`, `limitations[]` | Always non-empty. |

There is no `overwrite` action: MAP never plans to replace a user-owned file.

## Example

See [`fixtures/plan/valid/nextjs.json`](../../schemas/fixtures/plan/valid/nextjs.json).

## Compatibility

New in this release.
