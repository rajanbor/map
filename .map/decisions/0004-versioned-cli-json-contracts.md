---
kind: decision
id: adr-0004-versioned-cli-json-contracts
title: Versioned CLI JSON contracts
status: accepted
date: 2026-09-13
owners: [rajanbor]
tags: [cli, contracts, agents]
priority: high
targets: [agents, claude, gemini, cursor, copilot]
---

# ADR-0004: Versioned CLI JSON contracts

## Context

Terminal prose is useful to people but brittle for automation and agent tools. Adding
fields without an envelope also prevents consumers from knowing which contract they
received.

## Decision

Commands with machine output emit a JSON document with `schemaVersion`, `kind`, and
command-specific payload. JSON mode writes no headings, colors, or success messages to
standard output. Diagnostic warnings go to standard error. Arrays use documented,
deterministic ordering.

Existing human output stays the default. Existing commands remain, while clearer names
(`list`, `show`, `search`, `scan`, `suggest`) are additive aliases over the same core
use cases.

## Consequences

- Agents can consume CLI results without text scraping.
- Contract changes require deliberate versioning and fixtures.
- Reporter implementations and tests must preserve stdout/stderr separation.

## Verification

- JSON outputs validate against published schemas where one exists.
- Alias and original commands produce equivalent payloads.
- Snapshot tests assert deterministic ordering and absence of decoration.

