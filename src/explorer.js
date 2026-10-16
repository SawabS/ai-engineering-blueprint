/* ================= System explorer engine =================
   Renders SYSV views as SVG, drills in and out with a zoom transition, shows an inspector in the board
   panel, plays each view's request flow, and searches every component. Works inside the system map. */

/* ---- rendering ---- */
function sysColor(cat) { return (SYS_CAT[cat] || SYS_CAT.ext)[0]; }
function edgeGeom(a, b, o = {}) {
  const r = n => Math.round(n * 10) / 10;
  const ac = [a.x + a.w / 2, a.y + a.h / 2], bc = [b.x + b.w / 2, b.y + b.h / 2];
  if (o.ch != null) {
    // channel routing for loop-backs: leave a, run along y = ch, enter b
    const y = o.ch, x0 = o.ax != null ? o.ax : ac[0], x1 = o.bx != null ? o.bx : bc[0];
    const y0 = y > ac[1] ? a.y + a.h : a.y, y1 = y > bc[1] ? b.y + b.h : b.y, rr = 12, sx = Math.sign(x1 - x0) || 1;
    const d = `M${r(x0)} ${r(y0)} V${r(y - Math.sign(y - y0) * rr)} Q${r(x0)} ${r(y)} ${r(x0 + sx * rr)} ${r(y)} H${r(x1 - sx * rr)} Q${r(x1)} ${r(y)} ${r(x1)} ${r(y + Math.sign(y1 - y) * rr)} V${r(y1)}`;
    return { d, mid: [(x0 + x1) / 2, y] };
  }
  const overlapX = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
  const overlapY = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
  const gapX = Math.max(b.x - (a.x + a.w), a.x - (b.x + b.w)), gapY = Math.max(b.y - (a.y + a.h), a.y - (b.y + b.h));
  const horiz = o.h ? true : o.v ? false : overlapX < 10 && (overlapY > 8 || gapX >= 2 * gapY);
  const bend = o.bend || 0; let p0, p3, c1, c2;
  if (horiz) {
    const sx = Math.sign(bc[0] - ac[0]) || 1;
    p0 = [sx > 0 ? a.x + a.w : a.x, ac[1]]; p3 = [sx > 0 ? b.x : b.x + b.w, bc[1]];
    const k = Math.max(22, Math.abs(p3[0] - p0[0]) * 0.5);
    c1 = [p0[0] + sx * k, p0[1] + bend]; c2 = [p3[0] - sx * k, p3[1] + bend];
  } else {
    const sy = Math.sign(bc[1] - ac[1]) || 1;
    p0 = [ac[0], sy > 0 ? a.y + a.h : a.y]; p3 = [bc[0], sy > 0 ? b.y : b.y + b.h];
    const k = Math.max(22, Math.abs(p3[1] - p0[1]) * 0.5);
    c1 = [p0[0] + bend, p0[1] + sy * k]; c2 = [p3[0] + bend, p3[1] - sy * k];
  }
  const mid = [0, 1].map(i => (p0[i] + 3 * c1[i] + 3 * c2[i] + p3[i]) / 8);
  return { d: `M${r(p0[0])} ${r(p0[1])} C${r(c1[0])} ${r(c1[1])} ${r(c2[0])} ${r(c2[1])} ${r(p3[0])} ${r(p3[1])}`, mid };
}
function fitFont(text, room, max, perChar) { return Math.max(8.5, Math.min(max, room / Math.max(1, String(text).length * perChar))); }
function sysNodeSVG(v, n) {
  const c = sysColor(n.cat); const { x, y, w, h: hh } = n; const rx = 12;
  const tf = fitFont(n.t, w - (n.go ? 46 : 24), 14.5, 0.58), sf = fitFont(n.s || '', w - 24, 11, 0.53);
  const ty = n.s ? y + hh / 2 - 3 : y + hh / 2 + 5, sy = y + hh / 2 + 14;
  let body = `<rect class="lip" x="${x}" y="${y + 5}" width="${w}" height="${hh}" rx="${rx}"/>` +
    `<rect class="glow" x="${x - 5}" y="${y - 5}" width="${w + 10}" height="${hh + 10}" rx="${rx + 5}"/>` +
    `<rect class="blk" x="${x}" y="${y}" width="${w}" height="${hh}" rx="${rx}"/>`;
  if (n.shape === 'db') body += `<path class="db-arc" d="M${x + 10} ${y + 9} Q${x + w / 2} ${y + 19} ${x + w - 10} ${y + 9}"/>`;
  body += `<text class="sn-t" x="${x + 13}" y="${ty}" style="font-size:${tf.toFixed(1)}px">${esc(n.t)}</text>`;
  if (n.s) body += `<text class="sn-s" x="${x + 13}" y="${sy}" style="font-size:${sf.toFixed(1)}px">${esc(n.s)}</text>`;
  if (n.go) body += `<g class="dive"><circle cx="${x + w - 15}" cy="${y + 15}" r="10"/><path d="M${x + w - 19} ${y + 15}h8M${x + w - 15} ${y + 11}v8"/></g>`;
  const label = `${n.t}${n.s ? ', ' + n.s : ''}${n.go ? '. Has a detailed view' : ''}`;
  return `<g class="bp-n sys-n clickable${n.go ? ' drill' : ''}" data-id="${n.key}" tabindex="0" role="button" aria-label="${esc(label)}" style="--c:${c}">${body}</g>`;
}
function sysViewSVG(v) {
  const [bx, by, bw, bh] = v.bounds;
  let s = `<svg class="bp sysv" viewBox="${bx} ${by} ${bw} ${bh}" preserveAspectRatio="xMinYMin meet" role="group" aria-label="${esc(v.title)}">` +
    `<defs><marker id="sysArr" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" class="ah"/></marker>` +
    `<marker id="sysArrHl" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" class="ah hl"/></marker></defs>`;
  (v.lanes || []).forEach(L => { s += `<g class="lane" style="--c:${sysColor(L.cat)}"><rect x="${L.x}" y="${L.y}" width="${L.w}" height="${L.h}" rx="18"/><text x="${L.x + 16}" y="${L.y + 22}">${esc(L.t)}</text></g>`; });
  v.edges.forEach(([a, b, label, o = {}]) => {
    const A = v.byId[a], Bn = v.byId[b]; if (!A || !Bn) return;
    const g = edgeGeom(A, Bn, o);
    // place the label where it does not cover a block; if nowhere fits, it lives in the inspector instead
    let lab = '';
    if (label) {
      const lw = label.length * 6.4 + 8, lh = 14;
      const spots = [[g.mid[0] - lw / 2, g.mid[1] - 6 - lh], [g.mid[0] - lw / 2, g.mid[1] + 4], [g.mid[0] + 8, g.mid[1] - lh / 2], [g.mid[0] - 8 - lw, g.mid[1] - lh / 2]];
      const free = ([x, y]) => v.nodes.every(n => x + lw < n.x - 2 || n.x + n.w + 2 < x || y + lh < n.y - 2 || n.y + n.h + 7 < y);
      const spot = spots.find(free);
      if (spot) lab = `<text class="el" x="${(spot[0] + lw / 2).toFixed(1)}" y="${(spot[1] + lh - 3).toFixed(1)}" text-anchor="middle">${esc(label)}</text>`;
    }
    s += `<g class="sys-e${o.dash ? ' dash' : ''}" data-a="${A.key}" data-b="${Bn.key}"><path class="ep" d="${g.d}"/>${lab}</g>`;
  });
  v.nodes.forEach(n => { s += sysNodeSVG(v, n); });
  return s + '</svg>';
}

