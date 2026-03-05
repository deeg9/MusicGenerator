# Phase 6: Component Audit + Core Redesign - Research

**Researched:** 2026-03-05
**Domain:** React component styling — Tailwind v4 semantic tokens, WaveSurfer.js v7 theme sync
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Accent Color Mapping**
- Amber (--accent) for all CTA/action buttons: Download MP3, Submit/Generate, Hero CTA
- Sky-blue (--primary) for interactive/playback elements: play/pause button, waveform progress bar, active card ring + glow
- EQ loading bars use amber gradient (from-accent to-accent/70) — generating is an action
- Secondary/outline buttons use neutral tokens: border-border text-foreground hover:bg-secondary
- Active variant card ring: ring-primary/50 shadow-primary/10 (sky-blue, "this is playing")
- Error text uses --destructive token everywhere (replaces hardcoded text-red-400)

**Hero Section Redesign**
- Big and bold: 6xl-7xl headline with Bricolage Grotesque, generous py-24 padding
- Amber radial glow/gradient blob behind the headline — editorial, retro-futuristic feel
- Hero CTA button: bg-accent text-accent-foreground (amber, consistent with amber=action rule)
- Typewriter animated words: text-primary (sky-blue) to differentiate from headline text-foreground
- Keep existing SVG waveform as background texture, combine with amber glow

**Card & Result Styling**
- VariantCard base: bg-card border-border shadow-subtle (warm, floating cards)
- Download MP3 button: full amber (bg-accent text-accent-foreground rounded-lg)
- WAV/secondary download: neutral outline (border-border text-foreground hover:bg-secondary)
- All card metadata (variant label, duration, file size): text-muted-foreground
- Hover lift effect deferred to Phase 7 (Framer Motion whileHover)

**Waveform Theme Sync**
- Progress bar: sky-blue (--primary) in both modes
- Wave background color: --muted token
- Play/pause button: solid bg-primary text-primary-foreground rounded-full
- Theme change: wavesurfer.setOptions() re-init with new hex from getComputedStyle() — no destroy/recreate, no audio interruption
- Loading placeholder: bg-muted (replaces bg-zinc-800)

### Claude's Discretion
- Exact implementation of amber radial glow (CSS radial-gradient vs pseudo-element)
- EnhancedCaptionDisplay styling (minor component, follow card patterns)
- GenerationPage container styling (bg-zinc-950 → bg-background + layout adjustments)
- ModeToggle and GenreChips token updates (already partially using semantic tokens)
- Grep audit methodology and ordering of component updates
- How to read OKLCH values from CSS vars for wavesurfer JS hex conversion

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| COMP-01 | Hero section reflects the warm brand with updated colors, typography, and layout | Hero redesign: 6xl-7xl Bricolage headline, amber glow blob, bg-accent CTA, text-primary typewriter, py-24 padding |
| COMP-02 | Generation form (inputs, buttons, mode toggle, tags) uses brand tokens throughout | Form audit: GenerationForm already mostly clean; GenreChips chip selection state needs accent→accent mapping per decision; submit button bg-primary→bg-accent |
| COMP-03 | Loading animation and error banners use brand colors and feel cohesive with the new design | LoadingAnimation: from-violet-600→from-accent; WaveformPlayer error: text-red-400→text-destructive; GenerationPage error banner already uses semantic tokens |
| COMP-04 | Waveform player and result cards use brand accent colors, updating dynamically on theme switch | WaveformPlayer: hardcoded hex colors → wavesurfer.setOptions() on resolvedTheme change; VariantCard: full zinc/violet → semantic token rewrite |
| COMP-05 | Example cards use brand styling with warm card backgrounds and updated typography | ExampleCard already uses bg-card/text-foreground/border-border — mostly compliant; WaveformPlayer inside it needs token update |
</phase_requirements>

---

## Summary

Phase 6 is a targeted styling audit and refactor — not an architectural change. The token system is fully built (Phase 5 complete). The task is replacing hardcoded Tailwind palette classes (bg-zinc-*, text-zinc-*, bg-violet-*, text-red-*) with the semantic token utilities already defined in globals.css.

