/* ================= "Go deeper" content, part 2 ================= */

/* ---------- 6. Fine-tune or retrieve ---------- */
DEEP['knowledge'] = {
  2: {
    title: 'RAG end to end, with real tools',
    math: R`<p>Retrieval-augmented generation treats the retrieved passage \(z\) as a latent variable. The original formulation marginalises over the top-\(k\) passages from a retriever \(p_\eta(z \mid x)\):</p>
\[ p(y \mid x) \approx \sum_{z \in \operatorname{top-}k} p_\eta(z \mid x)\; p_\theta(y \mid x, z) \]
<p>Production systems simplify: retrieve \(k\) chunks, paste them into the context with their sources, and generate once.</p>
<h4>Picking a vector store</h4>
<div class="tbl-wrap"><table><thead><tr><th>If you…</th><th>Start with</th></tr></thead><tbody>
<tr><td>Already run PostgreSQL and have up to tens of millions of chunks</td><td>pgvector: vectors next to your rows, SQL filters and joins, transactions, existing backups</td></tr>
<tr><td>Need a dedicated, filter-heavy vector engine at scale</td><td>Qdrant, Weaviate or Milvus (self-hosted or managed)</td></tr>
<tr><td>Want zero operations</td><td>Pinecone or a managed tier of the above</td></tr>
<tr><td>Already run Elasticsearch or OpenSearch</td><td>Their kNN plus BM25 for hybrid search in one engine</td></tr>
<tr><td>Prototype in a notebook or embed in an app</td><td>Chroma, LanceDB, or FAISS as an in-process library</td></tr>
</tbody></table></div>
<p>Choose the <b>embedding model</b> by measured retrieval quality on your language and domain (the MTEB leaderboard is a starting point, your own eval set decides). For Kurdish, Arabic-script or other lower-resource languages, test multilingual models such as BGE-M3 or multilingual E5 on a few hundred real queries before committing.</p>`,
    code: [
      { lang: 'sql', title: 'pgvector: table, index and a filtered search', src: R`
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE chunks (
  id        bigserial PRIMARY KEY,
  doc_id    text NOT NULL,
  lang      text,
  content   text NOT NULL,
  embedding vector(1024)            -- must match the embedding model's dimension
);

-- approximate nearest neighbour index (HNSW) for cosine distance
CREATE INDEX ON chunks USING hnsw (embedding vector_cosine_ops);

-- top 5 chunks by cosine similarity, filtered by metadata
SELECT id, doc_id, content, 1 - (embedding <=> $1) AS similarity
FROM chunks
WHERE lang = 'ckb'
ORDER BY embedding <=> $1
LIMIT 5;` },
      { lang: 'python', title: 'Index and query from Python', src: R`
# pip install sentence-transformers "psycopg[binary]" pgvector
import psycopg
from pgvector.psycopg import register_vector
from sentence_transformers import SentenceTransformer

model = SentenceTransformer("BAAI/bge-m3")             # multilingual, 1024 dimensions
conn = psycopg.connect("postgresql://localhost/rag", autocommit=True)
register_vector(conn)

chunks = [("faq-12", "ckb", "..."), ("faq-13", "en", "...")]
vecs = model.encode([c[2] for c in chunks], normalize_embeddings=True)
with conn.cursor() as cur:
    for (doc, lang, text), v in zip(chunks, vecs):
        cur.execute("INSERT INTO chunks (doc_id, lang, content, embedding) VALUES (%s, %s, %s, %s)",
                    (doc, lang, text, v))

q = model.encode("how do I cancel my plan?", normalize_embeddings=True)
rows = conn.execute("SELECT content FROM chunks ORDER BY embedding <=> %s LIMIT 5", (q,)).fetchall()
context = "\n\n".join(r[0] for r in rows)                # goes into the prompt with sources` }
    ],
    tools: [
      { n: 'pgvector', d: 'Vector type, distance operators and HNSW/IVFFlat indexes inside PostgreSQL.', u: 'https://github.com/pgvector/pgvector', tag: 'Open source' },
      { n: 'Qdrant', d: 'Rust vector database with rich payload filters and hybrid search.', u: 'https://qdrant.tech/documentation/', tag: 'Open source' },
      { n: 'Weaviate', d: 'Vector database with built-in hybrid BM25 plus vector search.', u: 'https://weaviate.io', tag: 'Open source' },
      { n: 'Milvus', d: 'Distributed vector database for billion-scale collections.', u: 'https://milvus.io/docs', tag: 'Open source' },
      { n: 'Pinecone', d: 'Fully managed serverless vector database.', u: 'https://docs.pinecone.io', tag: 'Managed' },
      { n: 'Elasticsearch / OpenSearch', d: 'Mature BM25 search engines with kNN vector fields.', u: 'https://docs.opensearch.org/latest/vector-search/', tag: 'Open source' },
      { n: 'Chroma', d: 'Developer-friendly embedded or server vector store.', u: 'https://docs.trychroma.com', tag: 'Open source' },
      { n: 'LanceDB', d: 'Embedded columnar vector database on the Lance format.', u: 'https://lancedb.com', tag: 'Open source' },
      { n: 'FAISS', d: "Meta's library of exact and approximate nearest-neighbour indexes.", u: 'https://github.com/facebookresearch/faiss', tag: 'Open source' },
      { n: 'Sentence Transformers', d: 'Embedding and reranker models in a few lines of Python.', u: 'https://sbert.net', tag: 'Open source' },
      { n: 'LlamaIndex', d: 'Framework for ingestion, indexing and query pipelines over your data.', u: 'https://docs.llamaindex.ai', tag: 'Open source' },
      { n: 'Haystack', d: 'Composable pipelines for search and RAG.', u: 'https://haystack.deepset.ai', tag: 'Open source' }
    ],
    refs: [
      { t: 'Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks', s: 'Lewis et al., NeurIPS 2020', u: 'https://arxiv.org/abs/2005.11401' },
      { t: 'MTEB: Massive Text Embedding Benchmark leaderboard', s: 'Hugging Face Space', u: 'https://huggingface.co/spaces/mteb/leaderboard' },
      { t: 'BGE M3-Embedding: multi-lingual, multi-functionality, multi-granularity', s: 'Chen et al., 2024', u: 'https://arxiv.org/abs/2402.03216' },
      { t: 'Introducing Contextual Retrieval', s: 'Anthropic engineering, 2024', u: 'https://www.anthropic.com/news/contextual-retrieval' }
    ]
  }
};

