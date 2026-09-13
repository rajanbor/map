# MVP implementation report

Status date: 2026-09-13  
Tracking issue: [#103](https://github.com/rajanbor/map/issues/103)

## Outcome

MAP now has a documented and working deterministic architecture-layer MVP. It keeps
the existing pattern catalog and `.map/` context compiler, adds enforced public
contracts, exposes a queryable pattern graph, and completes a local workflow from
discovery through structural validation.

The implementation was delivered as reviewable stages:

- [#104](https://github.com/rajanbor/map/pull/104): repository audit and baseline;
- [#105](https://github.com/rajanbor/map/pull/105): product, architecture,
  specifications, security model, and ADRs;
- [#106](https://github.com/rajanbor/map/pull/106): Pattern Schema v1;
- [#107](https://github.com/rajanbor/map/pull/107): deterministic CLI MVP and result
  schemas.

## Implemented

### Contracts

- Six offline-validated JSON Schema contracts: document, project, decision, pattern,
  scan result, and recommendation result.
- Pattern and anti-pattern base model with stable slash IDs, lifecycle, evidence,
  MAP Score, legacy relations, and six typed relation kinds.
- Complete valid fixtures and at least three invalid fixtures per schema.
- Repository validation for every published `pattern.yaml`, directory identity,
  required files, duplicate IDs, and relationship targets.

### CLI and core

- `list`, `search`, and `show`, with JSON discovery output.
- `scan` with evidence, confidence, certainty, inspected inputs, analyzers, and limits.
- `suggest` with deterministic priorities, triggers, and rationales.
- `graph` over 96 catalog nodes and 37 normalized typed edges.
- `validate` for `.map/map.config.json` and adopted-pattern file integrity.
- Backward-compatible `patterns`, `explain`, `analyze`, and `recommend` commands.
- Existing `init`, `add`, `sync`, `watch`, `optimize`, `doctor`, and `update` behavior
  retained.

### Operations

- GitHub-only installer remains the documented distribution path.
- Bundled registry snapshot refreshed from the consolidated monorepo.
- CI now fails when the snapshot content differs from the registry built from source.
- README and library entry points describe the actual monorepo and install path.

## Dogfood result

The built CLI was run against MAP itself:

```text
map scan tooling --json       valid map.scan-result
map suggest tooling --json    valid map.recommendation-result
map graph retrieval/chunking --json
                              1 selected node, 6 outgoing works_with edges
map validate --json           valid; .map/map.config.json checked
```

The retained [self-scan example](../examples/map-self-scan.json) sanitizes the local
path. It contains no detections because the selected root `tooling/package.json` has no
AI runtime dependency. Crucially, it reports that nested workspaces and source code
were not inspected; the result is limited evidence, not a claim that MAP contains no
AI-related architecture.

## Verification evidence

```text
registry builder:  96 patterns, pass
schema validator:   6 contracts, pass
build:               pass
lint:                pass
typecheck:           pass
tests:             146 pass (130 CLI, 13 score, 3 registry)
pnpm audit:           no known vulnerabilities
installer smoke:     pass in required CI job
CLI JSON smoke:      scan, suggest, graph, validate pass
```

## Known limits

- The scanner reads supported manifests only at the selected root. It does not yet
  traverse monorepos or parse source and runtime behavior.
- Current pattern metadata uses legacy `related` lists. The graph deliberately
  normalizes these to `works_with`; stronger relation semantics require author review.
- The rule-based recommender uses detected concepts, not declared project intent or
  verified adopted-pattern state.
- `validate` proves contract and file integrity, not pattern implementation.
- Anti-patterns can be modeled and validated, but none is published in the catalog yet.
- MCP, architecture diff, semantic indexing, and LLM-assisted analysis are deferred
  adapters.
- The npm package is not published; installation is from GitHub.

## Recommended next increments

1. Add bounded monorepo discovery with include/exclude rules and evidence de-duplication.
2. Migrate reviewed pattern relations from legacy lists to explicit typed claims.
3. Define adopted intent and verification checks before graph-backed recommendation
   ranking.
4. Publish the first anti-pattern with evidence and a `solves` relation.
5. Align library and SDK version streams before promising npm distribution.
6. Implement a read-only MCP adapter only after the core API contract is stable.

