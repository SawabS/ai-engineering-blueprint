/* ================= "Go deeper" content, units 1 to 4 =================
   Keyed by lesson id, then by step index. Every string is String.raw so TeX backslashes survive.
   Fields: title, math (HTML with \( \) and \[ \]), code [{lang,title,src}], codeNote, tools [{n,d,u,tag}], refs [{t,s,u}]. */
const R = String.raw;
const CLAUDE_DOCS = 'https://platform.claude.com/docs/en';
const DEEP = {};

/* ---------- 1. Two boxes ---------- */
DEEP['two-boxes'] = {
  2: {
    title: 'The model, written properly',
    math: R`<p>A language model assigns a probability to any token sequence \(x_1, \dots, x_n\). The chain rule of probability splits that into one next-token prediction per position, which is exactly what the network computes:</p>
\[ P(x_1,\dots,x_n) = \prod_{t=1}^{n} P_\theta(x_t \mid x_{<t}) \]
<p>Here \(\theta\) is the set of weights (billions of numbers, frozen after training) and \(x_{<t}\) is everything before position \(t\): your context. Generation reads this equation from left to right: sample \(x_t\), append it, predict \(x_{t+1}\).</p>
<h4>What "stateless" means formally</h4>
<p>On request \(r\) the output depends only on \(\theta\) and the context \(c_r\) that request carries. Nothing from request \(r-1\) survives unless the application copies it into \(c_r\). That is why every product feature in this course is either a change to \(\theta\) (training) or a change to \(c\) (context).</p>`,
    code: [
      { lang: 'python', title: 'One call to a hosted model (Anthropic SDK)', src: R`
# pip install anthropic   and set ANTHROPIC_API_KEY
import anthropic

client = anthropic.Anthropic()
resp = client.messages.create(
    model="claude-sonnet-5-5",          # any current model id from the provider's model list
    max_tokens=200,
    system="You are a concise assistant.",   # part of the context
    messages=[{"role": "user", "content": "What is the capital of France?"}],
)
print(resp.content[0].text)
print(resp.usage)   # input_tokens and output_tokens: the context in, the tokens out` },
      { lang: 'python', title: 'The same idea with open weights on your own machine', src: R`
# pip install transformers torch
from transformers import pipeline

chat = pipeline("text-generation", model="Qwen/Qwen2.5-0.5B-Instruct")
messages = [{"role": "user", "content": "What is the capital of France?"}]
out = chat(messages, max_new_tokens=50)
print(out[0]["generated_text"][-1]["content"])` }
    ],
    tools: [
      { n: 'Claude API', d: 'Hosted frontier models behind a stateless Messages API.', u: CLAUDE_DOCS + '/api/overview', tag: 'API' },
      { n: 'OpenAI API', d: 'Hosted models through the Responses and Chat Completions APIs.', u: 'https://platform.openai.com/docs', tag: 'API' },
      { n: 'Gemini API', d: "Google's hosted models and SDKs.", u: 'https://ai.google.dev/gemini-api/docs', tag: 'API' },
      { n: 'Hugging Face Transformers', d: 'The standard Python library for loading and running open-weight models.', u: 'https://huggingface.co/docs/transformers', tag: 'Open source' },
      { n: 'Ollama', d: 'Run open models locally with one command and an HTTP API.', u: 'https://ollama.com', tag: 'Open source' },
      { n: 'llama.cpp', d: 'Fast CPU and GPU inference for quantized GGUF models.', u: 'https://github.com/ggml-org/llama.cpp', tag: 'Open source' }
    ],
    refs: [
      { t: 'Speech and Language Processing (3rd ed. draft), chapters on language models and LLMs', s: 'Jurafsky and Martin, Stanford. Free textbook.', u: 'https://web.stanford.edu/~jurafsky/slp3/' },
      { t: 'But what is a GPT? Visual intro to transformers', s: '3Blue1Brown, video lesson', u: 'https://www.3blue1brown.com/lessons/gpt' },
      { t: 'Intro to Large Language Models', s: 'Andrej Karpathy, 1-hour talk', u: 'https://www.youtube.com/watch?v=zjkBMFhNj_g' }
    ]
  }
};