/* ---------- 7. Retrieval, hands on ---------- */
DEEP['retrieval'] = {
  0: {
    title: 'Chunking in practice',
    math: R`<p>A chunk of \(c\) tokens with overlap \(o\) advances by a stride of \(c - o\), so a document of \(n\) tokens yields about</p>
\[ \left\lceil \frac{n - o}{c - o} \right\rceil \text{ chunks} \]
<p>Overlap of 10 to 20% of \(c\) costs that much extra storage and embedding compute.</p>
<h4>Sensible starting points</h4>
<ul>
<li>Respect structure first: split on headings, sections, list items and table rows before falling back to sentence or token limits.</li>
<li>200 to 500 tokens for FAQ-style and support content; 500 to 1,000 for dense technical or legal prose.</li>
<li>Keep metadata on every chunk: document id, title, section path, language, date, access permissions.</li>
<li>Parse PDFs and slides into clean text with layout awareness; most retrieval failures start with bad extraction.</li>
<li>Tune chunk size on your eval set (recall@k), not by intuition.</li>
</ul>`,
    code: [{ lang: 'python', title: 'Structure-aware splitting', src: R`
# pip install langchain-text-splitters
from langchain_text_splitters import RecursiveCharacterTextSplitter

splitter = RecursiveCharacterTextSplitter(
    chunk_size=1200, chunk_overlap=150,                  # characters, roughly 300 tokens
    separators=["\n## ", "\n### ", "\n\n", "\n", ". ", " "],   # headings first, words last
)
chunks = splitter.split_text(document_text)` }],
    tools: [
      { n: 'Docling', d: 'Converts PDF, DOCX, PPTX and HTML into structured Markdown with tables and layout.', u: 'https://github.com/docling-project/docling', tag: 'Open source' },
      { n: 'Unstructured', d: 'Partition documents of many formats into typed elements.', u: 'https://github.com/Unstructured-IO/unstructured', tag: 'Open source' },
      { n: 'LangChain text splitters', d: 'Recursive, Markdown-aware and token-based splitters.', u: 'https://github.com/langchain-ai/langchain/tree/master/libs/text-splitters', tag: 'Open source' },
      { n: 'Chonkie', d: 'Lightweight chunking library: token, sentence, semantic and late chunking.', u: 'https://github.com/chonkie-inc/chonkie', tag: 'Open source' }
    ],
    refs: [
      { t: 'Introducing Contextual Retrieval (contextual chunk prefixes)', s: 'Anthropic engineering, 2024', u: 'https://www.anthropic.com/news/contextual-retrieval' }
    ]
  },
  1: {
    title: 'Scoring functions: cosine, BM25 and fusion',
    math: R`<h4>Dense</h4>
<p>Embed query and chunk with an encoder \(f\), then score \(s(q,d) = \cos(f(q), f(d))\). With normalised vectors this equals the dot product. Approximate nearest-neighbour indexes such as HNSW find the top results in roughly logarithmic time instead of scanning every vector.</p>
<h4>Sparse: BM25</h4>
\[ \operatorname{BM25}(q,d) = \sum_{t \in q} \operatorname{IDF}(t) \cdot \frac{f(t,d)\,(k_1 + 1)}{f(t,d) + k_1\left(1 - b + b\,\frac{|d|}{\operatorname{avgdl}}\right)} \]
\[ \operatorname{IDF}(t) = \ln\left( \frac{N - n(t) + 0.5}{n(t) + 0.5} + 1 \right) \]
<p>\(f(t,d)\) is the term's frequency in the chunk, \(n(t)\) the number of chunks containing it, \(N\) the corpus size. \(k_1 \approx 1.2\) saturates repeated terms and \(b \approx 0.75\) normalises for length. Rare terms like <code>E-402</code> get a large IDF, which is exactly why BM25 finds them.</p>
<h4>Hybrid: Reciprocal Rank Fusion</h4>
<p>Score scales differ between methods, so fuse by rank instead:</p>
\[ \operatorname{RRF}(d) = \sum_{m \in \text{methods}} \frac{1}{k + \operatorname{rank}_m(d)}, \qquad k = 60 \]
<p>A chunk ranked 1st by BM25 and 3rd by vectors scores \(1/61 + 1/63 \approx 0.0323\).</p>`,
    code: [{ lang: 'python', title: 'Hybrid search with Reciprocal Rank Fusion', src: R`
# pip install sentence-transformers rank-bm25 numpy
import numpy as np
from rank_bm25 import BM25Okapi
from sentence_transformers import SentenceTransformer

model = SentenceTransformer("BAAI/bge-m3")
doc_vecs = model.encode(chunks, normalize_embeddings=True)
bm25 = BM25Okapi([c.lower().split() for c in chunks])

def hybrid(query, k=5, rrf_k=60):
    dense = np.argsort(-(doc_vecs @ model.encode(query, normalize_embeddings=True)))
    sparse = np.argsort(-bm25.get_scores(query.lower().split()))
    score = {}
    for ranking in (dense, sparse):
        for rank, i in enumerate(ranking[:50], start=1):
            score[i] = score.get(i, 0) + 1 / (rrf_k + rank)
    return [chunks[i] for i, _ in sorted(score.items(), key=lambda x: -x[1])[:k]]` }],
    tools: [
      { n: 'rank_bm25', d: 'Pure-Python BM25 variants for small corpora.', u: 'https://github.com/dorianbrown/rank_bm25', tag: 'Open source' },
      { n: 'bm25s', d: 'Fast sparse BM25 in Python, hundreds of times quicker than naive versions.', u: 'https://github.com/xhluca/bm25s', tag: 'Open source' },
      { n: 'Qdrant hybrid queries', d: 'Dense plus sparse vectors fused server-side with RRF.', u: 'https://qdrant.tech/documentation/concepts/hybrid-queries/', tag: 'Open source' },
      { n: 'Vespa', d: 'Search engine combining BM25, vectors and learned ranking at scale.', u: 'https://vespa.ai', tag: 'Open source' }
    ],
    refs: [
      { t: 'The Probabilistic Relevance Framework: BM25 and Beyond', s: 'Robertson and Zaragoza, 2009', u: 'https://www.staff.city.ac.uk/~sbrp622/papers/foundations_bm25_review.pdf' },
      { t: 'Reciprocal Rank Fusion outperforms Condorcet and individual rank learning methods', s: 'Cormack, Clarke and Buettcher, SIGIR 2009', u: 'https://plg.uwaterloo.ca/~gvcormac/cormacksigir09-rrf.pdf' },
      { t: 'Efficient and robust approximate nearest neighbor search using HNSW graphs', s: 'Malkov and Yashunin, 2016', u: 'https://arxiv.org/abs/1603.09320' },
      { t: 'Dense Passage Retrieval for Open-Domain Question Answering', s: 'Karpukhin et al., EMNLP 2020', u: 'https://arxiv.org/abs/2004.04906' }
    ]
  }
};

