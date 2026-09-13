# Pattern model

A pattern is a decision record packaged for discovery, comparison, implementation,
and verification. An anti-pattern uses the same base contract because it needs the
same identity, context, evidence, relations, and lifecycle.

## Identity and lifecycle

- `id`: immutable `category/slug` identity in schema version 1.
- `kind`: `pattern` or `anti-pattern`.
- `status`: editorial publication state; initially `planned`, `in-progress`, or
  `published`.
- `maturity`: field-evidence state, independent from publication. Existing values
  (`emerging`, `established`, `declining`) remain valid until a separately evidenced
  lifecycle change.
- `version`: version of the pattern content, not the registry or schema.

## Decision guidance

Published patterns provide a summary, problem, when-to-use and when-not-to-use
conditions, trade-offs or failure modes, references, implementation guidance, and
acceptance criteria. Structured metadata is concise and points to the complete human
document rather than duplicating every paragraph.

## Evidence

Evidence is a source claim with provenance and optional retrieval date. Maturity and
benchmarks must cite evidence. MAP does not treat popularity, a vendor assertion, or
an LLM-generated statement as independent validation.

## Compatibility

Existing `pattern.yaml` records remain valid. Missing `kind` normalizes to `pattern`.
Existing flat `related` entries normalize to typed `works_with` edges. Serializers may
emit normalized fields, but consumers accept the compatibility form for all v1 data.

The normative shape is defined by
[`PATTERN_SCHEMA.md`](../specifications/PATTERN_SCHEMA.md).

