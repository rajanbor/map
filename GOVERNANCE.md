# Governance

MAP (Missing AI Patterns) is an open-source project. This document describes how it is
run so that decisions are transparent and the project stays open to contributors.

## Principles

- **Open by default.** Discussion, decisions, and history happen in public — issues,
  pull requests, and Discussions.
- **Meritocratic.** Influence is earned through good contributions, not granted.
- **Framework-neutral.** Governance protects the project's independence; MAP endorses
  no vendor or framework.

## Roles

### Contributors

Anyone who opens an issue, joins a discussion, or sends a pull request. No prior
permission is needed — see [CONTRIBUTING.md](CONTRIBUTING.md).

### Maintainers

Contributors trusted with review and merge rights. Maintainers are listed in
[MAINTAINERS.md](MAINTAINERS.md). They:

- review and merge pull requests into `dev`,
- triage issues and shepherd Discussions,
- cut releases (`dev → main`),
- uphold the [Code of Conduct](CODE_OF_CONDUCT.md).

### Lead maintainer

The lead maintainer (currently [@rajanbor](https://github.com/rajanbor)) is the
tie-breaker on decisions where maintainers don't reach consensus, and stewards the
project's direction and this governance document.

## Becoming a maintainer

A contributor may be invited to become a maintainer after a track record of quality
contributions and good judgement in reviews. Any existing maintainer can nominate a
contributor; the lead maintainer confirms. New maintainers are added to
`MAINTAINERS.md` and the `CODEOWNERS` file via a normal pull request.

## Decision making

- **Everyday changes** (patterns, fixes, docs): lazy consensus. If no maintainer
  objects and the required checks pass, a maintainer merges.
- **Notable changes** (structure, conventions, scope, governance): open an issue or
  Discussion, allow time for input, and seek maintainer consensus.
- **Disagreements**: resolved by discussion first; if unresolved, the lead maintainer
  decides. Decisions are recorded in the relevant issue/PR.

## Releases

`main` is the published branch. Releases are `dev → main` merges, tagged `vX.Y.Z` by
the [Release workflow](.github/workflows/release.yml). A release should ship real,
user-facing functionality — see the release policy in
[CONTRIBUTING.md](CONTRIBUTING.md#release-process).

## Changing this document

Amend `GOVERNANCE.md` through a pull request, like any other change. Substantial
changes should be raised as an issue or Discussion first.
