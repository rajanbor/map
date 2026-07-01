# Reference Implementations — Layer 3

Tiny, framework-agnostic implementations that demonstrate MAP patterns in code. These
are **teaching aids**, not a library: small, readable, and dependency-light.

## Principles

- **Minimal.** The smallest code that makes the pattern clear.
- **Framework-agnostic.** Prefer the standard library. If a dependency is essential,
  use exactly one and explain why.
- **Runnable.** Each example runs on its own and is labeled clearly if it's pseudocode.
- **Mirrors the catalog.** Layout follows the pattern's category and slug.

## Layout

```
reference/
  python/
    <category>/<pattern-slug>/     ← runnable example + README
  typescript/
    <category>/<pattern-slug>/     ← runnable example + README
```

For example, a reranking example would live at
`reference/python/retrieval/reranking/`.

## Language guides

- [Python](python/README.md)
- [TypeScript](typescript/README.md)

## Relationship to patterns

A pattern article contains a *minimal* inline snippet. When a fuller runnable version
adds value, put it here and link from the pattern's **Reference Implementation**
section. For multi-pattern, end-to-end demos, use [`../examples/`](../examples/).
