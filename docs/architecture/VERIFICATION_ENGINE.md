# Verification engine

Verification compares a declared MAP contract with observable evidence. It is distinct
from scanning: scanning discovers possible concepts, while verification evaluates a
specific claim or acceptance criterion.

## MVP boundary

The MVP validates structure and references:

- pattern metadata conforms to Pattern Schema v1;
- IDs, categories, files, and graph targets are coherent;
- `.map/map.config.json` conforms to the project contract;
- adopted pattern metadata names a catalog entry and required files are present.

This is contract verification, not proof that an application implements a pattern.

## Future checks

Later adapters may provide static source assertions, configuration assertions, test
execution, runtime evidence, and human attestations. Each check reports `pass`, `fail`,
`unknown`, or `not-applicable`, its method, evidence, limitations, and timestamp.
Failure to inspect is never converted into a pass.

The planned wire contract is
[`VERIFICATION_RESULT.md`](../specifications/VERIFICATION_RESULT.md).

