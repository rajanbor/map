# Security architecture

## Assets and trust boundaries

MAP handles repository paths, documentation, dependency manifests, generated agent
instructions, registry caches, and future adapter inputs. Repository content and
registry downloads are untrusted data. Agent instruction text can influence downstream
tools even when it is not executable by MAP.

## MVP controls

- Static scanners read allowlisted manifest names and do not execute repository code.
- Scanner output records dependency names and file paths, never secret values.
- File operations resolve under an explicit project root and preserve existing files
  unless the command contract authorizes overwrite.
- Registry parsing validates shape, schema version, unique IDs, and references.
- Cache corruption degrades to a bundled snapshot with a warning.
- Generated target files are projections from reviewable `.map/` sources.
- Core commands work without network access or credentials.
- Dependencies are pinned through the lockfile and checked by CI and security audit.

## Threats requiring continued review

| Threat | Mitigation direction |
|---|---|
| Path traversal in pattern IDs or output paths | Restrictive ID grammar, path containment checks, fixtures |
| Malicious prompt text in a pattern | Provenance, human review, clear source boundaries; never execute text |
| Registry substitution or downgrade | Schema version, source reporting, future integrity metadata |
| Secret disclosure by new analyzers | Allowlisted fields, redaction, tests, explicit permissions |
| Untrusted plugin execution | No executable third-party plugin loading in MVP |
| Agent writes through future MCP | Read-only first; separate threat model and approval policy |
| Denial of service from large inputs or graphs | File-size, node, edge, and traversal bounds in adapters |

Security reports follow the repository security policy. A new analyzer or write-capable
adapter must document its inputs, permissions, data retention, and failure behavior.

