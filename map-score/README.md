# MAP Score

A compact **1–5 star rating system** for MAP patterns, so each pattern can be judged at a
glance across five dimensions: **Complexity, Latency, Cost, Accuracy Impact, Production
Readiness**.

The full definition is in [SPEC.md](SPEC.md).

## Why

A pattern page answers "how does this work". MAP Score answers "what will this cost me"
before you read it — is it simple or complex, cheap or expensive, safe to ship or
experimental. It's the 20-second version of the trade-offs.

## Requirements

Node **>= 22** (runs TypeScript directly; no build step). pnpm for dev tooling.

## Use it

```bash
# from map-score/
node ./bin/map-score.ts scores/retrieval/chunking.json
```

Output:

```
MAP Score — retrieval/chunking

Complexity
★★☆☆☆

Latency
★★★★★

... plus a Markdown table.
```

As a library:

```ts
import { parseScore, renderScoreTable } from "@map/score";

const score = parseScore({
  pattern: "retrieval/chunking",
  complexity: 2, latency: 5, cost: 5, accuracyImpact: 5, productionReadiness: 5,
});
console.log(renderScoreTable(score));
```

## Dev tooling

```bash
pnpm install
pnpm typecheck
pnpm test              # unit tests
pnpm test:coverage     # coverage gate (also enforced in CI)
pnpm audit             # dependency check (enforced in CI)
```

## Layout

```
map-score/
  SPEC.md          the scoring definition
  src/
    score.ts       schema, validation, dimension metadata
    render.ts      stars / table / block / summary renderers
  bin/map-score.ts render a score JSON to Markdown
  scores/          score data per pattern (e.g. retrieval/chunking.json)
  tests/           unit tests
```

## Relationship to MAP

MAP Score is a separate, focused package. It pairs with the pattern catalog: scores live
here as data and can later be rendered onto pattern pages, the website, or surfaced by the
MAP CLI. It does not change how patterns are written.
