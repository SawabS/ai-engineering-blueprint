// Layout matrix: 12 screen sizes x 2 themes, thirteen app states each (see audit.js for the checks).
const path = require('path');
const fs = require('fs');
const { test, expect, openApp } = require('./fixtures');
const { audit } = require('./audit');

const VIEWPORTS = [
  [320, 568, 'small-phone'], [360, 740, 'android'], [375, 667, 'iphone-se'], [390, 844, 'iphone'], [412, 915, 'pixel'],
  [768, 1024, 'ipad-portrait'], [1024, 768, 'ipad-landscape'], [1280, 720, 'laptop-small'], [1366, 768, 'laptop'],
  [1440, 900, 'macbook'], [1920, 1080, 'desktop'], [2560, 1440, 'desktop-qhd']
];
const SHOTS = process.env.QA_SHOTS || '';

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
        const settle = async () => { await page.waitForFunction(() => typeof BOARD === 'undefined' || !BOARD || !BOARD.anim, null, { timeout: 8000 }); await page.waitForTimeout(250); }; // camera glide and marker transitions done
        const check = async (tag, opts = {}) => { await settle(); (await audit(page, { touch, ...opts })).forEach(p => problems.push(`[${tag}] ${p}`)); await shot(tag); };

        await openApp(page, { done: ['two-boxes', 'next-token', 'tokens'], streakDays: [0, 1], theme });
        await check('home');
        await page.locator('.mnode.next').scrollIntoViewIfNeeded();
        await page.locator('.mnode.next').click();
        await expect(page.locator('.pop')).toBeVisible();
        await check('map-card');
        await page.getByRole('dialog').getByRole('button', { name: 'Start lesson' }).click();
        await page.evaluate(() => { L.si = 0; renderStep(true); });
        await check('lesson', { scope: '.player' });
        await page.evaluate(() => openLesson(LESSONS.findIndex(l => l.id === 'retrieval')));
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
        await page.locator('.idx-level[data-u="2"]').click(); // level 3, from the lesson index
        await page.waitForTimeout(700);
        await check('board-level', { scope: '.board' });
        await page.evaluate(() => exInspect('tools'));
        await expect(page.locator('.insp-need')).toBeVisible();
        await page.waitForTimeout(500);
        await check('board-inspector', { scope: '.board' });
        await page.evaluate(() => { const i = document.querySelector('.insp'); i.scrollTop = i.scrollHeight; });
        await check('board-inspector-scrolled', { scope: '.board' });
        await page.evaluate(() => openLesson(LESSONS.findIndex(l => l.id === 'tools')));
        await expect(page.locator('.panel .player.docked')).toBeVisible();
        await page.waitForTimeout(600);
        await check('board-lesson', { scope: '.board' });
        await page.getByRole('button', { name: /Trace/ }).click();
        await expect(page.locator('.panel')).toBeHidden(); // the tour slides the panel away
        await page.waitForTimeout(700);
        await check('board-tour', { scope: '.board' });
        await page.locator('.tour').getByRole('button', { name: 'Exit' }).click();
        await page.evaluate(() => exJump('serving', 'serving.kvm'));
        await expect(page.locator('.board-canvas')).toHaveAttribute('data-view', 'serving');
        await expect(page.locator('.insp h3')).toHaveText('KV cache manager');
        // the panel slides back in after the tour; wait until it has arrived
        await expect.poll(() => page.locator('.panel').evaluate(e => { const r = e.getBoundingClientRect(); return r.right <= innerWidth + 1 && r.bottom <= innerHeight + 1; })).toBe(true);
        await page.waitForTimeout(600);
        await check('explorer', { scope: '.board' });
        await page.evaluate(() => exShowView('serving'));
        await expect(page.locator('.insp h3')).toHaveText('Serving layer');
        await page.waitForTimeout(300);
        await check('explorer-view', { scope: '.board' });
        await info.attach('layout-problems', { body: problems.join('\n') || 'none', contentType: 'text/plain' });
        expect(problems, problems.join('\n')).toEqual([]);
      });
    });
  }
}
