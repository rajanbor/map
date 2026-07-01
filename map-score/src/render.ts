/**
 * Rendering for MAP Score: stars, a Markdown table, and a vertical block. Pure string
 * functions with no I/O so they're easy to test and reuse (CLI, website, pattern pages).
 */

import { DIMENSIONS, MAX_RATING } from "./score.ts";
import type { MapScore, Rating } from "./score.ts";

const FILLED = "★";
const EMPTY = "☆";

/** Render a rating as filled/empty stars, e.g. renderStars(2) -> "★★☆☆☆". */
export function renderStars(value: Rating, max: number = MAX_RATING): string {
  return FILLED.repeat(value) + EMPTY.repeat(Math.max(0, max - value));
}

/** A compact Markdown table: dimension, stars, numeric value. */
export function renderScoreTable(score: MapScore): string {
  const header = ["| Dimension | Score | |", "|---|---|---|"];
  const rows = DIMENSIONS.map(
    (dim) => `| ${dim.label} | ${renderStars(score[dim.id])} | ${score[dim.id]}/${MAX_RATING} |`,
  );
  return [...header, ...rows].join("\n");
}

/** A vertical block (label over stars), matching the at-a-glance layout on a pattern page. */
export function renderScoreBlock(score: MapScore): string {
  return DIMENSIONS.map((dim) => `${dim.label}\n${renderStars(score[dim.id])}`).join("\n\n");
}

/** A one-line summary, e.g. "Complexity ★★☆☆☆ · Latency ★★★★★ · ...". */
export function renderScoreSummary(score: MapScore): string {
  return DIMENSIONS.map((dim) => `${dim.label} ${renderStars(score[dim.id])}`).join(" · ");
}
