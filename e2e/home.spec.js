// Course page: map, popover, streaks, theme, links.
const { test, expect, openApp, expectNoHorizontalScroll } = require('./fixtures');

test.describe('course page', () => {
  test('renders the course, the map and all 19 lessons', async ({ page }) => {
    await openApp(page);
    await expect(page.getByRole('button', { name: 'Start learning' })).toBeVisible();
    await expect(page.locator('.mnode')).toHaveCount(19);
    await expect(page.locator('.level')).toHaveCount(8);
    await expect(page.locator('.mnode.next')).toHaveCount(1);
    await expect(page.getByText('0 of 19 complete')).toBeVisible();
    await expectNoHorizontalScroll(page);
  });

  test('a lesson node opens a card that starts the lesson', async ({ page }) => {
    await openApp(page);
    const node = page.getByRole('button', { name: /^Lesson 3: Tokens and embeddings/ });
    await node.click();
    const card = page.getByRole('dialog', { name: 'Tokens and embeddings' });
    await expect(card).toBeVisible();
    await expect(node).toHaveClass(/sel/);
    await card.getByRole('button', { name: 'Start lesson' }).click();
    await expect(page.locator('.player')).toBeVisible();
    await expect(page.locator('.step h2')).toHaveText('The model never sees letters');
  });

  test('the card closes on Escape, outside click and a second tap', async ({ page }) => {
    await openApp(page);
    const node = page.getByRole('button', { name: /^Lesson 2:/ });
    await node.click();
    await expect(page.locator('.pop')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('.pop')).toHaveCount(0);
    await node.click();
    await page.locator('h1').click();
    await expect(page.locator('.pop')).toHaveCount(0);
    await node.click(); await node.click();
    await expect(page.locator('.pop')).toHaveCount(0);
    await expect(node).not.toHaveClass(/sel/);
  });

  test('streak card reflects seeded learning days', async ({ page }) => {
    await openApp(page, { done: ['two-boxes'], streakDays: [0, 1, 2, 4] });
    const card = page.locator('.streak-card');
    await expect(card.getByText('3-day streak')).toBeVisible();
    await expect(card.locator('.sc-day.on')).toHaveCount(4);
    await expect(card.locator('.sc-day.today')).toHaveCount(1);
    await expect(page.locator('.stat-pill.streak')).toContainText('3');
  });

  test('no XP or energy limit is shown anywhere', async ({ page }) => {
    await openApp(page);
    await expect(page.getByText(/\bXP\b/)).toHaveCount(0);
  });

  test('theme cycles auto, light, dark and persists across reload', async ({ page }) => {
    await openApp(page);
    const btn = page.locator('.topbar .theme-btn');
    await btn.click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await btn.click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    expect(bg).toBe('rgb(16, 19, 24)'); // cool grey dark ground
  });

  test('GitHub links point to the author and open safely', async ({ page }) => {
    await openApp(page);
    for (const link of await page.locator('a[href*="github.com"]').all()) {
      await expect(link).toHaveAttribute('href', 'https://github.com/SawabS');
      await expect(link).toHaveAttribute('target', '_blank');
      await expect(link).toHaveAttribute('rel', /noopener/);
    }
    await expect(page.locator('footer')).toContainText('Designed and built by Sawab Sarkavri.');
  });

  test('a deep link opens the lesson directly', async ({ page }) => {
    await openApp(page, { hash: 'kv-cache' });
    await expect(page.locator('.player .step h2')).toHaveText('Do not recompute the past');
  });

  test('no stray text leaks into the page outside the app', async ({ page }) => {
    await openApp(page);
    const stray = await page.evaluate(() => [...document.body.childNodes].filter(n => n.nodeType === 3 && n.textContent.trim()).map(n => n.textContent.trim()));
    expect(stray).toEqual([]);
    expect(await page.evaluate(() => !!document.querySelector('link[rel="icon"][href^="data:image/svg+xml"]'))).toBe(true);
  });

  test('every lesson card scrolls fully into view, and the tapped lesson stays clear of the top bar', async ({ page }) => {
    test.setTimeout(120000);
    await openApp(page);
    const n = await page.locator('.mnode').count();
    for (const i of [0, 4, 9, 13, n - 2, n - 1]) {
      await page.evaluate(() => closePop());
      const node = page.locator('.mnode').nth(i);
      // the hardest case: the node sits right at the bottom edge when tapped
      await node.evaluate(el => { const r = el.getBoundingClientRect(); window.scrollBy(0, r.bottom - (window.visualViewport ? visualViewport.height : innerHeight) + 30); });
      await node.click();
      await expect(page.locator('.pop')).toBeVisible();
      await expect.poll(() => page.evaluate(() => { const c = document.querySelector('.pop').getBoundingClientRect(); const vh = window.visualViewport ? visualViewport.height : innerHeight; return c.bottom <= vh + 1; }), { message: 'card ' + (i + 1) + ' fully on screen' }).toBe(true);
      const top = await page.evaluate(() => document.querySelector('.mnode.sel').getBoundingClientRect().top - document.querySelector('.topbar').getBoundingClientRect().bottom);
      expect(top, 'lesson ' + (i + 1) + ' clear of the top bar').toBeGreaterThan(0);
    }
  });

  test('each level rail runs straight out from behind its header', async ({ page }) => {
    await openApp(page);
    const r = await page.evaluate(() => [...document.querySelectorAll('.level')].map(lv => {
      const d = lv.querySelector('svg.rail path').getAttribute('d');
      return { starts: /^M 50 -\d+ L 50 0/.test(d), headerAbove: getComputedStyle(lv.querySelector('.level-head')).zIndex };
    }));
    r.forEach((x, i) => { expect(x.starts, 'level ' + (i + 1) + ' rail starts behind the header').toBe(true); expect(+x.headerAbove).toBeGreaterThan(0); });
  });
});
