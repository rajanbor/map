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
- ✅ `map patterns [text]` — list and search the pattern catalog (written patterns
  merged with the roadmap); filter with `--category=<cat>` and `--status=<status>`.
- ✅ `map doctor` — health checks: Node version, `.map/` workspace integrity, report
  validity, catalog availability, and rule-table consistency. Exits non-zero on problems.
- 🏗️ `graph`, `explain`, `diff` — scaffolded stubs that print what they will do.
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

node ./bin/map.ts patterns                        # the whole catalog
node ./bin/map.ts patterns cache                  # search by text
node ./bin/map.ts patterns --category=security    # one category
node ./bin/map.ts patterns --status=published     # only written patterns
node ./bin/map.ts doctor                          # is everything healthy?

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

`map patterns` is backed by the **pattern catalog** (Module 1,
[`src/knowledge/repo-pattern-catalog.ts`](src/knowledge/repo-pattern-catalog.ts)):
it merges the written patterns (`patterns/<category>/<slug>/pattern.yaml`) with the
target catalog parsed from [`../ROADMAP.md`](../ROADMAP.md), so every entry carries a
status (✅ published · 🟡 in progress · ⬜ planned). The ids shown are the same ids
`map recommend` emits.

`map doctor` verifies the environment (Node >= 22), the `.map/` workspace (config,
manifest, knowledge db, analysis report all present and parseable), that the pattern
catalog loads, and that every id in the recommendation rule table resolves in the
catalog — so a typo in `rules.ts` or a renamed roadmap entry fails fast (and in CI,
since doctor exits non-zero on problems).

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
  knowledge/               Module 1 — Knowledge Base (pattern catalog: ROADMAP.md +
                           pattern.yaml loader; KnowledgeBase interface + in-memory impl)
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
    commands/              init, analyze, recommend, patterns, doctor (working) + planned stubs
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

- **Module 1:** grow the catalog into a full document loader — parse pattern README
  sections into `Pattern` objects and read `.map/knowledge/patterns.json` overrides.
- **Module 2:** source-code analyzers (TypeScript, Python) that detect concepts from
  imports and call sites, deepening what the manifest analyzer finds.
- **Module 3:** back the recommender with the pattern graph (prerequisites, conflicts).
- **Module 5:** implement `explain` (catalog + knowledge base) → `diff`.

Grep for `TODO(` to find the extension points.
