/* ================= System explorer: drill-down views of the whole architecture =================
   The root view is the layered architecture diagram itself. Every block opens a detailed view, and nodes inside views open
   further views, so learners can go as deep as they like and always climb back with the breadcrumb.
   Node: N(id, x, y, title, subtitle, category, { w, h, shape, go, l (lesson id), d (description),
         how [steps], num (key figure), tl [tool names or {n,u}] })
   Edge: [from, to, label?, { dash, bend }]
   Flow: [{ n: [node ids], e: 'from>to' or null, t: title, d: text }] for the animated walkthrough. */
const SYS_CAT = {
  user: ['#7C8798', 'People and apps'], model: ['var(--model)', 'Model'], serve: ['var(--serve)', 'Serving'], gpu: ['#6B7686', 'Hardware'],
  ctx: ['var(--ctx)', 'Context'], know: ['var(--know)', 'Knowledge'], tool: ['var(--tool)', 'Tools'], agent: ['var(--harness)', 'Agents'],
  ship: ['var(--ship)', 'Production'], ext: ['#98A2B3', 'External systems']
};
function N(id, x, y, t, s, cat, o = {}) { return Object.assign({ id, x, y, w: 156, h: 60, t, s, cat }, o); }

const SYSV = {};

/* ---------- people, inputs and outputs ---------- */
SYSV.inputs = {
  title: 'Inputs and outputs', sub: 'Everything that talks to the system, and everything it sends back', from: 'client',
  lanes: [{ x: 20, y: 70, w: 220, h: 550, t: 'INPUTS', cat: 'user' }, { x: 760, y: 70, w: 220, h: 550, t: 'OUTPUTS', cat: 'user' }],
  nodes: [
    N('chat', 52, 100, 'Chat UI', 'typed messages', 'user', { l: 'two-boxes', d: 'The familiar case: a person types in a web or mobile app. The app, not the person, sends requests to the model.' }),
    N('voice', 52, 180, 'Voice', 'speech → text → speech', 'user', { d: 'Speech is transcribed by an ASR model (or handled natively by a speech-capable model), and replies can be spoken with text-to-speech. Latency budgets are tight: users notice pauses above roughly half a second.', tl: [{ n: 'Whisper', u: 'https://github.com/openai/whisper' }] }),
    N('files', 52, 260, 'Images and files', 'vision, PDFs, sheets', 'user', { l: 'retrieval', d: 'Multimodal models read images directly as image tokens. Documents are either sent as files the model can read or parsed into text first, which is also the first step of RAG ingestion.', tl: ['Docling'] }),
    N('api', 52, 340, 'API and SDKs', 'other programs', 'user', { l: 'serving', d: 'Most production traffic is code calling code: back-end services, batch jobs and integrations calling the same stateless API.' }),
    N('events', 52, 420, 'Events and schedules', 'webhooks, cron', 'user', { l: 'agent-loop', d: 'Agents increasingly start without a person: a new ticket, a failed build or a nightly schedule triggers a run, and results are posted somewhere a person will see them.' }),
    N('agents', 52, 500, 'Other agents', 'agent-to-agent calls', 'user', { l: 'multi-agent', d: 'An agent can be another agent\'s tool. Orchestrators delegate to sub-agents, and services expose agents behind APIs or MCP servers.' }),
    N('backend', 300, 190, 'Application back end', 'auth, sessions, history', 'ctx', { h: 70, l: 'context', d: 'Your own code. It authenticates the user, loads the conversation and user data, enforces product rules and decides what to send. This is where "memory" features actually live.', how: ['Authenticate the caller and apply quotas', 'Load the conversation and any stored memories', 'Hand everything to the harness, which builds the context'] }),
    N('harness', 300, 330, 'Harness', 'context + model + tools loop', 'agent', { h: 70, go: 'harness', l: 'agent-loop', d: 'The loop that assembles context, calls the model, runs tools and decides when the work is done.' }),
    N('model', 540, 260, 'Model API', 'tokens in, tokens out', 'serve', { h: 70, go: 'serving', l: 'serving', d: 'The serving layer and the model behind it. Stateless: it only knows what this request contains.' }),
    N('text', 792, 100, 'Streamed text', 'token by token', 'user', { l: 'next-token', d: 'Tokens are streamed as server-sent events so people start reading after the first token instead of waiting for the whole answer.' }),
    N('json', 792, 190, 'Structured data', 'JSON for programs', 'user', { l: 'steering', d: 'When the consumer is code, the output is constrained to a JSON schema so it always parses.' }),
    N('actions', 792, 280, 'Actions', 'tickets, emails, commits', 'tool', { go: 'tools', l: 'tools', d: 'Agents change the world through tools: writing files, sending messages, updating records. High-impact actions should pass approval gates.' }),
    N('speech', 792, 370, 'Speech', 'text-to-speech', 'user', { d: 'Voice products synthesise the streamed text into audio, often sentence by sentence to keep latency low.' }),
    N('ui', 792, 460, 'Generated UI', 'charts, forms, pages', 'user', { d: 'Models can emit components, charts or whole pages that the app renders, instead of plain text.' })
  ],
  edges: [['chat', 'backend', '', { h: 1 }], ['voice', 'backend', '', { h: 1 }], ['files', 'backend', '', { h: 1 }], ['api', 'backend', '', { h: 1 }], ['events', 'harness', '', { h: 1 }], ['agents', 'harness', '', { h: 1 }],
    ['backend', 'harness', 'request'], ['harness', 'model', 'context', { h: 1 }], ['model', 'harness', 'tokens', { h: 1, bend: 34 }],
    ['model', 'text', '', { h: 1 }], ['model', 'json', '', { h: 1 }], ['model', 'actions', '', { h: 1 }], ['model', 'speech', '', { h: 1 }], ['model', 'ui', '', { h: 1 }]],
  flow: [
    { n: ['chat'], t: 'Someone asks', d: 'A person types a question in the chat app.' },
    { n: ['backend'], e: 'chat>backend', t: 'Your back end', d: 'It checks who they are and loads the conversation so far.' },
    { n: ['harness'], e: 'backend>harness', t: 'The harness', d: 'It assembles the context: instructions, history, retrieved facts, tool definitions.' },
    { n: ['model'], e: 'harness>model', t: 'One model call', d: 'The context goes to the model API. Nothing else reaches the model.' },
    { n: ['harness'], e: 'model>harness', t: 'Tokens come back', d: 'Either an answer or a tool request. Tool requests loop back through the harness.' },
    { n: ['text'], e: 'model>text', t: 'Streamed to the person', d: 'The final answer streams back token by token.' }
  ]
};

/* ---------- the model ---------- */
SYSV.model = {
  title: 'Inside the model', sub: 'From text to one next token, one forward pass', from: 'model',
  lanes: [{ x: 20, y: 60, w: 960, h: 240, t: 'ONE FORWARD PASS', cat: 'model' }, { x: 20, y: 320, w: 960, h: 170, t: 'WHAT IT DEPENDS ON', cat: 'gpu' }],
  nodes: [
    N('text', 40, 110, 'Context text', 'all tokens of this request', 'ctx', { go: 'context', l: 'context', d: 'The assembled context: system prompt, history, retrieved text, tool traffic and the user message, rendered through the chat template.' }),
    N('tok', 220, 110, 'Tokenizer', 'text → token ids', 'model', { go: 'tokenizer', l: 'tokens', d: 'Splits text into subword tokens from a fixed vocabulary and maps each to an integer id.' }),
    N('emb', 400, 110, 'Embeddings', 'ids → vectors', 'model', { go: 'tokenizer', l: 'tokens', d: 'Each id selects one row of a learned matrix, giving one vector of a few thousand numbers per token.', num: 'd ≈ 2k–16k numbers per token' }),
    N('blocks', 580, 95, 'Transformer blocks', '× N layers (30–120)', 'model', { h: 90, go: 'block', l: 'attention', d: 'The same block repeated N times. Attention mixes information between tokens; the MLP transforms each token. Most parameters and compute live here.' }),
    N('head', 790, 110, 'Output head', 'logits → next token', 'model', { go: 'decode', l: 'next-token', d: 'Projects the last position\'s vector onto the vocabulary, turns scores into probabilities and samples one token.' }),
    N('loop', 790, 210, 'Append and repeat', 'autoregressive decoding', 'serve', { l: 'next-token', go: 'decode', d: 'The sampled token is appended to the context and the model runs again. One forward pass per output token.' }),
    N('weights', 40, 380, 'Weights', 'billions of learned numbers', 'model', { go: 'training', l: 'training', d: 'Every matrix in the embeddings, blocks and head. Learned once in training, then frozen and shared by all users.' }),
    N('rope', 290, 380, 'Positions (RoPE)', 'rotate q and k by position', 'model', { l: 'tokens', d: 'Attention alone ignores word order. Rotary position embeddings rotate queries and keys by an angle that depends on position, so attention sees relative distance.' }),
    N('kv', 540, 380, 'KV cache', 'keys and values of past tokens', 'gpu', { go: 'kv', l: 'kv-cache', d: 'Every layer stores the keys and values of tokens already processed, so each new token only computes its own.' }),
    N('gpu', 790, 380, 'GPU memory', 'HBM + tensor cores', 'gpu', { go: 'gpu', l: 'gpus', d: 'Weights and the KV cache live in high-bandwidth memory; matrix multiplies run on tensor cores.' })
  ],
  edges: [['text', 'tok'], ['tok', 'emb', 'ids'], ['emb', 'blocks', 'vectors'], ['blocks', 'head', 'last vector'], ['head', 'loop', 'token'], ['loop', 'text', 'append to the context', { dash: 1, ch: 288, ax: 868 }],
    ['weights', 'blocks', '', { dash: 1, v: 1 }], ['rope', 'blocks', '', { dash: 1, v: 1 }], ['kv', 'blocks', 'past K, V', { dash: 1, v: 1 }], ['gpu', 'blocks', '', { dash: 1, v: 1 }]],
  flow: [
    { n: ['text'], t: 'The context', d: 'Everything the model will see on this call, as one long string.' },
    { n: ['tok'], e: 'text>tok', t: 'Tokenize', d: 'Text becomes a sequence of integer ids.' },
    { n: ['emb'], e: 'tok>emb', t: 'Embed', d: 'Each id becomes a vector; positions are added by rotating queries and keys.' },
    { n: ['blocks', 'kv'], e: 'emb>blocks', t: 'N transformer blocks', d: 'Attention reads earlier tokens (cached in the KV cache), the MLP transforms each token, N times.' },
    { n: ['head'], e: 'blocks>head', t: 'Score the vocabulary', d: 'The last vector becomes one logit per vocabulary entry; softmax and the sampler pick one token.' },
    { n: ['loop'], e: 'head>loop', t: 'Append and repeat', d: 'The new token joins the context and the next forward pass begins.' },
    { n: ['text'], e: 'loop>text', t: 'Around again', d: 'One full pass per output token, until a stop condition.' }
  ]
};

