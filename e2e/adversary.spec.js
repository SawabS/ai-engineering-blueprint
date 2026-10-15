// Adversarial ("try to break it") tests: hostile input, rapid clicking, broken state, odd navigation, extreme sizes.
const { test, expect, openApp, expectNoHorizontalScroll, STORE } = require('./fixtures');

const PAYLOADS = [
  '<img src=x onerror="window.__pwned=1">',
  '"><script>window.__pwned=1</script>',
  '{{constructor.constructor("window.__pwned=1")()}}',
  'سڵاو، چۆنی؟ ئەمڕۆ کەشوهەوا خۆشە. שלום עולם 👩🏽‍💻🧠🔥',
  '​​​   ',
  'a'.repeat(5000),
];

test.describe('hostile input', () => {
  for (const [k, text] of PAYLOADS.entries()) {
    test(`tokenizer and retrieval lab survive payload #${k + 1}`, async ({ page }) => {
      await openApp(page, { hash: 'tokens' });
      await page.evaluate(() => { L.si = 0; renderStep(true); });
      const ta = page.getByRole('textbox', { name: 'Text to tokenize' });
      await ta.fill(text);
      await expect(page.locator('.toks .tok').first()).toBeVisible();
      await expectNoHorizontalScroll(page);
      await page.evaluate(() => openLesson(11));
      await page.evaluate(() => { L.si = 1; renderStep(true); });
      const q = page.getByRole('textbox', { name: 'Search query' });
      await q.fill(text);
      await expect(page.locator('.rank-row')).toHaveCount(10);
      expect(await page.evaluate(() => window.__pwned)).toBeUndefined();
      const over = await page.evaluate(() => { const m = document.querySelector('.p-main'); return m.scrollWidth - m.clientWidth; });
      expect(over).toBeLessThanOrEqual(1);
    });
  }
});

test.describe('interaction abuse', () => {
  test('hammering Continue cannot skip a gated interactive', async ({ page }) => {
    await openApp(page, { hash: 'two-boxes' });
    const btn = page.locator('#p-foot [data-primary]');
    for (let i = 0; i < 10; i++) await btn.click({ force: true, timeout: 1500 }).catch(() => {});
    expect(await page.evaluate(() => L.si)).toBe(0);
    await expect(btn).toBeDisabled();
  });

  test('double-clicking map nodes and buttons leaves a consistent state', async ({ page }) => {
    await openApp(page);
    await page.locator('.mnode').nth(4).dblclick();
    await expect(page.locator('.pop')).toHaveCount(0);
    await expect(page.locator('.mnode.sel')).toHaveCount(0);
    await page.locator('.mnode').nth(4).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Start lesson' }).dblclick();
    await expect(page.locator('.player')).toHaveCount(1);
  });

  test('rapidly opening and closing the board leaves no stray overlays', async ({ page }) => {
    await openApp(page);
    for (let i = 0; i < 6; i++) { await page.evaluate(() => openBoard({})); await page.keyboard.press('Escape'); }
    await expect(page.locator('.board, .player, .bp-tip:visible, .pop')).toHaveCount(0);
    await expect(page.locator('body')).not.toHaveCSS('overflow', 'hidden');
  });

  test('quiz answers cannot be changed after checking', async ({ page }) => {
    await openApp(page, { hash: 'two-boxes' });
    await page.evaluate(() => { L.si = 1; renderStep(true); });
    await page.locator('.opt').nth(1).click();
    await page.locator('#p-foot').getByRole('button', { name: 'Check' }).click();
    await page.locator('.opt').nth(0).click({ force: true });
    await expect(page.locator('.opt').nth(0)).not.toHaveClass(/sel|wrong/);
  });
});

test.describe('broken state and odd navigation', () => {
  test('corrupted saved progress does not break the app', async ({ page }) => {
    await page.addInitScript(k => localStorage.setItem(k, '{not json'), STORE);
    await page.goto('/');
    await expect(page.locator('h1')).toHaveText('AI Engineering Blueprint');
    await expect(page.locator('.mnode')).toHaveCount(19);
  });

  test('wrong-shaped saved progress does not break the app', async ({ page }) => {
    await page.addInitScript(k => localStorage.setItem(k, JSON.stringify({ done: null, days: 'x', xp: 'lots' })), STORE);
    await page.goto('/');
    await expect(page.locator('.mnode')).toHaveCount(19);
    await page.locator('.mnode').first().click();
    await expect(page.locator('.pop')).toBeVisible();
  });

  test('blocked storage (private mode) still works', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', { get() { throw new Error('denied'); } });
    });
    await page.goto('/');
    await expect(page.locator('.mnode')).toHaveCount(19);
    await page.evaluate(() => openLesson(0));
    await expect(page.locator('.player')).toBeVisible();
  });

  test('unknown or hostile hashes fall back to the course page', async ({ page }) => {
    for (const h of ['does-not-exist', '%3Cscript%3Ealert(1)%3C%2Fscript%3E', '..%2F..%2Fetc']) {
      await page.goto('/#' + h);
      await expect(page.locator('h1')).toHaveText('AI Engineering Blueprint');
      await expect(page.locator('.player')).toHaveCount(0);
    }
  });

  test('reload mid-lesson keeps finished lessons and returns to the lesson', async ({ page }) => {
    await openApp(page, { done: ['two-boxes'], hash: 'next-token' });
    await page.reload();
    await expect(page.locator('.player .step h2')).toHaveText('A score for every possible token');
    await page.getByRole('button', { name: 'Close lesson' }).click();
    await expect(page.getByRole('button', { name: /^Lesson 1:.*complete/ })).toBeVisible();
  });

  test('extreme widths 320px and 5000px never scroll sideways', async ({ page }) => {
    await openApp(page);
    for (const w of [320, 5000, 320]) {
      await page.setViewportSize({ width: w, height: 900 });
      await expectNoHorizontalScroll(page);
      await page.evaluate(() => openBoard({}));
      await expectNoHorizontalScroll(page);
      await page.keyboard.press('Escape');
    }
  });

  test('resizing across the phone breakpoint keeps the board usable', async ({ page }) => {
    await openApp(page);
    await page.evaluate(() => openBoard({ lesson: 4 }));
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.locator('.panel .player')).toBeVisible();
    await page.setViewportSize({ width: 1366, height: 768 });
    await expect(page.locator('.panel .player')).toBeVisible();
    const pw = await page.locator('.panel').evaluate(e => e.getBoundingClientRect().width);
    expect(pw).toBeGreaterThan(300);
  });
});
