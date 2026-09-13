# MCP adapter

MCP is a later delivery adapter, not part of the deterministic MVP. It will expose the
same application ports and JSON contracts as the CLI.

Candidate read-only tools are `list_patterns`, `show_pattern`, `search_patterns`,
`scan_project`, `suggest_patterns`, `inspect_graph`, and `validate_map`. Inputs must be
bounded to an approved workspace, results must carry schema versions, and transport
metadata must remain outside core domain objects.

Write tools are not assumed. Adding one requires a separate ADR covering authorization,
preview, path traversal, overwrite behavior, audit trail, and human approval. The core
must remain installable and testable without MCP dependencies.

See [ADR-0006](../../.map/decisions/0006-mcp-as-a-separate-adapter.md).

