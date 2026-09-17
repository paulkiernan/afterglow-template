import {
  drawCount,
  expect,
  selectChip,
  test,
  waitForFieldLive,
} from './helpers/field.js';

// No WebGL at all: every canvas context request comes back null, exactly as it
// does on a machine with WebGL disabled. The page must still paint the field
// (the CSS underlay), still tint the browser chrome, and still be interactive.
test('without WebGL the CSS underlay carries the field and stays interactive', async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...rest) {
      if (type === 'webgl' || type === 'webgl2' || type === 'experimental-webgl') return null;
      return original.call(this, type, ...rest);
    };
  });

  await page.goto('/');
  await expect(page.locator('canvas')).toHaveCount(0);

  const readSketch = () =>
    page.evaluate(() => {
      const doc = document.documentElement;
      const backdrop = document.querySelector('.app > [aria-hidden="true"]');
      if (!backdrop) return null;
      for (const node of backdrop.querySelectorAll('div')) {
        const { backgroundImage, backgroundColor } = node.style;
        if (backgroundImage && backgroundImage.includes('gradient')) {
          const rect = node.getBoundingClientRect();
          return {
            image: backgroundImage,
            base: backgroundColor,
            width: rect.width,
            height: rect.height,
            viewportWidth: doc.clientWidth,
            viewportHeight: doc.clientHeight,
          };
        }
      }
      return null;
    });

  await expect.poll(readSketch, { message: 'the CSS underlay should finish loading' }).not.toBeNull();
  const before = await readSketch();
  expect(Math.round(before.width)).toBeGreaterThanOrEqual(before.viewportWidth - 1);
  expect(Math.round(before.height)).toBeGreaterThanOrEqual(before.viewportHeight - 1);

  // The underlay is the sky, so it owns the browser-chrome tint too.
  const meta = page.locator('meta[name="theme-color"]');
  const themeBefore = await meta.getAttribute('content');
  expect(await page.evaluate((color) => CSS.supports('color', color), themeBefore)).toBe(true);
  const inkBefore = await page.evaluate(() => getComputedStyle(document.querySelector('h1')).color);

  await selectChip(page, 'Moss');

  await expect.poll(async () => (await readSketch())?.base).not.toBe(before.base);
  await expect.poll(() => meta.getAttribute('content')).not.toBe(themeBefore);
  const inkAfter = await page.evaluate(() => getComputedStyle(document.querySelector('h1')).color);
  expect(inkAfter, 'a palette change should still repaint the page').not.toBe(inkBefore);
  await expect(page.locator('canvas')).toHaveCount(0);
});

// A live context that dies and comes back: the underlay takes over while the
// GPU is gone, and the same canvas returns when the browser restores it.
test('a lost WebGL context falls back to the underlay and returns', async ({ page }) => {
  await page.goto('/');
  const canvas = await waitForFieldLive(page);

  const armed = await page.evaluate(() => {
    const el = document.querySelector('canvas');
    const gl = el.getContext('webgl2') || el.getContext('webgl');
    const ext = gl && gl.getExtension('WEBGL_lose_context');
    window.__loseContext = ext;
    window.__fieldCanvas = el;
    return { context: Boolean(gl), extension: Boolean(ext) };
  });
  expect(armed.context, 'the field should own a WebGL context').toBe(true);
  expect(armed.extension, 'WEBGL_lose_context is required to simulate a loss').toBe(true);

  await page.evaluate(() => window.__loseContext.loseContext());
  await expect.poll(() => canvas.evaluate((el) => el.style.opacity), { timeout: 8_000 }).toBe('0');

  const underlay = await page.evaluate(() => {
    const backdrop = document.querySelector('.app > [aria-hidden="true"]');
    const node = backdrop && backdrop.querySelector('div');
    return node ? node.style.backgroundImage : null;
  });
  expect(underlay, 'the underlay should be painting while the context is lost').toContain(
    'gradient',
  );

  await page.evaluate(() => window.__loseContext.restoreContext());
  await expect.poll(() => canvas.evaluate((el) => el.style.opacity), { timeout: 15_000 }).toBe('1');

  const after = await page.evaluate(() => {
    const el = document.querySelector('canvas');
    const gl = el.getContext('webgl2') || el.getContext('webgl');
    return {
      same: el === window.__fieldCanvas,
      count: document.querySelectorAll('canvas').length,
      lost: gl ? gl.isContextLost() : null,
    };
  });
  expect(after.same, 'the same canvas should come back').toBe(true);
  expect(after.count).toBe(1);
  expect(after.lost, 'the restored context should be live again').toBe(false);

  const resumed = await drawCount(page);
  await expect.poll(() => drawCount(page), { timeout: 8_000 }).toBeGreaterThan(resumed + 5);
});
