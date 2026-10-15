/* ================= maths and code rendering =================
   texify(html) turns \( inline \) and \[ display \] TeX into native MathML (no library, works offline).
   Supported: ^ _ {} \frac \sqrt \text \mathrm \operatorname \mathbf \mathbb \mathcal \hat \bar \tilde
   \left \right \begin{cases}, Greek letters, common operators and named functions. */
const TEX_SYM = {
  alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', epsilon: 'ε', varepsilon: 'ε', zeta: 'ζ', eta: 'η', theta: 'θ', iota: 'ι', kappa: 'κ', lambda: 'λ', mu: 'μ', nu: 'ν', xi: 'ξ', pi: 'π', rho: 'ρ', sigma: 'σ', tau: 'τ', phi: 'φ', varphi: 'φ', chi: 'χ', psi: 'ψ', omega: 'ω',
  Gamma: 'Γ', Delta: 'Δ', Theta: 'Θ', Lambda: 'Λ', Xi: 'Ξ', Pi: 'Π', Sigma: 'Σ', Phi: 'Φ', Psi: 'Ψ', Omega: 'Ω', ell: 'ℓ', infty: '∞', partial: '∂', nabla: '∇', emptyset: '∅'
};
const TEX_OP = {
  cdot: '⋅', times: '×', div: '÷', pm: '±', le: '≤', leq: '≤', ge: '≥', geq: '≥', ne: '≠', neq: '≠', approx: '≈', ll: '≪', gg: '≫', lesssim: '≲', gtrsim: '≳', sim: '∼', equiv: '≡', propto: '∝', in: '∈', notin: '∉', subset: '⊂', cup: '∪', cap: '∩',
  to: '→', rightarrow: '→', leftarrow: '←', Rightarrow: '⇒', mapsto: '↦', mid: '∣', vert: '|', lVert: '‖', rVert: '‖', '|': '‖', odot: '⊙', oplus: '⊕', otimes: '⊗', circ: '∘', top: '⊤', ast: '∗', star: '⋆',
  ldots: '…', cdots: '⋯', dots: '…', forall: '∀', exists: '∃', neg: '¬', land: '∧', lor: '∨', langle: '⟨', rangle: '⟩', lfloor: '⌊', rfloor: '⌋', lceil: '⌈', rceil: '⌉', '{': '{', '}': '}', '%': '%', '#': '#', '&': '&', '_': '_'
};
const TEX_BIG = { sum: '∑', prod: '∏', int: '∫' };
const TEX_FN = ['log', 'ln', 'exp', 'max', 'min', 'sin', 'cos', 'tan', 'arg', 'argmax', 'argmin', 'softmax', 'sigmoid', 'det', 'dim', 'lim', 'sup', 'inf', 'Pr', 'tr', 'diag', 'concat'];
const TEX_SPACE = { quad: '1em', qquad: '2em', ',': '0.17em', ';': '0.28em', ':': '0.22em', '!': '-0.17em', ' ': '0.25em' };

function texEsc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function texStyled(ch, font) {
  const c = ch.codePointAt(0); const up = c >= 65 && c <= 90, lo = c >= 97 && c <= 122, dg = c >= 48 && c <= 57;
  if (font === 'bb') { const sp = { R: 'ℝ', N: 'ℕ', Z: 'ℤ', Q: 'ℚ', C: 'ℂ' }; if (sp[ch]) return sp[ch]; if (up) return String.fromCodePoint(0x1D538 + c - 65); if (dg) return String.fromCodePoint(0x1D7D8 + c - 48); return ch; }
  if (font === 'cal') { const sp = { B: 'ℬ', E: 'ℰ', F: 'ℱ', H: 'ℋ', I: 'ℐ', L: 'ℒ', M: 'ℳ', R: 'ℛ' }; if (sp[ch]) return sp[ch]; if (up) return String.fromCodePoint(0x1D49C + c - 65); return ch; }
  if (font === 'bf') { if (up) return String.fromCodePoint(0x1D400 + c - 65); if (lo) return String.fromCodePoint(0x1D41A + c - 97); if (dg) return String.fromCodePoint(0x1D7CE + c - 48); return ch; }
  return ch;
}

