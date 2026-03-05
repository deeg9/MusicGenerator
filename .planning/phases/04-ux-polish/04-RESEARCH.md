# Phase 4: UX Polish - Research

**Researched:** 2026-03-05
**Domain:** React UI animation, CSS transitions, form UX, landing page composition
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Loading experience**
- Loading state **replaces the form** — form disappears, loading animation takes its place. Clean focus on generation progress
- **3 stages**: Initializing → Generating → Finalizing. Transitions timed based on typical ~7s generation time
- **Waveform bars animation** — animated equalizer-style bars pulsing to suggest music being created. Violet gradient, thematic and on-brand
- Stage name displayed prominently alongside the waveform animation

**Landing page**
- **Same page, hero above form** — landing content (hero, examples) sits above the generation form on `/`. Scroll down to create. No separate route
- **Playable example cards** — 3-4 pre-generated example songs as small cards with mini waveform players. Users can listen before creating their own
- **Hero tone: personal & warm** — "Create a song for someone you love" angle. Emphasizes the personal gift use case
- **Animated waveform accent** — subtle animated soundwave graphic behind or beside the headline. CSS/SVG animation, lightweight

**Error & feedback UX**
- **Inline banner replaces alert()** — red/amber banner appears where the loading state was, with error message + retry button. No modal interruption
- **Form validation: inline per-field** — red text below each invalid field (e.g., "Prompt is required"). Standard form UX pattern
- **Success feedback: subtle transition** — loading animation smoothly transitions to result cards appearing. Results ARE the success feedback, no extra toast

**Mode toggle polish**
- **Segmented control** — iOS-style segmented control with a sliding indicator background that animates between Simple and Custom
- **Smooth slide/fade transition** — lyrics textarea animates in with slide-down + fade when switching to Custom mode
- **Preserve lyrics on mode switch** — switching from Custom to Simple preserves typed lyrics; switching back restores them

### Claude's Discretion
- Elapsed timer visibility during loading (keep or remove based on visual fit with waveform animation)
- Retry behavior per error type (one-click retry for retryable errors, return-to-form for non-retryable)
- Mode description text below toggle (contextual hint or minimal, based on design fit)
- Exact waveform bar count, height, animation timing
- Example song selection and pre-generation workflow
- Stage transition timing (how long each stage shows before advancing)

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| UX-01 | User sees a clear loading state during song generation (animated placeholder, not just a spinner) | Equalizer bar animation via CSS @keyframes in Tailwind v4 @theme block; stage progression via timed state machine in GenerationPage |
| UX-02 | User can switch between Simple mode (text prompt) and Custom mode (lyrics + style) | Segmented control via relative-positioned sliding div with CSS transform; lyrics field transition via CSS height/opacity animation |
| UX-03 | Landing page with examples and clear call-to-action to generate | Hero section above GenerationForm in page.tsx; example cards use existing WaveformPlayer with static pre-generated audio from R2 |
</phase_requirements>

---

## Summary

Phase 4 is a pure front-end polish phase. The codebase is already well-structured for this work — all three integration points (GenerationPage, GenerationForm, page.tsx) are clean, stateless, and compose well. No new dependencies are strictly required: everything can be implemented with Tailwind CSS v4 `@theme` keyframes, native CSS transitions, and the existing `@wavesurfer/react` integration already in the project.

The key architectural decision is that the loading state is a **state machine in GenerationPage** — `'idle' | 'submitting' | 'polling' | 'done' | 'error'` — rather than derived conditionally from `isSubmitting` and `isPolling` booleans. This gives clean control over stage progression and transitions. The form mounts/unmounts or animates out based on this state.

The segmented control replaces the existing `ModeToggle.tsx` using a `relative` container with an absolutely-positioned sliding background indicator. No library needed — this is a well-documented CSS pattern. Lyrics field entrance/exit uses CSS `grid-template-rows` transition (0fr → 1fr), which is the modern browser-native approach that avoids height-auto animation hacks.

**Primary recommendation:** Build everything with Tailwind v4 `@theme` custom keyframes + native CSS transitions. Do not add @headlessui/react or framer-motion — overkill for this scope and adds bundle weight.

---

## Standard Stack

