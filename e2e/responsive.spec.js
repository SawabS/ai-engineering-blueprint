// Layout matrix: 12 screen sizes x 2 themes, six app states each.
// Checks: no sideways scroll, nothing clipped off-screen, touch targets, no overlapping map elements.
const path = require('path');
const fs = require('fs');
const { test, expect, openApp } = require('./fixtures');

const VIEWPORTS = [
  [320, 568, 'small-phone'], [360, 740, 'android'], [375, 667, 'iphone-se'], [390, 844, 'iphone'], [412, 915, 'pixel'],
  [768, 1024, 'ipad-portrait'], [1024, 768, 'ipad-landscape'], [1280, 720, 'laptop-small'], [1366, 768, 'laptop'],
  [1440, 900, 'macbook'], [1920, 1080, 'desktop'], [2560, 1440, 'desktop-qhd']
];
const SHOTS = process.env.QA_SHOTS || '';

/** Layout audit run inside the page. Returns a list of human-readable problems. */
async function audit(page, { touch, scope = 'document' }) {
  return page.evaluate(({ touch, scope }) => {
    const out = [];
    const W = innerWidth, H = innerHeight;
    if (document.documentElement.scrollWidth > W + 1) out.push(`page scrolls sideways by ${document.documentElement.scrollWidth - W}px`);
    const inScroller = el => { for (let p = el.parentElement; p; p = p.parentElement) { const o = getComputedStyle(p).overflowX; if ((o === 'auto' || o === 'scroll') && p.scrollWidth > p.clientWidth + 1) return true; } return false; };
    const visible = el => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && r.bottom > 0 && r.top < H; };
    const root = scope === 'document' ? document : document.querySelector(scope);
    const controls = [...root.querySelectorAll('button, a[href], input, [role="button"]')].filter(visible).filter(el => !el.closest('svg') && !el.closest('[hidden]'));
    for (const el of controls) {
      const r = el.getBoundingClientRect();
      const name = (el.getAttribute('aria-label') || el.textContent || el.className || el.tagName).trim().slice(0, 40);
      if (!inScroller(el) && !el.closest('.board-canvas') && (r.left < -1 || r.right > W + 1)) out.push(`control off-screen: "${name}" (${Math.round(r.left)}..${Math.round(r.right)} of ${W})`);
      if (touch && el.tagName !== 'INPUT' && !el.closest('.zoom-ctl') && (r.width < 24 || r.height < 24)) out.push(`touch target under 24px: "${name}" ${Math.round(r.width)}x${Math.round(r.height)}`);
    }
    // headings and button labels must not be cut with an ellipsis
    for (const el of root.querySelectorAll('h1, h2, h3, h4, .btn, .lab')) {
      if (!visible(el)) continue;
      const cs = getComputedStyle(el);
      if (cs.textOverflow === 'ellipsis' && el.scrollWidth > el.clientWidth + 1) out.push(`text truncated: "${el.textContent.trim().slice(0, 40)}"`);
    }
    // map: nodes, labels and the START tag must never overlap each other
    const parts = [...document.querySelectorAll('.mnode, .stop .lab, .start-bubble')].filter(visible).map(el => ({ el, r: el.getBoundingClientRect() }));
    for (let i = 0; i < parts.length; i++) for (let j = i + 1; j < parts.length; j++) {
      const a = parts[i], b = parts[j];
      if (a.el.contains(b.el) || b.el.contains(a.el) || a.el.closest('.stop') === b.el.closest('.stop')) continue;
      const ox = Math.min(a.r.right, b.r.right) - Math.max(a.r.left, b.r.left), oy = Math.min(a.r.bottom, b.r.bottom) - Math.max(a.r.top, b.r.top);
      if (ox > 2 && oy > 2) out.push(`map overlap: "${a.el.textContent.trim().slice(0, 20)}" and "${b.el.textContent.trim().slice(0, 20)}"`);
    }
    return [...new Set(out)];
  }, { touch, scope });
}

for (const [w, h, name] of VIEWPORTS) {
  for (const theme of ['light', 'dark']) {
    test.describe(`${name} ${w}x${h} ${theme}`, () => {
      const touch = w <= 1024;
      test.use({ viewport: { width: w, height: h }, colorScheme: theme, hasTouch: touch, isMobile: w <= 480 });

      test('layout holds in every state', async ({ page }, info) => {
        const problems = [];
        const shot = async tag => {
          const file = SHOTS ? path.join(SHOTS, `${name}-${theme}-${tag}.png`) : info.outputPath(`${tag}.png`);
          if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
          await page.screenshot({ path: file, animations: 'disabled' });
        };
        const check = async (tag, opts = {}) => { (await audit(page, { touch, ...opts })).forEach(p => problems.push(`[${tag}] ${p}`)); await shot(tag); };

        await openApp(page, { done: ['two-boxes', 'next-token', 'tokens'], streakDays: [0, 1], theme });
        await check('home');
        await page.locator('.mnode.next').scrollIntoViewIfNeeded();
        await page.locator('.mnode.next').click();
        await expect(page.locator('.pop')).toBeVisible();
        await check('map-card');
        await page.getByRole('dialog').getByRole('button', { name: 'Start lesson' }).click();
        await page.evaluate(() => { L.si = 0; renderStep(true); });
        await check('lesson', { scope: '.player' });
        await page.evaluate(() => openLesson(11));
        await page.evaluate(() => { L.si = 1; renderStep(true); });
        await check('lesson-wide-widget', { scope: '.player' });
        await page.evaluate(() => { L.si = 2; renderStep(true); });
        await page.locator('.opt').first().click();
        await page.locator('#p-foot').getByRole('button', { name: 'Check' }).click();
        await check('quiz-feedback', { scope: '.player' });
        await page.evaluate(() => { closeLesson(); openBoard({}); });
        await expect(page.locator('.panel .idx')).toBeVisible();
        await page.waitForTimeout(700); // camera settles
        await check('board', { scope: '.board' });
        await page.locator('.pin[data-i="6"]').click();
        await page.waitForTimeout(700);
        await check('board-lesson', { scope: '.board' });
        await page.getByRole('button', { name: /Trace/ }).click();
        await expect(page.locator('.panel')).toBeHidden(); // the tour slides the panel away
        await page.waitForTimeout(700);
        await check('board-tour', { scope: '.board' });
        await info.attach('layout-problems', { body: problems.join('\n') || 'none', contentType: 'text/plain' });
        expect(problems, problems.join('\n')).toEqual([]);
      });
    });
  }
}
