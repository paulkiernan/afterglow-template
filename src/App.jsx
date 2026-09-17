import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';
import { brand, elements, footer, hero, notes, studio } from './content';
import { fontPairings, palettes, settings, themeStyle } from './theme';
import {
  ArchInvitation,
  ChoiceGroup,
  Label,
  Panel,
  PaperCard,
  SectionHeading,
  SliderField,
  SprigDivider,
} from './components/primitives';

// Start the WebGL chunk at module load, so the field arrives in parallel with
// the first paint instead of after it. The page itself is plain React and
// renders without it: the shader is an upgrade, never a prerequisite.
const lightFieldChunk = import('./components/LightField');
const LightField = lazy(() => lightFieldChunk);

const PHASE_FOLLOW = 'follow';
const PHASE_HOLD = 'hold';

function ArrowDown() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M12 4v16M6 14l6 6 6-6" />
    </svg>
  );
}

export default function App() {
  const [paletteId, setPaletteId] = useState(settings.palette);
  const [typographyId, setTypographyId] = useState(settings.typography);
  const [variant, setVariant] = useState(settings.variant);
  const [phaseMode, setPhaseMode] = useState(
    settings.lockedPhase == null ? PHASE_FOLLOW : PHASE_HOLD,
  );
  const [phase, setPhase] = useState(settings.lockedPhase ?? studio.phase.defaultValue);
  const [grain, setGrain] = useState(settings.grain);
  const [motion, setMotion] = useState(settings.motion);
  const [preview, setPreview] = useState(false);

  const previewToggleRef = useRef(null);
  const previewExitRef = useRef(null);
  const previousPreview = useRef(preview);

  const palette = palettes[paletteId];
  const pairing = fontPairings[typographyId];
  const style = useMemo(() => themeStyle(palette, pairing), [palette, pairing]);

  // A held moment pins the field; otherwise scroll drives the day arc.
  const lockedPhase = phaseMode === PHASE_HOLD ? phase : null;

  // Shader-only preview: the page stays mounted (no scroll jump) but drops out
  // of sight and out of the tab order, so the field has the viewport to itself.
  useEffect(() => {
    if (!preview) return undefined;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [preview]);

  useEffect(() => {
    if (previousPreview.current === preview) return;
    previousPreview.current = preview;
    const target = preview ? previewExitRef.current : previewToggleRef.current;
    target?.focus({ preventScroll: true });
  }, [preview]);

  function reset() {
    setPaletteId(settings.palette);
    setTypographyId(settings.typography);
    setVariant(settings.variant);
    setPhaseMode(settings.lockedPhase == null ? PHASE_FOLLOW : PHASE_HOLD);
    setPhase(settings.lockedPhase ?? studio.phase.defaultValue);
    setGrain(settings.grain);
    setMotion(settings.motion);
  }

  function holdPhase(next) {
    setPhase(next);
    setPhaseMode(PHASE_HOLD);
  }

  const phaseOptions = [
    { id: PHASE_FOLLOW, label: studio.phase.follow },
    { id: PHASE_HOLD, label: studio.phase.hold },
  ];

  const caption = [
    palette.name,
    pairing.name,
    variant === 'twilight' ? 'twilight dome' : 'ember arc',
    phaseMode === PHASE_HOLD
      ? `held at ${Math.round(phase * 100)}%`
      : 'following the scroll',
  ].join(' · ');

  return (
    <div className="app" style={style} data-preview={preview ? '' : undefined}>
      <Suspense fallback={null}>
        <LightField
          palette={palette.light}
          variant={variant}
          lockedPhase={lockedPhase}
          grain={grain}
          motion={motion}
        />
      </Suspense>

      <div className="page">
        <header className="masthead">
          <div className="masthead-inner">
            <a className="brand" href="#top">
              {brand.name}
            </a>
            <nav aria-label="Sections">
              <ul className="nav-list">
                {brand.nav.map((item) => (
                  <li key={item.href}>
                    <a href={item.href}>{item.label}</a>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </header>

        <main>
          <section className="hero" id="top">
            <div className="hero-inner">
              <Label className="eyebrow hero-eyebrow">{hero.eyebrow}</Label>
              <h1 className="wordmark">{hero.wordmark}</h1>
              <SprigDivider className="hero-sprig" width={132} />
              <p className="hero-intro">{hero.intro}</p>
              <a className="hero-link" href="#studio">
                <span>{hero.scroll}</span>
                <ArrowDown />
              </a>
            </div>
            <p className="hero-hint">{hero.hint}</p>
          </section>

          <section className="studio" id="studio" aria-labelledby="studio-title">
            <Panel className="studio-panel">
              <SectionHeading id="studio-title" eyebrow={studio.eyebrow} title={studio.heading} />
              <p className="lede measure">{studio.intro}</p>

              <div className="studio-grid">
                <ChoiceGroup
                  box
                  legend={studio.palette.legend}
                  help={studio.palette.help}
                  name="studio-palette"
                  value={paletteId}
                  options={studio.palette.options}
                  onChange={setPaletteId}
                />
                <ChoiceGroup
                  box
                  legend={studio.typography.legend}
                  help={studio.typography.help}
                  name="studio-typography"
                  value={typographyId}
                  options={studio.typography.options}
                  onChange={setTypographyId}
                />
                <ChoiceGroup
                  box
                  legend={studio.program.legend}
                  help={studio.program.help}
                  name="studio-program"
                  value={variant}
                  options={studio.program.options}
                  onChange={setVariant}
                />
                <fieldset className="field phase-field">
                  <legend className="label field-legend">{studio.phase.legend}</legend>
                  <div className="field-stack">
                    <ChoiceGroup
                      name="studio-phase"
                      value={phaseMode}
                      options={phaseOptions}
                      onChange={setPhaseMode}
                    />
                    <SliderField
                      id="studio-phase"
                      label={studio.phase.sliderLabel}
                      value={phase}
                      onChange={holdPhase}
                      help={studio.phase.sliderHelp}
                    />
                  </div>
                </fieldset>
                <fieldset className="field texture-field">
                  <legend className="label field-legend">{studio.texture.legend}</legend>
                  <div className="field-stack">
                    <SliderField
                      id="studio-grain"
                      label={studio.texture.grain}
                      value={grain}
                      onChange={setGrain}
                      help={studio.texture.grainHelp}
                    />
                    <SliderField
                      id="studio-motion"
                      label={studio.texture.motion}
                      value={motion}
                      max={2}
                      step={0.1}
                      format={(next) => `${next.toFixed(1)}×`}
                      onChange={setMotion}
                      help={studio.texture.motionHelp}
                    />
                  </div>
                </fieldset>
              </div>

              <div className="studio-actions">
                <Label className="studio-caption">{caption}</Label>
                <div className="action-row">
                  <button type="button" className="button" onClick={reset}>
                    {studio.actions.reset}
                  </button>
                  <button
                    type="button"
                    className="button"
                    ref={previewToggleRef}
                    onClick={() => setPreview(true)}
                  >
                    {studio.actions.preview}
                  </button>
                </div>
              </div>

              <ul className="studio-notes">
                {studio.notes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            </Panel>
          </section>

          <section className="elements" id="elements" aria-labelledby="elements-title">
            <Panel width="wide">
              <SectionHeading id="elements-title" eyebrow={elements.eyebrow} title={elements.heading} />
              <p className="lede measure">{elements.intro}</p>

              <div className="card-grid">
                {elements.primitives.map((item) => (
                  <PaperCard
                    key={item.label}
                    label={item.label}
                    title={item.title}
                    body={item.body}
                    meta={item.meta}
                  />
                ))}
              </div>

              <div className="arch-demo">
                <div className="arch-copy">
                  <Label className="eyebrow">{elements.arch.label}</Label>
                  <h3 className="sub-heading">{elements.arch.title}</h3>
                  <p className="body-copy">{elements.arch.body}</p>
                </div>
                <ArchInvitation>
                  <Label className="eyebrow">{elements.demo.kicker}</Label>
                  <p className="arch-wordmark">{elements.demo.wordmark}</p>
                  <SprigDivider className="arch-sprig" width={112} />
                  <p className="arch-line">{elements.demo.line}</p>
                  <p className="arch-footer">{elements.demo.footer}</p>
                </ArchInvitation>
              </div>

              <div className="divider-demo">
                <SprigDivider width={124} />
                <p className="caption">{elements.divider.caption}</p>
              </div>
            </Panel>
          </section>

          <section className="notes" id="notes" aria-labelledby="notes-title">
            <Panel tone="deep">
              <SectionHeading id="notes-title" eyebrow={notes.eyebrow} title={notes.heading} />
              <p className="lede measure">{notes.intro}</p>

              <div className="notes-grid">
                {notes.items.map((item) => (
                  <div className="note" key={item.title}>
                    <h3 className="note-title">{item.title}</h3>
                    <p className="body-copy">{item.body}</p>
                    <ul className="path-list">
                      {item.paths.map((path) => (
                        <li key={path}>
                          <code>{path}</code>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>

              <div className="snippet">
                <Label className="eyebrow">{notes.snippet.title}</Label>
                <p className="caption">{notes.snippet.note}</p>
                <pre className="code-block">
                  <code>{notes.snippet.code}</code>
                </pre>
              </div>
            </Panel>
          </section>
        </main>

        <footer>
          <Panel tone="deep" width="narrow">
            <div className="colophon-inner">
              <p className="colophon-wordmark">{footer.wordmark}</p>
              <SprigDivider className="colophon-sprig" width={96} />
              <p className="colophon-line">{footer.line}</p>
              <p className="colophon-meta">{footer.meta}</p>
            </div>
          </Panel>
        </footer>
      </div>

      {preview ? (
        <div className="preview-bar" role="region" aria-label="Shader preview controls">
          <ChoiceGroup
            dense
            name="preview-palette"
            value={paletteId}
            options={studio.palette.options}
            onChange={setPaletteId}
          />
          <ChoiceGroup
            dense
            name="preview-program"
            value={variant}
            options={studio.program.options}
            onChange={setVariant}
          />
          <SliderField
            id="preview-phase"
            label={studio.phase.sliderLabel}
            value={phase}
            onChange={holdPhase}
            disabled={variant === 'twilight'}
          />
          <SliderField
            id="preview-grain"
            label={studio.texture.grain}
            value={grain}
            onChange={setGrain}
          />
          <button
            type="button"
            className="button"
            ref={previewExitRef}
            onClick={() => setPreview(false)}
          >
            {studio.actions.exitPreview}
          </button>
        </div>
      ) : null}
    </div>
  );
}
