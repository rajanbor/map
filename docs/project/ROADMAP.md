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

- Add recursive workspace discovery and configurable source analyzers.
- Model declared project intent and adopted-pattern verification.
- Add architecture diff, verification reports, and CI policy levels.
- Expand evidence provenance and pattern lifecycle governance.

## 3 — Ecosystem adapters

- Publish a protocol-neutral core API.
- Add an MCP adapter as a separate package.
- Define safe adapter and plugin discovery without executing untrusted code.
- Add framework mappings that never become the canonical pattern model.

## 4 — Assisted intelligence

- Optional semantic indexing and LLM-assisted explanations.
- Evaluation-backed recommendation ranking.
- Human-approved remediation plans and architecture review workflows.

Each phase must preserve deterministic offline behavior as the baseline and may add
assisted behavior only as an explicit adapter.

