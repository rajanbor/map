# MAP schemas

MAP schemas are contracts, not a replacement for documentation. Each schema is
published with a guide, examples, invalid fixtures, and an offline CI check.

| Contract | Machine-readable | Human-readable |
|---|---|---|
| Typed `.map/` document frontmatter | [`document.schema.json`](../../schemas/document.schema.json) | [Document envelope](document.md) |
| `.map/map.config.json` | [`project.schema.json`](../../schemas/project.schema.json) | [Project manifest](project.md) |
| Architecture decision record | [`decision.schema.json`](../../schemas/decision.schema.json) | [Decision records](decision.md) |
| Pattern and anti-pattern metadata | [`pattern.schema.json`](../../schemas/pattern.schema.json) | [Pattern Schema v1](../../../docs/specifications/PATTERN_SCHEMA.md) |
| Static scan result | [`scan-result.schema.json`](../../schemas/scan-result.schema.json) | [Scan result v1](../../../docs/specifications/SCAN_RESULT.md) |
| Pattern suggestions | [`recommendation-result.schema.json`](../../schemas/recommendation-result.schema.json) | [Recommendation result v1](../../../docs/specifications/RECOMMENDATION_RESULT.md) |

Schemas use JSON Schema draft 2020-12. Stable fields are strict; experiments use an
`x-` prefix. A schema change that alters accepted meaning requires compatibility and
migration notes.
