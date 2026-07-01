<p align="center">
  <img src="assets/map-logo.png" alt="MAP logo" width="160" />
</p>

# MAP — Missing AI Patterns

An open, framework-agnostic knowledge base of AI Engineering patterns.

> AI engineering is evolving faster than its language. MAP exists to organize, name, and standardize the architectural patterns that power intelligent systems.

[Philosophy](docs/philosophy.md) ·
[Patterns](patterns/) ·
[Roadmap](ROADMAP.md) ·
[Contributing](CONTRIBUTING.md) ·
[Pattern Template](patterns/_template/PATTERN_TEMPLATE.md)

## What is MAP?

MAP is not another AI framework. It is a knowledge base that documents the
architectural patterns people use to build AI systems: retrieval, memory, agents,
security, evaluation, routing, and more.

Each pattern is written the same way. It states the problem, says when to use the
pattern and when not to, lays out the trade-offs, and shows a small implementation.
The goal is to help you make a decision, not to sell you a library.

MAP is meant to be the place you check when you are asking questions like:

- Should I use RAG or fine-tuning?
- When does semantic caching actually pay off?
- How should agent memory work?
- How do I defend against prompt injection?
- What are the trade-offs between retrieval strategies?
- When should an agent call a tool, and when should it stop?

The focus is on architecture and trade-offs, not on any specific library. Libraries
come and go. The patterns underneath them last longer.

## The three layers of MAP

MAP is organized in three layers that take you from understanding, to deciding, to
building.

| Layer | Question it answers | Where it lives |
|-------|---------------------|----------------|
| 1. Knowledge | What concepts and vocabulary do I need? | [`docs/`](docs/) |
| 2. Patterns | Which architecture should I choose, and why? | [`patterns/`](patterns/) |
| 3. Reference | How do I actually build it? | [`reference/`](reference/), [`examples/`](examples/) |

Every pattern connects the layers. It explains the concept, helps you decide, and
points to a small reference implementation.

## Why MAP exists

AI engineering keeps repeating the same architectural mistakes because the field has
no shared vocabulary. The knowledge that exists is spread across vendor blogs,
framework docs that go stale in months, conference talks, and social threads. There is
no single, comparable, decision-first reference.

MAP treats AI architecture the way software engineering treats design patterns. Name
it, document it, compare it, and show it working. That way teams can reason about
trade-offs instead of rediscovering them in production.

## Who it's for

- AI engineers building production systems who need to choose between approaches.
- Software architects moving into AI who want durable mental models.
- Tech leads making build-vs-buy and architecture decisions.
- People learning AI engineering who want to understand why, not just how.
- Writers and educators who need a neutral, citable reference.

## Project philosophy

MAP follows seven principles. Every contribution is measured against them.

| # | Principle | What it means in practice |
|---|-----------|---------------------------|
| 1 | Framework agnostic | Patterns describe architecture, not APIs. Examples may use libraries, but the pattern stands without them. |
| 2 | Production-oriented | Every pattern documents real trade-offs and failure modes, not toy demos. |
| 3 | Decision-driven | We focus on when to use a pattern and when not to. Guidance beats description. |
| 4 | Simple reference implementations | Code is small and readable. It teaches the idea; it is not a product. |
| 5 | Clear documentation | Consistent structure, plain prose, real diagrams. |
| 6 | Community contributions | The catalog grows through a clear, welcoming process. |
| 7 | Long-term maintainability | Conventions are designed to scale to hundreds of patterns. |

Read the full [Philosophy](docs/philosophy.md).

## How MAP is organized

```
map/
  docs/          Layer 1, Knowledge: philosophy, glossary, style guide, pattern anatomy
  patterns/      Layer 2, Patterns: one folder per category, one folder per pattern
    _template/     The pattern template contributors copy
    retrieval/
    memory/
    agents/
    security/
    context/
    evaluation/
    performance/
    routing/
    tool-calling/
    observability/
  reference/     Layer 3, Reference: small implementations (python, typescript)
  examples/      Layer 3: end-to-end examples that combine several patterns
  future/        Design notes for where MAP is heading (see the CLI vision)
  website/       Documentation site (future)
  .github/       Contributor experience: templates, labels, discussions, CI
```

### Pattern categories

| Category | Focus | Directory |
|----------|-------|-----------|
| Retrieval | Getting the right context into the model | [`patterns/retrieval`](patterns/retrieval/) |
| Memory | Keeping and recalling state across turns and sessions | [`patterns/memory`](patterns/memory/) |
| Agents | Planning, acting, reflecting, coordinating | [`patterns/agents`](patterns/agents/) |
| Security | Defending against injection, leakage, and abuse | [`patterns/security`](patterns/security/) |
| Context Management | Budgeting and shaping the context window | [`patterns/context`](patterns/context/) |
| Evaluation | Measuring quality, regressions, and hallucination | [`patterns/evaluation`](patterns/evaluation/) |
| Performance | Latency, throughput, and cost | [`patterns/performance`](patterns/performance/) |
| Routing | Sending each request to the right model or path | [`patterns/routing`](patterns/routing/) |
| Tool Calling | Letting models act through tools safely | [`patterns/tool-calling`](patterns/tool-calling/) |
| Observability | Tracing, logging, cost, and feedback | [`patterns/observability`](patterns/observability/) |

