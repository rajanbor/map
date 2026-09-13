<p align="center">
  <img src="library/assets/map-logo.png" alt="MAP logo" width="180" />
</p>

<h1 align="center">MAP — your AI engineering library</h1>

<p align="center">
  One project structure for architecture decisions, prompts, agents, evaluations,<br />
  reusable AI patterns, and context optimization.
</p>

<p align="center">
  <a href="https://github.com/rajanbor/map/actions/workflows/ci.yml"><img src="https://github.com/rajanbor/map/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
  <a href="library/LICENSE"><img src="https://img.shields.io/badge/code-MIT-2ea44f" alt="Code license: MIT" /></a>
  <a href="library/LICENSE-CONTENT"><img src="https://img.shields.io/badge/content-CC_BY_4.0-blue" alt="Content license: CC BY 4.0" /></a>
  <img src="https://img.shields.io/badge/Node.js-%E2%89%A520-43853d" alt="Node.js 20 or newer" />
</p>

MAP helps a software project explain itself to people and AI coding agents. You keep
the durable knowledge in one `.map/` directory. The CLI can analyze the project,
recommend missing production patterns, control the context budget, and generate the
native instruction files used by different assistants.

> **Current distribution:** MAP is installed directly from this GitHub repository.
> The npm package is not published yet, so do not use `npm install
> @missing-ai-patterns/cli`.

## Why MAP?

AI projects quickly scatter important knowledge across prompts, chat histories,
vendor configuration, diagrams, and developer notes. That makes agents repeat old
mistakes and makes architectural decisions difficult to review.

MAP gives that knowledge a stable home:

- **one source of truth** for every supported coding assistant;
- **reusable patterns** with trade-offs, implementation prompts, and acceptance tests;
- **AI-aware ADRs and schemas** readable by people and machines;
- **token-budget control** that exposes oversized and duplicated context;
- **Git-native collaboration** with deterministic, reviewable changes and offline operation.

## Install from GitHub

Requirements: Git, Node.js 20 or newer, and either `pnpm` or `corepack`.

```bash
git clone https://github.com/rajanbor/map.git
cd map
./scripts/install.sh
map --version
```

The installer builds the CLI from this checkout and creates a `map` symlink in
`~/.local/bin`. It never overwrites an unrelated executable. To choose another
location:

```bash
MAP_INSTALL_DIR="$HOME/bin" ./scripts/install.sh
```

If that directory is not in `PATH`, the installer prints the exact line to add to
your shell configuration. To update MAP later:

```bash
cd map
git pull --ff-only
./scripts/install.sh
```

## Start an AI project

```bash
cd your-project
map init
map scan --json
map suggest
map search retrieval
map optimize --save
map sync
```

`map init` detects the project and creates a versioned workspace without overwriting
existing files:

```text
.map/
├── map.config.json     project, analyzers, targets, and tool settings
├── architecture/      system boundaries, data flows, and diagrams
├── decisions/         AI architecture decision records
├── patterns/          patterns adopted with `map add`
├── prompts/           reusable product and engineering prompts
├── agents/            agent roles, permissions, and guardrails
├── evals/             datasets, rubrics, metrics, and quality gates
├── tools/             tool contracts and context budgets
├── reports/           generated analysis reports; ignored by Git
└── cache/             local registry cache; ignored by Git
```

## One workflow, every agent

```text
project code ──▶ map scan ────▶ detected AI architecture
                                      │
MAP library ──▶ map suggest ──▶ patterns to review
                                      │
                              map add / edit .map/
                                      │
                                  map sync
                                      │
                 ┌────────────────────┼────────────────────┐
                 ▼                    ▼                    ▼
             AGENTS.md            CLAUDE.md        Cursor / Copilot / Gemini
```

| Command | Result |
|---|---|
| `map init` | Creates the `.map/` workspace and detects the project shape. |
| `map scan [path] [--json]` | Finds static AI architecture signals, evidence, certainty, and limits. |
| `map suggest [path] [--json]` | Suggests review candidates with triggers, rationale, and priority. |
| `map list [--json]` | Lists the local pattern catalog. |
| `map search [query] [--json]` | Searches patterns by ID, name, or summary. |
| `map show <pattern-id> [--json]` | Shows one pattern and its decision guidance. |
| `map graph [pattern-id] [--json]` | Inspects the catalog as typed relationships. |
| `map add <pattern-id>` | Adds a pattern prompt, metadata, and acceptance criteria. |
| `map validate [--json]` | Validates the project manifest and adopted pattern integrity. |
| `map optimize --check` | Measures context and enforces the configured token budget. |
| `map sync` | Generates instructions for supported AI coding assistants. |
| `map doctor` | Checks the workspace, registry, compiler, and references. |

The original `analyze`, `recommend`, `patterns`, and `explain` commands remain
supported as compatible names.

## What is inside this repository?

| Area | Purpose |
|---|---|
| [`library/`](library/) | AI engineering patterns, schemas, specifications, examples, and small reference implementations. |
| [`tooling/`](tooling/) | The TypeScript CLI, context compiler, analyzers, recommender, and shared packages. |
| [`apps/website/`](apps/website/) | The public, registry-driven pattern browser. |
| [`docs/`](docs/) | Getting started, project structure, and product documentation. |
| [`.map/`](.map/) | MAP's own workspace. The project uses the same structure it generates. |

The pattern library is framework-agnostic. Each published pattern explains when to
use it, when not to use it, its failure modes, trade-offs, an implementation prompt,
and verifiable acceptance criteria.

## Explore

- [Getting started](docs/getting-started.md)
- [Project structure](docs/project-structure.md)
- [Product vision and MVP](docs/project/VISION.md)
- [System architecture](docs/architecture/README.md)
- [Machine-readable specifications](docs/specifications/)
- [Pattern library](library/README.md)
- [Human- and AI-readable schemas](library/docs/schemas/README.md)
- [MAP Standard RFC](library/rfcs/0001-map-standard.md)
- [Schema roadmap](https://github.com/rajanbor/map/issues/98)

## Develop MAP

```bash
git clone https://github.com/rajanbor/map.git
cd map/tooling
corepack pnpm install --frozen-lockfile
corepack pnpm test
corepack pnpm build
```

Contributions should be small, testable, and readable by both people and agents. See
the [contribution guide](library/CONTRIBUTING.md) and open roadmap issues before
starting a larger contract change.

## License

Code is available under the [MIT License](library/LICENSE). Documentation, patterns,
and other written content use [CC BY 4.0](library/LICENSE-CONTENT). The MAP name and
logo remain reserved as described in [LICENSING.md](library/LICENSING.md).
