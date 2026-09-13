# Current state

Status date: 2026-09-13  
Audited revision: `f87c036` (`main`)  
Tracking issue: [#103](https://github.com/rajanbor/map/issues/103)

This document is the Phase 0 audit of MAP before the architecture-layer MVP. It
describes what is present and verified in the repository, not the intended future
state. Product intent and planned changes belong in the adjacent project and
architecture documents.

## Executive summary

MAP is already a functioning monorepo, not only a documentation collection. Its
strongest working path is:

```text
pattern Markdown + YAML -> validated registry -> CLI catalog
project manifests -> deterministic analyzer -> rule-based recommendations
.map source documents -> context compiler -> agent-specific instruction files
```

The repository has a sound framework-neutral foundation, five complete patterns,
a 96-entry catalog, a tested CLI, JSON schemas for MAP documents, and a static
website. The architecture-layer MVP is incomplete because the typed graph is not
connected to registry data or the CLI, pattern metadata has no enforced public
schema, scan and recommendation outputs lack stable schemas, and several desirable
command names are absent even though equivalent capabilities exist.

The baseline is healthy: registry and schema validation pass, all workspace builds,
lint and type checks pass, 140 automated tests pass across the packages, and
`pnpm audit` reports no known vulnerabilities.

## Repository inventory

| Area | Current role | State |
|---|---|---|
| `.map/` | MAP's own source context, decisions, agent rules, prompts, evals, and tool policy | Active and compiled into root agent files |
| `library/` | Pattern knowledge base, roadmap, schemas, examples, references, RFCs, registry builder | Active; canonical pattern source |
| `tooling/packages/registry/` | Shared registry types and validating parser | Active |
| `tooling/packages/score/` | MAP Score model and renderers | Active |
| `tooling/packages/cli/` | CLI, analyzers, recommender, graph primitives, compiler, installer payload | Active |
| `apps/website/` | Static registry-driven catalog site | Active |
| `docs/` | Repository-level getting-started and structure documentation | Present but too small for the product architecture |

At the audited revision the repository contains 317 tracked files, including 118
TypeScript files, 110 Markdown files, and 23 TypeScript test files.

## Pattern library and registry

The roadmap contains 96 pattern identifiers across ten categories. Five patterns
are complete and published:

- `retrieval/chunking`
- `security/prompt-injection-defense`
- `agents/orchestrator-worker`
- `evaluation/llm-as-judge`
- `memory/conversation-memory`

Every published pattern includes a human guide, `pattern.yaml`, an implementation
prompt, acceptance criteria, and a Mermaid diagram. The registry builder merges the
roadmap with these directories and validates categories, MAP Score ranges, and
dangling related-pattern references.

Pattern identifiers currently use the stable `category/slug` form. Future formats
must not silently replace it. If aliases are added, slash-form identifiers remain
canonical throughout schema version 1.

### Current gaps

- `pattern.yaml` has a draft prose contract but no enforced JSON Schema.
- Relations are emitted as a flat `related` list, so their meaning is not
  machine-readable.
- Anti-patterns are not first-class records.
- Evidence, provenance, and confidence are not consistently modeled in pattern
  metadata.
- The CLI-bundled registry snapshot is valid but older than the repository source.
- Some library documentation still describes the CLI as a separate repository and
  shows an npm installation path that is not currently available.

## CLI capabilities

### Implemented and verified

| Command | Capability |
|---|---|
| `map init` | Creates a versioned `.map/` workspace without overwriting files |
| `map add` | Adopts a published pattern from the offline registry snapshot |
| `map sync` / `map watch` | Compiles canonical context into AGENTS, Claude, Gemini, Cursor, and Copilot formats |
| `map explain` | Shows a decision-focused view of a pattern |
| `map patterns` | Lists and searches the catalog; supports JSON output |
| `map analyze` | Detects AI concepts from root dependency manifests |
| `map recommend` | Applies deterministic rules to detected concepts |
| `map optimize` | Measures and enforces context-token budgets |
| `map doctor` | Checks workspace, compiler targets, registry, and references |
| `map update` | Refreshes the registry cache |

The dependency analyzer recognizes signals from npm, PyPI, Go, and Cargo manifests.
It detects concepts including model providers, RAG, embeddings, vector search, tool
calling, memory, evaluation, and observability. It does not parse source code and
only inspects supported manifests at the selected project root.

Recommendations are local and deterministic. A data-driven rule table maps detected
concepts and absent safeguards to prioritized pattern suggestions with human-readable
rationales. No language model or remote service is required.

### Present but not connected

- An in-memory typed graph supports `depends_on`, `works_with`, `alternative_to`,
  `extends`, `conflicts_with`, and `solves` edges.
- The graph has unit tests but is initialized empty and `map graph` is a placeholder.
- A richer internal `Pattern` domain interface contains several relationship fields
  but is not the registry contract used by commands.

### Missing or incomplete

- No `map validate` command.
- No stable `scan-result` or `recommendation-result` schema.
- `map analyze` and `map recommend` do not expose JSON flags.
- The requested discovery vocabulary (`list`, `show`, `search`, `scan`, `suggest`)
  is not available as compatible aliases.
- Detection confidence is numeric only; the human-friendly certainty states
  `detected`, `likely`, and `unknown` are not defined.
- The analyzer does not recursively discover monorepo manifests or inspect code,
  configuration, environment-variable names, or `.map/` evidence.
- Recommendations do not yet use graph relationships or declared project intent.
- Verification, architecture diff, MCP exposure, and optional semantic/LLM adapters
  are future work.

## Project memory and agent support

`.map/` is already the canonical source for project context. The compiler generates
tool-specific instruction files, preserving the source/generated boundary. Existing
documents define AI-agent principles and an ADR policy, and schemas exist for generic
documents, projects, and decisions.

The current `.map` layout is versioned and must remain readable. Architecture changes
should be introduced through manifest evolution and adapters rather than a destructive
directory rename. Generated reports and local registry cache are intentionally ignored
by Git.

## Website and delivery

The static website builds from registry data and deploys through GitHub Pages. CI has
two required jobs:

- `registry`: builds the catalog and validates schemas and fixtures;
- `sdk`: installs dependencies, builds, lints, type-checks, tests, checks the GitHub
  installer, and smoke-tests the CLI.

Releases currently have two streams: library releases use `v*`, while tooling uses
`sdk/v*`. The library reports version `0.5.0`; the CLI package reports `0.5.1`.
Release and versioning policy therefore needs an explicit architecture decision.

## Baseline verification

The following checks passed on 2026-09-13 before implementation changes:

```text
node library/scripts/build-registry.ts --check
  registry OK: 96 patterns

node library/scripts/validate-schemas.ts
  schemas OK: 3 contracts, repository and init manifests valid

pnpm build
pnpm lint
pnpm typecheck
pnpm test
  score:    13 tests passed
  registry:  3 tests passed
  CLI:      124 tests passed

pnpm audit --audit-level=low
  No known vulnerabilities found
```

## Risks and technical debt

| Risk | Impact | Required response |
|---|---|---|
| Registry, domain model, and draft pattern spec can drift | Tools may interpret the same pattern differently | Establish Pattern Schema v1 as the shared contract |
| Flat relationships lack semantics | Graph and recommendations cannot explain topology reliably | Add typed, validated edges with compatibility mapping |
| Bundled snapshot can lag source | Installed CLI gives stale catalog results | Add a deterministic freshness check and refresh workflow |
| Documentation reflects former multi-repository layout | Contributors follow incorrect install and branch instructions | Rewrite entry points for the consolidated repository |
| Command output is mainly prose | Agent integrations must scrape terminal text | Add versioned JSON result contracts and `--json` |
| Static analyzer scope is narrow | Absence of a signal may be mistaken for absence of a capability | Make evidence limits and certainty explicit |
| Status, maturity, and recommendation priority overlap conceptually | Humans and tools can misuse fields | Define each term and lifecycle independently |
| Public API intent is broader than exported stable contracts | Future adapters may couple to CLI internals | Define core ports and keep framework adapters at the edge |

## Constraints for the next phase

The implementation phase should preserve these working properties:

1. Core registry, graph, scanning, and recommendation behavior remains deterministic
   and does not require an LLM or network access.
2. Existing commands and slash-form pattern IDs continue to work.
3. `.map/` remains the canonical project source and generated files remain outputs.
4. Every new schema ships with a human guide, a complete valid example, invalid
   fixtures, and automated validation.
5. Detection reports evidence and limitations; unknown is never presented as absent.
6. Pattern claims, maturity, and relationships are not invented without evidence.
7. CI, the GitHub-only installer, and the offline catalog remain operational.

## Phase 0 conclusion

MAP does not need a rewrite. The shortest credible path is to formalize the contracts
already implicit in the repository, connect the graph that already exists, expose
stable machine-readable outputs, and align documentation with the consolidated
monorepo. MCP and optional semantic or LLM-assisted adapters should remain later edge
integrations after the deterministic CLI core is stable.
