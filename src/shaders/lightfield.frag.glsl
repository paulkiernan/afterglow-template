// The light field. Two programs share one field of light:
//
//   ember    (uTwilight 0.0) is the day arc. Scroll drives it from a golden
//            morning through orange noon and a hot golden hour into deep ember
//            dusk, while a single sun descends dead center the whole way. Time
//            adds a slow ganzfeld breath; the pointer nudges the light.
//   twilight (uTwilight 1.0) is a true sunset: a coral dome rises from below the
//            bottom edge in an upward U: red melting through purple into a
//            cobalt field, corners falling to navy. No sun disc; the dome IS
//            the light.
//
// Every pigment arrives as a uniform from the theme palette; the composition,
// the ramps, the luminance math and the grain are this program's own.
precision highp float;
varying vec2 vUv;

uniform float uTime;
uniform float uPhase;
uniform vec2 uRes;
uniform vec2 uPointer;
uniform float uTwilight; // 1 = the dome program (coral on cobalt), 0 = the descending ember sun
uniform float uGrain;    // film-grain amplitude: 1 = the full print grain, 0 = clean

// The day arc's five keyframes per band: morning, daylight, golden hour, sunset, dusk.
uniform vec3 uDayTop[5];
uniform vec3 uDayMid[5];
uniform vec3 uDayHor[5];
// The ember sun: warm white morning, gold day, coral dusk, plus its edge and disc.
uniform vec3 uSunCore[3];
uniform vec3 uSunEdge;
uniform vec3 uSunDisc;
// The dome program: cobalt field top/bottom, coral to red to purple rings, navy corners.
uniform vec3 uDomeTop;
uniform vec3 uDomeBot;
uniform vec3 uDomeCoral;
uniform vec3 uDomeRed;
uniform vec3 uDomePurple;
uniform vec3 uDomeNavy;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 3; i++) {
    v += a * noise(p);
    p *= 2.03;
    a *= 0.5;
  }
  return v;
}

// Five keyframes across the day: morning, daylight, golden hour, sunset, dusk.
vec3 ramp(float p, vec3 c0, vec3 c1, vec3 c2, vec3 c3, vec3 c4) {
  vec3 col = mix(c0, c1, smoothstep(0.00, 0.32, p));
  col = mix(col, c2, smoothstep(0.32, 0.68, p));
  col = mix(col, c3, smoothstep(0.68, 0.87, p));
  col = mix(col, c4, smoothstep(0.87, 1.00, p));
  return col;
}

float rampF(float p, float a, float b, float c, float d, float e) {
  float v = mix(a, b, smoothstep(0.00, 0.32, p));
  v = mix(v, c, smoothstep(0.32, 0.68, p));
  v = mix(v, d, smoothstep(0.68, 0.87, p));
  v = mix(v, e, smoothstep(0.87, 1.00, p));
  return v;
}


