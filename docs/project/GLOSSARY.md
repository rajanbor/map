# Glossary

| Term | Meaning |
|---|---|
| Pattern | A reusable architecture decision with context, forces, trade-offs, evidence, and verification guidance. |
| Anti-pattern | A recurring design that creates a documented failure mode; modeled like a pattern with `kind: anti-pattern`. |
| Pattern ID | Stable slash-form identifier: `category/slug`. |
| Catalog | All planned and published entries visible to discovery tools. |
| Registry | Versioned machine-readable artifact compiled from the library. |
| Graph | Patterns as nodes and typed relationships as directed edges. |
| Relation | A typed claim such as `depends_on`, `works_with`, or `conflicts_with`. |
| Evidence | A traceable observation supporting a detection, relation, maturity claim, or recommendation. |
| Signal | A static indicator found by a scanner, such as a declared dependency. |
| Detection | A concept inferred from one or more signals. |
| Certainty | `detected`, `likely`, or `unknown`; a summary of evidence strength, not probability of correctness. |
| Recommendation | A pattern suggestion with priority, reason, triggers, and limitations. |
| Verification | A check comparing declared intent or acceptance criteria with observable evidence. |
| `.map/` workspace | Canonical, versioned project memory consumed by MAP and compiled for tools. |
| Adapter | Boundary component translating a framework, host, manifest, or protocol into core MAP contracts. |
| Status | Publication lifecycle: `planned`, `in-progress`, `published`, or later deprecation states. |
| Maturity | Strength of field evidence for an approach; independent from publication status. |

