# Philosophy

> AI engineering is evolving faster than its language. MAP exists to organize, name,
> and standardize the architectural patterns that power intelligent systems.

This document explains the beliefs behind MAP. If a decision about the project is ever
unclear, resolve it in favor of these principles.

## What MAP is

MAP is a **knowledge base of architectural patterns** for building AI systems. Each
pattern names a recurring design problem and its proven solutions, documents the
trade-offs, and shows a minimal implementation. It is a reference you consult when
making a decision — not a library you install.

## What MAP is not

- **Not a framework.** MAP ships no runtime, no SDK, no opinionated stack.
- **Not framework documentation.** We describe architecture; we don't teach a library's API.
- **Not a link farm.** Every pattern is written, compared, and demonstrated in MAP itself.
- **Not marketing.** No vendor is promoted. Trade-offs are stated honestly, including a
  pattern's downsides and when *not* to use it.

## Why patterns, not frameworks

Frameworks encode today's best guess about how to build AI systems, and they change
every few months. The *patterns underneath* them — chunking, reranking, reflection,
guardrails, model routing — are far more stable. By documenting the patterns instead
of the frameworks, MAP stays useful across tooling generations. **Frameworks change.
Patterns remain.**

## The three layers

MAP separates *knowing*, *deciding*, and *building*:

1. **Knowledge** (`docs/`) — the vocabulary and mental models.
2. **Patterns** (`patterns/`) — decision-driven articles: when to use, when not to, trade-offs.
3. **Reference** (`reference/`, `examples/`) — tiny, framework-agnostic implementations.

A good pattern moves the reader smoothly from concept to decision to code.

## The seven principles

1. **Framework agnostic.** Patterns describe architecture. A pattern must make sense
   with no specific library. Examples may use libraries; the article never depends on one.
2. **Production-oriented.** We document real trade-offs, failure modes, and production
   variants — not toy demos. If a pattern has sharp edges, we name them.
3. **Decision-driven.** The most valuable sections are *When to use* and *When NOT to
   use*. MAP optimizes for helping someone make a choice.
4. **Simple reference implementations.** Code is a teaching aid: small, readable,
   dependency-light. Correctness and clarity over completeness.
5. **Beautiful documentation.** Consistent structure, clear prose, real diagrams. The
   documentation *is* the product.
6. **Community contributions.** MAP scales through people. The contribution process is
   welcoming, explicit, and predictable.
7. **Long-term maintainability.** Conventions, structure, and templates are designed to
   scale to hundreds of patterns without collapsing into chaos.

## Editorial stance

- **Honest trade-offs over hype.** Every pattern must say when it is the *wrong* choice.
- **Neutral toward vendors.** Name techniques, not products, in the pattern body.
  Vendors may be cited in *References* and *Production Variants*.
- **Primary sources.** Cite papers and original write-ups where possible.
- **Comparable.** Because every pattern uses the same template, patterns can be compared
  side by side. Consistency is a feature.

## How we decide what counts as a pattern

A candidate is a MAP pattern if it is:

- **Recurring** — it shows up across many systems, not just one product.
- **Architectural** — it's about structure and control flow, not a prompt trick.
- **Decidable** — there are clear conditions for using it and not using it.
- **Demonstrable** — it can be illustrated with a small implementation.

When in doubt, open a "New Pattern" issue and let's discuss it.