/* ---------- 8. Advanced retrieval ---------- */
DEEP['advanced-rag'] = {
  0: {
    title: 'Bi-encoders versus cross-encoders',
    math: R`<p>A bi-encoder embeds separately, so document vectors are computed once at indexing time:</p>
\[ s_{\text{bi}}(q,d) = \cos\big(f(q),\, f(d)\big) \]
<p>A cross-encoder reads both texts in one forward pass, so every token of the query can attend to every token of the document:</p>
\[ s_{\text{cross}}(q,d) = g\big([\,q \,;\, d\,]\big) \]
<p>Accuracy rises, but nothing can be precomputed: reranking \(n\) candidates costs \(n\) forward passes per query. Hence the two-stage design: retrieve 50 to 200 with the bi-encoder (and BM25), rerank to the top 5 to 10. ColBERT sits in between, storing one vector per token and scoring with late interaction.</p>`,
    code: [{ lang: 'python', title: 'Rerank candidates with a cross-encoder', src: R`
from sentence_transformers import CrossEncoder

reranker = CrossEncoder("BAAI/bge-reranker-v2-m3")      # multilingual reranker
candidates = hybrid(query, k=50)                        # stage 1: cheap and wide
ranked = reranker.rank(query, candidates, top_k=5, return_documents=True)
for r in ranked:                                        # stage 2: precise and narrow
    print(round(r["score"], 3), r["text"][:80])` }],
    tools: [
      { n: 'BGE reranker v2 M3', d: 'Open multilingual cross-encoder reranker.', u: 'https://huggingface.co/BAAI/bge-reranker-v2-m3', tag: 'Open weights' },
      { n: 'Cohere Rerank', d: 'Hosted multilingual reranking API.', u: 'https://cohere.com/rerank', tag: 'API' },
      { n: 'Voyage rerankers', d: 'Hosted rerankers with long context windows.', u: 'https://docs.voyageai.com/docs/reranker', tag: 'API' },
      { n: 'ColBERT', d: 'Late-interaction retrieval with per-token vectors.', u: 'https://github.com/stanford-futuredata/ColBERT', tag: 'Open source' }
    ],
    refs: [
      { t: 'ColBERT: Efficient and Effective Passage Search via Contextualized Late Interaction over BERT', s: 'Khattab and Zaharia, SIGIR 2020', u: 'https://arxiv.org/abs/2004.12832' },
      { t: 'Passage Re-ranking with BERT', s: 'Nogueira and Cho, 2019', u: 'https://arxiv.org/abs/1901.04085' }
    ]
  },
  1: {
    title: 'Query rewriting prompts and HyDE',
    code: [{ lang: 'python', title: 'Rewrite a follow-up into a standalone query', src: R`
REWRITE = """Rewrite the user's last message as a standalone search query.
Use the conversation for missing context. Reply with the query only.

<conversation>
{history}
</conversation>
<last_message>{message}</last_message>"""

def standalone_query(history, message):
    resp = client.messages.create(
        model="claude-haiku-5-5",            # a small, fast model is enough
        max_tokens=60, temperature=0,
        messages=[{"role": "user", "content": REWRITE.format(history=history, message=message)}],
    )
    return resp.content[0].text.strip()

# "and in Turkey?" after a question about roaming in Germany
# becomes "mobile roaming charges in Turkey"` }],
    math: R`<p><b>HyDE</b> (hypothetical document embeddings) asks a model to write a plausible answer \(\tilde{d}\) and retrieves with \(f(\tilde{d})\) instead of \(f(q)\). Answers look more like documents than questions do, so they land closer in embedding space. The fake answer is only a search key; it never reaches the user.</p>`,
    refs: [
      { t: 'Precise Zero-Shot Dense Retrieval without Relevance Labels (HyDE)', s: 'Gao et al., ACL 2023', u: 'https://arxiv.org/abs/2212.10496' },
      { t: 'Query Rewriting for Retrieval-Augmented Large Language Models', s: 'Ma et al., EMNLP 2023', u: 'https://arxiv.org/abs/2305.14283' }
    ]
  },
  3: {
    title: 'Measuring retrieval and generation',
    math: R`<p>Build a set of real questions, each labelled with the chunk(s) that answer it. Then measure the two stages separately.</p>
<h4>Retrieval</h4>
\[ \text{recall@}k = \frac{|\,\text{relevant} \cap \text{top-}k\,|}{|\,\text{relevant}\,|} \]
\[ \operatorname{MRR} = \frac{1}{|Q|}\sum_{q \in Q} \frac{1}{\operatorname{rank}_q} \]
\[ \operatorname{nDCG@}k = \frac{1}{\operatorname{IDCG@}k}\sum_{i=1}^{k} \frac{2^{\operatorname{rel}_i} - 1}{\log_2(i + 1)} \]
<p>Recall@k asks whether the answer reached the model at all; MRR and nDCG reward putting it near the top.</p>
<h4>Generation</h4>
<ul>
<li><b>Faithfulness:</b> every claim in the answer is supported by the retrieved text.</li>
<li><b>Answer relevance:</b> the answer addresses the question that was asked.</li>
<li><b>Citation accuracy:</b> cited sources actually contain the cited claim.</li>
</ul>
<p>These are usually scored by an LLM judge with a rubric, calibrated against a few hundred human labels.</p>`,
    tools: [
      { n: 'Ragas', d: 'Faithfulness, context precision and recall metrics for RAG.', u: 'https://docs.ragas.io', tag: 'Open source' },
      { n: 'DeepEval', d: 'Pytest-style LLM and RAG evaluation with many metrics.', u: 'https://github.com/confident-ai/deepeval', tag: 'Open source' },
      { n: 'Microsoft GraphRAG', d: 'Builds an entity graph and community summaries for global questions.', u: 'https://github.com/microsoft/graphrag', tag: 'Open source' }
    ],
    refs: [
      { t: 'Ragas: Automated Evaluation of Retrieval Augmented Generation', s: 'Es et al., 2023', u: 'https://arxiv.org/abs/2309.15217' },
      { t: 'From Local to Global: A Graph RAG Approach to Query-Focused Summarization', s: 'Edge et al., 2024', u: 'https://arxiv.org/abs/2404.16130' },
      { t: 'Self-RAG: Learning to Retrieve, Generate, and Critique through Self-Reflection', s: 'Asai et al., ICLR 2024', u: 'https://arxiv.org/abs/2310.11511' }
    ]
  }
};

