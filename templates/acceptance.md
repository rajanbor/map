<!--
  MAP acceptance-criteria template.
  Copy this to patterns/<category>/<pattern>/acceptance.md and fill in the placeholders.
  It defines how to verify an implementation of the pattern. Delete these comments.
-->

# Acceptance Criteria — <Pattern Name>

How to verify that an implementation of **<Pattern Name>** is correct and production-safe.
Use it as a review checklist (for humans and AI agents).

## Functional requirements

- [ ] <the pattern does its core job, stated as an observable behavior>
- [ ] <handles the main inputs correctly>
- [ ] <produces the expected outputs / side effects>

## Non-functional requirements

- [ ] **Latency:** <within the stated budget>
- [ ] **Cost:** <within the stated budget>
- [ ] **Scalability:** <behaves under expected load / data size>
- [ ] **Maintainability:** <clear interfaces; the pattern is replaceable>

## Security checks

- [ ] Untrusted input is treated as untrusted (no injection / escalation).
- [ ] Isolation/permissions respected (no cross-tenant or cross-user leakage).
- [ ] No secrets or PII in logs; sensitive data handled per policy.

## Failure modes

For each known failure mode, the implementation degrades safely:

- [ ] <failure mode 1> → <expected safe behavior>
- [ ] <failure mode 2> → <expected safe behavior>
- [ ] On uncertainty, it prefers a safe default (e.g. "I don't know" over a wrong answer).

## Tests

- [ ] Unit tests cover core logic and edge cases.
- [ ] Failure modes above are tested.
- [ ] Tests are deterministic and run in CI.

## Review checklist

- [ ] Matches the pattern's documented trade-offs (didn't silently pick a worse variant).
- [ ] Anti-patterns from `prompt.md` are avoided.
- [ ] Config/tuning knobs are exposed, not hard-coded.
- [ ] Docs/README updated if behavior is user-visible.
