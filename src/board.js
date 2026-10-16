/* ================= system map (the board) =================
   A full-screen, pannable and zoomable copy of the finished architecture. Lessons open in a side panel
   (a bottom sheet on phones) that can be resized by dragging its grip and hidden completely. */
let BOARD = null;
const PANEL_KEY = 'ai-eng-blueprint.panel';
const isPhone = () => window.matchMedia('(max-width: 900px) and (orientation: portrait)').matches; // bottom-sheet layout; phones held sideways keep the side panel

function openBoard(opts = {}) {
  hideTip(); closePop();
  if (BOARD) { if (opts.lesson != null) openLesson(opts.lesson); return; }
  const saved = (() => { try { return JSON.parse(localStorage.getItem(PANEL_KEY)) || {}; } catch (e) { return {}; } })();
  const B = BOARD = { x: 0, y: 0, s: 1, w: clamp(saved.w || 440, 320, 760), sh: clamp(saved.sh || 58, 30, 94), hidden: false, hl: [], mode: doneCount() ? 'build' : 'full', view: 'root', trail: [], parked: null, busy: false };

  const canvas = h('div', { class: 'board-canvas', 'data-view': 'root', 'aria-label': 'System map. Drag to pan, pinch or scroll to zoom. Select a block to inspect it; blocks marked + open a detailed view.' });
  canvas.innerHTML = bpSVG(MAX_STAGE, [], { click: 1, uid: 'B' });
  const pct = h('span', { class: 'pct tnum' }, '100%');
  const panelBody = h('div', { class: 'panel-body' });
  const ttl = h('div', { class: 'ttl' }, 'Lessons');
  const expandBtn = h('button', { class: 'icon-btn', 'aria-label': 'Open the lesson full screen', title: 'Full screen lesson', onclick: () => closeBoard(), html: ICON.max });
  const hideBtn = h('button', { class: 'icon-btn', 'aria-label': 'Hide the panel', title: 'Hide panel', onclick: () => setPanelHidden(true), html: ICON.close });
  const grip = h('div', { class: 'panel-grip', role: 'separator', 'aria-label': 'Drag to resize the panel', 'aria-orientation': 'vertical', 'aria-valuemin': 320, 'aria-valuemax': 760, 'aria-valuenow': 440, tabindex: '0' });
  const panel = h('aside', { class: 'panel', 'aria-label': 'Lesson panel' }, grip, h('div', { class: 'panel-head' }, ttl, expandBtn, hideBtn), panelBody);
  const tab = h('button', { class: 'panel-tab', hidden: true, onclick: () => setPanelHidden(false), html: ICON.panel + '<span>Lesson panel</span>' });
  const main = h('div', { class: 'board-main' }, canvas,
    h('div', { class: 'board-tools' }),
    h('div', { class: 'legend', role: 'group', 'aria-label': 'Highlight a part of the system' }),
    panel, tab);
  const el = h('div', { class: 'board', role: 'dialog', 'aria-label': 'System map' },
    h('div', { class: 'board-top' },
      h('button', { class: 'btn btn-sm', 'aria-label': 'Back to course', onclick: () => closeBoard(true), html: ICON.left.replace('<svg', '<svg width="16" height="16"') + '<span>Course</span>' }),
      h('span', { class: 'board-mark', html: BRAND_SVG }),
      h('h2', null, 'System map'),
      h('span', { class: 'sp' }),
      h('div', { class: 'zoom-ctl' },
        h('button', { 'aria-label': 'Zoom out', onclick: () => zoomCenter(1.25) }, '−'), pct,
        h('button', { 'aria-label': 'Zoom in', onclick: () => zoomCenter(0.8) }, '+'),
        h('button', { 'aria-label': 'Fit the whole board', title: 'Fit', onclick: () => fitAll(true), html: ICON.max.replace('<svg', '<svg width="16" height="16"') })),
      h('button', { class: 'icon-btn', 'aria-label': 'Show or hide the lesson panel', title: 'Lesson panel', onclick: () => setPanelHidden(!B.hidden), html: ICON.panel }),
      themeBtn()),
    main);
  Object.assign(B, { el, canvas, pct, panel, panelBody, ttl, expandBtn, tab, main, svg: $('svg', canvas), tools: $('.board-tools', main), legend: $('.legend', main) });
  renderToolsBar(); renderLegend(); addRootBadges();
  main.style.setProperty('--pw', B.w + 'px'); grip.setAttribute('aria-valuenow', Math.round(B.w));
  panel.style.setProperty('--sh', B.sh + '%');
  document.body.append(el); document.body.style.overflow = 'hidden'; syncInert();
  try { history.replaceState(null, '', '#board'); } catch (e) { /* ignore */ }
  SFX.open();

  attachBlueprintTips(canvas);
  setBuildMode(B.mode, true);
  wireCanvas(B); wireGrip(B);
  B.ro = new ResizeObserver(() => applyCam()); B.ro.observe(canvas);
  panel.addEventListener('transitionend', () => applyCam()); // markers re-check what the sheet covers once it settles
  wirePeers(B);

  const p = $('.player');
  if (p && L) { p.classList.add('docked'); p.setAttribute('role', 'region'); boardDock(p, L.lesson); }
  else if (opts.lesson != null) { fitAll(false); openLesson(opts.lesson); }
  else { boardShowIndex(); }
  if (!B.camSet) fitAll(false);
  if (opts.view && SYSV[opts.view]) exJump(opts.view);
}

