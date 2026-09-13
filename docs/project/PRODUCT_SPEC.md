# Product specification

## Problem

AI architecture intent is scattered across source code, prompts, vendor settings,
chat history, and tribal knowledge. Humans struggle to compare designs, while agents
guess project rules from incomplete context. Existing tools usually bind their model
to a particular framework or require a remote model to interpret the repository.

## Users and jobs

- **AI engineer:** discover a suitable pattern, inspect trade-offs, adopt it, and
  verify the implementation.
- **Architect or tech lead:** review declared decisions and compare them with detected
  evidence and known risks.
- **Coding agent:** consume stable JSON and Markdown contracts without scraping prose.
- **Pattern maintainer:** publish evidence-backed knowledge once for the CLI, website,
  agents, and future protocol adapters.

## Product loop

```text
discover -> show -> scan -> suggest -> adopt -> sync -> validate -> verify
```

The MVP implements discovery, display, dependency-based scanning, explainable
suggestions, adoption, compilation, contract validation, and graph inspection.
Verification starts with contract and acceptance-data validation; deeper source and
runtime checks follow later.

## Functional requirements

1. A versioned pattern contract supports human guidance and machine fields.
2. Registry data exposes stable IDs, lifecycle, categories, and typed relationships.
3. The CLI lists, searches, and shows patterns in text and JSON.
4. The scanner returns evidence, confidence, certainty, and explicit limitations.
5. The recommendation engine is deterministic and explains every suggestion.
6. The graph can be inspected as nodes and typed edges with no dangling targets.
7. `map validate` checks structured MAP artifacts without executing project code.
8. Existing `patterns`, `explain`, `analyze`, and `recommend` workflows remain valid.
9. Core behavior works offline from the bundled registry snapshot.

## Quality attributes

- Same input and registry version produce equivalent ordered results.
- JSON output is versioned and contains no terminal decoration.
- A malformed contract fails with an actionable path and message.
- Scanning does not read secret values, execute repository code, or make network calls.
- Extension fields are explicit; unknown core fields fail validation.
- Documentation describes current behavior separately from roadmap behavior.

## Success measures

- A new user can install from GitHub, initialize a project, scan it, receive a reasoned
  recommendation, inspect a pattern, and compile agent instructions.
- CI validates every public schema with valid and invalid fixtures.
- MAP can scan its own tooling workspace and produce a stable JSON report.
- The README never advertises a distribution path that does not exist.