/* ---------- 2. Next-token machine ---------- */
DEEP['next-token'] = {
  0: {
    title: 'Softmax and temperature, exactly',
    math: R`<p>The output head produces a vector of logits \(z \in \mathbb{R}^{|V|}\), one real number per vocabulary entry. Softmax with temperature \(T > 0\) turns them into probabilities:</p>
\[ p_i = \frac{\exp(z_i / T)}{\sum_{j=1}^{|V|} \exp(z_j / T)} \]
<p>Dividing by \(T\) rescales the gaps between logits before exponentiation. Since \(p_i / p_j = \exp((z_i - z_j)/T)\), a small \(T\) magnifies every gap and a large \(T\) shrinks it.</p>
<h4>A worked example</h4>
<p>Three candidate tokens with logits \(z = (2, 1, 0)\):</p>
<div class="tbl-wrap"><table><thead><tr><th>T</th><th>p(first)</th><th>p(second)</th><th>p(third)</th><th>Effect</th></tr></thead><tbody>
<tr><td>0.5</td><td>0.867</td><td>0.117</td><td>0.016</td><td>Sharper: the favourite dominates</td></tr>
<tr><td>1.0</td><td>0.665</td><td>0.245</td><td>0.090</td><td>The model's own distribution</td></tr>
<tr><td>2.0</td><td>0.506</td><td>0.307</td><td>0.186</td><td>Flatter: more surprising picks</td></tr>
</tbody></table></div>
<p>As \(T \to 0\) all probability mass moves to \(\arg\max_i z_i\), so APIs implement \(T = 0\) as <em>greedy decoding</em>. As \(T \to \infty\) the distribution tends to uniform over the whole vocabulary, which produces gibberish.</p>
<h4>Why subtract the maximum?</h4>
<p>Real implementations compute \(\exp((z_i - \max_j z_j)/T)\). The result is identical, because the common factor cancels, but it prevents overflow when logits are large.</p>`,
    code: [{ lang: 'python', title: 'Softmax with temperature in NumPy', src: R`
import numpy as np

def softmax(logits, T=1.0):
    z = np.asarray(logits, dtype=np.float64) / T
    z -= z.max()                 # numerical stability, does not change the result
    e = np.exp(z)
    return e / e.sum()

for T in (0.5, 1.0, 2.0):
    print(T, softmax([2.0, 1.0, 0.0], T).round(3))
# 0.5 [0.867 0.117 0.016]
# 1.0 [0.665 0.245 0.09 ]
# 2.0 [0.506 0.307 0.186]` }],
    refs: [
      { t: 'Generation strategies (greedy, sampling, beam search)', s: 'Hugging Face Transformers documentation', u: 'https://huggingface.co/docs/transformers/generation_strategies' },
      { t: 'Deep Learning, section 6.2.2.3 on softmax units', s: 'Goodfellow, Bengio and Courville, MIT Press. Free online.', u: 'https://www.deeplearningbook.org/contents/mlp.html' }
    ]
  },
  2: {
    title: 'Top-k, top-p and min-p, defined',
    math: R`<p>Sort the vocabulary so that \(p_{(1)} \ge p_{(2)} \ge \dots\). Each filter keeps a set \(S\), sets every other probability to zero, and renormalises:</p>
\[ p'_i = \frac{p_i \, \mathbf{1}[i \in S]}{\sum_{j \in S} p_j} \]
<ul>
<li><b>Top-k:</b> \(S\) is the \(k\) most likely tokens. Fixed size, so it keeps too many when the model is sure and too few when it is not.</li>
<li><b>Top-p (nucleus):</b> \(S\) is the smallest prefix of the sorted list with \(\sum_{i \in S} p_i \ge p\). The size adapts to the model's confidence.</li>
<li><b>Min-p:</b> \(S = \{\, i : p_i \ge p_{\min} \cdot p_{(1)} \,\}\). The cut-off scales with the top token's probability, which stays coherent at higher temperatures.</li>
</ul>
<p>Order matters: most engines apply temperature first, then the filters, then sample. Changing temperature therefore changes which tokens survive top-p.</p>`,
    code: [{ lang: 'python', title: 'A complete sampler: temperature, top-k, top-p', src: R`
import numpy as np
rng = np.random.default_rng(0)

def sample(logits, T=0.8, top_k=None, top_p=None):
    if T == 0:
        return int(np.argmax(logits))                # greedy decoding
    z = np.asarray(logits, float) / T
    p = np.exp(z - z.max()); p /= p.sum()
    order = np.argsort(-p)                           # most likely first
    keep = np.ones_like(p, dtype=bool)
    if top_k is not None:
        keep[order[top_k:]] = False
    if top_p is not None:
        cum = np.cumsum(p[order])
        cutoff = np.searchsorted(cum, top_p) + 1     # smallest prefix reaching top_p
        keep[order[cutoff:]] = False
    p = np.where(keep, p, 0.0); p /= p.sum()
    return int(rng.choice(len(p), p=p))` }],
    tools: [
      { n: 'vLLM SamplingParams', d: 'temperature, top_p, top_k, min_p, repetition penalties and seeds for self-hosted models.', u: 'https://docs.vllm.ai/en/latest/api/vllm/sampling_params.html', tag: 'Open source' },
      { n: 'Transformers GenerationConfig', d: 'The same knobs for model.generate() in Python.', u: 'https://huggingface.co/docs/transformers/main_classes/text_generation', tag: 'Open source' }
    ],
    refs: [
      { t: 'The Curious Case of Neural Text Degeneration (introduces nucleus sampling)', s: 'Holtzman et al., ICLR 2020', u: 'https://arxiv.org/abs/1904.09751' },
      { t: 'Turning Up the Heat: Min-p Sampling for Creative and Coherent LLM Outputs', s: 'Nguyen et al., 2024', u: 'https://arxiv.org/abs/2407.01082' }
    ]
  },
  3: {
    title: 'The decoding loop in ten lines',
    codeNote: 'This is what <code>generate()</code> does under the hood, minus the KV cache you will meet in lesson 7. Each pass re-reads the whole sequence, which is why the cache matters.',
    code: [{ lang: 'python', title: 'Autoregressive sampling by hand (PyTorch + Transformers)', src: R`
import torch
from transformers import AutoTokenizer, AutoModelForCausalLM

name = "Qwen/Qwen2.5-0.5B"
tok = AutoTokenizer.from_pretrained(name)
model = AutoModelForCausalLM.from_pretrained(name)

ids = tok("The capital of France is", return_tensors="pt").input_ids
with torch.no_grad():
    for _ in range(20):
        logits = model(ids).logits[:, -1, :]           # scores for the next position only
        probs = torch.softmax(logits / 0.7, dim=-1)     # temperature 0.7
        next_id = torch.multinomial(probs, 1)           # sample one token
        ids = torch.cat([ids, next_id], dim=-1)         # append and run again
        if next_id.item() == tok.eos_token_id:
            break
print(tok.decode(ids[0]))` }],
    math: R`<p>Prefill and decode differ in shape. For a prompt of \(n\) tokens, prefill runs one forward pass over an \(n\)-row matrix: highly parallel. Decode runs one pass per generated token over a single new row. Generating \(m\) tokens therefore takes \(m\) sequential passes, and latency grows linearly with \(m\).</p>`
  },
  5: {
    title: 'Choosing the values',
    math: R`<p>Start from the task, not from a favourite number. These ranges are common defaults; confirm them with an eval on your own data (lesson 19).</p>
<div class="tbl-wrap"><table><thead><tr><th>Task</th><th>temperature</th><th>top_p</th><th>Why</th></tr></thead><tbody>
<tr><td>Extraction, classification, SQL, code edits</td><td>0 to 0.2</td><td>1.0</td><td>One right answer. Randomness only adds errors.</td></tr>
<tr><td>Support chat, summaries, RAG answers</td><td>0.3 to 0.7</td><td>0.9 to 1.0</td><td>Natural wording while staying close to the sources.</td></tr>
<tr><td>Brainstorming, fiction, marketing variants</td><td>0.8 to 1.2</td><td>0.9 to 0.95</td><td>You want diversity; top-p trims the incoherent tail.</td></tr>
<tr><td>Several candidates to pick from (self-consistency, best-of-n)</td><td>0.7 to 1.0</td><td>0.95</td><td>Samples must differ for voting or reranking to help.</td></tr>
</tbody></table></div>
<ul>
<li>Tune temperature <em>or</em> top-p, not both at once, so you can tell which change helped.</li>
<li>Reasoning modes often fix or restrict sampling parameters. Check the provider's documentation before setting them.</li>
<li><code>max_tokens</code> should cover the longest valid answer plus margin. If responses end with a stop reason of <code>max_tokens</code>, the answer was cut off.</li>
<li>Temperature 0 is not perfectly deterministic in production: batching changes the order of floating-point additions. Use <code>seed</code> where offered, and never rely on bit-exact repeats.</li>
</ul>`,
    code: [{ lang: 'python', title: 'Setting the knobs on an API call', src: R`
resp = client.messages.create(
    model="claude-sonnet-5-5",
    max_tokens=300,                 # hard cap on the decode loop
    temperature=0.2,                # extraction-style task
    stop_sequences=["</answer>"],   # end early when the closing tag appears
    messages=[{"role": "user", "content": "Extract the invoice total. Reply as <answer>...</answer>"}],
)
print(resp.stop_reason)   # "end_turn", "stop_sequence" or "max_tokens"` }],
    refs: [
      { t: 'Messages API reference: temperature, top_p, top_k, stop_sequences', s: 'Claude Developer Platform', u: CLAUDE_DOCS + '/api/messages' },
      { t: 'Defeating Nondeterminism in LLM Inference', s: 'Thinking Machines Lab, 2025', u: 'https://thinkingmachines.ai/blog/defeating-nondeterminism-in-llm-inference/' }
    ]
  }
};