/* ---------- tokenizer ---------- */
SYSV.tokenizer = {
  title: 'Tokenizer and embeddings', sub: 'How text becomes vectors, and how the tokenizer itself is trained', from: 'tok',
  lanes: [{ x: 20, y: 70, w: 960, h: 250, t: 'AT INFERENCE', cat: 'model' }, { x: 20, y: 350, w: 960, h: 260, t: 'TRAINING THE TOKENIZER (ONCE)', cat: 'know' }],
  nodes: [
    N('text', 40, 130, 'Raw text', 'Unicode string', 'ctx', { d: 'Any language, any script, plus special markers from the chat template.' }),
    N('norm', 220, 130, 'Normalizer', 'NFKC, whitespace', 'model', { d: 'Unicode normalisation so visually identical strings map to the same bytes. Some tokenizers also lowercase or strip accents; modern LLM tokenizers mostly do not.' }),
    N('pre', 400, 130, 'Pre-tokenizer', 'split into words / bytes', 'model', { d: 'Splits text into chunks that merges may not cross, typically by a regular expression over spaces, digits and punctuation, and maps to bytes for byte-level BPE.' }),
    N('bpe', 580, 130, 'BPE merges', 'merge table + vocab', 'model', { l: 'tokens', d: 'Applies the learned merges in priority order until no merge applies; each final piece is looked up in the vocabulary.', num: '|V| ≈ 32k–256k' }),
    N('ids', 760, 130, 'Token ids', 'integers', 'model', { d: 'A list of integers. The API bills per token, and the context window is measured in them.' }),
    N('special', 400, 230, 'Special tokens', '<|im_start|>, <eos>…', 'ctx', { l: 'context', d: 'Reserved ids for roles, end of turn, tool calls and padding. They come from the chat template and must not be typeable as ordinary text.' }),
    N('emb', 760, 230, 'Embedding lookup', 'E[id] → vector', 'model', { go: 'model', l: 'tokens', d: 'Row id of the embedding matrix E (|V| × d) becomes the token\'s starting vector in the residual stream.' }),
    N('corpus', 40, 420, 'Training corpus', 'representative text', 'know', { d: 'Text in the languages and domains you care about. Under-represented languages here end up split into many small tokens later.' }),
    N('trainer', 260, 420, 'Tokenizer trainer', 'SentencePiece / HF Tokenizers', 'know', { w: 180, l: 'tokens', d: 'Counts pairs and learns merges (BPE) or prunes a candidate vocabulary (unigram) until the target size is reached.', tl: ['SentencePiece', 'Hugging Face Tokenizers'] }),
    N('vocab', 500, 420, 'Vocabulary + merges', 'tokenizer.json / .model', 'know', { w: 180, d: 'The artefact shipped with the model. It can never change after pretraining without retraining embeddings.' }),
    N('fert', 740, 420, 'Fertility check', 'tokens per word', 'ship', { l: 'tokens', d: 'Measure tokens per word on held-out text in each language. High fertility multiplies cost and latency and shortens the effective context.', tl: ['tiktoken'] }),
    N('extend', 500, 520, 'Extend vocabulary', 'new tokens + continued pretraining', 'know', { w: 220, l: 'training', d: 'For a language the tokenizer serves badly, add tokens, initialise their embeddings and continue pretraining so the model learns them.' })
  ],
  edges: [['text', 'norm'], ['norm', 'pre'], ['pre', 'bpe'], ['bpe', 'ids'], ['special', 'bpe', '', { dash: 1 }], ['ids', 'emb'],
    ['corpus', 'trainer'], ['trainer', 'vocab'], ['vocab', 'fert'], ['vocab', 'bpe', 'used by', { dash: 1 }], ['vocab', 'extend', '', { dash: 1 }]],
  flow: [
    { n: ['text'], t: 'Text arrives', d: 'For example a Sorani sentence.' },
    { n: ['norm'], e: 'text>norm', t: 'Normalise', d: 'Unicode is normalised so equivalent characters match.' },
    { n: ['pre'], e: 'norm>pre', t: 'Pre-split', d: 'Split into word-like chunks and bytes.' },
    { n: ['bpe'], e: 'pre>bpe', t: 'Apply merges', d: 'Learned merges combine bytes into the longest known pieces.' },
    { n: ['ids'], e: 'bpe>ids', t: 'Ids', d: 'Each piece becomes an integer.' },
    { n: ['emb'], e: 'ids>emb', t: 'Vectors', d: 'Each id selects its learned vector.' }
  ]
};

/* ---------- one transformer block ---------- */
SYSV.block = {
  title: 'One transformer block', sub: 'Repeated N times; each sub-layer adds its result to the residual stream', from: 'tf',
  lanes: [{ x: 20, y: 70, w: 960, h: 240, t: 'ATTENTION SUB-LAYER: TOKENS READ EACH OTHER', cat: 'model' }, { x: 20, y: 340, w: 960, h: 270, t: 'MLP SUB-LAYER: EACH TOKEN ON ITS OWN', cat: 'model' }],
  nodes: [
    N('in', 40, 130, 'Residual stream in', 'one vector per token', 'model', { d: 'The running representation of every token. Each sub-layer reads it and adds a correction.' }),
    N('n1', 220, 130, 'RMSNorm', 'rescale each vector', 'model', { d: 'Normalises each vector to a stable scale before the sub-layer, which keeps very deep stacks trainable.' }),
    N('qkv', 400, 130, 'Q, K, V projections', 'three matrix multiplies', 'model', { l: 'attention', d: 'Three learned matrices produce a query, key and value per token and per head.' }),
    N('rope', 400, 230, 'RoPE', 'rotate q, k by position', 'model', { l: 'tokens', d: 'Encodes position by rotating query and key pairs; their dot product then depends on relative distance.' }),
    N('attn', 580, 130, 'Causal attention', 'softmax(QKᵀ/√d)·V', 'model', { l: 'attention', d: 'Each token scores every earlier token, softmaxes the scores and averages their values. The causal mask hides the future. Usually a fused FlashAttention kernel.', tl: ['FlashAttention', 'PyTorch SDPA'] }),
    N('kv', 580, 230, 'KV cache', 'append K, V; read the past', 'gpu', { go: 'kv', l: 'kv-cache', d: 'During decoding, past keys and values are read from the cache and the new token\'s are appended.' }),
    N('o', 760, 130, 'Output projection', 'mix the heads', 'model', { l: 'attention', d: 'Concatenates all heads and projects back to the model width.' }),
    N('add1', 760, 230, 'Add to residual', 'h + attention(h)', 'model', { d: 'The attention result is added onto the stream rather than replacing it.' }),
    N('n2', 40, 410, 'RMSNorm', 'rescale again', 'model', { d: 'The same normalisation again, so the MLP also receives vectors at a stable scale.' }),
    N('router', 220, 510, 'MoE router', 'optional: pick top-k experts', 'serve', { l: 'gpus', d: 'In mixture-of-experts models a router sends each token to a few of many expert MLPs, so compute per token stays small while total parameters grow.' }),
    N('gate', 220, 410, 'Gate and up', 'two projections', 'model', { l: 'attention', d: 'SwiGLU computes two projections of the token: one is passed through SiLU and used to gate the other.' }),
    N('act', 400, 410, 'SiLU ⊙ gate', 'elementwise', 'model', { d: 'A smooth nonlinearity multiplied elementwise. Without nonlinearities the whole stack would collapse into one linear map.' }),
    N('down', 580, 410, 'Down projection', 'back to model width', 'model', { d: 'Projects the wide hidden layer (often 3–4× the width) back down.' }),
    N('add2', 760, 410, 'Add to residual', 'h + MLP(h)', 'model', { d: 'The MLP result is added to the stream, which flows into the next block.' }),
    N('out', 760, 520, 'Residual stream out', 'to the next block', 'model', { d: 'After the last block, the final position\'s vector goes to the output head.', go: 'decode' })
  ],
  edges: [['in', 'n1'], ['n1', 'qkv'], ['qkv', 'attn', 'q, k, v'], ['rope', 'attn', '', { dash: 1 }], ['kv', 'attn', '', { dash: 1 }], ['attn', 'o'], ['o', 'add1'],
    ['in', 'add1', 'residual skip', { dash: 1, ch: 302, ax: 80, bx: 800 }], ['add1', 'n2', 'to the MLP', { ch: 326, ax: 878, bx: 118 }], ['n2', 'gate'], ['gate', 'act'], ['act', 'down'], ['down', 'add2'], ['router', 'gate', '', { dash: 1 }], ['add2', 'out'], ['n2', 'add2', 'residual skip', { dash: 1, ch: 492, ax: 80, bx: 800 }]],
  flow: [
    { n: ['in'], t: 'Vectors enter', d: 'One vector per token from the previous block.' },
    { n: ['qkv'], e: 'n1>qkv', t: 'Queries, keys, values', d: 'After normalising, each token produces q, k and v for every head.' },
    { n: ['attn', 'kv'], e: 'qkv>attn', t: 'Attend', d: 'Each token mixes in information from earlier tokens, weighted by relevance.' },
    { n: ['add1'], e: 'o>add1', t: 'Add back', d: 'The result is added to the residual stream.' },
    { n: ['gate', 'act', 'down'], e: 'n2>gate', t: 'MLP', d: 'Each token is transformed on its own through a wide gated layer.' },
    { n: ['out'], e: 'add2>out', t: 'On to the next block', d: 'The updated vectors flow into the next of N identical blocks.' }
  ]
};

