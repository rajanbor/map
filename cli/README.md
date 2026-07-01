# MAP CLI (foundation)

The beginning of MAP as an AI Architecture Analysis platform, not just a docs
repository. This package is the **foundation**: the architecture, interfaces, and one
working command (`map init`). The analyzer and recommendation engine are designed but
not implemented yet.

The product vision lives in [`../future/cli.md`](../future/cli.md).

## Status

- ✅ `map init` — creates a `.map/` workspace.
- 🏗️ `analyze`, `graph`, `doctor`, `explain`, `diff`, `recommend`, `patterns` — scaffolded stubs that print what they will do.
- 🧩 Core modules exist as interfaces with small default implementations and clear `TODO`s.

## Requirements

Node **>= 22** (the CLI runs TypeScript directly via Node's native type stripping, so
no build step is needed for the foundation). pnpm is used for dev tooling.

## Run it

```bash
# from the cli/ directory
node ./bin/map.ts --help
node ./bin/map.ts init          # creates .map/ in the current directory
node ./bin/map.ts init --force  # overwrite existing files

# or via pnpm scripts
pnpm map -- --help
```

Dev tooling (types, tests):

```bash
pnpm install
pnpm typecheck
pnpm test              # run the suite
pnpm test:coverage     # run with the coverage gate (enforced in CI)
pnpm audit             # dependency vulnerability check (enforced in CI)
```

CI (`.github/workflows/cli.yml`) runs `pnpm audit`, `typecheck`, the coverage-gated
tests, and a `map init` smoke test on every PR, and is a required check.

## What `map init` creates

```
.map/
  config.yaml          # how MAP analyzes this project (editable)
  project.yaml         # generated project manifest
  knowledge/
    patterns.json      # placeholder knowledge database ([])
  cache/
  reports/
  graphs/
```

Existing files are never overwritten unless you pass `--force`.

## Architecture

Clean architecture with one-way dependencies: the CLI depends on the core modules
through interfaces; the domain depends on nothing.

```
bin/map.ts                 executable entry
src/
  domain/                  pure types: Pattern (Module 1), relationships (Module 4),
                           concepts, analysis, recommendations. No I/O.
  knowledge/               Module 1 — Knowledge Base (interface + in-memory impl)
  graph/                   Module 4 — Pattern graph (interface + in-memory impl)
  analyzer/                Module 2 — Analyzer (pluggable interfaces only)
  recommendation/          Module 3 — Recommendation engine (interface + null impl)
  storage/                 filesystem abstraction (used by init)
  reporting/               output abstraction (Reporter)
  config/                  config + manifest schema, dependency-free YAML writer
  plugins/                 extension points (register analyzers/commands)
  services.ts              composition root (wires the modules)
  cli/                     Module 5 — command system
    command.ts             Command contract
    command-registry.ts    lookup + plugin extension point
    runner.ts              argv parsing (Node's parseArgs) + dispatch
    commands/              init (working) + planned stubs
```

Design rules:

- Commands are thin. They call modules through interfaces and report through `Reporter`.
- Nothing outside `storage/` touches the filesystem; nothing outside `reporting/` writes to the console.
- Concrete classes are created only in `services.ts` (the composition root) and tests.

## Extensibility

Plugins receive a small `PluginApi` and register analyzers or commands. The intended
shape includes packages like `map-analyzer-typescript`, `map-analyzer-python`, and
provider plugins. See [`src/plugins/plugin.ts`](src/plugins/plugin.ts).

## What's next (TODOs)

- **Module 1:** a Markdown/JSON knowledge loader that reads `patterns/` and `.map/knowledge/`.
- **Module 2:** a first analyzer (TypeScript) detecting embeddings, vector search, RAG, tool calling, streaming, memory, model routing, prompt guards.
- **Module 3:** a rule-based recommender backed by the pattern graph.
- **Module 5:** implement `doctor`, `patterns`, then `analyze` → `recommend` → `explain` → `diff`.

Grep for `TODO(` to find the extension points.
