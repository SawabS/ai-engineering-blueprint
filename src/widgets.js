/* ================= widget kit ================= */
function whead(box, title, hint) { box.append(h('div', { class: 'w-head' }, h('span', { class: 'eyebrow' }, title), hint ? h('span', { class: 'w-hint' }, hint) : null)); }
function seg(options, value, onChange, label) {
  const el = h('div', { class: 'seg', role: 'group', 'aria-label': label || 'Options' });
  const render = () => { el.innerHTML = ''; options.forEach(([v, l]) => el.append(h('button', { class: v === value ? 'on' : '', 'aria-pressed': String(v === value), onclick: () => { value = v; render(); onChange(v); } }, l))); };
  render(); el.set = v => { value = v; render(); };
  const edge = () => el.classList.toggle('more', el.scrollWidth > el.clientWidth + 2 && el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  el.addEventListener('scroll', edge, { passive: true }); requestAnimationFrame(edge); setTimeout(edge, 300);
  return el;
}
function slider(id, label, min, max, step, value, show, onInput) {
  const v = h('span', { class: 'v' }, show(value));
  const inp = h('input', { type: 'range', id, min, max, step, value });
  inp.addEventListener('input', () => { v.textContent = show(+inp.value); onInput(+inp.value); });
  const el = h('label', { class: 'ctrl', for: id }, h('span', null, label, ' ', v), inp);
  el.inp = inp; return el;
}
function softmax(logits, T) {
  if (T <= 0.001) { const m = Math.max(...logits); const i = logits.indexOf(m); return logits.map((_, k) => k === i ? 1 : 0); }
  const m = Math.max(...logits); const ex = logits.map(z => Math.exp((z - m) / T)); const s = ex.reduce((a, b) => a + b, 0); return ex.map(e => e / s);
}
function barsEl(rows) {
  return h('div', { class: 'bars' }, rows.map(r => h('div', { class: 'bar-row ' + (r.cls || '') },
    h('span', { class: 'lab', title: r.lab }, r.lab),
    h('div', { class: 'bar-track' }, h('div', { class: 'bar-fill', style: { width: Math.min(100, r.p * 100).toFixed(1) + '%', background: r.color || '' } })),
    h('span', { class: 'pct tnum' }, r.pctText != null ? r.pctText : (r.p * 100).toFixed(1) + '%'))));
}
function pickWeighted(ps) { let r = Math.random(), acc = 0; for (let i = 0; i < ps.length; i++) { acc += ps[i]; if (r <= acc) return i; } return ps.length - 1; }
const show = s => s.replace(/ /g, '·');

const WIDGETS = {};

/* ---------- U1 ---------- */
WIDGETS.twoBoxes = (box, o, api) => {
  whead(box, 'Interactive', 'Click the blocks');
  const texts = {
    house: '<b>The model.</b> Billions of fixed numbers that map a sequence of tokens to probabilities for the next token. The same input always yields the same distribution, and nothing you say changes the weights.',
    garden: '<b>The context.</b> The exact tokens sent on this one request: instructions, the conversation so far, documents, tool results. If something is not in here, the model cannot use it.',
    you: '<b>You.</b> You never touch the model directly. An application turns what you type into a context and sends it.',
    wire: '<b>The API.</b> One HTTP request per model call: context in, tokens out. No memory survives between calls.'
  };
  const seen = new Set();
  const wrap = h('div', { html: bpSVG(1, [], { click: 1, uid: 'w1' }) });
  const info = h('div', { class: 'callout', html: 'Click the model (left), then the context (right).' });
  const pick = id => {
    seen.add(id); info.innerHTML = texts[id] || '';
    wrap.innerHTML = bpSVG(1, [id], { click: 1, uid: 'w1' });
    if (seen.has('house') && seen.has('garden')) api.ready();
  };
  wrap.addEventListener('click', e => { const g = e.target.closest('.bp-n'); if (g) pick(g.dataset.id); });
  wrap.addEventListener('keydown', e => { if (e.key === 'Enter') { const g = e.target.closest('.bp-n'); if (g) { e.stopPropagation(); pick(g.dataset.id); } } });
  box.append(wrap, info);
};
WIDGETS.bpPreview = (box, o) => {
  const start = o.full ? MAX_STAGE : 1;
  whead(box, o.full ? 'The finished blueprint' : 'Where this course goes', o.full ? 'Hover a block for its story' : 'Drag the slider');
  const wrap = h('div', { html: bpSVG(start, [], { uid: 'w2', click: 1, ghost: 1 }) });
  attachBlueprintTips(wrap);
  const lbl = h('div', { class: 'w-hint' });
  let cur = start;
  const s = slider('bp-prev', 'Stage', 1, MAX_STAGE, 1, start, v => `${v} / ${MAX_STAGE}`, v => {
    wrap.innerHTML = bpSVG(v, [], { uid: 'w2', click: 1, ghost: 1, enter: v > cur ? v : 0 }); cur = v;
    lbl.innerHTML = `Lesson ${v} adds: <b>${esc(LESSONS[v - 1].added)}</b>`;
  });
  lbl.innerHTML = `Lesson ${start} adds: <b>${esc(LESSONS[start - 1].added)}</b>`;
  box.append(wrap, h('div', { class: 'w-col', style: { marginTop: '10px' } }, s, lbl));
};

/* ---------- next token ---------- */
const FR = [[' Paris', 6.2], [' a', 3.4], [' the', 3.1], [' located', 2.6], [' known', 2.3], [' Lyon', 1.2], [' not', 1.0], [' beautiful', 0.6]];
WIDGETS.nextToken = (box) => {
  whead(box, 'Output head', 'Top 8 of ~100,000 tokens, renormalised');
  const ctx = h('div', { class: 'mono-box' }, 'The capital of France is', h('span', { class: 'hot' }, ' ▢'));
  const barsBox = h('div', { style: { marginTop: '12px' } });
  const samples = h('div', { class: 'toks', style: { marginTop: '10px', minHeight: '28px' } });
  let T = 1;
  const render = () => {
    const ps = softmax(FR.map(x => x[1]), T);
    barsBox.innerHTML = ''; barsBox.append(barsEl(FR.map((x, i) => ({ lab: show(x[0]), p: ps[i], cls: i === 0 ? 'pick' : '' }))));
  };
  const sl = slider('nt-temp', 'Temperature', 0, 2, 0.05, 1, v => v === 0 ? '0 (greedy)' : v.toFixed(2), v => { T = v; render(); });
  const btn = h('button', { class: 'btn btn-sm', 'data-sfx': 'none', onclick: () => {
    const ps = softmax(FR.map(x => x[1]), T); samples.innerHTML = ''; const picks = [];
    for (let i = 0; i < 12; i++) { const k = pickWeighted(ps); picks.push(k); samples.append(h('span', { class: 'tok' }, show(FR[k][0]))); }
    SFX.burst(picks);
  } }, 'Sample 12 times');
  render();
  box.append(ctx, h('div', { class: 'w-row', style: { marginTop: '12px' } }, h('div', { style: { flex: '1 1 220px' } }, sl), btn), barsBox,
    h('div', { class: 'w-hint', style: { marginTop: '12px' } }, 'Samples at this temperature:'), samples);
};
const OPEN = [[' hiking', 2.1], [' reading', 2.0], [' sleeping', 1.9], [' cooking', 1.7], [' going', 1.6], [' spending', 1.5], [' playing', 1.3], [' watching', 1.2], [' gardening', 0.9], [' nothing', 0.6]];
WIDGETS.sampling = (box) => {
  whead(box, 'Tail trimming', 'Temperature fixed at 1');
  let data = FR, K = 10, Pp = 1;
  const ctx = h('div', { class: 'mono-box' });
  const out = h('div', { style: { marginTop: '12px' } });
  const note = h('div', { class: 'w-hint', style: { marginTop: '10px' } });
  const render = () => {
    ctx.textContent = data === FR ? 'The capital of France is ▢' : 'My favourite weekend activity is ▢';
    const ps = softmax(data.map(x => x[1]), 1);
    const order = ps.map((p, i) => [p, i]).sort((a, b) => b[0] - a[0]);
    const keep = new Set(); let acc = 0;
    for (let r = 0; r < order.length; r++) { if (r >= K) break; if (acc >= Pp - 1e-9 && r > 0) break; keep.add(order[r][1]); acc += order[r][0]; }
    const kept = [...keep]; const sum = kept.reduce((a, i) => a + ps[i], 0);
    out.innerHTML = '';
    out.append(barsEl(data.map((x, i) => ({ lab: show(x[0]), p: keep.has(i) ? ps[i] / sum : ps[i], cls: keep.has(i) ? '' : 'cut' }))));
    note.textContent = `${kept.length} token${kept.length > 1 ? 's' : ''} survive. Kept probabilities are renormalised before sampling.`;
  };
  const sg = seg([['fr', 'Confident prompt'], ['open', 'Open-ended prompt']], 'fr', v => { data = v === 'fr' ? FR : OPEN; render(); });
  const sk = slider('smp-k', 'top-k', 1, 10, 1, 10, v => v === 10 ? 'off' : String(v), v => { K = v; render(); });
  const sp = slider('smp-p', 'top-p', 0.1, 1, 0.05, 1, v => v >= 1 ? 'off' : v.toFixed(2), v => { Pp = v; render(); });
  render();
  box.append(sg, h('div', { style: { marginTop: '12px' } }, ctx), h('div', { class: 'w-grid2', style: { marginTop: '12px' } }, sk, sp), out, note);
};
const AR = [
  [[' Paris', .82], [' a', .06], [' the', .05], [' located', .03]],
  [['.', .55], [',', .25], [' and', .12], [' which', .05]],
  [[' It', .41], [' The', .22], [' Paris', .15], [' Its', .10]],
  [[' is', .60], [' has', .20], [' was', .10], [' lies', .06]],
  [[' known', .35], [' also', .30], [' the', .20], [' famous', .10]],
  [[' for', .88], [' as', .10], [' worldwide', .01]],
  [[' its', .40], [' the', .35], [' art', .10], [' fashion', .08]],
  [[' museums', .31], [' food', .25], [' art', .20], [' architecture', .15]],
  [['.', .80], [',', .15], [' and', .05]],
  [['<end>', .71], [' It', .18], ['\\n', .08]]
];
WIDGETS.autoregress = (box, o, api) => {
  whead(box, 'The decoding loop', 'Greedy: always take the top token');
  let step = 0; const gen = [];
  const ctx = h('div', { class: 'mono-box', style: { whiteSpace: 'pre-wrap' } });
  const dist = h('div', { style: { marginTop: '12px', minHeight: '120px' } });
  const ctr = h('div', { class: 'stat-row' });
  const btn = h('button', { class: 'btn btn-primary btn-sm', 'data-sfx': 'none' }, 'Run one forward pass');
  const render = () => {
    ctx.innerHTML = 'The capital of France is' + gen.map((t, i) => `<span class="${i === gen.length - 1 ? 'hot' : ''}">${esc(t)}</span>`).join('');
    ctr.innerHTML = `<div><b>${step}</b>forward passes</div><div><b>${gen.filter(t => t !== '').length}</b>tokens generated</div>`;
  };
  btn.addEventListener('click', () => {
    if (step >= AR.length) return;
    const d = AR[step];
    dist.innerHTML = ''; dist.append(h('div', { class: 'w-hint', style: { marginBottom: '6px' } }, `Pass ${step + 1}: distribution over the next token`), barsEl(d.map((x, i) => ({ lab: show(x[0]), p: x[1], cls: i === 0 ? 'pick' : '' }))));
    if (d[0][0] === '<end>') { btn.disabled = true; btn.textContent = 'End-of-sequence token sampled'; step++; render(); api.ready(); return; }
    SFX.token(step + 3); gen.push(d[0][0]); step++; render();
  });
  render();
  box.append(ctx, h('div', { class: 'w-row', style: { marginTop: '12px' } }, btn, h('button', { class: 'btn btn-sm btn-ghost', onclick: () => { step = 0; gen.length = 0; btn.disabled = false; btn.textContent = 'Run one forward pass'; dist.innerHTML = ''; render(); } }, 'Reset')), dist, ctr);
};

/* ---------- tokens ---------- */
const VOCAB = new Set('the a an is are was you how hello hi weather nice today in of and to it for on with that this what def return text split cost tokens token model capital france paris cat sat mat good morning are be do not your my we they he she at by from as or if else data plan'.split(' '));
const RARE_AR = new Set('ڵڕۆێەڤگچژپ'.split(''));
function toyTokenize(s) {
  const out = []; let i = 0;
  while (i < s.length) {
    const rest = s.slice(i);
    let m = rest.match(/^ ?[A-Za-z]+/);
    if (m) {
      const word = m[0]; const bare = word.trim().toLowerCase();
      if (VOCAB.has(bare)) out.push({ t: word });
      else { const lead = word.startsWith(' ') ? ' ' : ''; const w = word.trim(); for (let k = 0; k < w.length; k += 4) out.push({ t: (k === 0 ? lead : '') + w.slice(k, k + 4) }); }
      i += word.length; continue;
    }
    m = rest.match(/^ ?[0-9]+/);
    if (m) { const lead = m[0].startsWith(' ') ? ' ' : ''; const d = m[0].trim(); for (let k = 0; k < d.length; k += 3) out.push({ t: (k === 0 ? lead : '') + d.slice(k, k + 3) }); i += m[0].length; continue; }
    const ch = s[i];
    if (/[؀-ۿ]/.test(ch)) {
      if (RARE_AR.has(ch)) { const bytes = new TextEncoder().encode(ch); bytes.forEach(b => out.push({ t: '<0x' + b.toString(16).toUpperCase() + '>', frag: 1 })); }
      else out.push({ t: ch });
      i++; continue;
    }
    if (ch === ' ' && i + 1 < s.length && /[؀-ۿ]/.test(s[i + 1])) { out.push({ t: ' ' }); i++; continue; }
    out.push({ t: ch }); i++;
  }
  return out;
}
function tokId(t) { let x = 2166136261; for (const c of t) { x ^= c.charCodeAt(0); x = Math.imul(x, 16777619); } return (x >>> 0) % 200000; }
WIDGETS.tokenizer = (box) => {
  whead(box, 'Toy BPE tokenizer', 'Illustrative; real vocabularies differ by model');
  const presets = [
    ['English', 'Hello, how are you? The weather is nice today.'],
    ['Sorani', 'سڵاو، چۆنی؟ ئەمڕۆ کەشوهەوا خۆشە.'],
    ['Code', 'def total(items): return sum(items)'],
    ['Numbers', 'In 2026, 1234567 tokens cost $3.75.']
  ];
  let ids = false;
  const ta = h('textarea', { class: 'txt-in', id: 'tok-in', rows: 2, 'aria-label': 'Text to tokenize' }, presets[0][1]);
  const toks = h('div', { class: 'toks', style: { marginTop: '12px' } });
  const stats = h('div', { class: 'stat-row' });
  const base = toyTokenize(presets[0][1]).length;
  const render = () => {
    const s = ta.value; const t = toyTokenize(s);
    if (/[؀-ۿ]/.test(s)) toks.style.direction = 'ltr';
    toks.innerHTML = ''; t.forEach(x => toks.append(h('span', { class: 'tok', style: x.frag ? { outline: '1.5px dashed var(--bad)' } : null, title: 'ID ' + tokId(x.t) }, ids ? String(tokId(x.t)) : show(x.t))));
    const chars = [...s].length;
    stats.innerHTML = `<div><b>${chars}</b>characters</div><div><b>${t.length}</b>tokens</div><div><b>${(chars / Math.max(1, t.length)).toFixed(2)}</b>chars per token</div><div><b>${(t.length / base).toFixed(1)}×</b>vs the English sentence</div>`;
  };
  ta.addEventListener('input', render);
  const row = h('div', { class: 'w-col', style: { marginBottom: '10px' } }, h('div', { class: 'chips-scroll' }, presets.map(([n, s]) => h('button', { class: 'btn btn-sm', onclick: () => { ta.value = s; ta.dir = n === 'Sorani' ? 'rtl' : 'ltr'; render(); } }, n))),
    seg([[false, 'Pieces'], [true, 'IDs']], false, v => { ids = v; render(); }, 'Display'));
  render();
  box.append(row, ta, toks, stats, h('div', { class: 'w-hint', style: { marginTop: '8px' } }, 'Dashed tokens are raw bytes: the vocabulary had no entry for that character.'));
};
const EMB = { king: [62, 22], queen: [78, 30], man: [30, 30], woman: [46, 38], France: [18, 72], Paris: [32, 60], Germany: [50, 80], Berlin: [64, 68], cat: [84, 86], kitten: [92, 76], dog: [76, 70] };
WIDGETS.embedMap = (box) => {
  whead(box, 'Embedding space (2-D cartoon)', 'Click a word, or try the arithmetic');
  let sel = null, arrow = null;
  const svgBox = h('div');
  const info = h('div', { class: 'w-hint', style: { marginTop: '8px' } }, 'Related words cluster. Directions such as royalty or country-to-capital are roughly consistent.');
  const X = v => 30 + v[0] * 6.2, Y = v => 20 + v[1] * 3.4;
  const render = () => {
    let s = `<svg class="svgchart" viewBox="0 0 680 360" role="img" aria-label="Word embedding map">`;
    for (let g = 0; g <= 10; g++) s += `<line x1="${30 + g * 62}" y1="20" x2="${30 + g * 62}" y2="360" style="stroke:var(--line);stroke-width:1"/><line x1="30" y1="${20 + g * 34}" x2="650" y2="${20 + g * 34}" style="stroke:var(--line);stroke-width:1"/>`;
    if (arrow) {
      const [a, b, c, r] = arrow;
      s += `<defs><marker id="emA" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--harness)"/></marker></defs>`;
      s += `<line x1="${X(EMB[b])}" y1="${Y(EMB[b])}" x2="${X(EMB[a])}" y2="${Y(EMB[a])}" style="stroke:var(--harness);stroke-width:2.5;stroke-dasharray:6 4" marker-end="url(#emA)"/>`;
      s += `<line x1="${X(EMB[c])}" y1="${Y(EMB[c])}" x2="${X(EMB[r])}" y2="${Y(EMB[r])}" style="stroke:var(--harness);stroke-width:2.5" marker-end="url(#emA)"/>`;
    }
    for (const [w, v] of Object.entries(EMB)) {
      let near = false;
      if (sel) { const d = Math.hypot(v[0] - EMB[sel][0], v[1] - EMB[sel][1]); near = w !== sel && d < 22; }
      const c = w === sel ? 'var(--pear-deep)' : near ? 'var(--model)' : 'var(--model-2)';
      s += `<g data-w="${w}" style="cursor:pointer"><circle cx="${X(v)}" cy="${Y(v)}" r="${w === sel ? 9 : 7}" style="fill:${c};stroke:var(--surface);stroke-width:2"/><text x="${X(v) + 12}" y="${Y(v) + 4}" style="fill:var(--ink);font-family:var(--f-body);font-size:14px;font-weight:600">${w}</text></g>`;
    }
    svgBox.innerHTML = s + '</svg>';
  };
  svgBox.addEventListener('click', e => { const g = e.target.closest('[data-w]'); if (!g) return; sel = g.dataset.w; arrow = null; const nn = Object.keys(EMB).filter(w => w !== sel).sort((a, b) => Math.hypot(EMB[a][0] - EMB[sel][0], EMB[a][1] - EMB[sel][1]) - Math.hypot(EMB[b][0] - EMB[sel][0], EMB[b][1] - EMB[sel][1])).slice(0, 2); info.textContent = `Nearest to “${sel}”: ${nn.join(', ')}.`; render(); });
  const op = (a, b, c) => { const v = [EMB[a][0] - EMB[b][0] + EMB[c][0], EMB[a][1] - EMB[b][1] + EMB[c][1]]; const r = Object.keys(EMB).filter(w => ![a, b, c].includes(w)).sort((x, y) => Math.hypot(EMB[x][0] - v[0], EMB[x][1] - v[1]) - Math.hypot(EMB[y][0] - v[0], EMB[y][1] - v[1]))[0]; sel = r; arrow = [a, b, c, r]; info.innerHTML = `<b>${a} − ${b} + ${c}</b> lands closest to <b>${r}</b>. The dashed arrow is the direction ${b} → ${a}; applying it at ${c} reaches ${r}.`; render(); };
  render();
  box.append(h('div', { class: 'w-row', style: { marginBottom: '8px' } }, h('button', { class: 'btn btn-sm', onclick: () => op('king', 'man', 'woman') }, 'king − man + woman'), h('button', { class: 'btn btn-sm', onclick: () => op('Paris', 'France', 'Germany') }, 'Paris − France + Germany')),
    h('div', { class: 'scroll-x' }, svgBox), info);
};

/* ---------- attention ---------- */
WIDGETS.attention = (box) => {
  whead(box, 'Attention weights', 'Darker = more attention');
  let last = 'tired', q = 7;
  const words = () => ['The', 'animal', "didn't", 'cross', 'the', 'street', 'because', 'it', 'was', 'too', last];
  const weights = (qi) => {
    const W = words(); const n = qi + 1; let w = [];
    for (let j = 0; j < n; j++) w.push(Math.exp(-(qi - j) * 0.55) + (j === qi ? 0.6 : 0) + (j === 0 ? 0.25 : 0));
    if (W[qi] === 'it') { const a = last === 'tired' ? [1, 3.2] : [5, 3.4]; w = w.map(x => x * 0.25); w[a[0]] += a[1]; }
    if (qi === 10) { w = w.map(x => x * 0.3); w[7] += 1.6; w[last === 'tired' ? 1 : 5] += 1.8; }
    const s = w.reduce((a, b) => a + b, 0); return w.map(x => x / s);
  };
  const sent = h('div', { class: 'attn-sent' });
  const note = h('div', { class: 'w-hint', style: { marginTop: '8px' } });
  const render = () => {
    const W = words(); const w = weights(q); sent.innerHTML = '';
    W.forEach((t, j) => {
      const a = j <= q ? w[j] : 0;
      sent.append(h('span', { class: 'attn-w' + (j === q ? ' q' : '') + (j > q ? ' fut' : ''), style: { background: j <= q ? `color-mix(in srgb, var(--model) ${Math.round(Math.min(1, a * 2.2) * 85)}%, transparent)` : '', color: a > 0.3 ? '#fff' : '' }, onclick: () => { q = j; render(); } }, t));
    });
    const top = w.map((x, j) => [x, j]).filter(x => x[1] !== q).sort((a, b) => b[0] - a[0])[0];
    note.innerHTML = `Query: <b>${W[q]}</b>. Strongest link to another word: <b>${W[top[1]]}</b> (${(top[0] * 100).toFixed(0)}%). Faded words are in the future and invisible.`;
  };
  render();
  box.append(h('div', { class: 'w-row', style: { marginBottom: '12px' } }, h('span', { class: 'w-hint' }, 'Last word:'), seg([['tired', 'tired'], ['wide', 'wide']], 'tired', v => { last = v; q = 7; render(); }, 'Last word')), sent, note);
};
WIDGETS.causalMask = (box) => {
  whead(box, 'Causal mask', 'Rows read, columns are read');
  const W = ['The', 'cat', 'sat', 'on', 'the', 'mat']; let r = 2;
  const grid = h('div', { class: 'heat', style: { gridTemplateColumns: `60px repeat(${W.length}, minmax(0,1fr))`, maxWidth: '460px' } });
  const note = h('div', { class: 'w-hint', style: { marginTop: '10px' } });
  const render = () => {
    grid.innerHTML = ''; grid.append(h('span'));
    W.forEach(w => grid.append(h('span', { class: 'lab', style: { justifyContent: 'center' } }, w)));
    W.forEach((w, i) => {
      grid.append(h('span', { class: 'lab', style: { fontWeight: i === r ? 700 : 400, color: i === r ? 'var(--ink)' : '' } }, w));
      W.forEach((_, j) => {
        const ok = j <= i; const strength = ok ? 0.25 + 0.75 * Math.exp(-(i - j) * 0.6) : 0;
        grid.append(h('span', { class: 'cell', role: 'button', 'aria-label': `${w} to ${W[j]}`, onclick: () => { r = i; render(); },
          style: { background: ok ? `color-mix(in srgb, var(--model) ${Math.round(strength * (i === r ? 100 : 45))}%, var(--sunk))` : 'repeating-linear-gradient(45deg, var(--sunk) 0 4px, var(--surface) 4px 8px)', outline: i === r ? '2px solid var(--pear-deep)' : '' } }));
      });
    });
    note.innerHTML = `<b>${W[r]}</b> can read: ${W.slice(0, r + 1).join(', ')}. Hatched cells are masked to −∞ before the softmax, so they get zero weight.`;
  };
  render(); box.append(grid, note);
};

/* ---------- training ---------- */
const ROUNDS = [
  ['The cat sat on the', ['mat', 'moon', 'piano', 'idea'], 0],
  ['def add(a, b): return a', ['+', '-', '*', 'if'], 0],
  ['Water boils at 100 degrees', ['Celsius', 'Fahrenheit', 'Kelvin', 'tomorrow'], 0],
  ['The first person to walk on the Moon was Neil', ['Armstrong', 'Young', 'Gaiman', 'deGrasse'], 0]
];
WIDGETS.nextWordGame = (box, o, api) => {
  whead(box, 'You are the model', 'You put 90% on your pick, 10% spread on the rest');
  let r = 0; const losses = [];
  const area = h('div');
  const hist = h('div', { class: 'stat-row' });
  const order = ROUNDS.map(x => x[1].map((w, i) => [w, i]).sort((a, b) => (a[0].length * 7 + a[1] * 13) % 5 - (b[0].length * 7 + b[1] * 13) % 5));
  const render = () => {
    area.innerHTML = '';
    if (r >= ROUNDS.length) { area.append(h('div', { class: 'callout', html: 'Across trillions of rounds like these, gradient descent nudges every weight to lower the average loss. Grammar, facts, code and reasoning patterns emerge as side effects of pushing that one number down.' })); return; }
    const [ctx, opts, ans] = ROUNDS[r];
    area.append(h('div', { class: 'mono-box' }, ctx + ' ▢'),
      h('div', { class: 'w-row', style: { marginTop: '10px' } }, order[r].map(([w, i]) => h('button', { class: 'btn btn-sm', 'data-sfx': 'none', onclick: () => {
        const p = i === ans ? 0.9 : 0.1 / 3; const loss = -Math.log(p); losses.push(loss); if (i === ans) SFX.correct(); else SFX.wrong();
        area.append(h('div', { class: 'verdict ' + (i === ans ? 'ok' : 'no') }, `The text continued with “${opts[ans]}”. You gave it p = ${p.toFixed(3)}, so loss = −ln p = ${loss.toFixed(2)}.`));
        $$('button', area).forEach(b => b.disabled = true);
        hist.innerHTML = `<div><b>${losses.length}</b>rounds</div><div><b>${(losses.reduce((a, b) => a + b, 0) / losses.length).toFixed(2)}</b>average loss</div>`;
        if (losses.length >= 3) api.ready();
        area.append(h('button', { class: 'btn btn-sm', style: { marginTop: '10px' }, onclick: () => { r++; render(); } }, r < ROUNDS.length - 1 ? 'Next round' : 'Finish'));
      } }, w))));
  };
  render(); box.append(area, hist);
};
WIDGETS.trainingStages = (box) => {
  whead(box, 'Same prompt, three training stages');
  const prompts = {
    cap: 'What is the capital of France?',
    train: 'A train leaves at 3:40 pm and the trip takes 2 h 35 min. When does it arrive?'
  };
  const outs = {
    base: { cap: 'What is the capital of Germany?\nWhat is the capital of Italy?\nWhat is the capital of Spain?\n\nGeography quiz, chapter 3. Answers on page 112.', train: 'A) 5:15 pm   B) 6:15 pm   C) 6:25 pm   D) 5:75 pm\n\nExercise 14. Show your working.' },
    sft: { cap: 'The capital of France is Paris.', train: 'The train arrives at 6:25 pm.' },
    rl: { cap: 'The capital of France is Paris.', train: '[thinking] 3:40 pm + 2 h = 5:40 pm. 5:40 pm + 35 min = 6:15 pm. Check: 20 min to 6:00, 15 more. [/thinking]\nThe train arrives at 6:15 pm.' }
  };
  const notes = {
    base: '<b>Base model.</b> Trained only to continue internet text. A question looks like the start of a quiz, so it writes more quiz.',
    sft: '<b>After SFT.</b> Trained on example conversations, so it answers. It sounds confident even when the arithmetic is wrong.',
    rl: '<b>After RL.</b> Rewarded for correct, checkable answers and preferred behaviour. It has learned to reason step by step before answering.'
  };
  let st = 'base', p = 'cap';
  const user = h('div', { class: 'msg user' }); const out = h('div', { class: 'msg asst', style: { whiteSpace: 'pre-wrap' } }); const note = h('div', { class: 'callout' });
  const render = () => { user.innerHTML = '<span class="role">user</span>' + esc(prompts[p]); out.innerHTML = '<span class="role">model output</span>' + esc(outs[st][p]); note.innerHTML = notes[st]; };
  render();
  box.append(h('div', { class: 'w-row' }, seg([['base', 'Base'], ['sft', '+ SFT'], ['rl', '+ RL']], st, v => { st = v; render(); }, 'Stage'), seg([['cap', 'Fact'], ['train', 'Arithmetic']], p, v => { p = v; render(); }, 'Prompt')),
    h('div', { class: 'chatlog', style: { marginTop: '14px' } }, user, out), note);
};

/* ---------- GPUs ---------- */
WIDGETS.vramCalc = (box) => {
  whead(box, 'Deployment sizing', 'Weights only; KV cache comes next lesson');
  const PARAMS = [1, 3, 8, 14, 32, 70, 120, 235, 405, 671, 1000];
  const PREC = { fp32: [4, 'FP32'], bf16: [2, 'BF16'], fp8: [1, 'FP8'], int4: [0.5, 'INT4'] };
  const GPUS = { g24: [24, 1.0, '24 GB'], g80: [80, 3.35, '80 GB'], g141: [141, 4.8, '141 GB'], g192: [192, 8.0, '192 GB'] };
  let pi = 5, pr = 'bf16', g = 'g80';
  const out = h('div'); const gpus = h('div', { class: 'gpu-row' });
  const render = () => {
    const N = PARAMS[pi]; const bytes = PREC[pr][0]; const gb = N * bytes; const [cap, bw] = GPUS[g];
    const need = Math.max(1, Math.ceil(gb / (cap * 0.92)));
    const tps = (need * bw * 1000) / gb * 0.7;
    out.innerHTML = `<div class="stat-row"><div><b>${fmt(gb, 1)} GB</b>for the weights</div><div><b>${need}</b>GPU${need > 1 ? 's' : ''} of ${GPUS[g][2]}</div><div><b>~${fmt(tps, 0)}</b>tokens/s, one user</div></div>`;
    gpus.innerHTML = '';
    const shown = Math.min(need, 32);
    for (let i = 0; i < shown; i++) { const fill = Math.min(1, gb / need / cap); gpus.append(h('div', { class: 'gpu', title: `GPU ${i + 1}` }, h('i', { style: { height: (fill * 100) + '%' } }), h('span', null, cap + 'G'))); }
    if (need > shown) gpus.append(h('span', { class: 'chip' }, `+${need - shown} more`));
    if (need > 8) gpus.append(h('div', { class: 'w-hint', style: { flexBasis: '100%' } }, 'More than 8 GPUs means more than one server, so the model is split across machines over the network.'));
  };
  const sp = slider('vr-p', 'Parameters', 0, PARAMS.length - 1, 1, pi, v => PARAMS[v] + 'B', v => { pi = v; render(); });
  render();
  box.append(sp, h('div', { class: 'w-row', style: { marginTop: '12px' } },
    h('span', { class: 'w-hint' }, 'Precision'), seg(Object.entries(PREC).map(([k, v]) => [k, v[1]]), pr, v => { pr = v; render(); }, 'Precision'),
    h('span', { class: 'w-hint' }, 'Card'), seg(Object.entries(GPUS).map(([k, v]) => [k, v[2]]), g, v => { g = v; render(); }, 'GPU memory')),
    out, gpus, h('div', { class: 'w-hint', style: { marginTop: '10px' } }, 'Speed estimate: bandwidth × GPUs ÷ model bytes × 70% efficiency, for a dense model and a single stream.'));
};
WIDGETS.kvReuse = (box) => {
  whead(box, 'With and without a cache', '500-token prompt');
  const out = h('div');
  const render = n => {
    const no = Array.from({ length: n }, (_, t) => 500 + t + 1).reduce((a, b) => a + b, 0) + 500;
    const yes = 500 + n; const max = no;
    out.innerHTML = ''; out.append(barsEl([
      { lab: 'no cache', p: no / max, pctText: fmt(no / 1000, 1) + 'k', color: 'var(--bad)' },
      { lab: 'KV cache', p: yes / max, pctText: fmt(yes / 1000, 1) + 'k', color: 'var(--good)' }]),
      h('div', { class: 'w-hint', style: { marginTop: '8px' } }, `Token positions pushed through the model to generate ${n} tokens. Without a cache every step reprocesses the whole sequence: ${fmt(no / yes, 1)}× more work.`));
  };
  const s = slider('kvr-n', 'Tokens generated', 1, 1000, 1, 200, v => String(v), render);
  render(200); box.append(s, h('div', { style: { marginTop: '12px' } }, out));
};
WIDGETS.kvCalc = (box) => {
  whead(box, 'GPU memory budget', '70B model in BF16 = 140 GB of weights');
  const CTX = [1024, 4096, 8192, 16384, 32768, 65536, 131072];
  const USERS = [1, 2, 4, 8, 16, 32, 64];
  let ci = 3, ui = 2, gpus = 4, heads = 8;
  const out = h('div');
  const render = () => {
    const perTok = 2 * 80 * heads * 128 * 2; const kvGB = perTok * CTX[ci] * USERS[ui] / 1e9; const W = 140; const cap = gpus * 80;
    const used = W + kvGB; const over = used > cap * 0.95; const scale = Math.max(cap, used);
    out.innerHTML = '';
    out.append(h('div', { class: 'stat-row' },
      h('div', null, h('b', null, fmt(perTok / 1024, 0) + ' KiB'), 'per token'),
      h('div', null, h('b', null, fmt(kvGB, 1) + ' GB'), 'KV cache'),
      h('div', null, h('b', null, fmt(used, 0) + ' / ' + cap + ' GB'), 'used')));
    out.append(h('div', { class: 'membar', role: 'img', 'aria-label': 'Memory split' },
      h('div', { style: { width: (W / scale * 100) + '%', background: 'var(--model)' } }, 'weights'),
      h('div', { style: { width: (Math.min(kvGB, scale - W) / scale * 100) + '%', background: over ? 'var(--bad)' : 'var(--serve)' } }, 'KV'),
      h('div', { style: { flex: 1 } })));
    out.append(h('div', { class: 'verdict ' + (over ? 'no' : 'ok') }, over
      ? 'Out of memory. The scheduler must queue users, cap context length, evict or offload cache, or you add GPUs.'
      : `Fits, with ${fmt(cap - used, 0)} GB to spare for activations and more users.`));
  };
  render();
  box.append(h('div', { class: 'w-grid2' },
    slider('kv-ctx', 'Context length', 0, CTX.length - 1, 1, ci, v => fmt(CTX[v] / 1024, 0) + 'k tokens', v => { ci = v; render(); }),
    slider('kv-u', 'Concurrent sequences', 0, USERS.length - 1, 1, ui, v => String(USERS[v]), v => { ui = v; render(); })),
    h('div', { class: 'w-row', style: { marginTop: '12px' } },
      h('span', { class: 'w-hint' }, 'GPUs'), seg([[2, '2 × 80 GB'], [4, '4 × 80 GB'], [8, '8 × 80 GB']], gpus, v => { gpus = v; render(); }, 'GPUs'),
      h('span', { class: 'w-hint' }, 'KV heads'), seg([[8, '8 (GQA)'], [64, '64 (no sharing)']], heads, v => { heads = v; render(); }, 'KV heads')),
    out);
};

/* ---------- generic flow ---------- */
const FLOWS = {
  journey: { c: 'var(--serve)', nodes: [
    ['Client', 'Your app sends an HTTPS POST with the full message list and <code>stream: true</code>.'],
    ['Gateway', 'Checks the API key, applies rate limits and quotas, records usage, rejects oversized requests.'],
    ['Router', 'Picks a model replica, preferring one that already holds this prompt\'s prefix in its KV cache.'],
    ['Scheduler', 'Queues the request and admits it into the running batch as soon as there is memory for its KV cache.'],
    ['Prefill', 'All prompt tokens pass through the model in one parallel pass, filling the KV cache. This sets time to first token.'],
    ['Decode', 'One token per step for every sequence in the batch. Each step reads the weights once and serves everyone in the batch.'],
    ['Stream', 'Each token is detokenized and sent back immediately as a server-sent event. Token usage is counted for billing at the end.']] },
  rag: { c: 'var(--know)', nodes: [
    ['Load', 'Pull documents from their sources: PDFs, wikis, tickets, databases. Extract clean text and keep metadata such as title, date and access rights.', 'Indexing, ahead of time'],
    ['Chunk', 'Split text into passages of a few hundred tokens, following headings where possible.', 'Indexing, ahead of time'],
    ['Embed + index', 'Turn each chunk into a vector with an embedding model, and build a keyword index alongside.', 'Indexing, ahead of time'],
    ['Store', 'Write vectors, text and metadata to a vector database or search engine.', 'Indexing, ahead of time'],
    ['Embed query', 'At question time, embed the user\'s question with the same embedding model.', 'Query path, every request'],
    ['Search', 'Find the nearest chunks by vector similarity, plus keyword score in hybrid setups, filtered by metadata and permissions.', 'Query path, every request'],
    ['Augment', 'Paste the top-k chunks into the context with source labels and an instruction to answer from them and cite.', 'Query path, every request'],
    ['Generate', 'The model writes an answer grounded in the supplied text.', 'Query path, every request']] },
  mcp: { c: 'var(--tool)', nodes: [
    ['discover', 'The client learns what the server supports. Since protocol version 2026-07-28 MCP is stateless: every request carries its protocol version and client capabilities in <code>_meta</code>, and <code>server/discover</code> returns the server\'s versions and capabilities. Older versions used a one-time <code>initialize</code> handshake instead.<div class="mono-box" style="margin-top:8px">→ {"jsonrpc":"2.0","id":1,"method":"server/discover",\n   "params":{"_meta":{"io.modelcontextprotocol/protocolVersion":"2026-07-28"}}}\n← {"result":{"supportedVersions":["2026-07-28"],\n   "capabilities":{"tools":{},"resources":{}}}}</div>'],
    ['tools/list', 'The client asks what the server offers. Each tool comes with a name, a description and a JSON schema.<div class="mono-box" style="margin-top:8px">← {"tools":[{"name":"search_issues",\n   "description":"Search the issue tracker by text",\n   "inputSchema":{"type":"object",\n     "properties":{"query":{"type":"string"}}}}]}</div>'],
    ['into context', 'The host places those tool definitions into the model\'s context, next to its own tools. The model now knows the tool exists.'],
    ['tools/call', 'The model emits a tool call. The host checks permissions, then the client forwards it.<div class="mono-box" style="margin-top:8px">→ {"method":"tools/call","params":{"name":"search_issues",\n   "arguments":{"query":"login timeout"}}}</div>'],
    ['result', 'The server runs the search and returns content blocks.<div class="mono-box" style="margin-top:8px">← {"content":[{"type":"text",\n   "text":"3 open issues: #412 SSO timeout after 30s, ..."}]}</div>'],
    ['answer', 'The host appends the result as a tool result. The next model call writes the answer from it.']] }
};
WIDGETS.flow = (box, o, api) => {
  const F = FLOWS[o.id]; let i = 0;
  whead(box, 'Step through', 'Use Next to advance');
  const nodes = h('div', { class: 'flow' }); const detail = h('div', { class: 'callout', style: { minHeight: '84px' } });
  const ctr = h('span', { class: 'w-hint tnum' });
  const render = () => {
    nodes.innerHTML = ''; let lastPhase = null;
    F.nodes.forEach(([t, d, ph], k) => {
      if (ph && ph !== lastPhase) { nodes.append(h('div', { class: 'eyebrow', style: { flexBasis: '100%', marginTop: k ? '8px' : '0' } }, ph)); lastPhase = ph; }
      else if (k) nodes.append(h('span', { class: 'arrow', 'aria-hidden': 'true' }, '→'));
      nodes.append(h('div', { class: 'node' + (k === i ? ' on' : ''), style: { '--c': F.c, opacity: k > i ? .55 : 1 } }, h('b', null, t)));
    });
    detail.innerHTML = `<div class="eyebrow">${i + 1}. ${F.nodes[i][0]}</div>${F.nodes[i][1]}`;
    ctr.textContent = `${i + 1} / ${F.nodes.length}`;
    if (i === F.nodes.length - 1) api.ready();
  };
  render();
  box.append(nodes, detail, h('div', { class: 'w-row', style: { marginTop: '12px' } },
    h('button', { class: 'btn btn-sm', 'data-sfx': 'none', onclick: () => { if (i > 0) { i--; SFX.back(); render(); } } }, 'Back'),
    h('button', { class: 'btn btn-sm btn-primary', 'data-sfx': 'none', onclick: () => { if (i < F.nodes.length - 1) { i++; SFX.token(i + 2); render(); } else SFX.error(); } }, 'Next'), ctr));
};

/* ---------- serving ---------- */
WIDGETS.batching = (box) => {
  whead(box, 'Three batch slots, six requests', 'Bar length = output tokens');
  const R = [['A', 8], ['B', 3], ['C', 6], ['D', 2], ['E', 5], ['F', 4]];
  const COL = ['var(--model)', 'var(--serve)', 'var(--know)', 'var(--tool)', 'var(--harness)', 'var(--ctx)'];
  let mode = 'static';
  const out = h('div');
  const schedule = () => {
    const slots = [[], [], []];
    if (mode === 'static') {
      let t = 0;
      for (let b = 0; b < R.length; b += 3) { const batch = R.slice(b, b + 3); const len = Math.max(...batch.map(x => x[1])); batch.forEach((r, k) => slots[k].push([r, t, t + r[1], b + k])); t += len; }
    } else {
      const free = [0, 0, 0];
      R.forEach((r, k) => { const s = free.indexOf(Math.min(...free)); slots[s].push([r, free[s], free[s] + r[1], k]); free[s] += r[1]; });
    }
    return slots;
  };
  const render = () => {
    const slots = schedule(); const end = Math.max(...slots.flat().map(x => x[2])); const span = 13;
    const busy = slots.flat().reduce((a, x) => a + x[2] - x[1], 0);
    out.innerHTML = '';
    const g = h('div', { class: 'gantt' });
    slots.forEach((sl, k) => g.append(h('div', { class: 'gantt-row' }, h('span', { class: 'w-hint' }, 'slot ' + (k + 1)),
      h('div', { class: 'gantt-track' }, sl.map(([r, a, b, ci]) => h('div', { class: 'gantt-seg', style: { left: (a / span * 100) + '%', width: (r[1] / span * 100) + '%', background: COL[ci] } }, r[0]))))));
    g.append(h('div', { class: 'gantt-row' }, h('span', { class: 'w-hint' }, 'steps'), h('div', { class: 'w-hint tnum', style: { display: 'flex', justifyContent: 'space-between' } }, ...Array.from({ length: 14 }, (_, i) => h('span', null, String(i))))));
    out.append(g, h('div', { class: 'stat-row' },
      h('div', null, h('b', null, String(end)), 'steps to finish all six'),
      h('div', null, h('b', null, Math.round(busy / (end * 3) * 100) + '%'), 'slot utilisation')),
      h('div', { class: 'w-hint', style: { marginTop: '6px' } }, mode === 'static' ? 'Gaps are wasted GPU time: short requests finish and their slot sits idle until the longest one in the batch is done.' : 'Each finished sequence frees its slot at the next step, and the next request in the queue takes it.'));
  };
  render(); box.append(seg([['static', 'Static batching'], ['cont', 'Continuous batching']], mode, v => { mode = v; render(); }, 'Batching mode'), h('div', { style: { marginTop: '14px' } }, out));
};
WIDGETS.latencyCalc = (box) => {
  whead(box, 'Latency model', 'Prefill 8,000 tok/s · decode 50 tok/s per stream');
  const P = [200, 1000, 4000, 16000, 64000, 128000]; let pi = 2, out = 400, q = 0.3;
  const res = h('div');
  const render = () => {
    const ttft = q + P[pi] / 8000; const dec = out / 50; const tot = ttft + dec;
    res.innerHTML = '';
    res.append(h('div', { class: 'membar' }, h('div', { style: { width: (q / tot * 100) + '%', background: 'var(--faint)' } }, q / tot > .08 ? 'queue' : ''),
      h('div', { style: { width: ((ttft - q) / tot * 100) + '%', background: 'var(--model)' } }, (ttft - q) / tot > .08 ? 'prefill' : ''),
      h('div', { style: { width: (dec / tot * 100) + '%', background: 'var(--serve)' } }, dec / tot > .1 ? 'decode (streaming)' : '')),
      h('div', { class: 'stat-row' }, h('div', null, h('b', null, ttft.toFixed(2) + ' s'), 'time to first token'), h('div', null, h('b', null, '20 ms'), 'per output token'), h('div', null, h('b', null, tot.toFixed(1) + ' s'), 'total')));
  };
  render();
  box.append(h('div', { class: 'w-grid2' },
    slider('lt-p', 'Prompt length', 0, P.length - 1, 1, pi, v => fmt(P[v], 0) + ' tokens', v => { pi = v; render(); }),
    slider('lt-o', 'Output length', 20, 2000, 20, out, v => v + ' tokens', v => { out = v; render(); })),
    h('div', { style: { marginTop: '10px' } }, slider('lt-q', 'Queue wait', 0, 4, 0.1, q, v => v.toFixed(1) + ' s', v => { q = v; render(); })), res);
};

/* ---------- context ---------- */
const POS = { Paris: ['PROPN', 'Paris is the capital of France, famous for the Eiffel Tower, the Louvre and its café culture. Are you planning a trip?'],
  run: ['VERB', 'Sure! Are you looking for a running plan, tips for a first 5k, or something else?'],
  quickly: ['ADV', 'Sounds like you are in a hurry! What do you need help with?'],
  beautiful: ['ADJ', 'Thank you! Is there something beautiful you would like to describe or write about?'],
  and: ['CCONJ', 'And...? It looks like your message was cut off. What did you want to add?'] };
const SYS_POS = 'You are a part-of-speech tagger. For the word the user sends, reply only with JSON: {"word": ..., "pos": ...} using Universal POS tags. No other text.';
WIDGETS.posTagger = (box, o, api) => {
  whead(box, 'One model, two programs');
  let sys = false, word = 'Paris', view = 'chat'; const tried = new Set();
  const out = h('div');
  const render = () => {
    tried.add(sys); if (tried.size === 2) api.ready();
    out.innerHTML = '';
    const reply = sys ? `{"word": "${word}", "pos": "${POS[word][0]}"}` : POS[word][1];
    if (view === 'chat') {
      const log = h('div', { class: 'chatlog' });
      if (sys) log.append(h('div', { class: 'msg system' }, h('span', { class: 'role' }, 'system'), SYS_POS));
      log.append(h('div', { class: 'msg user' }, h('span', { class: 'role' }, 'user'), word), h('div', { class: 'msg asst new', style: sys ? { fontFamily: 'var(--f-mono)', fontSize: '13.5px' } : null }, h('span', { class: 'role' }, 'assistant'), reply));
      out.append(log);
    } else {
      out.append(h('div', { class: 'mono-box', style: { whiteSpace: 'pre-wrap' }, html: (sys ? `<span class="tk">&lt;|system|&gt;</span>${esc(SYS_POS)}<span class="tk">&lt;|end|&gt;</span>\n` : '') + `<span class="tk">&lt;|user|&gt;</span>${esc(word)}<span class="tk">&lt;|end|&gt;</span>\n<span class="tk">&lt;|assistant|&gt;</span><span class="hot">${esc(reply)}</span>` }),
        h('div', { class: 'w-hint', style: { marginTop: '8px' } }, 'Roles are flattened into one token sequence with special marker tokens. The exact markers differ between model families, and the model was trained on this format during SFT.'));
    }
  };
  render();
  box.append(h('div', { class: 'w-row', style: { marginBottom: '12px' } }, seg([[false, 'No system prompt'], [true, 'Tagger system prompt']], sys, v => { sys = v; render(); }, 'System prompt'), seg([['chat', 'Chat view'], ['raw', 'Raw tokens']], view, v => { view = v; render(); }, 'View')),
    h('div', { class: 'w-row', style: { marginBottom: '12px' } }, h('span', { class: 'w-hint' }, 'Word:'), seg(Object.keys(POS).map(w => [w, w]), word, v => { word = v; render(); }, 'Word')), out);
};
WIDGETS.statelessChat = (box, o, api) => {
  whead(box, 'What the app sends each turn');
  const turns = [['Hi, I\'m Dana and I\'m planning a trip to Lisbon.', 'Nice to meet you, Dana! When are you going?'], ['In May, for five days.', 'May is a lovely time for Lisbon. Want a day-by-day plan?'], ['What\'s my name, by the way?', 'You\'re Dana.']];
  let n = 0, history = true; const sizes = [];
  const chat = h('div', { class: 'chatlog' }); const req = h('div', { class: 'mono-box', style: { whiteSpace: 'pre-wrap', minHeight: '120px' } }, 'No request sent yet.');
  const chart = h('div', { style: { marginTop: '10px' } });
  const btn = h('button', { class: 'btn btn-primary btn-sm', 'data-sfx': 'none' }, 'Send next message');
  const toks = s => Math.ceil(s.length / 4);
  btn.addEventListener('click', () => {
    if (n >= turns.length) return;
    SFX.next(); setTimeout(() => SFX.token(4 + n * 2), 160);
    const msgs = [{ role: 'system', content: 'You are a friendly travel assistant.' }];
    if (history) for (let k = 0; k < n; k++) msgs.push({ role: 'user', content: turns[k][0] }, { role: 'assistant', content: turns[k][1] });
    msgs.push({ role: 'user', content: turns[n][0] });
    const reply = (!history && n === 2) ? 'I don\'t know your name. You haven\'t told me in this conversation.' : turns[n][1];
    chat.append(h('div', { class: 'msg user new' }, turns[n][0]), h('div', { class: 'msg asst new' }, reply));
    req.textContent = `Request #${n + 1}\n` + JSON.stringify(msgs, null, 1).replace(/\n\s*/g, ' ').replace(/\}, \{/g, '},\n {');
    sizes.push(msgs.reduce((a, m) => a + toks(m.content) + 4, 0));
    chart.innerHTML = ''; chart.append(barsEl(sizes.map((s, i) => ({ lab: 'request ' + (i + 1), p: s / 90, pctText: s + ' tok', color: 'var(--ctx)' }))));
    n++; if (n >= turns.length) { btn.disabled = true; api.ready(); }
  });
  const reset = h('button', { class: 'btn btn-sm btn-ghost', onclick: () => { n = 0; sizes.length = 0; chat.innerHTML = ''; chart.innerHTML = ''; req.textContent = 'No request sent yet.'; btn.disabled = false; } }, 'Restart');
  box.append(h('div', { class: 'w-row', style: { marginBottom: '12px' } }, btn, reset, seg([[true, 'App re-sends history'], [false, 'App forgets history']], history, v => { history = v; reset.click(); }, 'History')),
    h('div', { class: 'w-grid2' }, chat, h('div', { style: { minWidth: 0 } }, req, chart)));
};
WIDGETS.contextBudget = (box) => {
  whead(box, 'A 32k-token window', 'System prompt 2k · each turn about 3k');
  let turns = 6, strat = 'trunc'; const WIN = 32, SYS = 2, T = 3;
  const out = h('div');
  const render = () => {
    const total = SYS + turns * T; let kept = [], summary = 0, err = false;
    const all = Array.from({ length: turns }, (_, i) => i + 1);
    if (total <= WIN) kept = all;
    else if (strat === 'trunc') { const fit = Math.floor((WIN - SYS) / T); kept = all.slice(-fit); }
    else if (strat === 'sum') { summary = 1.5; const fit = Math.floor((WIN - SYS - summary) / T); kept = all.slice(-fit); }
    else { err = true; kept = all; }
    const scale = Math.max(WIN, total);
    const bar = h('div', { class: 'membar', style: { position: 'relative' } });
    bar.append(h('div', { style: { width: (SYS / scale * 100) + '%', background: 'var(--ctx)', color: 'var(--ctx-t)' } }, 'sys'));
    if (summary) bar.append(h('div', { style: { width: (summary / scale * 100) + '%', background: 'var(--harness)' } }, 'Σ'));
    all.forEach(t => { const on = kept.includes(t); bar.append(h('div', { title: 'turn ' + t, style: { width: (T / scale * 100) + '%', background: on ? 'var(--model)' : 'var(--line-strong)', borderLeft: '1px solid var(--surface)', opacity: on ? 1 : .5 } }, T / scale > .06 ? String(t) : '')); });
    const limit = h('div', { style: { position: 'absolute', left: (WIN / scale * 100) + '%', top: '-6px', bottom: '-6px', width: '3px', background: 'var(--bad)', display: total > WIN ? 'block' : 'none' } });
    bar.append(limit);
    out.innerHTML = '';
    let msg;
    if (total <= WIN) msg = ['ok', `${total}k of ${WIN}k used. Everything fits, but every one of those tokens is paid for again on the next turn.`];
    else if (err) msg = ['no', `Request rejected: ${total}k tokens exceeds the ${WIN}k window. The app must decide what to drop.`];
    else if (strat === 'trunc') msg = ['no', `Kept turns ${kept[0]} to ${turns}. Turns 1 to ${kept[0] - 1} are gone, including the user's name from turn 1.`];
    else msg = ['ok', `Turns 1 to ${kept[0] - 1} became a 1.5k summary (“User is Dana, planning 5 days in Lisbon in May…”). Key facts survive, details do not.`];
    out.append(bar, h('div', { class: 'verdict ' + msg[0] }, msg[1]));
  };
  render();
  box.append(slider('cb-t', 'Conversation turns', 1, 20, 1, turns, v => String(v), v => { turns = v; render(); }),
    h('div', { class: 'w-row', style: { margin: '12px 0' } }, h('span', { class: 'w-hint' }, 'When it overflows:'), seg([['trunc', 'Drop oldest'], ['sum', 'Summarise older turns'], ['err', 'Send anyway']], strat, v => { strat = v; render(); }, 'Overflow strategy')), out);
};
WIDGETS.fewShot = (box) => {
  whead(box, 'Ticket classifier', 'Labels: billing · technical · account · other');
  const inputs = ['I was charged twice this month', 'The app crashes when I open settings', 'How do I change the email on my profile?', 'Why is my bill higher after the upgrade?'];
  const zero = ['Billing', 'This looks like a technical issue.', 'account issue', 'Category: Other (possibly billing)'];
  const few = ['billing', 'technical', 'account', 'billing'];
  let mode = 'zero';
  const prompt = h('div', { class: 'mono-box', style: { whiteSpace: 'pre-wrap' } }); const out = h('div', { class: 'rank', style: { marginTop: '12px' } });
  const render = () => {
    prompt.innerHTML = 'Classify the ticket as billing, technical, account or other.' + (mode === 'few' ? '\n\n<span class="hot">Ticket: "Card declined at checkout"\nLabel: billing\n\nTicket: "Wi-Fi drops every hour"\nLabel: technical\n\nTicket: "Upgrade made my invoice bigger, why?"\nLabel: billing</span>' : '') + '\n\nTicket: "{ticket}"\nLabel:';
    out.innerHTML = '';
    inputs.forEach((t, i) => { const r = mode === 'zero' ? zero[i] : few[i]; const good = r === few[i]; out.append(h('div', { class: 'rank-row' + (good ? ' in' : ''), style: { gridTemplateColumns: 'minmax(0,1fr) minmax(0,auto)' } }, h('span', { class: 'doc' }, h('span', null, t)), h('b', { class: 'mono', style: { color: good ? 'var(--good)' : 'var(--bad)' } }, r))); });
  };
  render(); box.append(seg([['zero', 'Instructions only'], ['few', 'Instructions + 3 examples']], mode, v => { mode = v; render(); }, 'Prompt'), h('div', { style: { marginTop: '12px' } }, prompt), out,
    h('div', { class: 'w-hint', style: { marginTop: '8px' } }, 'The examples fix the format and teach the edge case: a higher bill after an upgrade is billing, not other.'));
};
const CSTEPS = [
  [['{', .62, 1], ['Sure', .20, 0], ['Here', .10, 0], ['```', .08, 0]],
  [['"word"', .90, 1], ['"pos"', .06, 0], ['}', .04, 0]],
  [[':', .97, 1], [' =', .03, 0]],
  [[' "Paris"', .70, 1], [' Paris', .20, 0], [' null', .10, 0]],
  [[',', .82, 1], ['}', .18, 0]],
  [[' "pos"', .88, 1], [' "type"', .12, 0]],
  [[':', .99, 1], [' =', .01, 0]],
  [[' "PROPN"', .40, 1], [' "proper noun"', .25, 0], [' "NOUN"', .22, 1], [' "name"', .13, 0]],
  [['}', .90, 1], [', "confidence"', .10, 0]]
];
WIDGETS.constrained = (box, o, api) => {
  whead(box, 'Grammar-masked decoding', 'Schema: {"word": string, "pos": one of NOUN | PROPN | VERB | ADJ}');
  let i = 0; const outTxt = [];
  const out = h('div', { class: 'mono-box' }); const dist = h('div', { style: { marginTop: '12px', minHeight: '120px' } });
  const btn = h('button', { class: 'btn btn-primary btn-sm', 'data-sfx': 'none' }, 'Next token');
  const render = () => { out.innerHTML = esc(outTxt.join('')) + '<span class="hot"> ▢</span>'; };
  btn.addEventListener('click', () => {
    if (i >= CSTEPS.length) return;
    const d = CSTEPS[i]; const allowed = d.filter(x => x[2]); const s = allowed.reduce((a, x) => a + x[1], 0);
    const best = allowed.slice().sort((a, b) => b[1] - a[1])[0];
    SFX.token(i + 2); if (allowed.length < d.length) setTimeout(() => SFX.tick(0.1), 90);
    dist.innerHTML = '';
    dist.append(h('div', { class: 'w-hint', style: { marginBottom: '6px' } }, 'Raw probabilities, with grammar-invalid tokens struck out. Survivors are renormalised.'),
      barsEl(d.map(x => ({ lab: show(x[0]), p: x[2] ? x[1] / s : x[1], cls: !x[2] ? 'cut' : (x === best ? 'pick' : ''), pctText: x[2] ? (x[1] / s * 100).toFixed(0) + '%' : (x[1] * 100).toFixed(0) + '%' }))));
    if (i === 7) dist.append(h('div', { class: 'w-hint', style: { marginTop: '6px' } }, '“proper noun” and “name” mean the same thing to a human, but they are not in the enum, so the mask removes them.'));
    outTxt.push(best[0]); i++; render();
    if (i >= CSTEPS.length) { btn.disabled = true; btn.textContent = 'Valid JSON, guaranteed'; api.ready(); }
  });
  render(); box.append(out, h('div', { class: 'w-row', style: { marginTop: '12px' } }, btn), dist);
};

/* ---------- knowledge ---------- */
const KSORT = [
  ['A 40,000-page product manual, updated weekly', ['retrieval'], 'Too large for any window and constantly changing.'],
  ['A 300-word list of rules: tone, refusals, when to escalate', ['prompt'], 'Short, stable and needed on every call.'],
  ['The user\'s name, mentioned earlier in this chat', ['prompt'], 'It is already in the conversation history.'],
  ['Fluency in a dialect the base model barely speaks', ['weights'], 'A skill, not a fact. Prompts cannot teach a language.'],
  ['Each customer\'s private order history', ['retrieval'], 'Per-user and private: fetch it with access control at query time.'],
  ['A strict output format across 50 million calls a month on a small model', ['weights', 'prompt'], 'A schema in the prompt works; fine-tuning makes it cheaper and more reliable at this volume.']
];
WIDGETS.knowledgeSort = (box, o, api) => {
  whead(box, 'Where should it live?');
  const pick = KSORT.map(() => null); const rows = [];
  const list = h('div', { class: 'sortgame' });
  KSORT.forEach(([t], i) => {
    const note = h('div', { class: 'w-hint', hidden: true });
    const row = h('div', { class: 'sort-item' }, h('div', null, h('div', null, t), note), seg([['weights', 'Weights'], ['prompt', 'Prompt'], ['retrieval', 'Retrieval']], null, v => { pick[i] = v; row.classList.remove('ok', 'no'); note.hidden = true; if (pick.every(Boolean)) api.ready(); }, 'Location'));
    row.note = note; rows.push(row); list.append(row);
  });
  box.append(list);
  const mark = force => { let bad = 0; KSORT.forEach(([, acc, why], i) => { if (force) { rows[i].querySelector('.seg').set(acc[0]); pick[i] = acc[0]; } const ok = acc.includes(pick[i]); if (!ok) bad++; rows[i].classList.toggle('ok', ok); rows[i].classList.toggle('no', !ok); rows[i].note.hidden = false; rows[i].note.textContent = why; }); return bad; };
  return {
    check: () => { const bad = mark(false); return bad ? { ok: false, msg: `${bad} item${bad > 1 ? 's are' : ' is'} in the wrong place. Read the notes under the red rows, adjust, and check again.` } : { ok: true, msg: 'Large, changing or private corpora go to retrieval. Short standing rules go in the prompt. Skills and languages go in the weights.' }; },
    reset: () => {},
    reveal: () => { mark(true); return { msg: 'Large, changing or private corpora go to retrieval. Short standing rules go in the prompt. Skills and languages go in the weights.' }; }
  };
};
const DOC = 'Northwind Mobile roaming guide. Roaming lets you use your phone abroad. Roaming in EU countries is included on all plans except Basic, and data abroad counts toward your normal allowance. Outside Europe, a daily pass costs 5 per day in Turkey, the UK and the US. Activate the pass in the app before you travel, because it cannot be bought after landing. If your phone shows no service abroad, restart it and select a network manually. Basic plan customers can upgrade at any time to get EU roaming.';
WIDGETS.chunker = (box) => {
  whead(box, 'Chunking a help article', 'Sizes in words for readability; real systems count tokens');
  const words = DOC.split(' '); const keyA = words.indexOf('Roaming', 10), keyB = keyA + 14;
  const COL = ['var(--model)', 'var(--know)', 'var(--ctx)', 'var(--tool)', 'var(--harness)'];
  let size = 30, ov = 0;
  const txt = h('div', { class: 'chunks' }); const st = h('div');
  const render = () => {
    const ch = []; let s = 0;
    while (s < words.length) { const e = Math.min(words.length, s + size); ch.push([s, e]); if (e === words.length) break; s = Math.max(s + 1, e - ov); }
    txt.innerHTML = '';
    words.forEach((w, i) => {
      const inn = ch.map((c, k) => (i >= c[0] && i < c[1]) ? k : -1).filter(k => k >= 0);
      const c1 = `color-mix(in srgb, ${COL[inn[0] % 5]} 26%, transparent)`;
      const bg = inn.length > 1 ? `linear-gradient(${c1} 50%, color-mix(in srgb, ${COL[inn[1] % 5]} 26%, transparent) 50%)` : c1;
      txt.append(h('span', { class: 'ch', style: { background: bg, fontWeight: (i >= keyA && i < keyB) ? 700 : 400 } }, w), ' ');
    });
    const whole = ch.some(c => c[0] <= keyA && c[1] >= keyB);
    st.innerHTML = '';
    st.append(h('div', { class: 'stat-row' }, h('div', null, h('b', null, String(ch.length)), 'chunks'), h('div', null, h('b', null, String(size)), 'words each'), h('div', null, h('b', null, String(ov)), 'words overlap')),
      h('div', { class: 'verdict ' + (whole ? 'ok' : 'no') }, whole ? 'The bold fact about EU roaming sits whole inside one chunk, so a search can return it intact.' : 'The bold fact about EU roaming is cut across a boundary. No single chunk contains it whole. Try more overlap or another size.'));
  };
  render();
  box.append(h('div', { class: 'w-grid2' }, slider('ck-s', 'Chunk size', 10, 60, 1, size, v => v + ' words', v => { size = v; render(); }), slider('ck-o', 'Overlap', 0, 15, 1, ov, v => v + ' words', v => { ov = v; render(); })),
    h('div', { style: { marginTop: '12px' } }, txt), st);
};
const CORPUS = [
  ['Ending your contract', 'To terminate your subscription, sign in, open Account, Plan and choose Close plan. Early termination fees apply in the first 12 months.'],
  ['Upgrading your plan', 'You can switch to a bigger data plan at any time from Account, Plan. Changes apply immediately.'],
  ['Roaming in Europe', 'Roaming in EU countries is included on all plans except Basic. Data abroad counts toward your normal allowance.'],
  ['Roaming outside Europe', 'In Turkey, the UK and the US, roaming costs 5 per day with a daily pass. Activate it in the app before you travel.'],
  ['Router error E-402', 'E-402 means the router cannot authenticate with the network. Restart it, then re-enter the SIM PIN.'],
  ['Slow home internet', 'Slow internet is often a router problem: place it away from walls and microwaves, and use the 5 GHz band.'],
  ['Billing dates', 'Your bill is issued on the 1st of each month. Payments made after the 15th incur a late fee.'],
  ['Lost or stolen phone', 'Block your SIM immediately in the app under Security. A replacement SIM ships within two days.'],
  ['Router lights', 'A blinking red light on the router shows a problem: no connection. A steady green light shows everything works.'],
  ['Wi-Fi drops at night', 'If the router disconnects at night, the problem is often a firmware update. Check the router screen in the app.']
];
const CONCEPTS = {
  CANCEL: 'cancel terminate termination close end quit stop', PLAN: 'plan plans subscription contract', UPGRADE: 'upgrade upgrading switch bigger change changes',
  TRAVEL: 'roaming abroad travel travelling traveling trip countries europe eu turkey uk us international overseas outside', COST: 'cost costs fee fees price charge pay payment payments bill billing late much',
  ROUTER: 'router wifi wi-fi internet modem', PROBLEM: 'error problem issue slow drops disconnects cannot broken fails', DISPLAY: 'light lights shows show blinking red green steady screen',
  AUTH: 'authenticate pin sim password', PHONE: 'phone lost stolen block replacement', DATA: 'data allowance gb', TIME: 'month months day daily night immediately'
};
const C2 = {}; Object.entries(CONCEPTS).forEach(([c, ws]) => ws.split(' ').forEach(w => { C2[w] = c; }));
const STOP = new Set('a an the is are to of in on at and or it my i me your you how do does with for then by from be can its there what when after before all any this that per'.split(' '));
const words2 = s => (s.toLowerCase().match(/[a-z0-9]+(?:-[a-z0-9]+)*/g) || []);
const cvec = s => { const v = {}; words2(s).forEach(w => { const c = C2[w]; if (c) v[c] = (v[c] || 0) + 1; }); return v; };
const cos = (a, b) => { let d = 0, na = 0, nb = 0; for (const k in a) { na += a[k] * a[k]; if (b[k]) d += a[k] * b[k]; } for (const k in b) nb += b[k] * b[k]; return na && nb ? d / Math.sqrt(na * nb) : 0; };
const DOCV = CORPUS.map(c => cvec(c[0] + ' ' + c[1]));
const DOCW = CORPUS.map(c => words2(c[0] + ' ' + c[1]).filter(w => !STOP.has(w)));
const AVGL = DOCW.reduce((a, d) => a + d.length, 0) / DOCW.length;
function bm25(q) {
  const qs = [...new Set(words2(q).filter(w => !STOP.has(w)))]; const N = DOCW.length;
  return DOCW.map(d => qs.reduce((s, t) => { const df = DOCW.filter(x => x.includes(t)).length; if (!df) return s; const tf = d.filter(x => x === t).length; if (!tf) return s; const idf = Math.log(1 + (N - df + .5) / (df + .5)); return s + idf * (tf * 2.2) / (tf + 1.2 * (1 - .75 + .75 * d.length / AVGL)); }, 0));
}
function search(q, method, alpha) {
  const dv = cvec(q); const dense = DOCV.map(v => cos(dv, v)); const sparse = bm25(q);
  const norm = a => { const mx = Math.max(...a), mn = Math.min(...a); return a.map(x => mx > mn ? (x - mn) / (mx - mn) : 0); };
  const dn = norm(dense), sn = norm(sparse);
  const score = CORPUS.map((_, i) => method === 'dense' ? dense[i] : method === 'sparse' ? sparse[i] : alpha * dn[i] + (1 - alpha) * sn[i]);
  return CORPUS.map((c, i) => ({ i, c, d: dense[i], s: sparse[i], dn: dn[i], sn: sn[i], score: score[i] })).sort((a, b) => b.score - a.score || a.i - b.i);
}
WIDGETS.retrievalLab = (box) => {
  whead(box, 'Retrieval lab', 'Toy embeddings: a small concept map stands in for a real embedding model');
  const Q = ['how do I cancel my plan', 'router shows error E-402', 'travelling abroad data costs', 'late payment fee'];
  let q = Q[0], method = 'dense', alpha = 0.5, k = 3;
  const inp = h('input', { class: 'txt-in', id: 'rl-q', value: q, 'aria-label': 'Search query' });
  const list = h('div', { class: 'rank' }); const ctxBox = h('div', { class: 'mono-box', style: { marginTop: '12px', whiteSpace: 'pre-wrap' } });
  const alphaCtl = slider('rl-a', 'Hybrid weight on dense', 0, 1, 0.05, alpha, v => (v * 100).toFixed(0) + '% dense', v => { alpha = v; render(); });
  const render = () => {
    alphaCtl.hidden = method !== 'hybrid';
    const res = search(q, method, alpha); list.innerHTML = '';
    res.forEach((r, n) => list.append(h('div', { class: 'rank-row' + (n < k ? ' in' : '') },
      h('span', { class: 'n' }, String(n + 1)),
      h('span', { class: 'doc' }, h('b', null, r.c[0]), h('span', { style: { display: 'block' } }, r.c[1])),
      h('span', { class: 'sc' },
        h('span', { class: 'w-hint mono' }, 'dense ' + r.d.toFixed(2)), h('span', { class: 'minibar' }, h('i', { style: { width: (r.dn * 100) + '%' } })),
        h('span', { class: 'w-hint mono' }, 'bm25 ' + r.s.toFixed(2)), h('span', { class: 'minibar sp' }, h('i', { style: { width: (r.sn * 100) + '%' } }))))));
    ctxBox.textContent = 'Context sent to the model:\n' + res.slice(0, k).map((r, n) => `[${n + 1}] ${r.c[0]}: ${r.c[1]}`).join('\n') + `\n\nQuestion: ${q}`;
  };
  inp.addEventListener('input', () => { q = inp.value; render(); });
  render();
  box.append(h('div', { class: 'chips-scroll', style: { marginBottom: '10px' } }, Q.map(x => h('button', { class: 'btn btn-sm', onclick: () => { q = x; inp.value = x; render(); } }, x))), inp,
    h('div', { class: 'w-row', style: { margin: '12px 0' } }, seg([['dense', 'Dense'], ['sparse', 'Sparse (BM25)'], ['hybrid', 'Hybrid']], method, v => { method = v; render(); }, 'Method')),
    h('div', { class: 'w-grid2', style: { marginBottom: '12px' } }, slider('rl-k', 'top-k', 1, 5, 1, k, v => String(v), v => { k = v; render(); }), alphaCtl), list, ctxBox);
};
WIDGETS.rerank = (box, o, api) => {
  whead(box, 'Bi-encoder first, cross-encoder second', 'Query: “Can I use my data in Turkey?”');
  const items = [['Roaming in Europe', .81, .41], ['Upgrading your plan', .78, .22], ['Lost or stolen phone', .71, .05], ['Roaming outside Europe', .70, .93], ['Billing dates', .66, .08], ['Slow home internet', .64, .03]];
  let ranked = false;
  const list = h('div', { class: 'rank' });
  const render = () => {
    const arr = items.slice().sort((a, b) => ranked ? b[2] - a[2] : b[1] - a[1]); list.innerHTML = '';
    arr.forEach((it, n) => list.append(h('div', { class: 'rank-row' + (n < 3 ? ' in' : ''), style: it[0] === 'Roaming outside Europe' ? { outline: '2px solid var(--pear-deep)' } : null },
      h('span', { class: 'n' }, String(n + 1)), h('span', { class: 'doc' }, h('b', null, it[0])),
      h('span', { class: 'sc' }, h('span', { class: 'w-hint mono' }, (ranked ? 'cross ' : 'cosine ') + (ranked ? it[2] : it[1]).toFixed(2)), h('span', { class: 'minibar hy' }, h('i', { style: { width: ((ranked ? it[2] : it[1]) * 100) + '%' } }))))));
  };
  const btn = h('button', { class: 'btn btn-primary btn-sm', onclick: () => { ranked = !ranked; btn.textContent = ranked ? 'Show embedding order' : 'Run the reranker'; render(); api.ready(); } }, 'Run the reranker');
  render(); box.append(h('div', { class: 'w-row', style: { marginBottom: '12px' } }, btn, h('span', { class: 'w-hint' }, 'Green rows are the top 3 sent to the model.')), list,
    h('div', { class: 'w-hint', style: { marginTop: '8px' } }, 'Embedding similarity likes anything about roaming or data. The cross-encoder reads question and passage together and sees that only one chunk mentions Turkey.'));
};
WIDGETS.queryRewrite = (box) => {
  whead(box, 'A follow-up question');
  let mode = 'raw';
  const hist = h('div', { class: 'chatlog' },
    h('div', { class: 'msg user' }, 'I\'m going to Turkey next week.'),
    h('div', { class: 'msg asst' }, 'Have a great trip! Roaming in Turkey needs a daily pass.'),
    h('div', { class: 'msg user' }, 'how much is it per day?'));
  const out = h('div');
  const R = { raw: ['how much is it per day?', ['Billing dates', 'Lost or stolen phone', 'Upgrading your plan'], 'no', 'Searching the literal follow-up matches “day” and “much” in unrelated articles. The answer never reaches the model.'],
    rw: ['daily roaming pass price in Turkey', ['Roaming outside Europe', 'Roaming in Europe', 'Billing dates'], 'ok', 'A small, fast model rewrote the turn using the history. The right article ranks first.'] };
  const render = () => { const [qq, res, cls, note] = R[mode]; out.innerHTML = ''; out.append(h('div', { class: 'mono-box', style: { marginTop: '12px' } }, 'search("' + qq + '")'), h('div', { class: 'rank', style: { marginTop: '10px' } }, res.map((t, n) => h('div', { class: 'rank-row' + (t === 'Roaming outside Europe' ? ' in' : ''), style: { gridTemplateColumns: '30px minmax(0,1fr)' } }, h('span', { class: 'n' }, String(n + 1)), h('b', null, t)))), h('div', { class: 'verdict ' + cls }, note)); };
  render(); box.append(hist, h('div', { style: { marginTop: '12px' } }, seg([['raw', 'Search the raw message'], ['rw', 'Rewrite, then search']], mode, v => { mode = v; render(); }, 'Query mode')), out);
};
WIDGETS.ragModes = (box) => {
  whead(box, 'Question: “For a 10-day trip to Turkey, is a roaming pass cheaper than upgrading my plan?”');
  let mode = 'pipe';
  const out = h('div');
  const T = {
    pipe: [['call', 'retrieve(question) → top 3: Roaming outside Europe, Upgrading your plan, Roaming in Europe'], ['asst', 'A roaming pass in Turkey costs 5 per day, so 50 for 10 days. Upgrading your plan is possible at any time. I can\'t compare the two because upgrade prices aren\'t listed.']],
    agent: [['call', 'search("roaming pass Turkey daily cost")'], ['tool', 'Roaming outside Europe: 5 per day with a daily pass…'], ['call', 'search("data plan upgrade prices")'], ['tool', 'Upgrading your plan: switch at any time… (no prices)'], ['call', 'search("plan price list monthly")'], ['tool', 'No relevant results.'], ['asst', 'The pass costs 5 × 10 = 50. Upgrade prices aren\'t in the help centre, and even a bigger plan wouldn\'t include roaming in Turkey, since only EU roaming is included. The pass is the option that works. Want me to show you how to activate it?']]
  };
  const render = () => {
    out.innerHTML = ''; const log = h('div', { class: 'chatlog', style: { marginTop: '12px' } });
    T[mode].forEach(([r, t]) => log.append(h('div', { class: 'msg new ' + r }, h('span', { class: 'role' }, r === 'call' ? 'model → search tool' : r === 'tool' ? 'search result' : 'answer'), t)));
    out.append(log, h('div', { class: 'stat-row' }, h('div', null, h('b', null, mode === 'pipe' ? '1' : '4'), 'model calls'), h('div', null, h('b', null, mode === 'pipe' ? '1' : '3'), 'searches'), h('div', null, h('b', null, mode === 'pipe' ? 'partial' : 'complete'), 'answer')));
  };
  render(); box.append(seg([['pipe', 'Fixed pipeline'], ['agent', 'Agentic RAG']], mode, v => { mode = v; render(); }, 'RAG mode'), out);
};

/* ---------- tools ---------- */
WIDGETS.toolCall = (box, o, api) => {
  whead(box, 'One tool-calling exchange');
  const STEPS = [
    ['context', 'tool definition in context', '{"name": "get_weather",\n "description": "Current forecast for a city. Use for any weather question.",\n "input_schema": {"type": "object",\n   "properties": {"city": {"type": "string"},\n                  "when": {"type": "string"}},\n   "required": ["city"]}}', 'The harness places tool definitions in the context, next to the system prompt.'],
    ['user', 'user', 'Do I need a jacket in Lisbon this evening?', 'A normal user message.'],
    ['call', 'model call #1 → tool call', 'get_weather({"city": "Lisbon", "when": "this evening"})\nstop_reason: "tool_use"', 'Instead of prose, the model emits a structured call and stops generating. The weather is not in its weights, so it asks.'],
    ['tool', 'your code runs it → tool result', '{"temp_c": 14, "wind_kph": 22, "rain_chance": 0.1}', 'Your harness validates the arguments, calls the real weather API and appends the result to the context.'],
    ['asst', 'model call #2 → answer', 'Yes, take a light jacket. It will be about 14°C with a 22 km/h breeze, though rain is unlikely.', 'A second call with the full context, now including the result. The model writes the final answer.']
  ];
  let i = 0;
  const log = h('div', { class: 'chatlog' }); const note = h('div', { class: 'callout' }); const ctr = h('div', { class: 'stat-row' });
  const btn = h('button', { class: 'btn btn-primary btn-sm', 'data-sfx': 'none' }, 'Next step');
  const render = () => {
    const [r, lab, t, n] = STEPS[i];
    log.append(h('div', { class: 'msg new ' + (r === 'context' ? 'system' : r), style: r === 'context' ? { fontFamily: 'var(--f-mono)', fontSize: '12.5px', whiteSpace: 'pre-wrap' } : { whiteSpace: 'pre-wrap' } }, h('span', { class: 'role' }, lab), t));
    note.textContent = n;
    ctr.innerHTML = `<div><b>${i >= 4 ? 2 : i >= 2 ? 1 : 0}</b>model calls</div><div><b>${i >= 3 ? 1 : 0}</b>tool executions</div>`;
    if (i === STEPS.length - 1) { btn.disabled = true; api.ready(); }
  };
  btn.addEventListener('click', () => { if (i < STEPS.length - 1) { i++; const r = STEPS[i][0]; if (r === 'call') SFX.toggle(); else if (r === 'tool') SFX.block(); else SFX.token(i + 4); render(); } });
  render(); box.append(log, note, h('div', { class: 'w-row', style: { marginTop: '12px' } }, btn), ctr);
};
WIDGETS.mcpGraph = (box) => {
  whead(box, 'Integrations to build');
  let N = 4, M = 6, mcp = false;
  const svg = h('div'); const st = h('div');
  const render = () => {
    const H = Math.max(N, M) * 44 + 30; let s = `<svg class="svgchart" viewBox="0 0 600 ${H}" role="img" aria-label="Integration graph">`;
    const ay = k => 24 + k * ((H - 48) / Math.max(1, N - 1 || 1)) + (N === 1 ? (H - 48) / 2 : 0);
    const sy = k => 24 + k * ((H - 48) / Math.max(1, M - 1 || 1)) + (M === 1 ? (H - 48) / 2 : 0);
    const edges = [];
    if (!mcp) for (let a = 0; a < N; a++) for (let b = 0; b < M; b++) edges.push(`<line x1="130" y1="${ay(a)}" x2="470" y2="${sy(b)}" style="stroke:var(--tool);stroke-width:1.5;opacity:.6"/>`);
    else { s += `<rect x="285" y="14" width="30" height="${H - 28}" rx="10" style="fill:var(--tool-soft);stroke:var(--tool);stroke-width:2"/><text x="300" y="${H / 2}" text-anchor="middle" transform="rotate(-90 300 ${H / 2})" style="fill:var(--tool);font-weight:700;font-size:12px">MCP</text>`;
      for (let a = 0; a < N; a++) edges.push(`<line x1="130" y1="${ay(a)}" x2="285" y2="${ay(a)}" style="stroke:var(--tool);stroke-width:2"/>`);
      for (let b = 0; b < M; b++) edges.push(`<line x1="315" y1="${sy(b)}" x2="470" y2="${sy(b)}" style="stroke:var(--tool);stroke-width:2"/>`); }
    s += edges.join('');
    for (let a = 0; a < N; a++) s += `<rect x="20" y="${ay(a) - 15}" width="110" height="30" rx="8" style="fill:var(--harness)"/><text x="75" y="${ay(a) + 5}" text-anchor="middle" style="fill:#fff;font-size:12px;font-weight:700">AI app ${a + 1}</text>`;
    const names = ['Files', 'Calendar', 'Database', 'Issues', 'Email', 'CRM', 'Docs', 'Payments'];
    for (let b = 0; b < M; b++) s += `<rect x="470" y="${sy(b) - 15}" width="110" height="30" rx="8" style="fill:var(--know)"/><text x="525" y="${sy(b) + 5}" text-anchor="middle" style="fill:#fff;font-size:12px;font-weight:700">${names[b]}</text>`;
    svg.innerHTML = s + '</svg>';
    st.innerHTML = `<div class="stat-row"><div><b>${mcp ? N + M : N * M}</b>integrations to build and maintain</div><div><b>${mcp ? 'N + M' : 'N × M'}</b>scaling</div></div>`;
  };
  render();
  box.append(h('div', { class: 'w-grid2' }, slider('mg-n', 'AI apps', 1, 6, 1, N, v => String(v), v => { N = v; render(); }), slider('mg-m', 'Services', 1, 8, 1, M, v => String(v), v => { M = v; render(); })),
    h('div', { style: { margin: '12px 0' } }, seg([[false, 'Custom integrations'], [true, 'With MCP']], mcp, v => { mcp = v; render(); }, 'Mode')), svg, st);
};

/* ---------- agents ---------- */
const LOOP = ['messages = [system_prompt, user_task]', 'while True:', '    reply = model(messages, tools)', '    messages.append(reply)', '    if not reply.tool_calls:', '        break                      # done', '    for call in reply.tool_calls:', '        result = run_tool(call)    # sandboxed', '        messages.append(result)'];
const RUN = [
  [[2, 3], 'model', 'tool call: bash("pytest -q")'], [[6, 7, 8], 'tool', '1 failed: test_total, expected 110, got 100'],
  [[2, 3], 'model', 'tool call: read_file("cart.py")'], [[6, 7, 8], 'tool', 'def total(items, tax=0.1):\n    return sum(items)'],
  [[2, 3], 'model', 'tool call: edit_file("cart.py", "return sum(items) * (1 + tax)")'], [[6, 7, 8], 'tool', 'ok: 1 line changed'],
  [[2, 3], 'model', 'tool call: bash("pytest -q")'], [[6, 7, 8], 'tool', '3 passed'],
  [[2, 3, 4, 5], 'final', 'Fixed: total() ignored its tax argument. All 3 tests pass.']
];
WIDGETS.agentLoop = (box, o, api) => {
  whead(box, 'A coding agent', 'Task: “test_total fails. Fix it.”');
  let i = -1; let tok = 1200;
  const code = h('div', { class: 'code' }); const log = h('div', { class: 'chatlog', style: { marginTop: '12px' } }); const st = h('div', { class: 'stat-row' });
  const btn = h('button', { class: 'btn btn-primary btn-sm', 'data-sfx': 'none' }, 'Step');
  const render = () => {
    const act = i >= 0 ? RUN[i][0] : [0];
    code.innerHTML = LOOP.map((l, k) => `<span class="ln${act.includes(k) ? ' act' : ''}">${esc(l).replace(/(#.*)$/, '<span class="c">$1</span>')}</span>`).join('');
    st.innerHTML = `<div><b>${Math.max(0, Math.ceil((i + 1) / 2))}</b>loop iterations</div><div><b>${RUN.slice(0, i + 1).filter(r => r[1] !== 'tool').length}</b>model calls</div><div><b>${fmt(tok / 1000, 1)}k</b>tokens in context</div>`;
  };
  btn.addEventListener('click', () => {
    if (i >= RUN.length - 1) return; i++; const [, r, t] = RUN[i]; tok += r === 'tool' ? 900 : 150;
    if (r === 'model') SFX.toggle(); else if (r === 'tool') SFX.block(); else SFX.correct();
    log.append(h('div', { class: 'msg new ' + (r === 'model' ? 'call' : r === 'tool' ? 'tool' : 'asst'), style: { whiteSpace: 'pre-wrap' } }, h('span', { class: 'role' }, r === 'model' ? 'model' : r === 'tool' ? 'tool result' : 'model, no tool calls → loop ends'), t));
    render(); if (i === RUN.length - 1) { btn.disabled = true; btn.textContent = 'Loop exited'; api.ready(); }
  });
  render(); box.append(code, h('div', { class: 'w-row', style: { marginTop: '12px' } }, btn), st, log);
};
WIDGETS.contextRun = (box) => {
  whead(box, 'A 60-step agent run', 'Window: 128k tokens');
  const WIN = 128000; const S = { clear: false, compact: false, sub: false };
  const out = h('div');
  const sim = () => {
    const pts = []; let entries = []; let overflow = null;
    const sys = 6000;
    for (let t = 1; t <= 60; t++) {
      let big = 1500 + ((t * 7919) % 5) * 900; if (t % 3 === 0) big = S.sub ? 500 : 7000;
      entries.push({ t, n: big + 300 });
      if (S.clear) entries = entries.map(e => (t - e.t > 8 && e.n > 400) ? { t: e.t, n: 350 } : e);
      let tot = sys + entries.reduce((a, e) => a + e.n, 0);
      if (S.compact && tot > WIN * 0.8) { entries = [{ t, n: 5000 }]; tot = sys + 5000; }
      if (tot > WIN && overflow == null) overflow = t;
      pts.push(Math.min(tot, WIN * 1.4));
    }
    const recent = entries.filter(e => 60 - e.t < 8).reduce((a, e) => a + e.n, 0);
    return { pts, overflow, relevant: recent / (sys + entries.reduce((a, e) => a + e.n, 0)) };
  };
  const render = () => {
    const { pts, overflow, relevant } = sim(); const Wd = 600, Hh = 220, top = WIN * 1.4;
    const x = i => 40 + i / 59 * (Wd - 50), y = v => 10 + (1 - v / top) * (Hh - 30);
    let s = `<svg class="svgchart" viewBox="0 0 ${Wd} ${Hh}" role="img" aria-label="Context size over steps">`;
    [0, 64000, 128000, 179200].forEach(v => { s += `<line x1="40" x2="${Wd - 10}" y1="${y(v)}" y2="${y(v)}" style="stroke:var(--line)"/><text x="34" y="${y(v) + 4}" text-anchor="end">${v / 1000}k</text>`; });
    s += `<line x1="40" x2="${Wd - 10}" y1="${y(WIN)}" y2="${y(WIN)}" style="stroke:var(--bad);stroke-width:2;stroke-dasharray:6 4"/><text x="${Wd - 12}" y="${y(WIN) - 6}" text-anchor="end" style="fill:var(--bad)">window limit</text>`;
    s += `<path d="M${pts.map((v, i) => `${x(i)},${y(v)}`).join(' L')} L${x(59)},${y(0)} L${x(0)},${y(0)} Z" style="fill:color-mix(in srgb, var(--harness) 18%, transparent)"/>`;
    s += `<path d="M${pts.map((v, i) => `${x(i)},${y(v)}`).join(' L')}" style="fill:none;stroke:var(--harness);stroke-width:2.5"/>`;
    s += `<circle cx="${x(59)}" cy="${y(pts[59])}" r="4.5" style="fill:var(--harness)"/>`;
    [1, 15, 30, 45, 60].forEach(t => { s += `<text x="${x(t - 1)}" y="${Hh - 4}" text-anchor="middle">step ${t}</text>`; });
    out.innerHTML = s + '</svg>';
    out.append(h('div', { class: 'stat-row' }, h('div', null, h('b', null, overflow ? 'step ' + overflow : 'never'), 'window overflows'),
      h('div', null, h('b', null, Math.round(relevant * 100) + '%'), 'of final context is from the last 8 steps'),
      h('div', null, h('b', null, fmt(pts[59] / 1000, 0) + 'k'), 'tokens at step 60')));
  };
  const chip = (k, label) => { const b = h('button', { class: 'btn btn-sm', 'aria-pressed': 'false', onclick: () => { S[k] = !S[k]; b.setAttribute('aria-pressed', String(S[k])); b.classList.toggle('btn-primary', S[k]); render(); } }, label); return b; };
  render();
  box.append(h('div', { class: 'w-row', style: { marginBottom: '12px' } }, chip('clear', 'Clear old tool results'), chip('compact', 'Compact at 80%'), chip('sub', 'Sub-agent for searches')), out);
};
WIDGETS.skills = (box) => {
  whead(box, 'A library of eight skills', 'Task: “Turn these numbers into a budget spreadsheet”');
  const SK = [['xlsx', 'Build and edit Excel spreadsheets with formulas', 4200], ['pptx', 'Create slide decks', 5100], ['pdf', 'Fill, merge and extract PDFs', 3600], ['brand-voice', 'Write in the company style guide', 2300], ['release-checklist', 'Steps before shipping a release', 1800], ['sql-reports', 'Query the warehouse and format reports', 3900], ['legal-review', 'Check contracts against the playbook', 6200], ['incident', 'Run an incident response', 2700]];
  let mode = 'prog', ran = false;
  const out = h('div');
  const render = () => {
    const all = SK.reduce((a, s) => a + s[2], 0); const desc = SK.length * 40; const used = mode === 'up' ? all : desc + (ran ? SK[0][2] : 0);
    out.innerHTML = '';
    out.append(h('div', { class: 'rank' }, SK.map((s, k) => {
      const loaded = mode === 'up' || (ran && k === 0);
      return h('div', { class: 'rank-row' + (loaded && mode === 'prog' ? ' in' : ''), style: { gridTemplateColumns: 'minmax(0,1fr) auto' } }, h('span', { class: 'doc' }, h('b', { class: 'mono' }, s[0]), h('span', { style: { display: 'block' } }, s[1])), h('span', { class: 'w-hint mono tnum' }, loaded ? fmt(s[2], 0) + ' tok loaded' : '~40 tok (name + description)'));
    })), h('div', { class: 'stat-row' }, h('div', null, h('b', null, fmt(used, 0)), 'skill tokens in context'), h('div', null, h('b', null, mode === 'up' ? '8 of 8' : (ran ? '1 of 8' : '0 of 8')), 'skills fully loaded')));
  };
  render();
  box.append(h('div', { class: 'w-row', style: { marginBottom: '12px' } }, seg([['up', 'Load everything up front'], ['prog', 'Progressive disclosure']], mode, v => { mode = v; render(); }, 'Loading mode'),
    h('button', { class: 'btn btn-primary btn-sm', onclick: () => { ran = true; render(); } }, 'Run the task')), out);
};
const PATS = {
  chain: ['Prompt chaining', 'Fixed sequence of calls, with code checks between them.', 'Tasks that split cleanly into known steps: outline, check, write.', [['Input', 20, 70], ['LLM: outline', 140, 70], ['Code check', 280, 70], ['LLM: write', 420, 70], ['Output', 560, 70]], [[0, 1], [1, 2], [2, 3], [3, 4]]],
  route: ['Routing', 'A cheap classifier sends each input to a specialised path or model.', 'Distinct request types with different best handlers or costs.', [['Input', 20, 70], ['Router', 160, 70], ['Billing agent', 360, 10], ['Tech agent', 360, 70], ['Small model', 360, 130]], [[0, 1], [1, 2], [1, 3], [1, 4]]],
  par: ['Parallelisation', 'Independent sub-tasks run at once; results are merged. Voting runs the same task several times.', 'Independent checks or sections; when speed or confidence matters.', [['Input', 20, 70], ['LLM a', 200, 10], ['LLM b', 200, 70], ['LLM c', 200, 130], ['Aggregate', 400, 70]], [[0, 1], [0, 2], [0, 3], [1, 4], [2, 4], [3, 4]]],
  orch: ['Orchestrator and workers', 'A lead model plans, spawns workers with focused briefs, and synthesises their summaries.', 'Broad tasks where the sub-tasks are only known after planning: research, large refactors.', [['Task', 20, 70], ['Orchestrator', 170, 70], ['Worker 1', 380, 10], ['Worker 2', 380, 70], ['Worker 3', 380, 130], ['Report', 560, 70]], [[0, 1], [1, 2], [1, 3], [1, 4], [2, 5], [3, 5], [4, 5]]],
  eval: ['Evaluator and optimiser', 'One model drafts, another critiques against criteria, and the loop repeats until it passes.', 'Clear quality criteria and iterative improvement: translation, code review.', [['Input', 20, 70], ['Generator', 180, 70], ['Evaluator', 380, 70], ['Output', 560, 70]], [[0, 1], [1, 2], [2, 1, 'loop'], [2, 3]]]
};
WIDGETS.patterns = (box) => {
  whead(box, 'Multi-call patterns');
  let p = 'orch'; const svg = h('div', { class: 'scroll-x' }); const txt = h('div', { class: 'callout' });
  const render = () => {
    const [name, what, when, nodes, edges] = PATS[p];
    let s = `<svg class="svgchart" viewBox="0 0 680 180" style="min-width:520px" role="img" aria-label="${name} diagram"><defs><marker id="pa" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var(--faint)"/></marker></defs>`;
    edges.forEach(([a, b, loop]) => {
      const A = nodes[a], B = nodes[b];
      if (loop) s += `<path d="M${A[1] + 50} ${A[2] + 40} C ${A[1] + 50} ${A[2] + 90}, ${B[1] + 50} ${B[2] + 90}, ${B[1] + 50} ${B[2] + 42}" style="fill:none;stroke:var(--harness);stroke-width:2;stroke-dasharray:5 4" marker-end="url(#pa)"/><text x="${(A[1] + B[1]) / 2 + 50}" y="${A[2] + 92}" text-anchor="middle" style="fill:var(--harness)">feedback until pass</text>`;
      else s += `<line x1="${A[1] + 100}" y1="${A[2] + 20}" x2="${B[1] - 2}" y2="${B[2] + 20}" style="stroke:var(--faint);stroke-width:2" marker-end="url(#pa)"/>`;
    });
    nodes.forEach(([t, x, y], k) => { const llm = /LLM|agent|Router|Orchestrator|Worker|Generator|Evaluator|model|Aggregate/.test(t); s += `<rect x="${x}" y="${y}" width="100" height="40" rx="10" style="fill:${llm ? 'var(--harness)' : 'var(--sunk)'};stroke:var(--bp-edge)"/><text x="${x + 50}" y="${y + 25}" text-anchor="middle" style="fill:${llm ? '#fff' : 'var(--ink)'};font-family:var(--f-body);font-size:12.5px;font-weight:700">${t}</text>`; });
    svg.innerHTML = s + '</svg>';
    txt.innerHTML = `<div class="eyebrow">${name}</div><b>What:</b> ${what}<br><b>Use when:</b> ${when}`;
  };
  render();
  box.append(seg(Object.entries(PATS).map(([k, v]) => [k, v[0]]), p, v => { p = v; render(); }, 'Pattern'), h('div', { style: { marginTop: '12px' } }, svg), h('div', { class: 'swipe-hint' }, 'Swipe the diagram sideways to see all of it.'), txt);
};
WIDGETS.fanout = (box) => {
  whead(box, 'Researching N sources, 8k tokens each');
  let n = 6; const out = h('div');
  const render = () => {
    const single = 3 + n * 8; const per = Math.ceil(n / 3); const worker = 2 + per * 8; const orch = 3 + 3 * 1;
    const tSingle = n; const tMulti = 1 + per + 1; const mx = Math.max(single, worker, orch, 1);
    out.innerHTML = '';
    out.append(h('div', { class: 'w-hint', style: { marginBottom: '6px' } }, 'Peak context per model (thousands of tokens)'), barsEl([
      { lab: 'single agent', p: single / mx, pctText: single + 'k', color: 'var(--bad)' },
      { lab: 'orchestrator', p: orch / mx, pctText: orch + 'k', color: 'var(--harness)' },
      { lab: 'each worker', p: worker / mx, pctText: worker + 'k', color: 'var(--know)' }]),
    h('div', { class: 'stat-row' }, h('div', null, h('b', null, tSingle + ' rounds'), 'sequential reading, one agent'), h('div', null, h('b', null, tMulti + ' rounds'), 'plan, 3 workers in parallel, synthesise')),
    h('div', { class: 'w-hint', style: { marginTop: '6px' } }, 'Each worker returns about a 1k summary. The orchestrator reasons over three summaries instead of every raw page.'));
  };
  render(); box.append(slider('fo-n', 'Sources', 2, 15, 1, n, v => String(v), v => { n = v; render(); }), h('div', { style: { marginTop: '12px' } }, out));
};

/* ---------- production ---------- */
WIDGETS.evalRun = (box) => {
  whead(box, 'Support-bot eval suite', '8 cases · run on every change');
  const CASES = [['Refund for damaged item cites the 14-day policy', 'LLM judge', [1, 1, 1]], ['Router reset lists all three steps', 'code', [1, 0, 1]], ['Spanish question gets a Spanish answer', 'code', [0, 0, 1]], ['Refuses to reveal another customer\'s data', 'LLM judge', [1, 1, 1]], ['Cites the help article it used', 'code', [0, 1, 1]], ['Stays under 120 words', 'code', [0, 1, 1]], ['Handoff ticket is valid JSON', 'code', [1, 1, 1]], ['Angry customer is offered a human', 'LLM judge', [1, 1, 0]]];
  const V = ['v1: baseline prompt', 'v2: + “answer in under 50 words, cite sources”', 'v3: + reply in user\'s language, 120-word cap, two examples'];
  let v = 0; const out = h('div');
  const render = () => {
    out.innerHTML = '';
    const pass = CASES.filter(c => c[2][v]).length;
    out.append(h('div', { class: 'rank' }, CASES.map(([t, g, r]) => {
      const now = r[v], prev = v ? r[v - 1] : now; const tag = v && now !== prev ? (now ? 'fixed' : 'REGRESSION') : '';
      return h('div', { class: 'rank-row' + (now ? ' in' : ''), style: { gridTemplateColumns: '26px minmax(0,1fr) auto', borderColor: tag === 'REGRESSION' ? 'var(--bad)' : '' } },
        h('span', { class: 'n', style: { color: now ? 'var(--good)' : 'var(--bad)' } }, now ? '✓' : '✗'),
        h('span', { class: 'doc' }, h('b', null, t), h('span', { style: { display: 'block' } }, 'grader: ' + g)),
        tag ? h('span', { class: 'chip', style: { background: tag === 'fixed' ? 'var(--good-soft)' : 'var(--bad-soft)', color: tag === 'fixed' ? 'var(--good)' : 'var(--bad)' } }, tag) : h('span'));
    })), h('div', { class: 'stat-row' }, h('div', null, h('b', null, `${pass} / 8`), 'passing'), h('div', null, h('b', null, V[v].split(':')[0]), V[v].split(':').slice(1).join(':'))));
  };
  render(); box.append(seg([[0, 'Prompt v1'], [1, 'Prompt v2'], [2, 'Prompt v3']], v, x => { v = x; render(); }, 'Prompt version'), h('div', { style: { marginTop: '12px' } }, out),
    h('div', { class: 'w-hint', style: { marginTop: '8px' } }, 'v2 scores higher than v1 and still breaks a case that used to pass. Without the suite, that regression ships silently.'));
};
WIDGETS.trace = (box) => {
  whead(box, 'Trace of one request', '“Find me a flight to Rome under 200 and summarise options”');
  const SP = [['request', 0, 5280, 0, 'Total 5.28 s · 3 model-side spans · est. cost $0.021'], ['gateway', 0, 25, 1, 'Auth, rate limit, routing. 25 ms.'], ['retrieve.embed', 30, 75, 1, 'Embed query with a small embedding model. 45 ms.'], ['retrieve.search', 75, 140, 1, 'Hybrid search over policy docs, 50 candidates. 65 ms.'], ['retrieve.rerank', 140, 330, 1, 'Cross-encoder over 50 candidates, keep 4. 190 ms.'], ['llm.call #1 (plan)', 335, 1335, 1, 'Input 3,200 tok (2,600 cached) · output 60 tok (tool call) · TTFT 420 ms. 1.0 s.'], ['tool: search_flights', 1345, 3445, 1, 'External flight API. 2.1 s. The slowest span by far.'], ['llm.call #2 (answer)', 3455, 5255, 1, 'Input 5,800 tok · output 85 tok streamed · TTFT 400 ms. 1.8 s.']];
  const COL = ['var(--faint)', 'var(--hw-2)', 'var(--know)', 'var(--know)', 'var(--know)', 'var(--model)', 'var(--tool)', 'var(--model)'];
  let sel = 6; const list = h('div', { class: 'trace' }); const det = h('div', { class: 'callout' });
  const render = () => {
    list.innerHTML = '';
    SP.forEach(([n, a, b, d], k) => list.append(h('div', { class: 'trace-row' + (k === sel ? ' on' : ''), role: 'button', tabindex: '0', onclick: () => { sel = k; render(); }, onkeydown: e => { if (e.key === 'Enter') { sel = k; render(); } } },
      h('span', { class: 'nm', style: { paddingLeft: (d * 14) + 'px' } }, n),
      h('div', { class: 'trace-track' }, h('div', { class: 'trace-seg', style: { left: (a / 5280 * 100) + '%', width: Math.max(0.6, (b - a) / 5280 * 100) + '%', background: COL[k] } })))));
    det.innerHTML = `<div class="eyebrow">${esc(SP[sel][0])}</div>${esc(SP[sel][4])}`;
  };
  render(); box.append(h('div', { class: 'scroll-x' }, h('div', { style: { minWidth: '460px' } }, list)), det);
};
