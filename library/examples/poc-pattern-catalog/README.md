# POC — Using the MAP catalog functionally

Unlike the other examples (which are ADR-style documents), this one is runnable:
it shows the two ways to consume MAP's pattern catalog, via the CLI and
programmatically through the **registry** artifact.

## 1. The CLI: `map list` and `map search`

```bash
git clone https://github.com/rajanbor/map.git
cd map && ./scripts/install.sh

map list                              # full catalog (roadmap + written)
map search chunk                      # search by text
map list --category=retrieval         # filter by category
map list --status=published           # only written patterns
map list --json                       # machine-readable output
```

Published patterns show their [MAP Score](../../docs/specs/map-score.md) star
line, so you can compare candidates at a glance. `--json` is meant for scripts
and AI agents. `map show <id>` gives the decision view of one pattern, and
`map add <id>` copies its prompt/acceptance files into your project.

The CLI lives under [`tooling/`](../../../tooling/) in this repository.

## 2. Programmatic: the registry

Every release of this repository publishes
[`registry.json`](../../docs/specs/registry.md) — the whole catalog as one JSON
document. [`demo.ts`](demo.ts) consumes it directly (Node >= 22, no dependencies):

```bash
# from the repo root — against a local build of the registry
node scripts/build-registry.ts
node examples/poc-pattern-catalog/demo.ts retrieval

# or against the latest published release (no checkout needed)
node examples/poc-pattern-catalog/demo.ts security
```

Output:

```
✅ retrieval/chunking — Chunking
   Split documents into smaller, self-contained units so retrieval can find …
   Complexity ★★☆☆☆ · Readiness ★★★★★
⬜ retrieval/semantic-cache — Semantic Cache
...
```

This is the same artifact the CLI bundles and the future website will render:
one source of truth, many consumers.
