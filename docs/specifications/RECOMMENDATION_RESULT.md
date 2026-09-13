# Recommendation result v1

Normative schema: `library/schemas/recommendation-result.schema.json`

```json
{
  "schemaVersion": 1,
  "kind": "map.recommendation-result",
  "scan": {
    "root": "/workspace/example",
    "detectedAt": "2026-09-13T00:00:00.000Z"
  },
  "recommendations": [{
    "pattern": "security/least-privilege-tool-access",
    "priority": "high",
    "rationale": "The model can invoke tools; each tool should expose only the narrowest capability it needs.",
    "triggeredBy": ["tool_calling"]
  }],
  "limitations": [
    "Recommendations infer review candidates from static signals; they do not prove a pattern is absent."
  ]
}
```

Recommendations sort by `high`, `medium`, `low`, then canonical pattern ID. Every item
has a rationale and at least one trigger. An empty recommendation list is a successful
result, not proof that the architecture is complete.