/* ---------- output head and decoding ---------- */
SYSV.decode = {
  title: 'Output head and decoding', sub: 'From the last vector to one sampled token, then around again', from: 'head',
  lanes: [{ x: 20, y: 70, w: 960, h: 200, t: 'SCORE', cat: 'model' }, { x: 20, y: 300, w: 960, h: 310, t: 'SHAPE AND SAMPLE', cat: 'serve' }],
  nodes: [
    N('h', 40, 140, 'Last hidden state', 'final position only', 'model', { d: 'Only the last position is needed to predict the next token.' }),
    N('norm', 230, 140, 'Final RMSNorm', '', 'model', { d: 'One more normalisation before projecting.' }),
    N('lm', 420, 140, 'LM head', 'unembedding W_U', 'model', { l: 'next-token', d: 'A d × |V| matrix that produces one score per vocabulary entry. Often tied to the embedding matrix.' }),
    N('logits', 610, 140, 'Logits', 'one score per token', 'model', { l: 'next-token', d: 'Raw, unnormalised scores. Everything after this point is decoding policy, not the model.', num: '|V| scores' }),
    N('pen', 800, 140, 'Penalties', 'repetition, presence, bias', 'serve', { l: 'next-token', d: 'Optional adjustments: lower the scores of tokens already used, or bias specific tokens up or down.' }),
    N('mask', 800, 360, 'Grammar mask', 'constrained decoding', 'ctx', { l: 'steering', d: 'If a JSON schema or grammar is active, tokens that would break it get −∞, so the output always parses.', tl: ['XGrammar', 'llguidance', 'Outlines'] }),
    N('temp', 610, 360, 'Temperature', 'divide logits by T', 'serve', { l: 'next-token', d: 'Low T sharpens the distribution, high T flattens it; T = 0 means greedy argmax.' }),
    N('trunc', 420, 360, 'Top-k / top-p / min-p', 'cut the unlikely tail', 'serve', { w: 170, l: 'next-token', d: 'Keeps only the most plausible tokens before sampling, so a long tail of unlikely tokens cannot derail the answer.' }),
    N('sample', 230, 360, 'Sample', 'draw one token id', 'serve', { l: 'next-token', d: 'Softmax turns the surviving scores into probabilities and one id is drawn (or the argmax is taken).' }),
    N('stop', 40, 360, 'Stop check', 'EOS, stop strings, max_tokens', 'serve', { l: 'next-token', d: 'Generation ends at the end-of-sequence token, a stop sequence, or the max_tokens cap.' }),
    N('detok', 40, 500, 'Detokenize and stream', 'id → text → SSE', 'serve', { w: 180, go: 'serving', l: 'serving', d: 'Ids become text and are streamed to the client as server-sent events.' }),
    N('append', 420, 500, 'Append token', 'next forward pass', 'model', { w: 170, go: 'model', l: 'next-token', d: 'If not stopped, the token is appended and the model runs again: autoregressive decoding.' }),
    N('spec', 680, 500, 'Speculative decoding', 'draft k, verify in one pass', 'serve', { w: 190, l: 'serving', d: 'A small draft model proposes several tokens and the large model verifies them together, keeping the same output distribution while taking fewer slow steps.' })
  ],
  edges: [['h', 'norm'], ['norm', 'lm'], ['lm', 'logits'], ['logits', 'pen'], ['pen', 'mask'], ['mask', 'temp'], ['temp', 'trunc'], ['trunc', 'sample'], ['sample', 'stop'],
    ['stop', 'detok', 'emit'], ['sample', 'append', '', { dash: 1 }], ['spec', 'append', '', { dash: 1 }]],
  flow: [
    { n: ['lm', 'logits'], e: 'norm>lm', t: 'Score every token', d: 'The last vector is projected onto the whole vocabulary.' },
    { n: ['pen', 'mask'], e: 'logits>pen', t: 'Adjust and constrain', d: 'Penalties and a grammar mask reshape the scores.' },
    { n: ['temp', 'trunc'], e: 'mask>temp', t: 'Temperature and filters', d: 'Temperature reshapes the distribution; top-p or min-p cut the tail.' },
    { n: ['sample'], e: 'trunc>sample', t: 'Sample', d: 'One token is drawn.' },
    { n: ['stop', 'detok'], e: 'stop>detok', t: 'Stream or stop', d: 'The token is streamed; generation stops at EOS, a stop string or the cap.' },
    { n: ['append'], e: 'sample>append', t: 'Around again', d: 'Otherwise the token is appended and the next pass begins.' }
  ]
};

/* ---------- training ---------- */
SYSV.training = {
  title: 'Where the weights come from', sub: 'The training pipeline, from raw text to a released model', from: 'weights',
  lanes: [{ x: 20, y: 70, w: 960, h: 190, t: 'PRETRAINING', cat: 'model' }, { x: 20, y: 290, w: 960, h: 170, t: 'POST-TRAINING', cat: 'agent' }, { x: 20, y: 490, w: 960, h: 130, t: 'ADAPT AND SHIP', cat: 'ship' }],
  nodes: [
    N('data', 40, 130, 'Data sources', 'web, code, books, synthetic', 'know', { w: 170, l: 'training', d: 'Trillions of tokens. Quality and mixture matter as much as quantity.' }),
    N('clean', 240, 130, 'Filter and dedupe', 'quality, safety, PII', 'know', { l: 'training', d: 'Removes duplicates, spam and unsafe or private content, and balances languages and domains.' }),
    N('tok', 430, 130, 'Tokenize', 'with the fixed tokenizer', 'model', { go: 'tokenizer', l: 'tokens', d: 'The tokenizer is trained first and frozen; all data is converted to ids.' }),
    N('pre', 620, 120, 'Pretraining', 'next-token loss, C ≈ 6ND', 'model', { h: 80, l: 'training', d: 'Thousands of GPUs minimise cross-entropy on next-token prediction for weeks or months.', num: '≈ 6 × params × tokens FLOPs', tl: ['Megatron-LM', 'PyTorch FSDP', 'DeepSpeed'] }),
    N('base', 810, 130, 'Base model', 'a superb autocomplete', 'model', { w: 150, l: 'training', d: 'Knows a great deal but does not follow instructions or hold a conversation reliably.' }),
    N('sft', 810, 340, 'SFT', 'chat template, masked loss', 'agent', { l: 'training', d: 'Supervised fine-tuning on curated conversations teaches the assistant format and habits.', tl: ['TRL'] }),
    N('pref', 610, 340, 'Preference tuning', 'RLHF / DPO', 'agent', { l: 'training', d: 'Optimises toward answers people prefer, using a reward model or direct preference pairs.', tl: ['TRL', 'OpenRLHF'] }),
    N('rl', 410, 340, 'RL with verifiable rewards', 'tests, maths, GRPO', 'agent', { w: 180, l: 'training', d: 'Rewards answers a program can check. This is how reasoning models learn to think at length.' }),
    N('safety', 210, 340, 'Safety training', 'refusals, policies', 'agent', { d: 'Teaches the model to decline harmful requests and follow policies, then is checked by red-teaming.' }),
    N('evals', 40, 340, 'Evals and red-teaming', 'before release', 'ship', { w: 150, go: 'ops', l: 'production', d: 'Capability benchmarks, safety tests and human review gate the release.' }),
    N('lora', 40, 530, 'LoRA adapters', 'your task or language', 'agent', { l: 'training', d: 'Small trainable matrices added to frozen weights; cheap to train and hot-swappable at serving time.', tl: ['PEFT', 'Unsloth', 'Axolotl'] }),
    N('distil', 240, 530, 'Distillation', 'big teacher → small student', 'agent', { d: 'A small model is trained on a large model\'s outputs to get most of the quality at a fraction of the cost.' }),
    N('quant', 440, 530, 'Quantization', 'FP8, INT4 for serving', 'gpu', { go: 'gpu', l: 'gpus', d: 'Stores weights in fewer bits so they need less memory and decode faster.', tl: ['LLM Compressor', 'bitsandbytes'] }),
    N('release', 640, 530, 'Release', 'weights or API', 'serve', { go: 'serving', l: 'serving', d: 'Published as open weights or served behind an API.' })
  ],
  edges: [['data', 'clean'], ['clean', 'tok'], ['tok', 'pre'], ['pre', 'base'], ['base', 'sft'], ['sft', 'pref'], ['pref', 'rl'], ['rl', 'safety'], ['safety', 'evals'],
    ['evals', 'lora', '', { dash: 1 }], ['lora', 'distil', '', { dash: 1 }], ['distil', 'quant', '', { dash: 1 }], ['quant', 'release']],
  flow: [
    { n: ['data', 'clean'], e: 'data>clean', t: 'Collect and clean', d: 'Trillions of tokens are filtered, deduplicated and balanced.' },
    { n: ['pre'], e: 'tok>pre', t: 'Pretrain', d: 'Next-token prediction at enormous scale produces a base model.' },
    { n: ['sft'], e: 'base>sft', t: 'Teach the format', d: 'Supervised fine-tuning on conversations makes it an assistant.' },
    { n: ['pref', 'rl'], e: 'sft>pref', t: 'Sharpen', d: 'Preference tuning and RL on checkable tasks improve helpfulness and reasoning.' },
    { n: ['evals'], e: 'safety>evals', t: 'Evaluate', d: 'Benchmarks and red-teaming decide whether it ships.' },
    { n: ['release'], e: 'quant>release', t: 'Ship', d: 'Quantized, adapted and served.' }
  ]
};

