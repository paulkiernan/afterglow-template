// The shared test base, the field-driving helpers, and the pixel evidence this
// suite runs on. One module on purpose: every spec imports `test` and `expect`
// from here, so the probe and the console guard are always installed before the
// app boots.
//
// Evidence comes from two independent instruments, both read-only:
//
//  1. A page-side probe, installed before any app script. It counts real WebGL
//     draw calls and, when a test arms it, keeps the mean colour of one small
//     off-centre patch read straight out of the framebuffer after a draw. That
//     is proof a change reached the GPU, with no app state in the way, and it
//     is how the suite proves a "still" field stopped drawing.
//  2. Screenshot decoding with pngjs, which sees what the browser composited
//     once the canvas, the CSS underlay and the page have all had their say.

import { test as base, expect } from '@playwright/test';
import { PNG } from 'pngjs';

/* ------------------------------------------------------------------ probe */

/**
 * Passed to `page.addInitScript()`, so this function is serialized into the
 * page: keep it self-contained and closure-free.
 */
export function installFieldProbe() {
  if (window.__afterglowProbe) return;
  const probe = {
    draws: 0,
    hooked: false,
    enabled: false,
    sampleLimit: 0,
    captured: 0,
    sample: null,
  };
  window.__afterglowProbe = probe;

  const PATCH = 4;
  const pixels = new Uint8Array(PATCH * PATCH * 4);

  const readPatch = (gl) => {
    const width = gl.drawingBufferWidth;
    const height = gl.drawingBufferHeight;
    if (!width || !height) return null;
    // Off-centre on both axes: the sun holds the middle, so a patch at 82%/78%
    // reads sky instead of a disc. Same patch every frame, so two samples are
    // comparable.
    const x = Math.max(0, Math.min(width - PATCH, Math.round(width * 0.82)));
    const y = Math.max(0, Math.min(height - PATCH, Math.round(height * 0.78)));
    gl.readPixels(x, y, PATCH, PATCH, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    let r = 0;
    let g = 0;
    let b = 0;
    const total = PATCH * PATCH;
    for (let i = 0; i < total; i += 1) {
      r += pixels[i * 4];
      g += pixels[i * 4 + 1];
      b += pixels[i * 4 + 2];
    }
    return { r: r / total, g: g / total, b: b / total };
  };

  const capture = (gl) => {
    probe.draws += 1;
    if (!probe.enabled) return;
    if (probe.captured >= probe.sampleLimit) {
      probe.enabled = false;
      return;
    }
    let patch = null;
    try {
      patch = readPatch(gl);
    } catch {
      probe.enabled = false;
    }
    if (!patch) return;
    probe.captured += 1;
    probe.sample = patch;
  };

  const drawCalls = [
    'drawArrays',
    'drawElements',
    'drawArraysInstanced',
    'drawElementsInstanced',
    'drawRangeElements',
  ];
  const prototypes = [];
  // WebGL2RenderingContext inherits most of these from WebGLRenderingContext,
  // so the wrapped flag keeps one draw from being counted twice.
  if (typeof WebGLRenderingContext !== 'undefined') prototypes.push(WebGLRenderingContext.prototype);
  if (typeof WebGL2RenderingContext !== 'undefined') prototypes.push(WebGL2RenderingContext.prototype);

  for (const prototype of prototypes) {
    for (const name of drawCalls) {
      const original = prototype[name];
      if (typeof original !== 'function' || original.__afterglowWrapped) continue;
      const wrapped = function (...args) {
        const result = original.apply(this, args);
        capture(this);
        return result;
      };
      wrapped.__afterglowWrapped = true;
      prototype[name] = wrapped;
      probe.hooked = true;
    }
  }
}

/* ---------------------------------------------------------------- fixture */

// Deliberately narrow: only failures that mean the field is broken. Three logs
// "Error creating WebGL context" when a test blocks WebGL on purpose, and the
// browser logs context-loss notices; neither is a failure of the field.
const FAILURE_TEXT = [
  /THREE\.WebGLProgram/i,
  /shader/i,
  /GLSL/i,
  /compil/i,
  /did not link/i,
  /VALIDATE_STATUS/i,
];

export const test = base.extend({
  consoleGuard: [
    async ({ page }, use) => {
      const problems = [];
      page.on('pageerror', (error) => problems.push(`pageerror: ${error.message}`));
      page.on('console', (message) => {
        const type = message.type();
        if (type !== 'error' && type !== 'warning') return;
        const text = message.text();
        if (FAILURE_TEXT.some((pattern) => pattern.test(text))) {
          problems.push(`console.${type}: ${text}`);
        }
      });
      await page.addInitScript(installFieldProbe);
      await use(problems);
      expect(problems, problems.join('\n') || 'shader or console failures').toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };

/* ---------------------------------------------------------- field helpers */

export function fieldCanvas(page) {
  return page.locator('canvas');
}

/**
 * Waits until the light field is mounted, faded in, and drawing. The draw
 * assertion is also what proves the probe is intercepting the real WebGL
 * calls: a silently broken hook fails here instead of passing later checks
 * vacuously.
 */
export async function waitForFieldLive(page, { timeout = 20_000 } = {}) {
  const canvas = fieldCanvas(page);
  await expect(canvas).toHaveCount(1, { timeout });
  await expect
    .poll(
      () =>
        page.evaluate(() => {
          const el = document.querySelector('canvas');
          return el ? getComputedStyle(el).opacity : null;
        }),
      { timeout },
    )
    .toBe('1');
  await expect.poll(() => drawCount(page), { timeout }).toBeGreaterThan(0);
  return canvas;
}

/**
 * Waits until the field stops asking for frames. Robust to a settle that takes
 * a few hundred frames (the phase and pointer lerps), bounded by `timeout`, and
 * loud when the field keeps drawing forever.
 */
export async function waitForDrawIdle(page, { quietMs = 400, timeout = 20_000 } = {}) {
  const deadline = Date.now() + timeout;
  let last = await drawCount(page);
  let quietSince = Date.now();
  while (Date.now() < deadline) {
    await page.waitForTimeout(100);
    const now = await drawCount(page);
    if (now !== last) {
      last = now;
      quietSince = Date.now();
      continue;
    }
    if (Date.now() - quietSince >= quietMs) return;
  }
  throw new Error(`the field never stopped drawing within ${timeout}ms`);
}

/**
 * Moves a slider with the keyboard. `Home`/`End` jump to the ends without a
 * pointer, which keeps the field's pointer nudge out of pixel comparisons.
 */
export async function sliderTo(page, selector, key) {
  const slider = page.locator(selector);
  await slider.focus();
  await page.keyboard.press(key);
}

/**
 * Chooses a radio chip with the keyboard: focus plus Space is a real user
 * interaction on a native radio, and it never moves the pointer. `scope`
 * narrows the search when both the studio and the preview bar are in the DOM.
 */
export async function selectChip(page, name, scope = undefined) {
  const radio = (scope ?? page).getByRole('radio', { name });
  await radio.focus();
  await page.keyboard.press('Space');
  await expect(radio).toBeChecked();
}

/** Activates a button from the keyboard so no pointer events reach the field. */
export async function activateButton(page, name) {
  const button = page.getByRole('button', { name });
  await button.focus();
  await page.keyboard.press('Enter');
}

/** Instant scroll; overrides the stylesheet's smooth behavior. */
export async function scrollWindow(page, where) {
  await page.evaluate((target) => {
    const top = target === 'bottom' ? document.documentElement.scrollHeight : 0;
    window.scrollTo({ top, left: 0, behavior: 'instant' });
  }, where);
}

/** The scroll position once it stops moving (focus scrolling can animate). */
export async function waitForScrollSettle(page) {
  let last = await page.evaluate(() => window.scrollY);
  let stableSince = Date.now();
  await expect.poll(async () => {
    const now = await page.evaluate(() => window.scrollY);
    if (Math.abs(now - last) >= 0.5) {
      last = now;
      stableSince = Date.now();
    }
    return Date.now() - stableSince;
  }, { timeout: 5_000, intervals: [50] }).toBeGreaterThanOrEqual(200);
  return last;
}

/** Horizontal overflow of the document in CSS pixels, with offenders for the failure message. */
export async function horizontalOverflow(page) {
  return page.evaluate(() => {
    const doc = document.documentElement;
    const amount = doc.scrollWidth - doc.clientWidth;
    const offenders = [];
    if (amount > 1) {
      const limit = doc.clientWidth + 1;
      for (const el of document.body.querySelectorAll('*')) {
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.right > limit) {
          offenders.push(`${el.tagName.toLowerCase()}.${el.className} right=${Math.round(rect.right)}`);
        }
      }
    }
    return { amount, report: offenders.slice(0, 6).join('\n') };
  });
}

/* ----------------------------------------------------------- frame evidence */

/** Every draw call the field has made so far. Fails loudly if the probe is gone. */
export async function drawCount(page) {
  const count = await page.evaluate(() =>
    typeof window.__afterglowProbe === 'undefined' ? null : window.__afterglowProbe.draws,
  );
  if (count === null) throw new Error('the framebuffer probe was not installed on this page');
  return count;
}

/**
 * Arms framebuffer sampling. Clears the previous sample and watches the next
 * draws; `limit` bounds the cost so a long animation cannot sample forever.
 */
export async function startFrameSampling(page, { limit = 1200 } = {}) {
  const armed = await page.evaluate((max) => {
    const probe = window.__afterglowProbe;
    if (!probe) return false;
    probe.sample = null;
    probe.captured = 0;
    probe.sampleLimit = max;
    probe.enabled = true;
    return true;
  }, limit);
  if (!armed) throw new Error('the framebuffer probe was not installed on this page');
}

/** Waits for the first frame drawn since `startFrameSampling`, then returns its patch mean. */
export async function waitForFrameSample(page, { timeout = 10_000 } = {}) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const sample = await page.evaluate(() => {
      const probe = window.__afterglowProbe;
      return probe && probe.sample ? probe.sample : null;
    });
    if (sample) return sample;
    await page.waitForTimeout(50);
  }
  throw new Error('no frame was drawn after sampling was armed');
}

/**
 * Mean colour of the top slice of the current viewport, decoded from a real
 * screenshot. Use it on a field-only surface (the shader-only preview hides the
 * page), where the slice is the composited shader and nothing else.
 */
export async function viewportMean(page, { top = 0.4 } = {}) {
  const png = PNG.sync.read(await page.screenshot());
  const rows = Math.max(1, Math.floor(png.height * top));
  let r = 0;
  let g = 0;
  let b = 0;
  let total = 0;
  for (let y = 2; y < rows; y += 4) {
    for (let x = 2; x < png.width; x += 4) {
      const i = (png.width * y + x) * 4;
      r += png.data[i];
      g += png.data[i + 1];
      b += png.data[i + 2];
      total += 1;
    }
  }
  if (!total) throw new Error('the screenshot had no pixels to sample');
  return { r: r / total, g: g / total, b: b / total };
}

export function luminance(color) {
  return 0.299 * color.r + 0.587 * color.g + 0.114 * color.b;
}

export function colorDistance(a, b) {
  return Math.hypot(a.r - b.r, a.g - b.g, a.b - b.b);
}

export function formatColor(color) {
  return `rgb(${color.r.toFixed(1)}, ${color.g.toFixed(1)}, ${color.b.toFixed(1)})`;
}
