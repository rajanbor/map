# Chunking — Python reference

Minimal, dependency-free implementation of the
[Chunking pattern](../../../../patterns/retrieval/chunking/).

## What it shows

- `fixed_size_chunks` — fixed character windows with overlap (simplest baseline).
- `recursive_chunks` — prefer natural boundaries (paragraph → line → word), hard-cut only
  as a last resort (a better default).
- `chunk_with_metadata` — what you'd actually index: chunk text plus source/position.

## Run

```bash
python example.py
```

No dependencies (Python 3.10+). This is a teaching aid, not a production splitter — for
real use, size by tokens and consider structure-aware or semantic strategies (see the
pattern's Production Variants).
