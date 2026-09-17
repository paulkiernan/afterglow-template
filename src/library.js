/**
 * The public entry for `@paulkiernan/afterglow`.
 *
 * Five named exports and no CSS: the field component and the theme data it
 * reads, in one place. Stylesheets stay opt-in subpaths
 * (`@paulkiernan/afterglow/styles.css`, `.../fonts.css`) so importing the
 * library never injects globals into a consumer's page.
 *
 * `LightField` is the same component the demo renders, with its own GLSL
 * sources inlined at build time, so no shader ever has to be copied by hand.
 */

export { default as LightField } from './components/LightField.jsx';
export { fontPairings, palettes, settings, themeStyle } from './theme.js';