/* ---------- GPUs ---------- */
SYSV.gpu = {
  title: 'GPUs and memory', sub: 'Where the weights live and why bandwidth sets the speed', from: 'gpu',
  lanes: [{ x: 20, y: 70, w: 600, h: 340, t: 'ONE GPU', cat: 'gpu' }, { x: 640, y: 70, w: 340, h: 340, t: 'ONE SERVER', cat: 'gpu' }, { x: 20, y: 430, w: 960, h: 190, t: 'SPLITTING A MODEL', cat: 'serve' }],
  nodes: [
    N('hbm', 40, 120, 'HBM', '80–192 GB, 3–8 TB/s', 'gpu', { w: 170, h: 70, l: 'gpus', d: 'High-bandwidth memory stacked beside the chip. Everything the model needs must fit here, and every decoded token streams the active weights through it.', num: 'decode tok/s ≲ bandwidth ÷ bytes' }),
    N('w', 240, 110, 'Weights', 'params × bytes each', 'model', { h: 50, go: 'training', l: 'gpus', d: 'A 70B model needs 140 GB in BF16, 70 GB in FP8, about 38 GB in INT4.' }),
    N('kv', 240, 175, 'KV cache', 'grows with tokens × users', 'gpu', { h: 50, go: 'kv', l: 'kv-cache', d: 'Whatever memory the weights leave free becomes cache, which caps context length and concurrency.' }),
    N('act', 240, 240, 'Activations', 'temporary buffers', 'gpu', { h: 50, d: 'Intermediate results of the current forward pass.' }),
    N('tc', 430, 120, 'Tensor cores', 'matrix multiply units', 'gpu', { h: 70, l: 'gpus', d: 'Specialised units for low-precision matrix maths (BF16, FP8, FP4). Prefill keeps them busy; small-batch decode leaves them waiting on memory.' }),
    N('sram', 430, 240, 'On-chip SRAM', 'tiny but very fast', 'gpu', { d: 'Kernels like FlashAttention tile work into SRAM to avoid round trips to HBM.' }),
    N('quant', 40, 300, 'Precision', 'BF16 · FP8 · INT4', 'gpu', { l: 'gpus', d: 'Fewer bits per weight means less memory and fewer bytes read per token, at a small quality cost.', tl: ['bitsandbytes', 'LLM Compressor', 'llama.cpp GGUF'] }),
    N('nvlink', 660, 120, 'NVLink switch', 'GPU ↔ GPU in a server', 'gpu', { w: 160, l: 'gpus', d: 'Very fast links between GPUs in one server, needed for tensor parallelism.' }),
    N('cpu', 660, 220, 'CPU and host RAM', 'offload, scheduling', 'gpu', { w: 160, d: 'Runs the serving process and can hold offloaded KV cache or weights at lower speed.' }),
    N('nic', 660, 320, 'Network', 'InfiniBand / Ethernet', 'gpu', { w: 160, d: 'Connects servers for pipeline parallelism, disaggregated serving and training.' }),
    N('tp', 40, 490, 'Tensor parallel', 'slice each matrix', 'serve', { l: 'gpus', d: 'Each layer\'s matrices are split across GPUs in one server; results are combined after every layer.' }),
    N('pp', 230, 490, 'Pipeline parallel', 'layers in stages', 'serve', { l: 'gpus', d: 'Different layers live on different GPUs or servers; activations flow stage to stage.' }),
    N('ep', 420, 490, 'Expert parallel', 'MoE experts spread out', 'serve', { l: 'gpus', d: 'In mixture-of-experts models, experts sit on different GPUs and tokens are routed to them.' }),
    N('dp', 610, 490, 'Replicas', 'copies for throughput', 'serve', { go: 'serving', l: 'serving', d: 'Whole copies of the model behind a load balancer. Simple and scales throughput linearly.' }),
    N('tools', 800, 490, 'Serving engines', 'vLLM, SGLang, TRT-LLM', 'serve', { w: 160, go: 'serving', d: 'Engines expose these strategies as flags such as --tensor-parallel-size.', tl: ['vLLM', 'SGLang', 'TensorRT-LLM'] })
  ],
  edges: [['w', 'hbm', '', { dash: 1 }], ['kv', 'hbm', '', { dash: 1 }], ['act', 'hbm', '', { dash: 1 }], ['hbm', 'tc', 'bytes per token'], ['tc', 'sram', '', { dash: 1 }], ['quant', 'hbm', 'fewer bytes', { dash: 1 }],
    ['tc', 'nvlink'], ['nvlink', 'cpu', '', { dash: 1 }], ['cpu', 'nic', '', { dash: 1 }], ['tp', 'pp', '', { dash: 1 }], ['pp', 'ep', '', { dash: 1 }], ['ep', 'dp', '', { dash: 1 }], ['dp', 'tools', '', { dash: 1 }]],
  flow: [
    { n: ['w', 'kv'], t: 'Fill the memory', d: 'Weights load first; free memory becomes KV cache.' },
    { n: ['hbm'], e: 'w>hbm', t: 'Everything sits in HBM', d: 'High-bandwidth memory beside the chip.' },
    { n: ['tc'], e: 'hbm>tc', t: 'Stream to the cores', d: 'Each decoded token reads every active weight once, so bandwidth sets the speed.' },
    { n: ['nvlink'], e: 'tc>nvlink', t: 'Across GPUs', d: 'Large models split across GPUs exchange results over NVLink after every layer.' }
  ]
};

/* ---------- KV cache manager ---------- */
SYSV.kv = {
  title: 'KV cache manager', sub: 'Paged blocks, prefix reuse and offloading', from: 'kv',
  lanes: [{ x: 20, y: 70, w: 960, h: 230, t: 'PER STEP', cat: 'gpu' }, { x: 20, y: 330, w: 960, h: 290, t: 'MAKING ROOM', cat: 'serve' }],
  nodes: [
    N('new', 40, 140, 'New token', 'computes its q, k, v', 'model', { go: 'block', l: 'kv-cache', d: 'Only the newest token is computed during decode.' }),
    N('alloc', 230, 140, 'Block allocator', 'pages of 16 tokens', 'gpu', { l: 'kv-cache', d: 'Memory is handed out in fixed-size blocks, like virtual-memory pages, so there is no fragmentation from unknown output lengths.', tl: ['vLLM PagedAttention'] }),
    N('table', 420, 140, 'Block table', 'per sequence', 'gpu', { l: 'kv-cache', d: 'Maps a sequence\'s logical positions to physical blocks, which need not be contiguous.' }),
    N('pool', 610, 120, 'GPU KV pool', 'free HBM after weights', 'gpu', { h: 80, go: 'gpu', l: 'kv-cache', d: 'All sequences share this pool. Its size caps how many tokens can be in flight.', num: 'bytes/token = 2·L·H_kv·d_h·b' }),
    N('kernel', 800, 140, 'Paged attention', 'reads blocks', 'model', { w: 150, l: 'kv-cache', d: 'The attention kernel gathers keys and values from the blocks listed in the table.' }),
    N('prefix', 40, 400, 'Prefix cache', 'hash or radix tree', 'serve', { l: 'kv-cache', d: 'Blocks for identical prefixes (system prompt, tools, documents) are shared across requests, skipping their prefill. Providers sell this as prompt caching.', tl: ['SGLang RadixAttention', 'Claude prompt caching'] }),
    N('gqa', 230, 400, 'GQA / MLA', 'fewer KV heads', 'model', { l: 'kv-cache', d: 'Architectural savings: grouped-query attention shares KV heads; multi-head latent attention caches a compressed latent.' }),
    N('fp8', 420, 400, 'FP8 cache', 'half the bytes', 'gpu', { l: 'kv-cache', d: 'Store keys and values at lower precision to double capacity.' }),
    N('evict', 610, 400, 'Eviction', 'LRU of unused blocks', 'serve', { d: 'When memory is full, cached prefixes that are not in use are dropped first; running sequences may be preempted.' }),
    N('offload', 800, 400, 'Offload tier', 'CPU RAM, SSD, remote', 'gpu', { w: 150, d: 'Blocks can spill to slower tiers and be reloaded instead of recomputed.', tl: ['LMCache'] }),
    N('xfer', 420, 520, 'KV transfer', 'prefill node → decode node', 'serve', { w: 180, go: 'serving', l: 'serving', d: 'In disaggregated serving, prefill workers ship the cache to decode workers over fast links.' })
  ],
  edges: [['new', 'alloc', 'K, V'], ['alloc', 'table'], ['table', 'pool'], ['pool', 'kernel'], ['prefix', 'table', 'shared blocks', { dash: 1 }], ['gqa', 'alloc', '', { dash: 1 }],
    ['fp8', 'pool', '', { dash: 1 }], ['evict', 'pool', '', { dash: 1 }], ['offload', 'pool', '', { dash: 1 }], ['xfer', 'pool', '', { dash: 1 }]],
  flow: [
    { n: ['new'], t: 'A new token', d: 'It computes its own key and value in every layer.' },
    { n: ['alloc', 'table'], e: 'new>alloc', t: 'Find a slot', d: 'The allocator gives it space in a block and the table records where.' },
    { n: ['pool'], e: 'table>pool', t: 'Stored in the pool', d: 'Shared GPU memory holds every sequence\'s blocks.' },
    { n: ['kernel'], e: 'pool>kernel', t: 'Read back', d: 'The next step\'s attention gathers all past keys and values from the blocks.' },
    { n: ['prefix'], e: 'prefix>table', t: 'Reuse prefixes', d: 'Identical prefixes share blocks, so their prefill is skipped.' }
  ]
};

/* ---------- serving layer ---------- */
SYSV.serving = {
  title: 'Serving layer', sub: 'How one request becomes streamed tokens on shared GPUs', from: 'gateway',
  lanes: [{ x: 20, y: 60, w: 960, h: 270, t: 'REQUEST PATH', cat: 'serve' }, { x: 20, y: 350, w: 960, h: 140, t: 'SUPPORTING SERVICES', cat: 'serve' }, { x: 20, y: 510, w: 960, h: 115, t: 'HARDWARE', cat: 'gpu' }],
  nodes: [
    N('client', 40, 100, 'Client', 'your app or harness', 'user', { go: 'inputs', l: 'serving', d: 'Sends the full message list over HTTPS; the API is stateless.' }),
    N('gw', 225, 100, 'API gateway', 'auth, quotas, rate limits', 'serve', { l: 'serving', d: 'Checks the key, enforces quotas and rate limits, and validates the request.', tl: ['LiteLLM'] }),
    N('router', 410, 100, 'Router', 'model, replica, adapter', 'serve', { l: 'serving', d: 'Picks a model and a replica, often preferring one that already holds this prompt\'s prefix in cache, and attaches LoRA adapters.' }),
    N('sched', 595, 100, 'Scheduler', 'queue + continuous batching', 'serve', { l: 'serving', d: 'Admits requests into the running batch at every decode step, subject to KV-cache memory.', tl: ['vLLM', 'SGLang'] }),
    N('prefill', 780, 100, 'Prefill', 'whole prompt in parallel', 'serve', { l: 'serving', d: 'Processes all prompt tokens in one compute-bound pass and fills the KV cache. Dominates time to first token.' }),
    N('decode', 780, 225, 'Decode', 'one token per step', 'serve', { go: 'decode', l: 'serving', d: 'Memory-bound steps, one per output token, batched across many users. Sets the streaming speed (TPOT).' }),
    N('sampler', 595, 225, 'Sampler', 'temperature, top-p, grammar', 'serve', { go: 'decode', l: 'next-token', d: 'Turns logits into a chosen token, applying sampling settings and any output schema.' }),
    N('detok', 410, 225, 'Detokenizer', 'ids → text', 'serve', { d: 'Converts ids back to text, handling multi-byte characters that span tokens.' }),
    N('stream', 225, 225, 'Stream (SSE)', 'deltas to the client', 'serve', { l: 'serving', d: 'Server-sent events deliver text as it is produced.' }),
    N('metrics', 40, 395, 'Metrics', 'TTFT, TPOT, throughput', 'ship', { go: 'ops', l: 'serving', d: 'Time to first token, time per output token, queue depth, cache hit rate and cost.', tl: ['GuideLLM'] }),
    N('scale', 225, 395, 'Autoscaler', 'replicas follow load', 'serve', { d: 'Adds or removes replicas based on queue depth and latency targets.', tl: ['KServe'] }),
    N('pcache', 410, 395, 'Prompt cache', 'reuse stable prefixes', 'serve', { go: 'kv', l: 'kv-cache', d: 'Requests that start with the same tokens skip that prefill; billed cheaper by providers.' }),
    N('spec', 595, 395, 'Speculative decoding', 'draft and verify', 'serve', { w: 170, go: 'decode', l: 'serving', d: 'A small model drafts several tokens and the big one verifies them in a single pass.' }),
    N('kvm', 790, 395, 'KV cache manager', 'paged blocks', 'gpu', { w: 160, go: 'kv', l: 'kv-cache', d: 'Allocates, shares and evicts cache blocks for every running sequence.' }),
    N('gpus', 225, 545, 'GPU pool', 'weights + KV cache in HBM', 'gpu', { w: 560, h: 58, go: 'gpu', l: 'gpus', d: 'The hardware every worker runs on. Its memory bandwidth sets decode speed and its memory size sets concurrency.' }),
    N('weights', 40, 545, 'Model weights', 'loaded at start', 'model', { go: 'model', l: 'training', d: 'Loaded into HBM once per replica; often quantized to fit and run faster.' })
  ],
  edges: [['client', 'gw', 'HTTPS'], ['gw', 'router'], ['router', 'sched'], ['sched', 'prefill', 'batch'], ['prefill', 'decode', 'KV cache'], ['decode', 'sampler', 'logits'],
    ['sampler', 'detok', 'ids'], ['detok', 'stream', 'text'], ['stream', 'client', 'SSE'], ['decode', 'kvm', '', { dash: 1 }], ['spec', 'decode', 'drafts', { dash: 1 }],
    ['pcache', 'router', 'prefix hit', { dash: 1 }], ['stream', 'metrics', '', { dash: 1 }], ['scale', 'gpus', '', { dash: 1 }], ['kvm', 'gpus', '', { dash: 1 }], ['weights', 'gpus', 'load', { dash: 1 }]],
  flow: [
    { n: ['client'], t: 'A request arrives', d: 'The whole conversation in one HTTPS call.' },
    { n: ['gw'], e: 'client>gw', t: 'Gateway', d: 'Key, quota and rate limits are checked.' },
    { n: ['router'], e: 'gw>router', t: 'Route', d: 'A replica is chosen, ideally one that already caches this prefix.' },
    { n: ['sched'], e: 'router>sched', t: 'Queue and batch', d: 'The scheduler slots the request into the running batch.' },
    { n: ['prefill'], e: 'sched>prefill', t: 'Prefill', d: 'The prompt is processed in one parallel pass; this sets time to first token.' },
    { n: ['decode', 'kvm'], e: 'prefill>decode', t: 'Decode', d: 'One token per step, batched with other users, reading the KV cache.' },
    { n: ['sampler'], e: 'decode>sampler', t: 'Sample', d: 'Temperature, filters and any schema pick each token.' },
    { n: ['stream'], e: 'detok>stream', t: 'Stream', d: 'Text deltas flow back as server-sent events.' },
    { n: ['client'], e: 'stream>client', t: 'Delivered', d: 'The client renders tokens as they arrive.' }
  ]
};