The catalog is empty at launch. See the [Roadmap](ROADMAP.md) for the patterns planned,
and [CONTRIBUTING.md](CONTRIBUTING.md) to claim one.

## Anatomy of a pattern

Every pattern uses one template so readers always know where to look. The sections are:

`Title`, `Problem`, `Motivation`, `When to use`, `When NOT to use`,
`Architecture Diagram`, `Flow`, `Trade-offs`, `Advantages`, `Disadvantages`,
`Reference Implementation`, `Production Variants`, `Benchmarks (optional)`,
`Related Patterns`, `References`.

See the [template](patterns/_template/PATTERN_TEMPLATE.md) and the
[Pattern Anatomy guide](docs/pattern-anatomy.md).

## Using MAP with AI coding agents

MAP is written for humans and for AI coding agents (Claude Code, Cursor, Gemini CLI). A
pattern can be consumed in several ways — see the [pattern file contract](docs/pattern-contract.md):

- Read **`README.md`** to understand the pattern and its trade-offs.
- Use **`pattern.yaml`** for structured metadata (score, when to use, related patterns).
- Copy **`prompt.md`** into your coding agent to implement the pattern in your project.
- Use **`acceptance.md`** as the implementation checklist.

For example, [`patterns/retrieval/chunking/prompt.md`](patterns/retrieval/chunking/prompt.md)
can be pasted into Claude Code to implement chunking correctly, and
[`acceptance.md`](patterns/retrieval/chunking/acceptance.md) verifies the result.

MAP does not replace your coding agent — it gives the agent better **architectural context**
and guardrails, so its decisions are consistent and reviewable. See the
[Claude Code example](examples/claude-code/).

Future [MAP CLI](cli/) commands may surface this directly (not yet implemented):

```bash
map explain retrieval.chunking     # what the pattern is and when to use it
map prompt retrieval.chunking      # print the implementation prompt for an agent
map apply retrieval.chunking       # scaffold the pattern into the current project
```

## Contributing

Contributions are welcome: new patterns, improvements, diagrams, benchmarks,
translations, and reference implementations.

MAP uses a fixed workflow so the catalog stays coherent as it grows:

1. Every change starts as an issue.
2. Create a typed branch off `dev`: `feature/`, `fix/`, `pattern/`, `docs/`.
3. Write commits that reference the issue.
4. Open a pull request into `dev`. Never open one directly into `main`.

Release happens by merging `dev` into `main`. Nothing goes into `main` except through
that release merge. Details are in [CONTRIBUTING.md](CONTRIBUTING.md), and please read
the [Code of Conduct](CODE_OF_CONDUCT.md).

### Branch model

```
main   o-------------------o-----------------o   releases only (merged from dev)
        \                 /                 /
dev      o--o--o--o--o--o-o--o--o--o--o--o-o     integration
             \      /            \      /
feature/...   o----o    fix/...   o----o         your work
```

- `main` is the stable, released catalog. It only changes through a release merge from `dev`.
- `dev` is the integration branch. All contributions land here first.
- Direct pushes and merges to `main` are not allowed.

## Roadmap

The near-term goal is to publish the most useful patterns in each category and settle
the reference-implementation conventions. See [ROADMAP.md](ROADMAP.md) for the full
backlog and phases.

## Where MAP is heading

Documentation is the first form of MAP, not the last. The longer-term plan, sketched in
[`future/cli.md`](future/cli.md), is to grow MAP into an architecture layer for AI
engineering, backed by a structured knowledge graph of patterns rather than Markdown
alone.

That knowledge base could then power several tools that share one source of truth:

- A `map` CLI that analyzes a codebase and reports its AI architecture.
- Detection of patterns such as embeddings, vector search, RAG, tool calling, memory,
  and model routing.
- Recommendations for patterns you are missing (for example, suggesting a prompt
  injection guard and a semantic cache once RAG is detected).
- Generated architecture diagrams and explanations of the decisions behind them.
- A pattern graph with relationships like depends_on, works_with, alternative_to, and
  conflicts_with.

Think of the direction as ESLint for AI architecture, or a plan step for AI systems.
The documentation and the future tooling stay in sync because both read from the same
pattern data.

Nearer-term product goals:

- A searchable website that lets you navigate by the question you are asking.
- Decision guides such as "RAG vs fine-tuning" that link to the relevant patterns.
- Runnable reference implementations in more than one language.
- Benchmarks where trade-offs can be measured.
- Community translations.

## License

MAP uses two licenses so it's easy to build on while authorship stays credited:

- **Code** (`cli/`, `reference/`, `examples/`) — [MIT](LICENSE). Use, copy, modify, fork,
  ship commercially; just keep the copyright notice.
- **Content** (`patterns/`, `docs/`, prose, diagrams) — [CC BY 4.0](LICENSE-CONTENT).
  Use, share, and adapt freely, including commercially, **with attribution** to MAP.
- **Name & brand** — "MAP" / "Missing AI Patterns" are reserved; forks should use a
  different name.

Take the ideas and code and run with them; just credit MAP for the writing and don't
ship your fork under the MAP name. Full details in [LICENSING.md](LICENSING.md).
