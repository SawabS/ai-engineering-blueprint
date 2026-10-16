// The course's backbone: one request, grown by need, drawn as a layered architecture.
const { test, expect, openApp } = require('./fixtures');

const ORDER = ['two-boxes', 'next-token', 'tokens', 'context', 'steering', 'knowledge', 'retrieval', 'advanced-rag', 'tools', 'mcp',
  'agent-loop', 'context-eng', 'multi-agent', 'attention', 'training', 'gpus', 'kv-cache', 'serving', 'production'];

test('lessons run application first, and every lesson states the need it meets', async ({ page }) => {
  await openApp(page);
  const r = await page.evaluate(() => ({
    ids: LESSONS.map(l => l.id),
    levels: COURSE.units.map(u => u.title),
    missing: LESSONS.filter(l => !(l.need && l.need.length > 20 && l.added && l.trail && l.trail[0] === 'Your system')).map(l => l.id)
  }));
  expect(r.ids).toEqual(ORDER);
  expect(r.levels).toEqual(['One request', 'Shaping the request', 'Your own knowledge', 'Taking action', 'Agents', 'Inside the model', 'Running it yourself', 'Production']);
  expect(r.missing).toEqual([]);
});

test('every block of the diagram is introduced, and highlighted, by the lesson that adds it', async ({ page }) => {
  await openApp(page);
  const problems = await page.evaluate(() => {
    const out = [];
    Object.entries(BPN).forEach(([k, n]) => {
      const l = LESSONS[n.s - 1];
      if (!l) out.push(k + ': no lesson ' + n.s);
      else if (!l.hl.includes(k)) out.push(k + ': lesson ' + n.s + ' (' + l.id + ') does not highlight it');
      if (!BOX[k]) out.push(k + ': no position');
    });
    LESSONS.forEach((l, i) => { if (!Object.values(BPN).some(n => n.s === i + 1)) out.push(l.id + ' adds no block'); });
    // each pin sits on the top-left corner of a block its lesson adds
    if (PINS.length !== LESSONS.length) out.push('pins ' + PINS.length);
    PINS.forEach(([x, y], i) => {
      const own = Object.keys(BPN).filter(k => BPN[k].s === i + 1).map(k => BOX[k]);
      if (!own.some(b => Math.abs(b[0] - x) <= 2 && Math.abs(b[1] - y) <= 2)) out.push('pin ' + (i + 1) + ' is not on its block');
    });
    TOUR.forEach(([ids, t]) => ids.forEach(id => { if (!BOX[id]) out.push('tour "' + t + '" names ' + id); }));
    PRODUCTS.forEach(p => p[4].forEach(id => { if (!BPN[id]) out.push('product ' + p[0] + ' names ' + id); }));
    return out;
  });
  expect(problems, problems.join('\n')).toEqual([]);
});

test('no house-and-garden wording is left anywhere in the course', async ({ page }) => {
  await openApp(page);
  const hits = await page.evaluate(() => {
    const text = JSON.stringify([COURSE.units.map(u => ({ ...u, lessons: u.lessons.map(l => ({ ...l, unit: null, steps: l.steps.map(s => ({ ...s, deep: null })) })) })),
      BPN, TOUR, PRODUCTS, Object.values(SYSV).map(v => [v.title, v.sub, v.nodes.map(n => [n.t, n.s, n.d])]), DEEP]);
    const plain = text.replace(/https?:\/\/[^"\s]+/g, '');
    return (plain.match(/.{0,40}\b(house(?! style)|houses|garden|roof|foundation(?! model)|two boxes)\b.{0,40}/gi) || []);
  });
  expect(hits, hits.join('\n')).toEqual([]);
});

test('the diagram is clean at every stage: labels fit their blocks and blocks never collide', async ({ page }) => {
  await openApp(page);
  const problems = await page.evaluate(() => {
    const out = []; const host = document.createElement('div');
    host.style.cssText = 'position:fixed;left:0;top:0;width:1000px;height:620px;z-index:9999';
    document.body.append(host);
    const nested = { context: ['s-sys', 's-schema', 's-hist', 's-user', 's-tooldef', 's-ret', 's-toolres'], model: ['tok', 'tf', 'head', 'weights'], know: ['rag-adv'] };
    const inside = (a, b) => (nested[a] || []).includes(b) || (nested[b] || []).includes(a);
    for (let st = 1; st <= LESSONS.length; st++) {
      host.innerHTML = bpSVG(st, [], { ghost: 1, uid: 'qa' + st });
      const svg = host.firstElementChild; svg.setAttribute('width', 1000); svg.setAttribute('height', 620);
      const groups = [...svg.querySelectorAll('.bp-n')];
      groups.forEach(g => {
        const blk = g.querySelector('.blk'); if (!blk) return; const r = blk.getBoundingClientRect();
        // the drawing and BOX (used by pins, zoom, tours and the explorer) must agree
        const b = BOX[g.dataset.id];
        if (b &&[r.left - b[0], r.top - b[1], r.width - b[2], r.height - b[3]].some(d => Math.abs(d) > 1.5)) out.push(`${g.dataset.id}: drawn at ${[r.left, r.top, r.width, r.height].map(Math.round)} but BOX says ${b}`);
        g.querySelectorAll('text').forEach(t => {
          const q = t.getBoundingClientRect();
          if (q.left < r.left - 1 || q.right > r.right + 1 || q.top < r.top - 1 || q.bottom > r.bottom + 1) out.push(`stage ${st}: "${t.textContent}" spills out of ${g.dataset.id}`);
        });
      });
      for (let i = 0; i < groups.length; i++) for (let j = i + 1; j < groups.length; j++) {
        const a = groups[i].dataset.id, b = groups[j].dataset.id; if (inside(a, b)) continue;
        const ra = groups[i].querySelector('.blk'), rb = groups[j].querySelector('.blk'); if (!ra || !rb) continue;
        const p = ra.getBoundingClientRect(), q = rb.getBoundingClientRect();
        if (p.left < q.right - 1 && q.left < p.right - 1 && p.top < q.bottom - 1 && q.top < p.bottom - 1) out.push(`stage ${st}: ${a} overlaps ${b}`);
      }
    }
    host.remove();
    return [...new Set(out)];
  });
  expect(problems, problems.join('\n')).toEqual([]);
});

test('the finale maps real products onto the diagram', async ({ page }) => {
  await openApp(page, { hash: 'production' });
  await page.evaluate(() => { L.max = L.lesson.steps.length - 1; gotoStep(L.max); });
  const w = page.locator('.widget').last();
  for (const name of ['One-call feature', 'Chat assistant', 'Coding agent', 'Enterprise integration']) {
    await w.getByRole('button', { name }).click();
    await expect(w.locator('.callout')).toContainText(name);
    expect(await w.locator('.bp-n.hl').count()).toBeGreaterThan(5);
  }
  await w.getByRole('button', { name: 'Coding agent' }).click();
  await expect(w.locator('.bp-n.hl[data-id="harness"]')).toHaveCount(1);
  await expect(w.locator('.bp-n.dim[data-id="gpu"]')).toHaveCount(1);
});