function texToMathML(src, display) {
  let i = 0; const s = src;
  const peek = () => s[i];
  const skipWs = () => { while (i < s.length && /\s/.test(s[i])) i++; };
  const readCmd = () => { i++; if (i < s.length && !/[A-Za-z]/.test(s[i])) return s[i++]; const st = i; while (i < s.length && /[A-Za-z]/.test(s[i])) i++; return s.slice(st, i); };
  const readRaw = () => { skipWs(); if (s[i] !== '{') return s[i++] || ''; let d = 0, st = ++i; for (; i < s.length; i++) { if (s[i] === '{') d++; else if (s[i] === '}') { if (!d) break; d--; } } const out = s.slice(st, i); i++; return out; };
  const group = () => { skipWs(); if (s[i] === '{') { i++; const r = seq('}'); i++; return wrap(r); } return atom() || ''; };
  const wrap = parts => parts.length === 1 ? parts[0] : `<mrow>${parts.join('')}</mrow>`;
  const opDelim = (ch, stretch) => `<mo stretchy="${stretch ? 'true' : 'false'}" lspace="0" rspace="0">${texEsc(ch)}</mo>`;
  function delimAfter(stretch) {
    skipWs(); if (s[i] === '\\') { const c = readCmd(); if (c === '.') return ''; return opDelim(TEX_OP[c] || c, stretch); }
    return opDelim(s[i++], stretch);
  }
  function cases() {
    // body until \end{cases}
    const end = s.indexOf('\\end{cases}', i); const body = s.slice(i, end < 0 ? s.length : end); i = end < 0 ? s.length : end + 11;
    const rows = body.split(/\\\\/).map(r => r.trim()).filter(Boolean).map(r => `<mtr>${r.split('&').map(c => `<mtd style="text-align:left;padding:.2em 1em .2em 0">${texToMathML(c.trim(), false).replace(/^<math[^>]*>|<\/math>$/g, '')}</mtd>`).join('')}</mtr>`);
    return `<mrow><mo stretchy="true">{</mo><mtable columnalign="left">${rows.join('')}</mtable></mrow>`;
  }
  function atom() {
    skipWs(); if (i >= s.length) return null;
    const ch = s[i];
    if (ch === '{') { i++; const r = seq('}'); i++; return wrap(r); }
    if (ch === '}') return null;
    if (/[0-9]/.test(ch) || (ch === '.' && /[0-9]/.test(s[i + 1] || ''))) { const m = /^[0-9]*\.?[0-9]+/.exec(s.slice(i)); i += m[0].length; return `<mn>${m[0]}</mn>`; }
    if (/[A-Za-z]/.test(ch)) { i++; return `<mi>${ch}</mi>`; }
    if (ch === '\\') {
      const c = readCmd();
      if (c === 'frac' || c === 'dfrac' || c === 'tfrac') { const a = group(), b = group(); return `<mfrac>${a}${b}</mfrac>`; }
      if (c === 'sqrt') { skipWs(); if (s[i] === '[') { const e = s.indexOf(']', i); const n = texToMathML(s.slice(i + 1, e), false).replace(/^<math[^>]*>|<\/math>$/g, ''); i = e + 1; return `<mroot>${group()}<mrow>${n}</mrow></mroot>`; } return `<msqrt>${group()}</msqrt>`; }
      if (c === 'text' || c === 'textrm' || c === 'mbox') return `<mtext>${texEsc(readRaw())}</mtext>`;
      if (c === 'mathrm' || c === 'operatorname' || c === 'texttt') { const t = readRaw(); return `<mi mathvariant="normal"${c === 'texttt' ? ' class="tt"' : ''}>${texEsc(t)}</mi>`; }
      if (c === 'mathbf' || c === 'boldsymbol' || c === 'bm') { const t = readRaw(); return `<mi mathvariant="normal">${[...t].map(x => texStyled(x, 'bf')).join('')}</mi>`; }
      if (c === 'mathbb') return `<mi mathvariant="normal">${[...readRaw()].map(x => texStyled(x, 'bb')).join('')}</mi>`;
      if (c === 'mathcal') return `<mi mathvariant="normal">${[...readRaw()].map(x => texStyled(x, 'cal')).join('')}</mi>`;
      if (c === 'hat' || c === 'bar' || c === 'tilde' || c === 'vec' || c === 'overline') { const acc = { hat: '^', bar: '¯', overline: '¯', tilde: '~', vec: '→' }[c]; return `<mover accent="true">${group()}<mo>${acc}</mo></mover>`; }
      if (c === 'left') return delimAfter(true);
      if (c === 'right') return delimAfter(true);
      if (c === 'big' || c === 'Big' || c === 'bigg' || c === 'Bigg') return delimAfter(true);
      if (c === 'begin') { const env = readRaw(); if (env === 'cases') return cases(); return ''; }
      if (TEX_SPACE[c]) return `<mspace width="${TEX_SPACE[c]}"></mspace>`;
      if (TEX_SYM[c]) { const up = /^[A-Z]/.test(c); return `<mi${up ? ' mathvariant="normal"' : ''}>${TEX_SYM[c]}</mi>`; }
      if (TEX_BIG[c]) return `<mo largeop="true" movablelimits="${display ? 'false' : 'true'}" data-big="1">${TEX_BIG[c]}</mo>`;
      if (TEX_FN.includes(c)) return `<mi>${c === 'argmax' ? 'arg max' : c === 'argmin' ? 'arg min' : c}</mi><mo>&#x2061;</mo>`;
      if (TEX_OP[c]) return `<mo>${texEsc(TEX_OP[c])}</mo>`;
      return `<mtext>${texEsc('\\' + c)}</mtext>`;
    }
    i++;
    if (ch === "'") return `<mo>′</mo>`;
    if (ch === '-') return '<mo>−</mo>';
    if (ch === '*') return '<mo>∗</mo>';
    if (ch === '~') return `<mspace width="0.25em"></mspace>`;
    if ('()[]|'.includes(ch)) return opDelim(ch, false);
    return `<mo>${texEsc(ch)}</mo>`;
  }
  function seq(stop) {
    const out = [];
    while (i < s.length) {
      skipWs(); if (i >= s.length || s[i] === stop) break;
      if (s[i] === '^' || s[i] === '_') { // script with no base
        out.push('<mrow></mrow>');
      } else {
        const a = atom(); if (a === null) break; if (a === '') continue; out.push(a);
      }
      let sub = null, sup = null;
      for (;;) {
        skipWs();
        if (s[i] === '_') { i++; sub = group(); } else if (s[i] === '^') { i++; sup = group(); } else break;
      }
      if (sub || sup) {
        let base = out.pop();
        if (base.endsWith('<mo>&#x2061;</mo>')) { base = base.slice(0, -'<mo>&#x2061;</mo>'.length); }
        const under = display && /data-big|<mi>(max|min|arg max|arg min|lim)<\/mi>/.test(base);
        const b = base.replace(' data-big="1"', '');
        if (under) out.push(sub && sup ? `<munderover>${b}${sub}${sup}</munderover>` : sub ? `<munder>${b}${sub}</munder>` : `<mover>${b}${sup}</mover>`);
        else out.push(sub && sup ? `<msubsup>${b}${sub}${sup}</msubsup>` : sub ? `<msub>${b}${sub}</msub>` : `<msup>${b}${sup}</msup>`);
      }
    }
    return out.map(x => x.replace(' data-big="1"', ''));
  }
  const body = seq(null).join('');
  return `<math${display ? ' display="block"' : ''}><mrow>${body}</mrow></math>`;
}

