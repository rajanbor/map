# Pattern File Contract

MAP patterns are meant to be consumed by **humans, tools, and AI coding agents**. To make
that possible without rewriting anything, each pattern folder can hold a small, predictable
set of files. This is the contract.

Only `README.md` is required today. The rest form an **optional, extensible AI-ready
layer** — add them as a pattern matures.

## Folder layout

```text
patterns/<category>/<pattern>/
├── README.md        # human-readable documentation (required)
├── pattern.yaml     # machine-readable metadata (tools, CLI, website, agents)
├── prompt.md        # implementation prompt for AI coding agents
├── acceptance.md    # how to verify an implementation
├── diagram.mmd      # architecture diagram (Mermaid source)
├── assets/          # images used by README.md (optional)
└── reference/       # optional runnable reference code
    └── typescript/  #   (or python/, etc.)
```

## The files

| File | Audience | Purpose |
|------|----------|---------|
| `README.md` | Humans | The pattern article, following the [template](../patterns/_template/PATTERN_TEMPLATE.md) and [pattern anatomy](pattern-anatomy.md). **Required.** |
| `pattern.yaml` | Tools, CLI, website, agents | Structured metadata: id, category, [MAP Score](../map-score/SPEC.md), when to use / not, related patterns, references. |
| `prompt.md` | AI coding agents | A copy-pasteable prompt (Claude Code / Cursor / Gemini CLI) to implement the pattern correctly in an existing project. Based on [templates/prompt.md](../templates/prompt.md). |
| `acceptance.md` | Humans & agents | A checklist to verify an implementation. Based on [templates/acceptance.md](../templates/acceptance.md). |
| `diagram.mmd` | Everyone | The architecture diagram as Mermaid source, so tools can render it independently of the README. |
| `reference/` | Humans & agents | Minimal runnable implementations, mirrored under the repo's [reference/](../reference/) too. |

## Principles

- **README.md stays the source of truth for prose.** The other files add machine- and
  agent-readable views; they must not contradict it.
- **Additive and optional.** A pattern with only `README.md` is valid. The AI-ready files
  are layered on as needed.
- **Consistent keys.** `pattern.yaml` uses the same vocabulary as the written sections and
  the [MAP Score](../map-score/) dimensions, so docs, data, and scores stay in sync.
- **MAP augments agents; it doesn't replace them.** These files give an agent better
  architectural context and guardrails — the agent still writes the code.

## `pattern.yaml` shape (informal)

```yaml
id: retrieval/chunking
name: Chunking
category: retrieval
maturity: established
summary: Split documents into retrievable units.
score:            # MAP Score, 1–5 (see map-score/SPEC.md)
  complexity: 2
  latency: 5
  cost: 5
  accuracyImpact: 5
  productionReadiness: 5
when_to_use: [...]
when_not_to_use: [...]
related: [retrieval/reranking, retrieval/parent-child-retrieval]
references:
  - https://arxiv.org/abs/2005.11401
files: [README.md, pattern.yaml, prompt.md, acceptance.md, diagram.mmd]
```

A formal schema will follow once a second pattern adopts the contract. See
[patterns/retrieval/chunking/](../patterns/retrieval/chunking/) for the first complete
example.
