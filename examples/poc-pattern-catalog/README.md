# POC — Using the MAP catalog functionally

Unlike the other examples (which are ADR-style documents), this one is a runnable
proof of concept: it shows the two ways to consume MAP's pattern catalog today,
via the CLI and programmatically. Requires Node >= 22.

## 1. The CLI: `map patterns`

From the repo root:

```bash
node cli/bin/map.ts patterns                          # full catalog (roadmap + written)
node cli/bin/map.ts patterns chunk                    # search by text
node cli/bin/map.ts patterns --category=retrieval     # filter by category
node cli/bin/map.ts patterns --status=published       # only written patterns
node cli/bin/map.ts patterns --json                   # machine-readable output
```

Published patterns show their [MAP Score](../../map-score/SPEC.md) star line, so you
can compare candidates at a glance. `--json` is meant for scripts and AI agents —
pipe it into `jq`, a prompt, or a tool-calling loop.

## 2. Programmatic: the catalog API

[`demo.ts`](demo.ts) loads the same catalog through `createDefaultServices()` and
renders a "decision brief" — the kind of grounding context you would paste into an
ADR or hand to an AI agent:

```bash
node examples/poc-pattern-catalog/demo.ts chunk
```

```markdown
# Decision brief: patterns matching "chunk"

## Chunking (`retrieval/chunking`) — published
Split documents into smaller, self-contained units ...

- Maturity: established
- MAP Score: complexity 2/5, latency 5/5, cost 5/5, accuracy 5/5, readiness 5/5
- Related: retrieval/parent-child-retrieval, ...
```

## Why this matters

The pattern contract (`patterns/<category>/<slug>/pattern.yaml`) makes every
published pattern machine-readable. This POC proves the loop end to end: the same
metadata that renders a pattern page also powers CLI search, `map recommend`, and
programmatic consumption — the foundation for the platform vision in
[`future/cli.md`](../../future/cli.md).

The catalog grows with the [Roadmap](../../ROADMAP.md); everything here works
unchanged as new patterns land.