function closeBoard(toCourse) {
  if (!BOARD) return;
  endTour(true);
  const B = BOARD; const p = $('.player');
  if (B.parked) { B.parked = null; if (!p) L = null; }
  if (B.ro) B.ro.disconnect();
  if (B.anim) cancelAnimationFrame(B.anim);
  if (p && L && !toCourse) {
    p.classList.remove('docked'); p.setAttribute('role', 'dialog'); document.body.append(p);
    BOARD = null; B.el.remove(); hideTip(); syncInert();
    document.body.style.overflow = 'hidden'; renderAside(false);
    try { history.replaceState(null, '', '#' + L.lesson.id); } catch (e) { /* ignore */ }
    renderHome(); SFX.close(); return;
  }
  if (p) { p.remove(); L = null; }
  BOARD = null; B.el.remove(); hideTip(); SFX.close(); syncInert();
  document.body.style.overflow = '';
  try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { /* ignore */ }
  renderHome();
}

/* ---- panel ---- */
function setPanelHidden(v) {
  const B = BOARD; if (!B) return;
  B.hidden = v; B.panel.classList.toggle('hidden', v); B.main.classList.toggle('panel-off', v); B.tab.hidden = !v;
  SFX.toggle();
  setTimeout(() => { if (L && $('.player.docked')) boardFocus(L.lesson); else fitAll(true); }, 60);
}
function savePanel() { try { localStorage.setItem(PANEL_KEY, JSON.stringify({ w: BOARD.w, sh: BOARD.sh })); } catch (e) { /* ignore */ } }
function wireGrip(B) {
  let drag = null;
  B.panel.querySelector('.panel-grip').addEventListener('pointerdown', e => {
    e.preventDefault(); const g = e.currentTarget; g.setPointerCapture(e.pointerId);
    drag = { x: e.clientX, y: e.clientY, w: B.panel.offsetWidth, h: B.panel.offsetHeight, H: B.main.clientHeight, W: B.main.clientWidth, moved: false };
    B.panel.classList.add('resizing');
  });
  B.panel.querySelector('.panel-grip').addEventListener('pointermove', e => {
    if (!drag) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y; if (Math.abs(dx) + Math.abs(dy) > 4) drag.moved = true;
    if (isPhone()) { const hh = clamp(drag.h - dy, 90, drag.H * 0.94); B.panel.style.setProperty('--sh', hh + 'px'); drag.cur = hh; }
    else { const w = clamp(drag.w - dx, 320, Math.min(760, drag.W * 0.72)); B.w = w; B.main.style.setProperty('--pw', w + 'px'); e.currentTarget.setAttribute('aria-valuenow', Math.round(w)); }
  });
  const end = () => {
    if (!drag) return; B.panel.classList.remove('resizing');
    if (isPhone()) {
      const H = drag.H; let hh = drag.moved ? (drag.cur || drag.h) : (drag.h < H * 0.75 ? H * 0.92 : H * 0.58);
      if (hh < H * 0.22) { B.panel.style.setProperty('--sh', B.sh + '%'); setPanelHidden(true); }
      else { B.sh = hh < H * 0.75 ? 58 : 92; B.panel.style.setProperty('--sh', B.sh + '%'); SFX.toggle(); }
    }
    savePanel(); drag = null;
    setTimeout(() => { if (L && $('.player.docked')) boardFocus(L.lesson); }, 280);
  };
  const g = B.panel.querySelector('.panel-grip');
  g.addEventListener('pointerup', end); g.addEventListener('pointercancel', end);
  g.addEventListener('keydown', e => {
    if (isPhone()) return;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { B.w = clamp(B.w + (e.key === 'ArrowLeft' ? 24 : -24), 320, 760); B.main.style.setProperty('--pw', B.w + 'px'); e.currentTarget.setAttribute('aria-valuenow', Math.round(B.w)); savePanel(); }
  });
}
function boardDock(player, lesson) {
  const B = BOARD; if (B.tour) endTour(true); B.panelBody.innerHTML = ''; B.panelBody.append(player);
  B.ttl.textContent = `${lesson.idx + 1}. ${lesson.title}`; B.expandBtn.hidden = false;
  if (B.hidden) { B.hidden = false; B.panel.classList.remove('hidden'); B.tab.hidden = true; }
  boardFocus(lesson);
}
function boardShowIndex() {
  const B = BOARD; if (!B) return;
  B.ttl.textContent = 'Lessons'; B.expandBtn.hidden = true; B.selLevel = null; B.sel = null; exHighlight([]); syncAllChip();
  // pointing at a level or a lesson shows where it sits on the map (only on a real mouse move, so a panel that re-renders
  // under a still cursor never changes the selection by itself); a level heading selects the whole level
  const show = keys => e => { if (e && e.type === 'pointermove' && e.pointerType !== 'mouse') return; if (BOARD && BOARD.view === 'root' && BOARD.selLevel == null) exHighlight(keys); };
  const idx = h('div', { class: 'idx' },
    h('div', { class: 'idx-intro' }, h('p', null, 'Select any block to see what it does and which lesson adds it; blocks marked + open a detailed view you can keep drilling into. Point at a level or lesson below to see where it sits on the map.')),
    exSearchBox(),
    COURSE.units.map((u, ui) => [h('button', { class: 'idx-level', 'data-u': ui, 'data-sfx': 'none', 'aria-label': `Level ${ui + 1}: ${u.title}. Show it on the map`,
        onclick: () => showLevel(ui), onpointermove: show(levelKeys(ui)), onfocus: show(levelKeys(ui)), onpointerleave: show([]), onblur: show([]) },
        h('span', null, `Level ${ui + 1} · ${u.title}`), h('small', null, 'Show on map')),
      u.lessons.map(l => h('button', { class: 'idx-row' + (P.done[l.id] ? ' done' : ''), style: { '--u': u.color }, 'data-sfx': 'none', onclick: () => openLesson(l.idx),
        onpointermove: show(lessonKeys(l)), onfocus: show(lessonKeys(l)), onpointerleave: show([]), onblur: show([]) },
        h('span', { class: 'n', html: P.done[l.id] ? ICON.check.replace('<svg', '<svg width="16" height="16"') : String(l.idx + 1) }),
        h('span', { style: { minWidth: 0 } }, h('b', null, l.title), h('span', null, l.sub)),
        h('span', { class: 'chip' }, `${l.steps.length}`)))]));
  B.panelBody.innerHTML = ''; B.panelBody.append(idx);
  fitAll(!!B.camSet); // first open frames the board at once; later returns glide
}
function boardRefresh() { setBuildMode(BOARD.mode, true); }

