# Implementation Prompt — Chunking

> Paste this into your AI coding agent (Claude Code / Cursor / Gemini CLI) to implement
> document **Chunking** correctly in an existing project. Read
> [`README.md`](README.md) first; verify against [`acceptance.md`](acceptance.md).

## Goal

Implement a chunking step that splits documents into retrievable units for a RAG pipeline,
so retrieval returns precise, citable passages — not whole documents and not broken
fragments.

## Context

- **Project:** <describe: language, existing ingestion/embedding pipeline, vector store>.
- **Current state:** <e.g. "we embed whole documents" or "we split every 500 characters">.
- **Related MAP pattern:** retrieval/chunking — follow its documented trade-offs.

## Requirements

- Split each document into chunks sized to the embedding model's budget (size by **tokens**,
  not raw characters, when possible).
- Prefer **natural boundaries**: headings/sections → paragraphs → sentences → words. Only
  hard-cut as a last resort.
- Support a small **overlap** between adjacent chunks (configurable; default ~10%).
- Attach **metadata** to every chunk: source id, title, heading path, and position/index.
- Choose the strategy by **document type** (prose vs Markdown/HTML vs code), not one global rule.

## Constraints

- Deterministic and dependency-light; don't pull in a heavy framework just to split text.
- Configurable chunk size, overlap, and strategy — no magic numbers hard-coded in call sites.
- Must handle empty input, very long unbreakable tokens, and documents smaller than one chunk.

## Anti-patterns to avoid (do NOT do these)

- **Naive fixed-character splitting** as the only strategy — it cuts words and facts in half.
- **Breaking semantic boundaries** — don't split mid-sentence or mid-clause when a nearby
  natural boundary exists.
- **Splitting code blocks incorrectly** — keep fenced code blocks and, ideally, whole
  functions/classes together; never cut through a code block by character count.
- **Ignoring document structure** — use Markdown/HTML headings; carry the heading path into
  chunk metadata instead of throwing structure away.
- **One chunking strategy for every document type** — prose, Markdown, and source code need
  different boundaries; make the strategy selectable per input.

## Architecture expectations

- A `Chunker` interface with pluggable strategies (recursive/structure-aware/token-aware),
  selected by document type — so strategies are replaceable and testable in isolation.
- Chunking is a pure transformation (document in, chunks+metadata out); no embedding or I/O
  mixed in.
- Output a typed `Chunk { text, index, source, metadata }`, ready for embedding.

## Security considerations

- Treat document content as **untrusted**: chunk text may later reach a model, so this step
  must not execute or interpret content, only segment it.
- Preserve any access-control metadata (tenant/document ACLs) onto each chunk so downstream
  retrieval can filter on it.

## Acceptance criteria

Satisfy [`acceptance.md`](acceptance.md). In short: correct boundaries, configurable
size/overlap/strategy, metadata attached, structure and code respected, edge cases handled,
and tests covering all of it.

## Test expectations

- Unit tests for: recursive boundary selection, overlap, token vs character sizing,
  Markdown heading awareness, code-block integrity, and the edge cases above.
- Deterministic; runs in CI.

---

*MAP gives you the architectural guardrails for chunking; you still implement and verify the
code. Prefer the documented trade-offs (size vs precision, overlap vs cost) over guesswork —
and measure chunk size on your own corpus rather than copying a number.*
