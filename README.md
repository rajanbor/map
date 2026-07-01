<div align="center">

# MAP — Missing AI Patterns

**An open, framework-agnostic knowledge base of AI Engineering patterns.**

*Frameworks change. Patterns remain.*

[Philosophy](docs/philosophy.md) ·
[Patterns](patterns/) ·
[Roadmap](ROADMAP.md) ·
[Contributing](CONTRIBUTING.md) ·
[Pattern Template](patterns/_template/PATTERN_TEMPLATE.md)

</div>

---

> **AI engineering is evolving faster than its language. MAP exists to organize, name, and standardize the architectural patterns that power intelligent systems.**

## What is MAP?

**MAP (Missing AI Patterns)** is **not another AI framework.**

It is an open knowledge base that documents, explains, compares, and demonstrates
the proven **architectural patterns** used to build real AI systems — retrieval,
memory, agents, security, evaluation, routing, and more.

Think of it as the missing manual for AI Engineering — a blend of:

- **Refactoring Guru** — clear, visual, example-driven pattern write-ups
- **The System Design Primer** — decision-oriented, production-minded
- **Martin Fowler's pattern catalogs** — durable vocabulary for architecture
- **Tiny reference implementations** — small, readable, framework-agnostic code
- **An interactive AI architecture guide** — navigate by the question you're asking

MAP is the place developers go when they ask questions like:

- Should I use **RAG** or **fine-tuning**?
- When does **semantic caching** actually pay off?
- How should agent **memory** be implemented?
- How do I defend against **prompt injection**?
- What are the trade-offs between **retrieval strategies**?
- When should an agent **call a tool** — and when should it stop?

The emphasis is on **architectural decisions and their trade-offs**, not on any
particular library. Libraries come and go; the underlying patterns endure.

## The three layers of MAP

MAP is structured as three layers that take you from *understanding* to *deciding* to *building*:

| Layer | Question it answers | Where it lives |
|-------|---------------------|----------------|
| **1. Knowledge** | *What concepts and vocabulary do I need?* | [`docs/`](docs/) — philosophy, glossary, mental models |
| **2. Patterns** | *Which architecture should I choose, and why?* | [`patterns/`](patterns/) — the decision-driven catalog |
| **3. Reference** | *How do I actually build it?* | [`reference/`](reference/) & [`examples/`](examples/) — tiny implementations |

Every pattern connects the layers: it teaches the concept, drives the decision, and
points to a minimal reference implementation.

## Why MAP exists

AI Engineering is repeating the same architectural mistakes because the field has
no shared, vendor-neutral vocabulary. The knowledge that exists is scattered across
vendor blogs, framework docs that expire in months, conference talks, and social
threads. There is no canonical, comparable, decision-first reference.

MAP fixes that by treating AI architecture the way software engineering treats
design patterns: **named, documented, compared, and demonstrated** — so teams can
reason about trade-offs instead of rediscovering them in production.

## Who it's for

- **AI engineers** designing production systems who need to choose between approaches.
- **Software architects** onboarding to AI who want durable mental models.
- **Tech leads** making build-vs-buy and architecture decisions.
- **Learners** who want to understand *why*, not just *how*, AI systems are built.
- **Educators & writers** who need a citable, framework-neutral reference.

## Project philosophy

MAP is built on seven principles. They are non-negotiable and every contribution is
measured against them.

| # | Principle | What it means in practice |
|---|-----------|---------------------------|
| 1 | **Framework agnostic** | Patterns describe architecture, not APIs. Examples may use libraries, but the pattern must stand without them. |
| 2 | **Production-oriented** | Every pattern documents real trade-offs, failure modes, and production variants — not toy demos. |
| 3 | **Decision-driven** | We optimize for "when should I use this / when should I *not*." Guidance beats description. |
| 4 | **Simple reference implementations** | Code is small, readable, and illustrative — a teaching aid, not a product. |
| 5 | **Beautiful documentation** | Clear prose, consistent structure, diagrams. Docs are the product. |
| 6 | **Community contributions** | The catalog grows through a welcoming, well-defined contribution process. |
| 7 | **Long-term maintainability** | Structure and conventions are designed to scale to hundreds of patterns. |

Read the full [Philosophy](docs/philosophy.md).

## How MAP is organized

