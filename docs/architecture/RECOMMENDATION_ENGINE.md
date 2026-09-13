# Recommendation engine

The MVP recommender answers: given observed concepts, which published or planned MAP
patterns deserve review, and why?

Rules are declarative data. A rule lists triggering concepts, concepts whose presence
suppresses it, suggested pattern IDs, priority, and rationale. The engine matches,
deduplicates by pattern, retains the highest priority, unions triggers, and orders by
priority then ID.

## Explanation contract

Every suggestion includes:

- canonical pattern ID and priority;
- human rationale;
- triggering detections;
- supporting evidence references where available;
- limitations inherited from the scan;
- graph context when an explicit relation supports the suggestion.

A suggestion is advisory. It does not assert that the pattern is absent, suitable, or
implemented, and it never changes project files. An empty scan returns no suggestions
rather than generic advice.

Future ranking may use declared project intent, verified adopted patterns, and optional
evaluation-backed assisted adapters. Deterministic rules remain available as the
baseline.