### Core (already installed — no new deps required)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Tailwind CSS | v4 (project) | Utility classes + @theme custom keyframes | Already installed; v4 supports @keyframes in @theme block |
| `@wavesurfer/react` | ^1.0.12 (project) | Mini waveform players in example cards | Already integrated, proven in WaveformPlayer.tsx |
| `lucide-react` | ^0.577.0 (project) | Icons (Play, Pause, etc.) | Already used |
| React 19 | 19.2.3 (project) | useState, useEffect, CSS transitions | Native CSS transition support improved in React 19 |

### Optional (only if native CSS proves insufficient)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@headlessui/react` | ^2.x | Transition component for coordinated enter/leave | Only if coordinating multiple simultaneous enter/leave animations becomes unwieldy |

**Installation:** No new packages needed.

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom CSS keyframes | framer-motion | framer-motion adds ~50KB; unjustified for a few animations |
| CSS grid-template-rows trick | react-transition-group | Extra dep; native CSS approach is simpler |
| Custom segmented control | @radix-ui/react-tabs | Radix is excellent but overkill for 2-option toggle |

---

## Architecture Patterns

### Recommended Project Structure

No new directories needed. All new files live in existing locations:

```
src/
├── components/
│   ├── GenerationPage.tsx       # Add state machine, loading/error swap
│   ├── GenerationForm.tsx       # Add per-field validation errors, mode preserve
│   ├── GenerationResults.tsx    # Add retry button to error banner
│   ├── ModeToggle.tsx           # Replace with segmented control (sliding indicator)
│   ├── LoadingAnimation.tsx     # NEW: equalizer bars + stage name
│   ├── ExampleCard.tsx          # NEW: mini waveform player card for landing
│   └── LyricsTextarea.tsx       # Update: add CSS slide-in/out transition
├── app/
│   └── page.tsx                 # Add hero section above GenerationPage
└── app/
    └── globals.css              # Add @keyframes for equalizer bars, waveform accent
```

### Pattern 1: Loading State Machine in GenerationPage

**What:** Replace dual `isSubmitting` + `isPolling` booleans with a unified `phase` state enum.

**When to use:** Whenever you need coordinated transitions between multiple mutually-exclusive UI states — form, loading, results, error.

**Example:**
```typescript
// Source: project convention (stateless children, state in parent)
type GenerationPhase = 'idle' | 'submitting' | 'polling' | 'done' | 'error';

const [phase, setPhase] = useState<GenerationPhase>('idle');

// In JSX:
const showForm = phase === 'idle' || phase === 'error';
const showLoading = phase === 'submitting' || phase === 'polling';
const showResults = phase === 'done';
```

The form unmounts (or fades out) when `showForm` becomes false. The loading animation mounts when `showLoading` becomes true. This is cleaner than `!isSubmitting && !isPolling && data?.status === 'completed'` conditionals scattered throughout.

### Pattern 2: Equalizer Bar Animation (CSS @keyframes in @theme)

**What:** 5-7 vertical bars that animate up/down independently with staggered delays, resembling a music equalizer.

**When to use:** Loading states for audio/music generation. More thematic than a spinner.

**Example:**
```css
/* Source: Tailwind CSS v4 docs — @theme keyframes */
/* In globals.css */
@theme {
  --animate-eq-bar: eq-bar 1s ease-in-out infinite alternate;

  @keyframes eq-bar {
    0%   { transform: scaleY(0.2); }
    100% { transform: scaleY(1); }
  }
}
```

```tsx
// LoadingAnimation.tsx
// Source: CSS animation-delay stagger pattern
function EqualizerBars() {
  const delays = ['0ms', '120ms', '240ms', '180ms', '60ms', '300ms', '150ms'];
  return (
    <div className="flex items-end gap-1 h-12">
      {delays.map((delay, i) => (
        <div
          key={i}
          className="w-1.5 rounded-full bg-violet-500 animate-eq-bar origin-bottom"
          style={{ animationDelay: delay }}
        />
      ))}
    </div>
  );
}
```

Note: `animation-delay` must be set via inline `style` — Tailwind v4 does not generate `animation-delay-*` utility classes. This is intentional and the correct approach.

