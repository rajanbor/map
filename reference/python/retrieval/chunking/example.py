"""Minimal, dependency-free chunking reference for the MAP Chunking pattern.

Two strategies:
  - fixed_size_chunks: fixed character windows with overlap (simplest baseline).
  - recursive_chunks:  prefer natural boundaries (paragraphs, lines, words) and only
                       hard-cut when a piece is still too big (a better default).

Plus chunk_with_metadata, which is what you'd actually index: text + position/source.

Run:  python example.py
"""

from __future__ import annotations

from dataclasses import dataclass, field


def fixed_size_chunks(text: str, size: int = 800, overlap: int = 100) -> list[str]:
    """Split text into fixed-size character windows with overlap."""
    if size <= 0 or overlap < 0 or overlap >= size:
        raise ValueError("require size > 0 and 0 <= overlap < size")
    step = size - overlap
    chunks = []
    for i in range(0, len(text), step):
        window = text[i : i + size]
        if window.strip():
            chunks.append(window)
    return chunks


def recursive_chunks(
    text: str, size: int = 800, separators: tuple[str, ...] = ("\n\n", "\n", " ")
) -> list[str]:
    """Split on the coarsest separator that yields pieces <= size; hard-cut as last resort."""
    if len(text) <= size:
        return [text] if text.strip() else []

    for index, sep in enumerate(separators):
        if sep in text:
            parts: list[str] = []
            buf = ""
            for piece in text.split(sep):
                candidate = piece if not buf else buf + sep + piece
                if len(candidate) <= size:
                    buf = candidate
                    continue
                if buf.strip():
                    parts.append(buf)
                if len(piece) <= size:
                    buf = piece
                else:
                    buf = ""
                    parts.extend(recursive_chunks(piece, size, separators[index + 1 :]))
            if buf.strip():
                parts.append(buf)
            return parts

    # No separators left: fall back to hard windows.
    return fixed_size_chunks(text, size, overlap=0)


@dataclass
class Chunk:
    """What you'd actually store: chunk text plus retrieval metadata."""

    text: str
    index: int
    source: str
    metadata: dict[str, str] = field(default_factory=dict)


def chunk_with_metadata(
    text: str, source: str, size: int = 800, **meta: str
) -> list[Chunk]:
    """Chunk a document and attach source + position metadata to each piece."""
    return [
        Chunk(text=piece, index=i, source=source, metadata=dict(meta))
        for i, piece in enumerate(recursive_chunks(text, size))
    ]


def _demo() -> None:
    document = (
        "MAP documents architectural patterns for AI systems.\n\n"
        "Chunking splits documents into retrievable units. Too large and the "
        "embedding is diluted; too small and a chunk loses meaning.\n\n"
        "Overlap keeps facts that straddle a boundary intact, at the cost of a "
        "larger index."
    )

    print("== recursive_chunks (size=90) ==")
    for i, c in enumerate(recursive_chunks(document, size=90)):
        print(f"[{i}] ({len(c)} chars) {c!r}")

    print("\n== chunk_with_metadata ==")
    for c in chunk_with_metadata(document, source="intro.md", size=90, section="overview"):
        print(f"[{c.index}] source={c.source} meta={c.metadata} :: {c.text[:40]!r}...")


if __name__ == "__main__":
    _demo()
