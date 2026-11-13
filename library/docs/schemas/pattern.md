# Pattern Schema v1

Pattern Schema v1 validates the structured identity and decision metadata in
`pattern.yaml`. JSON Schema is authoritative; YAML is the authoring syntax.

## Required fields

| Field | Meaning |
|---|---|
| `id` | Stable `category/slug` identifier |
| `name` | Human display name |
| `category` | Catalog category matching the ID and directory |
| `summary` | Concise statement of the decision or failure mode |
| `when_to_use` | Conditions supporting adoption; non-empty for a pattern |
| `when_not_to_use` | Conditions arguing against adoption; non-empty |
| `score` | Five MAP Score dimensions, each integer 1–5 |

`kind` defaults to `pattern` for compatibility. `maturity`, aliases, references,
typed `relations`, and legacy `related` are optional. `related` normalizes to
`works_with`; new authoring SHOULD use typed relations once tooling support ships.

```yaml
id: retrieval/chunking
kind: pattern
name: Chunking
category: retrieval
summary: Split source material into retrievable units with preserved context.
maturity: established
when_to_use:
  - Documents exceed the useful retrieval or model context size.
when_not_to_use:
  - The complete source already fits and must be reasoned over as a whole.
relations:
  - type: works_with
    target: retrieval/hybrid-search
    note: Hybrid search operates over the resulting chunks.
score:
  complexity: 2
  latency: 2
  cost: 2
  accuracyImpact: 4
  productionReadiness: 5
references:
  - https://example.com/evidence
```

Unknown core fields fail validation. Extension fields require an explicitly supported
`x-` container in a future schema revision; arbitrary keys are not accepted in v1.

