---
name: rag-pipeline
description: "RAG pipeline domain knowledge: chunking strategies, embedding models, vector similarity, retrieval methods, response synthesis, and LlamaIndex architecture. Use when: building or reasoning about Retrieval-Augmented Generation pipelines, designing chunking/indexing/retrieval stages, debugging RAG simulation nodes, or discussing embedding/vector store concepts."
argument-hint: '[concept] chunking | embedding | retrieval | indexing | synthesis'
---

# RAG Pipeline Domain Knowledge

## When to Use

- Designing or implementing a RAG pipeline stage (chunker, embedder, vector store, retriever, generator)
- Reasoning about chunking strategies, embedding models, or vector similarity
- Debugging 3D simulation nodes that represent RAG stages
- Choosing between index types or retrieval methods
- Explaining RAG concepts in UI labels, tooltips, or documentation

## Pipeline Overview

The RAG pipeline flows through six stages. Each stage maps to a 3D node in the simulation:

```
Documents → Chunker → Embedder → VectorStore → Retriever → Generator
```

## Stage 1: Data Ingestion (Loading)

Load external data into standardized `Document` containers.

- **Documents**: Raw data containers carrying text/payload, custom metadata, and unique `id_`.
- **Loaders / Readers**: Specialized connectors (file parsers, database readers, API fetchers) that batch-load external data into `Document` objects.
- **LlamaHub**: Registry of 130+ community data connectors and tools.

*Simulation mapping*: The entry point — a "document cloud" or file icon node that feeds into the chunker.

## Stage 2: Chunking & Transformation (Node Generation)

Break documents into small semantic chunks to avoid prompt context overflow.

| Tool | Purpose |
|------|---------|
| **TextNode** | Discrete semantic chunk extracted from a `Document` |
| **TokenTextSplitter** | Cuts strings by token budget, `chunk_size`, and `chunk_overlap` |
| **Node Parsers** | Automated pipeline transformers that structurally slice documents |
| **Relational Parsers** | Link nodes via `PREVIOUS`/`NEXT` (sequential) or `PARENT`/`CHILD`/`SOURCE` (hierarchical) |
| **Metadata Extractors** | Inject contextual enrichment during transformation |

### Key Chunking Strategies

| Strategy | Best For | Trade-off |
|----------|----------|-----------|
| **Fixed-size (token)** | General purpose, predictable context windows | May split mid-sentence, losing semantics |
| **Sentence-based** | Natural language, preserves grammar | Uneven chunk sizes, may underfill context |
| **Semantic / recursive** | Code, structured docs | Requires parsing logic per format |
| **Hierarchical** | Long documents needing lineage | More complex retrieval, larger index |
| **With overlap** | Mitigating boundary information loss | Redundant storage, duplicate retrieval risk |

*Simulation mapping*: A node that visually "slices" a document into glowing fragments.

## Stage 3: Indexing & Storage

Map chunks to searchable structures, typically via vector embeddings.

### Index Types

| Index | Mechanism | Best For |
|-------|-----------|----------|
| **VectorStoreIndex** | Cosine similarity over embeddings | Semantic search, fuzzy matching |
| **SummaryIndex** | Sequential node list | Simple linear scan, small datasets |
| **DocumentSummaryIndex** | Summary-level indices bypassing raw text | Large docs with clear summaries |
| **KeywordTableIndex** | Keyword → node lookup table | Exact term matching, faceted search |
| **TreeIndex** | Hierarchical summary tree | Top-down browsing, structured data |
| **KnowledgeGraphIndex** | Entity-relation-entity triple graphs | Multi-hop reasoning, relationship queries |
| **ComposableGraph** | Meta-index layering sibling indexes | Multi-source pipelines |

### Vector Stores

Integration layers that persist embedding mappings: Pinecone, Chroma, pgvector, Qdrant, Weaviate, Milvus.

- **StorageContext**: State manager handling serialization of vectors, indices, and node stores.

### Embedding Models

