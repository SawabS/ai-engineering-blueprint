// Security checks for a static, client-only site (OWASP 2025 items that apply: A02, A03, A05, A08, A10).
const fs = require('fs');
const path = require('path');
const { test, expect, openApp } = require('./fixtures');

const ROOT = path.join(__dirname, '..');
const SRC = fs.readdirSync(path.join(ROOT, 'src')).filter(f => f.endsWith('.js')).map(f => [f, fs.readFileSync(path.join(ROOT, 'src', f), 'utf8')]);

test('no dynamic code execution in the source (eval, new Function, string timers)', () => {
  for (const [f, s] of SRC) {
    expect(s, f).not.toMatch(/\beval\s*\(/);
    expect(s, f).not.toMatch(/new\s+Function\s*\(/);
    expect(s, f).not.toMatch(/set(Timeout|Interval)\s*\(\s*['"`]/);
    expect(s, f).not.toMatch(/document\.write\s*\(/);
  }
});

test('the page only talks to its own origin and Google Fonts', async ({ page }) => {
  const hosts = new Set();
  page.on('request', r => { const u = new URL(r.url()); if (!['data:', 'blob:'].includes(u.protocol)) hosts.add(u.host); });
  await openApp(page);
  await page.evaluate(() => { openLesson(LESSONS.findIndex(l => l.id === 'retrieval')); });
  await page.evaluate(() => { closeLesson(); openBoard({}); });
  const allowed = new Set(['127.0.0.1:' + (process.env.PORT || 4173), 'fonts.googleapis.com', 'fonts.gstatic.com']);
  expect([...hosts].filter(h => !allowed.has(h))).toEqual([]);
});

test('no inline event-handler attributes and no javascript: URLs in the DOM', async ({ page }) => {
  await openApp(page);
  for (const go of [() => {}, () => page.evaluate(() => openLesson(LESSONS.findIndex(l => l.id === 'tools'))), () => page.evaluate(() => { closeLesson(); openBoard({}); })]) {
    await go();
    const bad = await page.evaluate(() => [...document.querySelectorAll('*')].flatMap(el => [...el.attributes]
      .filter(a => /^on/i.test(a.name) || /^\s*javascript:/i.test(a.value)).map(a => `${el.tagName}[${a.name}]`)));
    expect(bad).toEqual([]);
  }
});

test('every external link opens with rel="noopener"', async ({ page }) => {
  await openApp(page);
  const links = await page.evaluate(() => [...document.querySelectorAll('a[target="_blank"]')].map(a => a.rel));
  expect(links.length).toBeGreaterThan(0);
  for (const rel of links) expect(rel).toMatch(/noopener/);
});

test('the page refuses to be framed by other sites and limits the referrer', async () => {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  expect(html).toMatch(/<meta http-equiv="Content-Security-Policy"[^>]+>/);
  expect(html).toMatch(/<meta name="referrer" content="strict-origin-when-cross-origin">/);
});

test('only expected keys are written to browser storage', async ({ page }) => {
  await openApp(page);
  await page.locator('.topbar .theme-btn').click();
  await page.evaluate(() => { openLesson(0); finishLesson(); closeLesson(); openBoard({}); });
  const keys = await page.evaluate(() => Object.keys(localStorage).sort());
  expect(keys.every(k => k.startsWith('ai-eng-blueprint.'))).toBe(true);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('ai-eng-blueprint.v1')));
  expect(Object.keys(saved).sort()).toEqual(['at', 'days', 'done', 'xp']);
});
