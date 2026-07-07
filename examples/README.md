# Examples

Realistic scenarios that show **how teams and AI agents use MAP to make architectural
decisions** — not code tutorials. Each reads like an Architecture Decision Record (ADR)
crossed with a solution-design doc: the problem, the constraints, the decisions, the MAP
patterns chosen, the alternatives rejected, and the reasoning.

The point is to help you think in **patterns and trade-offs**, not frameworks.

## Scenarios

| Scenario | What it demonstrates |
|----------|----------------------|
| [Customer Support Chatbot](customer-support-chatbot/) | RAG over changing docs, citations, low hallucination, low latency |
| [Legal Document Assistant](legal-document-assistant/) | Private-document search, tenant isolation, auditability, citations |
| [Multi-Tenant SaaS](multi-tenant-saas/) | Adding AI to a SaaS without cross-tenant leakage; permission-aware tools |
| [AI Email Assistant](ai-email-assistant/) | Grounded generation from CRM data with human approval |
| [Code Review Agent](code-review-agent/) | AI-assisted PR review: context retrieval, tools, evaluation |
| [Architecture Review](architecture-review/) | How an architect starts a new AI project with MAP |
| [Claude Code Integration](claude-code/) | How an AI coding agent uses MAP to make and justify decisions |
| [POC: Pattern Catalog](poc-pattern-catalog/) | Runnable: consuming the catalog via `map patterns` and the catalog API |

## How to read an example

Each example answers, in order: *what are we building*, *what must be true*, *what
constrains us*, *what did we decide and why*, *what did we reject and why*. Patterns are
referenced by name; published ones link to the [catalog](../patterns/), the rest to the
[Roadmap](../ROADMAP.md).

> A note on scope: most patterns referenced here are still on the roadmap. The examples
> are about the **decisions**, which hold regardless of when each pattern article lands.
