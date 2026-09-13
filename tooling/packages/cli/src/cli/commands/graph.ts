import type { Command, CommandContext, CommandResult } from "../command.ts";
import { FAILED, OK } from "../command.ts";
import { buildPatternGraph } from "../../graph/index.ts";

export const graphCommand: Command = {
  name: "graph",
  summary: "Inspect pattern nodes and typed relationships.",
  usage: "map graph [pattern-id] [--json]",
  args: "[pattern-id]",
  options: [{ flags: "--json", description: "machine-readable graph projection" }],

  async run(ctx: CommandContext): Promise<CommandResult> {
    const graph = buildPatternGraph(await ctx.services.catalog.entries());
    const id = ctx.args[0];
    if (id !== undefined && !graph.hasNode(id)) {
      ctx.reporter.error(`Unknown pattern id '${id}'.`);
      return FAILED;
    }
    const nodes = id === undefined ? [...graph.nodes()].sort() : [id];
    const edges = (id === undefined ? graph.edges() : graph.neighbors(id)).slice().sort(
      (a, b) => a.from.localeCompare(b.from) || a.type.localeCompare(b.type) || a.to.localeCompare(b.to),
    );
    if (ctx.flags["json"] === true) {
      ctx.reporter.info(JSON.stringify({ schemaVersion: 1, kind: "map.pattern-graph", nodes, edges }, null, 2));
      return OK;
    }
    if (id === undefined) {
      ctx.reporter.info(`Pattern graph: ${nodes.length} node(s), ${edges.length} edge(s).`);
      ctx.reporter.info("Inspect one node with 'map graph <pattern-id>'.");
      return OK;
    }
    ctx.reporter.info(`${id}: ${edges.length} outgoing relationship(s)`);
    for (const edge of edges) ctx.reporter.info(`  ${edge.type} -> ${edge.to}${edge.note ? ` — ${edge.note}` : ""}`);
    return OK;
  },
};
