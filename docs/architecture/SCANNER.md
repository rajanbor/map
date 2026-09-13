# Scanner

The scanner converts static project evidence into a versioned description of detected
AI architecture concepts. It is an observation mechanism, not an implementation
verifier.

## MVP adapter

The dependency-manifest adapter reads `package.json`, `requirements.txt`,
`pyproject.toml`, `go.mod`, and `Cargo.toml` at the selected root. It parses them as
data and matches declared dependency names against a reviewed signal table.

It does not execute package scripts, resolve dependency trees, read environment values,
inspect source code, or contact registries. Monorepo traversal is deferred until path,
ignore, and duplicate-evidence behavior are specified.

## Result semantics

Each detection contains a MAP concept, numeric confidence, derived certainty, and
file-level evidence. Certainty maps as follows:

| Confidence | Certainty | Interpretation |
|---|---|---|
| `>= 0.85` | `detected` | Direct, strong static signal |
| `>= 0.60` | `likely` | Useful but not conclusive signal |
| lower or unavailable | `unknown` | Insufficient support; never equivalent to absent |

The result also names analyzers, inspected inputs, and limitations. Consumers may use
raw confidence for ordering but must show certainty and evidence when making claims.

The wire contract is [`SCAN_RESULT.md`](../specifications/SCAN_RESULT.md).

