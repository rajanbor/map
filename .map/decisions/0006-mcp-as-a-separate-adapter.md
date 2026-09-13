---
kind: decision
id: adr-0006-mcp-as-a-separate-adapter
title: MCP as a separate adapter
status: accepted
date: 2026-09-13
owners: [rajanbor]
tags: [mcp, adapters, security]
priority: medium
targets: [agents, claude, gemini, cursor, copilot]
---

# ADR-0006: MCP as a separate adapter

## Context

MCP can expose MAP knowledge to agents, but it introduces transport, lifecycle,
permissions, and compatibility concerns unrelated to the core domain.

## Decision

MCP is deferred from the deterministic MVP and will live in a separate adapter package.
It will call the same registry, graph, scanner, recommendation, and validation ports as
the CLI. The MCP layer may format or transport results but must not define alternate
pattern semantics.

Initial MCP tools should be read-only. Any future mutation tool requires an explicit
threat model, path boundary, preview, and human approval policy.

## Consequences

- The core remains usable without an MCP runtime.
- CLI and MCP behavior can share contract tests.
- MCP delivery follows rather than blocks the MVP.

## Verification

- No MCP dependency exists in core packages.
- Future MCP results validate against the same public contracts as CLI JSON.
- Security review precedes any write-capable MCP tool.

