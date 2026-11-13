# Architecture

MAP is a local, deterministic CLI. It reads a project as data, plans configuration,
and writes only files it owns or the user approved. It never runs project code, skill
scripts, or a language model.

```text
                 project files (read as data)
                            │
            ┌───────────────┴────────────────┐
            ▼                                ▼
     Project Profiler                  AI concept scan
     (stack + agents)            (dependency manifests)
            │                                │
            ▼                                ▼
  skill rules + profiles           pattern rule table
            │          skill catalog          │
            │   (git/local sources, audit)    │
            └──────────────┬──────────────────┘
                           ▼
                        Planner ── map plan (read-only)
                           │
                           ▼
                    map init (apply)
        ┌──────────────────┼────────────────────┐
        ▼                  ▼                    ▼
   .map/ workspace   context compiler     skill installer
   (source of        (map sync, with      (lockfile, safe
    truth)            ownership hashes)    project writes)
```

## Modules

All CLI code lives in [`tooling/packages/cli/src`](../tooling/packages/cli/src):

| Module | Responsibility |
|---|---|
| `project/` | Project Profiler: bounded traversal, evidence with `confirmed`/`probable` certainty, nested workspaces. `detect.ts` derives `map init` config facts from it. |
| `agents/` | One table of supported agents: detection markers, instruction target, skills directory, shared-directory rules. |
| `analyzer/`, `recommendation/` | AI-architecture concept scan from dependency manifests and the pattern rule table (`map scan`, `map suggest`). |
| `skills/` | Agent Skills: metadata validation, git/local sources, catalog, audit, lockfile, installer, recommendations, and the use cases shared by commands. |
| `profiles/` | Development profiles as data: skill names, pattern ids, conventions. |
| `plan/` | Planner (`buildPlan`) and the non-destructive workspace apply step used by `map init`. |
| `compiler/` | `.map/` → agent instruction files, with content-hash ownership and conflict detection. |
| `knowledge/`, `graph/` | Pattern registry loading (bundled snapshot, user cache, override) and the relationship graph. |
| `config/`, `scaffold/`, `storage/`, `reporting/` | `map.config.json` parsing, template rendering, filesystem port, output. |
| `cli/` | Commander wiring and thin command handlers. |

Two small packages stay separate because they are published on npm as independent
contracts: `@missing-ai-patterns/registry` (registry document types and parser) and
`@missing-ai-patterns/score` (MAP Score). Inside this repository the CLI is their only
consumer; merging them would break their published import paths for no gain.

## Boundaries and rules

- **Deterministic core** ([ADR-0002](../.map/decisions/0002-framework-neutral-deterministic-core.md)).
  Identical inputs give identical outputs; JSON arrays have documented ordering.
- **Static analysis first** ([ADR-0005](../.map/decisions/0005-static-analysis-before-assisted-analysis.md)).
  The profiler reads allowlisted marker files with size caps and never follows symlinks.
- **Versioned JSON** ([ADR-0004](../.map/decisions/0004-versioned-cli-json-contracts.md)).
  `--json` output carries `schemaVersion` and `kind`; schemas live in
  [`library/schemas`](../library/schemas/).
- **Skills trust model** ([ADR-0007](../.map/decisions/0007-agent-skills-and-trust-model.md)).
  See [skills.md](skills.md#security-model).
- **Network.** Only git skill sources (`map skills …`, `map plan`, `map init` when no
  cache exists or `--refresh` is given) and `map update` (pattern registry) use the
  network. `--no-skills` and `MAP_OFFLINE=1` make every command offline.

## Trust levels

| Level | Examples | Treatment |
|---|---|---|
| Built-in metadata | agent table, profiles, rule tables, bundled registry snapshot | Trusted; reviewed in this repository. |
| User configuration | `map.config.json`, chosen skill sources | Validated (paths, URLs, refs); followed as the user's intent. |
| External content | fetched skills, downloaded registry | Untrusted: structurally validated, audited, never executed. |
| Approved skills | entries in `skills.lock.json` | Installed as files only; approval grants no permission to run code. |
| Executable scripts | `scripts/` in skills | Never run by MAP; execute bit kept only with `--allow-scripts`. |

## Repository assessment (November 2026)

The audit before this change found, from the code rather than the docs:

- **Working:** pattern registry build and validation (96 patterns, 5 published),
  dependency-manifest scanner, rule-based pattern recommendations, context compiler
  for five targets, token optimizer, doctor, and 146 passing tests.
- **Gaps:** detection covered root-level languages only (no frameworks, agents, or
  nested projects); no skills support; `map sync` overwrote hand-written
  `CLAUDE.md`/`AGENTS.md` without warning; `map add` trusted registry file names
  (path traversal through a tampered registry cache); `pnpm map` crashed because one
  constructor used TypeScript-only syntax.
- **Dead code:** an unused knowledge-base abstraction, an unused plugin interface, a
  null recommender, an unused rich `Pattern` type, and a placeholder `diff` command.
- **Duplication:** GitHub workflows and templates under `library/.github` and
  `tooling/.github` that GitHub never runs, duplicate license and editor config,
  three places for specification prose, and roughly 1,000 lines of planning and audit
  documents describing intended rather than actual behavior.

This change removed the dead code and duplicates, moved repository metadata to the
root `.github/`, put each schema guide next to its schema, and kept the
`library`/`tooling`/`apps` layout: the pattern library, the CLI workspace, and the
website have different contributors, licenses for content, and release cycles, so
merging them would not simplify anything real.
