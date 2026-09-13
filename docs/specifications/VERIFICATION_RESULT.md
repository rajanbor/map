# Verification result v1 design

Status: planned after structural validation MVP.

A verification result will identify the declared subject, check method, outcome,
evidence, limitations, and time. Outcomes are:

- `pass`: the bounded check observed the required condition;
- `fail`: the bounded check observed a contradiction;
- `unknown`: evidence was insufficient or inspection failed;
- `not-applicable`: the criterion does not apply in this context.

```json
{
  "schemaVersion": 1,
  "kind": "map.verification-result",
  "subject": "retrieval/chunking",
  "verifiedAt": "2026-09-13T00:00:00.000Z",
  "checks": [{
    "id": "metadata-valid",
    "method": "json-schema",
    "outcome": "pass",
    "evidence": ["library/patterns/retrieval/chunking/pattern.yaml"]
  }],
  "summary": { "pass": 1, "fail": 0, "unknown": 0, "notApplicable": 0 }
}
```

The MVP `map validate` command may report structural validation in human-readable
form before this wider verification contract becomes normative. It must not label
schema validity as implementation verification.

