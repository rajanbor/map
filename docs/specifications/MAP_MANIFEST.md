# MAP project manifest

The project manifest is `.map/map.config.json`. It records workspace contract version,
project identity, analysis boundaries, registry source, tool policy, source selection,
and compiler targets. The current manifest version is `3` and MAP spec version is
`0.1`.

```json
{
  "version": 3,
  "specVersion": "0.1",
  "project": {
    "name": "example",
    "createdAt": "2026-09-13T00:00:00.000Z",
    "languages": ["typescript"]
  },
  "analysis": {
    "analyzers": [],
    "include": ["src/**"],
    "exclude": ["**/node_modules/**", "**/dist/**", "**/.map/**"]
  },
  "registry": { "source": "default" },
  "sources": ["**/*.md"],
  "targets": { "agents": { "output": "AGENTS.md" } }
}
```

Paths are relative to the project root and MUST NOT escape it. Empty analyzer lists
mean the safe defaults. Unknown manifest versions fail with a migration message rather
than being guessed. Existing version 3 workspaces remain canonical for the MVP.

