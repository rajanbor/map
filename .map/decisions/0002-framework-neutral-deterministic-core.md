---
kind: decision
id: adr-0002-framework-neutral-deterministic-core
title: Framework-neutral deterministic core
status: accepted
date: 2026-09-13
owners: [rajanbor]
tags: [architecture, core, adapters]
priority: high
targets: [agents, claude, gemini, cursor, copilot]
---

# ADR-0002: Framework-neutral deterministic core

## Context

MAP must describe systems built with many model providers, languages, and agent
frameworks. Binding the domain to one SDK would shorten an initial implementation but
make patterns, scanners, and recommendations obsolete when that SDK changes. Requiring
an LLM would also make baseline results non-repeatable and unavailable offline.

## Decision

Registry parsing, graph construction, validation, static scanning, and baseline
recommendation are pure or deterministic core capabilities. They MUST NOT depend on a
model provider, agent framework, remote service, or MCP runtime.

Framework manifests, coding-agent formats, MCP, semantic indexes, and optional LLM
reasoning are adapters at explicit boundaries. Core types use MAP vocabulary and may
carry adapter evidence without importing adapter-specific types.

## Consequences

- Core commands work offline and are straightforward to test.
- Framework integrations can evolve independently.
- Some framework-specific insight will initially be less deep than a dedicated tool.
- Optional assisted output must be labeled and cannot replace deterministic evidence.

## Verification

- Core package dependency graphs contain no model SDK.
- Tests use fixed inputs and require no network.
- CLI JSON outputs identify limitations and remain stable for identical inputs.

