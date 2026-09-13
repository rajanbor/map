# Getting started

MAP turns project-specific AI knowledge into a small, versioned workspace that
both people and coding agents can use.

## 1. Install MAP from GitHub

```bash
git clone https://github.com/rajanbor/map.git
cd map
./scripts/install.sh
map --version
```

MAP is currently distributed from its GitHub repository; the npm package is not
published yet. The installer builds the CLI and links it into `~/.local/bin` without
overwriting an unrelated executable. It requires Git, Node.js 20+, and `pnpm` or
`corepack`.

## 2. Initialize a project

```bash
cd your-project
map init
```

The initializer detects known language markers and creates `.map/`. It keeps
existing files unless `--force` is explicitly supplied.

## 3. Understand the architecture

```bash
map scan
map suggest
map search retrieval
```

`scan` detects evidence-backed architecture signals from project manifests and states
the limits of static analysis. `suggest` maps those signals to review candidates with
reasons, and `search` lets you browse the full library. Add `--json` to consume stable
scan and recommendation contracts from scripts or agents. The older `analyze`,
`recommend`, and `patterns` names remain supported.

## 4. Adopt knowledge into the project

```bash
map add retrieval/chunking
map validate
```

The pattern's prompt, acceptance criteria, and metadata are copied into
`.map/patterns/`, where they can be adapted to the application and reviewed
with the rest of the code.

## 5. Keep context efficient

```bash
map optimize
map optimize --save
map optimize --budget 16000 --check
```

The optimizer estimates the token footprint of configured Markdown sources,
shows the largest files, identifies substantial repeated blocks, and optionally
enforces the budget in CI. The default budget and globs live under
`tools.tokenOptimizer` in `.map/map.config.json`.

## 6. Compile assistant instructions

```bash
map sync
```

MAP compiles the curated `.map/` content into the instruction formats used by
Claude, Codex/Agents, Gemini, Cursor, and GitHub Copilot. Edit `.map/`, not the
generated files.
