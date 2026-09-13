<p align="center">
  <strong>MAP CLI</strong> — the command line for <a href="https://github.com/rajanbor/map">Missing AI Patterns</a>
</p>

# missing-ai-patterns/cli

The `map` command and its shared libraries inside the consolidated MAP monorepo.
The pattern catalog under [`../library`](../library/) compiles into the registry this
workspace consumes.

```bash
git clone https://github.com/rajanbor/map.git
cd map
./scripts/install.sh

map init        # create the .map/ workspace in your project
map scan        # detect evidence-backed architecture signals
map suggest     # find patterns worth reviewing
map show retrieval/chunking
map add retrieval/chunking
```

## Packages

| Package | Path | Purpose |
|---------|------|---------|
| [`@missing-ai-patterns/cli`](packages/cli/) | `packages/cli` | The `map` command. |
| [`@missing-ai-patterns/score`](packages/score/) | `packages/score` | MAP Score schema, validation, and rendering (shared by the CLI, the registry builder, and the future website). |

## How data flows

```
library/ (patterns, ROADMAP)
   └── scripts/build-registry.ts → registry.json
         └── tooling: bundled snapshot + `map update` cache
```

The CLI never parses the map repository's Markdown — it reads `registry.json`
(see the [registry spec](https://github.com/rajanbor/map/blob/main/library/docs/specs/registry.md)).
Everything except `map update` works offline.

## Develop

Node >= 22 (dev runs TypeScript directly; the published packages target Node >= 20)
and pnpm.

```bash
pnpm install
pnpm build            # builds score, then cli (topological)
pnpm typecheck
pnpm test
pnpm lint
pnpm map -- --help    # run the CLI from source
```

Developing against a local map checkout:

```bash
MAP_REGISTRY=path/to/map/library/dist/registry.json pnpm map -- list
MAP_REPO=path/to/map pnpm --filter @missing-ai-patterns/cli sync-snapshot
```

## Releasing

1. Bump versions in `packages/*/package.json`.
2. Refresh the bundled registry with `MAP_REPO=.. pnpm --filter @missing-ai-patterns/cli sync-snapshot`.
3. Tag `sdk/v<version>` only when the npm publication workflow and credentials are ready.

The public npm package is not currently published; the supported user installation is
the repository-level GitHub installer.

## Contributing

Issues and PRs for tooling, patterns, and documentation all belong in
[rajanbor/map](https://github.com/rajanbor/map). The
[vision document](docs/vision.md) describes where the CLI is heading.

## License

[MIT](LICENSE).
