# Architecture

MAP separates durable domain knowledge from delivery mechanisms. The pattern library,
registry contracts, graph, scanner results, recommendations, and verification results
form the core. The CLI, website, coding-agent compilers, future MCP server, framework
mappings, and optional assisted analysis are adapters.

```text
                authors / maintainers
                         |
              Markdown + pattern.yaml
                         v
              schema + registry builder
                         |
                 versioned registry
                  /      |       \
                 v       v        v
             catalog   graph   recommender
                 \       |        /
                  \      v       /
                  application ports
                /      |       |      \
              CLI   website   agents   MCP (later)

project files -> scanner adapters -> scan result -> recommendations
.map/ source  -> compiler adapters -> agent-specific projections
```

## Documents

- [System architecture](SYSTEM_ARCHITECTURE.md)
- [Pattern model](PATTERN_MODEL.md)
- [Pattern graph](PATTERN_GRAPH.md)
- [Scanner](SCANNER.md)
- [Recommendation engine](RECOMMENDATION_ENGINE.md)
- [Verification engine](VERIFICATION_ENGINE.md)
- [CLI](CLI.md)
- [MCP adapter](MCP.md)
- [Security](SECURITY.md)

Accepted decisions live in [`.map/decisions`](../../.map/decisions/). Product scope
and delivery order live in [`docs/project`](../project/).

