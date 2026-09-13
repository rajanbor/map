# Pattern specification v1

Status: MVP contract  
Normative schema: `library/schemas/pattern.schema.json`

A published pattern directory is `library/patterns/<category>/<slug>/` and contains:

```text
README.md       complete human guide and trade-offs
pattern.yaml    structured metadata validated by Pattern Schema v1
prompt.md       implementation brief for a coding agent or developer
acceptance.md   verifiable acceptance criteria
diagram.mmd     source architecture diagram
```

The directory path, `id`, and `category` MUST agree. A pattern MUST be useful without
its prompt and MUST remain understandable without executing code. References support
claims; they do not replace the explanation.

`README.md` SHOULD cover problem, context, decision forces, when to use, when not to
use, flow, trade-offs, failure modes, implementation guidance, verification, related
patterns, and references. An anti-pattern uses the same structure but explains the
harmful recurring design and safer alternatives.

Compatibility rules and typed relation semantics are defined in
[`PATTERN_SCHEMA.md`](PATTERN_SCHEMA.md).

