# MAP Roadmap

This roadmap tracks the patterns MAP intends to document. It is a **living backlog** —
suggestions are welcome via the "New Pattern" issue template, and the ordering will
shift as the community weighs in.

**Legend:** ⬜ Planned · 🟡 In progress · ✅ Published

> Nothing here is published yet. This is the target catalog (~75 patterns) that
> defines MAP's initial scope. Claim one by opening a "New Pattern" issue.

---

## Delivery phases

MAP grows in phases so the highest-leverage patterns land first and conventions
solidify before the catalog scales.

- **Phase 0 — Foundations (current):** repository, template, contributor experience,
  style guide, reference-implementation conventions.
- **Phase 1 — Cornerstones:** the single most-referenced pattern in each category, to
  validate the template end-to-end (e.g. Chunking, Conversation Memory, Tool Calling,
  Prompt Injection, LLM-as-Judge, Streaming, Model Routing, Tracing).
- **Phase 2 — Depth:** fill out each category with the common production patterns.
- **Phase 3 — Frontier & composition:** advanced patterns, cross-category decision
  guides ("RAG vs fine-tuning"), benchmarks, and the interactive website.

---

## Retrieval

Getting the right context in front of the model.

- ⬜ Chunking Strategies
- ⬜ Parent-Child (Small-to-Big) Retrieval
- ⬜ Hybrid Search (dense + sparse)
- ⬜ Metadata Filtering
- ⬜ Multi-Query Retrieval
- ⬜ Contextual Compression
- ⬜ Semantic Cache
- ⬜ Reranking (cross-encoder)
- ⬜ HyDE (Hypothetical Document Embeddings)
- ⬜ Sentence-Window Retrieval
- ⬜ Self-Query Retrieval
- ⬜ Hierarchical / Recursive Retrieval
- ⬜ Graph RAG
- ⬜ Contextual Retrieval (chunk-level context prefixing)
- ⬜ Late Chunking

## Memory

Persisting and recalling state across turns and sessions.

- ⬜ Conversation (Buffer) Memory
- ⬜ Sliding-Window Memory
- ⬜ Summary Memory
- ⬜ Long-Term Memory
- ⬜ Episodic Memory
- ⬜ Semantic Memory
- ⬜ Knowledge-Graph Memory
- ⬜ Entity Memory
- ⬜ Vector-Backed Memory
- ⬜ Memory Consolidation & Forgetting

## Agents

Planning, acting, reflecting, and coordinating.

- ⬜ Planner
- ⬜ Executor
- ⬜ ReAct (Reason + Act)
- ⬜ Plan-and-Execute
- ⬜ Reflection / Self-Critique
- ⬜ Human-in-the-Loop Approval
- ⬜ Multi-Agent Collaboration
- ⬜ Orchestrator–Worker
- ⬜ Supervisor / Router Agent
- ⬜ Tool Budget
- ⬜ Retry / Self-Healing
- ⬜ Tree of Thoughts
- ⬜ Blackboard

## Security

Defending against injection, leakage, and abuse.

- ⬜ Prompt Injection Defense
- ⬜ Secret Isolation
- ⬜ Tenant Isolation
- ⬜ PII Redaction
- ⬜ Sandboxing (tool & code execution)
- ⬜ Output Guardrails / Filtering
- ⬜ Input Validation
- ⬜ Least-Privilege Tool Access
- ⬜ Rate Limiting & Abuse Prevention
- ⬜ Content Moderation

## Context Management

Budgeting and shaping the context window.

- ⬜ Context Window Budgeting
- ⬜ Prompt Compression
- ⬜ Context Summarization
- ⬜ Structured Prompting
- ⬜ Few-Shot Example Selection
- ⬜ Context Ordering (lost-in-the-middle)
- ⬜ Message Pruning
- ⬜ Dynamic Context Assembly

## Evaluation

Measuring quality, regressions, and hallucination.

- ⬜ Golden Dataset
- ⬜ LLM-as-Judge
- ⬜ Regression Testing
- ⬜ Hallucination Detection
- ⬜ Rubric Scoring
- ⬜ Pairwise Comparison
- ⬜ Faithfulness / Groundedness Evaluation
- ⬜ Synthetic Eval-Data Generation
- ⬜ Online A/B Testing

## Performance

Latency, throughput, and cost.

- ⬜ Streaming
- ⬜ Prompt Cache
- ⬜ Response Cache
- ⬜ Parallel / Fan-out Retrieval
- ⬜ Speculative Execution
- ⬜ Request Batching
- ⬜ Model Cascade (cheap-first)
- ⬜ Token-Budget Optimization

## Routing

Sending each request to the right model or path.

- ⬜ Model Routing
- ⬜ Cost-Based Routing
- ⬜ Intent Routing
- ⬜ Complexity-Based Routing
- ⬜ Semantic Routing
- ⬜ Fallback Routing
- ⬜ Load Balancing / Multiplexing

## Tool Calling

Letting models act through tools safely.

- ⬜ Basic Tool Calling
- ⬜ Parallel Tool Calls
- ⬜ Tool Selection / Filtering
- ⬜ Dynamic Tool Loading
- ⬜ Structured Output / Function Calling
- ⬜ Tool Result Validation
- ⬜ Tool Error Handling
- ⬜ Confirmation-Gated Tools

## Observability

Tracing, logging, cost, and feedback.

- ⬜ Tracing / Spans
- ⬜ Token & Cost Tracking
- ⬜ Prompt & Completion Logging
- ⬜ Feedback Collection
- ⬜ Latency Monitoring
- ⬜ Eval Dashboards
- ⬜ Drift Detection
- ⬜ Audit Trails

---

## Cross-category decision guides (Phase 3)

Not patterns themselves, but decision-oriented articles that link patterns together:

- ⬜ RAG vs Fine-Tuning vs Long-Context
- ⬜ When to add Memory (and which kind)
- ⬜ Single Agent vs Multi-Agent
- ⬜ Caching decision guide (prompt / response / semantic)
- ⬜ Choosing a retrieval strategy

## Candidate categories (future)

Under consideration as the catalog matures — open a Discussion to shape these:

- **Reasoning** (chain-of-thought, self-consistency, decomposition)
- **Deployment** (canary rollouts, model versioning, shadow traffic)
- **Data & Ingestion** (parsing, embedding pipelines, freshness)
- **Fine-Tuning & Adaptation** (LoRA, distillation, preference tuning)
- **Multimodal** (image/audio retrieval and grounding)

---

*Suggest a pattern:* open a **New Pattern** issue. *Reshape the roadmap:* start a
**Discussion**. See [CONTRIBUTING.md](CONTRIBUTING.md).
