// Accessibility: axe-core (WCAG 2.0/2.1/2.2 A and AA) in every key state and both themes, plus keyboard checks.
const AxeBuilder = require('@axe-core/playwright').default;
const { test, expect, openApp } = require('./fixtures');

async function settle(page) {
  // let entrance animations finish so axe measures final colours, not mid-fade ones
  await page.evaluate(() => Promise.race([
    Promise.all(document.getAnimations().filter(a => a.effect && a.effect.getComputedTiming().iterations !== Infinity).map(a => a.finished.catch(() => {}))),
    new Promise(r => setTimeout(r, 3000))]));
}
async function scan(page, info, label) {
  await settle(page);
  const res = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
  await info.attach(`axe-${label}`, { body: JSON.stringify(res.violations, null, 2), contentType: 'application/json' });
  return res.violations.map(v => `[${label}] ${v.id} (${v.impact}): ${v.help} -> ${v.nodes.slice(0, 4).map(n => n.target.join(' ')).join(' | ')}${v.nodes.length > 4 ? ` (+${v.nodes.length - 4})` : ''}`);
}

for (const theme of ['light', 'dark']) {
  test(`axe finds no WCAG A/AA violations (${theme})`, async ({ page }, info) => {
    test.setTimeout(300000); // eight full axe scans; slow when the machine is busy
    const found = [];
    await openApp(page, { done: ['two-boxes'], streakDays: [0], theme });
    found.push(...await scan(page, info, 'home'));
    await page.locator('.mnode.next').click();
    found.push(...await scan(page, info, 'map-card'));
    await page.getByRole('dialog').getByRole('button', { name: 'Start lesson' }).click();
    await page.evaluate(() => { L.si = 0; renderStep(true); });
    found.push(...await scan(page, info, 'lesson'));
    await page.evaluate(() => { L.si = 1; renderStep(true); });
    await page.locator('.opt').first().click();
    await page.locator('#p-foot').getByRole('button', { name: 'Check' }).click();
    found.push(...await scan(page, info, 'quiz-feedback'));
    await page.evaluate(() => finishLesson());
    found.push(...await scan(page, info, 'lesson-complete'));
    await page.evaluate(() => { closeLesson(); openBoard({}); });
    found.push(...await scan(page, info, 'board'));
    await page.locator('.idx-level[data-u="2"]').click();
    found.push(...await scan(page, info, 'board-lesson'));
    await page.getByRole('button', { name: /Trace/ }).click();
    found.push(...await scan(page, info, 'board-tour'));
    expect(found, found.join('\n')).toEqual([]);
  });
}

test('document basics: language, title, one h1, landmarks', async ({ page }) => {
  await openApp(page);
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page).toHaveTitle('AI Engineering Blueprint');
  await expect(page.locator('h1')).toHaveCount(1);
  await expect(page.locator('main')).toHaveCount(1);
  await expect(page.locator('header')).toHaveCount(1);
  await expect(page.locator('footer')).toHaveCount(1);
});

test('every control has an accessible name', async ({ page }) => {
  await openApp(page);
  const states = [async () => {}, async () => page.evaluate(() => openLesson(1)), async () => page.evaluate(() => { closeLesson(); openBoard({}); })];
  for (const go of states) {
    await go();
    const unnamed = await page.evaluate(() => [...document.querySelectorAll('button, a[href], input, textarea, [role="button"]')]
      .filter(el => el.getClientRects().length && !el.closest('[hidden]'))
      .filter(el => !(el.getAttribute('aria-label') || el.getAttribute('aria-labelledby') || el.textContent.trim() || el.title || (el.labels && el.labels.length)))
      .map(el => el.outerHTML.slice(0, 90)));
    expect(unnamed).toEqual([]);
  }
});

test('keyboard: tab order reaches the map, focus is visible, Escape returns focus', async ({ page }) => {
  await openApp(page);
  const seen = [];
  for (let i = 0; i < 14; i++) {
    await page.keyboard.press('Tab');
    const info = await page.evaluate(() => { const a = document.activeElement; const cs = getComputedStyle(a); const f = a.matches(':focus-visible');
      return { tag: a.tagName, cls: a.className, name: (a.getAttribute('aria-label') || a.textContent || '').trim().slice(0, 30), focusVisible: f, outline: cs.outlineStyle !== 'none' || !!a.querySelector('.face') }; });
    seen.push(info);
    expect(info.focusVisible && info.outline, `visible focus on ${info.name}`).toBeTruthy();
  }
  expect(seen.some(s => /mnode/.test(s.cls)), 'tabbing reaches the lesson map').toBeTruthy();
  const node = page.locator('.mnode').first();
  await node.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.pop')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('.pop')).toHaveCount(0);
  await expect(node).toBeFocused();
});

test('keyboard: board blocks and level headings are reachable and operable', async ({ page }) => {
  await openApp(page);
  await page.evaluate(() => openBoard({}));
  await page.locator('.idx-level[data-u="0"]').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.lvl-card h3')).toHaveText('One request');
  await page.locator('.lvl-card .idx-row').nth(2).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.panel-head .ttl')).toHaveText('3. Tokens and embeddings');
  const block = page.locator('.board-canvas .bp-n[data-id="tools"]');
  await block.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.insp h3')).toHaveText('Tools');
  await page.locator('.insp').getByRole('button', { name: 'Back to my lesson' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.panel-head .ttl')).toHaveText('3. Tokens and embeddings');
  // drill in and climb out with the keyboard alone
  await block.focus();
  await page.keyboard.press('Enter');
  await page.locator('.insp').getByRole('button', { name: /Look inside/ }).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.crumbs .cur')).toHaveText('Tool calling');
  await page.waitForTimeout(800);
  await page.locator('.board-canvas .bp-n[data-id="tools.mcp"]').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.insp h3')).toHaveText('MCP client');
  await page.keyboard.press('Escape');
  await expect(page.locator('.board-canvas')).toHaveAttribute('data-view', 'root');
});

test('reduced motion: animations are effectively off', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openApp(page);
  const dur = await page.evaluate(() => getComputedStyle(document.querySelector('.start-bubble')).animationDuration);
  expect(parseFloat(dur)).toBeLessThan(0.01);
});