/* ---------- 3. Tokens and embeddings ---------- */
DEEP['tokens'] = {
  0: {
    title: 'How tokenizers are trained',
    math: R`<h4>Byte-pair encoding</h4>
<p>Start with a vocabulary of the 256 byte values. Count every adjacent pair \((a, b)\) in the training corpus and merge the most frequent one into a new token:</p>
\[ (a^*, b^*) = \arg\max_{(a,b)} \operatorname{count}(a, b) \]
<p>Replace every occurrence, record the merge, and repeat until the vocabulary reaches its target size \(|V|\) (commonly 32k to 256k). Encoding new text replays the merges in the order they were learned.</p>
<h4>Unigram language model (SentencePiece's default)</h4>
<p>Start from a large candidate vocabulary and give each piece a probability. A sentence's segmentation \(\mathbf{x} = (x_1, \dots, x_m)\) scores \(P(\mathbf{x}) = \prod_i p(x_i)\). Training prunes the pieces whose removal hurts corpus likelihood least, until \(|V|\) remains.</p>
<h4>Measuring fairness across languages</h4>
<p><b>Fertility</b> is the average number of tokens per word:</p>
\[ \text{fertility} = \frac{\#\text{tokens}}{\#\text{words}} \]
<p>English often sits near 1.3 on large tokenizers. Under-represented languages can be 3 to 5 or more, which multiplies cost, latency and context use by the same factor. Measure it on a held-out sample before choosing a model for a language, and consider training a tokenizer on that language.</p>`,
    code: [
      { lang: 'python', title: 'Train a SentencePiece tokenizer (e.g. for Sorani Kurdish)', src: R`
# pip install sentencepiece
import sentencepiece as spm

spm.SentencePieceTrainer.train(
    input="ckb_corpus.txt",        # one sentence per line, raw UTF-8 text
    model_prefix="ckb_bpe",
    vocab_size=32000,
    model_type="bpe",              # or "unigram" (the default)
    character_coverage=1.0,        # keep every character of the script
    byte_fallback=True,            # unknown characters become bytes, never <unk>
    normalization_rule_name="nfkc",
)

sp = spm.SentencePieceProcessor(model_file="ckb_bpe.model")
print(sp.encode("سڵاو، چۆنی؟", out_type=str))` },
      { lang: 'python', title: 'Train a byte-level BPE with Hugging Face Tokenizers', src: R`
# pip install tokenizers
from tokenizers import Tokenizer, models, trainers, pre_tokenizers, decoders

tok = Tokenizer(models.BPE())
tok.pre_tokenizer = pre_tokenizers.ByteLevel(add_prefix_space=False)
tok.decoder = decoders.ByteLevel()
trainer = trainers.BpeTrainer(
    vocab_size=32000,
    special_tokens=["<|endoftext|>", "<|im_start|>", "<|im_end|>"],
    initial_alphabet=pre_tokenizers.ByteLevel.alphabet(),
)
tok.train(["corpus.txt"], trainer)
tok.save("tokenizer.json")` },
      { lang: 'python', title: 'Count tokens and fertility with tiktoken', src: R`
# pip install tiktoken
import tiktoken

enc = tiktoken.get_encoding("o200k_base")
for text in ["Good morning, how are you?", "بەیانیت باش، چۆنی؟"]:
    n = len(enc.encode(text))
    print(f"{n} tokens, fertility {n / len(text.split()):.2f}  {text}")` }
    ],
    tools: [
      { n: 'SentencePiece', d: "Google's language-independent tokenizer trainer (BPE and unigram). Used by Llama 2, T5, Gemma and many multilingual models.", u: 'https://github.com/google/sentencepiece', tag: 'Open source' },
      { n: 'Hugging Face Tokenizers', d: 'Fast Rust tokenizers with BPE, WordPiece and unigram trainers; the tokenizer.json format most open models ship.', u: 'https://huggingface.co/docs/tokenizers', tag: 'Open source' },
      { n: 'tiktoken', d: "OpenAI's fast BPE encoder, handy for counting tokens.", u: 'https://github.com/openai/tiktoken', tag: 'Open source' },
      { n: 'minbpe', d: 'Minimal, readable BPE implementation for learning.', u: 'https://github.com/karpathy/minbpe', tag: 'Teaching code' }
    ],
    refs: [
      { t: 'Neural Machine Translation of Rare Words with Subword Units (BPE for NLP)', s: 'Sennrich, Haddow and Birch, ACL 2016', u: 'https://arxiv.org/abs/1508.07909' },
      { t: 'SentencePiece: A simple and language independent subword tokenizer', s: 'Kudo and Richardson, EMNLP 2018', u: 'https://arxiv.org/abs/1808.06226' },
      { t: 'Subword Regularization (the unigram language model tokenizer)', s: 'Kudo, ACL 2018', u: 'https://arxiv.org/abs/1804.10959' },
      { t: "Let's build the GPT Tokenizer", s: 'Andrej Karpathy, video lecture', u: 'https://www.youtube.com/watch?v=zduSFxRajkE' }
    ]
  },
  2: {
    title: 'Embeddings and positions, in symbols',
    math: R`<p>The embedding table is a learned matrix \(E \in \mathbb{R}^{|V| \times d}\), where \(d\) is the model width (for example 4096). Token id \(i\) simply selects row \(i\):</p>
\[ \mathbf{h}^{(0)}_t = E[x_t] \in \mathbb{R}^{d} \]
<p>Closeness between two vectors is usually measured with cosine similarity, which ignores length and compares direction:</p>
\[ \cos(\mathbf{a}, \mathbf{b}) = \frac{\mathbf{a} \cdot \mathbf{b}}{\lVert \mathbf{a} \rVert \, \lVert \mathbf{b} \rVert} \]
<h4>Rotary position embeddings (RoPE)</h4>
<p>RoPE splits query and key vectors into pairs of dimensions and rotates pair \(k\) at position \(m\) by the angle \(m\,\theta_k\), with \(\theta_k = b^{-2k/d}\) and base \(b\) typically \(10^4\) to \(10^6\). The dot product of a rotated query at position \(m\) and key at position \(n\) depends only on the offset \(m - n\), so attention becomes sensitive to relative position. Long-context extensions (NTK scaling, YaRN) work by adjusting these angles.</p>`,
    code: [{ lang: 'python', title: 'Look at real token embeddings', src: R`
import torch
from transformers import AutoTokenizer, AutoModelForCausalLM

name = "Qwen/Qwen2.5-0.5B"
tok = AutoTokenizer.from_pretrained(name)
model = AutoModelForCausalLM.from_pretrained(name)
E = model.get_input_embeddings().weight          # shape: (vocab_size, d)
print(E.shape)

def vec(word):
    ids = tok(word, add_special_tokens=False).input_ids
    return E[ids].mean(0)                         # average if the word splits

cos = torch.nn.functional.cosine_similarity
print(cos(vec(" king"), vec(" queen"), dim=0).item())
print(cos(vec(" king"), vec(" banana"), dim=0).item())` }],
    refs: [
      { t: 'RoFormer: Enhanced Transformer with Rotary Position Embedding', s: 'Su et al., 2021', u: 'https://arxiv.org/abs/2104.09864' },
      { t: 'Efficient Estimation of Word Representations in Vector Space (word2vec)', s: 'Mikolov et al., 2013', u: 'https://arxiv.org/abs/1301.3781' },
      { t: 'YaRN: Efficient Context Window Extension of Large Language Models', s: 'Peng et al., 2023', u: 'https://arxiv.org/abs/2309.00071' }
    ]
  }
};

/* ---------- 4. Attention ---------- */
DEEP['attention'] = {
  0: {
    title: 'Scaled dot-product attention, step by step',
    math: R`<p>Stack the \(n\) token vectors of one layer into \(X \in \mathbb{R}^{n \times d}\). Three learned matrices project them:</p>
\[ Q = X W_Q, \quad K = X W_K, \quad V = X W_V \]
<p>Scores compare every query with every key, a causal mask removes the future, and softmax runs across each row:</p>
\[ \operatorname{Attention}(Q,K,V) = \operatorname{softmax}\left(\frac{Q K^{\top}}{\sqrt{d_k}} + M\right) V \]
\[ M_{ij} = \begin{cases} 0 & j \le i \\ -\infty & j > i \end{cases} \]
<p><b>Why divide by \(\sqrt{d_k}\)?</b> If query and key entries have unit variance, their dot product over \(d_k\) dimensions has variance \(d_k\). Large scores push softmax into saturation, where gradients vanish. Dividing by \(\sqrt{d_k}\) restores unit variance.</p>
<h4>Multi-head attention</h4>
<p>The model runs \(h\) attentions in parallel on smaller projections (\(d_k = d/h\)), concatenates the results and mixes them with an output matrix:</p>
\[ \operatorname{MHA}(X) = \operatorname{concat}(\text{head}_1, \dots, \text{head}_h)\, W_O \]
<h4>Cost</h4>
<p>The score matrix \(QK^{\top}\) is \(n \times n\), so prefill attention costs \(O(n^2 d)\) operations and, naively, \(O(n^2)\) memory. FlashAttention computes the same result in tiles without ever storing the full matrix, cutting memory to \(O(n)\) and running several times faster.</p>`,
    code: [
      { lang: 'python', title: 'Causal self-attention from scratch (PyTorch)', src: R`
import math, torch
import torch.nn.functional as F

def causal_self_attention(x, Wq, Wk, Wv, Wo, n_heads):
    B, T, d = x.shape
    dk = d // n_heads
    # project, then split into heads: (B, heads, T, dk)
    q = (x @ Wq).view(B, T, n_heads, dk).transpose(1, 2)
    k = (x @ Wk).view(B, T, n_heads, dk).transpose(1, 2)
    v = (x @ Wv).view(B, T, n_heads, dk).transpose(1, 2)
    scores = q @ k.transpose(-2, -1) / math.sqrt(dk)            # (B, heads, T, T)
    mask = torch.triu(torch.ones(T, T, dtype=torch.bool), diagonal=1)
    scores = scores.masked_fill(mask, float("-inf"))             # hide the future
    out = F.softmax(scores, dim=-1) @ v                          # weighted sum of values
    return out.transpose(1, 2).reshape(B, T, d) @ Wo` },
      { lang: 'python', title: 'The production version: one fused call', src: R`
# Same maths, dispatched to FlashAttention or memory-efficient kernels when available
out = F.scaled_dot_product_attention(q, k, v, is_causal=True)` }
    ],
    tools: [
      { n: 'PyTorch SDPA', d: 'scaled_dot_product_attention with fused Flash and memory-efficient kernels.', u: 'https://docs.pytorch.org/docs/stable/generated/torch.nn.functional.scaled_dot_product_attention.html', tag: 'Open source' },
      { n: 'FlashAttention', d: 'IO-aware exact attention kernels used by most training and inference stacks.', u: 'https://github.com/Dao-AILab/flash-attention', tag: 'Open source' },
      { n: 'Transformer Explainer', d: 'Interactive visualisation of GPT-2 running in the browser.', u: 'https://poloclub.github.io/transformer-explainer/', tag: 'Learning' },
      { n: 'BertViz', d: 'Visualise attention heads of real models in a notebook.', u: 'https://github.com/jessevig/bertviz', tag: 'Open source' }
    ],
    refs: [
      { t: 'Attention Is All You Need', s: 'Vaswani et al., NeurIPS 2017', u: 'https://arxiv.org/abs/1706.03762' },
      { t: 'The Illustrated Transformer', s: 'Jay Alammar, blog', u: 'https://jalammar.github.io/illustrated-transformer/' },
      { t: 'FlashAttention: Fast and Memory-Efficient Exact Attention with IO-Awareness', s: 'Dao et al., NeurIPS 2022', u: 'https://arxiv.org/abs/2205.14135' }
    ]
  },
  3: {
    title: 'One transformer block, as equations',
    math: R`<p>Modern decoder blocks (Llama, Qwen, Mistral and most others) use pre-normalisation with RMSNorm and a gated MLP called SwiGLU. For the residual stream \(\mathbf{h}\) of one token:</p>
\[ \mathbf{h}' = \mathbf{h} + \operatorname{MHA}(\operatorname{RMSNorm}(\mathbf{h})) \]
\[ \mathbf{h}'' = \mathbf{h}' + \operatorname{MLP}(\operatorname{RMSNorm}(\mathbf{h}')) \]
\[ \operatorname{MLP}(\mathbf{u}) = W_{\text{down}} \left( \operatorname{SiLU}(W_{\text{gate}} \mathbf{u}) \odot W_{\text{up}} \mathbf{u} \right) \]
\[ \operatorname{RMSNorm}(\mathbf{u}) = \frac{\mathbf{u}}{\sqrt{\frac{1}{d}\sum_i u_i^2 + \epsilon}} \odot \mathbf{g} \]
<h4>Where the parameters are</h4>
<p>With width \(d\) and MLP hidden size \(d_{ff}\) (often about \(\tfrac{8}{3}d\) to \(3.5d\)), one block holds roughly \(4d^2\) attention weights (fewer with grouped-query attention) and \(3\, d\, d_{ff}\) MLP weights. For \(d_{ff} \approx 3.5d\) that is about \(10.5 d^2\) in the MLP versus \(4d^2\) in attention, which is why the MLP holds about two thirds of the parameters. Total parameters \(\approx L \times 14.5\, d^2\) plus the embedding table.</p>`,
    tools: [
      { n: 'nanoGPT', d: 'A full GPT in about 300 lines of PyTorch, trainable on one GPU.', u: 'https://github.com/karpathy/nanoGPT', tag: 'Teaching code' },
      { n: 'Transformers model code', d: 'Read modeling_llama.py to see these exact equations in production code.', u: 'https://github.com/huggingface/transformers/tree/main/src/transformers/models/llama', tag: 'Open source' }
    ],
    refs: [
      { t: 'GLU Variants Improve Transformer (SwiGLU)', s: 'Shazeer, 2020', u: 'https://arxiv.org/abs/2002.05202' },
      { t: 'Root Mean Square Layer Normalization', s: 'Zhang and Sennrich, NeurIPS 2019', u: 'https://arxiv.org/abs/1910.07467' },
      { t: 'A Mathematical Framework for Transformer Circuits (the residual stream view)', s: 'Elhage et al., Anthropic, 2021', u: 'https://transformer-circuits.pub/2021/framework/index.html' },
      { t: "Let's build GPT: from scratch, in code, spelled out", s: 'Andrej Karpathy, video lecture', u: 'https://www.youtube.com/watch?v=kCc8FmEb1nY' }
    ]
  }
};

