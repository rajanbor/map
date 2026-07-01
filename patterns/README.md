# The MAP Pattern Catalog

This is the heart of MAP: the catalog of AI Engineering patterns, organized by
category. Each pattern is a self-contained article that follows the
[pattern template](_template/PATTERN_TEMPLATE.md) so you always know where to look.

> The catalog is intentionally empty at launch. See the [Roadmap](../ROADMAP.md) for
> the ~75 planned patterns, and [CONTRIBUTING.md](../CONTRIBUTING.md) to claim one.

## Categories

| Category | Focus |
|----------|-------|
| [Retrieval](retrieval/) | Getting the right context into the model |
| [Memory](memory/) | Persisting and recalling state across turns and sessions |
| [Agents](agents/) | Planning, acting, reflecting, coordinating |
| [Security](security/) | Defending against injection, leakage, and abuse |
| [Context Management](context/) | Budgeting and shaping the context window |
| [Evaluation](evaluation/) | Measuring quality, regressions, and hallucination |
| [Performance](performance/) | Latency, throughput, and cost |
| [Routing](routing/) | Sending each request to the right model or path |
| [Tool Calling](tool-calling/) | Letting models act through tools safely |
| [Observability](observability/) | Tracing, logging, cost, and feedback |

## How patterns are laid out

```
patterns/
  <category>/
    README.md              ← category index (planned patterns for the category)
    <pattern-slug>/
      README.md            ← the pattern article (from the template)
      assets/              ← diagrams and images (optional)
```

## Adding a pattern

1. Open a **"New Pattern"** issue and get it assigned.
2. Copy [`_template/PATTERN_TEMPLATE.md`](_template/PATTERN_TEMPLATE.md) to
   `patterns/<category>/<slug>/README.md`.
3. Fill in every section — see [Pattern Anatomy](../docs/pattern-anatomy.md).
4. Open a PR into `dev`. See [CONTRIBUTING.md](../CONTRIBUTING.md).
