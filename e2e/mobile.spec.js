// Mobile journeys on real device profiles (portrait and landscape): every screen a learner meets on a phone
// or tablet, driven by taps, with the full layout audit after each step (see audit.js).
const { devices } = require('@playwright/test');
const { test, expect, openApp } = require('./fixtures');
const { audit } = require('./audit');

const DEVICES = ['iPhone SE', 'iPhone 13 Mini', 'iPhone 15', 'iPhone 15 Pro Max', 'Pixel 7', 'Galaxy S9+', 'Galaxy A55', 'iPad Mini',
  'iPhone SE landscape', 'iPhone 15 landscape', 'Pixel 7 landscape', 'Galaxy S24 landscape', 'iPad Mini landscape'];

for (const name of DEVICES) {
  const { defaultBrowserType, ...profile } = devices[name]; // always Chromium here; the profile supplies size, DPR, touch and UA
  test.describe(name, () => {
    test.use(profile);

    /** Runs the audit after camera moves and transitions settle, and collects problems with a tag. */
    const make = page => {
      const problems = [];
      const check = async (tag, scope) => {
        await page.waitForFunction(() => typeof BOARD === 'undefined' || !BOARD || !BOARD.anim, null, { timeout: 8000 });
        await page.waitForTimeout(250);
        (await audit(page, { touch: true, scope })).forEach(p => problems.push(`[${tag}] ${p}`));
      };
      return { problems, check };
    };
    /** The footer's main action is on screen and can be tapped. */
    const primaryReachable = async page => {
      const b = page.locator('#p-foot [data-primary]');
      await expect(b).toBeInViewport({ ratio: 1 });
    };

    test('learning journey: map, lesson, interactives, quiz, drawer, completion', async ({ page }) => {
      test.setTimeout(120000);
      const { problems, check } = make(page);
      await openApp(page, { done: [], theme: 'light' });
      await check('home');
      // the call to action and the first node are reachable by tapping
      await page.getByRole('button', { name: 'Start learning' }).tap();
      await expect(page.locator('.player')).toBeVisible();
      await check('lesson-1', '.player');
      await primaryReachable(page);
      // reveal the step paragraph by paragraph with taps, then satisfy the gate by tapping the diagram
      for (let i = 0; i < 6 && await page.evaluate(() => L.beat < L.beats.length); i++) await page.locator('#p-foot [data-primary]').tap();
      const w = page.locator('.widget').last();
      await w.locator('.bp-n[data-id="context"]').tap();
      await w.locator('.bp-n[data-id="model"]').tap();
      await expect(page.locator('#p-foot [data-primary]')).toBeEnabled();
      await check('lesson-1-widget', '.player');
      await page.locator('#p-foot [data-primary]').tap();
      // a quiz: pick an answer, check it, read the feedback sheet
      await expect(page.locator('.opt').first()).toBeVisible();
      await page.locator('.opt').nth(1).tap();
      await page.locator('#p-foot').getByRole('button', { name: 'Check' }).tap();
      await check('quiz-feedback', '.player');
      await primaryReachable(page);
      await page.locator('#p-foot [data-primary]').tap();
      // the Go deeper drawer on the next step: every tab fits and scrolls inside itself
      for (let i = 0; i < 6 && await page.evaluate(() => L.beat < L.beats.length); i++) await page.locator('#p-foot [data-primary]').tap();
      const deep = page.locator('details.deep');
      await deep.locator('summary').scrollIntoViewIfNeeded();
      await deep.locator('summary').tap();
      for (const tab of ['Maths', 'Code', 'Tools', 'Sources']) {
        const t = deep.locator('.seg button', { hasText: tab });
        if (!(await t.count())) continue;
        await t.scrollIntoViewIfNeeded(); await t.tap();
        await check('drawer-' + tab.toLowerCase(), '.player');
      }
      // switch theme inside the lesson, then step back with Back
      await page.locator('.player .p-top .theme-btn').tap(); // light -> dark
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
      await check('lesson-dark', '.player');
      await page.locator('#p-foot').getByRole('button', { name: 'Back' }).tap();
      expect(await page.evaluate(() => L.si)).toBe(1); // back from the third step (index 2) to the quiz
      // finish and return to the track
      await page.evaluate(() => finishLesson());
      await check('complete', '.player');
      await primaryReachable(page);
      await page.locator('#p-foot [data-primary]').tap();
      await expect(page.locator('.player')).toHaveCount(0);
      await expect(page.getByRole('button', { name: /^Lesson 2: .*start here/ })).toBeInViewport();
      await check('back-on-track');
      // the map card opens and closes with taps
      await page.getByRole('button', { name: /^Lesson 2: / }).tap();
      await expect(page.locator('.pop')).toBeVisible();
      await check('map-card');
      expect(problems, problems.join('\n')).toEqual([]);
    });

    test('system map journey: level, sheet, inspector, drill-down, whole system, tour', async ({ page }) => {
      test.setTimeout(120000);
      const { problems, check } = make(page);
      await openApp(page, { done: ['two-boxes', 'next-token', 'tokens'] });
      await page.getByRole('button', { name: 'Open the system map' }).first().tap();
      await expect(page.locator('.board')).toBeVisible();
      await check('map', '.board');
      // phones held upright open on the map alone: the whole system, the sheet closed until its tab is tapped
      await expect(page.locator('.lg.all')).toHaveAttribute('aria-pressed', 'true');
      if (await page.evaluate(() => BOARD.hidden)) {
        await page.locator('.board-canvas .bp-n[data-id="tools"]').tap(); // selecting keeps the sheet closed
        await expect(page.locator('.board-canvas .bp-n.hl')).toHaveCount(3);
        await expect(page.locator('.panel')).toHaveClass(/hidden/);
        await check('map-selected', '.board');
        await page.locator('.panel-tab').tap();
        await expect(page.locator('.insp h3')).toHaveText('Tools');
        await page.locator('.lg.all').tap();
      }
      await expect(page.locator('.panel')).not.toHaveClass(/hidden/);
      // a level heading in the lesson index opens its card and lights its blocks
      const level = page.locator('.idx-level[data-u="2"]');
      await level.scrollIntoViewIfNeeded();
      await level.tap();
      await expect(page.locator('.board-canvas .bp-n.hl')).toHaveCount(3);
      await expect(page.locator('.lvl-card h3')).toHaveText('Your own knowledge');
      await check('level-card', '.board');
      // open a lesson from the card: it docks in the panel or sheet and stays usable
      await page.locator('.lvl-card .idx-row').nth(1).tap();
      await expect(page.locator('.panel .player.docked')).toBeVisible();
      await check('docked-lesson', '.board');
      // inspect a block: the inspector scrolls, and its last action is reachable
      await page.evaluate(() => exInspect('know'));
      await expect(page.locator('.insp h3')).toHaveText('Knowledge store');
      await check('inspector', '.board');
      const insp = page.locator('.insp');
      await insp.evaluate(e => { e.scrollTop = e.scrollHeight; });
      const last = page.locator('.insp .insp-acts .btn').last();
      await expect(last).toBeInViewport({ ratio: 1 });
      await check('inspector-bottom', '.board');
      // drill into the detailed view and climb back with the breadcrumb
      await page.locator('.insp').getByRole('button', { name: /Look inside/ }).tap();
      await expect(page.locator('.board-canvas')).toHaveAttribute('data-view', 'rag');
      await page.evaluate(() => exShowView('rag'));
      await check('detailed-view', '.board');
      await page.locator('.insp').evaluate(e => { e.scrollTop = e.scrollHeight; });
      await expect(page.locator('.insp .insp-link').last()).toBeInViewport();
      await page.locator('.crumbs button').first().tap();
      await expect(page.locator('.board-canvas')).toHaveAttribute('data-view', 'root');
      // Whole system resets any selection
      await page.evaluate(() => exInspect('tools'));
      await expect(page.locator('.board-canvas .bp-n.hl')).toHaveCount(3);
      await page.locator('.lg.all').tap();
      await expect(page.locator('.board-canvas .bp-n.hl')).toHaveCount(0);
      await check('whole-system', '.board');
      // the guided tour: every step's card fits on screen and Next is tappable
      await page.getByRole('button', { name: /Trace/ }).tap();
      const tour = page.locator('.tour');
      for (let i = 0; i < 14; i++) {
        await expect(tour).toBeInViewport({ ratio: 1 });
        if (i === 0 || i === 6 || i === 13) await check('tour-' + (i + 1), '.board');
        const btn = tour.getByRole('button', { name: i === 13 ? 'Done' : 'Next' });
        await btn.tap();
      }
      await expect(tour).toHaveCount(0);
      await check('after-tour', '.board');
      expect(problems, problems.join('\n')).toEqual([]);
    });
  });
}