/* ---------- 5. Training ---------- */
DEEP['training'] = {
  0: {
    title: 'The loss, perplexity and compute',
    math: R`<p>Pretraining minimises the average negative log-likelihood (cross-entropy) of each true next token over a dataset \(\mathcal{D}\):</p>
\[ \mathcal{L}(\theta) = -\frac{1}{N}\sum_{t=1}^{N} \log p_\theta(x_t \mid x_{<t}) \]
<p><b>Perplexity</b> is the exponential of that loss, \(\operatorname{PPL} = e^{\mathcal{L}}\). A loss of 2.0 nats means a perplexity of about 7.4: on average the model is as uncertain as a fair choice among 7.4 tokens.</p>
<h4>How much compute?</h4>
<p>Training a dense model with \(N\) parameters on \(D\) tokens costs about</p>
\[ C \approx 6 N D \ \text{FLOPs} \]
<p>(2 for the forward pass and 4 for the backward pass, per parameter per token). An 8B model on 15 trillion tokens needs about \(7.2 \times 10^{23}\) FLOPs. The Chinchilla study found compute-optimal training at roughly \(D \approx 20N\); current models deliberately train far longer than that, because a smaller model that has seen more data is cheaper to serve.</p>`,
    code: [{ lang: 'python', title: 'The pretraining objective in PyTorch', src: R`
import torch.nn.functional as F

logits = model(input_ids).logits                  # (batch, seq, vocab)
# predict token t+1 from positions up to t: shift by one
loss = F.cross_entropy(
    logits[:, :-1].reshape(-1, logits.size(-1)),
    input_ids[:, 1:].reshape(-1),
)
perplexity = loss.exp()
loss.backward()                                    # gradients for every weight
optimizer.step(); optimizer.zero_grad()` }],
    refs: [
      { t: 'Training Compute-Optimal Large Language Models (Chinchilla)', s: 'Hoffmann et al., 2022', u: 'https://arxiv.org/abs/2203.15556' },
      { t: 'Scaling Laws for Neural Language Models', s: 'Kaplan et al., 2020', u: 'https://arxiv.org/abs/2001.08361' },
      { t: 'How to Scale Your Model', s: 'Google DeepMind, free online book on training and inference at scale', u: 'https://jax-ml.github.io/scaling-book/' }
    ]
  },
  1: {
    title: 'SFT, preference tuning and RL, in equations',
    math: R`<h4>Supervised fine-tuning</h4>
<p>Same cross-entropy as pretraining, but only on the assistant's tokens. Prompt tokens are masked out of the loss so the model learns to answer, not to imitate users:</p>
\[ \mathcal{L}_{\text{SFT}} = -\sum_{t \in \text{assistant}} \log p_\theta(y_t \mid x, y_{<t}) \]
<p>The conversations are rendered with the model's <b>chat template</b>, the exact special tokens that mark system, user and assistant turns (lesson 9 shows one). Training and serving must use the same template.</p>
<h4>Direct Preference Optimisation (DPO)</h4>
<p>Given a prompt \(x\), a preferred answer \(y_w\) and a rejected one \(y_l\), DPO raises the likelihood ratio of \(y_w\) over \(y_l\) relative to a frozen reference model \(\pi_{\text{ref}}\):</p>
\[ \mathcal{L}_{\text{DPO}} = -\log \sigma\left( \beta \log \frac{\pi_\theta(y_w \mid x)}{\pi_{\text{ref}}(y_w \mid x)} - \beta \log \frac{\pi_\theta(y_l \mid x)}{\pi_{\text{ref}}(y_l \mid x)} \right) \]
<h4>Reinforcement learning with verifiable rewards</h4>
<p>Sample several answers per prompt, score each with a checker (unit tests pass, maths answer matches), and push up the probability of answers that beat the group average. GRPO, used for DeepSeek-R1, computes each answer's advantage as \(A_i = (r_i - \bar{r}) / \operatorname{std}(r)\) within its group, avoiding a separate value model.</p>`,
    tools: [
      { n: 'TRL', d: "Hugging Face's library for SFT, DPO, GRPO and reward modelling.", u: 'https://huggingface.co/docs/trl', tag: 'Open source' },
      { n: 'OpenRLHF', d: 'Scalable RLHF and RL with verifiable rewards on Ray and vLLM.', u: 'https://github.com/OpenRLHF/OpenRLHF', tag: 'Open source' },
      { n: 'Hugging Face Datasets', d: 'Load, stream and preprocess training corpora and chat datasets.', u: 'https://huggingface.co/docs/datasets', tag: 'Open source' }
    ],
    refs: [
      { t: 'Training language models to follow instructions with human feedback (InstructGPT)', s: 'Ouyang et al., 2022', u: 'https://arxiv.org/abs/2203.02155' },
      { t: 'Direct Preference Optimization: Your Language Model is Secretly a Reward Model', s: 'Rafailov et al., NeurIPS 2023', u: 'https://arxiv.org/abs/2305.18290' },
      { t: 'DeepSeekMath (introduces GRPO)', s: 'Shao et al., 2024', u: 'https://arxiv.org/abs/2402.03300' },
      { t: 'DeepSeek-R1: Incentivizing Reasoning Capability via Reinforcement Learning', s: 'DeepSeek-AI, 2025', u: 'https://arxiv.org/abs/2501.12948' }
    ]
  },
  3: {
    title: 'LoRA in numbers, and a fine-tune you can run',
    math: R`<p>LoRA keeps a pretrained matrix \(W \in \mathbb{R}^{d \times k}\) frozen and learns a low-rank update:</p>
\[ W' = W + \frac{\alpha}{r} B A, \qquad B \in \mathbb{R}^{d \times r},\ A \in \mathbb{R}^{r \times k},\ r \ll \min(d,k) \]
<p>Trainable parameters per matrix drop from \(dk\) to \(r(d + k)\). For \(d = k = 4096\) and \(r = 16\): \(131{,}072\) instead of \(16{,}777{,}216\), about 0.8%. \(B\) starts at zero, so training begins exactly at the base model. After training, \(BA\) can be merged into \(W\) for zero serving overhead, or kept separate to hot-swap adapters.</p>
<p><b>QLoRA</b> stores the frozen base in 4-bit NF4 and trains LoRA adapters in 16-bit, which lets a 70B model be fine-tuned on a single 48 to 80 GB GPU.</p>
<h4>Memory for full fine-tuning</h4>
<p>Mixed-precision training with Adam needs about 16 bytes per parameter: 2 (BF16 weights) + 2 (gradients) + 4 (FP32 master weights) + 8 (two Adam moments), plus activations. An 8B model therefore needs about 128 GB before activations, which is why LoRA is the default for most teams.</p>`,
    code: [{ lang: 'python', title: 'LoRA supervised fine-tuning with TRL and PEFT', src: R`
# pip install trl peft datasets
from datasets import load_dataset
from peft import LoraConfig
from trl import SFTConfig, SFTTrainer

dataset = load_dataset("trl-lib/Capybara", split="train")   # chat-format conversations

trainer = SFTTrainer(
    model="Qwen/Qwen2.5-0.5B",
    train_dataset=dataset,
    args=SFTConfig(output_dir="qwen-lora", num_train_epochs=1,
                   per_device_train_batch_size=4, learning_rate=2e-4),
    peft_config=LoraConfig(r=16, lora_alpha=32, lora_dropout=0.05,
                           target_modules="all-linear", task_type="CAUSAL_LM"),
)
trainer.train()
trainer.save_model("qwen-lora")      # saves only the small adapter weights` }],
    tools: [
      { n: 'PEFT', d: 'LoRA, QLoRA and other parameter-efficient methods for Transformers models.', u: 'https://huggingface.co/docs/peft', tag: 'Open source' },
      { n: 'Unsloth', d: 'Fast, memory-efficient LoRA and full fine-tuning on a single GPU.', u: 'https://github.com/unslothai/unsloth', tag: 'Open source' },
      { n: 'Axolotl', d: 'Config-driven fine-tuning (YAML) across many architectures and GPUs.', u: 'https://github.com/axolotl-ai-cloud/axolotl', tag: 'Open source' },
      { n: 'LLaMA-Factory', d: 'Web UI and CLI for SFT, DPO and LoRA on 100+ models.', u: 'https://github.com/hiyouga/LLaMA-Factory', tag: 'Open source' },
      { n: 'DeepSpeed', d: 'ZeRO sharding to fit full fine-tuning and pretraining across GPUs.', u: 'https://github.com/deepspeedai/DeepSpeed', tag: 'Open source' },
      { n: 'Weights & Biases', d: 'Track losses, learning rates and evals for every run.', u: 'https://wandb.ai', tag: 'Managed' }
    ],
    refs: [
      { t: 'LoRA: Low-Rank Adaptation of Large Language Models', s: 'Hu et al., ICLR 2022', u: 'https://arxiv.org/abs/2106.09685' },
      { t: 'QLoRA: Efficient Finetuning of Quantized LLMs', s: 'Dettmers et al., NeurIPS 2023', u: 'https://arxiv.org/abs/2305.14314' },
      { t: 'LoRA Learns Less and Forgets Less', s: 'Biderman et al., 2024', u: 'https://arxiv.org/abs/2405.09673' }
    ]
  }
};

