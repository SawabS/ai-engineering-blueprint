// Visual regression baselines (opt-in: VISUAL=1). Fonts are blocked and progress is fixed, so captures are deterministic.
const { test, expect, openApp } = require('./fixtures');

test.skip(!process.env.VISUAL, 'set VISUAL=1 to run visual baselines');

const SIZES = [[390, 844, 'phone'], [1024, 768, 'tablet'], [1440, 900, 'desktop']];
const FREEZE = '*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}';

for (const [w, h, name] of SIZES) {
  for (const theme of ['light', 'dark']) {
    test.describe(`${name} ${theme}`, () => {
      test.use({ viewport: { width: w, height: h }, colorScheme: theme });
      test('course, lesson and board look right', async ({ page }) => {
        await page.clock.install({ time: new Date('2026-10-15T10:00:00') });
        await openApp(page, { done: ['two-boxes', 'next-token', 'tokens'], streakDays: [0, 1], theme });
        await page.addStyleTag({ content: FREEZE });
        await expect(page).toHaveScreenshot(`course-${name}-${theme}.png`);
        await page.evaluate(() => { openLesson(1); L.si = 0; renderStep(true); });
        await page.addStyleTag({ content: FREEZE });
        await expect(page).toHaveScreenshot(`lesson-${name}-${theme}.png`);
        await page.evaluate(() => { closeLesson(); openBoard({}); setCam(0, 0, 1, false); fitAll(false); });
        await page.addStyleTag({ content: FREEZE });
        await page.waitForFunction(() => BOARD && !BOARD.anim); // camera settled before capturing
        await page.evaluate(() => fitAll(false));
        await expect(page).toHaveScreenshot(`board-${name}-${theme}.png`);
      });
    });
  }
}
