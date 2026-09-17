/**
 * Types for the public entry of `@paulkiernan/afterglow`.
 *
 * Hand-written to match `src/theme.js` and `src/components/LightField.jsx`;
 * the build copies this file to `lib/index.d.ts` unchanged. Only the five
 * named exports below exist at runtime.
 */
import type { ComponentType, CSSProperties } from 'react';

/**
 * The eight surface, ink and decoration colours a palette carries.
 * `themeStyle` maps each one onto a `--color-*` custom property.
 */
export interface PaletteColors {
  /** Page surface. */
  paper: string;
  /** Deeper surface behind translucent panels. */
  paperDeep: string;
  /** Primary text. */
  ink: string;
  /** Secondary text and captions. */
  muted: string;
  /** Fill for controls and emphasis. */
  accent: string;
  /** Text and icons that sit on `accent`. */
  onAccent: string;
  /** Decorative highlight; not for body copy. */
  pop: string;
  /** Hairline borders drawn over paper. */
  line: string;
}

/**
 * The ember sky: three vertical bands, each with five stops read in scroll
 * order: morning, daylight, golden hour, sunset, dusk.
 */
export interface PaletteSky {
  top: string[];
  middle: string[];
  horizon: string[];
}

/** The single sun: three core colours (morning, day, dusk), rim and disc. */
export interface PaletteSun {
  core: string[];
  edge: string;
  disc: string;
}

/** The `twilight` program's own hour: a coral dome over cobalt. */
export interface PaletteTwilight {
  top: string;
  bottom: string;
  coral: string;
  red: string;
  purple: string;
  navy: string;
}

/** Every pigment the two GLSL programs read, as hex strings. */
export interface PaletteLight {
  day: PaletteSky;
  sun: PaletteSun;
  twilight: PaletteTwilight;
}

/** One named pigment set: its UI colours and its shader light. */
export interface Palette {
  /** Human-readable name, e.g. `"Golden Hour"`. */
  name: string;
  colors: PaletteColors;
  light: PaletteLight;
}

/** The five type roles a pairing fills; each maps to a `--font-*` property. */
export type FontRole = 'display' | 'wordmark' | 'serif' | 'body' | 'label';

/** A named set of CSS font stacks, one per {@link FontRole}. */
export interface FontPairing {
  name: string;
  fonts: Record<FontRole, string>;
}

/** Which GLSL program the field runs. */
export type LightFieldVariant = 'ember' | 'twilight';

export interface LightFieldProps {
  /**
   * Pigments for the sky and the sun. Omit it to keep the palette the field
   * is already painting; a malformed colour leaves the last good one in
   * place rather than rebuilding the program.
   */
  palette?: PaletteLight | null;
  /** `"ember"` scrolls the day arc; `"twilight"` is a fixed locked hour. */
  variant?: LightFieldVariant;
  /**
   * `0..1` moment to pin the day arc to (`0` morning, `1` dusk). `null`
   * follows the page scroll instead.
   */
  lockedPhase?: number | null;
  /** `0..1` strength the field multiplies into its film grain. */
  grain?: number;
  /** Clock speed multiplier; `1` is real time and `0` freezes the breath. */
  motion?: number;
  /** Extra class for the fixed, pointer-transparent wrapper. */
  className?: string;
}

/**
 * The site's sky: a full-viewport WebGL light field that fixes itself behind
 * the page, drives its own CSS underlay before the canvas is ready (and on
 * machines without WebGL, and while a context is lost), and cleans all of it
 * up on unmount. Renders `aria-hidden`; the page reads without it.
 */
export declare const LightField: ComponentType<LightFieldProps>;

/** Named pigment sets, keyed by id (the demo ships `goldenHour`, `moonrise`, `moss`). */
export declare const palettes: Record<string, Palette>;

/** Named font stacks, keyed by id (the demo ships `expressive`, `editorial`, `minimal`). */
export declare const fontPairings: Record<string, FontPairing>;

/**
 * The demo's starting point: a palette id, a typography id, a field variant,
 * plus the field's `lockedPhase`, `grain` and `motion` defaults.
 */
export interface Settings {
  /** Key into {@link palettes}. */
  palette: string;
  /** Key into {@link fontPairings}. */
  typography: string;
  variant: LightFieldVariant;
  /** Pinned moment, or `null` to follow scroll. */
  lockedPhase: number | null;
  grain: number;
  motion: number;
}

/** Defaults for the field and the theme; spread or read piecemeal. */
export declare const settings: Settings;

/**
 * The custom properties every component styles against, ready to spread onto
 * the app root: `<div className="app" style={themeStyle()}>`.
 */
export interface ThemeStyle extends CSSProperties {
  /** `colors.paper` */
  '--color-paper': string;
  /** `colors.paperDeep` */
  '--color-paper-deep': string;
  /** `colors.ink` */
  '--color-ink': string;
  /** `colors.muted` */
  '--color-muted': string;
  /** `colors.accent` */
  '--color-accent': string;
  /** `colors.onAccent` */
  '--color-on-accent': string;
  /** `colors.pop` */
  '--color-pop': string;
  /** `colors.line` */
  '--color-line': string;
  /** `fonts.display` */
  '--font-display': string;
  /** `fonts.wordmark` */
  '--font-wordmark': string;
  /** `fonts.serif` */
  '--font-serif': string;
  /** `fonts.body` */
  '--font-body': string;
  /** `fonts.label` */
  '--font-label': string;
}

/**
 * Palette + pairing -> CSS custom properties. Both arguments default to the
 * matching entry for {@link settings}, so `themeStyle()` is the demo look.
 */
export declare function themeStyle(palette?: Palette, pairing?: FontPairing): ThemeStyle;