/* ---------- 6. GPUs ---------- */
DEEP['gpus'] = {
  0: {
    title: 'Sizing GPU memory',
    math: R`<p>Weights alone need</p>
\[ M_{\text{weights}} = N \times b \]
<p>with \(N\) parameters and \(b\) bytes per parameter. Then add the KV cache (next lesson), activations and runtime overhead, typically 10 to 20% on top.</p>
<div class="tbl-wrap"><table><thead><tr><th>Format</th><th>Bytes per parameter</th><th>8B model</th><th>70B model</th></tr></thead><tbody>
<tr><td>FP32</td><td>4</td><td>32 GB</td><td>280 GB</td></tr>
<tr><td>BF16 / FP16</td><td>2</td><td>16 GB</td><td>140 GB</td></tr>
<tr><td>FP8 / INT8</td><td>1</td><td>8 GB</td><td>70 GB</td></tr>
<tr><td>INT4 / FP4</td><td>0.5 (+ scales)</td><td>about 4.5 GB</td><td>about 38 GB</td></tr>
</tbody></table></div>
<p>Reference cards: NVIDIA H100 SXM has 80 GB of HBM3 at about 3.35 TB/s; H200 has 141 GB at about 4.8 TB/s; B200 has about 180 GB at about 8 TB/s. Always check the exact SKU, because PCIe and SXM variants differ.</p>`,
    code: [{ lang: 'bash', title: 'See what is actually on the card', src: R`
nvidia-smi --query-gpu=name,memory.total,memory.used,utilization.gpu --format=csv
# inside Python
python -c "import torch; print(torch.cuda.mem_get_info())"   # (free, total) bytes` }],
    tools: [
      { n: 'nvidia-smi', d: 'Inspect GPU memory, utilisation and processes.', u: 'https://developer.nvidia.com/system-management-interface', tag: 'Tool' },
      { n: 'Hugging Face model memory estimator', d: 'Estimate memory for inference and training of any Hub model.', u: 'https://huggingface.co/docs/accelerate/usage_guides/model_size_estimator', tag: 'Tool' }
    ],
    refs: [
      { t: 'NVIDIA H100 Tensor Core GPU', s: 'NVIDIA product page and datasheet', u: 'https://www.nvidia.com/en-us/data-center/h100/' },
      { t: 'How to Scale Your Model: rooflines and memory', s: 'Google DeepMind, free online book', u: 'https://jax-ml.github.io/scaling-book/roofline/' }
    ]
  },
  2: {
    title: 'The bandwidth bound and quantization',
    math: R`<p>At batch size 1, every decoded token must stream all active weights from HBM once, so</p>
\[ \text{tokens/s} \lesssim \frac{\text{memory bandwidth}}{N_{\text{active}} \times b} \]
<p>A 70B model in FP8 on one H100 (3.35 TB/s): \(3.35 \times 10^{12} / 70 \times 10^{9} \approx 48\) tokens per second at best. An 8B model in BF16: about 210. Batching reuses each weight read across many sequences, which is why servers batch (lesson 8).</p>
<h4>Arithmetic intensity</h4>
<p>A kernel is memory-bound when its FLOPs per byte moved fall below the hardware ratio (about 300 FLOPs/byte for BF16 on H100). Decode at small batch does about 2 FLOPs per weight per token, far below that line; prefill on long prompts is compute-bound.</p>
<h4>Quantization</h4>
<p>Uniform quantization maps a real weight \(w\) to a small integer with a scale \(s\) and zero point \(z\):</p>
\[ q = \operatorname{round}\left(\frac{w}{s}\right) + z, \qquad \hat{w} = s\,(q - z) \]
<p>Scales are stored per channel or per group of 32 to 128 weights. Methods differ in how they choose scales to protect important weights: GPTQ uses second-order error correction, AWQ protects channels with large activations, and FP8 or FP4 formats keep a floating-point shape with tiny exponents.</p>`,
    code: [
      { lang: 'python', title: 'Load a model in 4-bit with bitsandbytes', src: R`
import torch
from transformers import AutoModelForCausalLM, BitsAndBytesConfig

bnb = BitsAndBytesConfig(load_in_4bit=True, bnb_4bit_quant_type="nf4",
                         bnb_4bit_compute_dtype=torch.bfloat16)
model = AutoModelForCausalLM.from_pretrained("Qwen/Qwen2.5-7B-Instruct",
                                             quantization_config=bnb, device_map="auto")
print(model.get_memory_footprint() / 1e9, "GB")` },
      { lang: 'bash', title: 'Serve a pre-quantized FP8 checkpoint with vLLM', src: R`
vllm serve RedHatAI/Meta-Llama-3.1-8B-Instruct-FP8 --max-model-len 16384` }
    ],
    tools: [
      { n: 'bitsandbytes', d: '8-bit and 4-bit (NF4) quantization, used by QLoRA.', u: 'https://github.com/bitsandbytes-foundation/bitsandbytes', tag: 'Open source' },
      { n: 'LLM Compressor', d: 'Produce GPTQ, AWQ, FP8 and FP4 checkpoints that vLLM serves directly.', u: 'https://github.com/vllm-project/llm-compressor', tag: 'Open source' },
      { n: 'llama.cpp GGUF', d: 'Quantize to GGUF (Q4_K_M and friends) for CPU, Apple Silicon and consumer GPUs.', u: 'https://github.com/ggml-org/llama.cpp', tag: 'Open source' },
      { n: 'TensorRT Model Optimizer', d: "NVIDIA's quantization toolkit for FP8 and FP4 on Hopper and Blackwell.", u: 'https://github.com/NVIDIA/TensorRT-Model-Optimizer', tag: 'Open source' }
    ],
    refs: [
      { t: 'GPTQ: Accurate Post-Training Quantization for Generative Pre-trained Transformers', s: 'Frantar et al., ICLR 2023', u: 'https://arxiv.org/abs/2210.17323' },
      { t: 'AWQ: Activation-aware Weight Quantization', s: 'Lin et al., MLSys 2024', u: 'https://arxiv.org/abs/2306.00978' },
      { t: 'LLM.int8(): 8-bit Matrix Multiplication for Transformers at Scale', s: 'Dettmers et al., NeurIPS 2022', u: 'https://arxiv.org/abs/2208.07339' }
    ]
  },
  3: {
    title: 'Parallelism and mixture-of-experts',
    math: R`<h4>Tensor parallelism</h4>
<p>Split a weight matrix column-wise across \(g\) GPUs: \(W = [W_1, \dots, W_g]\). Each GPU computes \(X W_i\), and an all-reduce combines results after each block. Communication happens every layer, so tensor parallelism stays inside one server with NVLink.</p>
<h4>Pipeline parallelism</h4>
<p>Layers \(1..L\) are split into \(g\) stages. Activations flow between stages once per micro-batch, so it tolerates slower links and spans servers.</p>
<h4>Mixture-of-experts routing</h4>
<p>A router scores \(E\) expert MLPs for each token and keeps the top \(k\):</p>
\[ \mathbf{y} = \sum_{e \in \operatorname{TopK}(\mathbf{g}(\mathbf{h}),\,k)} g_e(\mathbf{h})\, \operatorname{MLP}_e(\mathbf{h}) \]
<p>Compute per token scales with \(k\), memory scales with \(E\). An auxiliary loss keeps experts evenly loaded.</p>`,
    code: [{ lang: 'bash', title: 'Split a 70B model across 4 GPUs in vLLM', src: R`
vllm serve meta-llama/Llama-3.1-70B-Instruct --tensor-parallel-size 4
# two servers of 8 GPUs: tensor parallel inside each, pipeline parallel across them
vllm serve <model> --tensor-parallel-size 8 --pipeline-parallel-size 2` }],
    tools: [
      { n: 'Megatron-LM', d: "NVIDIA's reference for tensor, pipeline and expert parallel training.", u: 'https://github.com/NVIDIA/Megatron-LM', tag: 'Open source' },
      { n: 'PyTorch FSDP', d: 'Fully sharded data parallel training built into PyTorch.', u: 'https://docs.pytorch.org/docs/stable/fsdp.html', tag: 'Open source' }
    ],
    refs: [
      { t: 'Outrageously Large Neural Networks: The Sparsely-Gated Mixture-of-Experts Layer', s: 'Shazeer et al., ICLR 2017', u: 'https://arxiv.org/abs/1701.06538' },
      { t: 'Switch Transformers', s: 'Fedus, Zoph and Shazeer, JMLR 2022', u: 'https://arxiv.org/abs/2101.03961' },
      { t: 'Megatron-LM: Training Multi-Billion Parameter Language Models Using Model Parallelism', s: 'Shoeybi et al., 2019', u: 'https://arxiv.org/abs/1909.08053' }
    ]
  }
};