| Model Family | Dimension | Characteristics |
|---|---|---|
| `text-embedding-3-small` | 512/1536 | OpenAI, cost-efficient |
| `text-embedding-3-large` | 256/1024/3072 | OpenAI, highest quality |
| `bge-large-en-v1.5` | 1024 | Open-source, top MTEB leaderboard |
| `all-MiniLM-L6-v2` | 384 | Lightweight, local-friendly |
| `Cohere Embed v3` | 1024 | Multilingual, compression-aware |

*Simulation mapping*: A node that transforms chunks into floating number arrays (vectors), stored in a geometric space.

## Stage 4: Querying & Retrieval

Fetch relevant nodes matching a user query.

### Retrievers

Targeted lookup blocks attached to specific indices:
- **Vector similarity**: Cosine/dot-product nearest-neighbor search
- **Keyword indexing**: Exact or fuzzy string matching
- **Tree traversal**: Top-down hierarchical browsing

### Query Optimization

| Tool | Purpose |
|------|---------|
| **Metadata Filters** | Hard constraints (exact field matches) on lookups |
| **Query Transformers** | Rewrite/realign awkward prompts for better match efficiency |
| **Sub-Question Engines** | Decompose multi-layered queries into targeted sub-queries |
| **Hybrid Search** | Merge dense (semantic embedding) + sparse (BM25 keyword) retrieval |
| **Selectors** | LLM-classified routing to the optimal index or retrieval engine |

*Simulation mapping*: A node that casts a "search beam" into the vector store, returning glowing matched particles.

## Stage 5: Node Postprocessing (Context Refinement)

Prune, enrich, and reorder retrieved context before generation.

| Postprocessor | Effect |
|---------------|--------|
| **SimilarityPostprocessor** | Drop results below a minimum embedding score threshold |
| **KeywordNodePostprocessor** | Include/exclude nodes by explicit string filters |
| **PrevNextNodePostprocessor** | Fetch surrounding sequential nodes for extra context |
| **LongContextReorder** | Reorder nodes to counter "lost-in-the-middle" LLM bias |
| **PIINodePostprocessor** | Strip personally identifiable information |
| **MetadataReplacementPostProcessor** | Swap small indexed vectors with full parent text fields |
| **SentenceEmbeddingOptimizer** | Truncate sentences to retain only high-signal words |
| **Cohere Rerank / LLM Rerank** | External scoring to sort optimal nodes to the prompt top |

*Simulation mapping*: A filtering/ranking node that prunes and reorders the retrieved particles.

## Stage 6: Response Synthesis

Assemble context into a prompt and generate the final response.

### Synthesis Strategies

| Strategy | Mechanism | Best For |
|----------|-----------|----------|
| **Create and Refine** | Iteratively build answer, refining with each chunk | High quality, slower |
| **Tree Summarize** | Bottom-up tree merge of chunk responses | Long documents |
| **Compact** | Compress and concatenate context into single prompt | Speed, single-call APIs |

### Interaction Modes

| Mode | Purpose |
|------|---------|
| **Query Engine** | Single-shot fetch-and-synthesize over an index |
| **Chat Engine** | Persistent conversational context with history tracking |
| **Agents** | Goal-oriented loops (`ReActAgent`, `OpenAIAgent`) using tool classes for multi-step tasks |

### Structured Output

Force LLM responses into rigid schemas:
- **Output Parsers**: Parse raw text into typed structures
- **Pydantic Programs**: Generate responses conforming to Pydantic models (JSON/DTO)

*Simulation mapping*: The final node that assembles context + query into a prompt, shows the LLM "thinking," and outputs structured text.

## Common Pitfalls

- **Chunk overlap too high**: Blows up index size, causes near-duplicate retrieval
- **Chunk overlap too low**: Loses context at boundaries, especially for code
- **Embedding mismatch**: Different models for indexing vs. querying → broken similarity
- **Top-k too small**: Misses relevant context; too large → dilutes relevance, wastes tokens
- **No reranking**: Raw vector similarity isn't enough — always rerank for production
- **Ignored metadata**: Chunks without source/doc metadata are unverifiable

## References

- [LlamaIndex Documentation](https://docs.llamaindex.ai/)
- [MTEB Leaderboard](https://huggingface.co/spaces/mteb/leaderboard) — embedding model benchmarks
