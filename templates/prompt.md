<!--
  MAP prompt template for AI coding agents (Claude Code / Cursor / Gemini CLI).
  Copy this to patterns/<category>/<pattern>/prompt.md and fill in the placeholders.
  Keep it practical and copy-pasteable. Delete these comments.
-->

# Implementation Prompt — <Pattern Name>

> Paste this into your AI coding agent to implement the **<Pattern Name>** pattern in an
> existing project. Adjust the Context section to your codebase.

## Goal

Implement <Pattern Name> so that <the concrete outcome the pattern achieves>.

## Context

- **Project:** <language, framework, where this fits, e.g. "TypeScript service, existing RAG pipeline">.
- **Current state:** <what exists today and why it's insufficient>.
- **Related MAP pattern:** <category>/<pattern> — read its README before implementing.

## Requirements

- <requirement 1>
- <requirement 2>
- <requirement 3>

## Constraints

- <performance / cost / latency limits>
- <security / privacy constraints>
- <do not introduce new heavy dependencies unless justified>

## Anti-patterns to avoid

- <the naive approach this pattern exists to prevent>
- <common mistake 1>
- <common mistake 2>

## Architecture expectations

- <where the code should live; separation of concerns>
- <interfaces/abstractions to keep it replaceable>
- <how it composes with existing components>

## Security considerations

- <untrusted input handling>
- <isolation / permissions>
- <secret handling, logging/PII>

## Acceptance criteria

Implement to satisfy `acceptance.md` in this pattern folder. In short:

- <key functional check>
- <key non-functional check>
- <key security check>

## Test expectations

- Unit tests for <core logic and edge cases>.
- <integration test if relevant>.
- Tests must be deterministic and run in CI.

---

*MAP gives you architectural context and guardrails; you (the agent) still write and verify
the code. When in doubt, prefer the pattern's documented trade-offs over cleverness.*
