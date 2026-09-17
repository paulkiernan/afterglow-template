import {
  activateButton,
  expect,
  horizontalOverflow,
  test,
  waitForFieldLive,
} from './helpers/field.js';

// An explicit phone-sized run, not a second copy of the suite: the desktop
// tests cover behaviour, this one covers the 360px layout and the field on a
// small touch viewport.
test.use({
  viewport: { width: 360, height: 740 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
});

test('the page and its preview stay inside 360px', async ({ page }) => {
  await page.goto('/');
  await waitForFieldLive(page);

  const overflow = await horizontalOverflow(page);
  expect(overflow.amount, overflow.report || 'horizontal overflow at 360px').toBeLessThanOrEqual(1);

  const field = await page.evaluate(() => {
    const el = document.querySelector('canvas');
    const rect = el.getBoundingClientRect();
    return {
      width: rect.width,
      height: rect.height,
      viewportWidth: document.documentElement.clientWidth,
      viewportHeight: document.documentElement.clientHeight,
    };
  });
  expect(Math.round(field.width)).toBeGreaterThanOrEqual(field.viewportWidth - 1);
  expect(Math.round(field.height)).toBeGreaterThanOrEqual(field.viewportHeight - 1);

  await activateButton(page, 'Shader only');
  const bar = page.getByRole('region', { name: 'Shader preview controls' });
  await expect(bar).toBeVisible();

  const barOverflow = await horizontalOverflow(page);
  expect(barOverflow.amount, barOverflow.report || 'preview overflow at 360px').toBeLessThanOrEqual(
    1,
  );
  const barBox = await bar.boundingBox();
  expect(barBox).not.toBeNull();
  expect(barBox.x).toBeGreaterThanOrEqual(0);
  expect(barBox.x + barBox.width).toBeLessThanOrEqual(360);

  await activateButton(page, 'Leave preview');
  await expect(bar).toHaveCount(0);
});
