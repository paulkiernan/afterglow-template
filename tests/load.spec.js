import { expect, test, waitForFieldLive } from './helpers/field.js';

test('the first paint stays at the top and mounts a single field canvas', async ({ page }) => {
  await page.goto('/');
  const canvas = await waitForFieldLive(page);

  await expect(page.getByRole('heading', { level: 1 })).toBeInViewport();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  await expect
    .poll(() => page.evaluate(() => (document.activeElement ? document.activeElement.tagName : null)))
    .toBe('BODY');

  // StrictMode mounts the field, tears it down and mounts it again. None of
  // that may leave a second canvas, a focus jump or a scroll jump behind.
  await page.waitForTimeout(400);
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
  await expect(canvas).toHaveCount(1);
  expect(await page.evaluate(() => document.querySelectorAll('canvas').length)).toBe(1);

  // The page is still scrollable: a leaked overflow lock would freeze it.
  await page.evaluate(() => window.scrollTo(0, 500));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
});
