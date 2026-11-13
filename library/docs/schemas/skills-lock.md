# Skills lockfile v1

`.map/skills.lock.json` records every Agent Skill MAP installed in the project, pinned
to an immutable source revision. Commit it: `map skills install` on another machine
reproduces exactly the same files.

Machine contract: [`skills-lock.schema.json`](../../schemas/skills-lock.schema.json).

## Fields

| Field | Required | Meaning |
|---|---:|---|
| `lockfileVersion` | yes | Always `1`. A newer value makes this CLI refuse the file. |
| `skills` | yes | Map from skill name (`[a-z0-9-]`, the Agent Skills `name`) to an entry. |
| `skills.<name>.source` | yes | The source definition used: `{ id, type: "git", url, ref? }` or `{ id, type: "local", path }`. |
| `skills.<name>.path` | yes | Skill directory inside the source, e.g. `dev/python-project`. |
| `skills.<name>.revision` | yes | Git commit SHA (never a branch name), or `sha256-…` for local sources. |
| `skills.<name>.integrity` | yes | `sha256-<hex>` over every file's relative path and content digest, in sorted order. File modes are excluded. |
| `skills.<name>.version` | no | `metadata.version` from `SKILL.md`, for display only. |
| `skills.<name>.scope` | yes | `"project"`. Global installation is not supported. |
| `skills.<name>.targets` | yes | Skill directories written and the agents each serves, e.g. `{ "dir": ".claude/skills", "agents": ["claude", "cursor"] }`. |
| `skills.<name>.files` | yes | Every file MAP wrote, relative to the skill directory. Removal and updates touch only these. |
| `skills.<name>.approvals` | yes | `{ scripts, risky }`: whether the user approved bundled scripts (execute bit kept) and high-severity audit findings. |

Unknown fields fail validation; extensions use an `x-` prefix.

## Example

See [`fixtures/skills-lock/valid/pinned.json`](../../schemas/fixtures/skills-lock/valid/pinned.json).
Invalid fixtures cover a branch name used as a revision, a `..` file path, an unknown
agent, and a non-project scope.

## Behavior

- Keys and arrays are sorted and no timestamps are stored, so the file only changes
  when installed state changes.
- `map skills install` fetches each locked revision and fails, without writing, when
  the computed integrity differs from the lock.
- `map skills audit` and `map doctor` compare files on disk with `integrity` and
  report `modified` or `missing` copies.

## Compatibility

New in this release. Projects without the file behave as if no skill is installed.
