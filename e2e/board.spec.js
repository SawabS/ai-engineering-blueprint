// The system map (board): opening, docking, panel resize/hide, pan and zoom, legend, build view, tour.
const { test, expect, openApp, showPanel, expectNoHorizontalScroll } = require('./fixtures');

/** Opens the map from the course page, checks it starts on the whole, full system, then opens the panel. */
async function openBoard(page) {
  await page.getByRole('button', { name: 'Open the system map' }).first().click();
  await expect(page.getByRole('dialog', { name: 'System map' })).toBeVisible();
  await expectWholeSystem(page);
  await showPanel(page);
  await expect(page.locator('.panel .idx')).toBeVisible();
}
/** The default view: Full system and Whole system on, nothing highlighted, nothing dimmed or sketched. */
async function expectWholeSystem(page) {
  await expect(page.getByRole('button', { name: 'Full system' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.lg.all')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.board-canvas .bp-n.hl, .board-canvas .bp-n.dim, .board-canvas .bp-n.sketch')).toHaveCount(0);
}

test.describe('system map', () => {
  test('opens with the lesson index grouped by level, and nothing numbered on the map', async ({ page }) => {
    await openApp(page);
    await openBoard(page);
    await expect(page.locator('.board-canvas button')).toHaveCount(0); // no markers or pins over the diagram
    await expect(page.locator('.idx-level')).toHaveCount(8);
    await expect(page.locator('.idx-level').first()).toHaveAccessibleName('Level 1: One request. Show it on the map');
    await expect(page.locator('.lg.all')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.idx-row')).toHaveCount(19);
    await expectNoHorizontalScroll(page);
  });

  test('the map opens on the whole, full system: from the course, from inside a lesson, and after a reload', async ({ page, isMobile }) => {
    await openApp(page, { done: ['two-boxes', 'next-token', 'tokens'], hash: 'tools' }); // progress, and a lesson open
    await page.getByRole('button', { name: 'Open the system map' }).first().click();
    await expect(page.locator('.board')).toBeVisible();
    await expectWholeSystem(page); // the open lesson does not select its blocks
    await expect(page.locator('.panel .player.docked')).toHaveCount(1); // it waits in the panel
    await expect(page.locator('.panel')).toHaveClass(isMobile ? /hidden/ : /^(?!.*hidden)/);
    await page.reload();
    await expect(page.locator('.board')).toBeVisible();
    await expectWholeSystem(page);
    await expect(page.locator('.panel')).toHaveClass(isMobile ? /hidden/ : /^(?!.*hidden)/);
  });

  test('phone: the sheet stays closed while you select, until you tap its tab', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'bottom sheet is phone only');
    await openApp(page, { hash: 'tools' });
    await page.getByRole('button', { name: 'Open the system map' }).first().tap();
    const tab = page.locator('.panel-tab');
    await expect(tab).toBeInViewport(); await expect(tab).toHaveText('Lesson panel');
    await page.locator('.board-canvas .bp-n[data-id="kv"]').tap();
    await expect(page.locator('.board-canvas .bp-n.hl[data-id="kv"]')).toHaveCount(1); // the selection shows on the map
    await expect(page.locator('.panel')).toHaveClass(/hidden/); // and the sheet stays closed
    await expect(tab).toHaveText('Details');
    await page.locator('.lg', { hasText: 'Knowledge' }).tap();
    await expect(page.locator('.panel')).toHaveClass(/hidden/);
    await tab.tap();
    await expect(page.locator('.panel')).not.toHaveClass(/hidden/);
    await expect(page.locator('.insp h3')).toHaveText('KV cache'); // the details of what was selected
    await page.locator('.insp').getByRole('button', { name: 'Back to my lesson' }).tap();
    await expect(page.locator('.panel-head .ttl')).toHaveText('9. Tool calling');
  });

  test('pointing at a level or lesson in the index shows where it sits on the map', async ({ page, isMobile }) => {
    test.skip(isMobile, 'hover is a mouse interaction');
    await openApp(page);
    await openBoard(page);
    await page.locator('.idx-level[data-u="2"]').hover();
    await expect(page.locator('.board-canvas .bp-n.hl')).toHaveCount(3);
    await page.locator('.idx-row', { hasText: 'Tool calling' }).hover();
    await expect(page.locator('.board-canvas .bp-n.hl')).toHaveCount(3);
    await expect(page.locator('.board-canvas .bp-n.hl[data-id="s-toolres"]')).toHaveCount(1);
    await page.locator('.panel-head').hover();
    await expect(page.locator('.board-canvas .bp-n.hl')).toHaveCount(0);
  });

  test('Whole system and an empty-canvas click return from any selection to the whole diagram', async ({ page }) => {
    await openApp(page);
    await openBoard(page);
    await page.locator('.board-canvas .bp-n[data-id="tools"]').focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('.board-canvas .bp-n.hl')).toHaveCount(3);
    await expect(page.locator('.lg.all')).toHaveAttribute('aria-pressed', 'false');
    await page.locator('.lg.all').click();
    await expect(page.locator('.board-canvas .bp-n.hl')).toHaveCount(0);
    await expect(page.locator('.board-canvas .bp-n.dim')).toHaveCount(0);
    await expect(page.locator('.lg.all')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.panel-head .ttl')).toHaveText('Lessons');
    // a category, then a click on empty canvas
    await page.locator('.lg', { hasText: 'Knowledge' }).click();
    await expect(page.locator('.board-canvas .bp-n.hl')).toHaveCount(3);
    await page.waitForFunction(() => !BOARD.anim);
    const empty = await page.evaluate(() => { // a point on the canvas that has no block, toolbar or legend under it
      const c = document.querySelector('.board-canvas').getBoundingClientRect();
      for (let y = c.top + 70; y < c.bottom - 70; y += 9) for (let x = c.left + 10; x < c.right - 10; x += 9) {
        const el = document.elementFromPoint(x, y); if (el && el.closest('.board-canvas') && !el.closest('.bp-n,.board-tools,.legend,.panel')) return [x, y];
      } return null;
    });
    expect(empty).not.toBeNull();
    await page.mouse.click(empty[0], empty[1]);
    await expect(page.locator('.board-canvas .bp-n.hl')).toHaveCount(0);
    await expect(page.locator('.lg.all')).toHaveAttribute('aria-pressed', 'true');
  });

  test('a level heading selects everything its level adds and lists its lessons with their needs', async ({ page }) => {
    await openApp(page);
    await openBoard(page);
    await page.locator('.idx-level[data-u="2"]').click();
    await expect(page.locator('.panel-head .ttl')).toHaveText('Level 3');
    await expect(page.locator('.lvl-card h3')).toHaveText('Your own knowledge');
    await expect(page.locator('.board-canvas .bp-n.hl')).toHaveCount(3); // knowledge store, retrieved chunks, advanced retrieval
    const rows = page.locator('.lvl-card .idx-row');
    await expect(rows).toHaveCount(3);
    await expect(rows.nth(1)).toContainText('Find the few passages');
    await rows.nth(1).hover();
    await expect(page.locator('.board-canvas .bp-n.hl')).toHaveCount(1); // just what that lesson adds
    await rows.nth(1).click();
    await expect(page.locator('.panel-head .ttl')).toHaveText('7. Retrieval, hands on');
  });

  test('selecting a block selects everything its lesson added, together', async ({ page }) => {
    await openApp(page);
    await openBoard(page);
    await page.locator('.board-canvas .bp-n[data-id="tools"]').focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('.board-canvas .bp-n.hl')).toHaveCount(3);
    for (const id of ['tools', 's-tooldef', 's-toolres']) await expect(page.locator(`.board-canvas .bp-n.hl[data-id="${id}"]`)).toHaveCount(1);
    await expect(page.locator('.insp-need')).toContainText('Added in lesson 9');
    await page.locator('.insp-need').getByRole('button', { name: /Tool results/ }).click();
    await expect(page.locator('.insp h3')).toHaveText('Tool results');
    await expect(page.locator('.board-canvas .bp-n.hl')).toHaveCount(3);
  });

  test('a lesson opened from the index docks in the panel and focuses its blocks', async ({ page }) => {
    await openApp(page);
    await openBoard(page);
    await page.locator('.idx-row', { hasText: 'Retrieval, hands on' }).click();
    await expect(page.locator('.panel .player.docked .step h2')).toHaveText('Cutting documents into chunks');
    await expect(page.locator('.panel-head .ttl')).toHaveText('7. Retrieval, hands on');
    await expect(page.locator('.board-canvas .bp-n.hl')).toHaveCount(2);
  });

  test('clicking a block inspects it, and the inspector opens its lesson', async ({ page }) => {
    await openApp(page);
    await openBoard(page);
    await page.locator('.board-canvas .bp-n[data-id="kv"]').click();
    await expect(page.locator('.panel-head .ttl')).toHaveText('Explorer');
    await expect(page.locator('.insp h3')).toHaveText('KV cache');
    await page.locator('.insp').getByRole('button', { name: 'Lesson 17: The KV cache' }).click();
    await expect(page.locator('.panel-head .ttl')).toHaveText('17. The KV cache');
  });

  test('the panel hides completely and comes back', async ({ page }) => {
    await openApp(page);
    await openBoard(page);
    await page.getByRole('button', { name: 'Hide the panel' }).click();
    await expect(page.locator('.panel')).toHaveClass(/hidden/);
    await page.locator('.panel-tab').click();
    await expect(page.locator('.panel')).not.toHaveClass(/hidden/);
  });

  test('desktop: dragging the grip resizes the panel and it is remembered', async ({ page, isMobile }) => {
    test.skip(isMobile, 'side panel resize is desktop only');
    await openApp(page);
    await openBoard(page);
    const grip = page.locator('.panel-grip'); const box = await grip.boundingBox();
    const before = await page.locator('.panel').evaluate(e => e.offsetWidth);
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down(); await page.mouse.move(box.x - 160, box.y + box.height / 2, { steps: 6 }); await page.mouse.up();
    const after = await page.locator('.panel').evaluate(e => e.offsetWidth);
    expect(after).toBeGreaterThan(before + 120);
    await page.getByRole('button', { name: 'Back to course' }).click();
    await openBoard(page);
    expect(await page.locator('.panel').evaluate(e => e.offsetWidth)).toBe(after);
  });

  test('mobile: the sheet snaps open and drags down to hide', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'bottom sheet is phone only');
    await openApp(page);
    await openBoard(page);
    const grip = page.locator('.panel-grip');
    await grip.click(); // tap toggles between half and full
    await expect.poll(() => page.evaluate(() => BOARD.sh)).toBe(92);
    // wait for the sheet's height transition to finish before grabbing the grip
    await expect.poll(async () => { const a = (await grip.boundingBox()).y; await page.waitForTimeout(120); return Math.abs(a - (await grip.boundingBox()).y); }).toBeLessThan(1);
    const box = await grip.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + 8);
    await page.mouse.down(); await page.mouse.move(box.x + box.width / 2, 840, { steps: 8 }); await page.mouse.up();
    await expect(page.locator('.panel')).toHaveClass(/hidden/);
    await expect(page.locator('.panel-tab')).toBeVisible();
  });

  test('zoom buttons, wheel and drag move the camera', async ({ page, isMobile }) => {
    await openApp(page);
    await openBoard(page);
    const s0 = await page.evaluate(() => BOARD.s);
    await page.getByRole('button', { name: 'Zoom in' }).click();
    expect(await page.evaluate(() => BOARD.s)).toBeLessThan(s0);
    await page.getByRole('button', { name: 'Zoom out' }).click();
    if (!isMobile) {
      await page.mouse.move(300, 400); await page.mouse.wheel(0, -300);
      expect(await page.evaluate(() => BOARD.s)).toBeLessThan(s0);
      const x0 = await page.evaluate(() => BOARD.x);
      await page.mouse.down(); await page.mouse.move(420, 460, { steps: 5 }); await page.mouse.up();
      expect(await page.evaluate(() => BOARD.x)).not.toBe(x0);
      // a drag must not open a lesson
      await expect(page.locator('.panel .player')).toHaveCount(0);
    }
  });

  test('legend chips highlight a part of the system and toggle off', async ({ page }) => {
    await openApp(page);
    await openBoard(page);
    const chip = page.getByRole('button', { name: 'Knowledge', exact: true });
    await chip.click();
    await expect(chip).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.board-canvas .bp-n.hl')).toHaveCount(3);
    await chip.click();
    await expect(chip).toHaveAttribute('aria-pressed', 'false');
    await expect(page.locator('.board-canvas .bp-n.hl')).toHaveCount(0);
  });

  test('"My system" sketches unfinished blocks, "Full system" shows all', async ({ page }) => {
    await openApp(page, { done: ['two-boxes', 'next-token'] });
    await openBoard(page);
    await page.getByRole('button', { name: 'My system' }).click();
    await expect(page.locator('.board-canvas .bp-n[data-id="head"]')).not.toHaveClass(/sketch/);
    await expect(page.locator('.board-canvas .bp-n[data-id="kv"]')).toHaveClass(/sketch/);
    await page.getByRole('button', { name: 'Full system' }).click();
    await expect(page.locator('.board-canvas .bp-n.sketch')).toHaveCount(0);
  });

  test('the guided tour follows one request through all 14 steps and restores the panel', async ({ page }) => {
    await openApp(page);
    await openBoard(page);
    await page.getByRole('button', { name: /Trace/ }).click();
    const tour = page.getByRole('dialog', { name: 'Trace a request' });
    await expect(tour).toContainText('Step 1 of 14');
    for (let k = 2; k <= 14; k++) { await tour.getByRole('button', { name: 'Next' }).click(); await expect(tour).toContainText(`Step ${k} of 14`); }
    await tour.getByRole('button', { name: 'Back' }).click();
    await expect(tour).toContainText('Step 13 of 14');
    await tour.getByRole('button', { name: 'Next' }).click();
    await tour.getByRole('button', { name: 'Done' }).click();
    await expect(tour).toHaveCount(0);
    await expect(page.locator('.packet')).toHaveCount(0);
    await expect(page.locator('.panel')).not.toHaveClass(/hidden/);
  });

  test('a lesson moves between full screen and the panel without losing its place', async ({ page }) => {
    await openApp(page, { hash: 'tokens' });
    await page.locator('#p-foot').getByRole('button', { name: 'Continue' }).click();
    const si = await page.evaluate(() => [L.si, L.beat]);
    await page.getByRole('button', { name: /Open the system map/ }).first().click();
    await showPanel(page);
    await expect(page.locator('.panel .player.docked')).toBeVisible();
    expect(await page.evaluate(() => [L.si, L.beat])).toEqual(si);
    await page.getByRole('button', { name: 'Open the lesson full screen' }).click();
    await expect(page.locator('.board')).toHaveCount(0);
    await expect(page.locator('body > .player:not(.docked)')).toBeVisible();
    expect(await page.evaluate(() => [L.si, L.beat])).toEqual(si);
  });

  test('Escape leaves the board; Course returns home', async ({ page }) => {
    await openApp(page);
    await openBoard(page);
    await page.keyboard.press('Escape');
    await expect(page.locator('.board')).toHaveCount(0);
    await openBoard(page);
    await page.getByRole('button', { name: 'Back to course' }).click();
    await expect(page.locator('.board')).toHaveCount(0);
    await expect(page.locator('body')).not.toHaveCSS('overflow', 'hidden');
  });
});