void main() {
  vec2 uv = vUv;
  float aspect = uRes.x / max(uRes.y, 1.0);
  float phase = clamp(uPhase, 0.0, 1.0);

  // Three bands stacked up the frame: horizon, middle sky, top sky. Each runs
  // the same five-keyframe day arc, so the whole field travels the day
  // together at its own altitude.
  vec3 top = ramp(phase,
    uDayTop[0], uDayTop[1], uDayTop[2], uDayTop[3], uDayTop[4]);
  vec3 mid = ramp(phase,
    uDayMid[0], uDayMid[1], uDayMid[2], uDayMid[3], uDayMid[4]);
  vec3 hor = ramp(phase,
    uDayHor[0], uDayHor[1], uDayHor[2], uDayHor[3], uDayHor[4]);

  float y = uv.y;
  float w1 = smoothstep(0.0, 0.5, y);
  float w2 = smoothstep(0.45, 1.0, y);
  vec3 col = mix(hor, mid, w1);
  col = mix(col, top, w2);

  // Print-fade transitions (the James Flower move): the fade between color
  // fields passes through a slightly dusty neutral instead of blending hue
  // to hue, and the film grain thickens inside the fade. tAmt peaks where
  // the vertical mix is 50/50; the grain stage below reads it too.
  float tAmt = w1 * (1.0 - w1) * 2.2 + w2 * (1.0 - w2) * 1.8;
  // …and the same grain surfaces BETWEEN the day's color sections as the
  // phase advances: each keyframe crossfade exposes its own band of grain.
  float pA = smoothstep(0.00, 0.32, phase);
  float pB = smoothstep(0.32, 0.68, phase);
  float pC = smoothstep(0.68, 0.87, phase);
  float pD = smoothstep(0.87, 1.00, phase);
  float pTrans = min(4.0 * (pA * (1.0 - pA) + pB * (1.0 - pB) + pC * (1.0 - pC) + pD * (1.0 - pD)), 1.0);
  float lum = dot(col, vec3(0.299, 0.587, 0.114));
  col = mix(col, vec3(lum) * 1.03, tAmt * (1.0 - uTwilight) * 0.20);

  // Ganzfeld breath: broad, slow luminance weather in the field. The pointer
  // nudges the weather, never the sun; the aperture holds its line.
  float breath = fbm(uv * vec2(1.7, 1.2)
    + vec2(uTime * 0.012 + uPointer.x * 0.06, -uTime * 0.008 - uPointer.y * 0.05));
  col += (breath - 0.5) * 0.045;

  // The ember band that hugs the horizon once the light turns.
  float dy = y - 0.07;
  col += hor * 0.28
       * exp(-dy * dy * 42.0)
       * smoothstep(0.5, 0.85, phase)
       * mix(1.0, 1.0 - 0.6 * smoothstep(0.9, 1.0, phase), uTwilight);

  // One sun for the whole site, descending as the page scrolls. Turrell
  // rules: the aperture never wanders: it holds dead center and only the
  // scroll moves it. The light breathes (intensity), never the geometry.
  float sunY = rampF(phase, 0.74, 0.62, 0.42, 0.24, 0.02);
  // On the ember program the sun finishes BELOW the frame: what remains on
  // screen is its glow rising into the cobalt dusk.
  sunY = mix(sunY - 0.16 * smoothstep(0.60, 0.95, phase), sunY, uTwilight);
  float sunR = rampF(phase, 0.050, 0.055, 0.075, 0.095, 0.10);
  float sunI = rampF(phase, 0.85, 0.70, 1.00, 1.10, 0.30);
  sunI *= 1.0 + 0.05 * sin(uTime * 0.11);
  vec2 sv = (uv - vec2(0.5, sunY)) * vec2(aspect, 1.0);
  // Atmospheric refraction flattens the disc, but only right at the horizon.
  float d = length(vec2(sv.x, sv.y * mix(1.0, 1.22, smoothstep(0.72, 0.98, phase))));
  if (uTwilight > 0.5) {
    // True sunset (dome program): a coral dome rises from below the bottom
    // edge in an upward U: red core melting through rose and purple into the
    // cobalt field, corners falling to deep navy. No sun disc, no stars:
    // the dome IS the light.
    vec3 fieldC = mix(uDomeBot, uDomeTop, smoothstep(0.10, 0.92, uv.y));
    // Same slow weather as the rest of the site, breathing in the blue.
    fieldC += (breath - 0.5) * 0.035;
    // Frame-proportional dome: no aspect correction, so the U spans the
    // viewport on any screen.
    vec2 dv = vec2((uv.x - 0.5) * 1.9, uv.y + 0.46);
    float dd = length(dv);
    float g = exp(-dd * dd * 1.30);            // soft glow, crest ~55% up the page
    float t = clamp((dd - 0.34) / 0.85, 0.0, 1.0); // hue distance along the dome
    vec3 domeC = mix(uDomeCoral, uDomeRed, smoothstep(0.22, 0.60, t));
    domeC = mix(domeC, uDomePurple, smoothstep(0.52, 0.84, t));
    domeC = mix(domeC, fieldC, smoothstep(0.74, 1.00, t));
    col = mix(fieldC, domeC, smoothstep(0.10, 0.82, g));
    // Hot core push: the sun itself stays below the frame, breathing.
    col += uDomeCoral * exp(-dd * dd * 3.2) * (0.20 + 0.02 * sin(uTime * 0.11));
    // The upward U: outside the dome's rim, near the bottom, the field
    // falls to deep navy: the dark corners that shape the curve.
    float under = smoothstep(0.80, 1.04, dd) * (1.0 - smoothstep(0.02, 0.36, uv.y));
    col = mix(col, uDomeNavy, under * 0.70);
  } else {
    // Ember sun: a soft aperture, one gentle, consistent glow. Warm white
    // through the morning, gold by afternoon, easing into the dusk coral.
    // As the day ends the disc slips below the frame and its falloff widens,
    // leaving only the big soft dome of light rising into the cobalt field.
    float duskT = smoothstep(0.60, 0.95, phase);
    vec3 coreC = mix(uSunCore[0], uSunCore[1], smoothstep(0.30, 0.70, phase));
    coreC = mix(coreC, uSunCore[2], duskT);
    vec3 edgeC = mix(coreC, uSunEdge, smoothstep(0.45, 1.0, phase));
    float I = mix(sunI, 1.05, duskT);
    float dome = exp(-d * d * mix(22.0, 6.0, duskT));
    // At dusk the dome REPLACES the field near its center (a saturated
    // coral) instead of merely adding light, which washes to lavender over
    // cobalt. The additive term stays for daytime warmth.
    col += edgeC * dome * mix(0.20, 0.22, duskT) * I;
    col = mix(col, edgeC, dome * 0.82 * duskT);
    col += coreC * exp(-max(d - sunR, 0.0) * mix(34.0, 15.0, duskT)) * mix(0.15, 0.35, duskT) * I;
    float disc = 1.0 - smoothstep(sunR - 0.003, sunR + 0.003, d);
    float limb = smoothstep(0.7, 1.0, d / max(sunR, 1e-4));
    vec3 discC = mix(uSunDisc, coreC, 0.10 + 0.32 * limb);
    discC = mix(discC, coreC, duskT); // coral as it sets, never a white bulb at dusk
    col = mix(col, discC, disc * min(I, 1.0));
  }


  // Film grain. ~1.6 physical-px cells, STATIC: print grain sits in the
  // paper, so it stays frozen instead of re-seeding per frame (which reads
  // as TV static). Calm in the flat fields, thickest inside the vertical
  // fades and the phase crossfades between color sections.
  col += (hash(floor(uv * uRes / 1.6)) - 0.5)
       * (0.055 + (0.10 * tAmt + 0.09 * pTrans) * (1.0 - uTwilight)) * uGrain;

  gl_FragColor = vec4(col, 1.0);
}
