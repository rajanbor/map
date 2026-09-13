# Product roadmap

This roadmap describes capabilities. The pattern publication backlog remains in
[`library/ROADMAP.md`](../../library/ROADMAP.md).

## 0 — Baseline (complete)

- Consolidate library, tooling, website, and `.map` workspace.
- Repair dependency alerts and verify installation from GitHub.
- Record the repository audit and working baseline.

## 1 — Contracts and deterministic MVP

- Publish product, architecture, security, specification, and ADR documents.
- Add Pattern Schema v1 with fixtures and registry integration.
- Define stable scan and recommendation result schemas.
- Connect the pattern graph and expose compatible CLI vocabulary.
- Validate and dogfood the end-to-end local workflow.

## 2 — Evidence and verification

- Add recursive workspace discovery and configurable source analyzers
  ([#108](https://github.com/rajanbor/map/issues/108)).
- Model declared project intent and adopted-pattern verification
  ([#110](https://github.com/rajanbor/map/issues/110)).
- Add architecture diff, verification reports, and CI policy levels.
- Expand evidence provenance, typed relations, graph-backed explanations, and pattern
  lifecycle governance ([#109](https://github.com/rajanbor/map/issues/109)).

## 3 — Ecosystem adapters

- Publish a protocol-neutral core API.
- Add a read-only MCP adapter as a separate package
  ([#111](https://github.com/rajanbor/map/issues/111)).
- Define safe adapter and plugin discovery without executing untrusted code.
- Add framework mappings that never become the canonical pattern model.

## 4 — Assisted intelligence

- Optional semantic indexing and LLM-assisted explanations.
- Evaluation-backed recommendation ranking.
- Human-approved remediation plans and architecture review workflows.

Each phase must preserve deterministic offline behavior as the baseline and may add
assisted behavior only as an explicit adapter.

Release-stream alignment and optional npm preparation are tracked separately in
[#112](https://github.com/rajanbor/map/issues/112); GitHub remains the supported
installation path until that work is complete and publicly verified.
