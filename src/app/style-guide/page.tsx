import { notFound } from 'next/navigation';

if (process.env.NODE_ENV === 'production') {
  notFound();
}

// ---- helpers ----------------------------------------------------------------

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-6">
      <h2 className="font-display text-3xl font-bold border-b border-border pb-3 text-foreground">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Swatch({
  label,
  sub,
  style,
  className,
  textClass = 'text-neutral-700',
}: {
  label: string;
  sub?: string;
  style?: React.CSSProperties;
  className?: string;
  textClass?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5 items-start">
      <div
        className={`w-20 h-20 rounded-lg border border-border ${className ?? ''}`}
        style={style}
      />
      <span className="text-sm font-medium text-foreground leading-none">{label}</span>
      {sub && <span className="text-xs text-muted-foreground leading-none">{sub}</span>}
    </div>
  );
}

// ---- Semantic color rows ----------------------------------------------------

const semanticTokens = [
  { name: 'background',         var: '--background' },
  { name: 'foreground',         var: '--foreground' },
  { name: 'card',               var: '--card' },
  { name: 'card-foreground',    var: '--card-foreground' },
  { name: 'primary',            var: '--primary' },
  { name: 'primary-foreground', var: '--primary-foreground' },
  { name: 'accent',             var: '--accent' },
  { name: 'accent-foreground',  var: '--accent-foreground' },
  { name: 'secondary',          var: '--secondary' },
  { name: 'secondary-foreground', var: '--secondary-foreground' },
  { name: 'muted',              var: '--muted' },
  { name: 'muted-foreground',   var: '--muted-foreground' },
  { name: 'destructive',        var: '--destructive' },
  { name: 'border',             var: '--border' },
  { name: 'input',              var: '--input' },
  { name: 'ring',               var: '--ring' },
] as const;

// Primitive palette rows
const primitiveRows = [
  {
    label: 'Cream',
    shades: [
      { name: '50',  var: '--cream-50',  sub: 'oklch(0.99 0.010 85)' },
      { name: '200', var: '--cream-200', sub: 'oklch(0.95 0.030 80)' },
      { name: '400', var: '--cream-400', sub: 'oklch(0.88 0.050 75)' },
      { name: '600', var: '--cream-600', sub: 'oklch(0.78 0.060 72)' },
      { name: '800', var: '--cream-800', sub: 'oklch(0.65 0.070 70)' },
    ],
  },
  {
    label: 'Amber',
    shades: [
      { name: '50',  var: '--amber-50',  sub: 'oklch(0.98 0.040 95)' },
      { name: '200', var: '--amber-200', sub: 'oklch(0.92 0.100 85)' },
      { name: '400', var: '--amber-400', sub: 'oklch(0.82 0.170 80)' },
      { name: '600', var: '--amber-600', sub: 'oklch(0.70 0.180 65)' },
      { name: '800', var: '--amber-800', sub: 'oklch(0.55 0.150 55)' },
    ],
  },
  {
    label: 'Sky Blue',
    shades: [
      { name: '50',  var: '--sky-50',  sub: 'oklch(0.97 0.030 220)' },
      { name: '200', var: '--sky-200', sub: 'oklch(0.90 0.080 220)' },
      { name: '400', var: '--sky-400', sub: 'oklch(0.75 0.150 225)' },
      { name: '600', var: '--sky-600', sub: 'oklch(0.58 0.180 230)' },
      { name: '800', var: '--sky-800', sub: 'oklch(0.42 0.150 235)' },
    ],
  },
  {
    label: 'Neutral',
    shades: [
      { name: '50',  var: '--neutral-50',  sub: 'oklch(0.97 0.005 240)' },
      { name: '100', var: '--neutral-100', sub: 'oklch(0.94 0.010 240)' },
      { name: '200', var: '--neutral-200', sub: 'oklch(0.85 0.010 240)' },
      { name: '400', var: '--neutral-400', sub: 'oklch(0.58 0.010 240)' },
      { name: '600', var: '--neutral-600', sub: 'oklch(0.40 0.010 240)' },
      { name: '700', var: '--neutral-700', sub: 'oklch(0.30 0.010 240)' },
      { name: '800', var: '--neutral-800', sub: 'oklch(0.22 0.010 240)' },
      { name: '900', var: '--neutral-900', sub: 'oklch(0.18 0.010 240)' },
    ],
  },
];

