import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import VERT from '../shaders/lightfield.vert.glsl?raw';
import FRAG from '../shaders/lightfield.frag.glsl?raw';

// The site's sky: a full-viewport Turrell light field, fixed behind every
// section. Scroll drives the day program (golden morning at the hero, amber
// midday, a saturated golden hour, deep ember dusk) while a single sun
// descends the whole way; time adds a slow ganzfeld breath and the pointer
// nudges the light. The `twilight` program is a different hour entirely: a
// coral dome rising from the bottom edge in an upward U on a cobalt field.
//
// The pigments are the theme palette's business, not this file's: both GLSL
// programs are read from ../shaders as raw source and every color arrives as
// a uniform. This component owns its own fixed backdrop, its own CSS underlay
// (a still of the same hour, shown before the canvas is ready, on machines
// without WebGL, and whenever a context is lost) and its own cleanup.

// Palette into the shader.
// The GLSL consumes color values raw, so a hex palette entry becomes
// display RGB by hand: no THREE.Color, no sRGB-to-linear conversion.
const HEX_RE = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;

function parseHex(hex) {
  const m = HEX_RE.exec(typeof hex === 'string' ? hex.trim() : '');
  if (!m) return null;
  let h = m[1];
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function setV3(target, hex) {
  const c = parseHex(hex);
  if (c) target.set(c[0] / 255, c[1] / 255, c[2] / 255);
}

function setV3List(targets, list) {
  if (!Array.isArray(list)) return;
  for (let i = 0; i < targets.length; i++) setV3(targets[i], list[i]);
}

// Uniform values are rewritten in place, so a palette edit can never rebuild
// a program; a missing or malformed color simply leaves the last one standing.
function writePalette(u, palette) {
  setV3List(u.uDayTop.value, palette?.day?.top);
  setV3List(u.uDayMid.value, palette?.day?.middle);
  setV3List(u.uDayHor.value, palette?.day?.horizon);
  setV3List(u.uSunCore.value, palette?.sun?.core);
  setV3(u.uSunEdge.value, palette?.sun?.edge);
  setV3(u.uSunDisc.value, palette?.sun?.disc);
  setV3(u.uDomeTop.value, palette?.twilight?.top);
  setV3(u.uDomeBot.value, palette?.twilight?.bottom);
  setV3(u.uDomeCoral.value, palette?.twilight?.coral);
  setV3(u.uDomeRed.value, palette?.twilight?.red);
  setV3(u.uDomePurple.value, palette?.twilight?.purple);
  setV3(u.uDomeNavy.value, palette?.twilight?.navy);
}

// The CSS underlay.
const smoothstep = (edge0, edge1, x) => {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
};
const mixTo = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const addTo = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const scaleTo = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const cssRgb = (c, alpha = 1) => `rgba(${Math.round(c[0])}, ${Math.round(c[1])}, ${Math.round(c[2])}, ${alpha})`;

function rgbList(list, n) {
  if (!Array.isArray(list) || list.length < n) return null;
  const out = [];
  for (let i = 0; i < n; i++) {
    const c = parseHex(list[i]);
    if (!c) return null;
    out.push(c);
  }
  return out;
}

// Mirrors of the shader's ramps, used only to draw the still.
function rampAt(keys, p) {
  let c = mixTo(keys[0], keys[1], smoothstep(0.0, 0.32, p));
  c = mixTo(c, keys[2], smoothstep(0.32, 0.68, p));
  c = mixTo(c, keys[3], smoothstep(0.68, 0.87, p));
  c = mixTo(c, keys[4], smoothstep(0.87, 1.0, p));
  return c;
}
function rampFAt(a, b, c, d, e, p) {
  let v = a + (b - a) * smoothstep(0.0, 0.32, p);
  v += (c - v) * smoothstep(0.32, 0.68, p);
  v += (d - v) * smoothstep(0.68, 0.87, p);
  v += (e - v) * smoothstep(0.87, 1.0, p);
  return v;
}

const SKETCH_STOPS = [0, 0.07, 0.18, 0.35, 0.5, 0.68, 0.86, 1];

// A still of the field in CSS: the same day arc, the same vertical mix, the
// same horizon band, and the sun as a soft disc on its descending line. It
// stands in for the shader before the canvas fades in, on machines without
// WebGL, and while a context is lost. Returns null when the palette cannot be
// read, leaving the paper token to show through.
function fallbackSketch(palette, variant, phase, aspect) {
  const dayTop = rgbList(palette?.day?.top, 5);
  const dayMid = rgbList(palette?.day?.middle, 5);
  const dayHor = rgbList(palette?.day?.horizon, 5);
  const dome = {
    top: parseHex(palette?.twilight?.top),
    bot: parseHex(palette?.twilight?.bottom),
    coral: parseHex(palette?.twilight?.coral),
    red: parseHex(palette?.twilight?.red),
    purple: parseHex(palette?.twilight?.purple),
    navy: parseHex(palette?.twilight?.navy),
  };

  if (variant === 'twilight'
    && dome.top && dome.bot && dome.coral && dome.red && dome.purple && dome.navy) {
    // The dome's center sits 46% below the bottom edge and its U spans the
    // frame; the ring order follows the shader's own hue distance. The program
    // drops the day field and its horizon band before drawing, so the still
    // carries no phase term either: the dome is the whole show.
    return {
      image: 'radial-gradient(ellipse 53% 100% at 50% 146%, '
        + `${cssRgb(dome.coral)} 0%, ${cssRgb(dome.coral)} 30%, ${cssRgb(dome.red)} 52%, `
        + `${cssRgb(dome.purple)} 76%, ${cssRgb(dome.bot)} 92%, ${cssRgb(dome.navy)} 100%)`,
      base: cssRgb(dome.top),
      theme: cssRgb(mixTo(dome.bot, dome.top, smoothstep(0.10, 0.92, 0.5))),
    };
  }

  if (!dayTop || !dayMid || !dayHor) return null;

  const topC = rampAt(dayTop, phase);
  const midC = rampAt(dayMid, phase);
  const horC = rampAt(dayHor, phase);
  const amp = 0.28 * smoothstep(0.5, 0.85, phase);
  const field = (y) => {
    let c = mixTo(horC, midC, smoothstep(0.0, 0.5, y));
    c = mixTo(c, topC, smoothstep(0.45, 1.0, y));
    const dy = y - 0.07;
    return addTo(c, scaleTo(horC, amp * Math.exp(-dy * dy * 42)));
  };
  const stops = SKETCH_STOPS.map((y) => `${cssRgb(field(y))} ${(y * 100).toFixed(2)}%`);
  const layers = [`linear-gradient(to top, ${stops.join(', ')})`];

  const core = rgbList(palette?.sun?.core, 3);
  if (core) {
    const duskT = smoothstep(0.60, 0.95, phase);
    const coreC = mixTo(mixTo(core[0], core[1], smoothstep(0.30, 0.70, phase)), core[2], duskT);
    const disc = parseHex(palette?.sun?.disc) || coreC;
    const discAt = (limb) => mixTo(mixTo(disc, coreC, 0.10 + 0.32 * limb), coreC, duskT);
    const sunY = rampFAt(0.74, 0.62, 0.42, 0.24, 0.02, phase) - 0.16 * duskT;
    const sunR = rampFAt(0.050, 0.055, 0.075, 0.095, 0.10, phase);
    const glow = sunR * 3.4;
    const rim = (sunR / glow) * 100;
    layers.unshift('radial-gradient(ellipse '
      + `${((glow / Math.max(aspect, 0.2)) * 100).toFixed(2)}% ${(glow * 100).toFixed(2)}% `
      + `at 50% ${((1 - sunY) * 100).toFixed(2)}%, `
      + `${cssRgb(discAt(0))} 0%, ${cssRgb(discAt(1))} ${rim.toFixed(1)}%, `
      + `${cssRgb(coreC, 0.35)} ${(rim * 1.9).toFixed(1)}%, ${cssRgb(coreC, 0)} 100%)`);
  }

  return { image: layers.join(', '), base: cssRgb(field(0)), theme: cssRgb(field(0.5)) };
}

// The field.
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const numOr = (v, d) => (typeof v === 'number' && Number.isFinite(v) ? v : d);
const v3s = (n) => Array.from({ length: n }, () => new THREE.Vector3());
const SUPPORTS_LVH = typeof CSS !== 'undefined' && CSS.supports && CSS.supports('height', '100lvh');

// Fixed background layers are sized to the LARGE viewport (100lvh) so a
// collapsing mobile URL bar never resizes them: resizing the WebGL canvas
// clears its buffer for a frame, which reads as background flicker.
const WRAP_STYLE = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  height: SUPPORTS_LVH ? '100lvh' : '100vh',
  overflow: 'hidden',
  pointerEvents: 'none',
  zIndex: 0,
  background: 'var(--color-paper)',
};