/* ---------- 7. KV cache ---------- */
DEEP['kv-cache'] = {
  1: {
    title: 'The cache formula, worked',
    math: R`<p>For each token, every layer stores one key and one value vector per KV head:</p>
\[ \text{bytes per token} = 2 \cdot L \cdot H_{kv} \cdot d_h \cdot b \]
\[ M_{\text{KV}} = \text{bytes per token} \times \text{tokens per sequence} \times \text{concurrent sequences} \]
<p>Llama 3.1 70B: \(L = 80\) layers, \(H_{kv} = 8\), \(d_h = 128\), BF16 (\(b = 2\)):</p>
\[ 2 \cdot 80 \cdot 8 \cdot 128 \cdot 2 = 327{,}680 \text{ bytes} = 320 \text{ KiB per token} \]
<p>A 128k-token conversation then needs \(131{,}072 \times 327{,}680 \approx 43\) GB.</p>
<h4>Variants that shrink it</h4>
<ul>
<li><b>Multi-query attention (MQA):</b> \(H_{kv} = 1\).</li>
<li><b>Grouped-query attention (GQA):</b> \(H_{kv}\) groups shared by many query heads (Llama 3 uses 8 for 64 query heads).</li>
<li><b>Multi-head latent attention (MLA):</b> DeepSeek-V2 and V3 cache one compressed latent vector per token and reconstruct keys and values from it.</li>
<li><b>FP8 cache:</b> \(b = 1\), half the footprint.</li>
</ul>`,
    code: [{ lang: 'python', title: 'Compute it for any Hugging Face model', src: R`
from transformers import AutoConfig

cfg = AutoConfig.from_pretrained("Qwen/Qwen2.5-7B-Instruct")
head_dim = getattr(cfg, "head_dim", None) or cfg.hidden_size // cfg.num_attention_heads
per_token = 2 * cfg.num_hidden_layers * cfg.num_key_value_heads * head_dim * 2   # BF16
print(per_token / 1024, "KiB per token")
print(per_token * 32_768 / 1e9, "GB for one 32k-token sequence")` }],
    refs: [
      { t: 'GQA: Training Generalized Multi-Query Transformer Models', s: 'Ainslie et al., EMNLP 2023', u: 'https://arxiv.org/abs/2305.13245' },
      { t: 'Fast Transformer Decoding: One Write-Head is All You Need (MQA)', s: 'Shazeer, 2019', u: 'https://arxiv.org/abs/1911.02150' },
      { t: 'DeepSeek-V2 (multi-head latent attention)', s: 'DeepSeek-AI, 2024', u: 'https://arxiv.org/abs/2405.04434' }
    ]
  },
  3: {
    title: 'Turning these tricks on',
    code: [
      { lang: 'python', title: 'vLLM: prefix caching and an FP8 cache', src: R`
from vllm import LLM, SamplingParams

llm = LLM(
    model="Qwen/Qwen2.5-7B-Instruct",
    enable_prefix_caching=True,      # reuse KV blocks of requests that share a prefix
    kv_cache_dtype="fp8",            # half the cache memory
    gpu_memory_utilization=0.90,     # fraction of HBM for weights plus cache
    max_model_len=32768,
)
out = llm.generate(["...long shared system prompt... Question: ..."],
                   SamplingParams(temperature=0.2, max_tokens=200))` },
      { lang: 'python', title: 'Provider prompt caching (Claude): mark the stable prefix', src: R`
resp = client.messages.create(
    model="claude-sonnet-5-5",
    max_tokens=500,
    system=[{
        "type": "text",
        "text": LONG_POLICY_AND_TOOL_GUIDE,          # thousands of stable tokens
        "cache_control": {"type": "ephemeral"},      # cache everything up to here
    }],
    messages=[{"role": "user", "content": question}],   # changing part goes last
)
print(resp.usage.cache_read_input_tokens, resp.usage.cache_creation_input_tokens)` }
    ],
    tools: [
      { n: 'vLLM PagedAttention', d: 'Block-based KV cache with automatic prefix caching.', u: 'https://docs.vllm.ai/en/latest/design/prefix_caching.html', tag: 'Open source' },
      { n: 'SGLang RadixAttention', d: 'Caches shared prefixes in a radix tree across requests.', u: 'https://github.com/sgl-project/sglang', tag: 'Open source' },
      { n: 'LMCache', d: 'Offload and share KV caches across GPUs, CPU memory and disk.', u: 'https://github.com/LMCache/LMCache', tag: 'Open source' },
      { n: 'Claude prompt caching', d: 'Cache marked prefixes; cached reads are billed at a fraction of input price.', u: CLAUDE_DOCS + '/build-with-claude/prompt-caching', tag: 'API' },
      { n: 'OpenAI prompt caching', d: 'Automatic caching of repeated prefixes over a length threshold.', u: 'https://platform.openai.com/docs/guides/prompt-caching', tag: 'API' }
    ],
    refs: [
      { t: 'Efficient Memory Management for LLM Serving with PagedAttention', s: 'Kwon et al., SOSP 2023', u: 'https://arxiv.org/abs/2309.06180' },
      { t: 'SGLang: Efficient Execution of Structured Language Model Programs', s: 'Zheng et al., 2023', u: 'https://arxiv.org/abs/2312.07104' }
    ]
  }
};

