import {
  drawCount,
  expect,
  sliderTo,
  test,
  waitForDrawIdle,
  waitForFieldLive,
} from './helpers/field.js';

// "Not drawing" is the observable: the field is a scroll- and pointer-driven
// picture with exactly one self-driving motion, so when the visitor prefers
// reduced motion, or the motion control says 0, it must stop asking the browser
// for frames — and start again the moment either clears.
test('the field settles when motion stops or the visitor prefers reduced motion, and resumes', async ({
  page,
}) => {
  // Boot under prefers-reduced-motion: reduce: not a single animated frame.
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await waitForFieldLive(page);
  await waitForDrawIdle(page);
  const bootStill = await drawCount(page);
  await page.waitForTimeout(600);
  expect(await drawCount(page), 'reduced motion must leave the field settled').toBe(bootStill);

  // Clearing the preference starts the clock again.
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect.poll(() => drawCount(page), { timeout: 5_000 }).toBeGreaterThan(bootStill + 5);

  // Motion 0 freezes the clock; motion above 0 restarts it.
  await sliderTo(page, '#studio-motion', 'Home');
  await waitForDrawIdle(page);
  const paused = await drawCount(page);
  await page.waitForTimeout(600);
  expect(await drawCount(page), 'motion 0 must leave the field settled').toBe(paused);

  await sliderTo(page, '#studio-motion', 'End');
  await expect.poll(() => drawCount(page), { timeout: 5_000 }).toBeGreaterThan(paused + 5);

  // Asking for reduced motion again stops the running field.
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await waitForDrawIdle(page);
  const held = await drawCount(page);
  await page.waitForTimeout(600);
  expect(await drawCount(page), 'reduced motion must settle the running field again').toBe(held);
});