// ---- page -------------------------------------------------------------------

export default function StyleGuidePage() {
  return (
    <main className="bg-background min-h-screen">
      <div className="max-w-5xl mx-auto p-8 space-y-16">

        {/* Header */}
        <div className="space-y-3">
          <h1 className="font-display text-5xl font-bold text-foreground">
            Style Guide
          </h1>
          <p className="text-muted-foreground text-lg">
            Dev-only token reference — not visible in production. Use the theme toggle to preview both modes.
          </p>
        </div>

        {/* ---- Colors: Semantic tokens ---- */}
        <Section title="Semantic Tokens">
          <p className="text-sm text-muted-foreground">
            These map to OKLCH primitives and switch automatically with the theme toggle.
          </p>
          <div className="flex flex-wrap gap-6">
            {semanticTokens.map((token) => (
              <Swatch
                key={token.name}
                label={token.name}
                sub={token.var}
                style={{ backgroundColor: `var(${token.var})` }}
              />
            ))}
          </div>
        </Section>

        {/* ---- Colors: Primitive palette ---- */}
        <Section title="Primitive Palette">
          <p className="text-sm text-muted-foreground">
            Raw OKLCH values — always fixed regardless of theme.
          </p>
          <div className="space-y-8">
            {primitiveRows.map((row) => (
              <div key={row.label} className="space-y-3">
                <h3 className="font-display text-lg font-semibold text-foreground">{row.label}</h3>
                <div className="flex flex-wrap gap-5">
                  {row.shades.map((shade) => (
                    <Swatch
                      key={shade.var}
                      label={`${row.label} ${shade.name}`}
                      sub={shade.sub}
                      style={{ backgroundColor: `var(${shade.var})` }}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* ---- Typography ---- */}
        <Section title="Typography">
          <div className="space-y-10">

            {/* Display / Headings — Bricolage Grotesque */}
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground font-mono">
                font-display — Bricolage Grotesque
              </p>

              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Hero — text-7xl / font-bold</p>
                <p className="font-display text-7xl font-bold text-foreground leading-none">
                  Make Something
                </p>
              </div>

              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">h1 — text-5xl / font-bold</p>
                <h1 className="font-display text-5xl font-bold text-foreground">Heading One</h1>
              </div>

              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">h2 — text-4xl / font-bold</p>
                <h2 className="font-display text-4xl font-bold text-foreground">Heading Two</h2>
              </div>

              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">h3 — text-3xl / font-semibold</p>
                <h3 className="font-display text-3xl font-semibold text-foreground">Heading Three</h3>
              </div>

              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">h4 — text-2xl / font-semibold</p>
                <h4 className="font-display text-2xl font-semibold text-foreground">Heading Four</h4>
              </div>

              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">h5 — text-xl / font-semibold</p>
                <h5 className="font-display text-xl font-semibold text-foreground">Heading Five</h5>
              </div>

              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">h6 — text-lg / font-medium</p>
                <h6 className="font-display text-lg font-medium text-foreground">Heading Six</h6>
              </div>
            </div>

            {/* Body text — Figtree */}
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground font-mono">
                font-sans — Figtree
              </p>

              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Body large — text-lg / font-normal</p>
                <p className="font-sans text-lg text-foreground max-w-prose">
                  Anyone can create a unique, personal song in seconds — no musical skill required.
                  Describe your mood, pick a style, and let the AI compose something just for you.
                </p>
              </div>

              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Body default — text-base / font-normal</p>
                <p className="font-sans text-base text-foreground max-w-prose">
                  Notera uses HeartMuLa, an open-source music model, to produce 30-second
                  tracks from a text prompt. Tracks are stored in Cloudflare R2 and streamed via
                  a presigned URL.
                </p>
              </div>

              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Small — text-sm / font-medium</p>
                <p className="font-sans text-sm font-medium text-muted-foreground">
                  Processing usually takes about 7 seconds on an RTX 4090.
                </p>
              </div>

              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Label — text-xs / font-semibold / uppercase</p>
                <p className="font-sans text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Category Label
                </p>
              </div>
            </div>
          </div>
        </Section>

        {/* ---- Spacing & Radius ---- */}
        <Section title="Spacing &amp; Radius">
          <div className="space-y-10">

            {/* Border Radius */}
            <div className="space-y-4">
              <h3 className="font-display text-xl font-semibold text-foreground">Border Radius</h3>
              <div className="flex flex-wrap gap-6 items-end">
                {[
                  { label: 'rounded-sm', cls: 'rounded-sm', val: '8px' },
                  { label: 'rounded-md', cls: 'rounded-md', val: '12px' },
                  { label: 'rounded-lg', cls: 'rounded-lg', val: '16px' },
                  { label: 'rounded-xl', cls: 'rounded-xl', val: '24px' },
                  { label: 'rounded-full', cls: 'rounded-full', val: '9999px' },
                ].map((r) => (
                  <div key={r.label} className="flex flex-col gap-1.5 items-start">
                    <div
                      className={`w-20 h-20 bg-primary/20 border-2 border-primary ${r.cls}`}
                    />
                    <span className="text-sm font-medium text-foreground">{r.label}</span>
                    <span className="text-xs text-muted-foreground">{r.val}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Spacing scale */}
            <div className="space-y-4">
              <h3 className="font-display text-xl font-semibold text-foreground">Spacing Scale</h3>
              <p className="text-sm text-muted-foreground">Base unit: 4px. Values shown as horizontal bars.</p>
              <div className="space-y-3">
                {[
                  { label: '1 (4px)',   width: 'w-1' },
                  { label: '2 (8px)',   width: 'w-2' },
                  { label: '3 (12px)',  width: 'w-3' },
                  { label: '4 (16px)',  width: 'w-4' },
                  { label: '6 (24px)',  width: 'w-6' },
                  { label: '8 (32px)',  width: 'w-8' },
                  { label: '12 (48px)', width: 'w-12' },
                  { label: '16 (64px)', width: 'w-16' },
                ].map((s) => (
                  <div key={s.label} className="flex items-center gap-4">
                    <div className={`h-4 bg-accent rounded-sm ${s.width}`} />
                    <span className="text-sm text-muted-foreground font-mono">{s.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Section>

        {/* ---- Shadows ---- */}
        <Section title="Shadows">
          <div className="flex flex-wrap gap-8">
            {[
              { label: 'shadow-subtle',   cls: 'shadow-subtle',   desc: '1px 3px — cards, inputs' },
              { label: 'shadow-medium',   cls: 'shadow-medium',   desc: '4px 6px — dropdowns, modals' },
              { label: 'shadow-elevated', cls: 'shadow-elevated', desc: '10px 15px — dialogs, popovers' },
            ].map((s) => (
              <div key={s.label} className="flex flex-col gap-3 items-start">
                <div
                  className={`w-48 h-28 bg-card rounded-lg flex items-center justify-center ${s.cls}`}
                >
                  <span className="text-card-foreground text-sm font-mono">{s.label}</span>
                </div>
                <p className="text-xs text-muted-foreground">{s.desc}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* footer */}
        <div className="border-t border-border pt-6 pb-12">
          <p className="text-sm text-muted-foreground text-center">
            Dev-only style guide — returns 404 in production (NODE_ENV gate at top of file)
          </p>
        </div>

      </div>
    </main>
  );
}