**Hardcoded color violations found via grep audit:**

| Component | Violations |
|-----------|-----------|
| `WaveformPlayer.tsx` | `bg-violet-600`, `hover:bg-violet-500`, `bg-zinc-800` (loading placeholder), `text-zinc-500` (time display), `text-red-400` (error), `waveColor: '#3f3f46'`, `progressColor: '#8b5cf6'` (JS hex strings) |
| `VariantCard.tsx` | `bg-zinc-900`, `border-zinc-800`, `border-violet-500/50`, `shadow-violet-500/10`, `ring-violet-500/50`, `text-zinc-400`, `text-zinc-500`, `bg-violet-600`, `hover:bg-violet-500`, `border-zinc-700`, `text-zinc-300` |
| `GenerationPage.tsx` | `bg-zinc-950`, `text-white`, `text-zinc-400` |
| `EnhancedCaptionDisplay.tsx` | `border-zinc-700`, `bg-zinc-900/50`, `text-zinc-500`, `text-zinc-300` |
| `LoadingAnimation.tsx` | `from-violet-600`, `to-violet-400` (EQ bar gradient) |
| `HeroSection.tsx` | CTA button uses `bg-primary` (should be `bg-accent`); headline font size needs 6xl-7xl upgrade; no amber glow blob |

The most complex task is WaveformPlayer: the JS library (wavesurfer.js) renders into a Shadow DOM using canvas — CSS variables are not inherited. Colors must be passed as resolved hex/rgb strings, requiring a helper to read OKLCH values at runtime and convert for wavesurfer.setOptions().

**Primary recommendation:** Audit in component dependency order (leaf nodes first), use `wavesurfer.setOptions()` with getComputedStyle hex resolution for theme sync, and use a small inline oklch-to-rgb converter rather than adding a color library dependency.

---

## Standard Stack

### Core (Already Installed — No New Dependencies)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Tailwind v4 | ^4 | Utility classes via semantic token utilities | Already configured with @theme inline bridge |
| next-themes | ^0.4.6 | `useTheme()` hook, `resolvedTheme` for dark/light detection | Already wired in ThemeProvider |
| wavesurfer.js | ^7.12.1 | Waveform rendering — JS-only, Shadow DOM canvas | Already used; v7 exposes `setOptions()` |
| @wavesurfer/react | ^1.0.12 | `useWavesurfer()` hook — returns wavesurfer instance | Already used |
| lucide-react | ^0.577.0 | Play/Pause icons | Already used |

### No New Dependencies Required

This phase requires zero new npm installs. The OKLCH → hex conversion needed for wavesurfer.js is a small (< 20 line) pure JS function that can live in `src/lib/colors.ts`. Alternatives like `culori` would add ~30KB and are unnecessary given the small scope.

---

## Architecture Patterns

### Recommended Component Update Order

Update leaf components first to avoid blocking dependencies:

```
1. EnhancedCaptionDisplay.tsx    — no dependencies, trivial swap
2. LoadingAnimation.tsx          — no dependencies, gradient class swap
3. WaveformPlayer.tsx            — core reuse, theme sync logic here
4. VariantCard.tsx               — depends on WaveformPlayer
5. GenerationPage.tsx            — depends on LoadingAnimation, VariantCard
6. HeroSection.tsx               — depends on ExampleCard → WaveformPlayer
7. ExampleCard.tsx               — already mostly token-clean; verify after WaveformPlayer update
```

### Pattern 1: Semantic Token Class Replacement

**What:** Replace every hardcoded Tailwind palette class with its semantic token equivalent.
**When to use:** All components except WaveformPlayer's JS color options.

Token mapping for this phase:

