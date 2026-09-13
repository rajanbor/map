---
kind: decision
id: adr-0003-stable-pattern-identity-and-schema
title: Stable pattern identity and schema
status: accepted
date: 2026-09-13
owners: [rajanbor]
tags: [patterns, schema, compatibility]
priority: high
targets: [agents, claude, gemini, cursor, copilot]
---

# ADR-0003: Stable pattern identity and schema

## Context

MAP already publishes and cross-references slash-form pattern IDs. Proposed examples
sometimes use dotted IDs, and the current YAML contract is described but not enforced.
A silent identifier migration would break links, commands, adopted patterns, and caches.

## Decision

Pattern Schema v1 uses canonical IDs matching `^[a-z0-9-]+/[a-z0-9-]+$`. A record has
an explicit `kind` (`pattern` or `anti-pattern`), lifecycle status, optional evidence
maturity, decision guidance, and typed relationships. Flat `related` input remains a
supported compatibility field and normalizes to `works_with` edges.

Aliases may accept alternate spelling at input boundaries, but public output and graph
nodes return the canonical slash-form ID. Meaning-changing contract updates require a
new schema version and migration notes.

## Consequences

- Existing links and CLI workflows remain valid.
- Patterns and anti-patterns share validation and discovery infrastructure.
- Authors must distinguish publication status from evidence maturity.
- Compatibility normalization adds a small amount of registry-builder logic.

## Verification

- Schema fixtures cover canonical IDs, anti-patterns, relationships, and failures.
- Registry parsing rejects duplicate IDs and dangling relation targets.
- Existing five published patterns validate without identity changes.

