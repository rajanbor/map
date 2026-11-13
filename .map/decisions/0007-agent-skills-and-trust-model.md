---
kind: decision
id: adr-0007-agent-skills-and-trust-model
title: Agent Skills management and trust model
status: proposed
date: 2026-11-13
owners: [rajanbor]
tags: [skills, security, supply-chain]
priority: normal
targets: [agents, claude, gemini, cursor, copilot]
---

# ADR-0007: Agent Skills management and trust model

## Context

MAP now installs Agent Skills (`SKILL.md` folders) from Git repositories into the
project directories coding agents read. Skills are instructions an agent follows and
may bundle scripts an agent runs, so they are a supply-chain input, not documentation.

## Decision

MAP uses the published Agent Skills format and defines no competing one. Skill
management is a deterministic core capability with these rules:

1. Trust levels are distinct: built-in MAP metadata is trusted; configured sources
   are chosen by the user; fetched skill content is untrusted until audited and
   approved; installed skills are approved content, not granted permissions; bundled
   scripts are never executed by MAP.
2. Git sources are read from a private bare cache with `ls-tree`/`cat-file`, never a
   checkout. Symlinks, submodules, unsafe paths, and oversized content block
   installation.
3. Installs pin a commit SHA and a content integrity digest in
   `.map/skills.lock.json`. Branch names only locate a commit.
4. Bundled scripts and high-severity audit findings require explicit approval
   (`--allow-scripts`, `--allow-risky`). `--yes` never implies either. Without
   script approval, execute permission is removed.
5. MAP never overwrites or deletes a directory it did not install or that changed
   since installation; `--force` moves it to a backup instead.
6. Generated agent instruction files carry a content hash; hand-written or hand-edited
   files are conflicts, not overwrite targets.

## Consequences

- Skill installs are reproducible and reviewable in diffs.
- The content audit is heuristic; it reduces risk but cannot prove a skill safe.
- Skills guide agents but enforce nothing; CI or hooks must enforce required checks.
- Git becomes a runtime prerequisite for git skill sources.

## Verification

- Tests cover malicious paths, symlinks, scripts, hidden Unicode, prompt-injection
  phrasing, tampered lockfiles, and exact-revision reinstall, using local fixtures.
- `map skills audit` and `map doctor` fail when installed skills drift from the lock.