/* ---------- 8. Serving ---------- */
DEEP['serving'] = {
  1: {
    title: 'Why batching is almost free',
    math: R`<p>One decode step with batch size \(B\) reads the weights once and performs \(B\) times the arithmetic. While the step is memory-bound, its time barely changes with \(B\), so throughput rises almost linearly:</p>
\[ \text{throughput} \approx \frac{B}{t_{\text{step}}(B)}, \qquad t_{\text{step}}(B) \approx \max\left( \frac{N b}{\text{BW}},\ \frac{2 N B}{\text{FLOPS}} \right) \]
<p>The first term (reading weights) dominates until \(B\) reaches the hardware's FLOPs-per-byte ratio; after that the GPU becomes compute-bound and extra users add latency. In practice the KV cache usually runs out of memory first, which caps \(B\).</p>
<p><b>Continuous batching</b> schedules at the granularity of one decode step: whenever a sequence finishes, a waiting request takes its slot on the next step, so the batch stays full.</p>`,
    refs: [
      { t: 'Orca: A Distributed Serving System for Transformer-Based Generative Models (iteration-level scheduling)', s: 'Yu et al., OSDI 2022', u: 'https://www.usenix.org/conference/osdi22/presentation/yu' },
      { t: 'How continuous batching enables 23x throughput in LLM inference', s: 'Anyscale engineering blog', u: 'https://www.anyscale.com/blog/continuous-batching-llm-inference' }
    ]
  },
  2: {
    title: 'Latency maths and speculative decoding',
    math: R`<p>For a response of \(m\) output tokens:</p>
\[ T_{\text{total}} = \text{TTFT} + (m - 1)\cdot\text{TPOT} \]
<p>Capacity planning uses Little's law: the average number of requests in the system equals arrival rate times time in system, \(L = \lambda W\). At 20 requests per second and 6 seconds each, about 120 requests are in flight; size the batch and KV cache for that.</p>
<h4>Speculative decoding</h4>
<p>A small draft model proposes \(\gamma\) tokens; the large model verifies all of them in one parallel pass and keeps the longest accepted prefix. With acceptance rate \(\alpha\) per token, the expected tokens per large-model pass is</p>
\[ \mathbb{E}[\text{tokens}] = \frac{1 - \alpha^{\gamma + 1}}{1 - \alpha} \]
<p>With \(\alpha = 0.8\) and \(\gamma = 4\) that is about 3.4 tokens per pass. The output distribution is provably unchanged.</p>
<h4>Disaggregated serving</h4>
<p>Prefill is compute-bound and decode is memory-bound, so large deployments run them on separate GPU pools and ship the KV cache between them, tuning each pool for its own bottleneck.</p>`,
    code: [{ lang: 'bash', title: 'Benchmark TTFT, TPOT and throughput against your server', src: R`
vllm bench serve --model Qwen/Qwen2.5-7B-Instruct \
  --dataset-name random --random-input-len 2000 --random-output-len 300 \
  --num-prompts 200 --request-rate 8
# reports mean and p99 TTFT, TPOT and output tokens per second` }],
    tools: [
      { n: 'GuideLLM', d: 'Load-test LLM servers and report latency percentiles across request rates.', u: 'https://github.com/vllm-project/guidellm', tag: 'Open source' }
    ],
    refs: [
      { t: 'Fast Inference from Transformers via Speculative Decoding', s: 'Leviathan, Kalman and Matias, ICML 2023', u: 'https://arxiv.org/abs/2211.17192' },
      { t: 'DistServe: Disaggregating Prefill and Decoding for Goodput-optimized LLM Serving', s: 'Zhong et al., OSDI 2024', u: 'https://arxiv.org/abs/2401.09670' }
    ]
  },
  4: {
    title: 'Build the roof yourself',
    codeNote: 'Most open engines expose an OpenAI-compatible API, so the same client code talks to vLLM, SGLang, Ollama or a gateway in front of several providers.',
    code: [
      { lang: 'bash', title: 'Start an OpenAI-compatible server', src: R`
pip install vllm
vllm serve Qwen/Qwen2.5-7B-Instruct --port 8000 --max-model-len 32768` },
      { lang: 'python', title: 'Stream tokens from it', src: R`
from openai import OpenAI

client = OpenAI(base_url="http://localhost:8000/v1", api_key="unused")
stream = client.chat.completions.create(
    model="Qwen/Qwen2.5-7B-Instruct",
    messages=[{"role": "user", "content": "Explain the KV cache in two sentences."}],
    temperature=0.3, max_tokens=200, stream=True,
)
for chunk in stream:                      # server-sent events, one delta per token batch
    print(chunk.choices[0].delta.content or "", end="", flush=True)` }
    ],
    tools: [
      { n: 'vLLM', d: 'High-throughput serving with PagedAttention and continuous batching.', u: 'https://docs.vllm.ai', tag: 'Open source' },
      { n: 'SGLang', d: 'Fast serving with RadixAttention prefix caching and structured outputs.', u: 'https://github.com/sgl-project/sglang', tag: 'Open source' },
      { n: 'TensorRT-LLM', d: "NVIDIA's optimised inference engine for its GPUs.", u: 'https://github.com/NVIDIA/TensorRT-LLM', tag: 'Open source' },
      { n: 'NVIDIA Dynamo', d: 'Datacenter-scale distributed serving with disaggregated prefill and decode.', u: 'https://github.com/ai-dynamo/dynamo', tag: 'Open source' },
      { n: 'Ollama', d: 'Local serving for laptops and workstations.', u: 'https://ollama.com', tag: 'Open source' },
      { n: 'LiteLLM', d: 'One OpenAI-style gateway for 100+ providers, with routing, budgets and logging.', u: 'https://github.com/BerriAI/litellm', tag: 'Open source' },
      { n: 'KServe', d: 'Kubernetes-native model serving and autoscaling.', u: 'https://kserve.github.io/website/', tag: 'Open source' }
    ],
    refs: [
      { t: 'vLLM documentation: OpenAI-compatible server', s: 'vLLM project', u: 'https://docs.vllm.ai/en/latest/serving/openai_compatible_server.html' },
      { t: 'Server-sent events', s: 'MDN Web Docs', u: 'https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events' }
    ]
  }
};

/* ---------- 9. Context is the program ---------- */
DEEP['context'] = {
  0: {
    title: 'Chat templates: what the model really reads',
    math: R`<p>The API's list of messages is not what the network sees. A <b>chat template</b> renders it into one token sequence with special tokens marking each role. Qwen and many other models use the ChatML format:</p>
<div class="mono-box">&lt;|im_start|&gt;system
You are a part-of-speech tagger. Reply in JSON.&lt;|im_end|&gt;
&lt;|im_start|&gt;user
Paris&lt;|im_end|&gt;
&lt;|im_start|&gt;assistant
</div>
<p>Llama 3 uses different markers (<code>&lt;|start_header_id|&gt;user&lt;|end_header_id|&gt;</code> … <code>&lt;|eot_id|&gt;</code>). The final open assistant header is the <em>generation prompt</em>: the model continues from there. Templates are stored as Jinja in the model's <code>tokenizer_config.json</code> or <code>chat_template.jinja</code>.</p>
<h4>Rules when designing or changing a template</h4>
<ul>
<li>Serve with exactly the template used in fine-tuning. A missing newline or role marker measurably hurts quality.</li>
<li>Role markers must be single special tokens that users cannot type, or prompt injection gets easier.</li>
<li>Include tool definitions, tool calls and tool results in the template if the model will use tools.</li>
<li>When fine-tuning, mask the loss on everything except assistant turns.</li>
</ul>`,
    code: [
      { lang: 'python', title: 'Render a conversation with the model’s own template', src: R`
from transformers import AutoTokenizer

tok = AutoTokenizer.from_pretrained("Qwen/Qwen2.5-7B-Instruct")
messages = [
    {"role": "system", "content": "You are a part-of-speech tagger. Reply in JSON."},
    {"role": "user", "content": "Paris"},
]
text = tok.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
print(text)                       # the exact string the model receives
ids = tok.apply_chat_template(messages, add_generation_prompt=True)
print(len(ids), "tokens")` },
      { lang: 'jinja', title: 'A minimal ChatML template (Jinja)', src: R`
{% for m in messages %}<|im_start|>{{ m['role'] }}
{{ m['content'] }}<|im_end|>
{% endfor %}{% if add_generation_prompt %}<|im_start|>assistant
{% endif %}` }
    ],
    tools: [
      { n: 'Transformers chat templates', d: 'apply_chat_template, template authoring and tool-use templates.', u: 'https://huggingface.co/docs/transformers/chat_templating', tag: 'Open source' },
      { n: 'Jinja', d: 'The template language chat templates are written in.', u: 'https://jinja.palletsprojects.com', tag: 'Open source' }
    ],
    refs: [
      { t: 'Chat templates', s: 'Hugging Face Transformers documentation', u: 'https://huggingface.co/docs/transformers/chat_templating' },
      { t: 'Prompt engineering overview: system prompts and roles', s: 'Claude Developer Platform', u: CLAUDE_DOCS + '/build-with-claude/prompt-engineering/overview' }
    ]
  },
  3: {
    title: 'Budgeting the window',
    math: R`<p>Every call must satisfy</p>
\[ T_{\text{system}} + T_{\text{tools}} + T_{\text{history}} + T_{\text{retrieved}} + T_{\text{user}} + T_{\text{max output}} \le W \]
<p>where \(W\) is the context window. Cost per call is roughly \(\text{input tokens} \times p_{\text{in}} + \text{output tokens} \times p_{\text{out}}\), so a chat that re-sends history pays for turn 1 on every later turn: total input over \(n\) turns grows as \(O(n^2)\).</p>
<h4>Strategies when history grows</h4>
<ul>
<li><b>Sliding window:</b> keep the system prompt and the last \(k\) turns. Simple, forgets early facts.</li>
<li><b>Summarise and truncate:</b> replace old turns with a running summary written by a model.</li>
<li><b>Retrieve from history:</b> embed past turns and fetch only relevant ones (RAG over the conversation).</li>
<li><b>Count before you send:</b> measure tokens with the provider's counter rather than guessing from characters.</li>
</ul>`,
    code: [
      { lang: 'python', title: 'Count tokens before sending (Claude)', src: R`
count = client.messages.count_tokens(
    model="claude-sonnet-5-5",
    system=SYSTEM_PROMPT,
    messages=history,
)
print(count.input_tokens)` },
      { lang: 'python', title: 'A simple history trimmer', src: R`
def trim(history, budget, count):
    """Drop the oldest turns until the conversation fits the token budget."""
    kept = list(history)
    while kept and count(kept) > budget:
        kept = kept[2:]          # remove one user and assistant pair
    return kept` }
    ],
    tools: [
      { n: 'Claude token counting', d: 'Exact input token counts for a prospective request.', u: CLAUDE_DOCS + '/build-with-claude/token-counting', tag: 'API' },
      { n: 'tiktoken', d: 'Count tokens locally for OpenAI tokenizers.', u: 'https://github.com/openai/tiktoken', tag: 'Open source' }
    ],
    refs: [
      { t: 'Lost in the Middle: How Language Models Use Long Contexts', s: 'Liu et al., TACL 2024', u: 'https://arxiv.org/abs/2307.03172' },
      { t: 'Context Rot: How Increasing Input Tokens Impacts LLM Performance', s: 'Chroma Research, 2025', u: 'https://research.trychroma.com/context-rot' }
    ]
  }
};