/* ---------- 9. Tool calling ---------- */
DEEP['tools'] = {
  0: {
    title: 'A complete tool round trip in code',
    codeNote: 'The pattern is identical across providers: define tools with a JSON schema, detect a tool request in the response, run it yourself, send the result back.',
    code: [{ lang: 'python', title: 'Tool calling with the Claude API', src: R`
import json, anthropic
client = anthropic.Anthropic()

tools = [{
    "name": "get_weather",
    "description": "Current weather for a city. Use when the user asks about weather now. "
                   "Returns temperature in Celsius and a short condition.",
    "input_schema": {
        "type": "object",
        "properties": {"city": {"type": "string", "description": "City name, e.g. Lisbon"}},
        "required": ["city"],
    },
}]

def get_weather(city):                          # your code, your API keys, your rules
    return {"city": city, "temp_c": 21, "condition": "sunny"}

messages = [{"role": "user", "content": "Should I take a jacket in Lisbon today?"}]
resp = client.messages.create(model="claude-sonnet-5-5", max_tokens=500, tools=tools, messages=messages)

if resp.stop_reason == "tool_use":
    call = next(b for b in resp.content if b.type == "tool_use")
    result = get_weather(**call.input)          # the harness executes, not the model
    messages += [
        {"role": "assistant", "content": resp.content},
        {"role": "user", "content": [{"type": "tool_result", "tool_use_id": call.id,
                                      "content": json.dumps(result)}]},
    ]
    resp = client.messages.create(model="claude-sonnet-5-5", max_tokens=500, tools=tools, messages=messages)
print(resp.content[0].text)` }],
    tools: [
      { n: 'Claude tool use', d: 'Client tools, server tools, parallel calls and strict schemas.', u: CLAUDE_DOCS + '/agents-and-tools/tool-use/overview', tag: 'API' },
      { n: 'OpenAI function calling', d: 'Tools in the Responses and Chat Completions APIs.', u: 'https://platform.openai.com/docs/guides/function-calling', tag: 'API' },
      { n: 'Berkeley Function Calling Leaderboard', d: 'Compares models on tool selection and argument accuracy.', u: 'https://gorilla.cs.berkeley.edu/leaderboard.html', tag: 'Benchmark' }
    ],
    refs: [
      { t: 'Toolformer: Language Models Can Teach Themselves to Use Tools', s: 'Schick et al., NeurIPS 2023', u: 'https://arxiv.org/abs/2302.04761' },
      { t: 'ReAct: Synergizing Reasoning and Acting in Language Models', s: 'Yao et al., ICLR 2023', u: 'https://arxiv.org/abs/2210.03629' }
    ]
  },
  2: {
    title: 'A tool definition that works',
    code: [{ lang: 'json', title: 'Tight schema, clear description, explicit units', src: R`
{
  "name": "search_orders",
  "description": "Search a customer's orders. Use for questions about order status, delivery or returns. Do not use for billing. Returns at most 'limit' orders, newest first, with id, status, eta_date and total_eur.",
  "input_schema": {
    "type": "object",
    "properties": {
      "customer_id": { "type": "string", "description": "Internal id, e.g. C-10293" },
      "status":      { "type": "string", "enum": ["open", "shipped", "delivered", "returned"] },
      "since_days":  { "type": "integer", "minimum": 1, "maximum": 365, "default": 30 },
      "limit":       { "type": "integer", "minimum": 1, "maximum": 20, "default": 5 }
    },
    "required": ["customer_id"],
    "additionalProperties": false
  }
}` }],
    refs: [
      { t: 'Writing effective tools for agents, with agents', s: 'Anthropic engineering, 2025', u: 'https://www.anthropic.com/engineering/writing-tools-for-agents' },
      { t: 'JSON Schema reference', s: 'json-schema.org', u: 'https://json-schema.org/understanding-json-schema' }
    ]
  },
  3: {
    title: 'Sandboxes for code execution',
    math: R`<p>Treat model-written code as untrusted. A sandbox should enforce, at minimum:</p>
<ul>
<li>An isolated filesystem, with only the files the task needs mounted in.</li>
<li>No network, or an allow-list of hosts.</li>
<li>CPU, memory, process-count and wall-clock limits.</li>
<li>No credentials in the environment, unless a tool explicitly needs one scoped key.</li>
<li>Output truncation, with large results written to files the model can page through.</li>
</ul>
<p>Containers alone share the host kernel; for hostile code, use a microVM (Firecracker) or a user-space kernel (gVisor).</p>`,
    tools: [
      { n: 'E2B', d: 'Cloud sandboxes for running AI-generated code.', u: 'https://e2b.dev', tag: 'Managed' },
      { n: 'Modal Sandboxes', d: 'On-demand isolated containers with GPU access.', u: 'https://modal.com/docs/guide/sandbox', tag: 'Managed' },
      { n: 'gVisor', d: 'User-space kernel that isolates containers from the host.', u: 'https://gvisor.dev', tag: 'Open source' },
      { n: 'Firecracker', d: 'Lightweight microVMs behind AWS Lambda.', u: 'https://firecracker-microvm.github.io', tag: 'Open source' },
      { n: 'Claude code execution tool', d: 'Server-side Python sandbox managed by the API.', u: CLAUDE_DOCS + '/agents-and-tools/tool-use/code-execution-tool', tag: 'API' }
    ]
  }
};

