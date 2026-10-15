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
  return { done, xp: Number.isFinite(ok.xp) ? ok.xp : 0, days };
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

/* ================= blueprint ================= */
const BPN = {
  house: { s: 1, t: 'The model', d: 'A frozen function: tokens in, a probability distribution over the next token out. Everything on the left side of the blueprint exists to build and run this function.' },
  garden: { s: 1, t: 'The context', d: 'Every token the model can see on this request. The model knows nothing else at inference time; everything on the right side of the blueprint exists to fill this box well.' },
  you: { s: 1, t: 'You (the user)', d: 'Sends a message. Never talks to the weights directly, only through an application that builds a context.' },
  wire: { s: 1, t: 'The API', d: 'A stateless HTTP call: a list of messages goes in, streamed tokens come out.' },
  head: { s: 2, t: 'Output head', d: 'Turns the final hidden state into one score (logit) per vocabulary entry, applies softmax, and a sampler picks one token.' },
  tok: { s: 3, t: 'Tokenizer and embeddings', d: 'Text becomes integer IDs, and each ID becomes a learned vector.' },
  tf: { s: 4, t: 'Transformer blocks', d: 'N repeated layers of attention (tokens read each other) and MLP (each token is transformed on its own).' },
  weights: { s: 5, t: 'Weights', d: 'Billions of numbers learned in pretraining, then shaped by supervised fine-tuning and reinforcement learning.' },
  gpu: { s: 6, t: 'GPUs and HBM', d: 'The weights must sit in high-bandwidth GPU memory. Decoding speed is mostly a memory-bandwidth problem.' },
  kv: { s: 7, t: 'KV cache', d: 'Stored keys and values for every token already processed, so each new token does not recompute the past. It competes with the weights for GPU memory.' },
  roof: { s: 8, t: 'Serving layer', d: 'Gateway, router, scheduler and continuous batching. Turns one GPU box into a service many users can call.' },
  's-sys': { s: 9, t: 'System prompt', d: 'Standing instructions: role, rules, format. The single strongest lever on behaviour.' },
  's-hist': { s: 9, t: 'Conversation history', d: 'Previous turns, re-sent on every request because the model is stateless.' },
  's-user': { s: 9, t: 'User message', d: 'The newest turn.' },
  's-schema': { s: 10, t: 'Output schema', d: 'A JSON schema or grammar that constrains which tokens are allowed.' },
  know: { s: 11, t: 'Knowledge store', d: 'Documents split into chunks and indexed by vectors and keywords, so fresh or private facts can be fetched into context.' },
  's-ret': { s: 12, t: 'Retrieved chunks', d: 'The top-k passages selected for this question, pasted into the context.' },
  'rag-adv': { s: 13, t: 'Advanced retrieval', d: 'Query rewriting, reranking and agentic retrieval loops on top of the basic pipeline.' },
  tools: { s: 14, t: 'Tools', d: 'Functions the model can request by emitting structured calls. Your code runs them.' },
  's-tooldef': { s: 14, t: 'Tool definitions', d: 'Names, descriptions and JSON schemas of the available tools, placed in context.' },
  's-toolres': { s: 14, t: 'Tool results', d: 'What your code returned, appended to the context for the next model call.' },
  mcp: { s: 15, t: 'MCP servers', d: 'A standard protocol so any app can plug into any tool server.' },
  harness: { s: 16, t: 'Harness', d: 'The loop around the model: call, run tools, append results, repeat until done, with permissions and limits.' },
  mem: { s: 17, t: 'Memory and skills', d: 'State kept outside the window and loaded only when relevant, so the context stays small and sharp.' },
  sub: { s: 18, t: 'Sub-agents', d: 'More model calls with their own isolated contexts, coordinated by an orchestrator.' },
  evals: { s: 19, t: 'Evals, guardrails, tracing', d: 'What keeps the whole building standing in production.' }
};
const BOX = {
  house: [40, 130, 430, 330], garden: [540, 130, 320, 330], you: [890, 232, 80, 116], wire: [470, 280, 70, 30], head: [60, 146, 280, 40], tok: [60, 370, 280, 36],
  tf: [60, 194, 280, 168], weights: [356, 146, 96, 260], gpu: [30, 466, 450, 104], kv: [288, 526, 120, 30], roof: [24, 44, 462, 86],
  's-sys': [556, 146, 150, 34], 's-schema': [556, 186, 150, 34], 's-tooldef': [556, 226, 150, 34], 's-ret': [556, 266, 150, 34], 's-hist': [556, 306, 150, 34],
  's-user': [556, 346, 150, 34], 's-toolres': [556, 386, 150, 34], know: [722, 146, 122, 70], 'rag-adv': [722, 146, 122, 70], tools: [722, 226, 122, 60],
  mcp: [722, 294, 122, 50], mem: [722, 354, 122, 72], harness: [544, 119, 312, 319], sub: [556, 434, 288, 100], evals: [20, 584, 960, 28]
};
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