/* ---- lookups shared by root and sub-views ---- */
function exNode(key) {
  if (SYSN[key]) return SYSN[key];
  if (BPN[key]) {
    const l = lessonForNode(key); const cat = CATS.find(c => c[3].includes(key));
    const catMap = { model: 'model', serving: 'serve', context: 'ctx', knowledge: 'know', tools: 'tool', agents: 'agent', production: 'ship' };
    const b = BOX[key] || [0, 0, 0, 0];
    return { key, root: true, t: BPN[key].t, s: '', d: BPN[key].d, cat: key === 'client' ? 'user' : catMap[cat ? cat[0] : 'model'] || 'model', l: l.id, go: ROOT_GO[key], x: b[0], y: b[1], w: b[2], h: b[3] };
  }
  return null;
}
function exBox(key) { const n = exNode(key); return n ? [n.x, n.y, n.w, n.h] : null; }
function curBounds() { const B = BOARD; return B && B.view !== 'root' ? SYSV[B.view].bounds : [0, 30, 1000, 590]; }
function viewTitle(vid) { return vid === 'root' ? 'System' : SYSV[vid].title; }

/* ---- view switching with a zoom transition ---- */
function setViewContent(vid) {
  const B = BOARD;
  const html = vid === 'root' ? bpSVG(MAX_STAGE, [], { click: 1, uid: 'B' }) : sysViewSVG(SYSV[vid]);
  const tmp = h('div', { html }); const svg = tmp.firstElementChild;
  B.svg.replaceWith(svg); B.svg = svg; B.view = vid; B.hl = []; B.sel = null; B.selLevel = null;
  B.canvas.dataset.view = vid;
  B.pins.hidden = vid !== 'root';
  if (vid === 'root') { addRootBadges(); setBuildMode(B.mode, true); renderPins(); }
  renderToolsBar(); renderLegend();
  try { history.replaceState(null, '', vid === 'root' ? '#board' : '#board:' + vid); } catch (e) { /* ignore */ }
}
function addRootBadges() {
  const B = BOARD;
  Object.keys(ROOT_GO).forEach(id => {
    const g = $(`.bp-n[data-id="${id}"]`, B.svg); const b = BOX[id]; if (!g || !b || g.classList.contains('frame')) return;
    g.classList.add('drill');
    const ns = 'http://www.w3.org/2000/svg';
    const dg = document.createElementNS(ns, 'g'); dg.setAttribute('class', 'dive root-dive');
    const cx = b[0] + b[2] - 11, cy = b[1] + 11;
    dg.innerHTML = `<circle cx="${cx}" cy="${cy}" r="8"/><path d="M${cx - 3.5} ${cy}h7M${cx} ${cy - 3.5}v7"/>`;
    g.append(dg);
  });
}
function camTo(box, ms) {
  const vr = visibleRect(); const s = Math.max(box[2] / vr.w, box[3] / vr.h);
  setCam(box[0] + box[2] / 2 - s * (vr.l + vr.w / 2), box[1] + box[3] / 2 - s * (vr.t + vr.h / 2), s, ms);
}
function viewTransition(swap, focusBox, dir) {
  const B = BOARD; if (!B) return;
  if (B.busy) { setTimeout(() => viewTransition(swap, focusBox, dir), 120); return; } // finish the running dive first
  hideTip(); endTour(true);
  const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) { swap(); fitAll(false); return; }
  B.busy = true; B.canvas.classList.add('diving');
  if (dir === 'in' && focusBox) camTo(focusBox, 340);
  else { const vr = visibleRect(); setCam(B.x - B.s * vr.w * 0.2, B.y - B.s * vr.h * 0.2, B.s * 1.4, 340); }
  setTimeout(() => {
    if (!BOARD) return;
    swap();
    const fb = curBounds(); const vr = visibleRect();
    if (dir === 'in') { const s = Math.max(fb[2] / vr.w, fb[3] / vr.h) * 2.4; setCam(fb[0] + fb[2] / 2 - s * (vr.w / 2), fb[1] + fb[3] / 2 - s * (vr.h / 2), s, false); }
    else if (focusBox) camTo(focusBox, false);
    requestAnimationFrame(() => { if (!BOARD) return; B.canvas.classList.remove('diving'); fitAll(true); setTimeout(() => { if (BOARD) BOARD.busy = false; }, 420); });
  }, 300);
}
function exGoInto(vid, fromKey) {
  const B = BOARD; if (!B || !SYSV[vid] || B.busy || vid === B.view) return;
  SFX.open();
  const box = fromKey ? exBox(fromKey) : null;
  B.trail.push({ view: B.view, from: fromKey || null });
  viewTransition(() => setViewContent(vid), box, 'in');
  if (!isPhone() || !B.hidden) exShowView(vid);
}
function exGoUp(levels = 1) {
  const B = BOARD; if (!B || !B.trail.length) return;
  if (B.busy) { setTimeout(() => exGoUp(levels), 120); return; } // Esc pressed mid-dive: climb once the dive lands
  SFX.back();
  let back = null; for (let i = 0; i < levels && B.trail.length; i++) back = B.trail.pop();
  viewTransition(() => setViewContent(back.view), back.from ? exBox(back.from) : null, 'out');
  setTimeout(() => { if (!BOARD) return; if (back.from) exInspect(back.from, true); else if (back.view === 'root') boardShowIndex(true); }, 320);
}
function exJump(vid, key) {
  const B = BOARD; if (!B) return;
  if (B.busy) { setTimeout(() => exJump(vid, key), 120); return; }
  if (B.view === vid) { if (key) exInspect(key); return; }
  B.trail = vid === 'root' ? [] : [{ view: 'root', from: SYSV[vid].from || null }];
  viewTransition(() => setViewContent(vid), null, 'in');
  setTimeout(() => { if (BOARD) key ? exInspect(key) : exShowView(vid); }, 340);
}

