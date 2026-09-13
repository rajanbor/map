# Website Specification

| | |
|---|---|
| **Status** | Draft |
| **Issue** | [#77](https://github.com/rajanbor/map/issues/77) |
| **Owner** | @rajanbor |

## Summary

An **ultra-simple, readable** site for MAP in its own repository
(`apps/website/` in `rajanbor/map`): a hero with the install command, a short "what is
MAP", the pattern catalog rendered from the published registry, a worked example, and
pointers into the docs. Static, no framework, no build complexity — the site is a
projection of `registry.json`, the same artifact every other tool consumes.

## Motivation

MAP currently onboards through a GitHub README — fine for contributors, weak for the
"what is this, how do I try it in 30 seconds" visitor. The old in-repo `website/`
placeholder promised an interactive knowledge site someday; that ambition blocked
shipping anything. A one-page site that states the pitch, shows the GitHub installer,
and lists the catalog is achievable now and improves every
link we share.

## Design

**Repository** — `apps/website/` in `rajanbor/map`, deployed with GitHub Pages from CI.

**Stack** — plain HTML + one CSS file + a small build script (Node, no dependencies —
same discipline as `scripts/build-registry.ts`) that fetches
`https://github.com/rajanbor/map/releases/latest/download/registry.json`
at build time and renders the catalog section. No client-side framework; the page
works with JavaScript disabled.

**Page structure** (single page, in order):

1. **Hero** — one-line pitch, `git clone` plus `./scripts/install.sh` in a copyable
   block, links to GitHub + docs.
2. **What is MAP** — 3 short paragraphs (from the README's "What is MAP?" — the site
   never forks the message, it condenses it).
3. **The catalog** — categories with their published patterns (name, one-line
   summary, MAP Score as compact stars), linking to the pattern on GitHub; a counter
   ("N published / ~75 planned") from registry statuses.
4. **How you use it** — one worked example: `map scan` → `map suggest` →
   `map add security/prompt-injection-defense`, as annotated terminal output.
5. **Docs & community** — links: philosophy, pattern anatomy, contributing, the RFC,
   discussions.

**Refresh** — a scheduled + `workflow_dispatch` Pages build; the map release workflow
can trigger it (`repository_dispatch`) so the site follows releases without manual
steps.

**Non-goals (v1)** — search, decision trees, per-pattern pages, translations,
analytics. The [decision guides spec](decision-guides.md) feeds a later v2.

## Implementation plan

1. Create the repo (README, LICENSE MIT, `site/` with `index.html` + `style.css`,
   `scripts/build.mjs` rendering the catalog into the template).
2. CI: build + deploy to Pages on push, on schedule, and on `repository_dispatch`
   from map releases.
3. Add the site URL to the map README and the org profile.

## Acceptance criteria

- [ ] The site deploys from `apps/website/` in `rajanbor/map` via Pages and renders hero, what-is, catalog (from the latest registry), example, and docs links.
- [ ] A map release updates the catalog section without manual intervention.
- [ ] Lighthouse: no client-side JS required for content; page readable on mobile.

## Compatibility & risks

Consumes the registry per its compatibility rules (ignores unknown fields; pins
nothing). Risk: latest-release fetch fails at build time → the build fails loudly and
Pages keeps serving the previous deploy (never publish an empty catalog). Registry
`schemaVersion` bump requires a site update — acceptable, the site is a first-party
consumer.

## Alternatives considered

- **Docs framework (Docusaurus/Astro/VitePress)** — rejected for v1: hundreds of
  dependencies to render one page; revisit when per-pattern pages and search land.
- **GitHub Pages straight from the map repo** — rejected: the catalog repo stays
  content-only (same reasoning as the CLI split); the site is a consumer.
- **Rendering pattern READMEs on the site now** — deferred: linking to GitHub is
  honest and zero-maintenance; per-pattern pages arrive with v2 search.
