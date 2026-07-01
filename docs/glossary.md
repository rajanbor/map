# Glossary

Shared vocabulary for terms used across MAP patterns. Keep definitions short,
neutral, and framework-agnostic. Add terms as patterns introduce them (via a `docs/`
PR).

- **Agent** — a system that uses a model to decide and take actions (often via tools)
  in a loop, rather than producing a single response.
- **Chunk** — a unit of a document produced by splitting it for indexing/retrieval.
- **Context window** — the maximum number of tokens a model can attend to in a single request.
- **Embedding** — a vector representation of text (or other data) used for similarity search.
- **Eval / Evaluation** — a systematic way to measure the quality of an AI system's outputs.
- **Fine-tuning** — adapting a model's weights on task-specific data.
- **Grounding** — tying a model's output to provided source material to reduce fabrication.
- **Guardrail** — a check that constrains inputs or outputs for safety or policy.
- **Hallucination** — a confident but unsupported or false model output.
- **Inference** — running a trained model to produce outputs.
- **LLM** — Large Language Model.
- **Prompt injection** — an attack where untrusted input manipulates the model's instructions.
- **RAG** — Retrieval-Augmented Generation: retrieving relevant context and adding it to the prompt.
- **Reranking** — re-scoring retrieved candidates with a stronger model to improve ordering.
- **Retrieval** — selecting relevant context to include in a prompt.
- **Token** — the unit of text a model processes; roughly a word-piece.
- **Tool / Function calling** — letting a model invoke external functions with structured arguments.
- **Trace** — a record of the steps, inputs, and outputs of a single request through the system.
- **Vector store** — a database optimized for similarity search over embeddings.

> Missing a term? Add it in a `docs/` PR — keep entries to one or two neutral sentences.