/* ---------- 10. Steering ---------- */
DEEP['steering'] = {
  0: {
    title: 'Writing good few-shot examples',
    math: R`<ul>
<li>Use 3 to 5 examples that cover the hard cases: an empty field, an ambiguous input, the wrong language.</li>
<li>Vary them. Models copy surface patterns, so five examples with the same length or the same answer bias the output.</li>
<li>Wrap examples in clear tags (for example <code>&lt;example&gt;</code>) so they are not mistaken for the real input.</li>
<li>Put examples in the stable part of the prompt so prompt caching covers them.</li>
<li>When examples alone are not enough, combine them with a schema (next step) or fine-tune.</li>
</ul>`,
    refs: [
      { t: 'Language Models are Few-Shot Learners (GPT-3)', s: 'Brown et al., NeurIPS 2020', u: 'https://arxiv.org/abs/2005.14165' },
      { t: 'Prompting best practices, including using examples', s: 'Claude Developer Platform', u: CLAUDE_DOCS + '/build-with-claude/prompt-engineering/claude-prompting-best-practices' }
    ]
  },
  1: {
    title: 'Constrained decoding, formally and in code',
    math: R`<p>A grammar or JSON schema is compiled into an automaton. At step \(t\) its state \(s_t\) defines the set of tokens \(A(s_t)\) that keep the output valid. The sampler sees masked logits:</p>
\[ z'_i = \begin{cases} z_i & i \in A(s_t) \\ -\infty & \text{otherwise} \end{cases} \]
<p>After softmax every invalid token has probability exactly zero, so the output parses by construction. Engines such as XGrammar precompute most masks so the overhead per token is microseconds.</p>
<p>Caveat: constraints guarantee <em>syntax</em>, not <em>truth</em>. A field can be valid JSON and still wrong; validate values in code.</p>`,
    code: [{ lang: 'python', title: 'JSON schema output from a Pydantic model', src: R`
# Works with OpenAI and with OpenAI-compatible servers such as vLLM and SGLang
from typing import Literal
from pydantic import BaseModel
from openai import OpenAI

class Tag(BaseModel):
    word: str
    pos: Literal["NOUN", "VERB", "ADJ", "OTHER"]

client = OpenAI(base_url="http://localhost:8000/v1", api_key="unused")
resp = client.chat.completions.create(
    model="Qwen/Qwen2.5-7B-Instruct",
    messages=[{"role": "user", "content": "Tag the word: Paris"}],
    response_format={"type": "json_schema",
                     "json_schema": {"name": "tag", "schema": Tag.model_json_schema(), "strict": True}},
)
tag = Tag.model_validate_json(resp.choices[0].message.content)   # always parses
print(tag)` }],
    tools: [
      { n: 'XGrammar', d: 'Fast grammar-constrained decoding; default backend in vLLM and SGLang.', u: 'https://github.com/mlc-ai/xgrammar', tag: 'Open source' },
      { n: 'llguidance', d: 'Low-latency constraint engine for JSON schema, regex and grammars.', u: 'https://github.com/guidance-ai/llguidance', tag: 'Open source' },
      { n: 'Outlines', d: 'Structured generation with Pydantic, regex and grammars in Python.', u: 'https://github.com/dottxt-ai/outlines', tag: 'Open source' },
      { n: 'Instructor', d: 'Typed, validated outputs from many providers using Pydantic.', u: 'https://github.com/567-labs/instructor', tag: 'Open source' },
      { n: 'Claude structured outputs', d: 'Schema-guaranteed JSON and strict tool inputs on Claude.', u: CLAUDE_DOCS + '/build-with-claude/structured-outputs', tag: 'API' },
      { n: 'OpenAI Structured Outputs', d: 'json_schema response format with strict mode.', u: 'https://platform.openai.com/docs/guides/structured-outputs', tag: 'API' }
    ],
    refs: [
      { t: 'Efficient Guided Generation for Large Language Models (the Outlines method)', s: 'Willard and Louf, 2023', u: 'https://arxiv.org/abs/2307.09702' },
      { t: 'XGrammar: Flexible and Efficient Structured Generation Engine', s: 'Dong et al., 2024', u: 'https://arxiv.org/abs/2411.15100' },
      { t: 'Structured outputs in vLLM', s: 'vLLM documentation', u: 'https://docs.vllm.ai/en/latest/features/structured_outputs.html' }
    ]
  },
  3: {
    title: 'Reasoning budgets and sampling more than once',
    math: R`<p>If one sampled answer is correct with probability \(p\), drawing \(k\) independent samples and checking them gives</p>
\[ \text{pass@}k = 1 - (1 - p)^{k} \]
<p>With \(p = 0.4\) and \(k = 5\), pass@5 is about 0.92. When no checker exists, <b>self-consistency</b> takes the majority answer across samples, which helps whenever correct reasoning paths agree more often than wrong ones.</p>
<p>Reasoning models move this search inside one response: they spend output tokens exploring and checking before answering. Cost scales with thinking tokens, so set the effort level per task and measure the accuracy gain against latency.</p>`,
    code: [{ lang: 'python', title: 'Turning on thinking for a hard task (Claude)', src: R`
resp = client.messages.create(
    model="claude-sonnet-5-5",
    max_tokens=16000,
    thinking={"type": "adaptive"},          # the model decides how long to think
    output_config={"effort": "high"},       # low, medium or high: trade cost for depth
    messages=[{"role": "user", "content": TRIP_PLANNING_TASK}],
)
for block in resp.content:
    if block.type == "text":
        print(block.text)` }],
    codeNote: 'Older models use <code>thinking={"type": "enabled", "budget_tokens": N}</code> instead. Check the provider’s documentation for the model you deploy.',
    tools: [
      { n: 'Claude extended thinking', d: 'Adaptive thinking and effort levels.', u: CLAUDE_DOCS + '/build-with-claude/extended-thinking', tag: 'API' },
      { n: 'OpenAI reasoning models', d: 'reasoning.effort and reasoning summaries.', u: 'https://platform.openai.com/docs/guides/reasoning', tag: 'API' }
    ],
    refs: [
      { t: 'Chain-of-Thought Prompting Elicits Reasoning in Large Language Models', s: 'Wei et al., NeurIPS 2022', u: 'https://arxiv.org/abs/2201.11903' },
      { t: 'Self-Consistency Improves Chain of Thought Reasoning in Language Models', s: 'Wang et al., ICLR 2023', u: 'https://arxiv.org/abs/2203.11171' },
      { t: 'Evaluating Large Language Models Trained on Code (defines pass@k)', s: 'Chen et al., 2021', u: 'https://arxiv.org/abs/2107.03374' }
    ]
  }
};