| Hardcoded | Semantic Token | Notes |
|-----------|----------------|-------|
| `bg-zinc-950` | `bg-background` | GenerationPage container |
| `bg-zinc-900` | `bg-card` | VariantCard base |
| `bg-zinc-800` | `bg-muted` | Loading placeholder |
| `border-zinc-800` | `border-border` | VariantCard inactive border |
| `border-zinc-700` | `border-border` | Secondary download, EnhancedCaption |
| `text-zinc-400` / `text-zinc-500` | `text-muted-foreground` | Metadata, time display |
| `text-zinc-300` | `text-foreground` | Body text in cards |
| `text-white` | `text-foreground` | GenerationPage header |
| `bg-violet-600` | `bg-primary` (play button) OR `bg-accent` (CTA/download) | Apply amber=action rule |
| `hover:bg-violet-500` | `hover:bg-primary/90` or `hover:bg-accent/90` | Match base |
| `border-violet-500/50` | `ring-primary/50` | Active card ring (locked decision) |
| `shadow-violet-500/10` | `shadow-primary/10` | Active card shadow (locked decision) |
| `text-red-400` | `text-destructive` | Error messages |
| `from-violet-600 to-violet-400` | `from-accent to-accent/70` | EQ bars (locked: amber=action) |

### Pattern 2: WaveformPlayer Theme Sync (CRITICAL)

**What:** wavesurfer.js renders into Shadow DOM via canvas. CSS custom properties are NOT inherited. Colors must be resolved to hex/rgb strings and passed via `wavesurfer.setOptions()`.

**Key discovery from source code analysis:** `useWavesurfer()` from `@wavesurfer/react` spreads all option values as `useEffect` deps — changing `waveColor` or `progressColor` props causes a full `destroy()` + `create()` cycle which interrupts audio. The correct approach is to keep initial options static and call `wavesurfer.setOptions()` imperatively on `resolvedTheme` changes.

**Implementation pattern:**

```typescript
// src/lib/colors.ts — pure OKLCH to hex converter, no deps
// Source: Community-validated math from OKLAB spec
function oklchToHex(l: number, c: number, h: number): string {
  const hRad = (h * Math.PI) / 180;
  const a = c * Math.cos(hRad);
  const b = c * Math.sin(hRad);
  // OKLAB → linear sRGB
  const lr = l + 0.3963377774 * a + 0.2158037573 * b;
  const lg = l - 0.1055613458 * a - 0.0638541728 * b;
  const lb = l - 0.0894841775 * a - 1.2914855480 * b;
  const r = Math.max(0, Math.min(1, srgbGamma(lr ** 3)));
  const g = Math.max(0, Math.min(1, srgbGamma(lg ** 3)));
  const bv = Math.max(0, Math.min(1, srgbGamma(lb ** 3)));
  return `#${toHex(r)}${toHex(g)}${toHex(bv)}`;
}
function srgbGamma(v: number): number {
  return v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055;
}
function toHex(v: number): string {
  return Math.round(v * 255).toString(16).padStart(2, '0');
}