/* ---- camera ---- */
function canvasSize() { const r = BOARD.canvas.getBoundingClientRect(); return [Math.max(1, r.width), Math.max(1, r.height)]; }
function visibleRect() {
  const B = BOARD; const [W, H] = canvasSize();
  const tourH = B.tour ? Math.min(230, H * 0.42) : 0;
  if (B.hidden) return { l: 0, t: 0, w: W, h: Math.max(140, H - tourH) };
  if (isPhone()) return { l: 0, t: 0, w: W, h: Math.max(120, H - B.panel.offsetHeight) };
  return { l: 0, t: 0, w: Math.max(160, W - B.panel.offsetWidth), h: H };
}
function baseScale() { const [W, H] = canvasSize(); return Math.max(1040 / W, 660 / H); }
function applyCam() {
  const B = BOARD; if (!B) return; const [W, H] = canvasSize();
  B.svg.setAttribute('viewBox', `${B.x} ${B.y} ${B.s * W} ${B.s * H}`);
  B.svg.setAttribute('preserveAspectRatio', 'xMinYMin meet');
  B.canvas.style.backgroundSize = `${22 / B.s}px ${22 / B.s}px`;
  B.canvas.style.backgroundPosition = `${-B.x / B.s}px ${-B.y / B.s}px`;
  B.pct.textContent = Math.round(baseScale() / B.s * 100) + '%';
}
function setCam(x, y, s, animate) {
  const B = BOARD; B.camSet = true;
  if (B.anim) { cancelAnimationFrame(B.anim); B.anim = 0; }
  const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!animate || reduce) { B.x = x; B.y = y; B.s = s; applyCam(); return; }
  const from = [B.x, B.y, B.s], to = [x, y, s], t0 = performance.now(), ms = typeof animate === 'number' ? animate : 650, ease = t => 1 - Math.pow(1 - t, 3);
  const step = now => { const t = clamp((now - t0) / ms, 0, 1); const k = ease(t); B.x = from[0] + (to[0] - from[0]) * k; B.y = from[1] + (to[1] - from[1]) * k; B.s = from[2] + (to[2] - from[2]) * k; applyCam(); B.anim = t < 1 ? requestAnimationFrame(step) : 0; };
  B.anim = requestAnimationFrame(step);
}
function fitBox(box, animate) {
  const vr = visibleRect(); const m = Math.min(36, vr.w * 0.06);
  { const top = isPhone() ? 124 : 58, bottom = isPhone() ? 8 : 52; vr.t += top; vr.h = Math.max(120, vr.h - top - bottom); } // keep clear of the toolbar and legend
  const base = baseScale();
  const s = clamp(Math.max(box[2] / (vr.w - 2 * m), box[3] / (vr.h - 2 * m)), base / 1.5, base * 1.6);
  setCam(box[0] + box[2] / 2 - s * (vr.l + vr.w / 2), box[1] + box[3] / 2 - s * (vr.t + vr.h / 2), s, animate);
}
function fitAll(animate) { fitBox(curBounds(), animate); }
function zoomAt(px, py, f) {
  const B = BOARD; const base = baseScale();
  if (B.anim) { cancelAnimationFrame(B.anim); B.anim = 0; } // a manual zoom wins over a running camera move
  const ns = clamp(B.s * f, base / 5, base * 2);
  B.x += px * (B.s - ns); B.y += py * (B.s - ns); B.s = ns; applyCam();
}
function zoomCenter(f) { const vr = visibleRect(); zoomAt(vr.l + vr.w / 2, vr.t + vr.h / 2, f); }
function rawBox(hl) {
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  hl.forEach(id => { const b = BOX[id] || exBox(id); if (!b) return; x0 = Math.min(x0, b[0]); y0 = Math.min(y0, b[1]); x1 = Math.max(x1, b[0] + b[2]); y1 = Math.max(y1, b[1] + b[3]); });
  if (x0 > x1) return curBounds();
  const pad = 70; let bw = x1 - x0 + 2 * pad, bh = y1 - y0 + 2 * pad; const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  bw = Math.max(bw, 460); bh = Math.max(bh, 320); return [cx - bw / 2, cy - bh / 2, bw, bh];
}
function highlight(hl) {
  const B = BOARD; B.hl = hl;
  $$('.bp-n', B.svg).forEach(g => { g.classList.remove('hl', 'dim'); if (hl.length) g.classList.add(hl.includes(g.dataset.id) ? 'hl' : 'dim'); });
}
function boardFocus(lesson) {
  if (!BOARD || BOARD.view !== 'root') return;
  BOARD.selLevel = null; highlight(lesson.hl); syncAllChip();
  fitBox(rawBox(lesson.hl), true);
}
// a level (from the lesson index) selects everything it adds, and the panel lists its lessons with the need each one meets
function showLevel(ui) {
  const B = BOARD; if (!B) return; if (B.tour) endTour(true);
  parkLesson(); B.selLevel = ui; SFX.select();
  const u = COURSE.units[ui]; const keys = levelKeys(ui);
  exHighlight(keys); fitBox(rawBox(keys), true); syncAllChip();
  const card = h('div', { class: 'idx lvl-card' },
    h('div', { class: 'eyebrow' }, `Level ${ui + 1} · ${u.side}`), h('h3', null, u.title), h('p', { class: 'lvl-blurb' }, u.blurb),
    u.lessons.map(l => h('button', { class: 'idx-row' + (P.done[l.id] ? ' done' : ''), 'data-sfx': 'none', onclick: () => { B.parked = null; openLesson(l.idx); },
      onpointermove: e => { if (e.pointerType === 'mouse') exHighlight(lessonKeys(l)); }, onfocus: () => exHighlight(lessonKeys(l)), onpointerleave: () => exHighlight(keys), onblur: () => exHighlight(keys) },
      h('span', { class: 'n', html: P.done[l.id] ? ICON.check.replace('<svg', '<svg width="16" height="16"') : String(l.idx + 1) }),
      h('span', { style: { minWidth: 0 } }, h('b', null, l.title), h('span', null, l.need)),
      h('span', { class: 'chip' }, `${l.steps.length}`))),
    h('div', { class: 'insp-acts' },
      B.parked && L ? h('button', { class: 'btn btn-ghost', onclick: () => unparkLesson() }, 'Back to my lesson') : null,
      h('button', { class: 'btn btn-ghost', onclick: () => clearSelection() }, 'Whole system')));
  B.ttl.textContent = `Level ${ui + 1}`; B.expandBtn.hidden = true;
  B.panelBody.innerHTML = ''; B.panelBody.append(card); B.panelBody.scrollTop = 0;
  exPanelOpen();
}
// back to the whole system (or the whole detailed view): nothing selected, everything framed
function clearSelection() {
  const B = BOARD; if (!B) return; if (B.tour) endTour(true);
  B.sel = null; B.selLevel = null;
  $$('.lg', B.el).forEach(b => { b.classList.remove('on'); b.setAttribute('aria-pressed', 'false'); });
  if (B.view !== 'root') exShowView(B.view);
  else if (B.parked && L) unparkLesson(); // the lesson returns to the panel...
  else if (!$('.player.docked')) boardShowIndex();
  exHighlight([]); syncAllChip(); fitAll(true); // ...but the diagram always ends whole and framed
}
function syncAllChip() {
  const B = BOARD; if (!B) return; const all = $('.lg.all', B.legend); if (!all) return;
  const on = !B.hl.length; all.classList.toggle('on', on); all.setAttribute('aria-pressed', String(on));
}
// hovering a block on the top-level diagram previews the group its lesson added
function wirePeers(B) {
  let on = [];
  const clear = () => { on.forEach(g => g.classList.remove('peer')); on = []; };
  B.canvas.addEventListener('pointerover', e => {
    if (B.view !== 'root' || B.tour || (e.pointerType && e.pointerType !== 'mouse')) return;
    const g = e.target.closest('.bp-n'); clear(); if (!g || !BPN[g.dataset.id]) return;
    on = peerKeys(g.dataset.id).map(k => $(`.bp-n[data-id="${k}"]`, B.svg)).filter(Boolean);
    on.forEach(x => x.classList.add('peer'));
  });
  B.canvas.addEventListener('pointerleave', clear);
}