### Pattern 3: Stage Progression (Timed State Machine)

**What:** Advance through Initializing → Generating → Finalizing labels over the ~7s generation window without tying to actual backend events.

**When to use:** When backend does not expose granular progress events (ACE-Step returns only pending/completed/failed).

**Example:**
```typescript
// Source: project convention (useEffect intervals, cleanup pattern)
// Timed stage advancement — decoupled from actual poll status
const STAGE_LABELS = ['Initializing', 'Generating', 'Finalizing'];
const STAGE_DURATIONS = [1500, 4000, Infinity]; // ms — last holds until done

const [stageIndex, setStageIndex] = useState(0);

useEffect(() => {
  if (phase !== 'polling') return;
  setStageIndex(0);

  const timers: ReturnType<typeof setTimeout>[] = [];
  let elapsed = 0;
  STAGE_DURATIONS.slice(0, -1).forEach((duration, i) => {
    elapsed += duration;
    timers.push(setTimeout(() => setStageIndex(i + 1), elapsed));
  });

  return () => timers.forEach(clearTimeout);
}, [phase]);
```

### Pattern 4: Segmented Control with Sliding Indicator

**What:** Relative container, absolutely-positioned sliding background div that translates left/right. Each option is a `<button>` layered above the indicator.

**When to use:** 2-4 mutually exclusive mode choices. iOS-style native feel without dependencies.

**Example:**
```tsx
// Source: standard CSS segmented control pattern
// ModeToggle.tsx replacement
export function ModeToggle({ mode, onChange }: ModeToggleProps) {
  return (
    <div className="relative flex rounded-lg border border-border bg-secondary p-1">
      {/* Sliding indicator */}
      <div
        className="absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-md bg-card shadow-sm transition-transform duration-200 ease-in-out"
        style={{ transform: mode === 'custom' ? 'translateX(calc(100% + 8px))' : 'translateX(0)' }}
      />
      {/* Buttons — z-index above indicator */}
      <button
        type="button"
        onClick={() => onChange('simple')}
        className="relative z-10 flex-1 px-4 py-1.5 text-sm font-medium transition-colors ..."
      >
        Simple
      </button>
      <button
        type="button"
        onClick={() => onChange('custom')}
        className="relative z-10 flex-1 px-4 py-1.5 text-sm font-medium transition-colors ..."
      >
        Custom
      </button>
    </div>
  );
}
```

### Pattern 5: Lyrics Field Slide-In via grid-template-rows

**What:** Animate height from 0 to auto using `grid-template-rows: 0fr → 1fr`. The child needs `min-height: 0` and `overflow: hidden`.

**When to use:** Whenever you need to animate to/from `height: auto` — the classic CSS animation challenge. This is the modern browser-native solution (Chrome 117+, Firefox 116+, Safari 16+).

**Example:**
```tsx
// Source: MDN CSS grid-template-rows interpolation
// In GenerationForm.tsx — wrap LyricsTextarea
<div
  className="grid transition-[grid-template-rows] duration-300 ease-in-out"
  style={{ gridTemplateRows: mode === 'custom' ? '1fr' : '0fr' }}
>
  <div className="overflow-hidden">
    <LyricsTextarea lyrics={lyrics} onChange={setLyrics} />
  </div>
</div>
```

Note: Keep `LyricsTextarea` always rendered (not conditionally mounted). This preserves the `lyrics` state naturally — the user's typed content survives mode switches because the component never unmounts.

### Pattern 6: Per-Field Validation Errors (No Library)

**What:** `errors` state object in GenerationForm, validated on submit, cleared on field change.

**When to use:** Simple forms where the field count is small and validation rules are straightforward.

**Example:**
```typescript
// Source: standard React form validation pattern
const [errors, setErrors] = useState<Record<string, string>>({});

function validate(data: GenerationFormData): Record<string, string> {
  const errs: Record<string, string> = {};
  if (!data.prompt.trim()) errs.prompt = 'Prompt is required.';
  // Add more field rules as needed
  return errs;
}

function handleSubmit(e: React.FormEvent) {
  e.preventDefault();
  const errs = validate({ prompt, lyrics, ...});
  if (Object.keys(errs).length > 0) {
    setErrors(errs);
    return;
  }
  setErrors({});
  onSubmit(data);
}

// Clear error on change:
onChange={(e) => { setPrompt(e.target.value); setErrors(prev => ({ ...prev, prompt: undefined })); }}
```