/* ---------- context assembly ---------- */
SYSV.context = {
  title: 'Context assembly', sub: 'Everything the model will see on this call, built fresh every time', from: 'context',
  lanes: [{ x: 20, y: 60, w: 300, h: 565, t: 'INGREDIENTS (STABLE FIRST)', cat: 'ctx' }, { x: 340, y: 60, w: 640, h: 565, t: 'BUILD AND CHECK', cat: 'ctx' }],
  nodes: [
    N('sys', 50, 95, 'System prompt', 'role, rules, format', 'ctx', { w: 240, h: 54, l: 'context', d: 'Standing instructions. Stable, so it goes first where prompt caching can reuse it.' }),
    N('tools', 50, 160, 'Tool definitions', 'names, descriptions, schemas', 'tool', { w: 240, h: 54, go: 'tools', l: 'tools', d: 'What the model may call. Also stable, so it belongs in the cached prefix.' }),
    N('examples', 50, 225, 'Examples', 'few-shot pairs', 'ctx', { w: 240, h: 54, l: 'steering', d: 'Input and output pairs that show the format and the tricky cases.' }),
    N('docs', 50, 290, 'Retrieved chunks', 'top-k with sources', 'know', { w: 240, h: 54, go: 'rag', l: 'retrieval', d: 'Passages found for this question, with source labels so answers can cite them.' }),
    N('mem', 50, 355, 'Memory', 'notes and user facts', 'agent', { w: 240, h: 54, go: 'memory', l: 'context-eng', d: 'Facts that outlive one conversation, loaded only when relevant.' }),
    N('hist', 50, 420, 'Conversation history', 'compacted when long', 'ctx', { w: 240, h: 54, l: 'context', d: 'Earlier turns and tool traffic. Old tool results are cleared and long histories summarised.' }),
    N('user', 50, 485, 'User message', 'text, images, files', 'user', { w: 240, h: 54, go: 'inputs', l: 'context', d: 'The newest turn, possibly multimodal. Changes every request, so it goes last.' }),
    N('schema', 50, 550, 'Output schema', 'JSON schema or grammar', 'ctx', { w: 240, h: 54, go: 'decode', l: 'steering', d: 'Not text in the prompt but a constraint applied at decoding time.' }),
    N('order', 400, 280, 'Order and budget', 'stable first, volatile last', 'ctx', { w: 200, h: 70, l: 'kv-cache', d: 'Places stable content first so the cached prefix is as long as possible, and drops or trims items to fit the budget.', how: ['System prompt and tools first', 'Examples and long documents next', 'History, then the new message last'] }),
    N('count', 400, 120, 'Count tokens', 'fits the window?', 'ctx', { w: 200, l: 'context', d: 'Measures the assembled context against the window minus the reserved output budget.', tl: ['Claude token counting', 'tiktoken'] }),
    N('compact', 400, 450, 'Compact', 'clear, summarise, drop', 'agent', { w: 200, go: 'memory', l: 'context-eng', d: 'If it does not fit, or is mostly stale, older material is cleared or summarised.' }),
    N('tmpl', 680, 120, 'Chat template', 'roles → special tokens', 'model', { w: 200, go: 'tokenizer', l: 'context', d: 'Renders the message list into one string with role markers the model was trained on.', tl: ['Transformers chat templates'] }),
    N('cachept', 680, 230, 'Cache breakpoint', 'mark the stable prefix', 'serve', { w: 200, go: 'kv', l: 'kv-cache', d: 'Marks where the reusable prefix ends so later requests can skip its prefill.', tl: ['Claude prompt caching'] }),
    N('guard', 680, 340, 'Input guardrails', 'label untrusted content', 'ship', { w: 200, go: 'ops', l: 'production', d: 'Untrusted content is labelled or filtered before it reaches the model.' }),
    N('call', 680, 470, 'Model call', 'the whole context, once', 'serve', { w: 200, h: 70, go: 'serving', l: 'two-boxes', d: 'One stateless request. The model sees exactly this, and nothing else.' })
  ],
  edges: [['sys', 'order', '', { h: 1 }], ['tools', 'order', '', { h: 1 }], ['examples', 'order', '', { h: 1 }], ['docs', 'order', '', { h: 1 }], ['mem', 'order', '', { h: 1 }], ['hist', 'order', '', { h: 1 }], ['user', 'order', '', { h: 1 }],
    ['order', 'count', 'measure'], ['order', 'compact', 'too big?', { dash: 1 }], ['count', 'tmpl', 'fits'], ['tmpl', 'cachept'], ['cachept', 'guard'], ['guard', 'call'], ['schema', 'call', 'decoding constraint', { dash: 1, ch: 612, bx: 780 }]],
  flow: [
    { n: ['sys', 'tools', 'examples'], t: 'Stable ingredients', d: 'Instructions, tool definitions and examples rarely change.' },
    { n: ['docs', 'mem', 'hist', 'user'], t: 'Per-request ingredients', d: 'Retrieved chunks, memory, history and the new message change every time.' },
    { n: ['order'], e: 'sys>order', t: 'Order and budget', d: 'Stable first, volatile last, trimmed to fit; stale material is compacted.' },
    { n: ['count'], e: 'order>count', t: 'Does it fit?', d: 'Count tokens against the window minus the output budget.' },
    { n: ['tmpl'], e: 'count>tmpl', t: 'Render the template', d: 'Messages become one token sequence with role markers.' },
    { n: ['cachept', 'guard'], e: 'tmpl>cachept', t: 'Cache and guard', d: 'The stable prefix is marked for caching and untrusted input is labelled.' },
    { n: ['call'], e: 'guard>call', t: 'One call', d: 'The finished context goes to the model.' }
  ]
};

