/** Pattern identity types shared with the registry contract. */

// The pattern identifier and category are part of the shared registry contract;
// they are defined once in @missing-ai-patterns/registry and re-exported here so
// the rest of the CLI can keep importing them from the domain layer.
import type { PatternId, PatternCategory } from "@missing-ai-patterns/registry";
export type { PatternId, PatternCategory };
