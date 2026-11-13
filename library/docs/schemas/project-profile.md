# Project profile v1

`map detect --json` prints the Project Profiler result: the languages, frameworks,
infrastructure, tooling, and coding agents found in a repository, each backed by
file-level evidence. `map plan --json` embeds its `project` and `probable` summaries.

Machine contract: [`project-profile.schema.json`](../../schemas/project-profile.schema.json).

## Fields

| Field | Meaning |
|---|---|
| `schemaVersion`, `kind` | `1` and `"map.project-profile"`. |
| `root` | Absolute path that was profiled. |
| `project` | Signals with at least one **confirmed** piece of evidence, by category. |
| `probable` | Signals backed only by **probable** evidence (shared or indirect markers). |
| `workspaces` | The root plus every nested directory that declares its own manifest. |
| `evidence[]` | `{ signal, category, certainty, file, detail }`, sorted deterministically. |
| `traversal` | Depth and directory limits used and whether traversal stopped early. |
| `limitations` | Always present; states that missing signals are unknown, not absent. |

`certainty` is `confirmed` (the file is specific to the technology, such as
`tsconfig.json` or a declared `next` dependency) or `probable` (it suggests the
technology, such as a Postgres client library or an `AGENTS.md` file that several
tools read). There is no "absent" value by design.

## Example

See [`fixtures/project-profile/valid/nextjs.json`](../../schemas/fixtures/project-profile/valid/nextjs.json).

## Compatibility

New in this release. `map scan --json` (scan-result v1) is unchanged; it reports AI
architecture concepts, while the profile reports the general technology stack.
