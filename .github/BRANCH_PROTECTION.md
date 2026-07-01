# Branch Protection (Maintainer Setup)

MAP's workflow (**Issue → Branch → Commits → PR → `dev`**, with `dev → main` release
promotions) relies on branch protection. It is applied to both branches (admins
included). Some settings can only be set in the GitHub UI / API, not from a file.

## Required status checks

Every PR into `dev` or `main` must pass these checks (the context names come from the
workflow jobs):

| Check context | Workflow | What it verifies |
|---------------|----------|------------------|
| `branch-policy` | `.github/workflows/pr-policy.yml` | Base/head branch rules (PRs into `main` come only from `dev`; typed branches into `dev`). |
| `link-issue` | `.github/workflows/pr-policy.yml` | The PR links an issue (no orphan PRs). |
| `markdown-link-check` | `.github/workflows/link-check.yml` | No broken Markdown links. |
| `cli` | `.github/workflows/cli.yml` | CLI typecheck, tests, and `map init` smoke test. |

## `main` (stable / released)

- ✅ Require a pull request before merging
- ✅ Require all four status checks above to pass
- ✅ Enforce for administrators (no direct pushes, even for admins)
- ✅ Do not allow force pushes or deletions
- ✅ Only allow PRs into `main` **from `dev`** (enforced by the `branch-policy` check)

## `dev` (integration)

- ✅ Require a pull request before merging
- ✅ Require all four status checks above to pass
- ✅ Do not allow force pushes or deletions

## Default branch

The repository's **default branch is `main`** (the stable, published branch visitors
see). Work still integrates on `dev`: contributors branch off `dev` and open PRs into
`dev`, and `main` only advances via a `dev → main` release merge. When opening a PR,
set the base to `dev` (the `branch-policy` check rejects non-`dev` heads into `main`).

## Releases and tags

Releases are tagged automatically. The root [`VERSION`](../VERSION) file holds the
current version; the [Release workflow](workflows/release.yml) runs on push to `main`
and, when `VERSION` names a tag that doesn't yet exist, creates `vX.Y.Z` and a GitHub
Release. To cut a release, bump `VERSION` on `dev`, then merge the `dev → main` release
PR.

## Suggested settings

- Enable **"Automatically delete head branches"** after merge.
- Enable **squash merging**; keep a clean, Conventional-Commit-style history.
