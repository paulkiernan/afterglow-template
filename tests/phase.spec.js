import {
  colorDistance,
  expect,
  formatColor,
  luminance,
  scrollWindow,
  selectChip,
  sliderTo,
  startFrameSampling,
  test,
  viewportMean,
  waitForDrawIdle,
  waitForFieldLive,
  waitForFrameSample,
  waitForScrollSettle,
} from './helpers/field.js';

// Scroll drives the ember day arc: the same patch of sky must read as bright
// morning at the top of the page and dark dusk at the bottom, and it must come
// back. The twilight program is a different show — it drops the day field, so
// its pixels must not care where the page is scrolled.

async function sampleAfterScroll(page, where) {
  await startFrameSampling(page);
  await scrollWindow(page, where);
  await waitForDrawIdle(page);
  return waitForFrameSample(page);
}

test('the ember field follows the scroll while the twilight dome ignores it', async ({ page }) => {
  await page.goto('/');
  await waitForFieldLive(page);

  // Freeze time and grain: the only thing left that can move a pixel is phase.
  await sliderTo(page, '#studio-motion', 'Home');
  await sliderTo(page, '#studio-grain', 'Home');

  const emberDusk = await sampleAfterScroll(page, 'bottom');
  const emberMorning = await sampleAfterScroll(page, 'top');
  const emberDuskAgain = await sampleAfterScroll(page, 'bottom');
  const emberMorningAgain = await sampleAfterScroll(page, 'top');

  expect(
    luminance(emberMorning),
    `ember morning should be bright, got ${formatColor(emberMorning)}`,
  ).toBeGreaterThan(180);
  expect(
    luminance(emberDusk),
    `ember dusk should be dark, got ${formatColor(emberDusk)}`,
  ).toBeLessThan(120);
  expect(colorDistance(emberMorning, emberDusk), 'ember morning vs dusk').toBeGreaterThan(40);
  expect(colorDistance(emberMorning, emberMorningAgain), 'ember morning returns').toBeLessThan(6);
  expect(colorDistance(emberDusk, emberDuskAgain), 'ember dusk returns').toBeLessThan(6);

  await selectChip(page, 'Twilight');

  const twilightDusk = await sampleAfterScroll(page, 'bottom');
  const twilightMorning = await sampleAfterScroll(page, 'top');

  expect(
    colorDistance(twilightMorning, twilightDusk),
    'the twilight dome should not move with the scroll',
  ).toBeLessThan(6);
  expect(
    colorDistance(twilightMorning, emberMorning),
    'the twilight program should be a different field from ember',
  ).toBeGreaterThan(40);

  await expect(page.locator('canvas')).toHaveCount(1);
});

test('the preview bar holds a phase, moves focus both ways, and leaves the page where it was', async ({
  page,
}) => {
  await page.goto('/');
  await waitForFieldLive(page);

  await sliderTo(page, '#studio-motion', 'Home');
  await sliderTo(page, '#studio-grain', 'Home');

  const bar = page.getByRole('region', { name: 'Shader preview controls' });
  const toggle = page.getByRole('button', { name: 'Shader only' });
  const exit = page.getByRole('button', { name: 'Leave preview' });
  const hero = page.getByRole('heading', { level: 1 });

  await toggle.click();
  await expect(bar).toBeVisible();
  await expect(exit).toBeFocused();
  await expect(hero).toBeHidden();
  expect(await page.evaluate(() => getComputedStyle(document.body).overflow)).toBe('hidden');
  const reading = await waitForScrollSettle(page);

  // In preview the page is out of sight, so a screenshot of the top of the
  // viewport is the shader and nothing else: real composited pixels.
  const phase = bar.getByLabel('Day arc position');
  await expect(phase).toBeEnabled();
  await phase.focus();
  await page.keyboard.press('Home');
  await waitForDrawIdle(page);
  const morning = await viewportMean(page);
  await page.keyboard.press('End');
  await waitForDrawIdle(page);
  const dusk = await viewportMean(page);

  expect(
    luminance(morning),
    `the held morning should be bright, got ${formatColor(morning)}`,
  ).toBeGreaterThan(luminance(dusk) + 40);
  expect(colorDistance(morning, dusk), 'held morning vs held dusk').toBeGreaterThan(40);

  // Twilight is a separate show: its phase control is inert.
  await selectChip(page, 'Twilight', bar);
  await expect(phase).toBeDisabled();
  await selectChip(page, 'Ember', bar);
  await expect(phase).toBeEnabled();

  await exit.click();
  await expect(bar).toHaveCount(0);
  await expect(toggle).toBeFocused();
  await expect(hero).toBeVisible();
  await expect(page.locator('canvas')).toHaveCount(1);
  await expect
    .poll(() => page.evaluate(() => getComputedStyle(document.body).overflow))
    .not.toBe('hidden');

  const after = await waitForScrollSettle(page);
  expect(
    Math.abs(after - reading),
    `entering and leaving preview should not move the page (${reading} -> ${after})`,
  ).toBeLessThanOrEqual(2);
});