```tsx
// Inline error display under each field
{errors.prompt && (
  <p className="mt-1 text-xs text-destructive">{errors.prompt}</p>
)}
```

### Pattern 7: Hero Section in page.tsx (Server Component)

**What:** Add hero HTML directly above the `<Suspense>` wrapper in `page.tsx`. The hero is a pure server-rendered section — no interactivity required at the hero level.

**When to use:** Landing content that doesn't need client-side state. Keeps the hero SSR-rendered for performance and SEO.

**Example:**
```tsx
// page.tsx — Server Component
export default function Home() {
  return (
    <>
      {/* Hero — server rendered */}
      <section className="...">
        <AnimatedWaveformAccent />  {/* CSS-only, no JS */}
        <h1>Create a song for someone you love.</h1>
        <ExampleCards />  {/* Static cards, audio loaded client-side */}
        <a href="#create">Start Creating</a>
      </section>

      {/* Generation UI — client */}
      <section id="create">
        <Suspense fallback={null}>
          <GenerationPage />
        </Suspense>
      </section>
    </>
  );
}
```

Note: `ExampleCards` will need `'use client'` because `@wavesurfer/react` is client-only. The hero `<section>` itself remains a server component — only the cards subtree is client.

### Pattern 8: Inline Error Banner with Retry

**What:** When generation fails, replace the loading animation with a red/amber banner that includes the error message and a "Try Again" button. For retryable errors, retry re-submits the same job. For non-retryable errors, a "Change settings" link returns to the form.

**When to use:** Replacing `alert()` calls with in-page feedback — keeps user in flow.

**Example:**
```tsx
// GenerationPage.tsx — error banner replacing loading area
{phase === 'error' && (
  <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 flex items-start gap-3">
    <p className="flex-1 text-sm text-destructive">{errorMessage}</p>
    {isRetryable ? (
      <button onClick={handleRetry} className="text-sm font-medium text-destructive hover:underline shrink-0">
        Try again
      </button>
    ) : (
      <button onClick={() => setPhase('idle')} className="text-sm font-medium text-destructive hover:underline shrink-0">
        Change settings
      </button>
    )}
  </div>
)}
```

### Anti-Patterns to Avoid

- **Conditional `isSubmitting && isPolling` hell:** Using multiple booleans to derive the current state makes transitions ambiguous and race-prone. Use a single `phase` enum.
- **Mounting LyricsTextarea conditionally:** `{mode === 'custom' && <LyricsTextarea />}` causes state loss on mode switch. Keep it mounted, animate visibility via CSS.
- **animation-delay via Tailwind classes:** Tailwind v4 has no `animate-delay-*` utilities. Use inline `style={{ animationDelay: '...' }}`.
- **Height auto animation via `max-height`:** Setting `max-height: 9999px → 0` creates an easing artifact (the transition timing appears wrong). Use `grid-template-rows` instead.
- **Loading waveform bars using `height` directly:** Animating `height` triggers layout; use `transform: scaleY()` with `transform-origin: bottom` for GPU-composited animation.
- **Example card audio from presigned URLs that expire:** Pre-generated example audio should be stored in R2 with long-lived or public URLs, not 24h presigned URLs. See Open Questions.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Waveform visualization for example cards | Custom canvas drawing | `WaveformPlayer.tsx` (existing) with `height: 32` config | Already battle-tested in the project; supports all needed events |
| Sliding background indicator math | JS `getBoundingClientRect` calculations | CSS `translateX(calc(50% + Xpx))` | Pure CSS, no JS resize observers needed |
| Audio peaks pre-computation | Server-side audio decoder | Pass `peaks` prop to WaveSurfer if needed for perf; otherwise let it decode | WaveSurfer decodes fast enough for short examples |
| Animate height to auto | JS measurement / ResizeObserver hack | `grid-template-rows: 0fr → 1fr` | Native CSS, no JS needed |