export function getCssColorAsHex(varName: string, el: Element): string {
  const raw = getComputedStyle(el).getPropertyValue(varName).trim();
  // raw is "oklch(L C H)" — parse and convert
  const m = raw.match(/oklch\(([0-9.]+)\s+([0-9.]+)\s+([0-9.]+)/);
  if (!m) return '#888888'; // fallback
  return oklchToHex(parseFloat(m[1]), parseFloat(m[2]), parseFloat(m[3]));
}
```

```typescript
// WaveformPlayer.tsx — theme sync via resolvedTheme + setOptions
import { useTheme } from 'next-themes';
import { getCssColorAsHex } from '@/lib/colors';

// In component:
const { resolvedTheme } = useTheme();
const containerRef = useRef<HTMLDivElement>(null);

// Static init options — no waveColor/progressColor here to prevent destroy/recreate
const { wavesurfer } = useWavesurfer({
  container: containerRef,
  url,
  barWidth: 3, barGap: 1, barRadius: 2, height: 64,
  interact: true, normalize: true, fillParent: true,
  waveColor: '#888',    // placeholder — overwritten immediately in effect below
  progressColor: '#0ea5e9',
});

// Re-apply colors on theme change (no audio interruption)
useEffect(() => {
  if (!wavesurfer || !containerRef.current) return;
  const el = containerRef.current;
  wavesurfer.setOptions({
    waveColor: getCssColorAsHex('--muted', el),
    progressColor: getCssColorAsHex('--primary', el),
  });
}, [wavesurfer, resolvedTheme]);
```

**Why `resolvedTheme` not `theme`:** `next-themes` `theme` can be `"system"`. `resolvedTheme` is always the actual applied value (`"light"` or `"dark"`). Since this project uses `enableSystem=false` and `defaultTheme="light"`, both work, but `resolvedTheme` is the safer pattern.

### Pattern 3: Hero Amber Glow

**What:** Editorial amber radial gradient blob behind headline — two valid approaches.

**Approach A — CSS pseudo-element (recommended for Claude's discretion):**
```tsx
{/* Amber radial glow */}
<div
  className="pointer-events-none absolute inset-0 flex items-center justify-center"
  aria-hidden="true"
>
  <div className="h-96 w-96 rounded-full bg-accent/20 blur-3xl" />
</div>
```

**Approach B — inline radial-gradient on section:**
```tsx
<section
  className="relative overflow-hidden bg-background"
  style={{
    background: 'radial-gradient(ellipse 60% 40% at 50% 30%, oklch(0.82 0.17 80 / 0.15), transparent 70%)'
  }}
>
```

Approach A uses a Tailwind-composable `bg-accent/20 blur-3xl` pattern. Approach B hardcodes a color value. **Use Approach A** — it respects the token system and adapts to theme (--accent is the same amber value in both modes).

### Pattern 4: Hero Section Redesign

```tsx
// HeroSection.tsx — key changes
<section className="relative overflow-hidden bg-background">
  {/* Amber glow blob */}
  <div className="pointer-events-none absolute inset-0 flex items-center justify-center -translate-y-8" aria-hidden="true">
    <div className="h-96 w-96 rounded-full bg-accent/20 blur-3xl" />
  </div>
  {/* SVG waveform texture — unchanged */}
  ...
  <div className="mx-auto max-w-4xl px-4 py-24 text-center">
    <h1 className="relative font-display text-6xl sm:text-7xl font-bold tracking-tight text-foreground">
      Create{' '}
      <span className="text-primary">
        <Typewriter words={TYPEWRITER_WORDS} speed={80} cursorChar="|" />
      </span>
    </h1>
    <p className="relative mt-6 text-xl text-muted-foreground max-w-xl mx-auto">
      Describe a vibe, add your own lyrics, and get a unique song in seconds.
    </p>
    <a
      href="#create"
      className="relative inline-block mt-10 bg-accent text-accent-foreground font-semibold px-8 py-3 rounded-lg hover:bg-accent/90 transition-colors"
    >
      Start Creating
    </a>
    ...
  </div>
</section>
```

**Key changes from current HeroSection:**
- `py-16 sm:py-24` → `py-24` (generous, editorial)
- `text-4xl sm:text-5xl` → `text-6xl sm:text-7xl font-display` (uses --font-bricolage via font-display class)
- `mt-4` → `mt-6`, `text-lg` → `text-xl` (subtitle scale)
- `bg-primary` → `bg-accent` on CTA (amber=action locked decision)
- Typewriter wrapped in `<span className="text-primary">` (sky-blue differentiation)
- Add amber glow blob div

### Anti-Patterns to Avoid

- **Passing waveColor/progressColor as `useWavesurfer()` props for theme updates:** Causes destroy/recreate cycle = audio interruption. Use `wavesurfer.setOptions()` in a separate `useEffect` instead.
- **Using `theme` from next-themes instead of `resolvedTheme`:** `theme` can be `"system"` — always use `resolvedTheme` for comparisons.
- **Using raw CSS var strings with wavesurfer:** `waveColor: 'var(--muted)'` does NOT work — wavesurfer canvas cannot inherit CSS variables. Hex/rgb strings are required.
- **Updating colors before wavesurfer is ready:** The `setOptions()` effect must guard on `wavesurfer` instance existence.
- **Using amber as foreground text:** --amber-400 fails WCAG AA as text on light backgrounds (confirmed in STATE.md). Amber is backgrounds and CTA backgrounds only, with `text-accent-foreground` (neutral-900) on top.
- **Mixing tailwind-merge with conflicting Tailwind v4 opacity utilities:** tailwind-merge v3 required (v2 doesn't understand Tailwind v4 CSS var colors) — already installed at correct version.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Theme detection | Custom `document.documentElement.classList` watcher | `useTheme()` from next-themes | Already integrated, SSR-safe, handles FOUC |
| Waveform colors | Manual canvas manipulation | `wavesurfer.setOptions({ waveColor, progressColor })` | Official v7 API — handles waveform re-render |
| Color space conversion | Fetch an external service | Inline `oklchToHex()` in `src/lib/colors.ts` | 15 lines, zero deps, deterministic |
| Dark mode class toggle | Manual classList manipulation | next-themes ThemeProvider (already configured) | Handles SSR, persistence, FOUC |

**Key insight:** The OKLCH conversion is the only "custom" code this phase needs, and it's tiny math. Everything else is class renaming using the existing token system.

---

## Common Pitfalls

### Pitfall 1: wavesurfer.setOptions() Timing
**What goes wrong:** Calling `setOptions()` before the wavesurfer instance is fully initialized causes silent failure — colors stay at init values.
**Why it happens:** `useEffect` with `[wavesurfer, resolvedTheme]` runs after render, but `wavesurfer` may be `null` on first render.
**How to avoid:** Guard with `if (!wavesurfer) return;` at top of effect.
**Warning signs:** Theme toggle appears to work in DevTools (class changes on html element) but waveform colors don't update.

### Pitfall 2: useWavesurfer Prop Changes Cause Full Destroy/Recreate
**What goes wrong:** Passing `waveColor` and `progressColor` as reactive props to `useWavesurfer()` causes the hook to `destroy()` and `create()` the instance, interrupting audio playback.
**Why it happens:** Source code confirmed: `useWavesurfer` spreads all options as `useEffect` deps — any option change triggers `destroy()` + `create()`. This is by design in the hook.
**How to avoid:** Pass static/initial colors to `useWavesurfer()`, then update via `wavesurfer.setOptions()` imperatively on theme change.
**Warning signs:** Audio stops when theme is toggled.

### Pitfall 3: getComputedStyle Returns oklch() Not hex
**What goes wrong:** `getComputedStyle(el).getPropertyValue('--primary')` returns `"oklch(0.75 0.150 225)"` — passing this string to `waveColor` fails silently (wavesurfer gets an unrecognized color and falls back to default black/white).
**Why it happens:** OKLCH is a CSS color format — `getComputedStyle` returns it as-is. wavesurfer's canvas rendering does not understand oklch() strings.
**How to avoid:** Use the `getCssColorAsHex()` helper that parses and converts the string.
**Warning signs:** Waveform color is black or white regardless of theme.

### Pitfall 4: font-display vs font-bricolage
**What goes wrong:** Using `font-bricolage` (the CSS var name) instead of `font-display` (the Tailwind utility class).
**Why it happens:** The font is injected as `--font-bricolage` CSS variable, but `globals.css` maps it to `--font-display` in the `@theme inline` block, which Tailwind exposes as `font-display` utility class.
**How to avoid:** Always use `font-display` in Tailwind classes. Check globals.css: `--font-display: var(--font-bricolage)`.
**Warning signs:** `font-bricolage` class has no effect; headline stays in default font.

### Pitfall 5: tailwind-merge and Tailwind v4 Opacity Modifiers
**What goes wrong:** `twMerge('bg-accent', 'bg-accent/90')` may not deduplicate correctly with older tailwind-merge.
**Why it happens:** Tailwind v4 uses CSS var-based opacity syntax. tailwind-merge v2 doesn't understand this.
**How to avoid:** The project already has tailwind-merge v3 — confirm if `clsx`/`twMerge` is used anywhere new in this phase and follow existing patterns.
**Warning signs:** Duplicate bg- classes in rendered HTML.

### Pitfall 6: Active VariantCard ring vs border
**What goes wrong:** Combining `ring-2 ring-primary/50` with `border-border` causes the border and ring to fight visually.
**Why it happens:** CSS ring and border are separate properties — both render when specified together.
**How to avoid:** When active, replace `border-border` with a matching `border-primary/30` or just keep border transparent. Follow the locked decision: `ring-primary/50 shadow-primary/10` for active state.

---

## Code Examples

### Complete WaveformPlayer Theme Sync

```typescript
// src/lib/colors.ts
function srgbGamma(v: number): number {
  return v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055;
}
function toHex(v: number): string {
  return Math.round(v * 255).toString(16).padStart(2, '0');
}
function oklchToHex(l: number, c: number, h: number): string {
  const hRad = (h * Math.PI) / 180;
  const a = c * Math.cos(hRad);
  const b = c * Math.sin(hRad);
  const lr = l + 0.3963377774 * a + 0.2158037573 * b;
  const lg = l - 0.1055613458 * a - 0.0638541728 * b;
  const lb = l - 0.0894841775 * a - 1.2914855480 * b;
  const r = Math.max(0, Math.min(1, srgbGamma(lr ** 3)));
  const g = Math.max(0, Math.min(1, srgbGamma(lg ** 3)));
  const bv = Math.max(0, Math.min(1, srgbGamma(lb ** 3)));
  return `#${toHex(r)}${toHex(g)}${toHex(bv)}`;
}
export function getCssColorAsHex(varName: string, el: Element): string {
  const raw = getComputedStyle(el).getPropertyValue(varName).trim();
  const m = raw.match(/oklch\(\s*([0-9.]+)\s+([0-9.]+)\s+([0-9.]+)/);
  if (!m) return '#888888';
  return oklchToHex(parseFloat(m[1]), parseFloat(m[2]), parseFloat(m[3]));
}
```

```typescript
// WaveformPlayer.tsx — revised theme sync section
import { useTheme } from 'next-themes';
import { getCssColorAsHex } from '@/lib/colors';

export function WaveformPlayer({ url, isActive, onPlay }: WaveformPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { resolvedTheme } = useTheme();
  // ... existing state ...

  const { wavesurfer } = useWavesurfer({
    container: containerRef,
    url,
    waveColor: '#888',        // static placeholder
    progressColor: '#0ea5e9', // static placeholder
    barWidth: 3, barGap: 1, barRadius: 2, height: 64,
    interact: true, normalize: true, fillParent: true,
  });

  // Theme sync — update colors without destroy/recreate
  useEffect(() => {
    if (!wavesurfer || !containerRef.current) return;
    const el = containerRef.current;
    wavesurfer.setOptions({
      waveColor: getCssColorAsHex('--muted', el),
      progressColor: getCssColorAsHex('--primary', el),
    });
  }, [wavesurfer, resolvedTheme]);

  // ... rest of component unchanged ...

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3">
        <button
          onClick={handlePlayPause}
          disabled={!isReady || hasError}
          aria-label={isPlaying ? 'Pause' : 'Play'}
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 translate-x-0.5" />}
        </button>
        <div className="relative min-w-0 flex-1">
          {!isReady && (
            <div className="absolute inset-0 flex items-center">
              <div className="h-10 w-full animate-pulse rounded bg-muted" />
            </div>
          )}
          <div ref={containerRef} className={isReady ? '' : 'opacity-0'} />
        </div>
      </div>
      <div className="flex justify-end text-xs text-muted-foreground">
        {hasError ? (
          <span className="text-destructive">Failed to load audio</span>
        ) : (
          <span>{formatTime(currentTime)} / {formatTime(duration)}</span>
        )}
      </div>
    </div>
  );
}
```

### VariantCard Token Replacement

```tsx
// Key className changes in VariantCard.tsx
// Card base:
className={[
  'rounded-xl border bg-card p-4 flex flex-col gap-4 transition-shadow shadow-subtle',
  isActive
    ? 'border-primary/30 shadow-medium ring-2 ring-primary/50 shadow-primary/10'
    : 'border-border',
].join(' ')}

// Label:
<p className="text-sm font-medium text-muted-foreground">Variant {variantIndex + 1}</p>

// Audio unavailable:
<p className="text-sm italic text-muted-foreground">Audio unavailable</p>

// Info line:
<p className="text-xs text-muted-foreground">{infoLine}</p>

// Download MP3 (amber CTA — locked decision):
className="flex-1 rounded-lg bg-accent text-accent-foreground px-3 py-2 text-center text-sm font-medium transition-colors hover:bg-accent/90"

// WAV/secondary download (neutral outline):
className="flex-1 rounded-lg border border-border px-3 py-2 text-center text-sm font-medium text-foreground transition-colors hover:bg-secondary w-full"
```

### LoadingAnimation EQ Bar Gradient

```tsx
// From: from-violet-600 to-violet-400
// To: from-accent to-accent/70
<div
  key={i}
  className="animate-eq-bar w-2 rounded-full bg-gradient-to-t from-accent to-accent/70 origin-bottom"
  style={{ height: '100%', animationDelay: delay }}
/>
```

### EnhancedCaptionDisplay Token Swap

```tsx
<div className="rounded-lg border border-border bg-card/50 p-3">
  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
    AI-Enhanced Caption
  </p>
  <p className="text-sm text-foreground font-mono leading-relaxed">{caption}</p>
</div>
```

### GenerationPage Container Fix

```tsx
// From:
<div className="min-h-screen bg-zinc-950 text-white">
  <div className="mx-auto max-w-2xl px-4 py-12">
    <header className="mb-8 text-center">
      <h1 className="text-3xl font-bold tracking-tight">MusicGenerator</h1>
      <p className="mt-2 text-zinc-400">Create your own song in seconds</p>
    </header>

// To:
<div className="min-h-screen bg-background text-foreground">
  <div className="mx-auto max-w-2xl px-4 py-12">
    <header className="mb-8 text-center">
      <h1 className="text-3xl font-display font-bold tracking-tight text-foreground">MusicGenerator</h1>
      <p className="mt-2 text-muted-foreground">Create your own song in seconds</p>
    </header>
```

---

## Grep Audit Reference

The canonical grep command for hardcoded palette violations:

```bash
grep -r "bg-zinc\|text-zinc\|border-zinc\|bg-slate\|text-slate\|bg-violet\|text-violet\|text-red-\|bg-gray\|text-gray\|bg-white\|text-white" src/components/ --include="*.tsx"
```

Expected output after Phase 6 completion: **No matches.**

Additional check for JS hex color strings in wavesurfer config:

```bash
grep -r "waveColor\|progressColor" src/components/ --include="*.tsx"
```

After Phase 6: Both should only appear inside the `useWavesurfer()` init call with static placeholder values AND inside the `setOptions()` call with `getCssColorAsHex()` resolved values.

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| `setWaveColor()`, `setCursorColor()` individual methods | `wavesurfer.setOptions({ waveColor, progressColor })` in v7 | Single call, no method deprecation warnings |
| Tailwind CSS vars as bg-[var(--color)] arbitrary syntax | Semantic utility classes (bg-card, text-foreground) via @theme inline bridge | Cleaner JSX, works with tailwind-merge |
| @media prefers-color-scheme | class-based `.dark` on `:root` via next-themes | No FOUC, user-controlled |

**Deprecated/outdated:**
- `setWaveColor()`: Removed in wavesurfer.js v7 — use `setOptions()`.
- `@wavesurfer/react` props-driven color update: Causes destroy/recreate — avoid for theme sync.

---

## Open Questions

1. **OKLCH primitives as percentages vs decimals**
   - What we know: `primitives.css` uses decimal notation (`oklch(0.75 0.150 225)`) — not percentage (`oklch(75% 0.15 225)`)
   - What's unclear: Some browsers serialize oklch with percentages; the regex must handle both
   - Recommendation: Make `getCssColorAsHex` handle both formats: `([0-9.]+%?)` with a conditional parse

2. **wavesurfer.setOptions() + isReady timing**
   - What we know: The theme sync effect depends on `[wavesurfer, resolvedTheme]`; wavesurfer becomes non-null after first render
   - What's unclear: Whether `setOptions()` called before waveform data is loaded produces a re-render flash
   - Recommendation: Test both before/after `isReady`. If flash occurs, add `isReady` to the effect deps.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest ^4.0.18 + @testing-library/react ^16.3.2 |
| Config file | `/Users/deeg/Documents/GitHub/MusicGenerator/vitest.config.ts` |
| Quick run command | `npx vitest run src/components/ --reporter=verbose` |
| Full suite command | `npx vitest run --reporter=verbose` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| COMP-01 | Hero headline is font-display, CTA uses bg-accent | unit (render check) | `npx vitest run src/components/HeroSection.test.tsx` | Wave 0 |
| COMP-02 | Submit button has bg-accent, genre chips use brand tokens | unit | `npx vitest run src/components/GenerationForm.test.tsx` | Exists |
| COMP-03 | EQ bars have from-accent gradient, error text uses text-destructive | unit | `npx vitest run src/components/LoadingAnimation.test.tsx` | Exists |
| COMP-04 | WaveformPlayer play button uses bg-primary, loading placeholder uses bg-muted | unit | `npx vitest run src/components/WaveformPlayer.test.tsx` | Exists |
| COMP-04 | VariantCard active state ring-primary/50, download MP3 bg-accent | unit | `npx vitest run src/components/VariantCard.test.tsx` | Wave 0 |
| COMP-05 | ExampleCard renders with bg-card border-border (already present) | unit | `npx vitest run src/components/ExampleCard.test.tsx` | Exists |
| All | Grep audit returns 0 hardcoded palette classes | audit (bash) | `grep -r "bg-zinc\|text-zinc\|bg-violet\|text-violet\|text-red-" src/components/ --include="*.tsx" \| wc -l` should be 0 | Manual |
| COMP-04 | `getCssColorAsHex` converts oklch() strings correctly | unit | `npx vitest run src/lib/colors.test.ts` | Wave 0 |

### Sampling Rate

- **Per task commit:** `npx vitest run src/components/ --reporter=verbose`
- **Per wave merge:** `npx vitest run --reporter=verbose`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `src/components/HeroSection.test.tsx` — covers COMP-01 (render assertions on font class, bg-accent CTA)
- [ ] `src/components/VariantCard.test.tsx` — covers COMP-04 (active ring, download button classes)
- [ ] `src/lib/colors.test.ts` — covers getCssColorAsHex unit tests (OKLCH parse + convert)

*(Existing test files: GenerationForm, LoadingAnimation, WaveformPlayer, ExampleCard, ModeToggle, GenerationResults, theme-toggle — all exist and should continue to pass.)*

---

## Sources

### Primary (HIGH confidence)
- Source code audit of all `.tsx` components in `/src/components/` and `/src/app/` — direct hardcoded class inventory
- `/src/app/globals.css` — confirmed token system (--primary, --accent, --muted, --destructive, --card, --foreground, --muted-foreground, --border, --background)
- `/src/app/tokens/primitives.css` — confirmed OKLCH decimal notation format
- `node_modules/@wavesurfer/react/dist/index.js` — confirmed destroy/recreate behavior on option prop changes
- `/src/components/theme-provider.tsx` + `/src/app/layout.tsx` — confirmed `enableSystem=false`, `defaultTheme="light"`, class-based dark mode

### Secondary (MEDIUM confidence)
- wavesurfer.js v7 docs (wavesurfer.xyz): `setOptions()` API confirmed as replacement for deprecated individual setters
- WebSearch verified: `setOptions({ waveColor, progressColor })` is the v7 way to update colors without recreating instance
- GitHub discussion (tailwindlabs/tailwindcss #17282): `getComputedStyle` returns oklch() format; small conversion function pattern validated by community

### Tertiary (LOW confidence — flagged for validation)
- OKLCH → hex math coefficients: Standard OKLAB spec values, widely cited but untested against the project's specific palette values. **Validate `getCssColorAsHex` output against browser DevTools color picker during Wave 0 testing.**

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new deps; existing stack confirmed via source and package.json
- Architecture: HIGH — component inventory complete; token mappings verified against globals.css
- WaveformPlayer theme sync: MEDIUM-HIGH — `setOptions()` API confirmed; oklch conversion math is standard but needs runtime validation
- Pitfalls: HIGH — destroy/recreate pitfall confirmed via hook source code inspection

**Research date:** 2026-03-05
**Valid until:** 2026-04-05 (stable libraries; wavesurfer v7 API unlikely to change in 30 days)
