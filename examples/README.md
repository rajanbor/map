# Examples

End-to-end examples that **compose multiple MAP patterns** into a working whole — the
place to see how patterns fit together, not how one works in isolation.

Where [`../reference/`](../reference/) shows a single pattern minimally, `examples/`
shows a realistic slice of a system: e.g. a small RAG service combining *Chunking*,
*Hybrid Search*, *Reranking*, and *Semantic Cache*.

## Conventions

- One folder per example: `examples/<example-name>/`.
- Include a `README.md` that lists **which patterns it composes** (with links) and how
  to run it.
- Keep dependencies minimal and clearly documented.
- Favor clarity; an example is a guided tour, not a product.

## Layout

```
examples/
  <example-name>/
    README.md          # what it builds, which patterns it uses, how to run
    ...                # source files
```

> No examples yet. Propose one via a **New Pattern**/feature issue once the relevant
> patterns exist. See [CONTRIBUTING.md](../CONTRIBUTING.md).