/* ---------- 10. MCP ---------- */
DEEP['mcp'] = {
  1: {
    title: 'The protocol on the wire, and a server in 15 lines',
    math: R`<p>MCP messages are JSON-RPC 2.0. In the current protocol version (2026-07-28) the protocol is stateless: every request carries the protocol version and client capabilities in its <code>_meta</code> field, and a client can call <code>server/discover</code> to learn what a server supports. Earlier versions opened with an <code>initialize</code> handshake, which you will still meet in older servers. Listing and calling tools looks like this (<code>_meta</code> omitted for brevity):</p>
<div class="mono-box">→ {"jsonrpc":"2.0","id":2,"method":"tools/list"}
← {"jsonrpc":"2.0","id":2,"result":{"tools":[{"name":"add",
     "description":"Add two numbers.",
     "inputSchema":{"type":"object","properties":{"a":{"type":"integer"},"b":{"type":"integer"}},"required":["a","b"]}}]}}

→ {"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"add","arguments":{"a":1,"b":2}}}
← {"jsonrpc":"2.0","id":3,"result":{"content":[{"type":"text","text":"3"}]}}</div>
<p>Transports: <b>stdio</b> for a local server launched as a subprocess, <b>Streamable HTTP</b> for remote servers, with OAuth for authorisation.</p>`,
    code: [
      { lang: 'python', title: 'An MCP server with the official Python SDK', src: R`
# pip install "mcp[cli]"
from mcp.server import MCPServer

mcp = MCPServer("Demo")

@mcp.tool()
def add(a: int, b: int) -> int:
    """Add two numbers."""          # the docstring becomes the tool description
    return a + b

@mcp.resource("greeting://{name}")
def greeting(name: str) -> str:
    """Greet someone by name."""
    return f"Hello, {name}!"` },
      { lang: 'bash', title: 'Try it in the MCP Inspector, then serve it over HTTP', src: R`
uv run mcp dev server.py                                   # opens the Inspector UI
uv run mcp run server.py --transport streamable-http      # remote clients connect to /mcp` }
    ],
    tools: [
      { n: 'MCP specification', d: 'The protocol: lifecycle, transports, authorisation, primitives.', u: 'https://modelcontextprotocol.io/specification/latest', tag: 'Standard' },
      { n: 'MCP Python SDK', d: 'Official SDK for servers and clients in Python.', u: 'https://github.com/modelcontextprotocol/python-sdk', tag: 'Open source' },
      { n: 'MCP TypeScript SDK', d: 'Official SDK for servers and clients in TypeScript.', u: 'https://github.com/modelcontextprotocol/typescript-sdk', tag: 'Open source' },
      { n: 'MCP Inspector', d: 'Interactive debugger for any MCP server.', u: 'https://github.com/modelcontextprotocol/inspector', tag: 'Open source' },
      { n: 'MCP Registry', d: 'Public registry of published MCP servers.', u: 'https://registry.modelcontextprotocol.io', tag: 'Directory' },
      { n: 'Reference servers', d: 'Official example servers: filesystem, fetch, git, memory and more.', u: 'https://github.com/modelcontextprotocol/servers', tag: 'Open source' }
    ],
    refs: [
      { t: 'Model Context Protocol: introduction and architecture', s: 'modelcontextprotocol.io', u: 'https://modelcontextprotocol.io/docs/learn/architecture' },
      { t: 'JSON-RPC 2.0 Specification', s: 'jsonrpc.org', u: 'https://www.jsonrpc.org/specification' }
    ]
  },
  3: {
    title: 'Prompt injection: the threat model',
    math: R`<p>An agent is at serious risk when it combines three things, a pattern Simon Willison calls the <b>lethal trifecta</b>:</p>
<ul>
<li>Access to private data (mail, files, databases).</li>
<li>Exposure to untrusted content (web pages, emails, tickets, third-party tool output).</li>
<li>A way to communicate externally (send email, make HTTP requests, write to shared places).</li>
</ul>
<p>Remove any one leg for a given task and an injected instruction cannot exfiltrate data. Where all three are needed, use deterministic controls the model cannot talk its way around: allow-lists, approval gates, separate credentials per tool, and designs where untrusted text is processed by a component that has no tools.</p>`,
    tools: [
      { n: 'OWASP Top 10 for LLM Applications', d: 'Prompt injection, excessive agency, data leakage and the rest, with mitigations.', u: 'https://genai.owasp.org/llm-top-10/', tag: 'Standard' },
      { n: 'MCP security best practices', d: 'Confused deputy, token passthrough, session hijacking and mitigations.', u: 'https://modelcontextprotocol.io/specification/latest/basic/security_best_practices', tag: 'Standard' }
    ],
    refs: [
      { t: 'Not what you’ve signed up for: Compromising Real-World LLM-Integrated Applications with Indirect Prompt Injection', s: 'Greshake et al., 2023', u: 'https://arxiv.org/abs/2302.12173' },
      { t: 'The lethal trifecta for AI agents', s: 'Simon Willison, 2025', u: 'https://simonwillison.net/2025/Jun/16/the-lethal-trifecta/' },
      { t: 'Defeating Prompt Injections by Design (CaMeL)', s: 'Debenedetti et al., Google DeepMind, 2025', u: 'https://arxiv.org/abs/2503.18813' }
    ]
  }
};

/* ---------- 11. Agent loop ---------- */
DEEP['agent-loop'] = {
  0: {
    title: 'The whole agent loop in code',
    math: R`<p>Formally, at step \(t\) the model samples an action from the context, the environment returns an observation, and both are appended:</p>
\[ a_t \sim \pi_\theta(\cdot \mid c_t), \qquad o_t = \operatorname{env}(a_t), \qquad c_{t+1} = c_t \oplus a_t \oplus o_t \]
<p>The loop ends when \(a_t\) is a final answer or a budget is exhausted. Everything the agent "knows" at step \(t\) is in \(c_t\), which is why the next lesson is about managing it.</p>`,
    code: [{ lang: 'python', title: 'A minimal agent harness', src: R`
def run_agent(task, tools, registry, max_steps=20):
    messages = [{"role": "user", "content": task}]
    for step in range(max_steps):                         # hard limit: a confused model can loop forever
        resp = client.messages.create(model="claude-sonnet-5-5", max_tokens=2000,
                                      system=SYSTEM, tools=tools, messages=messages)
        messages.append({"role": "assistant", "content": resp.content})
        calls = [b for b in resp.content if b.type == "tool_use"]
        if not calls:                                     # no tool requested: the model is done
            return "".join(b.text for b in resp.content if b.type == "text")
        results = []
        for c in calls:                                   # permissions and logging live here
            try:
                out = registry[c.name](**c.input)
                results.append({"type": "tool_result", "tool_use_id": c.id, "content": str(out)[:5000]})
            except Exception as e:                        # errors go back as results, not crashes
                results.append({"type": "tool_result", "tool_use_id": c.id,
                                "content": f"Error: {e}", "is_error": True})
        messages.append({"role": "user", "content": results})
    return "Stopped: step limit reached."` }],
    tools: [
      { n: 'Claude Agent SDK', d: 'The harness behind Claude Code as a library: tools, permissions, subagents, compaction.', u: 'https://github.com/anthropics/claude-agent-sdk-python', tag: 'Open source' },
      { n: 'OpenAI Agents SDK', d: 'Agents, tools, handoffs, guardrails and tracing.', u: 'https://github.com/openai/openai-agents-python', tag: 'Open source' },
      { n: 'LangGraph', d: 'Stateful agent graphs with checkpoints and human-in-the-loop.', u: 'https://github.com/langchain-ai/langgraph', tag: 'Open source' },
      { n: 'Pydantic AI', d: 'Type-safe agent framework in Python.', u: 'https://ai.pydantic.dev', tag: 'Open source' },
      { n: 'smolagents', d: "Hugging Face's minimal agents that act by writing code.", u: 'https://github.com/huggingface/smolagents', tag: 'Open source' },
      { n: 'Google ADK', d: 'Agent Development Kit for multi-agent apps.', u: 'https://github.com/google/adk-python', tag: 'Open source' }
    ],
    refs: [
      { t: 'Building effective agents', s: 'Anthropic engineering, 2024', u: 'https://www.anthropic.com/engineering/building-effective-agents' },
      { t: 'ReAct: Synergizing Reasoning and Acting in Language Models', s: 'Yao et al., ICLR 2023', u: 'https://arxiv.org/abs/2210.03629' }
    ]
  },
  3: {
    title: 'How agents are evaluated',
    math: R`<p>Agents are judged on whole tasks, not single replies. Public benchmarks give a feel for capability; your own task suite decides what ships.</p>
<ul>
<li><b>SWE-bench Verified:</b> fix real GitHub issues so that hidden tests pass.</li>
<li><b>τ-bench:</b> customer-service tasks with tools and policies; reports pass^k, the chance of succeeding on all of \(k\) repeated trials, which measures reliability rather than luck.</li>
<li><b>Terminal-Bench:</b> multi-step tasks in a real shell.</li>
</ul>
<p>Track success rate, steps, tokens, cost and wall-clock time per task. An agent that succeeds 90% of the time at five times the cost of a workflow that succeeds 85% may not be the better product.</p>`,
    refs: [
      { t: 'SWE-bench', s: 'Jimenez et al., ICLR 2024; leaderboard at swebench.com', u: 'https://www.swebench.com' },
      { t: 'τ-bench: A Benchmark for Tool-Agent-User Interaction in Real-World Domains', s: 'Yao et al., 2024', u: 'https://arxiv.org/abs/2406.12045' },
      { t: 'Terminal-Bench', s: 'Stanford and Laude Institute', u: 'https://www.tbench.ai' }
    ]
  }
};

