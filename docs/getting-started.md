# Getting started

## 1. Install

Requirements: Git, Node.js 20 or newer, and `pnpm` or `corepack`.

```bash
git clone https://github.com/rajanbor/map.git
cd map
./scripts/install.sh
map --version
```

The installer builds the CLI and links `map` into `~/.local/bin` (change it with
`MAP_INSTALL_DIR`). It never replaces an unrelated executable. To update later, run
`git pull --ff-only && ./scripts/install.sh`.

## 2. Look before changing anything

```bash
cd your-project
map detect      # stack and agents, with the file behind every signal
map plan        # what map init would create, recommend, and leave alone
```

Both commands are read-only. `map plan` lists recommended skills and patterns, the
files it would write, conflicts it will not resolve for you, and decisions you need
to make.

## 3. Initialize

```bash
map init
```

In a terminal, `map init` shows the plan, offers matching profiles, asks before
writing, and lets you pick skills to install. In scripts and CI, use:

```bash
map init --yes --profile webapp --agents claude,codex
```

`--yes` applies only safe defaults: it creates missing files, adds entries to an
existing config, and installs no skill unless you name it with `--skills`.

## 4. Add skills

```bash
map skills suggest
map skills info design-guardrails
map skills add design-guardrails --allow-scripts
```

The skill is pinned in `.map/skills.lock.json`. Commit `.map/` and the installed
skill directories. Teammates reproduce the same files with `map skills install`.

## 5. Keep instructions in sync

Edit the Markdown under `.map/`, then:

```bash
map sync           # regenerate CLAUDE.md, AGENTS.md, …
map sync --check   # in CI: fail when generated files are stale
map doctor         # workspace, compiler, registry, and skill integrity checks
```

## Existing agent files

If `CLAUDE.md` or another target already exists and was written by hand, MAP keeps it
and reports a conflict. To let MAP manage it, move its content into a document under
`.map/` (for example `.map/agents/project-rules.md`), then run `map sync --force`;
the original is saved as `CLAUDE.md.map-backup-<time>`.

Next: [skills](skills.md) · [agents](agents.md) · [architecture](architecture.md)
