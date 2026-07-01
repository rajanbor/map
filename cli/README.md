# MAP CLI

The beginning of MAP as an AI Architecture Analysis platform, not just a docs
repository. The core loop works today: initialize a workspace, detect the AI
architecture a project already has, and get told which MAP patterns it is missing.

The product vision lives in [`../future/cli.md`](../future/cli.md).

## Status

- ✅ `map init` — creates a `.map/` workspace, self-configured from the detected project.
- ✅ `map analyze [path]` — detects AI architecture concepts from dependency manifests
  (`package.json`, `requirements.txt`, `pyproject.toml`, `go.mod`, `Cargo.toml`).
- ✅ `map recommend [path]` — rule-based recommendations: which MAP patterns the
  detected architecture is missing, with priorities and rationale.
- 🏗️ `graph`, `doctor`, `explain`, `diff`, `patterns` — scaffolded stubs that print what they will do.
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

node ./bin/map.ts analyze ~/code/my-app     # what AI architecture is in there?
node ./bin/map.ts recommend ~/code/my-app   # what MAP patterns is it missing?

# or via pnpm scripts
pnpm map -- --help
```

Example of the full loop on a Python RAG project:

```
$ map analyze .
  Detected 3 concept(s):
    LLM Usage (90%) — requirements.txt: openai
    Vector Search (90%) — requirements.txt: chromadb
    RAG (60%) — requirements.txt: langchain

$ map recommend .
  [high] security/prompt-injection-defense (triggered by: rag, vector_search)
  [medium] evaluation/golden-dataset (triggered by: llm, vector_search, rag)
  [medium] retrieval/semantic-cache (triggered by: vector_search)
  ...
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

`map init` **self-initializes**: it detects the project's languages from marker files
(`package.json`/`tsconfig.json` → TypeScript/JS, `pyproject.toml`/`requirements.txt` →
Python, `go.mod` → Go, `Cargo.toml` → Rust, `pom.xml`/`build.gradle` → Java) and pre-fills
`config.yaml` (analyzers, include globs) and `project.yaml` (languages) accordingly.

`map analyze` runs every applicable analyzer. The first analyzer reads **dependency
manifests**: declared dependencies are matched against a data-driven signal table
([`src/analyzer/signals.ts`](src/analyzer/signals.ts)) covering npm, PyPI, Go, and
Cargo packages — LLM SDKs, vector databases, RAG frameworks, guardrails, evaluation
and observability tooling. Detections carry evidence (`requirements.txt: langchain`)
and confidence. When a `.map/` workspace exists, the result is saved to
`.map/reports/analysis.json`.

`map recommend` feeds the detected architecture into a **rule table**
([`src/recommendation/rules.ts`](src/recommendation/rules.ts)): RAG without guards →
Prompt Injection Defense; embeddings → Semantic Cache; tool calling → Least-Privilege
Tool Access + Tool Budget; no evaluation signal → Golden Dataset + LLM-as-Judge; no
tracing → Tracing. Recommendations reference roadmap pattern ids
(`category/name`, see [`../ROADMAP.md`](../ROADMAP.md)).

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
  analyzer/                Module 2 — Analyzer (dependency-manifest analyzer + signal table)
  recommendation/          Module 3 — Recommendation engine (rule-based recommender + rule table)
  storage/                 filesystem abstraction (used by init)
  reporting/               output abstraction (Reporter)
  config/                  config + manifest schema, dependency-free YAML writer
  plugins/                 extension points (register analyzers/commands)
  services.ts              composition root (wires the modules)
  cli/                     Module 5 — command system
    command.ts             Command contract
    command-registry.ts    lookup + plugin extension point
    runner.ts              argv parsing (Node's parseArgs) + dispatch
    commands/              init, analyze, recommend (working) + planned stubs
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
- **Module 2:** source-code analyzers (TypeScript, Python) that detect concepts from
  imports and call sites, deepening what the manifest analyzer finds.
- **Module 3:** back the recommender with the pattern graph (prerequisites, conflicts).
- **Module 5:** implement `doctor`, `patterns`, then `explain` → `diff`.

Grep for `TODO(` to find the extension points.