/* ---------- RAG ---------- */
SYSV.rag = {
  title: 'Retrieval-augmented generation', sub: 'Indexing ahead of time, retrieving on every question', from: 'know',
  lanes: [{ x: 20, y: 60, w: 960, h: 250, t: 'INGESTION (OFFLINE)', cat: 'know' }, { x: 20, y: 330, w: 960, h: 295, t: 'QUERY PATH (EVERY QUESTION)', cat: 'know' }],
  nodes: [
    N('src', 40, 100, 'Sources', 'PDFs, web, DB, tickets', 'ext', { l: 'knowledge', d: 'Everything the assistant should know that is too large, private or fresh for the weights.' }),
    N('parse', 225, 100, 'Parse and clean', 'layout-aware extraction', 'know', { l: 'retrieval', d: 'Most RAG failures start with bad text extraction: lost tables, merged columns, headers in the body.', tl: ['Docling', 'Unstructured'] }),
    N('chunk', 410, 100, 'Chunk', 'structure-aware, overlap', 'know', { l: 'retrieval', d: 'Split on headings and paragraphs first, with 10–20% overlap; keep metadata on every chunk.', tl: ['LangChain text splitters', 'Chonkie'] }),
    N('ctxz', 595, 100, 'Contextualize', 'prefix doc summary', 'know', { l: 'advanced-rag', d: 'Prepend a short description of the source document so isolated chunks keep their meaning.' }),
    N('embed', 780, 100, 'Embed', 'embedding model', 'know', { l: 'retrieval', d: 'Each chunk becomes a vector. Choose the model by measured recall on your languages.', tl: ['Sentence Transformers'] }),
    N('vec', 780, 215, 'Vector index', 'HNSW / IVF', 'know', { shape: 'db', l: 'retrieval', d: 'Approximate nearest-neighbour index over chunk vectors.', tl: ['pgvector', 'Qdrant', 'Weaviate', 'Milvus', 'Pinecone', 'FAISS'] }),
    N('bm25', 595, 215, 'Keyword index', 'BM25', 'know', { shape: 'db', l: 'retrieval', d: 'Inverted index for exact terms: product codes, names, error ids.', tl: ['Elasticsearch / OpenSearch', 'bm25s'] }),
    N('meta', 410, 215, 'Metadata and ACL', 'filters, permissions', 'know', { shape: 'db', l: 'advanced-rag', d: 'Language, date, product and access rights. Filtering by permissions here is your access control.' }),
    N('q', 40, 380, 'Question', 'from the user', 'user', { l: 'retrieval', d: 'Often a follow-up that makes no sense on its own.' }),
    N('rewrite', 225, 380, 'Rewrite', 'standalone, HyDE, multi', 'know', { l: 'advanced-rag', d: 'A small model rewrites the turn into a standalone query, or several, or a hypothetical answer.' }),
    N('hybrid', 410, 380, 'Hybrid search', 'vectors + BM25 + filters', 'know', { l: 'retrieval', d: 'Runs dense and keyword search with metadata filters, retrieving 50–200 candidates.' }),
    N('fuse', 595, 380, 'Fuse (RRF)', 'merge rankings', 'know', { l: 'retrieval', d: 'Reciprocal Rank Fusion combines rankings without comparing incompatible scores.' }),
    N('rerank', 780, 380, 'Rerank', 'cross-encoder', 'know', { l: 'advanced-rag', d: 'Reads query and chunk together for precise ordering, on the candidates only.', tl: ['BGE reranker v2 M3', 'Cohere Rerank'] }),
    N('topk', 780, 510, 'Top-k chunks', 'with citations', 'know', { l: 'retrieval', d: 'The few best chunks, labelled with sources, go into the context.' }),
    N('ctx', 500, 510, 'Context', 'answer from sources', 'ctx', { w: 170, go: 'context', l: 'context', d: 'The model is asked to answer from the supplied text and cite it.' }),
    N('agentic', 225, 510, 'Agentic loop', 'search again if needed', 'agent', { w: 170, go: 'harness', l: 'advanced-rag', d: 'Given a search tool, an agent decides whether to search again with a better query: multi-hop questions.' }),
    N('reval', 40, 510, 'Retrieval evals', 'recall@k, MRR', 'ship', { go: 'ops', l: 'advanced-rag', d: 'Measure retrieval on its own before blaming the model.', tl: ['Ragas'] })
  ],
  edges: [['src', 'parse'], ['parse', 'chunk'], ['chunk', 'ctxz'], ['ctxz', 'embed'], ['embed', 'vec'], ['ctxz', 'bm25', '', { dash: 1 }], ['chunk', 'meta', '', { dash: 1 }],
    ['q', 'rewrite'], ['rewrite', 'hybrid'], ['vec', 'hybrid', '', { dash: 1 }], ['bm25', 'hybrid', '', { dash: 1 }], ['meta', 'hybrid', 'filter', { dash: 1 }], ['hybrid', 'fuse'], ['fuse', 'rerank'], ['rerank', 'topk', 'k = 5–10'],
    ['topk', 'ctx'], ['ctx', 'agentic', 'not enough?', { dash: 1 }], ['agentic', 'rewrite', 'new query', { dash: 1 }], ['reval', 'q', '', { dash: 1 }]],
  flow: [
    { n: ['src', 'parse', 'chunk'], e: 'src>parse', t: 'Prepare documents', d: 'Extract clean text and split it into chunks with metadata.' },
    { n: ['embed', 'vec', 'bm25'], e: 'ctxz>embed', t: 'Index', d: 'Chunks are embedded into a vector index and a keyword index.' },
    { n: ['q', 'rewrite'], e: 'q>rewrite', t: 'A question arrives', d: 'It is rewritten into a standalone search query.' },
    { n: ['hybrid'], e: 'rewrite>hybrid', t: 'Search wide', d: 'Vectors and keywords, filtered by permissions, return many candidates.' },
    { n: ['fuse', 'rerank'], e: 'hybrid>fuse', t: 'Fuse and rerank', d: 'Rankings merge, then a cross-encoder orders the candidates precisely.' },
    { n: ['topk', 'ctx'], e: 'rerank>topk', t: 'Into the context', d: 'The best few chunks, with sources, reach the model.' },
    { n: ['agentic'], e: 'ctx>agentic', t: 'Search again?', d: 'An agent can loop back with a better query for multi-hop questions.' }
  ]
};

/* ---------- tools ---------- */
SYSV.tools = {
  title: 'Tool calling', sub: 'The model proposes, your code disposes', from: 'tools',
  lanes: [{ x: 20, y: 60, w: 960, h: 160, t: 'PROPOSE', cat: 'model' }, { x: 20, y: 240, w: 960, h: 240, t: 'EXECUTE (YOUR CODE)', cat: 'tool' }, { x: 20, y: 500, w: 960, h: 130, t: 'RETURN', cat: 'ctx' }],
  nodes: [
    N('defs', 40, 110, 'Tool definitions', 'in the context', 'ctx', { go: 'context', l: 'tools', d: 'Name, description and JSON schema for each tool. The description is effectively a prompt.' }),
    N('model', 230, 110, 'Model', 'decides to call a tool', 'model', { go: 'model', l: 'tools', d: 'Instead of prose it emits a structured tool call, possibly several in parallel.' }),
    N('call', 420, 110, 'tool_use block', 'name + JSON arguments', 'tool', { l: 'tools', d: 'A structured request such as get_weather({"city": "Lisbon"}).' }),
    N('validate', 610, 110, 'Validate', 'schema, permissions', 'agent', { go: 'harness', l: 'tools', d: 'The harness checks arguments against the schema and the caller\'s permissions; risky actions wait for approval.' }),
    N('approve', 800, 110, 'Human approval', 'writes, payments, sends', 'agent', { w: 160, go: 'harness', l: 'mcp', d: 'High-impact actions pause for a person, outside the model\'s control.' }),
    N('builtin', 40, 290, 'Built-in tools', 'web search, fetch', 'tool', { l: 'tools', d: 'Provider-hosted tools that run server-side.' }),
    N('sandbox', 225, 290, 'Code sandbox', 'run model-written code', 'tool', { l: 'tools', d: 'Isolated filesystem, no network by default, CPU and time limits. The universal tool.', tl: ['E2B', 'Modal Sandboxes', 'gVisor', 'Firecracker'] }),
    N('mcp', 410, 290, 'MCP client', 'standard tool servers', 'tool', { go: 'mcp', l: 'mcp', d: 'Reaches any MCP server through one protocol.' }),
    N('fn', 595, 290, 'Your functions', 'APIs, database, files', 'tool', { l: 'tools', d: 'Ordinary code in your application, with its own credentials and audit log.' }),
    N('browser', 780, 290, 'Computer use', 'browser or desktop', 'tool', { w: 170, l: 'tools', d: 'For systems with no API: the model operates a browser or desktop through screenshots and actions.' }),
    N('ext', 410, 400, 'External systems', 'calendars, tickets, payments, repos', 'ext', { w: 540, h: 52, d: 'The real systems your tools touch.' }),
    N('shape', 225, 545, 'Shape the result', 'select, paginate, summarise', 'ctx', { w: 190, l: 'tools', d: 'Results become context, so return only what the model needs, with a readable error when something fails.' }),
    N('result', 480, 545, 'tool_result', 'back into the context', 'ctx', { w: 190, go: 'context', l: 'tools', d: 'Sent in the next request; the model continues from it. This loop is the agent loop.' })
  ],
  edges: [['defs', 'model'], ['model', 'call'], ['call', 'validate'], ['validate', 'approve', 'risky?', { dash: 1 }],
    ['validate', 'builtin', '', { dash: 1, v: 1 }], ['validate', 'sandbox', '', { dash: 1, v: 1 }], ['validate', 'mcp', '', { dash: 1, v: 1 }], ['validate', 'fn', '', { v: 1 }], ['validate', 'browser', '', { dash: 1, v: 1 }],
    ['mcp', 'ext', '', { v: 1 }], ['fn', 'ext', '', { v: 1 }], ['browser', 'ext', '', { dash: 1, v: 1 }], ['sandbox', 'shape', '', { v: 1 }], ['ext', 'shape', '', { v: 1 }], ['shape', 'result']],
  flow: [
    { n: ['defs'], t: 'Tools are described', d: 'Definitions sit in the context.' },
    { n: ['model', 'call'], e: 'model>call', t: 'The model asks', d: 'It emits a structured tool call instead of text.' },
    { n: ['validate'], e: 'call>validate', t: 'The harness checks', d: 'Schema, permissions, and approval for risky actions.' },
    { n: ['fn'], e: 'validate>fn', t: 'Your code runs it', d: 'With your credentials.' },
    { n: ['ext'], e: 'fn>ext', t: 'The real system', d: 'A calendar, a ticket queue, a database.' },
    { n: ['shape'], e: 'ext>shape', t: 'Shape the result', d: 'Keep it small and useful.' },
    { n: ['result'], e: 'shape>result', t: 'Back to the model', d: 'The result is appended and the model is called again.' }
  ]
};

/* ---------- MCP ---------- */
SYSV.mcp = {
  title: 'Model Context Protocol', sub: 'One client per server, three server primitives, two transports', from: 'mcp',
  lanes: [{ x: 20, y: 60, w: 300, h: 560, t: 'HOST APPLICATION', cat: 'agent' }, { x: 340, y: 60, w: 210, h: 560, t: 'TRANSPORT', cat: 'serve' }, { x: 570, y: 60, w: 410, h: 560, t: 'MCP SERVERS', cat: 'tool' }],
  nodes: [
    N('host', 50, 100, 'Host', 'Claude, IDE, your agent', 'agent', { w: 240, go: 'harness', l: 'mcp', d: 'The AI application. It owns the model, the user and the permission decisions.' }),
    N('c1', 50, 210, 'Client A', 'one per server', 'agent', { w: 240, h: 54, l: 'mcp', d: 'Each client holds one server connection and translates between the host and that server.' }),
    N('c2', 50, 290, 'Client B', '', 'agent', { w: 240, h: 54, l: 'mcp', d: 'A second client for a second server.' }),
    N('c3', 50, 370, 'Client C', '', 'agent', { w: 240, h: 54, l: 'mcp', d: 'And so on: N clients for N servers.' }),
    N('perm', 50, 470, 'Permissions', 'approve tools, scopes', 'ship', { w: 240, go: 'ops', l: 'mcp', d: 'The host decides what each server may do and when a person must approve.' }),
    N('stdio', 365, 210, 'stdio', 'local subprocess', 'serve', { w: 160, l: 'mcp', d: 'The host launches a local server and talks over standard input and output.' }),
    N('http', 365, 330, 'Streamable HTTP', 'remote, with OAuth', 'serve', { w: 160, l: 'mcp', d: 'Remote servers over HTTP; authorisation uses OAuth.' }),
    N('rpc', 365, 470, 'JSON-RPC 2.0', 'stateless requests', 'serve', { w: 160, l: 'mcp', d: 'Every request carries its protocol version and capabilities; tools/list and tools/call are the core methods.' }),
    N('files', 600, 200, 'Files server', 'local, read-mostly', 'tool', { l: 'mcp', d: 'Exposes a folder as resources and file tools.' }),
    N('gh', 600, 300, 'GitHub server', 'remote', 'tool', { l: 'mcp', d: 'Issues, pull requests and code search as tools.' }),
    N('db', 600, 400, 'Database server', 'remote', 'tool', { l: 'mcp', d: 'Schema as a resource, read-only queries as a tool.' }),
    N('yours', 600, 500, 'Your server', '15 lines of Python', 'tool', { l: 'mcp', d: 'Anything your organisation runs, exposed once for every MCP host.', tl: ['MCP Python SDK', 'MCP TypeScript SDK', 'MCP Inspector'] }),
    N('tools', 800, 200, 'Tools', 'model-driven actions', 'tool', { w: 160, go: 'tools', l: 'mcp', d: 'Functions the model chooses to call.' }),
    N('res', 800, 300, 'Resources', 'app-attached data', 'know', { w: 160, l: 'mcp', d: 'Addressable data by URI that the host can place in context.' }),
    N('prompts', 800, 400, 'Prompts', 'user-picked templates', 'ctx', { w: 160, l: 'mcp', d: 'Reusable templates such as slash commands.' }),
    N('reg', 800, 500, 'Registry', 'discover servers', 'ext', { w: 160, l: 'mcp', d: 'A public registry of published servers. Vet before installing: every server is a trust decision.', tl: ['MCP Registry'] })
  ],
  edges: [['host', 'c1'], ['c1', 'stdio'], ['c2', 'http'], ['c3', 'http', '', { dash: 1 }], ['stdio', 'files'], ['http', 'gh'], ['http', 'db'], ['rpc', 'yours', '', { dash: 1 }],
    ['files', 'res', '', { dash: 1 }], ['gh', 'tools', '', { dash: 1 }], ['db', 'tools', '', { dash: 1 }], ['yours', 'prompts', '', { dash: 1 }], ['perm', 'host', '', { dash: 1 }]],
  flow: [
    { n: ['host'], t: 'The host connects', d: 'It starts one client per configured server.' },
    { n: ['c1', 'stdio'], e: 'c1>stdio', t: 'Pick a transport', d: 'stdio for local servers, Streamable HTTP for remote ones.' },
    { n: ['files', 'res'], e: 'stdio>files', t: 'Discover', d: 'The client lists the server\'s tools, resources and prompts.' },
    { n: ['tools'], t: 'Call a tool', d: 'When the model asks, the host checks permissions and the client sends tools/call.' },
    { n: ['perm'], t: 'Stay in control', d: 'The host enforces scopes and approvals; results are treated as untrusted data.' }
  ]
};

