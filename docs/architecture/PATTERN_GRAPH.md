# Pattern graph

The graph is a deterministic projection of registry records. Every catalog entry is a
node. Every valid typed relationship is a directed edge.

## Edge vocabulary

| Type | Meaning | Symmetric? |
|---|---|---|
| `depends_on` | Source normally requires target to function correctly | No |
| `works_with` | Source is commonly composed with target | Conceptually yes; stored direction is preserved |
| `alternative_to` | Target addresses a similar decision with different forces | Conceptually yes |
| `extends` | Source specializes or adds capability to target | No |
| `conflicts_with` | Combining source and target creates a known conflict | Conceptually yes |
| `solves` | Source addresses a named anti-pattern or problem node | No |

Relations are claims and may include a note and evidence references. CI rejects an
edge whose source or target is not in the registry. Duplicate edges normalize by
`from`, `type`, and `to`; ordering is lexical for stable output.

In schema version 1, legacy `related` values become `works_with` edges. This is a
compatibility approximation and must not be presented as stronger semantics than the
author supplied.

## Queries

The MVP supports listing graph statistics and inspecting outgoing edges for a node.
Later queries may add incoming edges, paths, compatibility checks, and subgraphs, but
must return the same node and edge vocabulary.

