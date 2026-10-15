# AI Engineering Blueprint

An interactive, Brilliant-style course on AI engineering. It starts from the smallest true picture of an AI system, a model and the context you give it, and builds the whole field on top of it one block at a time: tokens, attention, training, GPUs, the KV cache, serving, context engineering, structured output, RAG, tool calling, MCP, agent harnesses, multi-agent systems and production evals.

**Live site:** https://sawabs.github.io/ai-engineering-blueprint/

## What is inside

- **19 lessons in 8 levels** on a winding course map, with 92 exercises revealed one idea at a time.
- **35 interactives**: a temperature and top-p sampler, a tokenizer (including Sorani Kurdish), an attention map, GPU memory and KV cache calculators, a batching simulator, a retrieval lab with BM25 and hybrid search, constrained decoding, an MCP message stepper, an agent loop and more.
- **The blueprint board**: a pannable, zoomable map of the whole system. Lessons open in a resizable side panel (a bottom sheet on phones), a build view shows what you have learned so far, and a guided tour traces one request through every component.
- Light and dark themes, daily streaks, and soft synthesized interaction sounds.

## Development

The site is a single static page with no build dependencies. Edit the files in `src/`, then run:

```sh
./build.sh
```

This writes `index.html`, which GitHub Pages serves from the repository root. Progress, streaks and theme are stored in the visitor's browser only.

---

Designed and built by Sawab Sarkavri.
