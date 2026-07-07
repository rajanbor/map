/**
 * Minimal reader for the header fields of `patterns/<cat>/<slug>/pattern.yaml`.
 *
 * The CLI is dependency-free, so this is not a YAML parser. It reads exactly what
 * the catalog needs from the pattern contract — flat `key: value` scalars, folded
 * (`key: >`) blocks, the `score:` map of five integer dimensions, and the
 * `related:` id list — and ignores everything else. If pattern.yaml ever grows
 * beyond that shape for these fields, replace this with a real parser.
 */

import type { MapScore } from "../domain/index.ts";

export interface PatternYamlHeader {
  readonly id?: string;
  readonly name?: string;
  readonly category?: string;
  readonly maturity?: string;
  readonly summary?: string;
  /** MAP Score dimensions (1..5 each, see map-score/SPEC.md); absent if incomplete. */
  readonly score?: MapScore;
  /** Related pattern ids from the `related:` list. */
  readonly related?: readonly string[];
}

const SCALAR_KEYS = ["id", "name", "category", "maturity", "summary"] as const;

const SCORE_DIMENSIONS = [
  "complexity",
  "latency",
  "cost",
  "accuracyImpact",
  "productionReadiness",
] as const;

export function parsePatternYamlHeader(text: string): PatternYamlHeader {
  const result: Record<string, unknown> = {};
  const lines = text.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const match = lines[i]!.match(/^([a-zA-Z_]+):\s*(.*?)\s*$/);
    if (!match) continue;
    const [, key, rawValue] = match;

    if (key === "score") {
      const [score, end] = readScoreBlock(lines, i + 1);
      if (score !== undefined) result["score"] = score;
      i = end - 1;
      continue;
    }
    if (key === "related") {
      const [related, end] = readListBlock(lines, i + 1);
      if (related.length > 0) result["related"] = related;
      i = end - 1;
      continue;
    }
    if (!(SCALAR_KEYS as readonly string[]).includes(key!)) continue;

    if (rawValue === ">" || rawValue === ">-" || rawValue === "") {
      // Folded block: join the following more-indented lines with spaces.
      const block: string[] = [];
      while (i + 1 < lines.length && /^\s+\S/.test(lines[i + 1]!)) {
        block.push(lines[i + 1]!.trim());
        i++;
      }
      if (block.length > 0) result[key!] = block.join(" ");
    } else {
      result[key!] = unquote(rawValue!);
    }
  }
  return result as PatternYamlHeader;
}

/** Reads the indented `dimension: n` lines under `score:`; undefined if incomplete. */
function readScoreBlock(
  lines: readonly string[],
  start: number,
): [MapScore | undefined, number] {
  const values: Record<string, number> = {};
  let i = start;
  for (; i < lines.length; i++) {
    const match = lines[i]!.match(/^\s+([a-zA-Z]+):\s*([1-5])\s*(#.*)?$/);
    if (!match) break;
    values[match[1]!] = Number(match[2]);
  }
  const complete = SCORE_DIMENSIONS.every((dim) => dim in values);
  return [complete ? (values as unknown as MapScore) : undefined, i];
}

/** Reads the indented `- item` lines under a list key. */
function readListBlock(
  lines: readonly string[],
  start: number,
): [readonly string[], number] {
  const items: string[] = [];
  let i = start;
  for (; i < lines.length; i++) {
    const match = lines[i]!.match(/^\s+-\s+(\S.*?)\s*$/);
    if (!match) break;
    items.push(unquote(match[1]!));
  }
  return [items, i];
}

function unquote(value: string): string {
  const quoted = value.match(/^"(.*)"$|^'(.*)'$/);
  return quoted ? (quoted[1] ?? quoted[2] ?? "") : value;
}