/* ---- top bar: breadcrumb, up and play ---- */
function renderToolsBar() {
  const B = BOARD; const bar = B.tools; bar.innerHTML = '';
  if (B.view === 'root') {
    bar.append(
      h('button', { class: 'btn btn-accent btn-sm', 'data-sfx': 'none', onclick: () => startTour(), html: ICON.play + '<span class="t-long">Trace a request</span><span class="t-short">Trace</span>' }),
      seg([['build', 'My system'], ['full', 'Full system']], B.mode, v => setBuildMode(v), 'Board view'));
    return;
  }
  const crumbs = h('nav', { class: 'crumbs', 'aria-label': 'Where you are' });
  const levels = [...B.trail.map(t => t.view), B.view];
  levels.forEach((vid, i) => {
    const last = i === levels.length - 1;
    if (i) crumbs.append(h('span', { class: 'sep', 'aria-hidden': 'true' }, '›'));
    crumbs.append(last ? h('span', { class: 'cur', 'aria-current': 'location' }, viewTitle(vid))
      : h('button', { class: 'crumb', onclick: () => exGoUp(levels.length - 1 - i) }, viewTitle(vid)));
  });
  bar.append(h('button', { class: 'btn btn-sm up-btn', 'aria-label': 'Up one level', title: 'Up one level (Esc)', onclick: () => exGoUp(1), html: ICON.left.replace('<svg', '<svg width="16" height="16"') }), crumbs);
  if (SYSV[B.view].flow) bar.append(h('button', { class: 'btn btn-accent btn-sm', 'data-sfx': 'none', onclick: () => startTour(), html: ICON.play + '<span class="t-long">Play the flow</span><span class="t-short">Play</span>' }));
  requestAnimationFrame(() => { crumbs.scrollLeft = crumbs.scrollWidth; });
}
function renderLegend() {
  const B = BOARD; const lg = B.legend; lg.innerHTML = '';
  if (B.view === 'root') {
    CATS.forEach(c => lg.append(h('button', { class: 'lg', 'data-cat': c[0], 'aria-pressed': 'false', style: { '--c': c[2] }, onclick: e => toggleCat(c[0], e.currentTarget) }, h('i'), c[1])));
    return;
  }
  const used = [...new Set(SYSV[B.view].nodes.map(n => n.cat))];
  used.forEach(cat => lg.append(h('button', { class: 'lg', 'data-cat': cat, 'aria-pressed': 'false', style: { '--c': sysColor(cat) }, onclick: e => toggleCat(cat, e.currentTarget) }, h('i'), SYS_CAT[cat][1])));
}

