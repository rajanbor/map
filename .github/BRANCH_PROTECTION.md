# Branch Protection (Maintainer Setup)

MAP's workflow (**Issue → Branch → Commits → PR → `dev`**, with `dev → main` release
promotions) relies on branch protection. Configure this once under
**Settings → Branches** after creating the `main` and `dev` branches.

## `main` (stable / released)

- ✅ Require a pull request before merging
- ✅ Require the **PR Policy** and **Link Check** status checks to pass
- ✅ Restrict who can push (maintainers only)
- ✅ Require branches to be up to date before merging
- ✅ Do not allow direct pushes
- Recommended: only allow PRs into `main` **from `dev`** (also enforced by CI).

## `dev` (integration)

- ✅ Require a pull request before merging
- ✅ Require the **PR Policy** and **Link Check** status checks to pass
- ✅ Require at least one approving review
- ✅ Do not allow direct pushes

## Default branch

Set the repository's **default branch to `dev`** so new contributor branches and PRs
target it automatically. `main` stays the "published" branch that the website (future)
builds from.

## Suggested settings

- Enable **"Automatically delete head branches"** after merge.
- Enable **squash merging**; keep a clean, Conventional-Commit-style history.
