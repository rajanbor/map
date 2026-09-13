# CLI architecture

The CLI is a delivery adapter over application services. Commands parse input, invoke
a service, and report a result; they do not embed registry, graph, scan, or
recommendation policy.

## Vocabulary and compatibility

| Preferred workflow | Compatible existing command |
|---|---|
| `map list` | `map patterns` without a query |
| `map search <query>` | `map patterns <query>` |
| `map show <id>` | `map explain <id>` |
| `map scan [path]` | `map analyze [path]` |
| `map suggest [path]` | `map recommend [path]` |

`init`, `add`, `sync`, `watch`, `optimize`, `doctor`, and `update` retain their current
names. `graph` and `validate` are first-class MVP commands. `diff` remains explicitly
planned until its comparison contract exists.

## Output

Human-readable text is the default. Commands supporting `--json` emit one versioned
JSON document and no decorative text on stdout. Errors use nonzero exit status;
warnings and fallback notices use stderr. Stable ordering makes output diffable.

## Exit behavior

- `0`: command completed, including a valid empty result.
- `1`: validation, input, or operational failure.
- Parser-specific usage errors retain the argument parser's nonzero status.

