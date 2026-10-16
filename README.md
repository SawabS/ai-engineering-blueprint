# AI Engineering Blueprint

An interactive, Brilliant-style course on AI engineering. It starts from the smallest real AI system, one application sending one request to a model API, and grows it only when a need appears that the system cannot meet: what the model returns, what you pay for, structured output, your own knowledge (RAG), actions (tools and MCP), long multi-step tasks (agents, context engineering, sub-agents), then the model itself (attention, training), running it yourself (GPUs, the KV cache, serving) and production (evals, guardrails, tracing, cost). By the end, a software engineer can read the architecture of ChatGPT, Claude Code or an enterprise AI integration and knows which layer to change, with which tools.

**Live site:** https://sawabs.github.io/ai-engineering-blueprint/

## What is inside

- **19 lessons in 8 levels**, application first: One request, Shaping the request, Your own knowledge, Taking action, Agents, Inside the model, Running it yourself, Production. Every lesson opens with the need it meets and ends by adding one component to the system. 92 exercises are revealed one idea at a time.
- **35 interactives**: a temperature and top-p sampler, a tokenizer (including Sorani Kurdish), an attention map, GPU memory and KV cache calculators, a batching simulator, a retrieval lab with BM25 and hybrid search, constrained decoding, an MCP message stepper, an agent loop and more.
- **Go deeper drawers** on 47 steps across every lesson: the actual equations (typeset with KaTeX, self-hosted in `vendor/katex` under its MIT licence, with an accessible MathML copy for screen readers), runnable Python, SQL and shell examples, the industry tools used for that block (SentencePiece, vLLM, pgvector, Qdrant, TRL, MCP SDKs, OpenTelemetry and many more), practical guidance such as choosing a temperature, and primary sources. Each finished lesson ends with its toolkit.
- **The system map**: a layered reference architecture read top to bottom as the path of one request (clients, orchestration, context, model API, model, compute, with evals cutting across every layer). Each block appears in the lesson that adds it. The map is pannable and zoomable, lessons open in a resizable side panel (a bottom sheet on phones), a build view shows what you have learned so far, and a guided tour follows one request down through the layers and back up. The finale maps a one-call feature, a chat assistant, a coding agent and an enterprise integration onto the same diagram.
- **The system explorer**: every block on the map opens a detailed architecture view, and blocks inside those views open further views, 17 in all and about 200 components: inputs and outputs, the model's forward pass, the tokenizer, one transformer block, decoding, training, GPUs, the KV cache manager, the serving stack, context assembly, the RAG pipeline, tool calling, MCP, the agent harness, memory and skills, multi-agent systems and production operations. Select any component for an inspector with its role, key figures, connections, tools and lesson; play each view's request flow; search every component; climb back with the breadcrumb or Esc. Views have deep links such as `#board:serving`.
- Light and dark themes, daily streaks, and soft synthesized interaction sounds.

## Development

The site is a single static page plus the vendored KaTeX files, with no build dependencies. Edit the files in `src/`, then run:

```sh
./build.sh
```

This writes `index.html`, which GitHub Pages serves from the repository root. Progress, streaks and theme are stored in the visitor's browser only. The build pins the inline script with a SHA-256 hash in the page's Content-Security-Policy, so always rebuild after editing `src/`.

## Testing

The QA suite uses Playwright and axe-core:

```sh
npm install
npx playwright install chromium   # once
npm test                          # functional, adversarial, layout, accessibility and security checks
npm run test:visual               # screenshot comparison against the committed baselines
```

What it covers:

- **Functional:** every one of the 19 lessons is completed through the real UI on a desktop and a phone profile, plus the course map, theme switching, deep links, the whole system map (pins, panel resize, bottom sheet, zoom, legend, build view, guided tour), the course's backbone (need-driven lesson order, every block introduced and highlighted by the lesson that adds it, no overlapping blocks or overflowing labels at any stage) and the system explorer (data integrity, layout of every view, drill-down and breadcrumb navigation, every flow, search, lesson parking).
- **Layout:** 12 screen sizes from 320 px phones to 2560 px monitors, in both themes, across eight app states. It fails on sideways scrolling, controls pushed off-screen, touch targets under 24 px, truncated labels and overlapping map elements.
- **Accessibility:** axe-core WCAG 2.2 A/AA scans of eight states in both themes, keyboard-only navigation, visible focus, focus return, accessible names and reduced motion.
- **Adversarial:** script-injection and right-to-left payloads in every text input, rapid and double clicks, corrupted or blocked storage, hostile URL hashes, reloads mid-lesson and resizing across breakpoints.
- **Security:** no dynamic code execution, no third-party requests beyond Google Fonts, no inline handlers, `noopener` links, a Content-Security-Policy, a referrer policy and a fixed set of storage keys.

---

Designed and built by Sawab Sarkavri.