/* ---------- harness ---------- */
SYSV.harness = {
  title: 'The agent harness', sub: 'The loop around the model, and everything that keeps it safe and sharp', from: 'harness',
  lanes: [{ x: 20, y: 60, w: 650, h: 565, t: 'THE LOOP', cat: 'agent' }, { x: 690, y: 60, w: 290, h: 565, t: 'AROUND THE LOOP', cat: 'ship' }],
  nodes: [
    N('task', 50, 100, 'Task', 'from a person or event', 'user', { go: 'inputs', l: 'agent-loop', d: 'A goal, possibly vague, possibly long-running.' }),
    N('assemble', 260, 100, 'Assemble context', 'instructions, history, tools', 'ctx', { w: 170, go: 'context', l: 'context-eng', d: 'Builds the window for this step: rules, notes, relevant history and fresh tool results.' }),
    N('call', 480, 100, 'Call the model', 'one request', 'serve', { go: 'serving', l: 'agent-loop', d: 'Stateless; everything the model knows is in the assembled context.' }),
    N('parse', 480, 230, 'Parse the reply', 'text or tool calls?', 'agent', { l: 'agent-loop', d: 'If there are no tool calls, the model is done.' }),
    N('exec', 480, 360, 'Run tools', 'sandboxed, permissioned', 'tool', { go: 'tools', l: 'tools', d: 'Execute each requested tool, in parallel when independent, catching errors as results.' }),
    N('observe', 260, 360, 'Observe', 'append results', 'ctx', { w: 170, l: 'agent-loop', d: 'Results become context for the next step.' }),
    N('notes', 260, 230, 'Update notes', 'plan, todo, memory', 'agent', { w: 170, go: 'memory', l: 'context-eng', d: 'The agent keeps a running plan so a compacted context still knows what is left.' }),
    N('limits', 50, 360, 'Check limits', 'steps, tokens, cost, time', 'ship', { l: 'agent-loop', d: 'Hard budgets end runaway loops even when the model is confused.' }),
    N('done', 50, 500, 'Final answer', 'or stop with a report', 'user', { l: 'agent-loop', d: 'The loop ends when the model answers without tools or a limit is hit.' }),
    N('perm', 720, 100, 'Permissions', 'what is allowed', 'ship', { w: 230, l: 'mcp', d: 'Which tools, folders and actions; which need a person\'s approval.' }),
    N('compact', 720, 200, 'Compaction', 'clear and summarise', 'agent', { w: 230, go: 'memory', l: 'context-eng', d: 'Keeps the window small over long runs by clearing stale results and summarising.', tl: ['Claude context editing'] }),
    N('skills', 720, 300, 'Skills loader', 'progressive disclosure', 'agent', { w: 230, go: 'memory', l: 'context-eng', d: 'Only skill names and descriptions sit in context; full instructions load on demand.', tl: ['Agent Skills'] }),
    N('subs', 720, 400, 'Sub-agents', 'isolated contexts', 'agent', { w: 230, go: 'agents', l: 'multi-agent', d: 'Heavy reading is delegated to workers that return short summaries.' }),
    N('trace', 720, 500, 'Tracing', 'every call and tool', 'ship', { w: 230, go: 'ops', l: 'production', d: 'Spans for each model call and tool, with tokens, latency and cost.', tl: ['OpenTelemetry GenAI conventions', 'Langfuse'] })
  ],
  edges: [['task', 'assemble'], ['assemble', 'call'], ['call', 'parse'], ['parse', 'exec', 'tool calls'], ['exec', 'observe'], ['observe', 'notes'], ['notes', 'assemble'],
    ['observe', 'limits', '', { dash: 1 }], ['limits', 'done', 'stop'], ['parse', 'done', 'no tools', { dash: 1, bend: 60 }]],
  flow: [
    { n: ['task'], t: 'A task', d: 'For example: fix the failing test.' },
    { n: ['assemble'], e: 'task>assemble', t: 'Assemble', d: 'Rules, plan, relevant history and tools go into the window.' },
    { n: ['call'], e: 'assemble>call', t: 'Call', d: 'One stateless model request.' },
    { n: ['parse'], e: 'call>parse', t: 'Parse', d: 'Text, or a request to use tools?' },
    { n: ['exec'], e: 'parse>exec', t: 'Run tools', d: 'Permissioned, sandboxed, errors returned as results.' },
    { n: ['observe', 'notes'], e: 'exec>observe', t: 'Observe and note', d: 'Results are appended and the plan is updated.' },
    { n: ['assemble'], e: 'notes>assemble', t: 'Around again', d: 'Until the model answers without tools or a limit is reached.' },
    { n: ['done'], e: 'limits>done', t: 'Done', d: 'A final answer, or a clear report of why it stopped.' }
  ]
};

/* ---------- memory and skills ---------- */
SYSV.memory = {
  title: 'Memory and skills', sub: 'State that lives outside the window and is loaded only when it helps', from: 'mem',
  lanes: [{ x: 20, y: 60, w: 470, h: 565, t: 'WITHIN A RUN', cat: 'agent' }, { x: 510, y: 60, w: 470, h: 565, t: 'ACROSS RUNS', cat: 'know' }],
  nodes: [
    N('window', 50, 110, 'Context window', 'what the model sees now', 'ctx', { w: 190, go: 'context', l: 'context-eng', d: 'Small and relevant beats large and stale.' }),
    N('notes', 270, 110, 'Working notes', 'plan, todo, findings', 'agent', { w: 190, l: 'context-eng', d: 'A file the agent updates as it goes and re-reads after compaction.' }),
    N('clear', 50, 260, 'Tool-result clearing', 'stub old outputs', 'agent', { w: 190, l: 'context-eng', d: 'Replace results the agent has already used with one-line placeholders.', tl: ['Claude context editing'] }),
    N('summary', 270, 260, 'Compaction summary', 'decisions, open items', 'agent', { w: 190, l: 'context-eng', d: 'When the window passes a threshold, the run continues from a structured summary.' }),
    N('skillidx', 50, 420, 'Skill index', 'names + one-line descriptions', 'agent', { w: 190, l: 'context-eng', d: 'Always in context, cheap, enough to choose the right skill.' }),
    N('skillbody', 270, 420, 'Skill body', 'SKILL.md, scripts, references', 'agent', { w: 190, l: 'context-eng', d: 'Loaded only when the model decides the skill applies.', tl: ['Agent Skills'] }),
    N('store', 560, 110, 'Memory store', 'facts, preferences, decisions', 'know', { w: 190, shape: 'db', l: 'context-eng', d: 'Durable notes about the user or project, written deliberately, not whole transcripts.', tl: ['Mem0', 'Letta', 'Claude memory tool'] }),
    N('score', 780, 110, 'Retrieve', 'relevance · importance · recency', 'know', { w: 180, l: 'context-eng', d: 'Like RAG over the agent\'s own notes, often weighting recency and importance.' }),
    N('hygiene', 560, 260, 'Hygiene', 'view, edit, delete', 'ship', { w: 190, l: 'context-eng', d: 'People should see what is remembered and be able to remove it. Never store secrets.' }),
    N('profile', 780, 260, 'Project memory', 'CLAUDE.md, README rules', 'ctx', { w: 180, l: 'context-eng', d: 'Stable project instructions loaded at the start of every session.' }),
    N('library', 560, 420, 'Skill library', 'many folders, versioned', 'agent', { w: 190, shape: 'db', l: 'context-eng', d: 'Procedures the organisation has written once and every agent can reuse.' })
  ],
  edges: [['notes', 'window', '', { dash: 1 }], ['clear', 'window', '', { dash: 1 }], ['summary', 'window', '', { dash: 1 }], ['skillidx', 'skillbody', 'load when chosen'], ['skillbody', 'window', '', { dash: 1, bend: 40 }],
    ['store', 'score'], ['score', 'window', 'relevant facts', { dash: 1, bend: -40 }], ['library', 'skillidx', '', { dash: 1 }], ['profile', 'window', '', { dash: 1, bend: 40 }], ['hygiene', 'store', '', { dash: 1 }]],
  flow: [
    { n: ['window'], t: 'Keep the window small', d: 'It should hold only what this step needs.' },
    { n: ['notes', 'summary'], t: 'Notes and summaries', d: 'Progress survives compaction in a plan file and a summary.' },
    { n: ['skillidx', 'skillbody'], e: 'skillidx>skillbody', t: 'Skills on demand', d: 'Descriptions always, full instructions only when chosen.' },
    { n: ['store', 'score'], e: 'store>score', t: 'Long-term memory', d: 'Relevant facts are retrieved into the window.' }
  ]
};

