# Product and engineering principles

1. **Framework neutral.** Core concepts describe architecture. Vendor and framework
   knowledge belongs in replaceable adapters.
2. **Deterministic first.** Registry, validation, scanning, graph queries, and baseline
   recommendations work offline and return repeatable results.
3. **Evidence before claims.** Every detection and recommendation identifies its
   evidence, limits, and reason. Unknown is not treated as absent.
4. **Human and AI readable.** Structured fields carry identity and constraints; prose
   carries context, trade-offs, and examples.
5. **Decisions over recipes.** A useful pattern says when to use it, when not to, and
   what it costs—not only how to implement it.
6. **Stable core, adaptable edges.** Public contracts evolve by version. Adapters may
   move quickly without leaking their dependencies into the domain.
7. **Git-native and reviewable.** `.map/` is source, generated files are projections,
   and meaningful changes are visible in ordinary review.
8. **Safe by default.** Scanners avoid secrets and code execution; recommendations do
   not mutate projects; generated content never silently overwrites user work.
9. **Progressive adoption.** A team can start with one command or one pattern and grow
   into manifests, decisions, verification, and integrations.
10. **Compatibility is a feature.** Existing commands, workspace layouts, and v1
    pattern identifiers remain usable across additive releases.