```
map/
├── docs/          Layer 1 — Knowledge: philosophy, glossary, style guide, pattern anatomy
├── patterns/      Layer 2 — Patterns: one folder per category, one folder per pattern
│   ├── _template/   The canonical pattern template contributors copy
│   ├── retrieval/
│   ├── memory/
│   ├── agents/
│   ├── security/
│   ├── context/
│   ├── evaluation/
│   ├── performance/
│   ├── routing/
│   ├── tool-calling/
│   └── observability/
├── reference/     Layer 3 — Reference: tiny, framework-agnostic implementations (python, typescript)
├── examples/      Layer 3 — End-to-end examples that compose multiple patterns
├── website/       Documentation site (future)
└── .github/       Contributor experience: templates, labels, discussions, CI
```

### Pattern categories

| Category | Focus | Directory |
|----------|-------|-----------|
| **Retrieval** | Getting the right context into the model | [`patterns/retrieval`](patterns/retrieval/) |
| **Memory** | Persisting and recalling state across turns and sessions | [`patterns/memory`](patterns/memory/) |
| **Agents** | Planning, acting, reflecting, coordinating | [`patterns/agents`](patterns/agents/) |
| **Security** | Defending against injection, leakage, and abuse | [`patterns/security`](patterns/security/) |
| **Context Management** | Budgeting and shaping the context window | [`patterns/context`](patterns/context/) |
| **Evaluation** | Measuring quality, regressions, and hallucination | [`patterns/evaluation`](patterns/evaluation/) |
| **Performance** | Latency, throughput, and cost | [`patterns/performance`](patterns/performance/) |
| **Routing** | Sending each request to the right model or path | [`patterns/routing`](patterns/routing/) |
| **Tool Calling** | Letting models act through tools safely | [`patterns/tool-calling`](patterns/tool-calling/) |
| **Observability** | Tracing, logging, cost, and feedback | [`patterns/observability`](patterns/observability/) |

> The catalog is intentionally empty at launch. See the [Roadmap](ROADMAP.md) for the
> 70+ patterns planned, and [CONTRIBUTING.md](CONTRIBUTING.md) to claim one.

## Anatomy of a pattern

Every pattern follows a single template so readers always know where to look. The
canonical sections are:

`Title` · `Problem` · `Motivation` · `When to use` · `When NOT to use` ·
`Architecture Diagram` · `Flow` · `Trade-offs` · `Advantages` · `Disadvantages` ·
`Reference Implementation` · `Production Variants` · `Benchmarks (optional)` ·
`Related Patterns` · `References`

See [`patterns/_template/PATTERN_TEMPLATE.md`](patterns/_template/PATTERN_TEMPLATE.md)
and the [Pattern Anatomy guide](docs/pattern-anatomy.md).

## Contributing

MAP is community-built and contributions are very welcome — new patterns,
improvements, diagrams, benchmarks, translations, and reference implementations.

We use a **strict, predictable workflow** so the catalog stays coherent as it grows:

> **Issue → Branch → Commits → Pull Request → `dev`**
>
> 1. **Every change starts as an issue.** No orphan PRs.
> 2. **Create a typed branch** off `dev`: `feature/…`, `fix/…`, `pattern/…`, `docs/…`.
> 3. **Write conventional commits** that reference the issue.
> 4. **Open a PR into `dev`** (never directly into `main`).

The full workflow, branch naming, and commit conventions are in
[CONTRIBUTING.md](CONTRIBUTING.md). Please also read our
[Code of Conduct](CODE_OF_CONDUCT.md).

## Roadmap

The near-term goal is to publish the highest-leverage patterns in each category and
establish the reference-implementation conventions. The long-term goal is to become
**the definitive reference for AI Engineering patterns** — where every architectural
decision in an AI system has a corresponding MAP article.

See [ROADMAP.md](ROADMAP.md) for the full pattern backlog and phases.

## Future vision

- A searchable, interactive **website** that lets you navigate by the question you're asking.
- **Decision trees** ("RAG vs fine-tuning?") that link directly to the relevant patterns.
- **Runnable** reference implementations in multiple languages.
- **Benchmarks** that quantify trade-offs where they can be measured.
- Community-maintained **translations**.

## License

MAP is released under the **MIT License** — you are free to use, copy, modify, fork,
redistribute, and build upon this repository, including commercially, with no
restrictions beyond preserving the copyright notice. See [LICENSE](LICENSE).

Documentation and diagrams are contributed under the same permissive terms so the
knowledge stays open forever.

---

<div align="center">

**Frameworks change. Patterns remain.**

Built by the community. Star the repo, open an issue, claim a pattern.

</div>
