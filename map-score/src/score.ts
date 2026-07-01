/**
 * MAP Score — a compact 1–5 rating for a pattern across five dimensions.
 *
 * The score is deliberately small so it can sit at the top of a pattern page and be
 * scanned in seconds. Each dimension is an integer 1..5. Rendering (stars, tables) lives
 * in `render.ts`; this file is the schema, validation, and dimension metadata.
 */

export type Rating = 1 | 2 | 3 | 4 | 5;

export const MIN_RATING = 1;
export const MAX_RATING = 5;

export type ScoreDimensionId =
  | "complexity"
  | "latency"
  | "cost"
  | "accuracyImpact"
  | "productionReadiness";

export interface DimensionMeta {
  readonly id: ScoreDimensionId;
  readonly label: string;
  readonly description: string;
  /** What a higher star count means, so readers can interpret the scale. */
  readonly higherMeans: string;
}

/** The five MAP Score dimensions, in display order. */
export const DIMENSIONS: readonly DimensionMeta[] = [
  {
    id: "complexity",
    label: "Complexity",
    description: "How hard the pattern is to implement and operate.",
    higherMeans: "more complex (lower is simpler)",
  },
  {
    id: "latency",
    label: "Latency",
    description: "Latency the pattern adds to a request.",
    higherMeans: "less added latency (higher is better)",
  },
  {
    id: "cost",
    label: "Cost",
    description: "Compute, token, and infrastructure cost.",
    higherMeans: "cheaper (higher is better)",
  },
  {
    id: "accuracyImpact",
    label: "Accuracy Impact",
    description: "Effect on answer quality when applied well.",
    higherMeans: "bigger positive impact (higher is better)",
  },
  {
    id: "productionReadiness",
    label: "Production Readiness",
    description: "How battle-tested and safe-to-ship the pattern is.",
    higherMeans: "more production-ready (higher is better)",
  },
];

export interface MapScore {
  /** Optional pattern id this score belongs to, e.g. "retrieval/chunking". */
  readonly pattern?: string;
  readonly complexity: Rating;
  readonly latency: Rating;
  readonly cost: Rating;
  readonly accuracyImpact: Rating;
  readonly productionReadiness: Rating;
}

export function isRating(value: unknown): value is Rating {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= MIN_RATING &&
    value <= MAX_RATING
  );
}

/** Returns a list of human-readable problems; empty means the value is a valid score. */
export function scoreErrors(value: unknown): string[] {
  if (typeof value !== "object" || value === null) {
    return ["score must be an object"];
  }
  const obj = value as Record<string, unknown>;
  const errors: string[] = [];
  for (const dim of DIMENSIONS) {
    if (!isRating(obj[dim.id])) {
      errors.push(`${dim.id} must be an integer ${MIN_RATING}..${MAX_RATING}`);
    }
  }
  if ("pattern" in obj && typeof obj["pattern"] !== "string") {
    errors.push("pattern must be a string when present");
  }
  return errors;
}

/** Parse and validate an unknown value into a MapScore, throwing on any problem. */
export function parseScore(value: unknown): MapScore {
  const errors = scoreErrors(value);
  if (errors.length > 0) {
    throw new Error(`Invalid MAP Score: ${errors.join("; ")}`);
  }
  const v = value as {
    complexity: Rating;
    latency: Rating;
    cost: Rating;
    accuracyImpact: Rating;
    productionReadiness: Rating;
    pattern?: unknown;
  };
  const base: MapScore = {
    complexity: v.complexity,
    latency: v.latency,
    cost: v.cost,
    accuracyImpact: v.accuracyImpact,
    productionReadiness: v.productionReadiness,
  };
  return typeof v.pattern === "string" ? { ...base, pattern: v.pattern } : base;
}