/* ---- selection and inspector ---- */
function exHighlight(keys) {
  const B = BOARD; highlight(keys);
  $$('.sys-e', B.svg).forEach(e => {
    const on = keys.length && (keys.includes(e.dataset.a) || keys.includes(e.dataset.b));
    e.classList.toggle('hl', !!on); e.classList.toggle('dim', !!keys.length && !on);
  });
}
function exNeighbours(key) {
  const n = SYSN[key]; if (!n) return [];
  const v = SYSV[n.view]; const out = [];
  v.edges.forEach(([a, b, label]) => { if (v.byId[a] === n) out.push([v.byId[b], '→', label]); else if (v.byId[b] === n) out.push([v.byId[a], '←', label]); });
  return out;
}
function parkLesson() {
  const B = BOARD; const p = $('.player.docked');
  if (p) { B.parked = p; p.remove(); }
}
function unparkLesson() {
  const B = BOARD; if (!B || !B.parked) return false;
  const p = B.parked; B.parked = null; boardDock(p, L.lesson); return true;
}
function exPanelOpen() { const B = BOARD; if (B.hidden) { B.hidden = false; B.panel.classList.remove('hidden'); B.main.classList.remove('panel-off'); B.tab.hidden = true; } }
function exInspect(key, quiet) {
  const B = BOARD; const n = exNode(key); if (!B || !n) return;
  if (B.tour) endTour(true);
  parkLesson();
  B.sel = key; B.selLevel = null; renderPins();
  const peers = n.root ? peerKeys(key) : [key]; exHighlight(peers); // a block on the top-level diagram selects everything its lesson added
  if (!quiet) SFX.select();
  const l = n.l ? LESSONS.find(x => x.id === n.l) : null;
  const tools = (n.tl || (n.root && l ? l.steps.flatMap(s => (s.deep && s.deep.tools) || []).slice(0, 8) : [])).map(sysTool).filter(Boolean);
  const nb = n.root ? [] : exNeighbours(key);
  const c = sysColor(n.cat);
  const body = h('div', { class: 'insp', style: { '--c': c } },
    h('div', { class: 'insp-cat' }, h('i'), (SYS_CAT[n.cat] || SYS_CAT.ext)[1], h('span', { class: 'in-view' }, ' · ' + viewTitle(n.root ? 'root' : n.view))),
    h('h3', null, n.t),
    n.s ? h('p', { class: 'insp-sub' }, n.s) : null,
    h('p', { class: 'insp-d' }, n.d),
    n.num ? h('div', { class: 'insp-num' }, h('span', null, 'Key figure'), h('b', null, n.num)) : null,
    n.how ? h('div', { class: 'insp-sec' }, h('h4', null, 'How it works'), h('ol', null, n.how.map(x => h('li', null, x)))) : null,
    nb.length ? h('div', { class: 'insp-sec' }, h('h4', null, 'Connected to'), h('div', { class: 'insp-links' }, nb.map(([m, dir, label]) =>
      h('button', { class: 'insp-link', style: { '--c': sysColor(m.cat) }, onclick: () => exInspect(m.key) }, h('span', { class: 'dir', 'aria-hidden': 'true' }, dir), m.t, label ? h('small', null, label) : null)))) : null,
    n.root && l ? h('div', { class: 'insp-sec insp-need' }, h('h4', null, `Added in lesson ${l.idx + 1} · ${l.title}`), h('p', null, h('b', null, 'The need: '), l.need),
      peers.length > 1 ? h('div', { class: 'insp-links' }, peers.filter(k => k !== key).map(k => {
        const m = exNode(k); return h('button', { class: 'insp-link', style: { '--c': sysColor(m.cat) }, onclick: () => exInspect(k) }, h('span', { class: 'dir', 'aria-hidden': 'true' }, '+'), m.t, h('small', null, 'added together'));
      })) : null) : null,
    tools.length ? h('div', { class: 'insp-sec' }, h('h4', null, 'Tools for this'), h('div', { class: 'tk-chips' }, tools.map(t => extLink(t.u, 'tk-chip', [t.n])))) : null,
    h('div', { class: 'insp-acts' },
      n.go ? h('button', { class: 'btn btn-accent', 'data-sfx': 'none', onclick: () => exGoInto(n.go, key), html: `<span>Look inside: ${esc(SYSV[n.go].title)}</span>` }) : null,
      l ? h('button', { class: 'btn', onclick: () => { B.parked = null; openLesson(l.idx); } }, `Lesson ${l.idx + 1}: ${l.title}`) : null,
      B.parked && L ? h('button', { class: 'btn btn-ghost', onclick: () => unparkLesson() }, 'Back to my lesson') : null));
  B.ttl.textContent = 'Explorer'; B.expandBtn.hidden = true;
  B.panelBody.innerHTML = ''; B.panelBody.append(body); B.panelBody.scrollTop = 0;
  if (!quiet) exPanelOpen();
}
function exShowView(vid) {
  const B = BOARD; const v = SYSV[vid]; if (!B || !v) return;
  parkLesson();
  const body = h('div', { class: 'insp' },
    h('div', { class: 'insp-cat' }, h('i'), 'Detailed view'),
    h('h3', null, v.title), h('p', { class: 'insp-d' }, v.sub + '.'),
    h('p', { class: 'insp-tip' }, isPhone() ? 'Tap a block to learn about it. Blocks with a + open their own detailed view.' : 'Click a block to learn about it. Blocks with a + open their own detailed view: double-click them or use Look inside. Esc goes up a level.'),
    v.flow ? h('button', { class: 'btn btn-accent', 'data-sfx': 'none', onclick: () => startTour(), html: ICON.play + '<span>Play the flow</span>' }) : null,
    h('div', { class: 'insp-sec' }, h('h4', null, 'In this view'), h('div', { class: 'insp-links' }, v.nodes.map(m =>
      h('button', { class: 'insp-link', style: { '--c': sysColor(m.cat) }, onclick: () => exInspect(m.key) }, m.t, m.go ? h('small', null, '+ detailed view') : null)))));
  B.ttl.textContent = 'Explorer'; B.expandBtn.hidden = true;
  B.panelBody.innerHTML = ''; B.panelBody.append(body); B.panelBody.scrollTop = 0;
}

