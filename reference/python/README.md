# Python Reference Implementations

Minimal, framework-agnostic Python examples of MAP patterns.

## Conventions

- Target a recent, supported Python (3.10+).
- Prefer the standard library. If a dependency is essential, pin it in a local
  `requirements.txt` inside the pattern folder and explain why in its README.
- Each example is self-contained: `reference/python/<category>/<pattern-slug>/`.
- Include a short `README.md` with how to run it and what it demonstrates.
- Keep it readable over clever. Comments explain the *why*.

## Layout

```
reference/python/
  <category>/
    <pattern-slug>/
      README.md
      example.py
      requirements.txt   # only if a dependency is truly needed
```

Link back to the pattern article from the example's README, and from the pattern's
**Reference Implementation** section to here.
