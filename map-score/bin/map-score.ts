#!/usr/bin/env node
/**
 * Render a MAP Score JSON file to Markdown (stars block + table).
 *
 * Usage: map-score <path-to-score.json>
 * Runs on Node's native TypeScript support (>=22); no build step.
 */

import { readFile } from "node:fs/promises";
import { parseScore } from "../src/score.ts";
import { renderScoreBlock, renderScoreTable } from "../src/render.ts";

const [path] = process.argv.slice(2);

if (path === undefined) {
  process.stderr.write("Usage: map-score <path-to-score.json>\n");
  process.exitCode = 1;
} else {
  try {
    const score = parseScore(JSON.parse(await readFile(path, "utf8")));
    const title = score.pattern ? `MAP Score — ${score.pattern}` : "MAP Score";
    process.stdout.write(`${title}\n\n`);
    process.stdout.write(`${renderScoreBlock(score)}\n\n`);
    process.stdout.write(`${renderScoreTable(score)}\n`);
  } catch (error) {
    process.stderr.write(
      `${error instanceof Error ? error.message : String(error)}\n`,
    );
    process.exitCode = 1;
  }
}
