// System explorer: data integrity, layout of every view, drill-down navigation, flows, search and accessibility.
const AxeBuilder = require('@axe-core/playwright').default;
const { test, expect, openApp, expectNoHorizontalScroll } = require('./fixtures');

async function openBoardAt(page, view) {
  await openApp(page);
  await page.evaluate(v => { openBoard({}); if (v) exJump(v); }, view);
  if (view) await expect(page.locator('.board-canvas')).toHaveAttribute('data-view', view);
  await page.waitForTimeout(900);
}

test('the system map data is complete and consistent', async ({ page }) => {
  await openApp(page);
  const problems = await page.evaluate(() => {
    const out = []; const lessonIds = new Set(LESSONS.map(l => l.id));
    Object.keys(ROOT_GO).forEach(k => { if (!BPN[k]) out.push('ROOT_GO key is not a blueprint block: ' + k); if (!SYSV[ROOT_GO[k]]) out.push('ROOT_GO target missing: ' + k); });
    Object.entries(SYSV).forEach(([vid, v]) => {
      const ids = new Set();
      v.nodes.forEach(n => {
        if (ids.has(n.id)) out.push(`${vid}: duplicate node ${n.id}`); ids.add(n.id);
        if (!SYS_CAT[n.cat]) out.push(`${vid}.${n.id}: unknown category ${n.cat}`);
        if (!n.d || n.d.length < 30) out.push(`${vid}.${n.id}: description missing or too short`);
        if (n.go && !SYSV[n.go]) out.push(`${vid}.${n.id}: go target ${n.go} missing`);
        if (n.go === vid) out.push(`${vid}.${n.id}: links to its own view`);
        if (n.l && !lessonIds.has(n.l)) out.push(`${vid}.${n.id}: unknown lesson ${n.l}`);
        (n.tl || []).forEach(t => { const r = sysTool(t); if (!r || !/^https:\/\//.test(r.u)) out.push(`${vid}.${n.id}: tool ${typeof t === 'string' ? t : t.n} has no link`); });
      });
      v.edges.forEach(([a, b]) => { if (!v.byId[a] || !v.byId[b]) out.push(`${vid}: edge ${a}>${b} references a missing node`); });
      (v.flow || []).forEach((f, i) => {
        f.n.forEach(k => { if (!v.byId[k]) out.push(`${vid} flow ${i + 1}: missing node ${k}`); });
        if (f.e) { const [a, b] = f.e.split('>'); if (!v.edges.some(e => e[0] === a && e[1] === b)) out.push(`${vid} flow ${i + 1}: edge ${f.e} is not drawn`); }
      });
      if (!v.from || !BPN[v.from]) out.push(`${vid}: no root block opens it`);
    });
    // every view is reachable from the root by clicking
    const seen = new Set(), queue = Object.values(ROOT_GO);
    while (queue.length) { const v = queue.shift(); if (seen.has(v)) continue; seen.add(v); SYSV[v].nodes.forEach(n => n.go && queue.push(n.go)); }
    Object.keys(SYSV).forEach(v => { if (!seen.has(v)) out.push('unreachable view ' + v); });
    return out;
  });
  expect(problems, problems.join('\n')).toEqual([]);
  expect(await page.evaluate(() => Object.keys(SYSV).length)).toBeGreaterThanOrEqual(15);
  expect(await page.evaluate(() => Object.keys(SYSN).length)).toBeGreaterThanOrEqual(180);
});

test('every view lays out cleanly: no overlaps, no clipped labels, nothing outside its frame', async ({ page }) => {
  test.setTimeout(240000);
  await openBoardAt(page, null);
  const views = await page.evaluate(() => Object.keys(SYSV));
  const problems = [];
  for (const v of views) {
    await page.evaluate(v => exJump(v), v);
    await expect(page.locator('.board-canvas')).toHaveAttribute('data-view', v);
    await page.waitForTimeout(700);
    const found = await page.evaluate(() => {
      const out = []; const svg = BOARD.svg; const view = SYSV[BOARD.view];
      const nodes = [...svg.querySelectorAll('.sys-n')].map(g => ({ id: g.dataset.id, dive: !!g.querySelector('.dive'), r: g.querySelector('.blk').getBBox(), t: g.querySelector('.sn-t').getBBox(), s: g.querySelector('.sn-s') && g.querySelector('.sn-s').getBBox() }));
      if (nodes.length !== view.nodes.length) out.push('not every node rendered');
      for (const n of nodes) {
        if (n.t.x + n.t.width > n.r.x + n.r.width - (n.dive ? 26 : 6)) out.push('title clipped: ' + n.id);
        if (n.s && n.s.x + n.s.width > n.r.x + n.r.width - 6) out.push('subtitle clipped: ' + n.id);
        const [bx, by, bw, bh] = view.bounds; if (n.r.x < bx || n.r.y < by || n.r.x + n.r.width > bx + bw || n.r.y + n.r.height > by + bh) out.push('outside the frame: ' + n.id);
      }
      for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i].r, c = nodes[j].r;
        if (a.x < c.x + c.width + 6 && c.x < a.x + a.width + 6 && a.y < c.y + c.height + 8 && c.y < a.y + a.height + 8) out.push('blocks touch: ' + nodes[i].id + ' / ' + nodes[j].id);
      }
      svg.querySelectorAll('.el').forEach(l => { const r = l.getBBox(); nodes.forEach(n => { const a = n.r; if (r.x < a.x + a.width && a.x < r.x + r.width && r.y < a.y + a.height && a.y < r.y + r.height) out.push(`edge label "${l.textContent}" covers ${n.id}`); }); });
      if (svg.querySelectorAll('.sys-e').length !== view.edges.length) out.push('not every connection rendered');
      return out;
    });
    found.forEach(f => problems.push(`${v}: ${f}`));
    await expectNoHorizontalScroll(page);
  }
  expect(problems, problems.join('\n')).toEqual([]);
});

test('drill down from the blueprint, keep going deeper, and climb back out', async ({ page }) => {
  await openBoardAt(page, null);
  await page.locator('.board-canvas .bp-n[data-id="roof"]').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.insp h3')).toHaveText('Serving layer');
  await page.locator('.insp').getByRole('button', { name: 'Look inside: Serving layer' }).click();
  await expect(page.locator('.board-canvas')).toHaveAttribute('data-view', 'serving');
  await expect(page.locator('.crumbs')).toContainText('System');
  await expect(page.locator('.crumbs .cur')).toHaveText('Serving layer');
  await expect(page).toHaveURL(/#board:serving$/);
  await page.waitForTimeout(700);
  // a block in a detailed view opens its own inspector, and its own detailed view
  await page.locator('.board-canvas .bp-n[data-id="serving.kvm"]').click();
  await expect(page.locator('.insp h3')).toHaveText('KV cache manager');
  await expect(page.locator('.insp .insp-link')).toHaveCount(2);
  await page.locator('.insp').getByRole('button', { name: /Look inside/ }).click();
  await expect(page.locator('.board-canvas')).toHaveAttribute('data-view', 'kv');
  await page.waitForTimeout(700);
  await page.locator('.board-canvas .bp-n[data-id="kv.pool"]').dblclick();
  await expect(page.locator('.board-canvas')).toHaveAttribute('data-view', 'gpu');
  await expect(page.locator('.crumbs .crumb')).toHaveCount(3);
  await page.waitForTimeout(700);
  // breadcrumb jumps two levels up at once
  await page.locator('.crumbs .crumb', { hasText: 'Serving layer' }).click();
  await expect(page.locator('.board-canvas')).toHaveAttribute('data-view', 'serving');
  await page.waitForTimeout(700);
  // Escape climbs one level, then closes the board from the top
  await page.keyboard.press('Escape');
  await expect(page.locator('.board-canvas')).toHaveAttribute('data-view', 'root');
  await expect(page.locator('.pins')).toBeVisible();
  await page.waitForTimeout(500);
  await page.keyboard.press('Escape');
  await expect(page.locator('.board')).toHaveCount(0);
});

test('Esc pressed while a dive is still animating is not lost', async ({ page }) => {
  await openApp(page);
  await page.evaluate(() => openBoard({}));
  await page.evaluate(() => exGoInto('serving'));
  await page.keyboard.press('Escape'); // straight away, mid-transition
  await expect(page.locator('.board-canvas')).toHaveAttribute('data-view', 'root');
  await expect(page.locator('.board')).toBeVisible(); // climbed one level, did not close the board
});

test('a deep link opens a detailed view directly', async ({ page }) => {
  await openApp(page, { hash: 'board:rag' });
  await expect(page.locator('.board-canvas')).toHaveAttribute('data-view', 'rag');
  await expect(page.locator('.crumbs .cur')).toHaveText('Retrieval-augmented generation');
});

test('every view\'s flow plays from start to finish', async ({ page }) => {
  test.setTimeout(420000);
  await openBoardAt(page, null);
  const views = await page.evaluate(() => Object.keys(SYSV).filter(v => SYSV[v].flow));
  for (const v of views) {
    await page.evaluate(v => exJump(v), v);
    await expect(page.locator('.board-canvas')).toHaveAttribute('data-view', v);
    await page.waitForTimeout(500);
    await test.step(`play ${v}`, async () => {
    await page.locator('.board-tools').getByRole('button', { name: /Play/ }).click();
    const card = page.locator('.tour');
    await expect(card).toBeVisible();
    const n = await page.evaluate(() => BOARD.tour.steps.length);
    for (let i = 1; i < n; i++) { await card.getByRole('button', { name: 'Next' }).click(); await expect(card.locator('.k')).toContainText(`Step ${i + 1} of ${n}`); }
    await expect(page.locator('.board-canvas .packet')).toHaveCount(1);
    await card.getByRole('button', { name: 'Done' }).click();
    await expect(card).toHaveCount(0);
    });
  }
});

test('search finds any component and takes you to it', async ({ page }) => {
  await openBoardAt(page, null);
  await page.getByRole('searchbox', { name: 'Search the system map' }).fill('rerank');
  await page.locator('.ex-res .insp-link', { hasText: 'Rerank' }).first().click();
  await expect(page.locator('.board-canvas')).toHaveAttribute('data-view', 'rag');
  await expect(page.locator('.insp h3')).toHaveText('Rerank');
  await expect(page.locator('.board-canvas .bp-n[data-id="rag.rerank"]')).toHaveClass(/hl/);
});

test('inspecting a block keeps your lesson, and you can return to it', async ({ page }) => {
  await openBoardAt(page, null);
  await page.locator('.pin[data-i="6"]').click();
  await expect(page.locator('.panel-head .ttl')).toHaveText('7. The KV cache');
  await page.locator('#p-foot').getByRole('button', { name: 'Continue' }).click();
  const si = await page.evaluate(() => L.si);
  await page.locator('.board-canvas .bp-n[data-id="gpu"]').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.insp h3')).toHaveText('GPUs and HBM');
  await page.locator('.insp').getByRole('button', { name: 'Back to my lesson' }).click();
  await expect(page.locator('.panel-head .ttl')).toHaveText('7. The KV cache');
  expect(await page.evaluate(() => L.si)).toBe(si);
});

test('the legend highlights categories inside a detailed view', async ({ page }) => {
  await openBoardAt(page, 'serving');
  await page.locator('.legend .lg', { hasText: 'Hardware' }).click();
  const hl = await page.locator('.board-canvas .bp-n.hl').count();
  expect(hl).toBe(await page.evaluate(() => SYSV.serving.nodes.filter(n => n.cat === 'gpu').length));
  await page.locator('.legend .lg', { hasText: 'Hardware' }).click();
  await expect(page.locator('.board-canvas .bp-n.hl')).toHaveCount(0);
});

for (const theme of ['light', 'dark']) {
  test(`a detailed view with the inspector open passes axe (${theme})`, async ({ page }) => {
    test.setTimeout(120000);
    await openApp(page, { theme });
    await page.evaluate(() => { openBoard({}); exJump('harness'); });
    await page.waitForTimeout(900);
    await page.locator('.board-canvas .bp-n[data-id="harness.call"]').click();
    await page.waitForTimeout(500);
    const res = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
    const found = res.violations.map(v => `${v.id}: ${v.nodes.slice(0, 3).map(n => n.target.join(' ') + ' ' + (n.any[0] ? n.any[0].message.slice(0, 100) : '')).join(' | ')}`);
    expect(found, found.join('\n')).toEqual([]);
  });
}
