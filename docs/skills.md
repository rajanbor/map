# Agent Skills in MAP

MAP finds, recommends, installs, pins, updates, removes, and audits
[Agent Skills](https://agentskills.io) — folders with a `SKILL.md` file that coding
agents load on demand. MAP manages the files; your agent decides when to use them.

## Sources

Skills come from **sources** configured in `.map/map.config.json`:

```json
{
  "skills": {
    "sources": [
      { "id": "rajanbor", "type": "git", "url": "https://github.com/rajanbor/skills.git", "ref": "main" },
      { "id": "team", "type": "local", "path": "../team-skills" }
    ]
  }
}
```

Without a `skills` section MAP uses one default source,
[`rajanbor/skills`](https://github.com/rajanbor/skills). Any Git repository or local
directory that contains `<anything>/<skill-name>/SKILL.md` works; folders starting
with `_` or `.` are skipped.

- **git** sources are fetched into `~/.map/cache/skills/<id>/` (override with
  `MAP_HOME`). `list`, `search`, `info`, and `suggest` reuse the cached revision;
  `--refresh` and `map skills update` fetch again. If a refresh fails, MAP uses the
  cache and says so. With `MAP_OFFLINE=1`, MAP never contacts a remote.
- **local** sources are read directly. Their revision is a content digest, so they
  cannot be re-fetched later; `map skills install` only verifies them.

## Commands

| Command | What it does |
|---|---|
| `map skills list` | List skills from all sources, with version and install state. |
| `map skills search <query>` | Match name, category, and description. |
| `map skills info <name>` | Metadata, file list, integrity, and audit summary. |
| `map skills suggest [path]` | Recommendations with the evidence behind each. Installs nothing. |
| `map skills add <name...>` | Audit, then install for the project's agents and pin in the lockfile. |
| `map skills install` | Reinstall exactly what `.map/skills.lock.json` records. |
| `map skills update [name...]` | Move to the latest revision of the source ref. |
| `map skills remove <name...>` | Remove files MAP installed; your own files stay. |
| `map skills audit [name...]` | Without names: verify installed skills against the lock and rescan them. With names: audit catalog skills before installing. |

Every command takes `--json`. `add`, `update`, and `remove` take `--dry-run`. When a
name exists in several sources, pass `--source <id>`.

## Where skills are installed

MAP installs once per skills directory, and only into directories the selected agents
read (see [agents.md](agents.md)). For example, Claude Code, Cursor, and Copilot all
read `.claude/skills`, so selecting those three writes one copy. The agents come from
`--agents`, else `agents` in `map.config.json`, else detection, else Claude Code.

Only project-scoped installation is supported. MAP does not write to `~/.claude` or
other home-directory locations.

## The lockfile

`.map/skills.lock.json` pins each skill to a commit SHA and a content digest and lists
every file written. Commit it. See the [lockfile contract](../library/docs/schemas/skills-lock.md).

## Security model

Skills are untrusted input: an agent follows their instructions and may run their
scripts. MAP's safeguards:

- **No execution.** MAP never runs skill scripts, project code, or Git hooks. Git
  content is read with `git ls-tree`/`git cat-file` from a bare cache — nothing is
  checked out, so symlinks and checkout filters cannot take effect.
- **Structural checks (enforced).** Symlinks, submodules, special files, `..` or
  absolute paths, and oversized files block installation.
- **Content checks (heuristic).** The audit flags pipe-to-shell installers, encoded
  execution, destructive commands, credential and secret access, persistence,
  privilege escalation, hidden or bidirectional Unicode, prompt-injection phrasing,
  and broad `allowed-tools` grants. Excerpts redact secret-looking tokens.
- **Approvals.** Skills with scripts need `--allow-scripts`; skills with high-severity
  findings need `--allow-risky`. `--yes` grants neither. Without script approval,
  files are installed without execute permission.
- **No silent overwrites.** A skill directory MAP did not install, or one edited since
  installation, is never replaced or deleted. `--force` moves it to a
  `*.map-backup-*` directory first.
- **Confinement.** Writes stay inside the project root and never pass through a
  symlink. Installs are staged and moved into place atomically.
- **Reproducibility.** Installs pin commits and verify content digests; a source that
  changed under a locked SHA fails `map skills install`.

What MAP cannot promise: a clean audit is not proof of safety, and an installed skill
does not make an agent do anything. If a check must always run, enforce it in CI or
a Git hook.

## Recommendations

`map skills suggest` (and `map plan`) map detected evidence to skills:

| Evidence | Skill (default source) |
|---|---|
| Rust (`Cargo.toml`) | `rust-project` |
| Python (`pyproject.toml`, `requirements.txt`, …) | `python-project` |
| WordPress (core files, `wp-content`, theme header, Composer packages) | `wordpress-security-audit`, `wordpress-tailwind-theme` |
| Web UI (Next.js, React, Vue, Angular, Tailwind CSS) | `design-guardrails` |

Rules also report **gaps** — needs no configured skill covers, such as API security
review, container hardening, or pull-request review. Gaps have no installable id.
Profiles (`--profile`) add their skills to the list. A recommendation is only offered
when a configured source actually provides the skill; otherwise it is listed as
unavailable.