/* ---------- 12. Context engineering ---------- */
DEEP['context-eng'] = {
  0: {
    title: 'Compaction and clearing, concretely',
    math: R`<p>If each step adds \(\Delta\) tokens of tool output, the context after \(t\) steps is roughly \(c_0 + t\Delta\), and the cumulative input billed over a run of \(T\) steps is</p>
\[ \sum_{t=1}^{T} (c_0 + t\Delta) = T c_0 + \Delta \frac{T(T+1)}{2} \]
<p>Quadratic in \(T\). Clearing old results caps the per-step context near a constant and makes the total linear, which is usually the biggest single cost saving in a long-running agent.</p>
<h4>Techniques, cheapest first</h4>
<ul>
<li><b>Tool-result clearing:</b> replace results older than \(k\) steps with a one-line placeholder.</li>
<li><b>Compaction:</b> when the window passes a threshold, summarise the conversation into decisions, open questions and next steps, then continue from the summary.</li>
<li><b>Structured notes:</b> the agent writes a running plan or todo file it can re-read after compaction.</li>
<li><b>Sub-agents:</b> push heavy reading into a separate context that returns only a summary (lesson 13).</li>
</ul>`,
    code: [{ lang: 'python', title: 'Clear stale tool results', src: R`
def clear_old_tool_results(messages, keep_last=3):
    """Keep the newest tool results verbatim; stub the rest."""
    seen = 0
    for m in reversed(messages):
        if m["role"] != "user" or not isinstance(m["content"], list):
            continue
        for block in m["content"]:
            if block.get("type") == "tool_result":
                seen += 1
                if seen > keep_last:
                    block["content"] = "[cleared: result already used]"
    return messages` }],
    tools: [
      { n: 'Claude context editing', d: 'Server-side clearing of old tool results and thinking blocks.', u: CLAUDE_DOCS + '/build-with-claude/context-editing', tag: 'API' },
      { n: 'Claude memory tool', d: 'A file-based memory directory the agent reads and writes across sessions.', u: CLAUDE_DOCS + '/agents-and-tools/tool-use/memory-tool', tag: 'API' }
    ],
    refs: [
      { t: 'Effective context engineering for AI agents', s: 'Anthropic engineering, 2025', u: 'https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents' },
      { t: 'Context Rot: How Increasing Input Tokens Impacts LLM Performance', s: 'Chroma Research, 2025', u: 'https://research.trychroma.com/context-rot' }
    ]
  },
  2: {
    title: 'What a skill looks like',
    math: R`<p>A skill is a folder. Its <code>SKILL.md</code> starts with YAML front matter; only <code>name</code> and <code>description</code> are loaded up front. The body, and any scripts or reference files, are read when the model decides the skill applies.</p>`,
    code: [{ lang: 'yaml', title: 'invoice-extraction/SKILL.md', src: R`
---
name: invoice-extraction
description: Extract totals, dates and vendor details from invoice PDFs into our JSON schema. Use when the user uploads or mentions an invoice.
---

# Invoice extraction

1. Convert the PDF to text with scripts/pdf_to_text.py.
2. Find the vendor, invoice number, issue date, currency and total.
3. Validate against schema.json; dates are ISO 8601, amounts are decimals.
4. If a field is missing, return null and say which page you searched.

See reference/edge-cases.md for credit notes and multi-currency invoices.` }],
    tools: [
      { n: 'Agent Skills', d: 'Skill format, progressive disclosure and examples.', u: 'https://github.com/anthropics/skills', tag: 'Open source' }
    ],
    refs: [
      { t: 'Equipping agents for the real world with Agent Skills', s: 'Anthropic engineering, 2025', u: 'https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills' }
    ]
  },
  3: {
    title: 'Memory systems',
    math: R`<p>Long-term memory is retrieval over the agent's own notes. A common scoring rule blends three signals for each stored memory \(m\) against the current situation \(q\):</p>
\[ \operatorname{score}(m) = w_1 \cos(f(q), f(m)) + w_2 \operatorname{importance}(m) + w_3\, \gamma^{\,\Delta t(m)} \]
<p>relevance, an importance rating assigned when it was written, and recency decaying with age \(\Delta t\). Whatever the scoring, apply the same hygiene as any user data: show users what is stored, let them delete it, and never store secrets.</p>`,
    tools: [
      { n: 'Mem0', d: 'Memory layer that extracts, stores and retrieves user facts.', u: 'https://github.com/mem0ai/mem0', tag: 'Open source' },
      { n: 'Letta', d: 'Stateful agents with editable memory blocks (from the MemGPT team).', u: 'https://github.com/letta-ai/letta', tag: 'Open source' },
      { n: 'LangGraph memory', d: 'Short-term checkpoints and long-term stores for agents.', u: 'https://docs.langchain.com/oss/python/langgraph/memory', tag: 'Open source' }
    ],
    refs: [
      { t: 'MemGPT: Towards LLMs as Operating Systems', s: 'Packer et al., 2023', u: 'https://arxiv.org/abs/2310.08560' },
      { t: 'Generative Agents: Interactive Simulacra of Human Behavior (memory scoring)', s: 'Park et al., UIST 2023', u: 'https://arxiv.org/abs/2304.03442' }
    ]
  }
};

