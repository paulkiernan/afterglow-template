/**
 * Customize the page and shader here.
 *
 * colors: paper/paperDeep surfaces, ink/muted text, accent/onAccent controls,
 * pop decorative highlights, and line borders.
 * fonts: display, wordmark, serif, body, and tracked-uppercase label roles.
 *
 * light.day: top/middle/horizon sky bands, each with five stops ordered
 * morning, daylight, golden hour, sunset, dusk (phases 0, .32, .68, .87, 1).
 * light.sun: three core colors (morning/day/dusk), plus edge and disc colors.
 * light.twilight: a separate dome program with its own sky and glow.
 *
 * goldenHour uses the ember program's pigments, written as hex RGB.
 * The bundled Fraunces, Karla, and Stick No Bills fonts are SIL OFL. To use
 * other licensed fonts, load them in main.jsx or CSS, then change the font
 * stacks below.
 */

/**
 * @typedef {Object} PaletteLight
 * @property {{top: string[], middle: string[], horizon: string[]}} day
 * @property {{core: string[], edge: string, disc: string}} sun
 * @property {{top: string, bottom: string, coral: string, red: string,
 *             purple: string, navy: string}} twilight
 */

/**
 * @typedef {Object} Palette
 * @property {string} name
 * @property {Record<'paper'|'paperDeep'|'ink'|'muted'|'accent'|'onAccent'|'pop'|'line', string>} colors
 * @property {PaletteLight} light
 */

/**
 * @typedef {Object} FontPairing
 * @property {string} name
 * @property {Record<'display'|'wordmark'|'serif'|'body'|'label', string>} fonts
 */

