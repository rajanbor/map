# @missing-ai-patterns/cli

The `map` command — MAP, the AI Development Environment Manager. It detects a
project's stack and coding agents, recommends Agent Skills and engineering patterns,
generates agent instruction files from one `.map/` workspace, and installs approved
skills with a lockfile.

Install from the MAP repository:

```bash
git clone https://github.com/rajanbor/map.git
cd map && ./scripts/install.sh
map --help
```

Documentation: [README](https://github.com/rajanbor/map#readme) ·
[getting started](https://github.com/rajanbor/map/blob/main/docs/getting-started.md) ·
[skills](https://github.com/rajanbor/map/blob/main/docs/skills.md) ·
[agents](https://github.com/rajanbor/map/blob/main/docs/agents.md) ·
[architecture](https://github.com/rajanbor/map/blob/main/docs/architecture.md).

## Environment variables

| Variable | Effect |
|---|---|
| `MAP_HOME` | Per-user directory for caches (default `~/.map`). |
| `MAP_OFFLINE=1` | Never contact remote skill sources; use cached revisions only. |
| `MAP_REGISTRY` | Pattern registry file to read (or URL for `map update`). |
| `MAP_REGISTRY_URL` | Default download URL for `map update`. |

## Library use

`import { buildPlan, profileProject, loadCatalog } from "@missing-ai-patterns/cli"`
exposes the same planner, profiler, and skills use cases the commands use.

## License

[MIT](https://github.com/rajanbor/map/blob/main/library/LICENSE).
