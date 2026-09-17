# Afterglow

**Live demo:** <https://paulkiernan.github.io/afterglow-template/>

A shader-first React starter: a full-viewport WebGL light field, translucent paper surfaces, and a small set of page primitives. One theme object drives the page colors, the typography, and the pigments of the shader, and a live studio on the page previews every combination.

The field is two GLSL programs sharing one full-screen pass:

- **ember** follows a day. Scroll moves a three-band sky through five keyframes per band (morning, daylight, golden hour, sunset, dusk) while a single sun descends down the center of the frame. Time adds a slow luminance breath, the pointer nudges the light, and static film grain thickens inside the fades.
- **twilight** is a different hour. A coral dome rises from the bottom edge in an upward U, melting through red and purple into a cobalt field with corners falling to navy. There is no sun disc and no scroll arc: the dome is the light.

Every pigment arrives as a uniform, so changing palettes never recompiles a shader. React renders the page on its own; the field is an upgrade, never a prerequisite.

The repository doubles as a working demo and as the source of the `@paulkiernan/afterglow` npm package, which the release workflow publishes through GitHub Packages and attaches to the GitHub release as a tarball. Run the demo straight from a clone, or install the package into another app (see [Install as a package](#install-as-a-package)).

## Requirements

- Node.js 22.12.0 or newer (declared in `package.json` `engines`; `.node-version` pins 24.12.0 for version managers)
- npm, installing from the committed `package-lock.json`

## Getting started

On GitHub, click **Use this template** to create your own repository, then:

```bash
git clone https://github.com/<you>/<your-repo>.git
cd <your-repo>
npm ci
npm run dev
```

Vite prints the local URL, and the page reloads as you edit. To produce the production build and check it locally:

```bash
npm run build
npm run preview
```

`npm run build` writes `dist/` (HTML, hashed JS/CSS, and everything from `public/` copied through, including the font licenses). `vite.config.js` sets `base: './'`, so asset URLs are relative and `dist/` can be served from a domain root or a project subdirectory. The output is static: no backend, no server rendering. Upload `dist/` to any static host. This project's own demo is deployed the same way, from `main` by CI, to <https://paulkiernan.github.io/afterglow-template/> (see [Quality tooling](#quality-tooling)).

## Install as a package

The `@paulkiernan/afterglow` package (version 1.0.0) is built from this repository; publishing a GitHub release runs a workflow that publishes it to GitHub Packages and attaches the packed tarball to the release. The package is ESM only and ships compiled output with its GLSL bundled in, so consuming it does not need any special raw-import support in your bundler. React and `three` are peer dependencies (`react` ^19.0.0 and `three` ^0.185.1), so install them alongside it.

GitHub Packages does not inherit repository visibility: a released package stays private to its owner until access is granted, so installers outside the owner account need either access to the package or the release tarball below.

### From GitHub Packages

GitHub Packages serves from `npm.pkg.github.com` and requires an authenticated token even for a public package. If you have access to the package, authenticate with an interactive login, which stores the credential in your user-level config:

```bash
npm login --scope=@paulkiernan --auth-type=legacy --registry=https://npm.pkg.github.com
npm install @paulkiernan/afterglow "react@^19" "three@^0.185.1"
```

The equivalent by hand: put the scope mapping in your user-level `.npmrc` and keep the token in the environment rather than the file.

```ini
# ~/.npmrc
@paulkiernan:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}
```

```bash
export NODE_AUTH_TOKEN='YOUR_GITHUB_TOKEN'  # a classic token with read:packages
npm install @paulkiernan/afterglow "react@^19" "three@^0.185.1"
```

Never commit a real token; both forms above keep it out of the repository.

### From the release tarball

The release workflow attaches the packed tarball to the GitHub release, and that asset downloads anonymously, so it is the way in when you do not have GitHub Packages access:

```bash
npm install https://github.com/paulkiernan/afterglow-template/releases/download/v1.0.0/paulkiernan-afterglow-1.0.0.tgz
```

The peer dependencies still apply, so make sure the consuming project also has `react` and `three` installed.

### Using it

```jsx
import { LightField, fontPairings, palettes, settings, themeStyle } from '@paulkiernan/afterglow';

const palette = palettes[settings.palette];

export default function Page() {
  return (
    <div
      style={{
        ...themeStyle(palette, fontPairings[settings.typography]),
        position: 'relative',
        isolation: 'isolate',
        minHeight: '100vh',
      }}
    >
      <LightField
        palette={palette.light}
        variant={settings.variant}
        grain={settings.grain}
        motion={settings.motion}
      />
      <main style={{ position: 'relative', zIndex: 1 }}>{/* your content */}</main>
    </div>
  );
}
```

The root entry exports `LightField`, `palettes`, `fontPairings`, `settings`, and `themeStyle`, and nothing else. TypeScript declarations are bundled, including `Palette`, `PaletteLight`, `LightFieldProps`, `Settings`, and `ThemeStyle`; `themeStyle(palette?, pairing?)` returns that `ThemeStyle` object, the thirteen custom properties (eight colors plus five font roles) you spread onto a style. The root entry imports no CSS, so styling is explicit:

| Import | What it brings |
| --- | --- |
| `@paulkiernan/afterglow/fonts.css` | Optional. The bundled Fraunces, Karla, and Stick No Bills faces. All 16 font binaries ship inside the package and are served locally, so nothing is fetched from a CDN. |
| `@paulkiernan/afterglow/styles.css` | Optional. The full starter skin, including global element styles. Opt in if you want the page look, not just the field. |
| `@paulkiernan/afterglow/shaders/lightfield.frag.glsl` and `@paulkiernan/afterglow/shaders/lightfield.vert.glsl` | The raw GLSL source, for custom pipelines. These two imports are the exception: they need a bundler that can load raw files (for example Vite's `?raw` suffix). |

## Where to customize

| Path | What it owns |
| --- | --- |
| `src/theme.js` | Palettes (UI colors plus shader pigments), font pairings, `settings` defaults, and `themeStyle()`, which turns a palette and pairing into the CSS custom properties the page styles against. |
| `src/content.js` | Every string the page renders, plus the option lists the studio shows. |
| `src/styles.css` | The page skin and all type roles. It never names a color or a face; both come from custom properties. |
| `src/components/primitives.jsx` | `Label`, `SectionHeading`, `Panel`, `PaperCard`, `ArchInvitation`, `SprigDivider`, plus the studio fields `ChoiceGroup` and `SliderField`. |
| `src/components/LightField.jsx` | The WebGL field: fixed wrapper, CSS underlay, uniforms, resize and context-loss handling. |
| `src/shaders/*.glsl` | The two programs: composition, ramps, luminance math, and grain. |

### Editing a palette

A palette has eight UI colors and three pigment groups. Change the values in `src/theme.js` and the page repaints: the tokens are spread onto the app root by `themeStyle()`, and the same object is handed to the shader.

```js
// src/theme.js
export const palettes = {
  goldenHour: {
    name: 'Golden Hour',
    colors: {
      paper: '#faf4e7',
      paperDeep: '#f3ead4',
      ink: '#3a2f23',
      muted: '#5f5442',
      accent: '#a85252',
      onAccent: '#faf4e7',
      pop: '#f0559a',
      line: '#e8c4c4',
    },
    light: {
      day: {
        // Five stops per band, in day-arc order:
        // morning, daylight, golden hour, sunset, dusk.
        top: ['#ffeab0', '#ffdf8f', '#ff9a45', '#45509e', '#33409f'],
        middle: ['#ffc95e', '#ff9a45', '#f0559a', '#c05585', '#4353b5'],
        horizon: ['#ff8a4a', '#f2603d', '#d4403a', '#ff8a55', '#4a4fa8'],
      },
      sun: {
        core: ['#fff7e0', '#ffbf7a', '#ff9067'], // morning, day, dusk
        edge: '#f37a51',
        disc: '#fffefb',
      },
      twilight: {
        top: '#1d2578',
        bottom: '#3e4dc7',
        coral: '#ef7c5f',
        red: '#dd5b5f',
        purple: '#7c479d',
        navy: '#1b206e',
      },
    },
  },
  // ...moonrise, moss
};
```

Shape rules the shader relies on:

- `light.day.top`, `light.day.middle`, and `light.day.horizon` each hold exactly five hex colors, ordered morning, daylight, golden hour, sunset, dusk (phases 0, 0.32, 0.68, 0.87, 1).
- `light.sun.core` holds exactly three hex colors: morning, day, dusk. `edge` and `disc` are single colors.
- `light.twilight` holds `top`, `bottom`, `coral`, `red`, `purple`, and `navy`.
- Colors are hex strings (`#rgb` or `#rrggbb`). They are written into the shader as display RGB, matching the pigments the programs were written with. An unreadable or missing value leaves the previous uniform in place rather than crashing the field.

`colors` maps to the CSS custom properties `--color-paper`, `--color-paper-deep`, `--color-ink`, `--color-muted`, `--color-accent`, `--color-on-accent`, `--color-pop`, and `--color-line`.

### Settings and programs

```js
// src/theme.js
export const settings = {
  palette: 'goldenHour',
  typography: 'expressive',
  variant: 'ember',
  lockedPhase: null,
  grain: 1,
  motion: 1,
};
```

- `palette` and `typography` are keys into `palettes` and `fontPairings`.
- `variant` picks the program. `ember` follows the day arc; `twilight` draws its own dome and ignores the day arc, so it holds its composition at any phase.
- `lockedPhase` is `null` to follow the scroll, or a number from 0 to 1 to pin the field to that moment. The page reaches full dusk a little before the absolute bottom, so a footer sits in night rather than a sunset that never finishes.
- `grain` is the film grain amplitude: `1` matches the intended print look, `0` is clean.
- `motion` is a multiplier on the field's clock: `0` freezes the breath, `1` runs at source speed, `2` doubles it. Scroll and pointer still move the field when the clock is frozen.

### Fonts

Five roles cover the page: `display`, `wordmark`, `serif`, `body`, and `label`. They are defined per pairing in `fontPairings` and mapped to `--font-display`, `--font-wordmark`, `--font-serif`, `--font-body`, and `--font-label`.

```js
export const fontPairings = {
  expressive: {
    name: 'Expressive',
    fonts: {
      display: '"Fraunces", Georgia, serif',
      wordmark: '"Fraunces", Georgia, serif',
      serif: '"Fraunces", Georgia, serif',
      body: '"Karla", system-ui, -apple-system, sans-serif',
      label: '"Stick No Bills", "Arial Narrow", system-ui, sans-serif',
    },
  },
  // ...editorial and minimal use system faces only
};
```

The bundled faces load in `src/main.jsx` through Fontsource imports such as `import '@fontsource/fraunces/latin-600.css'`. To use your own files instead, self-host them and add an `@font-face` rule that matches the weight the role uses:

```css
/* public/fonts/your-face-600.woff2, referenced from src/styles.css.
   Files in public/ are served as-is, so an absolute URL works when the
   site is deployed at a domain root. */
@font-face {
  font-family: 'Your Face';
  src: url('/fonts/your-face-600.woff2') format('woff2');
  font-weight: 600;
  font-style: normal;
  font-display: swap;
}
```

Because the build uses `base: './'` for portable output, an absolute `/fonts/...` URL will not follow a subdirectory deployment. For that case, keep the font next to a stylesheet inside `src/` and import that stylesheet, so Vite rewrites the relative URL into the build:

```css
/* src/fonts.css, imported once from src/main.jsx */
@font-face {
  font-family: 'Your Face';
  src: url('./fonts/your-face-600.woff2') format('woff2');
  font-weight: 600;
  font-style: normal;
  font-display: swap;
}
```

Then point the role at it: `body: '"Your Face", system-ui, sans-serif'`.

The three bundled Fontsource packages are Fraunces, Karla, and Stick No Bills, all under the SIL Open Font License 1.1. Their license texts live in `public/licenses/` and are copied into `dist/licenses/` by the build. Adding another Fontsource package takes an install plus one import line in `src/main.jsx` following the same pattern:

```bash
npm install @fontsource/<face>
```

Check the license of any face you add, and keep its license text with the project.

### Page copy and the studio

`src/content.js` holds every rendered string. To add a palette or a font pairing to the studio, add the object to `src/theme.js` and a matching entry to the option list in `content.js`:

```js
// src/content.js
palette: {
  legend: 'Palette',
  help: 'Sets the light program and every colour token on the page.',
  options: [
    { id: 'goldenHour', label: 'Golden Hour' },
    // add: { id: 'yourKey', label: 'Your Label' }
  ],
},
```

The `id` must match the key in `palettes` (or `fontPairings` for typography).

The studio controls on the page are previews. They update React state and repaint the page live, but nothing is written back to disk and nothing persists across a reload. To keep a look, copy the values you like into the `palette`, `typography`, `variant`, `lockedPhase`, `grain`, and `motion` defaults in `src/theme.js`.

### Reusing the field in another React app

The field is a self-contained component, and its runtime dependencies are React and `three` only. Consuming the published package needs nothing extra; copying the source also needs a bundler that supports Vite's `?raw` imports, because the shader files are imported as raw strings:

```js
import FRAG from '../shaders/lightfield.frag.glsl?raw';
```

To copy, take `src/components/LightField.jsx`, `src/shaders/`, and the palette and font helpers you want from `src/theme.js`. For the full page skin as well, bring `src/styles.css` and the Fontsource imports from `src/main.jsx`, or use the package's optional `styles.css` and `fonts.css` entries. Mount it behind your own content:

```jsx
import LightField from './components/LightField.jsx';
import { fontPairings, palettes, themeStyle } from './theme.js';

const palette = palettes.goldenHour;

export default function Page() {
  return (
    <div
      style={{
        ...themeStyle(palette, fontPairings.expressive),
        position: 'relative',
        isolation: 'isolate',
        minHeight: '100vh',
        background: 'var(--color-paper-deep)',
        color: 'var(--color-ink)',
      }}
    >
      <LightField palette={palette.light} variant="ember" grain={1} motion={1} />
      <main style={{ position: 'relative', zIndex: 1 }}>
        {/* your content */}
      </main>
    </div>
  );
}
```

`LightField` renders its own fixed, full-viewport wrapper sized to `100lvh` (`100vh` where `lvh` is unsupported), with `overflow: hidden`, `pointer-events: none`, and `z-index: 0`, and marks it `aria-hidden`. It needs no CSS import: the field supplies its own layer and paints from the palette you pass. Two things make reuse safe:

- Give the surrounding container `position: relative` and `isolation: isolate`, so the fixed layer stays inside a stacking context and paints behind your content.
- Give the content its own positioning and `z-index: 1` (or higher). Without it, the field can cover the page.

Page height comes from your content, not from the field.

#### Props

| Prop | Type | Default | Effect |
| --- | --- | --- | --- |
| `palette` | object or `null` | `null` | Expects `{ day: { top, middle, horizon }, sun: { core, edge, disc }, twilight: {...} }`, the `light` object of a theme palette. `null` keeps the colors already in the field. |
| `variant` | `'ember'` or `'twilight'` | `'ember'` | Selects the program. Any other value falls back to `ember`. |
| `lockedPhase` | number or `null` | `null` | `null` follows scroll. A number `0` to `1` pins that moment and snaps to it. |
| `grain` | number | `1` | Film grain amplitude. `1` is the intended look, `0` removes it. |
| `motion` | number | `1` | Clock multiplier. `0` freezes the breath, `1` is source speed, `2` doubles. Negative values clamp to `0`. |
| `className` | string | `''` | Applied to the fixed wrapper for scoped styling. |

### Fallback, context loss, and motion preferences

The field degrades in place:

- Before the WebGL canvas is ready, on machines without WebGL, and whenever a context is lost, a CSS underlay of the same hour (drawn from the same palette and phase) carries the field. The canvas fades in over it when the GPU is live, and a restored context brings the field back.
- The underlay tracks scroll directly while there is no live canvas, so the sky still moves without WebGL.

With `prefers-reduced-motion: reduce`, the time-driven breath pauses and the field renders on demand only. Scroll and pointer still drive it: the pointer nudge remains. Setting `motion` to `0` pauses the breath the same way. The stylesheet also removes its transitions for navigation, buttons, and choice chips under reduced motion. The page's smooth scrolling is enabled only when no reduced-motion preference is set.

## Quality tooling

The repository ships its own checks. Run them from the project root:

| Command | What it does |
| --- | --- |
| `npm run lint` | Lints the source. |
| `npm run test` | Runs the automated browser tests in a real Chromium browser through Playwright. |
| `npm run test:package` | Installs the real npm tarball into a temporary consumer, checks TypeScript usage and server rendering, then builds its CSS, fonts, and shaders with Vite. |
| `npm run build:lib` | Builds the library artifact only. `prepack` runs this automatically before packing or publishing. |
| `npm run check` | Runs lint, the browser tests, the demo build, and the package smoke check. |

Playwright needs its browser binary once per machine:

```bash
npx playwright install chromium
```

Linux CI images also need the system dependencies:

```bash
npx playwright install --with-deps chromium
```

Two GitHub Actions workflows ship with the repository. `.github/workflows/ci.yml` runs `npm run check` (lint, the Chromium tests, the demo build, and the package smoke test) on pull requests and pushes to `main`. Only after those checks pass on this repository's `main` does the workflow deploy the demo build to <https://paulkiernan.github.io/afterglow-template/>. Copies made with **Use this template** run the checks without trying to deploy to this project's Pages site.

The library release is separate. `.github/workflows/publish.yml` runs when a GitHub release is published: it verifies the release version against `package.json`, runs the same checks, publishes the exact packed tarball to GitHub Packages, and attaches that `.tgz` to the release.

In your own repository, enable GitHub Pages with **GitHub Actions** as its source and change the repository conditions in `ci.yml` to enable deployment. Before publishing your own package, change the package name, repository metadata, registry scope, and repository condition in `publish.yml`. The default guards prevent a copied template from attempting to publish under `@paulkiernan`.

## Licensing

The template and library are licensed under [MIT](LICENSE). You may use, modify, and redistribute them, including in commercial projects, while retaining the copyright and license notices.

Fraunces, Karla, and Stick No Bills retain their SIL Open Font License 1.1 terms. Their notices ship in `public/licenses/`, `dist/licenses/` for the demo, and `lib/licenses/` in the npm package. Third-party dependencies retain their respective licenses.
