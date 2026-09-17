// The page primitives. Each one is a shell: it holds your content and takes
// every colour and every face from the CSS custom properties themeStyle()
// writes onto .app. Nothing here knows about a particular palette, so a new
// theme repaints all of it.
//
// Page: Label, SectionHeading, Panel, PaperCard, ArchInvitation, SprigDivider.
// Studio fields: ChoiceGroup, SliderField.

export function Label({ className = '', children }) {
  return <p className={`label ${className}`.trim()}>{children}</p>;
}

// A heading with the signature glow: warm light sitting behind the words.
export function SectionHeading({ eyebrow, title, note, id, align = 'center', glow = true }) {
  return (
    <div className={`section-heading is-${align}`}>
      {eyebrow ? <Label className="eyebrow">{eyebrow}</Label> : null}
      <h2 className="section-title" id={id}>
        {glow ? <span className="section-glow" aria-hidden="true" /> : null}
        <span className="section-title-text">{title}</span>
      </h2>
      <span className="section-rule" aria-hidden="true" />
      {note ? <p className="section-note">{note}</p> : null}
    </div>
  );
}

// A wall in the light: a full-bleed band of translucent paper with hairline
// edges. The field glows in the gaps between panels.
export function Panel({ tone = 'paper', width = 'default', className = '', children }) {
  return (
    <div className={`panel tone-${tone} ${className}`.trim()}>
      <div className={`panel-inner width-${width}`}>{children}</div>
    </div>
  );
}

// A note on the surface: hairline, paper wash, asymmetric radius.
export function PaperCard({ label, title, body, meta, className = '', children }) {
  return (
    <article className={`paper-card ${className}`.trim()}>
      {label ? <Label className="eyebrow">{label}</Label> : null}
      {title ? <h3 className="paper-card-title">{title}</h3> : null}
      {body ? <p className="paper-card-body">{body}</p> : null}
      {meta ? <p className="paper-card-meta">{meta}</p> : null}
      {children}
    </article>
  );
}

// The arch: one strong curve, an inset hairline standing in for letterpress.
export function ArchInvitation({ className = '', children }) {
  return (
    <div className={`arch ${className}`.trim()}>
      <span className="arch-hairline" aria-hidden="true" />
      <div className="arch-body">{children}</div>
    </div>
  );
}

// A hairline rule with a botanical mark. Strokes are currentColor, so it takes
// the colour of whatever it sits in.
export function SprigDivider({ width = 96, className = '' }) {
  const height = (18 / 104) * width;
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 104 18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
      strokeLinecap="round"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path d="M1 9 H 38" opacity="0.7" />
      <circle cx="43" cy="9" r="1.1" fill="currentColor" stroke="none" />
      <path d="M52 1.5 C 56.5 5, 56.5 13, 52 16.5 C 47.5 13, 47.5 5, 52 1.5 Z" />
      <path d="M52 4 V 14" opacity="0.6" />
      <circle cx="61" cy="9" r="1.1" fill="currentColor" stroke="none" />
      <path d="M66 9 H 103" opacity="0.7" />
    </svg>
  );
}

// Radio chips. Native radios keep arrow-key navigation and grouping; the label
// is the visible target and the input stays focusable underneath it. Pass
// `box` for the paper field frame, nothing for bare chips.
export function ChoiceGroup({
  legend,
  help,
  name,
  value,
  options,
  onChange,
  dense = false,
  box = false,
}) {
  const className = `choice-field${box ? ' field' : ''}`;
  const body = (
    <>
      <div className="choice-row">
        {options.map((option) => (
          <label key={option.id} className="choice">
            <input
              type="radio"
              name={name}
              value={option.id}
              checked={option.id === value}
              onChange={() => onChange(option.id)}
            />
            <span className="choice-text">
              <span className="choice-label">{option.label}</span>
              {option.note ? <span className="choice-note">{option.note}</span> : null}
            </span>
          </label>
        ))}
      </div>
      {help ? <p className="field-help">{help}</p> : null}
    </>
  );

  if (!legend) {
    return (
      <div className={className} data-dense={dense ? '' : undefined}>
        {body}
      </div>
    );
  }
  return (
    <fieldset className={className} data-dense={dense ? '' : undefined}>
      <legend className="label field-legend">{legend}</legend>
      {body}
    </fieldset>
  );
}

export function SliderField({
  id,
  label,
  value,
  min = 0,
  max = 1,
  step = 0.05,
  disabled = false,
  box = false,
  format = (next) => `${Math.round(next * 100)}%`,
  onChange,
  help,
}) {
  return (
    <div className={`slider-field${box ? ' field' : ''}`}>
      <div className="slider-head">
        <label className="label field-legend" htmlFor={id}>
          {label}
        </label>
        <output className="slider-value" htmlFor={id}>
          {format(value)}
        </output>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      {help ? <p className="field-help">{help}</p> : null}
    </div>
  );
}
