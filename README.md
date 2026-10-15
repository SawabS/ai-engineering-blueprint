# AI Engineering Blueprint

An interactive, Brilliant-style course on AI engineering. It starts from the smallest true picture of an AI system, a model and the context you give it, and builds the whole field on top of it one block at a time: tokens, attention, training, GPUs, the KV cache, serving, context engineering, structured output, RAG, tool calling, MCP, agent harnesses, multi-agent systems and production evals.

**Live site:** https://sawabs.github.io/ai-engineering-blueprint/

## What is inside

- **19 lessons in 8 levels** on a winding course map, with 92 exercises revealed one idea at a time.
- **35 interactives**: a temperature and top-p sampler, a tokenizer (including Sorani Kurdish), an attention map, GPU memory and KV cache calculators, a batching simulator, a retrieval lab with BM25 and hybrid search, constrained decoding, an MCP message stepper, an agent loop and more.
- **Go deeper drawers** on 47 steps across every lesson: the actual equations (typeset with KaTeX, self-hosted in `vendor/katex` under its MIT licence, with an accessible MathML copy for screen readers), runnable Python, SQL and shell examples, the industry tools used for that block (SentencePiece, vLLM, pgvector, Qdrant, TRL, MCP SDKs, OpenTelemetry and many more), practical guidance such as choosing a temperature, and primary sources. Each finished lesson ends with its toolkit.
- **The blueprint board**: a pannable, zoomable map of the whole system. Lessons open in a resizable side panel (a bottom sheet on phones), a build view shows what you have learned so far, and a guided tour traces one request through every component.
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

- **Functional:** every one of the 19 lessons is completed through the real UI on a desktop and a phone profile, plus the course map, theme switching, deep links and the whole blueprint board (pins, panel resize, bottom sheet, zoom, legend, build view, guided tour).
- **Layout:** 12 screen sizes from 320 px phones to 2560 px monitors, in both themes, across eight app states. It fails on sideways scrolling, controls pushed off-screen, touch targets under 24 px, truncated labels and overlapping map elements.
- **Accessibility:** axe-core WCAG 2.2 A/AA scans of eight states in both themes, keyboard-only navigation, visible focus, focus return, accessible names and reduced motion.
- **Adversarial:** script-injection and right-to-left payloads in every text input, rapid and double clicks, corrupted or blocked storage, hostile URL hashes, reloads mid-lesson and resizing across breakpoints.
- **Security:** no dynamic code execution, no third-party requests beyond Google Fonts, no inline handlers, `noopener` links, a Content-Security-Policy, a referrer policy and a fixed set of storage keys.

---

Designed and built by Sawab Sarkavri.
