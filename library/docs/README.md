# MAP Docs — Layer 1: Knowledge

Project-level documentation: the concepts, conventions, and philosophy behind MAP.
Start here to understand *how* MAP thinks before diving into the pattern catalog.

- **[Philosophy](philosophy.md)** — what MAP is, what it is not, and the principles that govern it.
- **[Pattern Anatomy](pattern-anatomy.md)** — what each section of a pattern means and how to write it.
- **[Style Guide](style-guide.md)** — tone, formatting, diagrams, and naming conventions.
- **[Glossary](glossary.md)** — shared vocabulary for AI Engineering terms used across patterns.

Specifications (the contracts tools build on — see the
[spec template](specs/_TEMPLATE.md) for how to propose one):

- **[Pattern Contract](pattern-contract.md)** — the files every pattern ships and who consumes them.
- **[MAP Score](specs/map-score.md)** — the five-dimension 1–5 star rating. *(implemented)*
- **[Registry](specs/registry.md)** — the machine-readable catalog artifact published on each release. *(implemented)*
- **[Pattern Schema](specs/pattern-schema.md)** — the formal, build-enforced schema for `pattern.yaml`. *(implemented)*
- **[Pattern Lifecycle](specs/pattern-lifecycle.md)** — claiming, maturity, deprecation, and renames. *(draft)*
- **[Decision Guides](specs/decision-guides.md)** — cross-category "X or Y?" guides and their contract. *(draft)*
- **[Website](specs/website.md)** — the ultra-simple registry-fed site. *(draft)*
- **[MAP Schemas](schemas/README.md)** — machine contracts paired with human guides and fixtures.

For the patterns themselves, see [`../patterns/`](../patterns/). To contribute, see
[`../CONTRIBUTING.md`](../CONTRIBUTING.md). The `map` CLI lives in this monorepo under
[`../../tooling`](../../tooling/).