/** @type {Record<string, Palette>} */
export const palettes = {
  // The warm default: linen, bark, rose, and a hot-pink pop over the ember
  // light field.
  goldenHour: {
    name: 'Golden Hour',
    colors: {
      paper: '#faf4e7', // cream-50
      paperDeep: '#f3ead4', // cream-100
      ink: '#3a2f23', // bark-900, 11.9:1 on paper
      muted: '#5f5442', // bark-600, 6.8:1 on paper
      // rose-500 (#b55f5f) deepened a touch so cream text clears AA on it
      // (4.8:1). The undarkened rose still lives on as line/paper fills.
      accent: '#a85252',
      onAccent: '#faf4e7',
      pop: '#f0559a', // hot-pink highlight, decorative
      line: '#e8c4c4', // rose-200, the hairline tone over cream
    },
    light: {
      day: {
        // upper sky: butter morning, amber noon, orange golden hour, then
        // the dusk blue settling over the ember end of the day
        top: ['#ffeab0', '#ffdf8f', '#ff9a45', '#45509e', '#33409f'],
        // band between horizon and top, carrying the pink of the later hours
        middle: ['#ffc95e', '#ff9a45', '#f0559a', '#c05585', '#4353b5'],
        // the low, hot band: apricot dawn through deep red to cobalt dusk
        horizon: ['#ff8a4a', '#f2603d', '#d4403a', '#ff8a55', '#4a4fa8'],
      },
      sun: {
        core: ['#fff7e0', '#ffbf7a', '#ff9067'], // morning, day, dusk
        edge: '#f37a51', // rim the disc eases into as it sinks
        disc: '#fffefb', // the disc body, near-white
      },
      // Locked sunset: coral dome over cobalt, corners falling to navy.
      // These are the dome program's colors.
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

  // Cool inversion of the same walk: lilac morning into an indigo night,
  // with a pale moon standing in for the sun. Indigo/lilac UI.
  moonrise: {
    name: 'Moonrise',
    colors: {
      paper: '#f4f2f8',
      paperDeep: '#e7e3f0',
      ink: '#1b1830', // 15.5:1 on paper
      muted: '#4d4966', // 7.7:1 on paper
      accent: '#57479c', // deep indigo, 6.9:1 with onAccent
      onAccent: '#f6f4fb',
      pop: '#b06fd6', // lilac highlight, decorative
      line: '#d9d3e8',
    },
    light: {
      day: {
        // upper sky: pale lilac dawn, periwinkle noon, the violet hour,
        // then indigo sinking to a near-black night
        top: ['#cfd6f2', '#a9b4e4', '#5c5aa8', '#3d3480', '#14143a'],
        middle: ['#ded9f4', '#bdb9ea', '#8d80cc', '#5b4590', '#1c1b4e'],
        horizon: ['#f6e6f2', '#e2cdf0', '#b98fdc', '#8a5cc0', '#2d2a66'],
      },
      sun: {
        core: ['#fffaff', '#ece3ff', '#c9b2f0'], // moon: white, cool, lilac
        edge: '#a98ce0',
        disc: '#fbf8ff',
      },
      // Locked sunset: a lilac dome over an indigo field, the same upward U
      // the cobalt dusk draws, corners falling to a deeper blue-black.
      twilight: {
        top: '#14173c',
        bottom: '#2f3a8f',
        coral: '#c9a2e8',
        red: '#8a63c4',
        purple: '#4a3a8a',
        navy: '#0e1030',
      },
    },
  },

  // Dry inland daylight: sage and straw that heat into ochre
  // and settle into forest green. Sage/ochre UI.
  moss: {
    name: 'Moss',
    colors: {
      paper: '#f3f1e3',
      paperDeep: '#e6e3d0',
      ink: '#1f2a1d', // 13.2:1 on paper
      muted: '#4e5a44', // 6.5:1 on paper
      accent: '#4d6b3f', // deep sage, 5.4:1 with onAccent
      onAccent: '#f4f2e6',
      pop: '#c9862f', // ochre highlight, decorative
      line: '#cdd3bb',
    },
    light: {
      day: {
        // upper sky: straw dawn, clear sage noon, an ochre haze at the warm
        // hour, then olive and forest dark
        top: ['#ecebcd', '#cbd6b4', '#c3ab6a', '#5f5c37', '#22271d'],
        middle: ['#e6ddae', '#c0c98d', '#d0a94e', '#4c4b2b', '#1b2117'],
        horizon: ['#f2daa2', '#dfc785', '#d9a03f', '#6d4f22', '#2e2a1c'],
      },
      sun: {
        core: ['#fff6d8', '#ffe3a3', '#e8ab5e'],
        edge: '#cf9042',
        disc: '#fffcf0',
      },
      // Locked sunset: an amber dome burning down through umber and olive
      // into a deep pine field, corners to near-black green.
      twilight: {
        top: '#16261f',
        bottom: '#2f5346',
        coral: '#e0a45c',
        red: '#c4703f',
        purple: '#5c6b4a',
        navy: '#0f1c15',
      },
    },
  },
};

/** @type {Record<string, FontPairing>} */
export const fontPairings = {
  // The template's default voice: Fraunces bold for display and wordmark,
  // Fraunces italic as the quiet secondary serif, Karla for body copy,
  // Stick No Bills for tracked uppercase labels.
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

  // Print-leaning alternative built from faces already on the machine:
  // Georgia for everything that carries voice, system-ui for body copy,
  // a mono stack for labels. No font downloads at all.
  editorial: {
    name: 'Editorial',
    fonts: {
      display: 'Georgia, "Times New Roman", Times, serif',
      wordmark: 'Georgia, "Times New Roman", Times, serif',
      serif: 'Georgia, "Times New Roman", Times, serif',
      body: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      label: 'ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace',
    },
  },

  // Quietest option: system sans everywhere, ui-monospace for labels,
  // ui-serif for the rare serif line. Nothing to load, nothing to notice.
  minimal: {
    name: 'Minimal',
    fonts: {
      display: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      wordmark: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      serif: 'ui-serif, Georgia, "Times New Roman", serif',
      body: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      label: 'ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace',
    },
  },
};

// Demo defaults: the warm palette, the expressive type, the ember program
// scrolling the full day. `lockedPhase` pins the field to one moment instead
// of following scroll (null = follow scroll); `grain` is a 0..1 strength the
// field multiplies into its film grain, and `motion` is a speed multiplier on
// the field's clock (1 = real time, 2 = double, 0 freezes).
export const settings = {
  palette: 'goldenHour',
  typography: 'expressive',
  variant: 'ember',
  lockedPhase: null,
  grain: 1,
  motion: 1,
};

/**
 * Palette + pairing -> the CSS custom properties every component styles
 * against. Spread onto the app root: `<div className="app" style={...}>`.
 *
 * @param {Palette} [palette]
 * @param {FontPairing} [pairing]
 * @returns {Record<string, string>}
 */
export function themeStyle(
  palette = palettes[settings.palette],
  pairing = fontPairings[settings.typography],
) {
  const { colors } = palette;
  const { fonts } = pairing;

  return {
    '--color-paper': colors.paper,
    '--color-paper-deep': colors.paperDeep,
    '--color-ink': colors.ink,
    '--color-muted': colors.muted,
    '--color-accent': colors.accent,
    '--color-on-accent': colors.onAccent,
    '--color-pop': colors.pop,
    '--color-line': colors.line,
    '--font-display': fonts.display,
    '--font-wordmark': fonts.wordmark,
    '--font-serif': fonts.serif,
    '--font-body': fonts.body,
    '--font-label': fonts.label,
  };
}
