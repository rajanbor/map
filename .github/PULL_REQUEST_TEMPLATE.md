<!--
  Thanks for contributing to MAP!
  Every PR should link to an issue. See library/CONTRIBUTING.md.
-->

## Summary

<!-- What does this PR do, in one or two sentences? -->

## Linked issue

Closes #<!-- issue number -->

## Type of change

- [ ] New pattern or pattern improvement
- [ ] Bug fix
- [ ] Feature / tooling
- [ ] Docs
- [ ] Refactor / chore

## Checklist

- [ ] The PR targets the branch described in [CONTRIBUTING.md](../blob/main/library/CONTRIBUTING.md).
- [ ] Commits follow Conventional Commits and reference the issue.
- [ ] `corepack pnpm lint && corepack pnpm typecheck && corepack pnpm test` pass in `tooling/`.
- [ ] Registry and schema checks pass (`node library/scripts/build-registry.ts --check`, `node library/scripts/validate-schemas.ts`).
- [ ] Generated agent files are current (`map sync --check`).

### For pattern PRs

- [ ] Uses the [pattern template](../blob/main/library/patterns/_template/) with all required sections.
- [ ] Content is framework-agnostic; trade-offs are explicit.
- [ ] **When to use** and **When not to use** are concrete.
- [ ] Related patterns and references are linked.

## Notes for reviewers
