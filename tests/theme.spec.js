import {
  colorDistance,
  expect,
  selectChip,
  sliderTo,
  startFrameSampling,
  test,
  waitForDrawIdle,
  waitForFieldLive,
  waitForFrameSample,
} from './helpers/field.js';

// One held morning, with motion and grain at zero: every frame below is a still
// life that differs only because of the change under test, and the colour is
// read straight out of the framebuffer.
async function frameAfter(page, action) {
  await startFrameSampling(page);
  await action();
  await waitForDrawIdle(page);
  return waitForFrameSample(page);
}

test('theme changes repaint the field, the page and the chrome tint on one live canvas', async ({
  page,
}) => {
  await page.goto('/');
  await waitForFieldLive(page);

  await sliderTo(page, '#studio-motion', 'Home');
  await sliderTo(page, '#studio-grain', 'Home');
  await sliderTo(page, '#studio-phase', 'Home');
  await waitForDrawIdle(page);

  const typography = () =>
    page.evaluate(() => ({
      wordmark: getComputedStyle(document.querySelector('h1')).fontFamily,
      body: getComputedStyle(document.querySelector('.hero-intro')).fontFamily,
      label: getComputedStyle(document.querySelector('.label')).fontFamily,
    }));

  const expressive = await typography();

  await page.evaluate(() => {
    window.__afterglowCanvas = document.querySelector('canvas');
  });

  // Three palettes, each selection a real change away from the running one.
  const moonrise = await frameAfter(page, () => selectChip(page, 'Moonrise'));
  const moss = await frameAfter(page, () => selectChip(page, 'Moss'));
  const goldenHour = await frameAfter(page, () => selectChip(page, 'Golden Hour'));

  expect(colorDistance(goldenHour, moonrise), 'Golden Hour vs Moonrise').toBeGreaterThan(20);
  expect(colorDistance(goldenHour, moss), 'Golden Hour vs Moss').toBeGreaterThan(20);
  expect(colorDistance(moonrise, moss), 'Moonrise vs Moss').toBeGreaterThan(20);

  // Held phase, stopped clock: the browser-chrome tint must follow the palette
  // on its own, not only while the day is scrolling past.
  const meta = page.locator('meta[name="theme-color"]');
  const tint = await meta.getAttribute('content');
  expect(await page.evaluate((color) => CSS.supports('color', color), tint)).toBe(true);
  await selectChip(page, 'Moss');
  await expect.poll(() => meta.getAttribute('content'), { timeout: 8_000 }).not.toBe(tint);

  await selectChip(page, 'Editorial');
  const editorial = await typography();
  expect(editorial.wordmark).not.toBe(expressive.wordmark);
  expect(editorial.body).not.toBe(expressive.body);
  expect(editorial.label).not.toBe(expressive.label);

  const identity = await page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    const gl = canvas && (canvas.getContext('webgl2') || canvas.getContext('webgl'));
    return {
      same: canvas === window.__afterglowCanvas,
      count: document.querySelectorAll('canvas').length,
      lost: gl ? gl.isContextLost() : null,
    };
  });
  expect(identity).toEqual({ same: true, count: 1, lost: false });
});