/* ---- gestures ---- */
function wireCanvas(B) {
  const c = B.canvas; const pts = new Map(); let drag = null, pinch = null, suppress = false;
  const local = e => { const r = c.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  c.addEventListener('pointerdown', e => {
    if (e.target.closest('.pin')) return;
    pts.set(e.pointerId, local(e));
    if (pts.size === 1) drag = { p: local(e), moved: false, id: e.pointerId };
    if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]), m: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2] }; if (drag) drag.moved = true; }
  });
  c.addEventListener('pointermove', e => {
    if (!pts.has(e.pointerId)) return;
    const p = local(e); pts.set(e.pointerId, p);
    if (pts.size >= 2 && pinch) {
      const [a, b] = [...pts.values()]; const d = Math.hypot(a[0] - b[0], a[1] - b[1]); const m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      B.x -= (m[0] - pinch.m[0]) * B.s; B.y -= (m[1] - pinch.m[1]) * B.s;
      if (d > 0 && pinch.d > 0) zoomAt(m[0], m[1], pinch.d / d); else applyCam();
      pinch = { d, m }; return;
    }
    if (!drag || drag.id !== e.pointerId) return;
    const dx = p[0] - drag.p[0], dy = p[1] - drag.p[1];
    if (!drag.moved && Math.hypot(dx, dy) > 6) { drag.moved = true; c.classList.add('dragging'); hideTip(); try { c.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ } }
    if (drag.moved) { if (B.anim) { cancelAnimationFrame(B.anim); B.anim = 0; } B.x -= dx * B.s; B.y -= dy * B.s; drag.p = p; applyCam(); }
  });
  const up = e => {
    pts.delete(e.pointerId);
    if (pts.size < 2) pinch = null;
    if (pts.size === 0) { if (drag && drag.moved) suppress = true; drag = null; c.classList.remove('dragging'); setTimeout(() => { suppress = false; }, 60); }
  };
  c.addEventListener('pointerup', up); c.addEventListener('pointercancel', up);
  c.addEventListener('click', e => {
    if (suppress) { e.stopPropagation(); e.preventDefault(); return; }
    const g = e.target.closest('.bp-n');
    if (!g) { if (BOARD.hl.length && !e.target.closest('.board-tools,.legend,.tour')) { SFX.toggle(); clearSelection(); } return; } // empty canvas: back to the whole system
    hideTip();
    if (e.target.closest('.dive')) { const n = exNode(g.dataset.id); if (n && n.go) { exGoInto(n.go, g.dataset.id); return; } }
    exInspect(g.dataset.id);
  });
  c.addEventListener('keydown', e => {
    const g = e.target.closest('.bp-n'); if (!g) return;
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); exInspect(g.dataset.id); }
    if (e.key === '+' || (e.key === 'Enter' && e.shiftKey)) { const n = exNode(g.dataset.id); if (n && n.go) exGoInto(n.go, g.dataset.id); }
  });
  c.addEventListener('wheel', e => {
    e.preventDefault(); const [px, py] = local(e);
    const lineMode = e.deltaMode === 1;
    const mouseWheel = lineMode || (e.deltaX === 0 && Math.abs(e.deltaY) >= 50 && Number.isInteger(e.deltaY));
    if (e.ctrlKey || e.metaKey || mouseWheel) zoomAt(px, py, Math.exp(e.deltaY * (e.ctrlKey ? 0.01 : 0.0016) * (lineMode ? 30 : 1)));
    else { B.x += e.deltaX * B.s; B.y += e.deltaY * B.s; applyCam(); }
  }, { passive: false });
  c.addEventListener('dblclick', e => {
    if (e.target.closest('.pin')) return;
    const g = e.target.closest('.bp-n'); const n = g && exNode(g.dataset.id);
    if (n && n.go) { exGoInto(n.go, g.dataset.id); return; }
    const [px, py] = local(e); zoomAt(px, py, 0.6);
  });
}