function bpSVG(stage, hl = [], o = {}) {
  const on = id => stage >= BPN[id].s;
  const R = (x, y, w, hh, fill, q = {}) => {
    const rx = q.rx ?? 10, stroke = q.stroke || 'var(--bp-edge)', sw = q.sw || 1.5, dash = q.dash ? `stroke-dasharray:${q.dash};` : '';
    const soft = /soft|surface|sunk|paper/.test(fill);
    const lip = q.lip || (soft ? `color-mix(in srgb, ${q.stroke || 'var(--line-strong)'} 45%, var(--line))` : `color-mix(in srgb, ${fill} 68%, #000)`);
    return (q.noShadow ? '' : `<rect class="lip" x="${x}" y="${y + 5}" width="${w}" height="${hh}" rx="${rx}" style="fill:${lip}"/>`) +
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
  let s = `<svg class="bp" viewBox="${o.vb || '0 0 1000 620'}" preserveAspectRatio="xMidYMid meet" role="${o.click && !o.nofocus ? 'group' : 'img'}" aria-label="Blueprint of an AI system at stage ${stage}">
  <defs><pattern id="dots${o.uid || ''}" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="1.5" cy="1.5" r="1.3" style="fill:var(--grid)"/></pattern>
  <marker id="ar${o.uid || ''}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" style="fill:var(--faint)"/></marker></defs>
  <rect x="0" y="0" width="1000" height="620" rx="16" style="fill:url(#dots${o.uid || ''})"/>`;
  // frames
  s += G('house', R(40, 130, 430, 330, 'var(--model-soft)', { stroke: 'var(--model)', sw: 2.5, rx: 16 }) +
    (stage < 4 ? T(255, 300, 'LLM', 'var(--model-ink)', 't-big') + T(255, 330, 'a next-token predictor', 'var(--model-ink)', 't-sub', 'middle', 'font-size:15px') : T(56, 448, 'THE MODEL', 'var(--model-ink)', 't-frame', 'start')), true);
  s += G('garden', R(540, 130, 320, 330, 'var(--ctx-soft)', { stroke: 'var(--ctx)', sw: 2.5, rx: 16, dash: '9 7' }) +
    (stage < 9 ? T(700, 300, 'CONTEXT', 'var(--ctx)', 't-big', 'middle', 'font-size:40px') + T(700, 330, 'everything the model sees', 'var(--ctx)', 't-sub', 'middle', 'font-size:15px') : T(556, 448, 'THE CONTEXT', 'var(--ctx)', 't-frame', 'start')), true);
  if (o.ghost) {
    const gh = (id, shape, label, lx, ly) => stage >= BPN[id].s ? '' : `<g aria-hidden="true">${shape}<text class="ghost-t" x="${lx}" y="${ly}" text-anchor="middle">${label}</text></g>`;
    s += gh('roof', '<polygon class="ghost" points="24,126 255,44 486,126"/>', 'SERVING LAYER · LESSON 8', 255, 112);
    s += gh('gpu', '<rect class="ghost" x="30" y="466" width="450" height="104" rx="10"/>', 'GPU FOUNDATION · LESSON 6', 255, 522);
    s += gh('sub', [556, 657, 758].map(x => `<rect class="ghost" x="${x}" y="480" width="86" height="54" rx="10"/>`).join(''), 'SUB-AGENTS · LESSON 18', 700, 556);
    s += gh('evals', '<rect class="ghost" x="20" y="584" width="960" height="28" rx="9"/>', 'EVALS · GUARDRAILS · TRACING · LESSON 19', 500, 603);
  }
  // you + wire
  s += G('you', `<rect class="glow" x="896" y="232" width="70" height="116" rx="20"/><circle cx="931" cy="262" r="16" style="fill:var(--ink)"/><path d="M905 322c0-18 12-30 26-30s26 12 26 30z" style="fill:var(--ink)"/>` +
    T(931, 342, 'You', 'var(--ink)') + `<path d="M893 300H868" style="stroke:var(--faint);stroke-width:2.5" marker-start="url(#ar${o.uid || ''})" marker-end="url(#ar${o.uid || ''})"/>`);
  s += G('wire', `<line class="wire-line" x1="474" y1="300" x2="536" y2="300"/>` + (stage >= 8 ? T(505, 287, 'API', 'var(--muted)', 't-frame') : ''));
  // model internals
  s += G('head', R(60, 146, 280, 40, 'var(--model)') + T(200, 171, 'Logits → softmax → token', 'var(--model-t)', 't-title', 'middle', 'font-size:14px'));
  s += G('tok', R(60, 370, 280, 36, 'var(--model-2)') + T(200, 393, 'Tokenizer → embeddings', 'var(--model-t)', 't-title', 'middle', 'font-size:14px'));
  let tf = R(60, 194, 280, 168, 'var(--surface)', { stroke: 'var(--model)', sw: 2 });
  for (let i = 0; i < 4; i++) {
    const y = 202 + i * 39;
    tf += R(70, y, 124, 31, 'var(--model)', { noShadow: 1, noGlow: 1, rx: 7 }) + T(132, y + 20, 'Attention', 'var(--model-t)', 't-sub', 'middle', 'font-weight:700;font-size:12.5px');
    tf += R(202, y, 128, 31, 'var(--model-2)', { noShadow: 1, noGlow: 1, rx: 7 }) + T(266, y + 20, 'MLP', 'var(--model-t)', 't-sub', 'middle', 'font-weight:700;font-size:12.5px');
  }
  s += G('tf', tf);
  let w = R(356, 146, 96, 260, 'var(--surface)', { stroke: 'var(--model)', dash: '5 4', sw: 2 }) + T(404, 172, 'Weights', 'var(--model-ink)', 't-title', 'middle', 'font-size:14px') +
    T(404, 190, 'billions of', 'var(--muted)', 't-sub') + T(404, 204, 'numbers', 'var(--muted)', 't-sub');
  [['pretrain', 222], ['SFT', 266], ['RL', 310]].forEach(([lab, y]) => { w += R(366, y, 76, 34, 'var(--model-soft)', { noShadow: 1, noGlow: 1, rx: 8, stroke: 'var(--model)' }) + T(404, y + 22, lab, 'var(--model-ink)', 't-sub', 'middle', 'font-weight:700'); });
  s += G('weights', w);
  let gp = R(30, 466, 450, 104, 'var(--hw)');
  for (let i = 0; i < 4; i++) { const x = 46 + i * 106; gp += R(x, 478, 92, 38, 'var(--hw-2)', { noShadow: 1, noGlow: 1, rx: 6 }) + T(x + 46, 502, 'GPU', '#fff', 't-sub', 'middle', 'font-weight:700'); }
  gp += R(46, 526, 418, 30, 'var(--sunk)', { noShadow: 1, noGlow: 1, rx: 7 }) + R(46, 526, 236, 30, 'var(--model)', { noShadow: 1, noGlow: 1, rx: 7 }) + T(164, 546, 'weights in HBM', 'var(--model-t)', 't-sub', 'middle', 'font-weight:700');
  s += G('gpu', gp);
  s += G('kv', R(288, 526, 120, 30, 'var(--serve)', { noShadow: 1, rx: 7 }) + T(348, 546, 'KV cache', '#fff', 't-sub', 'middle', 'font-weight:700'));
  s += G('roof', `<polygon class="lip" points="24,131 255,49 486,131" style="fill:color-mix(in srgb, var(--serve) 66%, #000)"/><polygon class="glow" points="16,130 255,38 494,130"/><polygon class="blk" points="24,126 255,44 486,126" style="fill:var(--serve);stroke:var(--bp-edge);stroke-width:1.5;--hc:color-mix(in srgb, var(--serve) 62%, #000)"/>` +
    T(255, 100, 'Serving layer', '#fff') + T(255, 117, 'router · batching · streaming', '#fff', 't-sub'));
  // context slots
  const slot = (id, i, label, fill, tc) => G(id, R(556, 146 + i * 40, 150, 34, fill, { rx: 8 }) + T(631, 146 + i * 40 + 22, label, tc, 't-title', 'middle', 'font-size:12.5px'));
  s += slot('s-sys', 0, 'System prompt', 'var(--ctx)', 'var(--ctx-t)');
  s += slot('s-schema', 1, 'Output schema', 'color-mix(in srgb, var(--ctx) 62%, var(--surface))', 'var(--ctx-t)');
  s += slot('s-tooldef', 2, 'Tool definitions', 'var(--tool)', '#fff');
  s += slot('s-ret', 3, 'Retrieved chunks', 'var(--know)', '#fff');
  s += slot('s-hist', 4, 'Conversation history', 'var(--ctx)', 'var(--ctx-t)');
  s += slot('s-user', 5, 'User message', 'var(--ctx)', 'var(--ctx-t)');
  s += slot('s-toolres', 6, 'Tool results', 'var(--tool)', '#fff');
  s += G('know', R(722, 146, 122, 70, 'var(--know)') + T(783, 170, 'Knowledge', '#fff', 't-title', 'middle', 'font-size:14px') + T(783, 186, 'chunks · vectors', '#fff', 't-sub'));
  s += G('rag-adv', R(731, 194, 104, 16, 'var(--know-soft)', { noShadow: 1, rx: 5 }) + T(783, 206, 'rerank · rewrite', 'var(--know)', 't-sub', 'middle', 'font-weight:700;font-size:10.5px'));
  s += G('tools', R(722, 226, 122, 60, 'var(--tool)') + T(783, 252, 'Tools', '#fff', 't-title', 'middle', 'font-size:14px') + T(783, 270, 'functions · code', '#fff', 't-sub'));
  s += G('mcp', R(722, 294, 122, 50, 'var(--tool-soft)', { stroke: 'var(--tool)' }) + T(783, 315, 'MCP servers', 'var(--tool)', 't-title', 'middle', 'font-size:13px') +
    [763, 783, 803].map(x => `<circle cx="${x}" cy="331" r="4" style="fill:var(--tool)"/>`).join(''));
  s += G('mem', R(722, 354, 122, 72, 'var(--harness-soft)', { stroke: 'var(--harness)' }) + T(783, 383, 'Memory', 'var(--harness)', 't-title', 'middle', 'font-size:14px') + T(783, 401, '+ skills on demand', 'var(--harness)', 't-sub'));
  s += G('harness', `<rect class="glow" x="544" y="134" width="312" height="304" rx="16"/><rect class="blk" x="549" y="139" width="302" height="294" rx="12" style="fill:none;stroke:var(--harness);stroke-width:2.5;stroke-dasharray:4 5;--hc:var(--harness)"/>` +
    R(690, 119, 154, 24, 'var(--harness)', { rx: 12, noGlow: 1 }) + T(767, 136, 'Harness · agent loop', '#fff', 't-sub', 'middle', 'font-weight:700'));
  let sb = '';
  [556, 657, 758].forEach(x => {
    sb += `<path d="M${x + 43} 434V480" style="stroke:var(--harness);stroke-width:2;stroke-dasharray:4 4"/>` + R(x, 480, 86, 54, 'var(--harness-soft)', { stroke: 'var(--harness)' }) +
      T(x + 43, 503, 'sub-agent', 'var(--harness)', 't-sub', 'middle', 'font-weight:700') + T(x + 43, 520, 'own context', 'var(--harness)', 't-sub', 'middle', 'font-size:10.5px');
  });
  s += G('sub', sb);
  s += G('evals', R(20, 584, 960, 28, 'var(--ship)', { rx: 9 }) + T(500, 603, 'Evals · guardrails · tracing · cost control', '#fff', 't-sub', 'middle', 'font-weight:700;font-size:12.5px'));
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
      tipEl.innerHTML = `<b>${esc(n.t)}</b>${esc(n.d)}<div class="st"><i class="${built ? 'ok' : ''}">${built ? 'Built' : 'Not built yet'}</i>Lesson ${l.idx + 1} · ${esc(l.title)}</div>`;
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
