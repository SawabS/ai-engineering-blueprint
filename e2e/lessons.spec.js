// Every lesson is completed end to end through the UI: beats, interactives, quizzes, tasks, completion.
const { test, expect, openApp, revealBeats } = require('./fixtures');

const LESSON_IDS = ['two-boxes', 'next-token', 'tokens', 'attention', 'training', 'gpus', 'kv-cache', 'serving', 'context', 'steering',
  'knowledge', 'retrieval', 'advanced-rag', 'tools', 'mcp', 'agent-loop', 'context-eng', 'multi-agent', 'production'];

// Correct placements for the "where should knowledge live" task, in row order.
const SORT_ANSWERS = ['Retrieval', 'Prompt', 'Prompt', 'Weights', 'Retrieval', 'Weights'];

/** Uses the interactive the way a learner would until it unlocks Continue. */
async function satisfyGate(page) {
  const w = page.locator('.widget').last();
  const type = await page.evaluate(() => L.lesson.steps[L.si].widget && L.lesson.steps[L.si].widget.type);
  const ready = () => page.evaluate(() => L.ready);
  const clickUntilReady = async name => { for (let i = 0; i < 14 && !(await ready()); i++) await w.getByRole('button', { name }).click(); };
  if (type === 'twoBoxes') {
    await w.locator('.bp-n[data-id="house"]').click();
    await w.locator('.bp-n[data-id="garden"]').click();
  } else if (type === 'autoregress') await clickUntilReady('Run one forward pass');
  else if (type === 'nextWordGame') {
    for (let r = 0; r < 3; r++) { await w.locator('.w-row button').first().click(); await w.getByRole('button', { name: /Next round|Finish/ }).click(); }
  } else if (type === 'flow') await clickUntilReady('Next');
  else if (type === 'statelessChat') await clickUntilReady('Send next message');
  else if (type === 'constrained') await clickUntilReady('Next token');
  else if (type === 'toolCall') await clickUntilReady('Next step');
  else if (type === 'agentLoop') await clickUntilReady('Step');
  else if (type === 'posTagger') await w.getByRole('button', { name: 'Tagger system prompt' }).click();
  else if (type === 'rerank') await w.getByRole('button', { name: 'Run the reranker' }).click();
  expect(await ready(), `gate for ${type} unlocked`).toBe(true);
}

for (const [i, id] of LESSON_IDS.entries()) {
  test(`lesson ${i + 1} (${id}) can be completed through the UI`, async ({ page }) => {
    await openApp(page);
    await page.getByRole('button', { name: new RegExp(`^Lesson ${i + 1}:`) }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Start lesson' }).click();
    const foot = page.locator('#p-foot');
    for (let guard = 0; guard < 12; guard++) {
      if (await page.locator('.done-screen').count()) break;
      await revealBeats(page);
      const st = await page.evaluate(() => { const s = L.lesson.steps[L.si]; return { kind: s.kind, gate: !!s.gate, answer: s.answer }; });
      // nothing in the lesson may overflow sideways
      const over = await page.evaluate(() => { const m = document.querySelector('.p-main'); return m.scrollWidth - m.clientWidth; });
      expect(over, 'lesson content overflow').toBeLessThanOrEqual(1);
      if (st.kind === 'quiz') {
        await page.locator('.opt').nth(st.answer).click();
        await foot.getByRole('button', { name: 'Check' }).click();
        await expect(foot.getByRole('heading')).toHaveText('Correct!');
        await foot.getByRole('button', { name: 'Continue' }).click();
      } else if (st.kind === 'task') {
        const rows = page.locator('.sort-item');
        for (let r = 0; r < SORT_ANSWERS.length; r++) await rows.nth(r).getByRole('button', { name: SORT_ANSWERS[r] }).click();
        await foot.getByRole('button', { name: 'Check' }).click();
        await expect(foot.getByRole('heading')).toHaveText('Nicely done');
        await foot.getByRole('button', { name: 'Continue' }).click();
      } else {
        if (st.gate) {
          await expect(foot.getByRole('button', { name: /Continue|Finish lesson/ })).toBeDisabled();
          await satisfyGate(page);
        }
        await foot.getByRole('button', { name: /^(Continue|Finish lesson)$/ }).click();
      }
    }
    await expect(page.locator('.done-screen')).toContainText(`Lesson ${i + 1} complete`);
    await page.getByRole('button', { name: 'Course map' }).click();
    await expect(page.getByRole('button', { name: new RegExp(`^Lesson ${i + 1}:.*complete`) })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('button', { name: new RegExp(`^Lesson ${i + 1}:.*complete`) })).toBeVisible();
    await expect(page.locator('.streak-card')).toContainText('1-day streak');
  });
}

test('a wrong answer shows the neutral sheet, retry and reveal both work', async ({ page }) => {
  await openApp(page, { hash: 'two-boxes' });
  const foot = page.locator('#p-foot');
  await foot.getByRole('button', { name: 'Continue' }).click(); // reveal / advance as needed
  await page.evaluate(() => { L.si = 1; renderStep(true); });
  await page.locator('.opt').nth(0).click();
  await foot.getByRole('button', { name: 'Check' }).click();
  await expect(foot).toHaveClass(/bad/);
  await expect(foot.getByRole('heading')).toHaveText('Not quite');
  await expect(page.locator('.opt').nth(0)).toHaveClass(/wrong/);
  await foot.getByRole('button', { name: 'Try again' }).click();
  await expect(page.locator('.opt.wrong')).toHaveCount(0);
  await page.locator('.opt').nth(2).click();
  await foot.getByRole('button', { name: 'Check' }).click();
  await foot.getByRole('button', { name: 'Show answer' }).click();
  await expect(page.locator('.opt').nth(1)).toHaveClass(/right/);
  await expect(foot).toHaveClass(/good/);
});

test('lesson steps reveal paragraph by paragraph and Back shows the whole step', async ({ page }) => {
  await openApp(page, { hash: 'next-token' });
  const beats = page.locator('.step .beat');
  await expect(beats.nth(0)).toBeVisible();
  await expect(beats.nth(1)).toBeHidden();
  const n = await beats.count();
  expect(n).toBeGreaterThan(1);
  for (let k = 1; k < n; k++) {
    await page.locator('#p-foot').getByRole('button', { name: 'Continue' }).click();
    await expect(beats.nth(k)).toBeVisible();
  }
  await page.locator('#p-foot').getByRole('button', { name: 'Continue' }).click(); // to step 2 (quiz)
  await page.locator('#p-foot').getByRole('button', { name: 'Back' }).click();
  await expect(page.locator('.step .beat:visible')).toHaveCount(n);
});

test('the keyboard alone can work through a lesson', async ({ page, isMobile }) => {
  test.skip(isMobile, 'keyboard flow is a desktop concern');
  await openApp(page, { hash: 'two-boxes' });
  await page.keyboard.press('Enter'); // reveal the next paragraph
  await expect(page.locator('.step .beat').nth(1)).toBeVisible();
  await page.evaluate(() => { L.si = 1; renderStep(true); });
  await page.keyboard.press('2');
  await expect(page.locator('.opt').nth(1)).toHaveClass(/sel/);
  await page.keyboard.press('Enter');
  await expect(page.locator('#p-foot')).toHaveClass(/good/);
  await page.keyboard.press('Escape');
  await expect(page.locator('.player')).toHaveCount(0);
});
