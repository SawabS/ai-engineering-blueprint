// Shared fixtures and helpers for the AI Engineering Blueprint QA suite.
// Every test gets a fresh browser context, so progress and theme never leak between tests.
const base = require('@playwright/test');
const { expect } = base;

const STORE = 'ai-eng-blueprint.v1';
const THEME = 'ai-eng-blueprint.theme';

function dayKey(offset = 0) {
  const d = new Date(); d.setDate(d.getDate() - offset);
  return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
}

const test = base.test.extend({
  // Collects page errors and console errors; any test that produced one fails at teardown.
  errors: [async ({ page }, use) => {
    const errs = [];
    page.on('pageerror', e => errs.push(`pageerror: ${e.message}`));
    page.on('console', m => {
      if (m.type() !== 'error') return;
      const t = m.text();
      if (/fonts\.(googleapis|gstatic)\.com|net::ERR_/.test(t)) return; // fonts are blocked on purpose
      errs.push(`console: ${t}`);
    });
    await use(errs);
    expect(errs, 'page and console errors').toEqual([]);
  }, { auto: true }],

  // Google Fonts are blocked by default so runs are deterministic and offline-safe. Set FONTS=1 to allow them.
  page: async ({ page }, use) => {
    if (!process.env.FONTS) await page.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
    await use(page);
  },
});

/** Opens the app with optional seeded progress and theme. */
async function openApp(page, { done = [], streakDays = [], theme, hash = '' } = {}) {
  await page.addInitScript(({ STORE, THEME, done, days, theme }) => {
    if (sessionStorage.getItem('__seeded')) return; // seed once, so reload tests see real persistence
    sessionStorage.setItem('__seeded', '1');
    const P = { done: Object.fromEntries(done.map(id => [id, true])), xp: 0, days };
    localStorage.setItem(STORE, JSON.stringify(P));
    if (theme) localStorage.setItem(THEME, theme);
  }, { STORE, THEME, done, days: streakDays.map(dayKey), theme });
  await page.goto('/' + (hash ? '#' + hash : ''));
  await expect(page.locator('h1')).toHaveText('AI Engineering Blueprint');
}

/** Reveals every remaining paragraph of the current lesson step through the real Continue button. */
async function revealBeats(page) {
  for (let i = 0; i < 12; i++) {
    const more = await page.evaluate(() => L && L.beat < L.beats.length);
    if (!more) return;
    await page.locator('#p-foot').getByRole('button', { name: 'Continue' }).click();
  }
}

/** Fails if the document scrolls sideways. */
async function expectNoHorizontalScroll(page) {
  const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(over, 'horizontal overflow in px').toBeLessThanOrEqual(1);
}

/** On phones the system map opens with its sheet closed; this opens it through its tab, as a learner would. */
async function showPanel(page) {
  if (await page.evaluate(() => !!(BOARD && BOARD.hidden))) {
    await page.locator('.panel-tab').click();
    await page.waitForTimeout(120); // the map re-frames itself around the opened sheet
  }
  await expect(page.locator('.panel')).not.toHaveClass(/hidden/);
  await page.waitForFunction(() => !BOARD.anim);
}

module.exports = { test, expect, openApp, showPanel, revealBeats, expectNoHorizontalScroll, dayKey, STORE, THEME };