/* KaTeX (vendored, self-hosted, loaded with defer so it never blocks the first paint) typesets every formula;
   the built-in MathML converter covers the moment before it arrives or a failed load. */
document.addEventListener('DOMContentLoaded', () => {
  // a lesson opened from a deep link may have rendered before KaTeX arrived: upgrade its fallback maths in place
  if (!window.katex) return;
  document.querySelectorAll('.math-block, .prose, .callout, .p-foot').forEach(el => {
    el.querySelectorAll('math[data-tex]').forEach(m => { const t = m.getAttribute('data-tex'); const span = document.createElement('span'); span.innerHTML = texSafe(t, m.getAttribute('display') === 'block'); m.replaceWith(...span.childNodes); });
  });
});
function texSafe(t, display) {
  try {
    if (window.katex) return katex.renderToString(t, { displayMode: display, throwOnError: false, output: 'htmlAndMathml', strict: 'ignore', trust: false });
    return texToMathML(t, display).replace('<math', `<math data-tex="${texEsc(t).replace(/"/g, '&quot;')}"`);
  } catch (e) { console.error('maths failed to render:', t); return `<code>${texEsc(t)}</code>`; }
}
/** Replace \( … \) and \[ … \] in an HTML string with MathML. */
function texify(html) {
  if (!html || html.indexOf('\\') < 0) return html;
  return html
    .replace(/\\\[([\s\S]+?)\\\]/g, (_, t) => `<div class="math-block" role="math" tabindex="0">${texSafe(t.trim(), true)}</div>`)
    .replace(/\\\(([\s\S]+?)\\\)/g, (_, t) => texSafe(t.trim(), false));
}

