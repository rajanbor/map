/**
 * POC — programmatic use of the MAP pattern catalog.
 *
 * Loads the repo's catalog (written patterns merged with the roadmap) and renders a
 * decision brief you could paste into an ADR or feed to an AI agent as grounding
 * context. Run from the repo root:
 *
 *   node examples/poc-pattern-catalog/demo.ts [query]
 */

import { createDefaultServices } from "../../cli/src/index.ts";

const query = process.argv[2] ?? "chunk";

const { catalog } = createDefaultServices();
const matches = await catalog.find({ text: query });

if (matches.length === 0) {
  console.log(`No pattern matches "${query}" — see ROADMAP.md for the target catalog.`);
  process.exit(0);
}

console.log(`# Decision brief: patterns matching "${query}"\n`);
for (const entry of matches) {
  console.log(`## ${entry.name} (\`${entry.id}\`) — ${entry.status}`);
  if (entry.summary) console.log(entry.summary + "\n");
  if (entry.maturity) console.log(`- Maturity: ${entry.maturity}`);
  if (entry.score) {
    console.log(
      `- MAP Score: complexity ${entry.score.complexity}/5, latency ${entry.score.latency}/5, cost ${entry.score.cost}/5, accuracy ${entry.score.accuracyImpact}/5, readiness ${entry.score.productionReadiness}/5`,
    );
  }
  if (entry.related && entry.related.length > 0) {
    console.log(`- Related: ${entry.related.join(", ")}`);
  }
  console.log();
}
