/* ================= helpers ================= */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  if (attrs) for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k === 'style' && typeof v === 'object') { for (const [sk, sv] of Object.entries(v)) { if (sk.startsWith('--')) el.style.setProperty(sk, sv); else el.style[sk] = sv; } }
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const k of kids.flat(Infinity)) {
    if (k == null || k === false) continue;
    el.append(k instanceof Node ? k : document.createTextNode(String(k)));
  }
  return el;
}
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const fmt = (n, d = 1) => Number(n).toLocaleString('en-US', { maximumFractionDigits: d, minimumFractionDigits: 0 });
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* ================= progress store ================= */
const store = {
  k: 'ai-eng-blueprint.v1',
  get() { try { return JSON.parse(localStorage.getItem(this.k)) || {}; } catch (e) { return {}; } },
  set(v) { try { localStorage.setItem(this.k, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } }
};
const P = (() => {
  const v = store.get(); const ok = v && typeof v === 'object' && !Array.isArray(v) ? v : {};
  const done = ok.done && typeof ok.done === 'object' && !Array.isArray(ok.done) ? ok.done : {};
  const days = Array.isArray(ok.days) ? ok.days.filter(d => typeof d === 'string').slice(-60) : [];
  const at = ok.at && typeof ok.at === 'object' && !Array.isArray(ok.at) ? Object.fromEntries(Object.entries(ok.at).filter(([, v]) => Number.isInteger(v) && v >= 0)) : {};
  return { done, xp: Number.isFinite(ok.xp) ? ok.xp : 0, days, at };
})();
function today() { const d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
function saveP() { store.set(P); }
function markDay() { const t = today(); if (!P.days.includes(t)) { P.days.push(t); P.days = P.days.slice(-60); } }
function streak() {
  const set = new Set(P.days); let n = 0; const d = new Date();
  if (!set.has(today())) d.setDate(d.getDate() - 1);
  while (true) { const k = d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); if (set.has(k)) { n++; d.setDate(d.getDate() - 1); } else break; }
  return n;
}

/* ================= course index ================= */
const LESSONS = [];
COURSE.units.forEach((u, ui) => u.lessons.forEach(l => { l.unit = u; l.ui = ui; l.idx = LESSONS.length; l.stage = LESSONS.length + 1; LESSONS.push(l); }));
const MAX_STAGE = LESSONS.length;
function progressStage() { let s = 1; LESSONS.forEach(l => { if (P.done[l.id]) s = Math.max(s, l.stage); }); return s; }
function nextLesson() { return LESSONS.find(l => !P.done[l.id]) || null; }
function doneCount() { return LESSONS.filter(l => P.done[l.id]).length; }

/* ================= the system diagram =================
   A layered reference architecture of an AI application, read top to bottom as the path of one request:
   clients → orchestration → context → model API → model → compute, with evals cutting across every layer.
   Each block appears in the lesson where a new need forces engineers to add it (BPN[id].s = lesson number). */
const BPN = {
  client: { s: 1, t: 'Your app and its users', d: 'Where every request starts: a chat window, an IDE, a backend job or another service. It never touches the weights; it sends a context to a model API.' },
  api: { s: 1, t: 'Model API', d: 'One stateless HTTPS call: a list of messages goes in, tokens come out, usually streamed. Nothing is remembered between calls.' },
  model: { s: 1, t: 'The model', d: 'A frozen function: tokens in, a probability for every possible next token out. Every layer below the API exists to build and run it.' },
  context: { s: 1, t: 'The context', d: 'Every token the model sees on this request, rebuilt for every call. Every layer above the API exists to fill it well.' },
  head: { s: 2, t: 'Output head and sampler', d: 'Turns the final hidden state into one score (logit) per vocabulary entry, applies softmax, and a sampler picks one token.' },
  tok: { s: 3, t: 'Tokenizer and embeddings', d: 'Text becomes integer IDs, and each ID becomes a learned vector. Tokens are also what you are billed for.' },
  's-sys': { s: 4, t: 'System prompt', d: 'Standing instructions: role, rules, format. The single strongest lever on behaviour.' },
  's-hist': { s: 4, t: 'Conversation history', d: 'Previous turns, re-sent on every request because the model is stateless.' },
  's-user': { s: 4, t: 'User message', d: 'The newest turn.' },
  's-schema': { s: 5, t: 'Output schema', d: 'A JSON schema or grammar that constrains which tokens are allowed, so output always parses.' },
  know: { s: 6, t: 'Knowledge store', d: 'Documents split into chunks and indexed by vectors and keywords, so fresh or private facts can be fetched into context.' },
  's-ret': { s: 7, t: 'Retrieved chunks', d: 'The top-k passages selected for this question, placed in the context.' },
  'rag-adv': { s: 8, t: 'Advanced retrieval', d: 'Query rewriting, reranking and agentic retrieval loops on top of the basic pipeline.' },
  tools: { s: 9, t: 'Tools', d: 'Functions the model can request by emitting structured calls. Your code runs them.' },
  's-tooldef': { s: 9, t: 'Tool definitions', d: 'Names, descriptions and JSON schemas of the available tools, placed in context.' },
  's-toolres': { s: 9, t: 'Tool results', d: 'What your code returned, appended to the context for the next model call.' },
  mcp: { s: 10, t: 'MCP servers', d: 'A standard protocol so any AI application can plug into any tool or data server.' },
  harness: { s: 11, t: 'Agent loop (harness)', d: 'The orchestration layer: call the model, run the tools it asks for, append the results and repeat until done, with permissions and limits.' },
  mem: { s: 12, t: 'Memory and skills', d: 'State kept outside the window and loaded only when relevant, so the context stays small and sharp.' },
  sub: { s: 13, t: 'Sub-agents', d: 'More model calls with their own isolated contexts, coordinated by an orchestrator.' },
  tf: { s: 14, t: 'Transformer blocks', d: 'N repeated layers of attention (tokens read each other) and MLP (each token is transformed on its own).' },
  weights: { s: 15, t: 'Weights', d: 'Billions of numbers learned in pretraining, then shaped by supervised fine-tuning and reinforcement learning.' },
  gpu: { s: 16, t: 'GPUs and HBM', d: 'The weights must sit in high-bandwidth GPU memory. Decoding speed is mostly a memory-bandwidth problem.' },
  kv: { s: 17, t: 'KV cache', d: 'Stored keys and values for every token already processed, so each new token does not recompute the past. It competes with the weights for GPU memory.' },
  gateway: { s: 18, t: 'Gateway and serving', d: 'Authentication, rate limits, routing to replicas, continuous batching and streaming. Turns GPUs into a service many applications can call.' },
  evals: { s: 19, t: 'Evals, guardrails, tracing', d: 'Cross-cutting: tests on every change, checks at the edges, and a trace of every call through every layer.' }
};
const BOX = {
  client: [291, 22, 170, 48], api: [152, 382, 448, 34], model: [152, 440, 764, 90], context: [152, 192, 448, 166],
  head: [626, 464, 150, 54], tok: [168, 464, 140, 54], tf: [324, 464, 286, 54], weights: [792, 464, 112, 54],
  's-sys': [168, 220, 200, 28], 's-schema': [168, 254, 200, 28], 's-hist': [168, 288, 200, 28], 's-user': [168, 322, 200, 28],
  's-tooldef': [384, 220, 200, 28], 's-ret': [384, 254, 200, 28], 's-toolres': [384, 288, 200, 28],
  know: [616, 192, 144, 166], 'rag-adv': [628, 322, 120, 24], tools: [776, 192, 140, 78], mcp: [776, 280, 140, 78],
  harness: [152, 96, 200, 72], mem: [400, 96, 200, 72], sub: [616, 96, 300, 72],
  gpu: [152, 552, 548, 48], kv: [716, 556, 200, 40], gateway: [616, 378, 300, 42], evals: [934, 12, 54, 596]
};
// the layers, top to bottom: [y, height, name, what it is]
const LANES = [[12, 68, 'CLIENTS', 'who asks'], [88, 88, 'ORCHESTRATION', 'loops and agents'], [184, 182, 'CONTEXT', 'what the model sees'],
  [374, 50, 'MODEL API', 'the contract'], [432, 104, 'MODEL', 'the function'], [544, 64, 'COMPUTE', 'where it runs']];
const SPINE = 376; // the request travels down this line and the tokens come back up it
function zoomBox(hl) {
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  hl.forEach(id => { const b = BOX[id]; if (!b) return; x0 = Math.min(x0, b[0]); y0 = Math.min(y0, b[1]); x1 = Math.max(x1, b[0] + b[2]); y1 = Math.max(y1, b[1] + b[3]); });
  if (x0 > x1) return [0, 0, 1000, 620];
  const pad = 46; x0 -= pad; y0 -= pad; x1 += pad; y1 += pad;
  let w = Math.max(x1 - x0, 380), hh = Math.max(y1 - y0, 0); const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2; const ratio = 680 / 1000;
  if (hh < w * ratio) hh = w * ratio; else w = hh / ratio;
  if (w > 1000) { w = 1000; hh = 680; }
  let x = cx - w / 2, y = cy - hh / 2;
  x = Math.max(0, Math.min(1000 - w, x)); y = Math.max(-30, Math.min(620 - hh + 30, y));
  return [Math.round(x), Math.round(y), Math.round(w), Math.round(hh)];
}
function animateViewBox(svg, from, to, ms) {
  if (!svg) return;
  const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) { svg.setAttribute('viewBox', to.join(' ')); return; }
  const t0 = performance.now(); const ease = t => 1 - Math.pow(1 - t, 3);
  const tick = now => { const t = Math.min(1, (now - t0) / ms); const v = from.map((a, i) => a + (to[i] - a) * ease(t)); svg.setAttribute('viewBox', v.join(' ')); if (t < 1) requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
}
function lessonForNode(id) { const s = BPN[id].s; return LESSONS[s - 1]; }
// the blocks one lesson adds, and the blocks one level (unit) adds: selections act on these groups
function lessonKeys(l) { return Object.keys(BPN).filter(k => BPN[k].s === l.stage); }
function levelKeys(ui) { return Object.keys(BPN).filter(k => lessonForNode(k).ui === ui); }
function peerKeys(key) { return BPN[key] ? lessonKeys(lessonForNode(key)) : [key]; }

function bpSVG(stage, hl = [], o = {}) {
  const on = id => stage >= BPN[id].s;
  const u = o.uid || '';
  const R = (x, y, w, hh, fill, q = {}) => {
    const rx = q.rx ?? 10, stroke = q.stroke || 'var(--bp-edge)', sw = q.sw || 1.5, dash = q.dash ? `stroke-dasharray:${q.dash};` : '';
    const soft = /soft|surface|sunk|paper/.test(fill);
    const lip = q.lip || (soft ? `color-mix(in srgb, ${q.stroke || 'var(--line-strong)'} 45%, var(--line))` : `color-mix(in srgb, ${fill} 68%, #000)`);
    return (q.noShadow ? '' : `<rect class="lip" x="${x}" y="${y + 4}" width="${w}" height="${hh}" rx="${rx}" style="fill:${lip}"/>`) +
      (q.noGlow ? '' : `<rect class="glow" x="${x - 5}" y="${y - 5}" width="${w + 10}" height="${hh + 10}" rx="${rx + 5}"/>`) +
      `<rect class="${q.noGlow ? '' : 'blk'}" x="${x}" y="${y}" width="${w}" height="${hh}" rx="${rx}" style="fill:${fill};stroke:${stroke};stroke-width:${sw};${dash}--hc:${soft ? (q.stroke || 'var(--line-strong)') : `color-mix(in srgb, ${fill} 62%, #000)`}"/>`;
  };
  const T = (x, y, s, fill, cls = 't-title', anchor = 'middle', extra = '') => `<text x="${x}" y="${y}" text-anchor="${anchor}" class="${cls}" style="fill:${fill};${extra}">${s}</text>`;
  const G = (id, inner, frame) => {
    if (!on(id)) return '';
    const c = ['bp-n']; if (frame) c.push('frame');
    if (hl.length) c.push(hl.includes(id) ? 'hl' : 'dim');
    if (o.enter && BPN[id].s === o.enter) c.push('enter');
    if (o.click) c.push('clickable');
    if (o.built && !o.built(id)) c.push('sketch');
    return `<g class="${c.join(' ')}" data-id="${id}"${o.click && !o.nofocus ? ' tabindex="0" role="button" aria-label="' + esc(BPN[id].t) + '"' : ''}>${inner}</g>`;
  };
  const arrow = (x1, y1, x2, y2, both) => `<path d="M${x1} ${y1}L${x2} ${y2}" style="stroke:var(--faint);stroke-width:2.2;fill:none" marker-end="url(#ar${u})"${both ? ` marker-start="url(#ar${u})"` : ''}/>`;
  const title2 = (cx, cy, a, b, fill, sz = 13.5) => T(cx, cy - 3, a, fill, 't-title', 'middle', `font-size:${sz}px`) + T(cx, cy + 13, b, fill, 't-sub');
  let s = `<svg class="bp" viewBox="${o.vb || '0 0 1000 620'}" preserveAspectRatio="xMidYMid meet" role="${o.click && !o.nofocus ? 'group' : 'img'}" aria-label="Architecture of an AI system at stage ${stage}">
  <defs><pattern id="dots${u}" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="1.5" cy="1.5" r="1.3" style="fill:var(--grid)"/></pattern>
  <marker id="ar${u}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" style="fill:var(--faint)"/></marker></defs>
  <rect x="0" y="0" width="1000" height="620" rx="16" style="fill:url(#dots${u})"/>`;
  // the layers
  LANES.forEach(([y, hh, name, sub]) => {
    s += `<rect x="14" y="${y}" width="912" height="${hh}" rx="12" style="fill:var(--sunk);opacity:.6"/>` +
      T(26, y + (hh > 60 ? 26 : 22), name, 'var(--muted)', 't-frame', 'start') + T(26, y + (hh > 60 ? 42 : 37), sub, 'var(--faint)', 't-sub', 'start', 'font-size:11px');
  });
  // ghosts: the slots later lessons fill
  if (o.ghost) {
    const gh = (id, label) => {
      if (on(id)) return ''; const [x, y, w, hh] = BOX[id]; const n = BPN[id].s;
      if (id === 'evals') return `<g aria-hidden="true"><rect class="ghost" x="${x}" y="${y}" width="${w}" height="${hh}" rx="10"/><text class="ghost-t" x="${x + w / 2}" y="${y + hh / 2}" text-anchor="middle" transform="rotate(-90 ${x + w / 2} ${y + hh / 2})">${label} · LESSON ${n}</text></g>`;
      return `<g aria-hidden="true"><rect class="ghost" x="${x}" y="${y}" width="${w}" height="${hh}" rx="10"/><text class="ghost-t" x="${x + w / 2}" y="${y + hh / 2 - 2}" text-anchor="middle">${label}</text><text class="ghost-t" x="${x + w / 2}" y="${y + hh / 2 + 13}" text-anchor="middle">LESSON ${n}</text></g>`;
    };
    s += gh('harness', 'AGENT LOOP') + gh('mem', 'MEMORY') + gh('sub', 'SUB-AGENTS') + gh('know', 'KNOWLEDGE') + gh('tools', 'TOOLS') + gh('mcp', 'MCP') +
      gh('gateway', 'GATEWAY · SERVING') + gh('gpu', 'GPUS') + gh('kv', 'KV CACHE') + gh('evals', 'EVALS · GUARDRAILS · TRACING');
  }
  // clients
  s += G('client', R(291, 22, 170, 48, 'var(--surface)', { stroke: 'var(--ink)', sw: 2, rx: 12 }) +
    `<circle cx="314" cy="38" r="7" style="fill:var(--ink)"/><path d="M302 60c0-9 5-14 12-14s12 5 12 14z" style="fill:var(--ink)"/>` +
    T(392, 43, 'Your app', 'var(--ink)', 't-title', 'middle', 'font-size:14px') + T(392, 59, 'chat · IDE · backend', 'var(--muted)', 't-sub') +
    arrow(SPINE, 74, SPINE, 188, true));
  // orchestration
  s += G('harness', R(152, 96, 200, 72, 'var(--harness)') + title2(252, 128, 'Agent loop', 'call → tools → repeat', '#fff', 14));
  s += G('mem', R(400, 96, 200, 72, 'var(--harness-soft)', { stroke: 'var(--harness)' }) + title2(500, 128, 'Memory + skills', 'kept outside the window', 'var(--harness)', 14));
  let sb = R(616, 96, 300, 72, 'var(--surface)', { stroke: 'var(--harness)', dash: '5 4' });
  [628, 724, 820].forEach(x => { sb += R(x, 108, 84, 48, 'var(--harness-soft)', { stroke: 'var(--harness)', noShadow: 1, noGlow: 1, rx: 8 }) + title2(x + 42, 130, 'sub-agent', 'own context', 'var(--harness)', 11.5); });
  s += G('sub', sb);
  // context
  s += G('context', R(152, 192, 448, 166, 'var(--ctx-soft)', { stroke: 'var(--ctx)', sw: 2.5, rx: 14, dash: '9 7' }) +
    (stage < 4 ? T(SPINE, 282, 'CONTEXT', 'var(--ctx)', 't-big', 'middle', 'font-size:38px') + T(SPINE, 306, 'everything the model sees on this request', 'var(--ctx)', 't-sub', 'middle', 'font-size:13px')
      : T(190, 211, 'THE CONTEXT', 'var(--ctx)', 't-frame', 'start')), true);
  const slot = (id, x, y, label, fill, tc) => G(id, R(x, y, 200, 28, fill, { rx: 8 }) + T(x + 100, y + 19, label, tc, 't-title', 'middle', 'font-size:12.5px'));
  s += slot('s-sys', 168, 220, 'System prompt', 'var(--ctx)', 'var(--ctx-t)');
  s += slot('s-schema', 168, 254, 'Output schema', 'color-mix(in srgb, var(--ctx) 62%, var(--surface))', 'var(--ctx-t)');
  s += slot('s-hist', 168, 288, 'Conversation history', 'var(--ctx)', 'var(--ctx-t)');
  s += slot('s-user', 168, 322, 'User message', 'var(--ctx)', 'var(--ctx-t)');
  s += slot('s-tooldef', 384, 220, 'Tool definitions', 'var(--tool)', '#fff');
  s += slot('s-ret', 384, 254, 'Retrieved chunks', 'var(--know)', '#fff');
  s += slot('s-toolres', 384, 288, 'Tool results', 'var(--tool)', '#fff');
  s += G('know', R(616, 192, 144, 166, 'var(--know)') +
    `<ellipse cx="688" cy="232" rx="26" ry="8" style="fill:none;stroke:#fff;stroke-width:2"/><path d="M662 232v26c0 4.4 11.6 8 26 8s26-3.6 26-8v-26" style="fill:none;stroke:#fff;stroke-width:2"/>` +
    title2(688, 292, 'Knowledge', 'chunks · vectors · BM25', '#fff', 14) + arrow(612, 268, 588, 268));
  s += G('rag-adv', R(628, 322, 120, 24, 'var(--know-soft)', { noShadow: 1, rx: 7 }) + T(688, 338, 'rerank · rewrite', 'var(--know)', 't-sub', 'middle', 'font-weight:700'));
  s += G('tools', R(776, 192, 140, 78, 'var(--tool)') + title2(846, 228, 'Tools', 'functions · code', '#fff', 14));
  s += G('mcp', R(776, 280, 140, 78, 'var(--tool-soft)', { stroke: 'var(--tool)' }) + title2(846, 312, 'MCP servers', 'one plug per service', 'var(--tool)', 13.5) +
    [826, 846, 866].map(x => `<circle cx="${x}" cy="340" r="4" style="fill:var(--tool)"/>`).join(''));
  // model API
  s += G('api', R(152, 382, 448, 34, 'var(--surface)', { stroke: 'var(--faint)', sw: 2, rx: 17 }) +
    T(SPINE, 404, 'Model API · messages in, tokens out', 'var(--ink)', 't-title', 'middle', 'font-size:13px') +
    `<path d="M${SPINE} 362V380M${SPINE} 418V438" style="stroke:var(--faint);stroke-width:2.2"/>`);
  s += G('gateway', R(616, 378, 300, 42, 'var(--serve)') + `<path d="M602 399H612" style="stroke:var(--faint);stroke-width:2.2"/>` +
    title2(766, 397, 'Gateway and serving', 'auth · routing · batching · streaming', '#fff', 13.5));
  // the model
  s += G('model', R(152, 440, 764, 90, 'var(--model-soft)', { stroke: 'var(--model)', sw: 2.5, rx: 14 }) + T(190, 457, 'THE MODEL', 'var(--model-ink)', 't-frame', 'start') +
    (stage < BPN.tf.s ? T(on('head') ? 467 : 534, 496, 'LLM', 'var(--model-ink)', 't-big', 'middle', 'font-size:28px') + T(on('head') ? 467 : 534, 514, 'a next-token predictor', 'var(--model-ink)', 't-sub', 'middle', 'font-size:12px') : ''), true);
  s += G('tok', R(168, 464, 140, 54, 'var(--model-2)') + title2(238, 488, 'Tokenizer', '→ embeddings', 'var(--model-t)', 13.5));
  let tf = R(324, 464, 286, 54, 'var(--surface)', { stroke: 'var(--model)', sw: 2 });
  for (let i = 0; i < 4; i++) {
    const x = 331 + i * 69;
    tf += R(x, 470, 64, 19, 'var(--model)', { noShadow: 1, noGlow: 1, rx: 5 }) + T(x + 32, 483.5, 'Attention', 'var(--model-t)', 't-sub', 'middle', 'font-weight:700;font-size:10.5px');
    tf += R(x, 493, 64, 19, 'var(--model-2)', { noShadow: 1, noGlow: 1, rx: 5 }) + T(x + 32, 506.5, 'MLP', 'var(--model-t)', 't-sub', 'middle', 'font-weight:700;font-size:10.5px');
  }
  s += G('tf', tf);
  s += G('head', R(626, 464, 150, 54, 'var(--model)') + title2(701, 488, 'Logits → softmax', '→ one sampled token', 'var(--model-t)', 13));
  s += G('weights', R(792, 464, 112, 54, 'var(--surface)', { stroke: 'var(--model)', dash: '5 4', sw: 2 }) + T(848, 485, 'Weights', 'var(--model-ink)', 't-title', 'middle', 'font-size:13px') + T(848, 501, 'pretrain · SFT · RL', 'var(--model-ink)', 't-sub', 'middle', 'font-size:10.5px'));
  if (on('tok')) s += `<g aria-hidden="true">${arrow(310, 491, 321, 491)}</g>`;
  if (on('head')) s += `<g aria-hidden="true">${arrow(612, 491, 623, 491)}</g>`;
  // compute
  let gp = R(152, 552, 548, 48, 'var(--hw)');
  for (let i = 0; i < 4; i++) { const x = 164 + i * 78; gp += R(x, 560, 68, 32, 'var(--hw-2)', { noShadow: 1, noGlow: 1, rx: 6 }) + T(x + 34, 581, 'GPU', '#fff', 't-sub', 'middle', 'font-weight:700'); }
  gp += R(480, 560, 208, 32, 'var(--sunk)', { noShadow: 1, noGlow: 1, rx: 7 }) + R(480, 560, 124, 32, 'var(--model)', { noShadow: 1, noGlow: 1, rx: 7 }) + T(542, 581, 'weights in HBM', 'var(--model-t)', 't-sub', 'middle', 'font-weight:700');
  s += G('gpu', gp);
  s += G('kv', R(716, 556, 200, 40, 'var(--serve)') + title2(816, 574, 'KV cache', 'keys + values of past tokens', '#fff', 13));
  // cross-cutting
  s += G('evals', R(934, 12, 54, 596, 'var(--ship)', { rx: 12 }) +
    `<text x="961" y="310" text-anchor="middle" class="t-sub" transform="rotate(-90 961 310)" style="fill:#fff;font-weight:700;font-size:13px">Evals · guardrails · tracing · cost, across every layer</text>`);
  if (o.overlay) s += `<rect x="${o.overlay[0]}" y="${o.overlay[1]}" width="${o.overlay[2]}" height="${o.overlay[3]}" rx="14" style="fill:none;stroke:var(--pear-deep);stroke-width:10"/>`;
  return s + '</svg>';
}

let tipEl = null;
function attachBlueprintTips(container, onPick) {
  container.addEventListener('pointermove', e => {
    if (e.pointerType && e.pointerType !== 'mouse') return;
    const g = e.target.closest('.bp-n'); if (!g) { hideTip(); return; }
    if (!tipEl) { tipEl = h('div', { class: 'bp-tip' }); document.body.append(tipEl); }
    const key = g.dataset.id;
    if (!BPN[key]) {
      const n = typeof SYSN !== 'undefined' && SYSN[key]; if (!n) { hideTip(); return; }
      const l = n.l && LESSONS.find(x => x.id === n.l);
      tipEl.innerHTML = `<b>${esc(n.t)}</b>${esc(n.d)}<div class="st">${n.go ? '<i class="ok">+ detailed view</i>' : ''}${l ? `Lesson ${l.idx + 1} · ${esc(l.title)}` : ''}</div>`;
    } else {
      const n = BPN[key]; const l = lessonForNode(key);
      const built = typeof P !== 'undefined' && P.done[l.id];
      tipEl.innerHTML = `<b>${esc(n.t)}</b>${esc(n.d)}<div class="st"><i class="${built ? 'ok' : ''}">${built ? 'Added' : 'Not added yet'}</i>Lesson ${l.idx + 1} · ${esc(l.title)}</div>`;
    }
    const x = Math.min(e.clientX + 14, window.innerWidth - 300), y = Math.min(e.clientY + 14, window.innerHeight - 140);
    tipEl.style.left = x + 'px'; tipEl.style.top = y + 'px'; tipEl.hidden = false;
  });
  container.addEventListener('pointerleave', hideTip);
  if (onPick) {
    container.addEventListener('click', e => { const g = e.target.closest('.bp-n'); if (g) { hideTip(); onPick(g.dataset.id); } });
    container.addEventListener('keydown', e => { if (e.key === 'Enter') { const g = e.target.closest('.bp-n'); if (g) onPick(g.dataset.id); } });
  }
}
function hideTip() { if (tipEl) tipEl.hidden = true; }