const UNDERLAY_STYLE = { position: 'absolute', inset: 0 };

export default function LightField({
  palette = null,
  variant = 'ember',
  lockedPhase = null,
  grain = 1,
  motion = 1,
  className = '',
}) {
  const mountRef = useRef(null);
  const underlayRef = useRef(null);
  const runtimeRef = useRef(null);
  const propsRef = useRef(null);
  propsRef.current = { palette, variant, lockedPhase, grain, motion };

  useEffect(() => {
    const mount = mountRef.current;
    const underlay = underlayRef.current;
    if (!mount || !underlay) return undefined;

    const initial = propsRef.current;

    // Live values. Every one of these is mutable: no prop change below is
    // allowed to touch the canvas, the context or the compiled programs.
    let paletteNow = initial.palette;
    let variantNow = initial.variant === 'twilight' ? 'twilight' : 'ember';
    let grainNow = numOr(initial.grain, 1);
    let motionNow = Math.max(0, numOr(initial.motion, 1));
    let locked = typeof initial.lockedPhase === 'number' ? clamp01(initial.lockedPhase) : null;

    let targetPhase = 0;
    const readScroll = () => {
      if (locked !== null) return;
      const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      // Reach full dusk ~12% before the absolute bottom, so a footer actually
      // sits in night instead of a sunset that never finishes setting.
      targetPhase = Math.min(1, Math.max(0, (window.scrollY / max) * 1.14));
    };
    readScroll();

    let destroyed = false;
    let running = false;
    let raf = 0;
    let fadeTimer = 0;
    let gpuLive = false; // the canvas is carrying the field
    let covered = false; // the canvas has finished fading in over the underlay
    let suspended = false;
    let uniforms = null;
    let renderer = null;
    let canvas = null;
    let material = null;
    let geometry = null;
    let resizer = null;

    const motionQuery = typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-reduced-motion: reduce)')
      : null;
    let reduced = !!(motionQuery && motionQuery.matches);
    // The breath is the only self-driving motion. Without it the field is a
    // still until the scroll or the pointer asks for a frame.
    let animateTime = motionNow > 0 && !reduced;
    let clock = animateTime ? 0.0 : 21.0;
    let lastFrame = 0;

    const pointerTarget = new THREE.Vector2(0, 0);

    // Theme color.
    // iOS Safari tints its toolbars from <meta name="theme-color"> (or, absent
    // one, the body background, which reads as a jarring slab behind the URL
    // bar). Drive it from the sky instead, so the chrome dissolves into
    // whatever hour the page is standing in.
    let themeMeta = document.querySelector('meta[name="theme-color"]');
    const themeCreated = !themeMeta;
    const themePrev = themeMeta ? themeMeta.getAttribute('content') : null;
    if (!themeMeta) {
      themeMeta = document.createElement('meta');
      themeMeta.setAttribute('name', 'theme-color');
      document.head.appendChild(themeMeta);
    }
    let lastTheme = '';
    const setTheme = (css) => {
      if (!css || css === lastTheme) return;
      lastTheme = css;
      themeMeta.setAttribute('content', css);
    };

    // The underlay.
    let paintedPhase = Number.NaN;
    let paintedSig = '';
    const paintUnderlay = (force) => {
      if (covered || destroyed) return;
      // While the canvas carries the hour, follow its lerped phase; when it
      // cannot, the underlay tracks the scroll directly.
      const phase = gpuLive && uniforms ? uniforms.uPhase.value : targetPhase;
      if (!force && Math.abs(phase - paintedPhase) < 0.004) return;
      paintedPhase = phase;
      const sketch = fallbackSketch(
        paletteNow,
        variantNow,
        phase,
        mount.clientWidth / Math.max(mount.clientHeight, 1),
      );
      if (!sketch) return;
      const sig = `${sketch.base} ${sketch.image}`;
      if (sig === paintedSig) return;
      paintedSig = sig;
      underlay.style.backgroundImage = sketch.image;
      underlay.style.backgroundColor = sketch.base;
      // With no live GPU the underlay is the sky, so it tints the browser
      // chrome too. With one, the sampled canvas owns that job.
      if (!gpuLive) setTheme(sketch.theme);
    };

    paintUnderlay(true);

    // Renderer.
    try {
      renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'low-power' });
      // Sharp on HiDPI without paying for a full 3x buffer.
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    } catch {
      renderer = null; // no WebGL: the CSS underlay carries the field
    }

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    let lastThemeAt = 0;
    let lastThemePhase = -1;
    let themeDirty = true;

    // Average a small off-center patch of the frame: off-center dodges the
    // dead-center sun, and averaging irons out the film grain so the tint
    // stays steady.
    const SAMPLE = 16;
    const skyPx = new Uint8Array(SAMPLE * SAMPLE * 4);
    const sampleTheme = () => {
      const gl = renderer.getContext();
      const bw = gl.drawingBufferWidth;
      const bh = gl.drawingBufferHeight;
      const sx = Math.max(0, Math.min(bw - SAMPLE, Math.round(bw * 0.12)));
      const sy = Math.max(0, Math.min(bh - SAMPLE, Math.round(bh * 0.5 - SAMPLE / 2)));
      gl.readPixels(sx, sy, SAMPLE, SAMPLE, gl.RGBA, gl.UNSIGNED_BYTE, skyPx);
      const n = SAMPLE * SAMPLE;
      let r = 0;
      let g = 0;
      let b = 0;
      for (let i = 0; i < n; i++) {
        r += skyPx[i * 4];
        g += skyPx[i * 4 + 1];
        b += skyPx[i * 4 + 2];
      }
      const avg = (v) => Math.round(v / n);
      setTheme(`rgb(${avg(r)}, ${avg(g)}, ${avg(b)})`);
      themeDirty = false;
    };

    // Canvas health.
    // A lost context or a shader that will not link is not fatal: the
    // underlay takes over and the field returns when the GPU does.
    const suspend = (why, err) => {
      if (destroyed || suspended) return;
      suspended = true;
      gpuLive = false;
      covered = false;
      console.warn(`LightField: ${why}. Showing the CSS underlay.`, err || '');
      window.clearTimeout(fadeTimer);
      cancelAnimationFrame(raf);
      raf = 0;
      running = false;
      if (canvas) canvas.style.opacity = '0';
      paintUnderlay(true);
    };

    const programLinksOk = () => {
      const programs = renderer.info.programs;
      if (!programs || programs.length === 0) return true;
      const gl = renderer.getContext();
      for (let i = 0; i < programs.length; i++) {
        const p = programs[i];
        if (p.program && gl.getProgramParameter(p.program, gl.LINK_STATUS) === false) return false;
      }
      return true;
    };

    const renderNow = () => {
      try {
        renderer.render(scene, camera);
      } catch (err) {
        suspend('the field could not be drawn', err);
        return false;
      }
      return true;
    };

    const tick = () => {
      raf = 0;
      if (destroyed || !gpuLive) {
        running = false;
        return;
      }
      if (document.hidden) {
        // A hidden page gets no frames; visibilitychange starts them again.
        running = false;
        return;
      }
      const now = performance.now();
      if (animateTime) clock += (Math.min(now - lastFrame, 100) / 1000) * motionNow;
      lastFrame = now;
      uniforms.uTime.value = clock;

      // Scroll drives the day, lerped here so the sky never jumps even when
      // the browser teleports (anchor links, page-down).
      const step = targetPhase - uniforms.uPhase.value;
      uniforms.uPhase.value += step * 0.06;
      let settled = Math.abs(step) < 0.0006;

      uniforms.uPointer.value.lerp(pointerTarget, 0.04);
      if (uniforms.uPointer.value.distanceToSquared(pointerTarget) > 1e-7) settled = false;

      if (!renderNow()) return;

      // Prop changes need a fresh tint even when phase is fixed or motion is
      // paused. Throttle only the continuous scroll-driven readbacks.
      if (themeDirty || (now - lastThemeAt > 120 && Math.abs(uniforms.uPhase.value - lastThemePhase) > 0.004)) {
        lastThemeAt = now;
        lastThemePhase = uniforms.uPhase.value;
        sampleTheme();
      }

      if (!settled || animateTime) raf = requestAnimationFrame(tick);
      else running = false;
    };

    const kick = () => {
      if (destroyed || running || !gpuLive || document.hidden) return;
      running = true;
      lastFrame = performance.now();
      raf = requestAnimationFrame(tick);
    };

    const sizeCanvas = () => {
      const w = mount.clientWidth || 1;
      const h = mount.clientHeight || 1;
      renderer.setSize(w, h, false);
      uniforms.uRes.value.set(w, h);
    };

    const resize = () => {
      if (destroyed || !uniforms) return;
      sizeCanvas();
      // Repaint now: a real resize (e.g. orientation change) leaves the buffer
      // cleared until the next rAF tick, flashing a blank frame.
      renderNow();
      paintUnderlay(true);
      themeDirty = true;
      kick();
    };

    const fadeIn = () => {
      window.clearTimeout(fadeTimer);
      // Fade the field in over the underlay: on a cold cache the chunk can
      // land well after first paint, and an instant swap reads as a pop.
      requestAnimationFrame(() => {
        if (canvas) canvas.style.opacity = '1';
      });
      fadeTimer = window.setTimeout(() => {
        covered = true;
      }, 1300);
    };

    const syncMotion = () => {
      const next = motionNow > 0 && !reduced;
      if (next === animateTime) return;
      animateTime = next;
      if (animateTime) kick();
    };

    const applyProps = (next) => {
      if (destroyed) return;
      paletteNow = next.palette;
      variantNow = next.variant === 'twilight' ? 'twilight' : 'ember';
      grainNow = numOr(next.grain, 1);
      motionNow = Math.max(0, numOr(next.motion, 1));
      locked = typeof next.lockedPhase === 'number' ? clamp01(next.lockedPhase) : null;
      themeDirty = true;

      if (locked !== null) {
        // A pinned moment snaps: there is no scroll to glide along.
        targetPhase = locked;
        if (uniforms) uniforms.uPhase.value = locked;
      } else {
        readScroll();
      }

      if (uniforms) {
        writePalette(uniforms, paletteNow);
        uniforms.uTwilight.value = variantNow === 'twilight' ? 1 : 0;
        uniforms.uGrain.value = grainNow;
      }
      syncMotion();
      paintUnderlay(true);
      kick();
    };

    // Listeners.
    const onScroll = () => {
      readScroll();
      if (gpuLive) kick();
      else paintUnderlay(false);
    };
    const onPointer = (e) => {
      pointerTarget.set(
        (e.clientX / window.innerWidth) * 2 - 1,
        -((e.clientY / window.innerHeight) * 2 - 1),
      );
      kick();
    };
    const onVisibility = () => {
      if (!document.hidden) kick();
    };
    const onMotionChange = (e) => {
      reduced = !!e.matches;
      syncMotion();
    };
    const onContextLost = () => {
      suspend('the WebGL context was lost');
    };
    const onContextRestored = () => {
      if (destroyed || !renderer) return;
      suspended = false;
      uniforms.uPhase.value = targetPhase;
      sizeCanvas();
      if (renderNow() && programLinksOk()) {
        gpuLive = true;
        themeDirty = true;
        fadeIn();
        kick();
      } else {
        suspend('the WebGL context could not be restored');
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    document.addEventListener('visibilitychange', onVisibility);
    if (motionQuery && motionQuery.addEventListener) motionQuery.addEventListener('change', onMotionChange);

    // Boot.
    if (renderer) {
      canvas = renderer.domElement;
      canvas.style.position = 'absolute';
      canvas.style.inset = '0';
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      // Fade the field in over the CSS underlay.
      canvas.style.opacity = '0';
      canvas.style.transition = 'opacity 1.2s ease';
      mount.appendChild(canvas);

      uniforms = {
        uTime: { value: clock },
        uPhase: { value: targetPhase },
        uRes: { value: new THREE.Vector2(1, 1) },
        uPointer: { value: new THREE.Vector2(0, 0) },
        uTwilight: { value: variantNow === 'twilight' ? 1 : 0 },
        uGrain: { value: grainNow },
        uDayTop: { value: v3s(5) },
        uDayMid: { value: v3s(5) },
        uDayHor: { value: v3s(5) },
        uSunCore: { value: v3s(3) },
        uSunEdge: { value: new THREE.Vector3() },
        uSunDisc: { value: new THREE.Vector3() },
        uDomeTop: { value: new THREE.Vector3() },
        uDomeBot: { value: new THREE.Vector3() },
        uDomeCoral: { value: new THREE.Vector3() },
        uDomeRed: { value: new THREE.Vector3() },
        uDomePurple: { value: new THREE.Vector3() },
        uDomeNavy: { value: new THREE.Vector3() },
      };
      writePalette(uniforms, paletteNow);

      material = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms });
      geometry = new THREE.PlaneGeometry(2, 2);
      scene.add(new THREE.Mesh(geometry, material));

      paintUnderlay(true);
      sizeCanvas();
      if (renderNow() && programLinksOk()) {
        gpuLive = true;
        sampleTheme();
        lastThemePhase = uniforms.uPhase.value;
        fadeIn();
        kick();
      } else {
        suspend('the shader program did not link');
      }

      resizer = new ResizeObserver(resize);
      resizer.observe(mount);
      canvas.addEventListener('webglcontextlost', onContextLost);
      canvas.addEventListener('webglcontextrestored', onContextRestored);
      window.addEventListener('pointermove', onPointer, { passive: true });
    }

    runtimeRef.current = { apply: applyProps };

    return () => {
      destroyed = true;
      cancelAnimationFrame(raf);
      window.clearTimeout(fadeTimer);
      if (resizer) resizer.disconnect();
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('pointermove', onPointer);
      document.removeEventListener('visibilitychange', onVisibility);
      if (motionQuery && motionQuery.removeEventListener) motionQuery.removeEventListener('change', onMotionChange);
      if (canvas) {
        canvas.removeEventListener('webglcontextlost', onContextLost);
        canvas.removeEventListener('webglcontextrestored', onContextRestored);
      }
      if (geometry) geometry.dispose();
      if (material) material.dispose();
      if (renderer) renderer.dispose();
      if (canvas && canvas.parentNode === mount) mount.removeChild(canvas);
      runtimeRef.current = null;
      // Hand the toolbar tint back to whatever owned it before this field.
      if (themeCreated) themeMeta.remove();
      else if (themePrev !== null) themeMeta.setAttribute('content', themePrev);
    };
  }, []);

  // Prop changes land on the live field: uniforms and targets only, never a
  // new context, program or canvas.
  useEffect(() => {
    const runtime = runtimeRef.current;
    if (runtime) runtime.apply(propsRef.current);
  }, [palette, variant, lockedPhase, grain, motion]);

  return (
    <div ref={mountRef} className={className} aria-hidden="true" style={WRAP_STYLE}>
      <div ref={underlayRef} style={UNDERLAY_STYLE} />
    </div>
  );
}
