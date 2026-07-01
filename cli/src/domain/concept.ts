/**
 * Concepts are the AI-architecture signals that analyzers detect in source code
 * (Module 2). They are intentionally separate from patterns: a concept is "what we
 * found in the code" while a pattern is "a documented way to build something".
 * The recommendation engine (Module 3) bridges the two.
 */

export type ConceptId =
  | "llm"
  | "embeddings"
  | "vector_search"
  | "rag"
  | "tool_calling"
  | "streaming"
  | "memory"
  | "model_routing"
  | "prompt_guards"
  | "evaluation"
  | "observability";

export interface ConceptDefinition {
  readonly id: ConceptId;
  readonly name: string;
  readonly description: string;
}

/**
 * The catalog of concepts the platform understands. Analyzers report against these
 * ids so detection stays consistent across languages.
 */
export const CONCEPTS: readonly ConceptDefinition[] = [
  { id: "llm", name: "LLM Usage", description: "Direct calls to a large language model API." },
  { id: "embeddings", name: "Embeddings", description: "Text or data converted to vectors." },
  { id: "vector_search", name: "Vector Search", description: "Similarity search over embeddings." },
  { id: "rag", name: "RAG", description: "Retrieval-augmented generation." },
  { id: "tool_calling", name: "Tool Calling", description: "Model invokes external functions." },
  { id: "streaming", name: "Streaming", description: "Incremental token streaming of responses." },
  { id: "memory", name: "Memory", description: "State kept across turns or sessions." },
  { id: "model_routing", name: "Model Routing", description: "Requests routed across models." },
  { id: "prompt_guards", name: "Prompt Guards", description: "Input/output guardrails and injection defenses." },
  { id: "evaluation", name: "Evaluation", description: "Automated quality measurement of model outputs." },
  { id: "observability", name: "Observability", description: "Tracing, logging, and cost tracking of AI calls." },
];
