# Acceptance Criteria — Chunking

How to verify a Chunking implementation is correct and production-safe. Use as a review
checklist (humans and AI agents). Pairs with [`prompt.md`](prompt.md) and
[`README.md`](README.md).

## Functional requirements

- [ ] Splits a document into chunks sized to a configurable target (by tokens when possible).
- [ ] Prefers natural boundaries (heading → paragraph → sentence → word); hard-cut is a last resort.
- [ ] Supports configurable **overlap** between adjacent chunks.
- [ ] Attaches metadata to every chunk: `source`, `index/position`, and `heading path` where available.
- [ ] Strategy is selectable per **document type** (prose / Markdown-HTML / code).

## Non-functional requirements

- [ ] **Latency:** chunking a typical document is fast (milliseconds, not seconds).
- [ ] **Cost:** no unnecessary model calls; splitting itself is local/cheap.
- [ ] **Maintainability:** a `Chunker` interface with pluggable strategies; no hard-coded magic numbers in call sites.
- [ ] **Determinism:** same input + config → same chunks.

## Security checks

- [ ] Chunk text is only segmented, never executed or interpreted.
- [ ] Access-control metadata (tenant/document ACLs) is preserved onto each chunk for downstream filtering.
- [ ] No secrets/PII added to logs during chunking.

## Failure modes

- [ ] **Empty/whitespace input** → returns no chunks (no crash).
- [ ] **Document smaller than one chunk** → returns a single chunk.
- [ ] **Unbreakable token longer than the size** → degrades to a hard cut rather than looping/erroring.
- [ ] **Code blocks** → not split by character count mid-block.
- [ ] **Missing headings/structure** → still produces valid chunks (falls back gracefully).

## Tests

- [ ] Unit tests for boundary selection, overlap, token vs character sizing, Markdown heading awareness, and code-block integrity.
- [ ] All failure modes above are tested.
- [ ] Deterministic; runs in CI.

## Review checklist

- [ ] Doesn't silently reduce to naive fixed-character splitting.
- [ ] Anti-patterns in `prompt.md` are avoided (semantic boundaries, code blocks, structure, per-type strategy).
- [ ] Chunk size / overlap / strategy are configurable.
- [ ] Chunk size was (or can be) tuned against the actual corpus, not copied from a blog.
