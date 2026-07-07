/**
 * Dependency signals: the data-driven table that maps well-known AI packages to the
 * concepts they imply. Keeping detection as data (not code) makes new signals cheap —
 * adding a package is one line here, no analyzer changes.
 *
 * Confidence reflects how specific the package is to the concept: a vector database
 * client almost certainly means vector search (0.9), while a tokenizer only hints at
 * embeddings work (0.4).
 */

import type { ConceptId } from "../domain/index.ts";

/** The package ecosystems the dependency-manifest analyzer understands. */
export type Ecosystem = "npm" | "pypi" | "go" | "cargo";

export interface DependencySignal {
  /**
   * Dependency name to match. Exact for npm/pypi/cargo; for Go it matches when the
   * module path equals the value or starts with it followed by "/" (major-version
   * suffixes like ".../v2").
   */
  readonly dependency: string;
  readonly ecosystem: Ecosystem;
  readonly concept: ConceptId;
  /** 0..1 — how strongly this dependency implies the concept. */
  readonly confidence: number;
}

export const DEPENDENCY_SIGNALS: readonly DependencySignal[] = [
  // --- npm ---
  { dependency: "openai", ecosystem: "npm", concept: "llm", confidence: 0.9 },
  { dependency: "@anthropic-ai/sdk", ecosystem: "npm", concept: "llm", confidence: 0.9 },
  { dependency: "@google/generative-ai", ecosystem: "npm", concept: "llm", confidence: 0.9 },
  { dependency: "@google/genai", ecosystem: "npm", concept: "llm", confidence: 0.9 },
  { dependency: "cohere-ai", ecosystem: "npm", concept: "llm", confidence: 0.9 },
  { dependency: "@mistralai/mistralai", ecosystem: "npm", concept: "llm", confidence: 0.9 },
  { dependency: "groq-sdk", ecosystem: "npm", concept: "llm", confidence: 0.9 },
  { dependency: "ollama", ecosystem: "npm", concept: "llm", confidence: 0.9 },
  { dependency: "ai", ecosystem: "npm", concept: "llm", confidence: 0.8 },
  { dependency: "ai", ecosystem: "npm", concept: "streaming", confidence: 0.6 },
  { dependency: "langchain", ecosystem: "npm", concept: "rag", confidence: 0.6 },
  { dependency: "@langchain/core", ecosystem: "npm", concept: "rag", confidence: 0.6 },
  { dependency: "llamaindex", ecosystem: "npm", concept: "rag", confidence: 0.8 },
  { dependency: "@pinecone-database/pinecone", ecosystem: "npm", concept: "vector_search", confidence: 0.9 },
  { dependency: "chromadb", ecosystem: "npm", concept: "vector_search", confidence: 0.9 },
  { dependency: "@qdrant/js-client-rest", ecosystem: "npm", concept: "vector_search", confidence: 0.9 },
  { dependency: "weaviate-client", ecosystem: "npm", concept: "vector_search", confidence: 0.9 },
  { dependency: "weaviate-ts-client", ecosystem: "npm", concept: "vector_search", confidence: 0.9 },
  { dependency: "@zilliz/milvus2-sdk-node", ecosystem: "npm", concept: "vector_search", confidence: 0.9 },
  { dependency: "pgvector", ecosystem: "npm", concept: "vector_search", confidence: 0.9 },
  { dependency: "tiktoken", ecosystem: "npm", concept: "embeddings", confidence: 0.4 },
  { dependency: "@dqbd/tiktoken", ecosystem: "npm", concept: "embeddings", confidence: 0.4 },
  { dependency: "gpt-tokenizer", ecosystem: "npm", concept: "embeddings", confidence: 0.4 },
  { dependency: "@modelcontextprotocol/sdk", ecosystem: "npm", concept: "tool_calling", confidence: 0.8 },
  { dependency: "@openrouter/ai-sdk-provider", ecosystem: "npm", concept: "model_routing", confidence: 0.8 },
  { dependency: "portkey-ai", ecosystem: "npm", concept: "model_routing", confidence: 0.8 },
  { dependency: "mem0ai", ecosystem: "npm", concept: "memory", confidence: 0.8 },
  { dependency: "@getzep/zep-js", ecosystem: "npm", concept: "memory", confidence: 0.8 },
  { dependency: "promptfoo", ecosystem: "npm", concept: "evaluation", confidence: 0.9 },
  { dependency: "braintrust", ecosystem: "npm", concept: "evaluation", confidence: 0.9 },
  { dependency: "langfuse", ecosystem: "npm", concept: "observability", confidence: 0.9 },
  { dependency: "langsmith", ecosystem: "npm", concept: "observability", confidence: 0.9 },
  { dependency: "@helicone/helpers", ecosystem: "npm", concept: "observability", confidence: 0.9 },

  // --- PyPI ---
  { dependency: "openai", ecosystem: "pypi", concept: "llm", confidence: 0.9 },
  { dependency: "anthropic", ecosystem: "pypi", concept: "llm", confidence: 0.9 },
  { dependency: "google-generativeai", ecosystem: "pypi", concept: "llm", confidence: 0.9 },
  { dependency: "google-genai", ecosystem: "pypi", concept: "llm", confidence: 0.9 },
  { dependency: "cohere", ecosystem: "pypi", concept: "llm", confidence: 0.9 },
  { dependency: "mistralai", ecosystem: "pypi", concept: "llm", confidence: 0.9 },
  { dependency: "groq", ecosystem: "pypi", concept: "llm", confidence: 0.9 },
  { dependency: "ollama", ecosystem: "pypi", concept: "llm", confidence: 0.9 },
  { dependency: "litellm", ecosystem: "pypi", concept: "llm", confidence: 0.9 },
  { dependency: "litellm", ecosystem: "pypi", concept: "model_routing", confidence: 0.7 },
  { dependency: "langchain", ecosystem: "pypi", concept: "rag", confidence: 0.6 },
  { dependency: "langchain-core", ecosystem: "pypi", concept: "rag", confidence: 0.6 },
  { dependency: "llama-index", ecosystem: "pypi", concept: "rag", confidence: 0.8 },
  { dependency: "haystack-ai", ecosystem: "pypi", concept: "rag", confidence: 0.8 },
  { dependency: "chromadb", ecosystem: "pypi", concept: "vector_search", confidence: 0.9 },
  { dependency: "pinecone", ecosystem: "pypi", concept: "vector_search", confidence: 0.9 },
  { dependency: "pinecone-client", ecosystem: "pypi", concept: "vector_search", confidence: 0.9 },
  { dependency: "qdrant-client", ecosystem: "pypi", concept: "vector_search", confidence: 0.9 },
  { dependency: "weaviate-client", ecosystem: "pypi", concept: "vector_search", confidence: 0.9 },
  { dependency: "pymilvus", ecosystem: "pypi", concept: "vector_search", confidence: 0.9 },
  { dependency: "pgvector", ecosystem: "pypi", concept: "vector_search", confidence: 0.9 },
  { dependency: "faiss-cpu", ecosystem: "pypi", concept: "vector_search", confidence: 0.9 },
  { dependency: "faiss-gpu", ecosystem: "pypi", concept: "vector_search", confidence: 0.9 },
  { dependency: "sentence-transformers", ecosystem: "pypi", concept: "embeddings", confidence: 0.9 },
  { dependency: "tiktoken", ecosystem: "pypi", concept: "embeddings", confidence: 0.4 },
  { dependency: "mcp", ecosystem: "pypi", concept: "tool_calling", confidence: 0.8 },
  { dependency: "guardrails-ai", ecosystem: "pypi", concept: "prompt_guards", confidence: 0.9 },
  { dependency: "nemoguardrails", ecosystem: "pypi", concept: "prompt_guards", confidence: 0.9 },
  { dependency: "llm-guard", ecosystem: "pypi", concept: "prompt_guards", confidence: 0.9 },
  { dependency: "rebuff", ecosystem: "pypi", concept: "prompt_guards", confidence: 0.9 },
  { dependency: "mem0ai", ecosystem: "pypi", concept: "memory", confidence: 0.8 },
  { dependency: "zep-python", ecosystem: "pypi", concept: "memory", confidence: 0.8 },
  { dependency: "ragas", ecosystem: "pypi", concept: "evaluation", confidence: 0.9 },
  { dependency: "deepeval", ecosystem: "pypi", concept: "evaluation", confidence: 0.9 },
  { dependency: "trulens", ecosystem: "pypi", concept: "evaluation", confidence: 0.9 },
  { dependency: "langfuse", ecosystem: "pypi", concept: "observability", confidence: 0.9 },
  { dependency: "langsmith", ecosystem: "pypi", concept: "observability", confidence: 0.9 },
  { dependency: "arize-phoenix", ecosystem: "pypi", concept: "observability", confidence: 0.9 },

  // --- Go ---
  { dependency: "github.com/openai/openai-go", ecosystem: "go", concept: "llm", confidence: 0.9 },
  { dependency: "github.com/sashabaranov/go-openai", ecosystem: "go", concept: "llm", confidence: 0.9 },
  { dependency: "github.com/anthropics/anthropic-sdk-go", ecosystem: "go", concept: "llm", confidence: 0.9 },
  { dependency: "github.com/tmc/langchaingo", ecosystem: "go", concept: "rag", confidence: 0.6 },
  { dependency: "github.com/pinecone-io/go-pinecone", ecosystem: "go", concept: "vector_search", confidence: 0.9 },
  { dependency: "github.com/qdrant/go-client", ecosystem: "go", concept: "vector_search", confidence: 0.9 },
  { dependency: "github.com/weaviate/weaviate-go-client", ecosystem: "go", concept: "vector_search", confidence: 0.9 },
  { dependency: "github.com/milvus-io/milvus-sdk-go", ecosystem: "go", concept: "vector_search", confidence: 0.9 },
  { dependency: "github.com/mark3labs/mcp-go", ecosystem: "go", concept: "tool_calling", confidence: 0.8 },
  { dependency: "github.com/modelcontextprotocol/go-sdk", ecosystem: "go", concept: "tool_calling", confidence: 0.8 },

  // --- Cargo ---
  { dependency: "async-openai", ecosystem: "cargo", concept: "llm", confidence: 0.9 },
  { dependency: "anthropic-sdk-rs", ecosystem: "cargo", concept: "llm", confidence: 0.9 },
  { dependency: "rig-core", ecosystem: "cargo", concept: "llm", confidence: 0.8 },
  { dependency: "rig-core", ecosystem: "cargo", concept: "rag", confidence: 0.5 },
  { dependency: "qdrant-client", ecosystem: "cargo", concept: "vector_search", confidence: 0.9 },
  { dependency: "tiktoken-rs", ecosystem: "cargo", concept: "embeddings", confidence: 0.4 },
];
