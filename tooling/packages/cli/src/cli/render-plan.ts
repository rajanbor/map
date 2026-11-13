/** Human-readable rendering of a configuration plan (shared by `plan` and `init`). */

import type { Reporter } from "../reporting/index.ts";
import type { Plan } from "../plan/planner.ts";

export function renderPlan(plan: Plan, reporter: Reporter, options: { readonly verbose?: boolean } = {}): void {
  const join = (items: readonly string[]): string => (items.length > 0 ? items.join(", ") : "—");
  const p = plan.project;
  reporter.info(`Project: ${plan.root}${plan.workspaces > 1 ? ` (${plan.workspaces} workspaces)` : ""}`);
  reporter.info(`  languages       ${join(p.languages)}${plan.probable.languages.length > 0 ? ` (probable: ${plan.probable.languages.join(", ")})` : ""}`);
  reporter.info(`  frameworks      ${join(p.frameworks)}${plan.probable.frameworks.length > 0 ? ` (probable: ${plan.probable.frameworks.join(", ")})` : ""}`);
  reporter.info(`  infrastructure  ${join(p.infrastructure)}${plan.probable.infrastructure.length > 0 ? ` (probable: ${plan.probable.infrastructure.join(", ")})` : ""}`);
  reporter.info(`  tooling         ${join(p.tooling)}${plan.probable.tooling.length > 0 ? ` (probable: ${plan.probable.tooling.join(", ")})` : ""}`);
  reporter.info(`Agents: ${join(plan.agents.selected)} (${describeSelection(plan.agents.selectedBy)})${plan.agents.detected.length > 0 && plan.agents.selectedBy !== "detected" ? `; detected: ${plan.agents.detected.join(", ")}` : ""}`);
  reporter.info(`Profiles: ${join(plan.profiles.selected)}${plan.profiles.suggested.length > 0 ? `; suggested: ${plan.profiles.suggested.join(", ")} (use --profile)` : ""}`);

  reporter.info("");
  const sources = plan.skills.sources.map((s) => `${s.id}@${s.revision.slice(0, 12)}${s.stale ? " (cached)" : ""}`);
  reporter.info(`Recommended skills${sources.length > 0 ? ` from ${sources.join(", ")}` : ""}:`);
  if (plan.skills.recommendations.length === 0) reporter.info("  none for the detected stack");
  for (const skill of plan.skills.recommendations) {
    const state = skill.installed ? "installed" : skill.approvals.length > 0 ? `needs ${skill.approvals.map((a) => `--allow-${a}`).join(" ")}` : "ready";
    reporter.info(`  ${skill.name}${skill.version !== undefined ? ` ${skill.version}` : ""} [${state}] — ${skill.purpose}`);
    reporter.info(`      why: ${skill.reasons.join(" ")}`);
    if (skill.evidence.length > 0) {
      reporter.info(`      evidence: ${skill.evidence.map((e) => `${e.signal} (${e.file}${e.certainty === "probable" ? ", probable" : ""})`).join("; ")}`);
    }
    if (skill.scripts.length > 0) reporter.info(`      bundles scripts: ${skill.scripts.join(", ")}`);
    if (skill.findings.high + skill.findings.medium > 0) {
      reporter.info(`      audit: ${skill.findings.high} high, ${skill.findings.medium} medium finding(s) — see 'map skills audit ${skill.name}'`);
    }
    reporter.info(`      installs to: ${skill.destinations.map((d) => `${d.path} (${d.action})`).join(", ")}`);
  }
  for (const missing of plan.skills.unavailable) reporter.info(`  ${missing.name} — not available: ${missing.reason}`);
  for (const gap of plan.skills.gaps) reporter.info(`  (no skill) ${gap.need} — ${gap.reason}`);

  reporter.info("");
  reporter.info("Recommended patterns:");
  if (plan.patterns.length === 0) reporter.info("  none (no AI architecture signals; try --profile ai-app)");
  for (const pattern of plan.patterns) {
    reporter.info(`  [${pattern.priority}] ${pattern.id} (${pattern.status}) — ${pattern.reasons.join(" ")}`);
  }

  reporter.info("");
  reporter.info("Files:");
  for (const change of plan.changes) {
    reporter.info(`  ${change.action.padEnd(8)} ${change.path} — ${change.reason}`);
  }

  if (plan.approvals.length > 0) {
    reporter.info("");
    reporter.info("Needs your decision:");
    for (const approval of plan.approvals) reporter.info(`  - ${approval}`);
  }
  if (options.verbose === true) {
    reporter.info("");
    reporter.info("Security:");
    for (const note of plan.security) reporter.info(`  - ${note}`);
    reporter.info("Limitations:");
    for (const note of plan.limitations) reporter.info(`  - ${note}`);
  }
}

function describeSelection(by: Plan["agents"]["selectedBy"]): string {
  switch (by) {
    case "flag": return "from --agents";
    case "config": return "from map.config.json";
    case "detected": return "detected";
    case "default": return "default; none detected — choose with --agents";
  }
}
