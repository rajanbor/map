---
kind: decision
id: adr-0005-static-analysis-before-assisted-analysis
title: Static analysis before assisted analysis
status: accepted
date: 2026-09-13
owners: [rajanbor]
tags: [scanner, security, evidence]
priority: high
targets: [agents, claude, gemini, cursor, copilot]
---

# ADR-0005: Static analysis before assisted analysis

## Context

Repository analysis can become invasive, expensive, and non-repeatable if it executes
project code, reads secrets, or uploads source to a model. Dependency manifests provide
a narrower but auditable first signal.

## Decision

The MVP scanner reads declared dependency manifests as data and never executes project
code. It records file-level evidence, numeric confidence, a derived certainty state,
the analyzers used, and limitations. Unsupported or absent evidence is `unknown`, not
proof that a capability is absent.

Source, configuration, semantic, runtime, and LLM analyzers are separate future
adapters with explicit permissions and provenance.

## Consequences

- MVP scanning is fast, local, and safe by default.
- Results have false negatives and cannot verify implementations.
- Recommendation text must explain the evidence boundary.

## Verification

- Scanner tests use fixtures and make no network calls.
- Results list inspected files and analyzer limitations.
- Secret values are never included in output.