/* ---------- multi-agent ---------- */
SYSV.agents = {
  title: 'Multi-agent systems', sub: 'An orchestrator, workers with clean contexts, and model routing', from: 'sub',
  lanes: [{ x: 20, y: 60, w: 960, h: 130, t: 'PLAN', cat: 'agent' }, { x: 20, y: 205, w: 960, h: 140, t: 'WORKERS (PARALLEL, ISOLATED)', cat: 'agent' }, { x: 20, y: 360, w: 960, h: 130, t: 'MERGE', cat: 'agent' }, { x: 20, y: 505, w: 960, h: 125, t: 'SUPPORT', cat: 'serve' }],
  nodes: [
    N('task', 120, 105, 'Task', 'broad, parallelisable', 'user', { l: 'multi-agent', d: 'Research across many sources, review of many files: work that splits cleanly.' }),
    N('orch', 400, 100, 'Orchestrator', 'large model, plans and briefs', 'agent', { w: 200, h: 66, go: 'harness', l: 'multi-agent', d: 'Breaks the task into sub-tasks, spawns workers with clear briefs and limits, and integrates results.' }),
    N('w1', 40, 255, 'Researcher A', 'own context, web tools', 'agent', { go: 'harness', l: 'multi-agent', d: 'Reads many pages in its own window and returns a short summary.' }),
    N('w2', 290, 255, 'Researcher B', 'own context, docs tools', 'agent', { go: 'harness', l: 'multi-agent', d: 'Same pattern, different sources.' }),
    N('w3', 540, 255, 'Coder', 'sandbox, tests', 'agent', { go: 'tools', l: 'multi-agent', d: 'Writes and runs code in a sandbox.' }),
    N('w4', 790, 255, 'Reviewer', 'checks the others', 'agent', { l: 'multi-agent', d: 'An evaluator-optimizer pattern: one agent critiques, another revises.' }),
    N('synth', 400, 405, 'Synthesise', 'merge the summaries', 'agent', { w: 200, h: 62, l: 'multi-agent', d: 'Combines worker summaries into one answer, resolving conflicts.' }),
    N('answer', 760, 405, 'Answer', 'with sources', 'user', { l: 'multi-agent', d: 'Better coverage and faster wall-clock time, at higher total token cost.' }),
    N('router', 40, 550, 'Model router', 'small vs large', 'serve', { w: 190, l: 'multi-agent', d: 'Sends each call to the cheapest model that passes your evals for that kind of task.', tl: ['LiteLLM Router', 'RouteLLM'] }),
    N('cascade', 280, 550, 'Cascade', 'try small, escalate', 'serve', { w: 190, l: 'multi-agent', d: 'Expected cost = small + (1 − accept rate) × large.' }),
    N('shared', 520, 550, 'Shared workspace', 'files, not chat logs', 'know', { w: 190, shape: 'db', l: 'multi-agent', d: 'Workers write artefacts to files and pass references, keeping messages short.' }),
    N('budget', 760, 550, 'Budgets', 'tokens and time per worker', 'ship', { w: 190, go: 'ops', l: 'multi-agent', d: 'Each worker gets limits; the orchestrator watches total spend.' })
  ],
  edges: [['task', 'orch'], ['orch', 'w1', 'brief', { v: 1 }], ['orch', 'w2', '', { v: 1 }], ['orch', 'w3', '', { v: 1 }], ['orch', 'w4', '', { dash: 1, v: 1 }], ['w1', 'synth', 'summary', { dash: 1, v: 1 }], ['w2', 'synth', '', { dash: 1, v: 1 }],
    ['w3', 'synth', '', { dash: 1, v: 1 }], ['w4', 'synth', '', { dash: 1, v: 1 }], ['synth', 'answer'], ['router', 'cascade', '', { dash: 1 }]],
  flow: [
    { n: ['task', 'orch'], e: 'task>orch', t: 'Plan', d: 'The orchestrator splits the task into independent pieces.' },
    { n: ['w1', 'w2', 'w3'], e: 'orch>w1', t: 'Fan out', d: 'Workers run in parallel, each with a clean context and its own tools.' },
    { n: ['synth'], e: 'w1>synth', t: 'Summaries back', d: 'Each returns a short summary, not its whole transcript.' },
    { n: ['answer'], e: 'synth>answer', t: 'Answer', d: 'The orchestrator merges the results.' }
  ]
};

/* ---------- production ---------- */
SYSV.ops = {
  title: 'Production operations', sub: 'Guardrails at the edges, traces everywhere, evals on every change', from: 'evals',
  lanes: [{ x: 20, y: 60, w: 960, h: 175, t: 'ONLINE: EVERY REQUEST', cat: 'ship' }, { x: 20, y: 255, w: 960, h: 175, t: 'OBSERVE', cat: 'serve' }, { x: 20, y: 450, w: 960, h: 175, t: 'IMPROVE: EVERY CHANGE', cat: 'agent' }],
  nodes: [
    N('in', 40, 110, 'Traffic', 'users, events, APIs', 'user', { go: 'inputs', d: 'Everything that reaches the system.' }),
    N('ig', 225, 110, 'Input guardrails', 'injection, PII, size', 'ship', { l: 'production', d: 'Detect injection attempts, mask personal data and enforce limits before the model sees input.', tl: ['Microsoft Presidio', 'Llama Guard 4'] }),
    N('app', 410, 105, 'Your AI system', 'harness + model + tools', 'agent', { h: 70, go: 'harness', d: 'Everything in the rest of this map.' }),
    N('og', 595, 110, 'Output guardrails', 'schema, policy, grounding', 'ship', { l: 'production', d: 'Validate structure, run policy classifiers and check answers against their sources.', tl: ['NeMo Guardrails', 'Guardrails AI'] }),
    N('gate', 780, 110, 'Action gates', 'approvals, rules', 'ship', { w: 170, l: 'mcp', d: 'Deterministic checks and human approval for actions that write, pay or send.' }),
    N('trace', 225, 305, 'Tracing', 'spans per call and tool', 'serve', { l: 'production', d: 'One trace per request: retrieval, model calls, tools, with tokens, latency and cost.', tl: ['OpenTelemetry GenAI conventions', 'OpenLLMetry'] }),
    N('store', 410, 305, 'Trace store', 'search and dashboards', 'serve', { shape: 'db', l: 'production', d: 'Where you find the slow span or the bad answer.', tl: ['Langfuse', 'Arize Phoenix', 'LangSmith'] }),
    N('cost', 595, 305, 'Cost and latency', 'tokens, cache hits, p95', 'serve', { l: 'production', d: 'Track spend per feature and user, prompt-cache hit rate and latency percentiles.' }),
    N('alerts', 780, 305, 'Alerts', 'regressions, spend spikes', 'ship', { w: 170, d: 'Page someone when quality, latency or cost drifts.' }),
    N('sample', 40, 500, 'Sample live traffic', 'with consent', 'ship', { l: 'production', d: 'Real inputs, especially failures and thumbs-down, become new test cases.' }),
    N('suite', 225, 500, 'Eval suite', 'code checks + LLM judge', 'ship', { l: 'production', d: 'A fixed set of cases with scoring rules, run on every change, with error bars.', tl: ['promptfoo', 'Inspect', 'DeepEval'] }),
    N('human', 410, 500, 'Human review', 'labels, calibration', 'user', { l: 'production', d: 'People label hard cases and check that the LLM judge agrees with them.' }),
    N('change', 595, 500, 'Change', 'prompt, model, retrieval', 'agent', { l: 'production', d: 'Every improvement is a change to the model or to its context.' }),
    N('ci', 780, 500, 'CI gate', 'ship only if evals pass', 'ship', { w: 170, l: 'production', d: 'A regression on the suite blocks the release.' })
  ],
  edges: [['in', 'ig'], ['ig', 'app'], ['app', 'og'], ['og', 'gate'], ['app', 'trace', '', { dash: 1 }], ['trace', 'store'], ['store', 'cost'], ['cost', 'alerts'], ['store', 'sample', '', { dash: 1 }],
    ['sample', 'suite'], ['suite', 'human', '', { dash: 1 }], ['human', 'change', '', { dash: 1 }], ['change', 'ci'], ['ci', 'app', 'deploy', { dash: 1, bend: -40 }]],
  flow: [
    { n: ['in', 'ig'], e: 'in>ig', t: 'Check the input', d: 'Injection, personal data and size limits.' },
    { n: ['app'], e: 'ig>app', t: 'Run the system', d: 'The harness, model and tools do their work.' },
    { n: ['og', 'gate'], e: 'app>og', t: 'Check the output', d: 'Schema, policy and grounding; approvals for actions.' },
    { n: ['trace', 'store'], e: 'app>trace', t: 'Trace it', d: 'Every span is recorded with tokens, latency and cost.' },
    { n: ['sample', 'suite'], e: 'store>sample', t: 'Learn from it', d: 'Failures become eval cases.' },
    { n: ['change', 'ci'], e: 'change>ci', t: 'Ship safely', d: 'Changes deploy only when the suite passes.' }
  ]
};

/* Which view each block of the top-level diagram opens. */
const ROOT_GO = {
  model: 'model', context: 'context', client: 'inputs', api: 'serving', head: 'decode', tok: 'tokenizer', tf: 'block', weights: 'training', gpu: 'gpu', kv: 'kv',
  gateway: 'serving', 's-sys': 'context', 's-hist': 'context', 's-user': 'context', 's-schema': 'decode', know: 'rag', 's-ret': 'rag', 'rag-adv': 'rag',
  tools: 'tools', 's-tooldef': 'tools', 's-toolres': 'tools', mcp: 'mcp', harness: 'harness', mem: 'memory', sub: 'agents', evals: 'ops'
};

/* Flatten nodes with namespaced ids, validate references, and index tools. */
const SYSN = {};
Object.entries(SYSV).forEach(([vid, v]) => {
  v.id = vid;
  v.nodes.forEach(n => { n.view = vid; n.key = vid + '.' + n.id; SYSN[n.key] = n; });
  v.byId = Object.fromEntries(v.nodes.map(n => [n.id, n]));
  // the camera frames exactly what is drawn
  const boxes = [...(v.lanes || []), ...v.nodes.map(n => ({ x: n.x, y: n.y, w: n.w, h: n.h + 6 }))];
  const x0 = Math.min(...boxes.map(b => b.x)), y0 = Math.min(...boxes.map(b => b.y)), x1 = Math.max(...boxes.map(b => b.x + b.w)), y1 = Math.max(...boxes.map(b => b.y + b.h));
  v.bounds = [x0 - 14, y0 - 14, x1 - x0 + 28, y1 - y0 + 28];
});
const TOOL_INDEX = (() => {
  const idx = {};
  Object.values(DEEP).forEach(steps => Object.values(steps).forEach(d => (d.tools || []).forEach(t => { if (!idx[t.n]) idx[t.n] = t; })));
  return idx;
})();
function sysTool(t) { return typeof t === 'string' ? TOOL_INDEX[t] || null : t; }
