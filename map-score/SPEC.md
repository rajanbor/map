# MAP Score — Specification

MAP Score is a compact, five-dimension rating that sits at the top of a pattern page so a
reader knows what to expect in a few seconds. It is intentionally small and opinionated.

## Dimensions

Each dimension is an integer from **1 to 5**, rendered as stars (★ filled, ☆ empty).

| Dimension | 1 star | 5 stars | Higher means |
|-----------|--------|---------|--------------|
| **Complexity** | trivial | very complex | more complex (lower is simpler) |
| **Latency** | heavy added latency | negligible | less added latency (better) |
| **Cost** | expensive | cheap | cheaper (better) |
| **Accuracy Impact** | little or negative | large positive | bigger positive impact (better) |
| **Production Readiness** | experimental | battle-tested | more production-ready (better) |

Note the direction: for **Complexity**, fewer stars is "better" (simpler); for the other
four, more stars is better. The scale is documented on each dimension so the meaning is
never ambiguous.

## Why no single overall number

The dimensions pull in different directions (a powerful pattern can be complex *and*
high-impact). Collapsing them into one number hides the trade-off that the score exists to
surface, so MAP Score deliberately keeps the five values separate.

## Data format

A score is a small JSON object:

```json
{
  "pattern": "retrieval/chunking",
  "complexity": 2,
  "latency": 5,
  "cost": 5,
  "accuracyImpact": 5,
  "productionReadiness": 5
}
```

`pattern` is optional. All five dimensions are required integers in `1..5`.

## Rendering

The library renders a score three ways:

- **Table** — a Markdown table (dimension, stars, `n/5`).
- **Block** — each label stacked over its stars (the at-a-glance layout for a page top).
- **Summary** — a single line: `Complexity ★★☆☆☆ · Latency ★★★★★ · …`.

## Scope

MAP Score describes a pattern in general, not a specific implementation. Real numbers are
corpus- and system-dependent; the score is guidance, not a benchmark. Where a dimension
can be measured, cite it in the pattern's Benchmarks section instead.
