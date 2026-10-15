// "Go deeper" drawers: every panel and tab renders, maths parses, nothing overflows, links are safe.
const { test, expect, openApp } = require('./fixtures');

test('every Go deeper panel renders cleanly in every tab', async ({ page }) => {
  test.setTimeout(180000);
  await openApp(page);
  const list = await page.evaluate(() => LESSONS.flatMap(l => l.steps.map((s, si) => s.deep ? [l.idx, si, l.id] : null).filter(Boolean)));
  expect(list.length).toBeGreaterThanOrEqual(40);
  const lessonsWithDeep = new Set(list.map(x => x[2]));
  expect(lessonsWithDeep.size, 'every lesson has at least one deep dive').toBe(19);
  const problems = [];
  for (const [li, si, id] of list) {
    await page.evaluate(([li, si]) => { if (!L || L.lesson.idx !== li) openLesson(li); L.si = si; renderStep(true); }, [li, si]);
    const det = page.locator('details.deep');
    await expect(det).toHaveCount(1);
    await det.locator('summary').click();
    await expect(det).toHaveAttribute('open', '');
    const tabs = Math.max(1, await det.locator('.seg button').count());
    for (let t = 0; t < tabs; t++) {
      if (tabs > 1) await det.locator('.seg button').nth(t).click();
      const found = await page.evaluate(() => {
        const d = document.querySelector('details.deep'); const out = [];
        d.querySelectorAll('mtext').forEach(m => { if (m.textContent.startsWith('\\')) out.push('unknown TeX ' + m.textContent); });
        const W = document.querySelector('#p-main').getBoundingClientRect().right;
        d.querySelectorAll('.deep-body > *, .tool, .refs li, .code-card').forEach(el => { const r = el.getBoundingClientRect(); if (r.right > W + 1) out.push('overflows by ' + Math.round(r.right - W)); });
        if (document.documentElement.scrollWidth > innerWidth + 1) out.push('page scrolls sideways');
        d.querySelectorAll('a').forEach(a => { if (!a.href.startsWith('https://') || !/noopener/.test(a.rel) || a.target !== '_blank') out.push('unsafe link ' + a.href); });
        if (!d.querySelector('.deep-body').textContent.trim()) out.push('empty tab');
        return out;
      });
      found.forEach(f => problems.push(`${id} step ${si + 1} tab ${t + 1}: ${f}`));
    }
  }
  expect(problems, problems.join('\n')).toEqual([]);
});

test('lesson maths renders as MathML, and code copies to the clipboard', async ({ page, context, browserName }) => {
  await openApp(page, { hash: 'attention' });
  await page.evaluate(() => { L.si = 0; renderStep(true); });
  await expect(page.locator('.step .beat > .prose .math-block math')).toHaveCount(1);
  await page.locator('details.deep summary').click();
  await page.locator('details.deep .seg button', { hasText: 'Code' }).click();
  await context.grantPermissions(['clipboard-read', 'clipboard-write']).catch(() => {});
  const copy = page.locator('details.deep .copy-btn').first();
  await copy.click();
  await expect(copy).toHaveText(/Copied|Select and copy/);
});

test('Enter on the drawer summary opens it instead of advancing the lesson', async ({ page }) => {
  await openApp(page, { hash: 'next-token' });
  await page.evaluate(() => { L.si = 0; renderStep(true); });
  await page.locator('details.deep summary').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('details.deep')).toHaveAttribute('open', '');
  expect(await page.evaluate(() => L.si)).toBe(0);
});

test('completion screen lists the lesson toolkit', async ({ page }) => {
  await openApp(page, { hash: 'retrieval' });
  await page.evaluate(() => finishLesson());
  const chips = page.locator('.toolkit .tk-chip');
  expect(await chips.count()).toBeGreaterThan(3);
  await expect(chips.first()).toHaveAttribute('rel', /noopener/);
});

const AxeBuilder = require('@axe-core/playwright').default;
for (const theme of ['light', 'dark']) {
  test(`an open drawer passes axe in every tab (${theme})`, async ({ page }) => {
    await openApp(page, { hash: 'knowledge', theme });
    await page.evaluate(() => { L.si = 2; renderStep(true); });
    await page.locator('details.deep summary').click();
    const found = [];
    for (const tab of ['Maths', 'Code', 'Tools', 'Sources']) {
      await page.locator('details.deep .seg button', { hasText: tab }).click();
      await page.waitForTimeout(400);
      const res = await new AxeBuilder({ page }).include('details.deep').withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
      res.violations.forEach(v => found.push(`${tab}: ${v.id} ${v.nodes.slice(0, 3).map(n => n.target.join(' ') + ' ' + (n.any[0] ? n.any[0].message.slice(0, 90) : '')).join(' | ')}`));
    }
    expect(found, found.join('\n')).toEqual([]);
  });
}