/* ---- code blocks: tiny highlighter (Python, bash, SQL, JSON, Jinja, YAML) ---- */
const CODE_KW = {
  python: 'and as assert async await break class continue def del elif else except False finally for from global if import in is lambda None nonlocal not or pass raise return True try while with yield',
  sql: 'select from where order by limit create extension table index on using insert into values returning as with join left inner group having and or not null primary key references vector text bigserial int float update set delete',
  bash: 'export if then else fi for do done in echo cd pip uv curl python vllm npx docker',
  js: 'const let var function return if else for of in new await async import from export true false null',
  json: 'true false null', yaml: 'true false null', jinja: 'for in endfor if elif else endif set not and or'
};
function hiCode(src, lang) {
  const kw = new Set((CODE_KW[lang] || '').split(' ').map(w => lang === 'sql' ? w : w));
  const cmt = lang === 'sql' ? /--[^\n]*/y : lang === 'js' || lang === 'json' ? /\/\/[^\n]*/y : lang === 'jinja' ? /\{#[\s\S]*?#\}/y : /#[^\n]*/y;
  const rules = [
    ['c', cmt],
    ['s', /("""[\s\S]*?"""|'''[\s\S]*?'''|f?"(?:\\.|[^"\\\n])*"|f?'(?:\\.|[^'\\\n])*')/y],
    ['t', lang === 'jinja' ? /(\{%-?|-?%\}|\{\{-?|-?\}\})/y : /(?!)/y],
    ['d', lang === 'python' ? /@[\w.]+/y : /(?!)/y],
    ['n', /\b\d[\d_]*(?:\.\d+)?(?:e[-+]?\d+)?\b/y],
    ['w', /[A-Za-z_][\w]*/y],
    ['o', /[\s\S]/y]
  ];
  let out = '', i = 0;
  while (i < src.length) {
    for (const [k, re] of rules) {
      re.lastIndex = i; const m = re.exec(src); if (!m) continue;
      const t = m[0]; i += t.length;
      if (k === 'w') {
        const isKw = lang === 'sql' ? kw.has(t.toLowerCase()) : kw.has(t);
        const isFn = !isKw && src[i] === '(';
        out += isKw ? `<span class="hk">${t}</span>` : isFn ? `<span class="hf">${t}</span>` : texEsc(t);
      } else if (k === 'o') out += texEsc(t);
      else out += `<span class="h${k}">${texEsc(t)}</span>`;
      break;
    }
  }
  return out;
}
function codeBlock(c) {
  const pre = h('pre', { class: 'code-src', tabindex: '0', 'aria-label': (c.title || 'Code') + ' (' + c.lang + ')' }, h('code', { html: hiCode(c.src.replace(/^\n+|\s+$/g, ''), c.lang) }));
  const btn = h('button', { class: 'copy-btn', 'aria-label': 'Copy code', onclick: () => {
    const done = ok => { btn.textContent = ok ? 'Copied' : 'Select and copy'; setTimeout(() => { btn.textContent = 'Copy'; }, 1600); };
    try { navigator.clipboard.writeText(c.src.trim()).then(() => done(true), () => done(false)); } catch (e) { done(false); }
  } }, 'Copy');
  return h('figure', { class: 'code-card' },
    h('figcaption', null, h('span', { class: 'lang' }, c.lang), h('span', { class: 'cap' }, c.title || ''), btn), pre);
}
