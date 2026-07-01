# Pattern Anatomy

Every MAP pattern uses the same structure so readers can navigate any article
instantly and compare patterns side by side. This guide explains what each section is
for and how to write it well. The machine-readable starting point is
[`patterns/_template/PATTERN_TEMPLATE.md`](../patterns/_template/PATTERN_TEMPLATE.md).

## Required sections

| Section | Purpose | Tips |
|---------|---------|------|
| **Title** | The canonical name of the pattern. | Use the established name; list synonyms under "Also known as." |
| **Problem** | The concrete situation the reader is in when they reach for this pattern. | State it from the developer's point of view. 2–3 sentences. |
| **Motivation** | Why the naive approach fails. | A short scenario beats abstract claims. |
| **When to use** | Conditions where this is a good fit. | Concrete bullets. Prefer "if X and Y." |
| **When NOT to use** | Conditions where it's the wrong choice — and what to use instead. | As important as "When to use." Be honest. |
| **Architecture Diagram** | A visual of the components and flow. | Mermaid preferred (renders on GitHub); or image in `assets/`. Required. |
| **Flow** | Step-by-step data/control movement. | Numbered list. Match the diagram. |
| **Trade-offs** | The central tensions: latency, cost, complexity, quality. | A table works well; be specific. |
| **Advantages** | What you gain. | Bullets. |
| **Disadvantages** | What you pay. | Bullets. Don't soften them. |
| **Reference Implementation** | Minimal, framework-agnostic code illustrating the idea. | Keep it small; link to `reference/` for fuller code. |
| **Production Variants** | How the pattern appears in real systems and at scale. | Name techniques neutrally; note common modifications. |
| **Related Patterns** | Complementary, competing, or prerequisite patterns. | Link within MAP. |
| **References** | Primary sources: papers, docs, talks. | Numbered list; prefer originals. |

## Optional section

| Section | Purpose |
|---------|---------|
| **Benchmarks** | Quantitative trade-offs (latency, cost, quality deltas) with the setup used. If absent, write "Not yet benchmarked — contributions welcome." |

## Writing principles

- **Lead with the decision.** A reader should know within 30 seconds whether this
  pattern applies to them. Put the clearest guidance in *When to use* / *When NOT to use*.
- **Be honest about downsides.** A pattern with no disadvantages is under-documented.
- **Stay framework-agnostic in the prose.** Libraries belong in code blocks,
  *Production Variants*, and *References* — not in the definition of the pattern.
- **Show, then tell.** A diagram plus a small example communicates faster than prose.
- **Cross-link generously.** Patterns gain value from their relationships.

## File & folder layout

```
patterns/<category>/<pattern-slug>/
  README.md      ← the article (copied from the template)
  assets/        ← diagrams/images (optional)
```

Use a lowercase kebab-case slug that matches the roadmap entry
(e.g. `parent-child-retrieval`).

See the [Style Guide](style-guide.md) for tone, formatting, and diagram conventions.
