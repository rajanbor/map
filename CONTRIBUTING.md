# Contributing to MAP

First off — **thank you.** MAP (Missing AI Patterns) is a community knowledge base,
and it only becomes the definitive reference for AI Engineering if people like you
contribute patterns, diagrams, benchmarks, fixes, and reference implementations.

This document describes **how** to contribute. It is intentionally strict about
process so that a catalog of hundreds of patterns stays coherent, reviewable, and
maintainable. Please read it before opening your first pull request.

By participating, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md).

**Licensing of contributions:** by contributing you agree that your work is released
under the project's licenses — **code under [MIT](LICENSE), content (patterns/docs)
under [CC BY 4.0](LICENSE-CONTENT)** (inbound = outbound). You keep copyright to your
contributions; content is credited via attribution. See [LICENSING.md](LICENSING.md).

---

## TL;DR — the contribution flow

> **Issue → Branch → Commits → Pull Request → `dev`**

```
1. Open (or claim) an ISSUE describing the change.
2. Wait for a maintainer to assign / approve it (for new patterns).
3. Create a TYPED BRANCH off `dev`  ── e.g. pattern/retrieval-reranking
4. Make focused COMMITS using Conventional Commits, referencing the issue.
5. Open a PULL REQUEST targeting `dev` (never `main`).
6. Address review feedback; a maintainer merges into `dev`.
7. Maintainers periodically promote `dev` → `main` as a release.
```

**No orphan PRs.** Every pull request must link to an issue. This keeps discussion,
decisions, and history in one place.

---

## Branching model

MAP uses a simple two-trunk model:

| Branch | Purpose | Who writes to it |
|--------|---------|------------------|
| `main` | Stable, released, "published" catalog. Always deployable. | Maintainers only, via release merges from `dev`. |
| `dev`  | Integration branch. All contributions land here first. | Everyone, via reviewed pull requests. |

