# Scan result v1

Normative schema: `library/schemas/scan-result.schema.json`

A scan result is one JSON document:

```json
{
  "schemaVersion": 1,
  "kind": "map.scan-result",
  "root": "/workspace/example",
  "detectedAt": "2026-09-13T00:00:00.000Z",
  "analyzers": ["dependency-manifest"],
  "inspected": ["package.json"],
  "concepts": [{
    "concept": "tool_calling",
    "confidence": 0.95,
    "certainty": "detected",
    "evidence": ["package.json: @modelcontextprotocol/sdk"]
  }],
  "limitations": [
    "Dependency manifests indicate declared packages, not whether or how code uses them."
  ]
}
```

`concepts`, `analyzers`, `inspected`, and `evidence` use deterministic ordering.
`detectedAt` is observational metadata and is expected to differ between runs. Paths
may be absolute for local CLI output; retained examples and telemetry MUST sanitize
user-specific roots.

