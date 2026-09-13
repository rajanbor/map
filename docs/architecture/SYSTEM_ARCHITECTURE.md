# System architecture

## Boundaries

| Layer | Owns | Must not own |
|---|---|---|
| Domain | Pattern identity, relations, detections, recommendations, verification vocabulary | Filesystem, terminal, HTTP, model SDKs |
| Application | Use cases and ports for discovery, scan, suggest, graph, validate, compile | Framework-specific parsing or presentation |
| Infrastructure | Registry files, filesystem storage, static analyzers, caches | Alternate domain semantics |
| Delivery | CLI, website, coding-agent output, future MCP | Business rules duplicated from core |

The TypeScript packages currently combine some application and infrastructure code;
the dependency direction is nevertheless the constraint for new work. A future
package split is optional and must not delay contract stabilization.

## Source-of-truth model

- `library/patterns/**` and `library/ROADMAP.md` author the public catalog.
- `library/dist/registry.json` is the generated release artifact.
- `tooling/packages/cli/registry-snapshot/registry.json` is the offline distribution
  snapshot and must match the generated artifact at release time.
- `.map/**` is the canonical context for a project.
- root agent files and reports are derived outputs.

## Primary flows

### Knowledge publication

An author changes a pattern and fixtures. CI validates Pattern Schema v1, builds a
registry, checks referential integrity, and makes the same artifact available to the
CLI and website.

### Project analysis

A delivery adapter selects a path. Scanner adapters inspect allowed static inputs and
return normalized detections. The application layer adds result metadata and limits.
The recommendation engine evaluates fixed rules and graph context. It never changes
the target project.

### Project context compilation

The compiler reads `.map` documents, applies target selection and token policies, and
writes projections for supported coding agents. It does not infer new project rules.

## Extension rules

New integrations implement ports, declare capabilities and limitations, and return
core contracts. Core packages do not import an adapter. Extension data uses namespaced
`x-` fields only where a schema permits them. Untrusted executable plugins are outside
the MVP.

## Failure model

- Contract errors are fatal and include a location and expected rule.
- Unsupported input produces an `unknown` result or a no-applicable-analyzer message.
- A broken optional cache falls back to the bundled registry with a warning.
- Network failure cannot disable core offline commands.
- Partial evidence remains visible; it is never upgraded silently to certainty.