**Key insight:** This phase is entirely additive CSS + React state. There is no algorithmic complexity — the challenge is CSS animation craft and state machine clarity, not architecture.

---

## Common Pitfalls

### Pitfall 1: `alert()` Replacement Timing

**What goes wrong:** The `alert()` in `GenerationPage.tsx` fires during `handleSubmit` when the submit API call fails. If you replace it with an inline banner, the banner needs a place to render — but at that point in the flow the form is still visible (the loading state hasn't started yet).

**Why it happens:** Submit errors (network/API errors before a jobId is returned) are different from generation errors (polling shows `status: 'failed'`). Two error paths, two different UI locations.

**How to avoid:** Handle submit errors by setting `phase = 'error'` and `isRetryable = false` + a message. The form hides and the banner shows in its place. Retry returns to idle (shows form again). This is consistent with generation errors.

**Warning signs:** If you're trying to show an error banner while the form is still mounted, you've created a third state that the design doesn't account for.

### Pitfall 2: Stale Stage Index After New Generation

**What goes wrong:** User generates a song, sees "Finalizing", song completes. User generates again. Stage index is still at 2 (Finalizing) briefly before resetting.

**Why it happens:** The `useEffect` that resets `stageIndex` may fire after the first render with the new `phase === 'polling'` value.

**How to avoid:** Reset `stageIndex` to 0 at the top of the `useEffect` before setting timers. Also reset when phase changes to `idle`.

**Warning signs:** Brief flash of "Finalizing" label at the start of a second generation.

### Pitfall 3: Example Card Audio Loading on Every Render

**What goes wrong:** `WaveformPlayer` instances in example cards decode audio on mount. If cards unmount and remount (scroll-driven visibility, tabs, etc.), they decode again.

**Why it happens:** WaveSurfer fetches and decodes audio on init.

**How to avoid:** Keep example cards always mounted once rendered. Don't wrap them in conditional logic that would unmount them. The hero is always visible so this is naturally avoided.

**Warning signs:** Repeated network requests for the same audio URL in browser DevTools.

### Pitfall 4: Segmented Control Width Calculation Breaks on Resize

**What goes wrong:** The sliding indicator uses `w-[calc(50%-4px)]` assuming 2 equal options. If padding changes, the indicator position looks off.

**Why it happens:** Hardcoded percentage math.

**How to avoid:** The `calc(50%-4px)` approach works reliably for a fixed 2-option toggle in a full-width container. Test at narrow viewport widths (320px). If font size increases cause wrapping, reduce padding first.

**Warning signs:** Indicator overhangs or underhangs the active option at narrow widths.

### Pitfall 5: CSS transition conflict with `display: none`

**What goes wrong:** Tailwind's `hidden` class sets `display: none`, which cannot be transitioned. Animating from hidden form to loading view with `hidden` causes an instant snap, not a smooth fade.

**Why it happens:** CSS transitions cannot animate `display` property (as of broad browser support, though Chrome 117+ supports `@starting-style`).

**How to avoid:** Use `opacity-0 pointer-events-none` for invisible-but-mounted elements, or `max-h-0 overflow-hidden` patterns, or simply remove/add the `opacity` and `translate-y` classes. Do NOT use `hidden` on elements you want to transition.

**Warning signs:** Animations that snap instead of ease.

---

## Code Examples

### Equalizer Bars — Full Component
```tsx
// Source: CSS transform animation pattern (standard)
// src/components/LoadingAnimation.tsx
'use client';

const STAGE_LABELS = ['Initializing', 'Generating', 'Finalizing'];

interface LoadingAnimationProps {
  stageIndex: number;
  elapsedSeconds?: number;
  showElapsed?: boolean;
}

export function LoadingAnimation({ stageIndex, elapsedSeconds, showElapsed }: LoadingAnimationProps) {
  const delays = ['0ms', '150ms', '300ms', '200ms', '80ms', '250ms', '120ms'];

  return (
    <div className="flex flex-col items-center gap-6 py-12">
      {/* Equalizer bars */}
      <div className="flex items-end gap-1.5 h-16">
        {delays.map((delay, i) => (
          <div
            key={i}
            className="w-2 rounded-full bg-gradient-to-t from-violet-600 to-violet-400 animate-eq-bar origin-bottom"
            style={{ animationDelay: delay, height: '100%' }}
          />
        ))}
      </div>

      {/* Stage label */}
      <div className="text-center">
        <p className="text-sm font-medium text-foreground">{STAGE_LABELS[stageIndex]}</p>
        {showElapsed && elapsedSeconds !== undefined && (
          <p className="text-xs text-muted-foreground mt-1">{elapsedSeconds}s</p>
        )}
      </div>
    </div>
  );
}
```

```css
/* Source: Tailwind CSS v4 @theme keyframes — tailwindcss.com/docs/animation */
/* globals.css — add inside @theme block */
@theme {
  --animate-eq-bar: eq-bar 0.9s ease-in-out infinite alternate;

  @keyframes eq-bar {
    0%   { transform: scaleY(0.15); }
    100% { transform: scaleY(1); }
  }
}
```

### Animated SVG Waveform Accent (Hero)
```tsx
// Source: CSS SVG path animation pattern
// Lightweight — no JS, pure CSS animation
// Render in page.tsx hero section (Server Component safe — no interactivity)
function AnimatedWaveformAccent() {
  return (
    <svg
      className="absolute inset-x-0 bottom-0 opacity-20 pointer-events-none"
      viewBox="0 0 1200 80"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path
        className="animate-[wave_4s_ease-in-out_infinite]"
        d="M0 40 C150 10, 350 70, 600 40 C850 10, 1050 70, 1200 40 L1200 80 L0 80 Z"
        fill="currentColor"
      />
    </svg>
  );
}
```

```css
/* globals.css @theme addition */
@theme {
  --animate-wave: wave 4s ease-in-out infinite;

  @keyframes wave {
    0%, 100% { d: path("M0 40 C150 10,350 70,600 40 C850 10,1050 70,1200 40 L1200 80 L0 80 Z"); }
    50%       { d: path("M0 40 C150 70,350 10,600 40 C850 70,1050 10,1200 40 L1200 80 L0 80 Z"); }
  }
}
```

Note: CSS `d` property animation has variable browser support. Fallback: animate `transform: translateX` on a pre-drawn wave instead, which has universal GPU-composited support. This is the safer option.

### Example Card (Mini Waveform Player)
```tsx
// Source: existing WaveformPlayer.tsx pattern
// src/components/ExampleCard.tsx
'use client';

import { WaveformPlayer } from './WaveformPlayer';
import { useState } from 'react';

interface ExampleCardProps {
  title: string;
  genre: string;
  audioUrl: string;
  isActive: boolean;
  onPlay: () => void;
}

export function ExampleCard({ title, genre, audioUrl, isActive, onPlay }: ExampleCardProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 flex flex-col gap-3">
      <div>
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{genre}</p>
      </div>
      <WaveformPlayer
        url={audioUrl}
        isActive={isActive}
        onPlay={onPlay}
      />
    </div>
  );
}
```

Note: WaveformPlayer is already built for exactly this use case. The mini-player pattern is just using the existing component inside a smaller card.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `max-height` trick for height animation | `grid-template-rows: 0fr → 1fr` | Chrome 117 / Firefox 116 (2023) | Clean, correct easing; no timing artifacts |
| `tailwind.config.js` for keyframes | `@theme { @keyframes ... }` in CSS | Tailwind v4 (2025) | CSS-first, no JS config needed |
| `transform: translateX(50%)` with JS measurement | `calc(50% + Xpx)` CSS math | Always available, but now common | No ResizeObserver needed for segmented control |
| `alert()` for errors | Inline banners | Project convention (Phase 2 comment) | Keeps user in context, allows retry |

**Deprecated/outdated:**
- `tailwind.config.js` for animations: Still works but Tailwind v4's CSS-first approach is the canonical way.
- `animation-delay-*` Tailwind utilities: These don't exist in Tailwind v4 either. Use inline `style` prop.

---

## Open Questions

1. **Example card audio hosting**
   - What we know: Pre-generated examples need to be played back from R2. The current WaveformPlayer uses presigned URLs (24h expiry).
   - What's unclear: For example cards on the landing page, presigned URLs will expire. The landing page needs long-lived URLs.
   - Recommendation: Either (a) store example audio in a public R2 bucket/path and use direct public URLs, or (b) create a dedicated `/api/examples` route that returns fresh presigned URLs for a hardcoded list of example R2 keys. Option (b) is lower risk (no public bucket exposure) and consistent with existing patterns. The planner should create a task to decide and implement this.

2. **Elapsed timer in loading state**
   - What we know: `useGenerationStatus` already returns `elapsedSeconds`. CONTEXT.md marks visibility as Claude's Discretion.
   - What's unclear: Whether the elapsed timer clutters the visual at small sizes alongside the stage label.
   - Recommendation: Show elapsed as a small secondary line below the stage label (`text-xs text-muted-foreground`). Easy to remove in one line if visually noisy.

3. **Hero section anchor scroll behavior**
   - What we know: Hero sits above the generation form, with a CTA that should scroll to the form.
   - What's unclear: `<a href="#create">` scroll behavior interacts with Next.js App Router. The `scroll: false` option in `router.replace` is for URL updates only.
   - Recommendation: Use a regular `<a href="#create">` anchor link. Add `id="create"` to the section wrapping GenerationPage. Smooth scroll via `scroll-behavior: smooth` on `html` in globals.css. This is purely native and does not involve React Router.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest ^4.0.18 |
| Config file | `vite.config.ts` (or implicit — check if it exists) |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| UX-01 | LoadingAnimation renders stage labels | unit | `npx vitest run src/components/LoadingAnimation.test.tsx` | ❌ Wave 0 |
| UX-01 | Stage progression advances on timer | unit | `npx vitest run src/components/LoadingAnimation.test.tsx` | ❌ Wave 0 |
| UX-02 | ModeToggle renders segmented control, fires onChange | unit | `npx vitest run src/components/ModeToggle.test.tsx` | ❌ Wave 0 |
| UX-02 | Lyrics field is in DOM in both modes (for state preservation) | unit | `npx vitest run src/components/GenerationForm.test.tsx` | ❌ Wave 0 |
| UX-03 | ExampleCard renders title, genre, audio URL | unit | `npx vitest run src/components/ExampleCard.test.tsx` | ❌ Wave 0 |

Note: CSS animation behavior (actual visual transitions) is not automatable in Vitest/jsdom. These are structural tests — the component renders the correct elements with the correct class/prop signals. Visual correctness is manual-only.

### Sampling Rate
- **Per task commit:** `npx vitest run src/components/`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/components/LoadingAnimation.test.tsx` — covers UX-01 stage rendering
- [ ] `src/components/ModeToggle.test.tsx` — covers UX-02 segmented control behavior
- [ ] `src/components/ExampleCard.test.tsx` — covers UX-03 card rendering
- [ ] Existing test files (`GenerationResults.test.tsx`, `WaveformPlayer.test.tsx`) may need updates for new phase/error state shape

---

## Sources

### Primary (HIGH confidence)
- Tailwind CSS v4 animation docs — https://tailwindcss.com/docs/animation — verified @theme keyframe definition syntax
- Existing project codebase — `src/components/`, `src/hooks/`, `src/app/globals.css`, `package.json` — direct code inspection

### Secondary (MEDIUM confidence)
- MDN CSS grid-template-rows interpolation — standard well-supported technique (Chrome 117+, Firefox 116+, Safari 16+)
- Headless UI Transition docs — https://headlessui.com/react/transition — verified installation requirement and data-attribute API
- wavesurfer.js React integration — https://www.npmjs.com/package/@wavesurfer/react — confirmed existing integration pattern

### Tertiary (LOW confidence — not needed for implementation)
- Various hero section pattern articles — general structural patterns only, not specific to this project

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all dependencies already in project, confirmed versions
- Architecture patterns: HIGH — based on direct code inspection of existing components and established CSS techniques
- CSS animation patterns: HIGH — verified against official Tailwind v4 docs
- Pitfalls: HIGH — derived from code inspection + CSS animation known gotchas
- Example card audio hosting: MEDIUM — open question on URL strategy

**Research date:** 2026-03-05
**Valid until:** 2026-06-05 (stable CSS/React patterns — unlikely to change significantly)
