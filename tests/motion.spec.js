import {
  drawCount,
  expect,
  scrollWindow,
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

/* ------------------------------------------------------------ slow frames */

// Software WebGL delivers frames far slower than 60Hz, and a per-frame lerp
// stretches every transition in wall-clock time until "settled" never arrives.
// This holds each real requestAnimationFrame callback on a ~150ms timer before
// handing it to the native scheduler — roughly 6fps — while leaving
// performance.now() and the native rAF in charge. Cancellation must take out
// whichever half is pending: the timer before it fires, or the native frame
// after, since the component cancels queued frames on teardown and context
// loss.
function installSlowFrames() {
  const nativeRaf = window.requestAnimationFrame.bind(window);
  const nativeCancel = window.cancelAnimationFrame.bind(window);
  const pending = new Map();
  let nextHandle = 0;

  window.requestAnimationFrame = (callback) => {
    nextHandle += 1;
    const handle = nextHandle;
    const entry = { timer: 0, native: 0, cancelled: false };
    pending.set(handle, entry);
    entry.timer = window.setTimeout(() => {
      entry.timer = 0;
      if (entry.cancelled) return;
      entry.native = nativeRaf((now) => {
        entry.native = 0;
        pending.delete(handle);
        if (entry.cancelled) return;
        callback(now);
      });
    }, 150);
    return handle;
  };

  window.cancelAnimationFrame = (handle) => {
    const entry = pending.get(handle);
    if (!entry) return;
    pending.delete(handle);
    entry.cancelled = true;
    if (entry.timer) window.clearTimeout(entry.timer);
    if (entry.native) nativeCancel(entry.native);
  };
}

// An input must reach the GPU (the probe counts real draw calls), the field
// must go quiet on its own within the wall-clock budget, and it must stay
// quiet once it has.
async function expectSettles(page, what, input, budget = 6_000) {
  const before = await drawCount(page);
  const startedAt = Date.now();
  await input();
  await expect
    .poll(() => drawCount(page), {
      message: `${what}: the input must draw real frames`,
      timeout: 5_000,
    })
    .toBeGreaterThan(before);
  await waitForDrawIdle(page, { timeout: Math.max(0, budget - (Date.now() - startedAt)) });
  const settled = await drawCount(page);
  await page.waitForTimeout(700);
  expect(await drawCount(page), `${what}: the field must stay still once it settles`).toBe(settled);
}

test('the field settles after scroll and pointer input on slow frames', async ({ page }) => {
  await page.addInitScript(installSlowFrames);
  await page.goto('/');
  await waitForFieldLive(page);

  // Stop the self-driving clock: from here every frame is one an input asked
  // for. Focusing the slider can scroll the panel into view, so let that
  // transition settle before measuring.
  await sliderTo(page, '#studio-motion', 'Home');
  await waitForDrawIdle(page);

  // The whole day arc: the old per-frame 0.06 lerp needs ~120 slow frames
  // (well over 20s at this cadence) to cross it, so a 6s wall-clock budget is
  // the difference between a per-frame and an elapsed-time lerp.
  await expectSettles(page, 'the scroll transition', () => scrollWindow(page, 'bottom'));

  // A real pointer move nudges the light and must settle on the same terms.
  const viewport = page.viewportSize();
  await expectSettles(page, 'the pointer nudge', () =>
    page.mouse.move(Math.round(viewport.width * 0.75), Math.round(viewport.height * 0.25)),
  );
});
