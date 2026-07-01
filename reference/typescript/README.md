# TypeScript Reference Implementations

Minimal, framework-agnostic TypeScript examples of MAP patterns.

## Conventions

- Target a recent Node LTS and modern TypeScript.
- Prefer built-ins and a minimal toolchain. If a dependency is essential, add it to a
  local `package.json` inside the pattern folder and explain why in its README.
- Each example is self-contained: `reference/typescript/<category>/<pattern-slug>/`.
- Include a short `README.md` with how to run it and what it demonstrates.
- Favor clarity over abstraction.

## Layout

```
reference/typescript/
  <category>/
    <pattern-slug>/
      README.md
      example.ts
      package.json      # only if a dependency is truly needed
```

Link back to the pattern article from the example's README, and from the pattern's
**Reference Implementation** section to here.