/* ---- build view, legend, guided tour ---- */
const CATS = [
  ['model', 'Model', 'var(--model)', ['model', 'head', 'tok', 'tf', 'weights']],
  ['serving', 'API and compute', 'var(--serve)', ['api', 'gateway', 'gpu', 'kv']],
  ['context', 'Context', 'var(--ctx)', ['context', 's-sys', 's-schema', 's-hist', 's-user']],
  ['knowledge', 'Knowledge', 'var(--know)', ['know', 's-ret', 'rag-adv']],
  ['tools', 'Tools', 'var(--tool)', ['tools', 's-tooldef', 's-toolres', 'mcp']],
  ['agents', 'Agents', 'var(--harness)', ['harness', 'mem', 'sub']],
  ['production', 'Production', 'var(--ship)', ['evals']]
];
function setBuildMode(mode, quiet) {
  const B = BOARD; if (!B) return; B.mode = mode;
  if (B.view !== 'root') return;
  $$('.bp-n', B.svg).forEach(g => { const l = lessonForNode(g.dataset.id); g.classList.toggle('sketch', mode === 'build' && !P.done[l.id]); });
  if (!quiet) SFX.toggle();
}
function toggleCat(cat, btn) {
  const B = BOARD; const on = !btn.classList.contains('on');
  $$('.lg', B.el).forEach(b => { b.classList.remove('on'); b.setAttribute('aria-pressed', 'false'); });
  if (!on) { exHighlight(B.view === 'root' && L && $('.player.docked') ? L.lesson.hl : []); if (B.view === 'root' && L && $('.player.docked')) boardFocus(L.lesson); else fitAll(true); syncAllChip(); return; }
  btn.classList.add('on'); btn.setAttribute('aria-pressed', 'true');
  const ids = B.view === 'root' ? CATS.find(c => c[0] === cat)[3] : SYSV[B.view].nodes.filter(n => n.cat === cat).map(n => n.key);
  exHighlight(ids); fitBox(rawBox(ids), true); syncAllChip();
}
// one request, down through the layers and back up
const TOUR = [
  [['client'], 'A request leaves your app', 'A user types, a job runs or an IDE asks. Your app decides what to send; it never talks to the weights directly.'],
  [['harness'], 'The agent loop takes it', 'If the app is an agent, the harness owns this request: it will call the model, run tools and loop until the task is done.'],
  [['s-sys', 's-hist', 's-user', 's-schema'], 'The context is assembled', 'System prompt, conversation history, the new message and an output schema become one token sequence, rebuilt for this call.'],
  [['know', 's-ret'], 'Knowledge is fetched', 'Retrieval pulls the few passages that answer this question from the knowledge store into the context.'],
  [['tools', 'mcp', 's-tooldef'], 'Tools are described', 'Definitions of the tools the model may call, local or behind MCP servers, are placed in the context too.'],
  [['api'], 'One stateless API call', 'The whole context crosses the API in a single HTTPS request. Nothing about the previous call is remembered.'],
  [['gateway'], 'The serving layer', 'A gateway checks the key and rate limits, a router picks a replica, and a scheduler batches the request with other users.'],
  [['tok'], 'Text becomes numbers', 'The tokenizer cuts the context into IDs, and each ID becomes a learned vector.'],
  [['tf', 'weights'], 'Through the transformer', 'Dozens of attention and MLP blocks mix the tokens using billions of trained weights.'],
  [['gpu', 'kv'], 'On the GPUs', 'The weights sit in GPU memory, and the KV cache stores past keys and values so each new token is cheap.'],
  [['head'], 'One token is chosen', 'The output head scores every token in the vocabulary, softmax turns scores into probabilities, and one is sampled. Repeat until done.'],
  [['harness', 'tools', 's-toolres'], 'Maybe a tool call', 'If the model asked for a tool, the harness runs it, appends the result to the context and calls the model again.'],
  [['evals'], 'Watched at every layer', 'Every call is traced, checked by guardrails and covered by evals, so problems show up before users see them.'],
  [['client', 'api'], 'Tokens stream back', 'The answer streams back up to your app one token at a time, and the next request starts from the top.']
];
function blockCenter(ids) { const b = rawBox(ids); return [b[0] + b[2] / 2, b[1] + b[3] / 2]; }
function tourSteps() {
  const B = BOARD;
  if (B.view === 'root') return TOUR.map(([ids, t, d]) => ({ ids, t, d }));
  const v = SYSV[B.view];
  return (v.flow || []).map(f => ({ ids: f.n.map(k => v.id + '.' + k), t: f.t, d: f.d, e: f.e ? f.e.split('>').map(k => v.id + '.' + k) : null }));
}
function startTour() {
  const B = BOARD; if (!B || B.tour) return;
  if (B.busy) { setTimeout(startTour, 150); return; }
  const steps = tourSteps(); if (!steps.length) return;
  parkLesson();
  B.tour = { i: 0, wasHidden: B.hidden, steps }; B.el.classList.add('touring');
  $$('.lg', B.el).forEach(b => { b.classList.remove('on'); b.setAttribute('aria-pressed', 'false'); });
  if (!B.hidden) { B.hidden = true; B.panel.classList.add('hidden'); B.tab.hidden = true; }
  B.tour.card = h('div', { class: 'tour', role: 'dialog', 'aria-label': B.view === 'root' ? 'Trace a request' : 'Play the flow: ' + SYSV[B.view].title });
  B.main.append(B.tour.card);
  const pk = document.createElementNS('http://www.w3.org/2000/svg', 'circle'); pk.setAttribute('class', 'packet'); pk.setAttribute('r', '7');
  const c0 = blockCenter(steps[0].ids); pk.setAttribute('cx', c0[0]); pk.setAttribute('cy', c0[1]); B.svg.append(pk); B.tour.pk = pk;
  SFX.open(); tourStep(0);
}
function tourStep(i) {
  const B = BOARD; const T = B.tour; const steps = T.steps; const prev = steps[T.i]; T.i = i; const st = steps[i];
  exHighlight(st.ids); fitBox(rawBox(st.e ? [...new Set([...st.e, ...st.ids])] : st.ids), true);
  $$('.sys-e.flowing', B.svg).forEach(e => e.classList.remove('flowing'));
  if (T.raf) cancelAnimationFrame(T.raf);
  const edge = st.e && $(`.sys-e[data-a="${st.e[0]}"][data-b="${st.e[1]}"]`, B.svg);
  const t0 = performance.now();
  if (edge) {
    // the packet rides along the drawn connection
    edge.classList.add('flowing', 'hl'); edge.classList.remove('dim');
    const p = $('.ep', edge); const len = p.getTotalLength();
    const step = now => { const k = Math.min(1, (now - t0) / 750), e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; const pt = p.getPointAtLength(len * e);
      T.pk.setAttribute('cx', pt.x); T.pk.setAttribute('cy', pt.y); if (k < 1) T.raf = requestAnimationFrame(step); };
    T.raf = requestAnimationFrame(step);
  } else {
    const a = blockCenter(prev.ids), b = blockCenter(st.ids);
    const step = now => { const k = Math.min(1, (now - t0) / 650), e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      T.pk.setAttribute('cx', a[0] + (b[0] - a[0]) * e); T.pk.setAttribute('cy', a[1] + (b[1] - a[1]) * e - Math.sin(e * Math.PI) * 40); if (k < 1) T.raf = requestAnimationFrame(step); };
    T.raf = requestAnimationFrame(step);
  }
  const last = i === steps.length - 1;
  T.card.innerHTML = '';
  T.card.append(
    h('div', { class: 'k' }, h('span', null, `Step ${i + 1} of ${steps.length}`), h('span', { class: 'dots' }, steps.map((_, k) => h('i', { class: k <= i ? 'on' : '' })))),
    h('h4', null, st.t), h('p', null, st.d),
    h('div', { class: 'acts' },
      h('button', { class: 'btn btn-ghost btn-sm x', onclick: () => endTour() }, 'Exit'),
      i > 0 ? h('button', { class: 'btn btn-sm', 'data-sfx': 'none', onclick: () => { SFX.back(); tourStep(i - 1); } }, 'Back') : null,
      h('button', { class: 'btn btn-accent btn-sm', 'data-sfx': 'none', onclick: () => { if (last) { SFX.correct(); endTour(); } else { SFX.token(i); tourStep(i + 1); } } }, last ? 'Done' : 'Next')));
}
function endTour(silent) {
  const B = BOARD; if (!B || !B.tour) return; const T = B.tour;
  if (T.raf) cancelAnimationFrame(T.raf); T.card.remove(); T.pk.remove(); B.tour = null; B.el.classList.remove('touring');
  $$('.sys-e.flowing', B.svg).forEach(e => e.classList.remove('flowing'));
  if (!T.wasHidden) { B.hidden = false; B.panel.classList.remove('hidden'); B.main.classList.remove('panel-off'); B.tab.hidden = true; } else B.tab.hidden = false;
  if (silent) return;
  if (B.view === 'root' && L && $('.player.docked')) boardFocus(L.lesson); else { exHighlight([]); fitAll(true); }
}