**All contributor branches are created from `dev` and all pull requests target
`dev`.** Direct pushes to `main` and `dev` are not allowed; changes arrive through
pull requests. **`main` never receives changes directly** — it only advances when
`dev` is merged into it during a release (see [Release process](#release-process)).

```
main   ●────────────────●───────────────●   (releases only)
        \              / \             /
dev      ●──●──●──●──●●   ●──●──●──●──●●      (integration)
             \    /            \    /
feature/…     ●──●   fix/…      ●──●          (your work)
```

### Branch naming

Branches **must** be prefixed with a type, followed by a short kebab-case slug that
usually includes the category and pattern:

| Prefix | Use for | Example |
|--------|---------|---------|
| `pattern/` | Adding a brand-new pattern article | `pattern/retrieval-reranking` |
| `feature/` | New non-pattern capability (tooling, website, template) | `feature/website-search` |
| `fix/` | Correcting an error in content or code | `fix/memory-summary-typo` |
| `docs/` | Project-level docs (README, guides, glossary) | `docs/clarify-philosophy` |
| `refactor/` | Restructuring without changing meaning | `refactor/reference-python-layout` |
| `chore/` | Housekeeping, config, dependencies | `chore/bump-deps` |
| `ci/` | CI/CD workflows and pipelines | `ci/add-cli-workflow` |

> Include the issue number in the branch when helpful: `pattern/retrieval-reranking-42`.

---

## Commit conventions

MAP uses [**Conventional Commits**](https://www.conventionalcommits.org/). This keeps
history readable and lets us automate changelogs.

```
<type>(<scope>): <short summary>

<optional body — the "why", not the "what">

Refs #<issue-number>
```

**Types:** `feat`, `fix`, `docs`, `refactor`, `chore`, `test`, `style`, `perf`.

**Scope** is usually the category or area, e.g. `retrieval`, `memory`, `template`, `ci`.

Examples:

```
docs(retrieval): add Reranking pattern

Documents cross-encoder reranking with when-to-use guidance,
trade-offs, and a tiny reference implementation.

Refs #42
```

```
fix(memory): correct token math in Summary Memory example

Refs #57
```

Every commit **should reference its issue** with `Refs #N` (or `Closes #N` on the
commit/PR that completes it).

---

## Ways to contribute

### 1. Add a new pattern (the main event)

1. **Find or open an issue** using the **"New Pattern"** issue template. Check the
   [Roadmap](ROADMAP.md) and existing issues first to avoid duplicates.
2. **Wait to be assigned.** A maintainer confirms the pattern fits MAP's scope and
   the correct category, so you don't invest effort in something that won't merge.
3. **Copy the template.** Duplicate
   [`patterns/_template/PATTERN_TEMPLATE.md`](patterns/_template/PATTERN_TEMPLATE.md)
   into the right category folder:

   ```
   patterns/<category>/<pattern-slug>/README.md
   ```

   Use a kebab-case slug, e.g. `patterns/retrieval/reranking/README.md`.
   Put diagrams and assets in an `assets/` subfolder next to the article.
4. **Fill in every required section.** See
   [docs/pattern-anatomy.md](docs/pattern-anatomy.md) for what each section means and
   [docs/style-guide.md](docs/style-guide.md) for tone and formatting.
5. **Keep it framework-agnostic.** The pattern must make sense without any specific
   library. Reference implementations may use libraries, but the article explains the
   architecture.
6. **Open a PR into `dev`** and link the issue.

### 2. Improve an existing pattern

Use the **"Pattern Improvement"** issue template — clarifications, better diagrams,
added production variants, benchmarks, or corrections. Branch with `fix/` or `docs/`.

### 3. Add a reference implementation

Small, readable, framework-agnostic code under
[`reference/python/`](reference/python/) or
[`reference/typescript/`](reference/typescript/), mirrored by category and pattern
slug. See [reference/README.md](reference/README.md) for conventions.

### 4. Non-pattern contributions

Tooling, the website, CI, the glossary, translations — all welcome. Use `feature/`,
`chore/`, or `docs/` branches and the matching issue template.

---

## Quality bar (Definition of Done)

A pattern PR is ready to merge when:

- [ ] It links to an approved issue.
- [ ] It follows the [pattern template](patterns/_template/PATTERN_TEMPLATE.md) — all required sections present.
- [ ] It is **framework-agnostic**; decisions and trade-offs are explicit.
- [ ] **When to use** and **When NOT to use** are concrete and honest.
- [ ] It has at least one **architecture diagram** (Mermaid or an image in `assets/`).
- [ ] Any reference implementation is minimal, readable, and runs.
- [ ] Links to **Related Patterns** and **References** are included.
- [ ] Prose follows the [style guide](docs/style-guide.md); links are valid.
- [ ] Commits follow Conventional Commits and target `dev`.

---

## Pull request process

1. Push your branch and open a PR **into `dev`**.
2. Fill out the PR template completely, including `Closes #<issue>`.
3. Automated checks (link-check, formatting) must pass.
4. At least one maintainer reviews. Address feedback with additional commits
   (don't force-push over review history unless asked).
5. A maintainer merges (squash or rebase) into `dev`.
6. Your work ships to `main` in the next release promotion.

---

## Release process

`main` is the default, published branch. It only changes through a release, and a
release is one thing: merging `dev` into `main`. Each release is tagged.

```
1. Work is reviewed and merged into `dev` (via PRs, as above).
2. Bump the root VERSION file on `dev` (e.g. 0.1.0 -> 0.2.0) via a chore PR.
3. When `dev` is ready to publish, a maintainer opens a release PR: dev -> main.
4. Required checks must pass. The head branch must be `dev`.
5. A maintainer merges the release PR. `main` now matches the released state.
6. The Release workflow reads VERSION and creates the `vX.Y.Z` tag + GitHub Release.
```

Rules:

- **No change reaches `main` except through a `dev -> main` release merge.**
- No feature, fix, or pattern branch is ever merged into `main` directly.
- No one pushes to `main` directly. Branch protection enforces this; the
  [PR Policy workflow](.github/workflows/pr-policy.yml) rejects any PR into `main`
  whose head branch is not `dev`.
- Releases are versioned by the root [`VERSION`](VERSION) file and tagged by the
  [Release workflow](.github/workflows/release.yml). Tagging is idempotent: if the tag
  for the current VERSION already exists, nothing happens.

### Release policy: ship functionality, not meta

A release must deliver **user-facing value** — a new pattern, a working CLI command or
capability, a meaningful docs improvement. Do **not** cut a release that only contains
project-internal churn (CI tweaks, refactors, governance, formatting). Batch that kind
of change on `dev` and let it ride along with the next functional release.

Rule of thumb: if a reader or a CLI user wouldn't notice the difference, it's not a
release on its own. Bump `VERSION` and tag only when the release earns it.

The full picture:

```
issue  ->  branch (feature/fix/pattern/docs)  ->  commits  ->  PR into dev  ->  merge to dev
                                                                                     |
                                                                        release PR:  dev -> main
```

---

## Local setup

MAP is primarily Markdown, so getting started is light:

```bash
# 1. Fork the repo on GitHub, then clone your fork
git clone https://github.com/<you>/map.git
cd map

# 2. Track the upstream and base your work on dev
git remote add upstream https://github.com/<org>/map.git
git fetch upstream
git switch -c pattern/<category>-<slug> upstream/dev

# 3. Work, commit (Conventional Commits), push to your fork
git push -u origin pattern/<category>-<slug>

# 4. Open a PR from your branch into upstream `dev`
```

Keep your branch up to date by rebasing onto the latest `dev`.

---

## Getting help

- **Questions & ideas:** open a [GitHub Discussion](../../discussions).
- **Not sure a pattern belongs?** Open a "New Pattern" issue and ask — that's what it's for.
- **Found a mistake?** Open a "Pattern Improvement" or "Bug" issue.

We review every contribution with care and appreciation. Welcome to MAP.