/* ---------- 13. Multi-agent ---------- */
DEEP['multi-agent'] = {
  1: {
    title: 'The token arithmetic of fan-out',
    math: R`<p>Suppose a task needs reading \(n\) sources of \(s\) tokens each and producing summaries of \(u\) tokens.</p>
<p><b>Single agent:</b> the orchestrator's context ends near \(c_0 + n s\), and if it reads one source per step it pays roughly \(\sum_{i=1}^{n}(c_0 + i s) \approx n c_0 + s\,n^2/2\) input tokens.</p>
<p><b>Fan-out:</b> each of \(n\) workers pays about \(c_w + s\), and the orchestrator sees only \(c_0 + n u\). Total tokens can still be higher because every worker repeats its own instructions, but no single context exceeds \(c_w + s\), and workers run in parallel, so wall-clock time drops from about \(n\) reads to about one.</p>`,
    refs: [
      { t: 'How we built our multi-agent research system', s: 'Anthropic engineering, 2025', u: 'https://www.anthropic.com/engineering/multi-agent-research-system' },
      { t: 'Mixture-of-Agents Enhances Large Language Model Capabilities', s: 'Wang et al., 2024', u: 'https://arxiv.org/abs/2406.04692' }
    ]
  },
  3: {
    title: 'Routing and cascades, quantified',
    math: R`<p>A cascade sends every request to a small model first and escalates to the large one when a check fails. If the small model's answer is accepted with probability \(a\), expected cost per request is</p>
\[ \mathbb{E}[C] = c_s + (1 - a)\, c_\ell \]
<p>With \(c_s = 1\), \(c_\ell = 15\) and \(a = 0.7\): \(1 + 0.3 \times 15 = 5.5\), about a third of always using the large model. The saving depends entirely on a reliable acceptance check (schema validation, tests, a verifier model) and on measuring that quality does not drop.</p>`,
    code: [{ lang: 'python', title: 'A two-tier cascade', src: R`
def answer(question):
    draft = call(model="claude-haiku-5-5", prompt=question)
    if passes_checks(draft):            # schema valid, cites sources, verifier agrees, tests pass...
        return draft
    return call(model="claude-opus-5-5", prompt=question)` }],
    tools: [
      { n: 'LiteLLM Router', d: 'Load balancing, fallbacks and cost-based routing across models.', u: 'https://docs.litellm.ai/docs/routing', tag: 'Open source' },
      { n: 'OpenRouter', d: 'One API for hundreds of models with provider routing.', u: 'https://openrouter.ai', tag: 'Managed' },
      { n: 'RouteLLM', d: 'Open framework for training and evaluating model routers.', u: 'https://github.com/lm-sys/RouteLLM', tag: 'Open source' },
      { n: 'CrewAI', d: 'Role-based multi-agent orchestration.', u: 'https://github.com/crewAIInc/crewAI', tag: 'Open source' },
      { n: 'Microsoft Agent Framework', d: 'Successor to AutoGen and Semantic Kernel agents for multi-agent workflows.', u: 'https://github.com/microsoft/agent-framework', tag: 'Open source' }
    ],
    refs: [
      { t: 'FrugalGPT: How to Use Large Language Models While Reducing Cost and Improving Performance', s: 'Chen, Zaharia and Zou, 2023', u: 'https://arxiv.org/abs/2305.05176' },
      { t: 'RouteLLM: Learning to Route LLMs with Preference Data', s: 'Ong et al., 2024', u: 'https://arxiv.org/abs/2406.18665' }
    ]
  }
};

