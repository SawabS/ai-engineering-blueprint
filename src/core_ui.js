/* ================= icons ================= */
const SV = (inner, sw = 2.4) => `<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;
const ICON = {
  'two-boxes': SV('<rect x="4" y="9" width="11" height="14" rx="2.5"/><rect x="18" y="9" width="10" height="14" rx="2.5" stroke-dasharray="3 2.6"/>'),
  'next-token': SV('<path d="M6 26V19M12 26V7M18 26V14M24 26V21"/>', 3.4),
  tokens: SV('<rect x="3" y="11" width="8" height="10" rx="2"/><rect x="12" y="11" width="8" height="10" rx="2"/><rect x="21" y="11" width="8" height="10" rx="2"/>'),
  attention: SV('<circle cx="6" cy="23" r="2.6"/><circle cx="16" cy="23" r="2.6"/><circle cx="26" cy="23" r="2.6"/><path d="M6 20c2-10 18-10 20 0M16 20c1-6 9-6 10 0"/>'),
  training: SV('<path d="M4 7c6 19 18 19 24 4"/><circle cx="11" cy="17" r="3.2" fill="currentColor"/>'),
  gpus: SV('<rect x="8" y="8" width="16" height="16" rx="3"/><rect x="12.5" y="12.5" width="7" height="7" rx="1.5"/><path d="M12 4v4M16 4v4M20 4v4M12 24v4M16 24v4M20 24v4M4 12h4M4 16h4M4 20h4M24 12h4M24 16h4M24 20h4"/>', 2),
  'kv-cache': SV('<path d="M16 5l11 6-11 6-11-6z"/><path d="M5 16l11 6 11-6M5 21l11 6 11-6"/>'),
  serving: SV('<path d="M4 14L16 5l12 9"/><rect x="8" y="16" width="16" height="11" rx="2"/><path d="M12 21.5h8"/>'),
  context: SV('<rect x="5" y="5" width="22" height="22" rx="3.5"/><path d="M10 11h12M10 16h8M10 21h10"/>'),
  steering: SV('<path d="M12 5c-4 0-4 3-4 6s-1 5-4 5c3 0 4 2 4 5s0 6 4 6M20 5c4 0 4 3 4 6s1 5 4 5c-3 0-4 2-4 5s0 6-4 6"/>'),
  knowledge: SV('<path d="M16 8c-3-2-7-3-11-2v19c4-1 8 0 11 2 3-2 7-3 11-2V6c-4-1-8 0-11 2zM16 8v19"/>'),
  retrieval: SV('<circle cx="14" cy="14" r="8"/><path d="M20 20l7 7"/>', 2.8),
  'advanced-rag': SV('<path d="M4 6h24l-9 11v9l-6-3v-6z"/>'),
  tools: SV('<path d="M20.5 4.5a6.5 6.5 0 0 0-6 8.9L4.8 23.1a2.5 2.5 0 0 0 3.5 3.5l9.8-9.8a6.5 6.5 0 0 0 8.4-8.4l-4 4-3.4-.6-.6-3.4 4-4a6.5 6.5 0 0 0-2-.4z"/>', 2.2),
  mcp: SV('<path d="M11 4v7M21 4v7M8 11h16v5a8 8 0 0 1-16 0zM16 24v5"/>'),
  'agent-loop': SV('<path d="M26 14a10 10 0 0 0-18.5-5M6 18a10 10 0 0 0 18.5 5"/><path d="M7 3.5v5.5h5.5M25 28.5V23h-5.5"/>'),
  'context-eng': SV('<rect x="8" y="4" width="17" height="24" rx="3"/><path d="M12.5 10h8M12.5 15h8M12.5 20h5M4 9h4M4 15h4M4 21h4"/>'),
  'multi-agent': SV('<circle cx="16" cy="7" r="3.5"/><circle cx="7" cy="25" r="3.5"/><circle cx="16" cy="25" r="3.5"/><circle cx="25" cy="25" r="3.5"/><path d="M16 10.5V17M7 21.5V17h18v4.5M16 17v4.5"/>'),
  production: SV('<path d="M16 4l10 4v7c0 7-5 11-10 13C11 26 6 22 6 15V8z"/><path d="M11 16l4 4 7-8"/>'),
  check: SV('<path d="M6 17l6 6L26 9"/>', 4),
  close: SV('<path d="M7 7l18 18M25 7L7 25"/>', 3),
  max: SV('<path d="M19 5h8v8M13 27H5v-8M27 5l-9 9M5 27l9-9"/>', 2.6),
  min: SV('<path d="M27 19h-8v8M5 13h8V5M19 19l8 8M13 13L5 5"/>', 2.6),
  bolt: SV('<path d="M18 3L7 18h8l-2 11 12-16h-8z" fill="currentColor" stroke-width="1.5"/>'),
  flame: SV('<path d="M16 3c1 5 8 8 8 16a8 8 0 0 1-16 0c0-4 2-6 4-8 0 3 1 5 3 5 0-5-1-9 1-13z" fill="currentColor" stroke-width="1.5"/>'),
  book: SV('<path d="M6 5h15a5 5 0 0 1 5 5v17H11a5 5 0 0 1-5-5z"/><path d="M6 22a5 5 0 0 1 5-5h15"/>', 2.2),
  spark: SV('<path d="M16 3v8M16 21v8M3 16h8M21 16h8M7 7l5 5M20 20l5 5M25 7l-5 5M12 20l-5 5"/>', 2.4),
  board: SV('<rect x="4" y="5" width="24" height="18" rx="3"/><path d="M10 28l3-5M22 28l-3-5M9 11h6M9 16h10"/>', 2.2),
  panel: SV('<rect x="4" y="5" width="24" height="22" rx="3"/><path d="M19 5v22"/>', 2.4),
  left: SV('<path d="M20 6L10 16l10 10"/>', 3),
  play: SV('<path d="M11 7.5v17l14-8.5z" fill="currentColor"/>', 2)
};
const BRAND_SVG = `<svg class="mark" viewBox="0 0 40 40" aria-hidden="true">
<rect x="2" y="6" width="36" height="32" rx="11" style="fill:var(--accent-shadow)"/>
<rect x="2" y="2" width="36" height="32" rx="11" style="fill:var(--accent)"/>
<path d="M20 11.2V8.4" style="stroke:var(--accent-fg);stroke-width:2.2;stroke-linecap:round"/>
<circle class="ant" cx="20" cy="6.9" r="2.1" style="fill:var(--accent-fg)"/>
<rect x="6.6" y="17" width="3" height="7" rx="1.5" style="fill:var(--accent-fg)"/>
<rect x="30.4" y="17" width="3" height="7" rx="1.5" style="fill:var(--accent-fg)"/>
<rect x="9.6" y="11.6" width="20.8" height="17.4" rx="6" style="fill:var(--accent-fg)"/>
<rect class="eye" x="13.6" y="16.6" width="4.4" height="5.4" rx="2.2" style="fill:var(--accent)"/>
<rect class="eye" x="22" y="16.6" width="4.4" height="5.4" rx="2.2" style="fill:var(--accent)"/>
<path d="M16.4 25.2h7.2" style="stroke:var(--accent);stroke-width:1.8;stroke-linecap:round"/>
</svg>`;
const GITHUB_SVG = `<svg viewBox="0 0 24 24" aria-hidden="true"><path style="fill:currentColor" d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>`;
const GH_URL = 'https://github.com/SawabS';
function githubBtn() { return h('a', { class: 'icon-btn gh', href: GH_URL, target: '_blank', rel: 'noopener', 'aria-label': 'Sawab Sarkavri on GitHub', title: 'github.com/SawabS', html: GITHUB_SVG }); }

/* ================= theme ================= */
const THEME_KEY = 'ai-eng-blueprint.theme';
const rootEl = document.documentElement;
let hostTheme = rootEl.getAttribute('data-theme');
let themePref = (() => { try { return localStorage.getItem(THEME_KEY) || 'auto'; } catch (e) { return 'auto'; } })();
let applyingTheme = false;
function applyTheme() {
  applyingTheme = true;
  if (themePref === 'auto') { if (hostTheme) rootEl.setAttribute('data-theme', hostTheme); else rootEl.removeAttribute('data-theme'); }
  else rootEl.setAttribute('data-theme', themePref);
  applyingTheme = false;
}
try {
  new MutationObserver(() => {
    if (applyingTheme) return;
    if (themePref === 'auto') hostTheme = rootEl.getAttribute('data-theme');
    else if (rootEl.getAttribute('data-theme') !== themePref) applyTheme();
  }).observe(rootEl, { attributes: true, attributeFilter: ['data-theme'] });
} catch (e) { /* observer unavailable */ }
const THEME_UI = {
  auto: ['Auto', 'Theme follows your system. Switch to light.', '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5" style="fill:none;stroke:currentColor;stroke-width:2"/><path d="M12 3.5a8.5 8.5 0 0 1 0 17z" style="fill:currentColor"/></svg>'],
  light: ['Light', 'Light theme. Switch to dark.', '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4.2" style="fill:none;stroke:currentColor;stroke-width:2"/><path d="M12 2.5v2.6M12 18.9v2.6M2.5 12h2.6M18.9 12h2.6M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8" style="stroke:currentColor;stroke-width:2;stroke-linecap:round"/></svg>'],
  dark: ['Dark', 'Dark theme. Switch to follow your system.', '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5z" style="fill:none;stroke:currentColor;stroke-width:2;stroke-linejoin:round"/></svg>']
};
function paintThemeBtn(b) { const [t, label, icon] = THEME_UI[themePref]; b.innerHTML = icon + `<span class="t">${t}</span>`; b.setAttribute('aria-label', label); b.title = label; }
function themeBtn() { const b = h('button', { class: 'icon-btn theme-btn', type: 'button', onclick: () => { themePref = { auto: 'light', light: 'dark', dark: 'auto' }[themePref]; try { localStorage.setItem(THEME_KEY, themePref); } catch (e) { /* ignore */ } applyTheme(); $$('.theme-btn').forEach(paintThemeBtn); } }); paintThemeBtn(b); return b; }
applyTheme();

/* ================= course page ================= */
const app = $('#app');
let scrubStage = null;
const STEP_TOTAL = LESSONS.reduce((a, l) => a + l.steps.length, 0);

function statPills() {
  const s = streak();
  return [
    h('span', { class: 'stat-pill streak' + (s ? '' : ' off'), title: 'Days in a row', html: `<span style="color:${s ? 'var(--pear-deep)' : 'var(--faint)'};display:inline-flex">${ICON.flame}</span>${s}` })
  ];
}

function dayKey(d) { return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
function bestStreak() {
  const set = new Set(P.days); let best = 0;
  P.days.forEach(k => { const [y, m, d] = k.split('-').map(Number); if (set.has(dayKey(new Date(y, m - 1, d - 1)))) return;
    let n = 0; const c = new Date(y, m - 1, d); while (set.has(dayKey(c))) { n++; c.setDate(c.getDate() + 1); } best = Math.max(best, n); });
  return best;
}
function streakCard() {
  const s = streak(); const set = new Set(P.days); const t = new Date(); const learnedToday = set.has(today());
  const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(t); d.setDate(t.getDate() - 6 + i); return d; });
  const msg = learnedToday ? 'You learned today. Come back tomorrow to keep it going.' : s ? `Finish a lesson today to keep your ${s}-day streak.` : 'Finish a lesson to start a streak.';
  return h('div', { class: 'streak-card' + (s ? ' on' : '') },
    h('div', { class: 'sc-top' },
      h('span', { class: 'sc-flame', html: ICON.flame }),
      h('div', { class: 'sc-txt' }, h('b', { class: 'tnum' }, `${s}-day streak`), h('span', null, msg)),
      h('span', { class: 'sc-best tnum', title: 'Best streak' }, `Best ${Math.max(bestStreak(), s)}`)),
    h('div', { class: 'sc-week' }, days.map(d => {
      const k = dayKey(d); const on = set.has(k); const isT = k === today();
      return h('div', { class: 'sc-day' + (on ? ' on' : '') + (isT ? ' today' : '') },
        h('span', { class: 'dot', html: on ? ICON.flame : '' }), h('small', null, 'SMTWTFS'[d.getDay()]));
    })));
}
function renderHome() {
  hideTip(); closePop();
  const stage = progressStage(); const nx = nextLesson(); const dc = doneCount();
  app.innerHTML = '';
  const top = h('header', { class: 'topbar' }, h('div', { class: 'wrap' },
    h('div', { class: 'brand', html: BRAND_SVG + '<span class="wm"><small>AI Engineering</small><b>Blueprint</b></span>' }),
    h('div', { class: 'top-right' }, statPills(), githubBtn(), themeBtn())));

  // blueprint card with maximize
  scrubStage = stage;
  const bpWrap = h('div', { class: 'bp-svg-wrap', html: bpSVG(stage, [], { click: 1, uid: 'h', ghost: 1 }) });
  attachBlueprintTips(bpWrap, id => openBoard({ lesson: lessonForNode(id).idx }));
  const range = h('input', { type: 'range', min: 1, max: MAX_STAGE, value: stage, id: 'scrub', 'aria-label': 'Preview blueprint stage' });
  const lbl = h('div', { class: 'lbl' });
  const setScrub = (v, animate) => {
    const prev = scrubStage; scrubStage = v; const l = LESSONS[v - 1];
    bpWrap.innerHTML = bpSVG(v, [], { click: 1, uid: 'h', ghost: 1, enter: animate && v > prev ? v : 0 });
    lbl.innerHTML = `<b>Stage ${v}/${MAX_STAGE}</b> · ${esc(l.short)}${v > stage ? ' · preview' : ''}`;
  };
  range.addEventListener('input', () => setScrub(+range.value, true));
  setScrub(stage, false);
  const bpCard = h('div', { class: 'bp-card' },
    h('div', { class: 'bp-head' }, h('span', { class: 't' }, 'Your blueprint'),
      h('button', { class: 'max-btn', 'aria-label': 'Open the blueprint board', onclick: () => openBoard({}), html: ICON.max + '<span>Board</span>' })),
    bpWrap,
    h('div', { class: 'scrub' }, range, h('button', { class: 'btn btn-sm btn-ghost', onclick: () => { range.value = stage; setScrub(stage, false); } }, 'Mine'), lbl));

  const side = h('aside', { class: 'course-side' },
    h('div', { class: 'course-title' },
      h('div', { class: 'eyebrow' }, 'Course'),
      h('h1', null, 'AI Engineering Blueprint'),
      h('p', null, 'From a naked LLM to a full agent harness, one block at a time.'),
      h('div', { class: 'course-meta' },
        h('span', { html: ICON.book + `${MAX_STAGE} lessons` }),
        h('span', { html: ICON.spark + `${STEP_TOTAL} exercises` }))),
    h('div', { class: 'progress-row' },
      h('div', { class: 'lbl' }, h('span', null, `${dc} of ${MAX_STAGE} complete`), h('span', null, `${Math.round(dc / MAX_STAGE * 100)}%`)),
      h('div', { class: 'progress', role: 'progressbar', 'aria-valuenow': dc, 'aria-valuemax': MAX_STAGE }, h('i', { style: { width: (dc / MAX_STAGE * 100) + '%' } }))),
    streakCard(),
    h('button', { class: 'btn btn-accent btn-lg btn-block', 'data-sfx': 'none', onclick: () => openLesson(nx ? nx.idx : 0) }, nx ? (dc ? `Continue: ${nx.title}` : 'Start learning') : 'Review from the start'),
    bpCard);

  app.append(top, h('main', { class: 'course wrap' }, side, buildMap(nx)),
    h('footer', { class: 'site wrap' },
      h('div', { class: 'foot-brand', html: BRAND_SVG + '<span>Designed and built by Sawab Sarkavri.</span>' }),
      h('a', { class: 'foot-gh', href: GH_URL, target: '_blank', rel: 'noopener', html: GITHUB_SVG + '<span>github.com/SawabS</span>' })));
  window.scrollTo(0, 0);
}

/* ---- winding lesson map ---- */
const ROW = 176, TOP = 64;
function stopX(gi) { return 50 + Math.sin(gi * 0.95 + 0.4) * 26; }
function buildMap(nx) {
  const map = h('section', { class: 'map', 'aria-label': 'Course map' });
  COURSE.units.forEach((u, ui) => {
    const n = u.lessons.length; const H = TOP + n * ROW - 10;
    const done = u.lessons.filter(l => P.done[l.id]).length;
    const pts = u.lessons.map((l, k) => [stopX(l.idx), TOP + k * ROW + 42]);
    const curve = (a, b) => { const dy = (b[1] - a[1]) / 2; return ` C ${a[0]} ${a[1] + dy}, ${b[0]} ${b[1] - dy}, ${b[0]} ${b[1]}`; };
    let d = `M 50 0` + curve([50, 0], pts[0]); for (let k = 1; k < n; k++) d += curve(pts[k - 1], pts[k]);
    let dd = ''; const lastDone = u.lessons.reduce((a, l, k) => P.done[l.id] ? k : a, -1);
    if (lastDone >= 0) { dd = `M 50 0` + curve([50, 0], pts[0]); for (let k = 1; k <= lastDone; k++) dd += curve(pts[k - 1], pts[k]); }
    const path = h('div', { class: 'path', style: { height: H + 'px' } });
    path.innerHTML = `<svg class="rail" viewBox="0 0 100 ${H}" preserveAspectRatio="none" aria-hidden="true"><path d="${d}"/>${dd ? `<path class="done" d="${dd}"/>` : ''}</svg>`;
    u.lessons.forEach((l, k) => {
      const st = P.done[l.id] ? 'done' : (nx && nx.id === l.id ? 'next' : '');
      const node = h('button', { class: 'mnode ' + st, 'data-sfx': 'none', 'aria-label': `Lesson ${l.idx + 1}: ${l.title}${st === 'done' ? ', complete' : ''}`,
        onclick: e => { e.stopPropagation(); openPop(l, path, pts[k], node); },
        html: '<span class="selring"></span><span class="base"></span>' + `<span class="face">${ICON[l.id] || ''}<span class="shine"></span></span>` +
          (st === 'done' ? `<span class="tick">${ICON.check}</span>` : '') + (st === 'next' ? '<span class="start-bubble">Start</span>' : '') });
      pressable(node);
      path.append(h('div', { class: 'stop', style: { left: pts[k][0] + '%', top: (pts[k][1] - 39) + 'px', '--k': k } }, node,
        h('div', { class: 'lab' }, l.title, h('small', null, `${l.steps.length} steps`))));
    });
    map.append(h('div', { class: 'level', style: { '--u': u.color } },
      h('div', { class: 'level-head' }, h('span', { class: 'level-badge' }, String(ui + 1)),
        h('div', { style: { minWidth: 0 } }, h('div', { class: 'k' }, `Level ${ui + 1} · ${u.side}`), h('h3', null, u.title), h('p', null, u.blurb)),
        h('span', { class: 'count tnum' }, `${done}/${n}`)),
      path));
  });
  return map;
}
let popEl = null;
function closePop() { if (popEl) { popEl.remove(); popEl = null; } $$('.mnode.sel').forEach(n => n.classList.remove('sel')); }
// touch screens do not always show :active, so mirror the press with a class
function pressable(el) {
  const on = () => el.classList.add('press'), off = () => el.classList.remove('press');
  el.addEventListener('pointerdown', on); ['pointerup', 'pointerleave', 'pointercancel'].forEach(t => el.addEventListener(t, off));
}
function flash(el) { el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash'); setTimeout(() => el.classList.remove('flash'), 700); }
function openPop(l, path, pt, node) {
  const same = popEl && popEl.dataset.id === l.id; closePop(); if (same) { SFX.toggle(); return; }
  SFX.select(); if (node) { node.classList.add('sel'); flash(node); }
  const W = path.clientWidth; const pw = Math.min(320, W - 8);
  const x = clamp(pt[0] / 100 * W - pw / 2, 4, W - pw - 4);
  const done = !!P.done[l.id];
  const ax = clamp(pt[0] / 100 * W - x, 24, pw - 24);
  popEl = h('div', { class: 'pop', 'data-id': l.id, role: 'dialog', 'aria-label': l.title, style: { left: x + 'px', top: (pt[1] + 106) + 'px', width: pw + 'px', '--ax': ax + 'px' } },
    h('div', { class: 'k' }, `Lesson ${l.idx + 1}${done ? ' · complete' : ''}`),
    h('h4', null, l.title),
    h('p', null, l.sub),
    h('p', { style: { fontSize: '13.5px' } }, h('b', { style: { color: 'var(--ink)' } }, 'Adds: '), l.added),
    h('div', { class: 'acts' },
      h('button', { class: 'btn btn-accent', 'data-sfx': 'none', onclick: () => { closePop(); openLesson(l.idx); } }, done ? 'Review' : 'Start lesson'),
      h('button', { class: 'btn', onclick: () => { closePop(); openBoard({ lesson: l.idx }); }, html: ICON.board.replace('<svg', '<svg width="18" height="18"') + '<span>On board</span>' })));
  path.append(popEl);
  const r = popEl.getBoundingClientRect();
  if (r.bottom > window.innerHeight - 12) window.scrollBy({ top: r.bottom - window.innerHeight + 24, behavior: 'smooth' });
}
document.addEventListener('click', e => { if (popEl && !e.target.closest('.pop')) closePop(); });

/* ================= lesson player ================= */
let L = null;

function openLesson(i) {
  hideTip(); closePop();
  const lesson = LESSONS[i];
  const docked = !!BOARD;
  L = { lesson, si: 0, xp: 0, phase: 'step', sel: null, tries: 0, widget: null, ready: true, beats: [], beat: 0 };
  if (!docked) { try { history.replaceState(null, '', '#' + lesson.id); } catch (e) { /* ignore */ } }
  const old = $('.player'); if (old) old.remove();
  const player = h('div', { class: 'player' + (docked ? ' docked' : ''), role: docked ? 'region' : 'dialog', 'aria-label': lesson.title, style: { '--u': lesson.unit.color } },
    h('div', { class: 'p-top' },
      h('button', { class: 'p-close', 'aria-label': 'Close lesson', onclick: closeLesson, html: ICON.close }),
      h('div', { class: 'p-title' }, `${lesson.idx + 1}. ${lesson.title}`),
      h('div', { class: 'p-progress', role: 'progressbar', 'aria-label': 'Lesson progress' }, h('div', { style: { width: '0%' } })),
      h('button', { class: 'icon-btn map-btn', 'aria-label': 'Open the blueprint board', onclick: () => openBoard({}), html: ICON.board }),
      null),
    h('div', { class: 'p-body' },
      h('main', { class: 'p-main', id: 'p-main' }),
      h('aside', { class: 'p-aside', id: 'p-aside' })),
    h('footer', { class: 'p-foot', id: 'p-foot' }));
  if (docked) boardDock(player, lesson);
  else { document.body.append(player); document.body.style.overflow = 'hidden'; renderAside(true); }
  SFX.open();
  renderStep(false);
}
function closeLesson() {
  const p = $('.player'); if (!p) return;
  SFX.close(); const wasDocked = p.classList.contains('docked'); p.remove(); L = null;
  if (wasDocked && BOARD) { boardShowIndex(); return; }
  document.body.style.overflow = BOARD ? 'hidden' : '';
  try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { /* ignore */ }
  renderHome();
}
function renderAside(animate) {
  const el = $('#p-aside'); if (!el || !L) return;
  const l = L.lesson; const zb = zoomBox(l.hl);
  el.innerHTML = '';
  el.append(
    h('div', { class: 'eyebrow' }, 'Where you are'),
    h('div', { class: 'trail' }, l.trail.map((t, i) => h('div', { class: 'trail-step' },
      h('span', { class: 'nest', html: `<svg width="22" height="22" viewBox="0 0 22 22">${Array.from({ length: i + 1 }, (_, k) => `<rect x="${1 + k * 2.6}" y="${1 + k * 2.6}" width="${20 - k * 5.2}" height="${20 - k * 5.2}" rx="5" style="fill:${k === i ? 'var(--pear)' : 'none'};stroke:${k === i ? 'var(--pear-deep)' : 'var(--line-strong)'};stroke-width:1.5"/>`).join('')}</svg>` }),
      h('span', null, t)))),
    h('div', { class: 'zoom-card' }, h('div', { html: bpSVG(l.stage, l.hl, { uid: 'z', vb: zb.join(' ') }) }), h('span', { class: 'zoom-tag' }, 'Zoomed in'),
      h('button', { class: 'max-btn', 'aria-label': 'Open the blueprint board with this lesson', onclick: () => openBoard({}), html: ICON.max + '<span>Board</span>' })),
    h('p', { class: 'aside-note' }, h('strong', null, 'This lesson adds: '), l.added));
  if (animate) animateViewBox($('.zoom-card svg', el), [0, 0, 1000, 620], zb, 900);
}

function setProgress() {
  if (!L) return;
  const n = L.lesson.steps.length;
  const frac = L.phase === 'done' ? n : L.si + (L.beats.length ? (L.beat / L.beats.length) * 0.9 : 0);
  const bar = $('.p-progress > div'); if (bar) bar.style.width = (frac / n * 100) + '%';
}
function splitBeats(html) {
  const tmp = h('div', { html: html || '' }); const beats = [];
  Array.from(tmp.childNodes).forEach(n => {
    if (n.nodeType === 3 && !n.textContent.trim()) return;
    const isP = n.nodeType === 1 && n.tagName === 'P';
    if (isP || !beats.length) beats.push([n]); else beats[beats.length - 1].push(n);
  });
  return beats.length ? beats : [[]];
}
function renderStep(revealAll) {
  const l = L.lesson; const st = l.steps[L.si];
  L.phase = 'step'; L.sel = null; L.tries = 0; L.widget = null; L.ready = !st.gate;
  const main = $('#p-main'); main.innerHTML = ''; main.scrollTop = 0;
  const groups = st.kind === 'quiz' ? [splitBeats(st.body).flat()] : splitBeats(st.body);
  const beats = groups.map(nodes => h('div', { class: 'beat' }, h('div', { class: 'prose' }, nodes)));
  const last = beats[beats.length - 1];
  if (st.widget) {
    const wbox = h('div', { class: 'widget' }); last.append(wbox);
    const api = { ready: () => { if (!L.ready) SFX.unlock(); L.ready = true; renderFoot(); }, xp: n => { L.xp += n; setProgress(); } };
    try { L.widget = WIDGETS[st.widget.type](wbox, st.widget, api) || null; } catch (err) { wbox.textContent = 'This interactive failed to load.'; console.error(err); L.ready = true; }
  }
  if (st.after) last.append(h('div', { class: 'callout', html: st.after }));
  if (st.kind === 'quiz') {
    const opts = h('div', { class: 'opts', role: 'radiogroup' }, st.options.map((o, i) => h('button', {
      class: 'opt', role: 'radio', 'aria-checked': 'false', 'data-i': i,
      onclick: () => { if (L.phase !== 'step') return; SFX.select(); L.sel = i; $$('.opt', opts).forEach(b => { b.classList.toggle('sel', +b.dataset.i === i); b.setAttribute('aria-checked', String(+b.dataset.i === i)); }); renderFoot(); }
    }, h('span', { class: 'key' }, String.fromCharCode(65 + i)), h('span', { html: o }))));
    last.append(opts);
  }
  L.beats = beats; L.beat = revealAll ? beats.length : 1;
  beats.forEach((b, k) => { b.hidden = k >= L.beat; });
  const box = h('section', { class: 'step', 'aria-live': 'polite' },
    h('div', { class: 'eyebrow' }, `Step ${L.si + 1} of ${l.steps.length}${st.kind === 'quiz' ? ' · Check your thinking' : st.kind === 'task' ? ' · Your turn' : ''}`),
    h('h2', null, st.title), beats);
  main.append(box);
  setProgress(); renderFoot();
}
function revealBeat() {
  const el = L.beats[L.beat]; if (!el) return;
  el.hidden = false; L.beat++; SFX.reveal();
  $$('.seg', el).forEach(s => s.dispatchEvent(new Event('scroll')));
  setProgress(); renderFoot();
  const main = $('#p-main');
  requestAnimationFrame(() => {
    const mr = main.getBoundingClientRect(), er = el.getBoundingClientRect();
    if (er.top > mr.top + mr.height * 0.55) main.scrollBy({ top: er.top - mr.top - 72, behavior: 'smooth' });
  });
}
function renderFoot(state) {
  const st = L.lesson.steps[L.si]; const foot = $('#p-foot'); foot.className = 'p-foot'; foot.innerHTML = '';
  const inner = h('div', { class: 'inner' }); foot.append(inner);
  if (state && state.kind) {
    foot.classList.add(state.kind);
    inner.append(h('div', { class: 'fb' }, h('span', { class: 'ico', html: state.kind === 'good' ? ICON.check.replace('<svg', '<svg width="20" height="20"') : '!' }),
      h('div', null, h('h4', null, state.title), h('p', { html: state.msg || '' }))));
    const acts = h('div', { class: 'actions' });
    if (state.kind === 'bad') {
      acts.append(h('button', { class: 'btn btn-ghost', onclick: revealAnswer }, 'Show answer'));
      acts.append(h('button', { class: 'btn btn-primary', 'data-primary': 1, onclick: retry }, 'Try again'));
    } else acts.append(h('button', { class: 'btn btn-good', 'data-primary': 1, onclick: advance }, 'Continue'));
    inner.append(acts); focusPrimary(); return;
  }
  const more = L.beat < L.beats.length;
  const gated = !more && st.kind !== 'quiz' && !L.ready;
  const hint = more ? 'Enter to read on' : st.kind === 'quiz' ? `Pick an answer · keys 1–${st.options.length} · Enter to check` : (L.ready ? 'Enter to continue' : (st.gateText || 'Use the interactive to continue'));
  const left = h('div', { class: 'fb only-hint' + (gated ? ' gate' : '') }, h('span', { class: 'kbd-hint' + (gated ? '' : ' kbd-only') }, hint));
  const acts = h('div', { class: 'actions' });
  if (L.si > 0 && !more) acts.append(h('button', { class: 'btn btn-ghost', onclick: () => { SFX.back(); L.si--; renderStep(true); } }, 'Back'));
  if (more) acts.append(h('button', { class: 'btn btn-primary', 'data-primary': 1, onclick: revealBeat }, 'Continue'));
  else if (st.kind === 'quiz') acts.append(h('button', { class: 'btn btn-primary', 'data-primary': 1, disabled: L.sel == null, onclick: checkQuiz }, 'Check'));
  else if (st.kind === 'task') acts.append(h('button', { class: 'btn btn-primary', 'data-primary': 1, disabled: !L.ready, onclick: checkTask }, 'Check'));
  else acts.append(h('button', { class: 'btn btn-primary', 'data-primary': 1, disabled: !L.ready, onclick: advance }, L.si === L.lesson.steps.length - 1 ? 'Finish lesson' : 'Continue'));
  inner.append(left, acts);
}
function focusPrimary() { const b = $('#p-foot [data-primary]'); if (b) setTimeout(() => b.focus({ preventScroll: true }), 30); }
function checkQuiz() {
  const st = L.lesson.steps[L.si]; if (L.sel == null) return;
  const opts = $$('.opt'); const ok = L.sel === st.answer; L.tries++;
  opts.forEach(b => b.disabled = true);
  if (ok) {
    opts[L.sel].classList.remove('sel'); opts[L.sel].classList.add('right');
    L.xp += L.tries === 1 ? 15 : 5; L.phase = 'answered'; setProgress(); SFX.correct();
    renderFoot({ kind: 'good', title: L.tries === 1 ? 'Correct!' : 'Got it', msg: st.explain });
  } else {
    opts[L.sel].classList.remove('sel'); opts[L.sel].classList.add('wrong'); L.phase = 'wrong'; SFX.wrong();
    const why = (st.why && st.why[L.sel]) || st.hint || 'Look at the interactive again and reason from what the model can actually see.';
    renderFoot({ kind: 'bad', title: 'Not quite', msg: why });
  }
}
function checkTask() {
  if (!L.widget || !L.widget.check) { advance(); return; }
  const r = L.widget.check(); L.tries++;
  if (r.ok) { SFX.correct(); L.xp += L.tries === 1 ? 15 : 5; L.phase = 'answered'; setProgress(); renderFoot({ kind: 'good', title: r.title || 'Nicely done', msg: r.msg || L.lesson.steps[L.si].explain }); }
  else { SFX.wrong(); L.phase = 'wrong'; renderFoot({ kind: 'bad', title: r.title || 'Not yet', msg: r.msg }); }
}
function retry() {
  const st = L.lesson.steps[L.si]; L.phase = 'step'; SFX.tap();
  if (st.kind === 'quiz') { $$('.opt').forEach(b => { b.disabled = false; b.classList.remove('wrong', 'sel'); }); L.sel = null; }
  if (L.widget && L.widget.reset) L.widget.reset();
  renderFoot();
}
function revealAnswer() {
  const st = L.lesson.steps[L.si]; SFX.toggle();
  if (st.kind === 'quiz') { const opts = $$('.opt'); opts.forEach(b => b.classList.remove('wrong', 'sel')); opts[st.answer].classList.add('right'); renderFoot({ kind: 'good', title: 'Here is the answer', msg: st.explain }); }
  else { const r = L.widget && L.widget.reveal ? L.widget.reveal() : null; renderFoot({ kind: 'good', title: 'Here is the answer', msg: (r && r.msg) || st.explain }); }
  L.phase = 'answered';
}
function advance() {
  if (L.si < L.lesson.steps.length - 1) { SFX.next(); L.si++; renderStep(false); }
  else finishLesson();
}
function finishLesson() {
  const l = L.lesson; const first = !P.done[l.id];
  const newDay = !P.days.includes(today());
  L.xp += first ? 20 : 0; P.xp += L.xp; P.done[l.id] = true; markDay(); saveP();
  L.phase = 'done'; setProgress(); SFX.complete();
  const nx = LESSONS[l.idx + 1];
  const main = $('#p-main'); main.innerHTML = ''; main.scrollTop = 0;
  const bp = h('div', { class: 'bp-card', html: bpSVG(l.stage, l.hl, { enter: l.stage, uid: 'd' }) });
  main.append(h('section', { class: 'done-screen', style: { '--u': l.unit.color } },
    h('div', { class: 'done-badge', html: ICON[l.id] || ICON.check }),
    h('div', { class: 'eyebrow' }, `Lesson ${l.idx + 1} complete`),
    h('h2', null, l.doneTitle || 'The blueprint just grew.'),
    h('span', { class: 'added' }, '+ ' + l.short),
    h('p', { class: 'lede', style: { marginTop: '14px' } }, l.recap),
    bp,
    h('div', { class: 'xp-burst' }, h('span', { class: 'chip streak-chip tnum' + (newDay ? ' up' : ''), html: `<span class="fl">${ICON.flame}</span>${newDay ? 'Streak extended · ' : ''}${streak()}-day streak` }))));
  const foot = $('#p-foot'); foot.className = 'p-foot'; foot.innerHTML = '';
  const docked = !!BOARD;
  foot.append(h('div', { class: 'inner' }, h('div', { class: 'fb only-hint' }, h('span', { class: 'kbd-hint' }, nx ? `Next: ${nx.title}` : 'You finished the whole blueprint.')),
    h('div', { class: 'actions' }, h('button', { class: 'btn btn-ghost', onclick: closeLesson }, docked ? 'Lesson list' : 'Course map'),
      nx ? h('button', { class: 'btn btn-accent', 'data-primary': 1, 'data-sfx': 'none', onclick: () => openLesson(nx.idx) }, 'Next lesson') : null)));
  if (docked) boardRefresh();
  focusPrimary();
}

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { if (popEl) { closePop(); return; } if (BOARD) { closeBoard(); return; } if (L) { closeLesson(); return; } }
  if (!L) return;
  if (BOARD && BOARD.hidden) return;
  const tag = (e.target.tagName || '').toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
  const st = L.lesson.steps[L.si];
  if (st && st.kind === 'quiz' && L.phase === 'step' && L.beat >= L.beats.length && /^[1-9]$/.test(e.key)) { const b = $$('.opt')[+e.key - 1]; if (b) b.click(); }
  if (e.key === 'Enter' && !(e.target.closest && e.target.closest('button,.bp-n,.pin'))) { const b = $('#p-foot [data-primary]'); if (b && !b.disabled) { e.preventDefault(); b.click(); } }
});

function boot() {
  renderHome();
  const id = (location.hash || '').slice(1);
  if (id === 'board') { openBoard({}); return; }
  const l = LESSONS.find(x => x.id === id);
  if (l) openLesson(l.idx);
}
