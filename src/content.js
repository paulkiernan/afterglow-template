// Every string the page renders lives here. Layout reads these objects and
// never hard-codes copy, so a fresh site starts with this file and nothing
// else: rewrite the words, keep the structure.

export const brand = {
  name: 'Afterglow',
  nav: [
    { href: '#studio', label: 'Light studio' },
    { href: '#elements', label: 'Elements' },
    { href: '#notes', label: 'Notes' },
  ],
};

export const hero = {
  eyebrow: 'React · Vite · Three.js',
  wordmark: 'Afterglow',
  intro: 'A full-viewport light field, three palettes, and a few paper-quiet primitives. Take the whole thing apart in the studio below.',
  scroll: 'Open the light studio',
  hint: 'The field answers to scroll, pointer, and time.',
};

export const studio = {
  eyebrow: 'Live control',
  heading: 'Light studio',
  intro: 'Every control here drives the same engine the rest of the page uses. Change the palette and the whole page repaints: paper, ink, hairlines, and the field itself.',
  palette: {
    legend: 'Palette',
    help: 'Sets the light program and every colour token on the page.',
    options: [
      { id: 'goldenHour', label: 'Golden Hour' },
      { id: 'moonrise', label: 'Moonrise' },
      { id: 'moss', label: 'Moss' },
    ],
  },
  typography: {
    legend: 'Typography',
    help: 'Swaps all five font roles at once.',
    options: [
      { id: 'expressive', label: 'Expressive' },
      { id: 'editorial', label: 'Editorial' },
      { id: 'minimal', label: 'Minimal' },
    ],
  },
  program: {
    legend: 'Program',
    help: 'The shader runs two shows.',
    options: [
      { id: 'ember', label: 'Ember', note: 'Follows the day arc' },
      { id: 'twilight', label: 'Twilight', note: 'Holds its own dome' },
    ],
  },
  phase: {
    legend: 'Phase',
    sliderLabel: 'Day arc position',
    sliderHelp: '0 is morning light, 1 is ember dusk. Dragging this holds that moment.',
    follow: 'Follow the scroll',
    hold: 'Hold one moment',
    defaultValue: 0.35,
  },
  texture: {
    legend: 'Texture and motion',
    grain: 'Grain',
    grainHelp: 'Film grain amplitude. 1 is the full print grain, 0 removes it.',
    motion: 'Motion',
    motionHelp: 'Time in the field. 0 freezes it, 1 is real time, 2 doubles it.',
  },
  actions: {
    reset: 'Reset to defaults',
    preview: 'Shader only',
    exitPreview: 'Leave preview',
  },
  notes: [
    'Phase controls the Ember day arc. Twilight is a separate dome composition and does not change with phase.',
    'Twilight holds its own field of light: coral rises from the bottom edge through red and purple into cobalt.',
    'Grain changes the shader texture. Motion sets the pace of its slow luminance shifts, which pause when the visitor prefers reduced motion.',
  ],
};

export const elements = {
  eyebrow: 'Elements',
  heading: 'Paper and light',
  intro: 'Five primitives carry the whole page. Each one is a shell: it holds your content and takes its colour from the token layer, so a palette change repaints everything without touching a component.',
  primitives: [
    {
      label: 'Panel',
      title: 'A wall in the light',
      body: 'A full-bleed band of translucent paper with hairline edges. Sections stack it, and the field glows in the gaps between them.',
      meta: 'paper · line',
    },
    {
      label: 'Section heading',
      title: 'Warm light behind the words',
      body: 'An eyebrow, a display heading, and a soft radial glow sitting behind the text. The one Turrell gesture the layout keeps everywhere.',
      meta: 'ink · accent',
    },
    {
      label: 'Paper card',
      title: 'A card with one soft corner',
      body: 'A hairline, a wash of paper, and an asymmetric radius. Cards are notes dropped on the surface, never dashboard tiles.',
      meta: 'paper · muted · line',
    },
  ],
  arch: {
    label: 'The arch',
    title: 'An arch holds the invitation',
    body: 'The arch is the one strong curve in the system. It carries a wordmark, a sprig, and whatever line you need, with an inset hairline standing in for letterpress.',
  },
  demo: {
    kicker: 'Demo card',
    wordmark: 'Afterglow',
    line: 'Replace this line in src/content.js and the arch is yours.',
    footer: 'Every colour here comes from a token',
  },
  divider: {
    caption: 'SprigDivider draws a hairline rule with a botanical mark in currentColor, so it takes the colour of whatever it sits in.',
  },
};

export const notes = {
  eyebrow: 'Getting started',
  heading: 'Where to edit',
  intro: 'Four places hold nearly everything you will want to change.',
  items: [
    {
      title: 'Colour, type, and defaults',
      body: 'Three palettes, three font pairings, and the settings the page boots with. themeStyle() turns a palette and a pairing into CSS custom properties.',
      paths: ['src/theme.js'],
    },
    {
      title: 'Copy',
      body: 'Every string on this page, in one module. Rewrite it and the layout follows.',
      paths: ['src/content.js'],
    },
    {
      title: 'The light field',
      body: 'The engine: one component plus its GLSL. It renders its own fixed backdrop and its own CSS fallback, so it drops into any layout.',
      paths: ['src/components/LightField.jsx', 'src/shaders/'],
    },
    {
      title: 'Layout and skin',
      body: 'The page, the stylesheet, and the primitives above it.',
      paths: ['src/App.jsx', 'src/styles.css', 'src/components/primitives.jsx'],
    },
  ],
  snippet: {
    title: 'The engine on its own',
    note: 'LightField takes a palette from theme, a program, and optional phase, grain, and motion. Everything else on this page is React.',
    code: `import LightField from './components/LightField';
import { fontPairings, palettes, themeStyle } from './theme';

const palette = palettes.moonrise;

export default function App() {
  return (
    <div className="app" style={themeStyle(palette, fontPairings.minimal)}>
      <LightField
        palette={palette.light}
        variant="ember"
        lockedPhase={0.4}
        grain={0.8}
        motion={0.6}
      />
      <main style={{ position: 'relative', zIndex: 1 }}>Your content goes here.</main>
    </div>
  );
}`,
  },
};

export const footer = {
  wordmark: 'Afterglow',
  line: 'Built to be rewritten.',
  meta: 'React 19 · Vite · Three.js',
};