/* ---------- 19. Production ---------- */
DEEP['production'] = {
  0: {
    title: 'Evals with error bars',
    math: R`<p>An eval score on \(n\) test cases is an estimate. For an accuracy \(\hat{p}\), the 95% confidence interval is approximately</p>
\[ \hat{p} \pm 1.96 \sqrt{\frac{\hat{p}(1 - \hat{p})}{n}} \]
<p>With 200 cases at 85% accuracy that is \(\pm 4.9\) points. A change from 85% to 88% on 200 cases is therefore not evidence of improvement. When comparing two prompts on the <em>same</em> cases, use a paired test on per-case differences, which is far more sensitive.</p>
<h4>Building the set</h4>
<ul>
<li>Start with 50 to 100 real inputs, including past failures; grow it from production logs.</li>
<li>Prefer code checks (exact match, schema validity, tests pass). Use an LLM judge with a written rubric for open-ended quality, and check the judge against human labels.</li>
<li>Score each case 0 or 1 where possible; averages of fuzzy 1 to 10 scores hide regressions.</li>
<li>Run the suite in CI on every prompt, model or retrieval change.</li>
</ul>`,
    code: [{ lang: 'python', title: 'A minimal eval harness', src: R`
import json, math

def run_eval(cases, predict):
    results = []
    for case in cases:                                   # {"input": ..., "expected": ...}
        out = predict(case["input"])
        results.append({"id": case["id"], "pass": grade(out, case["expected"]), "out": out})
    p = sum(r["pass"] for r in results) / len(results)
    ci = 1.96 * math.sqrt(p * (1 - p) / len(results))
    print(f"accuracy {p:.1%} ± {ci:.1%} on {len(results)} cases")
    return results

def grade(out, expected):                                # code check first; a judge only when needed
    try:
        return json.loads(out)["total"] == expected["total"]
    except (ValueError, KeyError):
        return False` }],
    tools: [
      { n: 'promptfoo', d: 'Declarative prompt and model evals in YAML, with red-teaming, run in CI.', u: 'https://www.promptfoo.dev', tag: 'Open source' },
      { n: 'Inspect', d: "UK AI Security Institute's framework for rigorous LLM and agent evals.", u: 'https://inspect.aisi.org.uk', tag: 'Open source' },
      { n: 'OpenAI Evals', d: 'Framework and registry of evals.', u: 'https://github.com/openai/evals', tag: 'Open source' },
      { n: 'Braintrust', d: 'Eval datasets, experiments and scoring in one platform.', u: 'https://www.braintrust.dev', tag: 'Managed' },
      { n: 'DeepEval', d: 'Pytest-style unit tests for LLM outputs.', u: 'https://github.com/confident-ai/deepeval', tag: 'Open source' }
    ],
    refs: [
      { t: 'Adding Error Bars to Evals: A Statistical Approach to Language Model Evaluations', s: 'Miller, Anthropic, 2024', u: 'https://arxiv.org/abs/2411.00640' },
      { t: 'Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena', s: 'Zheng et al., NeurIPS 2023', u: 'https://arxiv.org/abs/2306.05685' },
      { t: 'Your AI Product Needs Evals', s: 'Hamel Husain, blog', u: 'https://hamel.dev/blog/posts/evals/' }
    ]
  },
  1: {
    title: 'Tracing with open standards',
    math: R`<p>OpenTelemetry defines <b>GenAI semantic conventions</b> so that any backend can read LLM spans: attributes such as <code>gen_ai.request.model</code>, <code>gen_ai.usage.input_tokens</code> and <code>gen_ai.usage.output_tokens</code>. Instrument once and send traces to whichever tool you prefer.</p>
<p>Useful derived numbers per trace: total latency, TTFT of the user-facing call, tokens and cost per span, number of tool calls, and retries.</p>`,
    code: [{ lang: 'python', title: 'A model call as an OpenTelemetry span', src: R`
# pip install opentelemetry-sdk
from opentelemetry import trace
tracer = trace.get_tracer("support-bot")

def traced_call(messages):
    with tracer.start_as_current_span("chat claude-sonnet-5-5") as span:
        span.set_attribute("gen_ai.operation.name", "chat")
        span.set_attribute("gen_ai.request.model", "claude-sonnet-5-5")
        resp = client.messages.create(model="claude-sonnet-5-5", max_tokens=800, messages=messages)
        span.set_attribute("gen_ai.usage.input_tokens", resp.usage.input_tokens)
        span.set_attribute("gen_ai.usage.output_tokens", resp.usage.output_tokens)
        return resp` }],
    tools: [
      { n: 'OpenTelemetry GenAI conventions', d: 'Vendor-neutral attributes for LLM, agent and tool spans.', u: 'https://opentelemetry.io/docs/specs/semconv/gen-ai/', tag: 'Standard' },
      { n: 'Langfuse', d: 'Open-source tracing, prompt management and evals.', u: 'https://langfuse.com', tag: 'Open source' },
      { n: 'Arize Phoenix', d: 'Open-source tracing and evaluation on OpenTelemetry.', u: 'https://github.com/Arize-ai/phoenix', tag: 'Open source' },
      { n: 'LangSmith', d: 'Tracing, datasets and evals from the LangChain team.', u: 'https://www.langchain.com/langsmith', tag: 'Managed' },
      { n: 'OpenLLMetry', d: 'OpenTelemetry auto-instrumentation for LLM SDKs and vector DBs.', u: 'https://github.com/traceloop/openllmetry', tag: 'Open source' }
    ]
  },
  3: {
    title: 'Guardrail tools and the cost model',
    math: R`<p>Cost per request, with prompt caching:</p>
\[ C = \frac{T_{\text{in}}\, p_{\text{in}} + T_{\text{cache read}}\, p_{\text{read}} + T_{\text{cache write}}\, p_{\text{write}} + T_{\text{out}}\, p_{\text{out}}}{10^{6}} \]
<p>with prices per million tokens. Output tokens typically cost several times input tokens, and cached reads a small fraction of input, so the levers in order of impact are usually: cache the stable prefix, cap and trim output, route easy traffic to smaller models, and move offline work to batch APIs, which are discounted.</p>`,
    tools: [
      { n: 'Llama Guard 4', d: 'Open safety classifier for prompts and responses.', u: 'https://huggingface.co/meta-llama/Llama-Guard-4-12B', tag: 'Open weights' },
      { n: 'NeMo Guardrails', d: 'Programmable input, output and dialogue rails.', u: 'https://github.com/NVIDIA/NeMo-Guardrails', tag: 'Open source' },
      { n: 'Guardrails AI', d: 'Validators for structure, PII, toxicity and more.', u: 'https://github.com/guardrails-ai/guardrails', tag: 'Open source' },
      { n: 'Microsoft Presidio', d: 'Detect and anonymise personal data in text.', u: 'https://github.com/microsoft/presidio', tag: 'Open source' },
      { n: 'Claude Message Batches', d: 'Discounted asynchronous processing for offline jobs.', u: CLAUDE_DOCS + '/build-with-claude/batch-processing', tag: 'API' },
      { n: 'OpenAI Batch API', d: 'Discounted asynchronous jobs with a 24-hour window.', u: 'https://platform.openai.com/docs/guides/batch', tag: 'API' }
    ],
    refs: [
      { t: 'OWASP Top 10 for LLM Applications', s: 'OWASP GenAI Security Project', u: 'https://genai.owasp.org/llm-top-10/' },
      { t: 'NIST AI Risk Management Framework', s: 'NIST', u: 'https://www.nist.gov/itl/ai-risk-management-framework' }
    ]
  },
  4: {
    title: 'Where to go next',
    math: R`<p>Each block of the system has a deep literature. These are reliable next steps, roughly in course order.</p>`,
    refs: [
      { t: 'Neural Networks: Zero to Hero', s: 'Andrej Karpathy, free video course building GPT from scratch', u: 'https://karpathy.ai/zero-to-hero.html' },
      { t: 'Hugging Face LLM Course', s: 'Free course on transformers, fine-tuning and tokenizers', u: 'https://huggingface.co/learn/llm-course' },
      { t: 'How to Scale Your Model', s: 'Google DeepMind, free book on training and serving at scale', u: 'https://jax-ml.github.io/scaling-book/' },
      { t: 'AI Engineering (O’Reilly, 2025)', s: 'Chip Huyen, book on building applications with foundation models', u: 'https://www.oreilly.com/library/view/ai-engineering/9781098166298/' },
      { t: 'Building effective agents', s: 'Anthropic engineering', u: 'https://www.anthropic.com/engineering/building-effective-agents' },
      { t: 'Prompt engineering overview', s: 'Claude Developer Platform', u: CLAUDE_DOCS + '/build-with-claude/prompt-engineering/overview' }
    ]
  }
};

/* attach to steps */
COURSE.units.forEach(u => u.lessons.forEach(l => {
  const d = DEEP[l.id]; if (!d) return;
  Object.keys(d).forEach(k => { const st = l.steps[+k]; if (st) st.deep = d[k]; else console.warn('deep: no step', l.id, k); });
}));
