# MAP tooling

The pnpm workspace for the `map` CLI and two small published contract packages.
User documentation lives in the [root README](../README.md) and [`docs/`](../docs/).

| Package | Purpose |
|---|---|
| [`packages/cli`](packages/cli/) | The `map` command: detection, planning, skills, context compiler, pattern catalog. |
| [`packages/registry`](packages/registry/) | `@missing-ai-patterns/registry` — registry document types and the validating parser. |
| [`packages/score`](packages/score/) | `@missing-ai-patterns/score` — MAP Score schema, validation, and rendering. |

## Develop

Node 22+ for development (the CLI runs TypeScript directly; builds target Node 20+).

```bash
corepack pnpm install --frozen-lockfile
corepack pnpm build
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm test                       # offline; uses local Git fixtures
node packages/cli/bin/map.ts --help      # run the CLI from source
```

Tests set `MAP_OFFLINE=1` and a temporary `MAP_HOME`, so they never touch the network
or your `~/.map` cache.

The pattern registry is built from [`../library`](../library/) and bundled as
`packages/cli/registry-snapshot/registry.json`. Refresh it after pattern changes:

```bash
MAP_REPO=.. corepack pnpm --filter @missing-ai-patterns/cli sync-snapshot
```

## Releasing

1. Bump versions in `packages/*/package.json` and update [CHANGELOG.md](../CHANGELOG.md).
2. Refresh the registry snapshot (above).
3. Tag `sdk/v<version>`; the release workflow publishes to npm.

## License

[MIT](../library/LICENSE).