/* ---- search across every component ---- */
function exSearchBox() {
  const res = h('div', { class: 'ex-res', role: 'list' });
  const inp = h('input', { type: 'search', class: 'ex-q', placeholder: 'Find a component: KV cache, reranker, MCP…', 'aria-label': 'Search the system map' });
  const all = [...Object.values(SYSN).map(n => ({ key: n.key, vid: n.view, t: n.t, s: n.s, d: n.d, cat: n.cat })),
    ...Object.keys(BPN).map(k => ({ key: k, vid: 'root', t: BPN[k].t, s: '', d: BPN[k].d, cat: 'model' }))];
  const run = () => {
    const q = inp.value.trim().toLowerCase(); res.innerHTML = '';
    if (q.length < 2) return;
    const hits = all.map(x => ({ x, score: (x.t.toLowerCase().includes(q) ? 3 : 0) + ((x.s || '').toLowerCase().includes(q) ? 2 : 0) + (x.d.toLowerCase().includes(q) ? 1 : 0) }))
      .filter(r => r.score).sort((a, b) => b.score - a.score).slice(0, 8);
    if (!hits.length) { res.append(h('p', { class: 'ex-none' }, 'Nothing matches. Try another word.')); return; }
    hits.forEach(({ x }) => res.append(h('button', { class: 'insp-link', role: 'listitem', style: { '--c': x.vid === 'root' ? 'var(--accent-ink)' : sysColor(x.cat) }, onclick: () => exJump(x.vid, x.key) }, x.t, h('small', null, viewTitle(x.vid)))));
  };
  inp.addEventListener('input', run);
  const chips = h('div', { class: 'ex-views' }, Object.entries(SYSV).map(([vid, v]) => h('button', { class: 'insp-link', onclick: () => exJump(vid) }, v.title)));
  return h('div', { class: 'ex-search' }, h('h5', null, 'Explore the system'), inp, res, h('details', { class: 'ex-all' }, h('summary', null, `All ${Object.keys(SYSV).length} detailed views`), chips));
}
