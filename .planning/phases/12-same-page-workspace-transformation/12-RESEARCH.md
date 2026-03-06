# Phase 12: Same-Page Workspace Transformation - Research

**Researched:** 2026-03-05
**Domain:** Next.js App Router URL state, Framer Motion layout animations, CSS Grid two-panel layout
**Confidence:** HIGH

---

## Summary

Phase 12 transforms the homepage from a hero-only landing page into an in-place workspace without changing the route. The core challenge is threefold: (1) redesign HeroSection to be prompt-first and collapse on demand, (2) encode workspace state in the URL (`?mode=create`) so hard reloads land in the correct view, and (3) animate the hero-to-workspace transition using Framer Motion's `layout` prop without `layoutId`.

The project already uses `useSearchParams` + `router.replace({ scroll: false })` in `GenerationPage` for job-ID persistence — the same pattern applies for `?mode=create`. The key decision confirmed during research: use `window.history.pushState` for the "enter workspace" transition (adds a back-button entry) and `window.history.replaceState` when already in workspace (updates without stacking). Both integrate directly with `useSearchParams` per official Next.js docs.

Framer Motion's `layoutId` is NOT safe to use here — GitHub issue #49279 against Next.js App Router is open and unresolved. The correct approach is the `layout` prop (single-component FLIP) combined with `AnimatePresence` for mount/unmount of hero vs. workspace panels. This is the standard same-page collapse/expand pattern and does not require `layoutId` at all.

**Primary recommendation:** `isWorkspaceActive` state initialized from `searchParams.get('mode') === 'create'` drives all rendering; `window.history.pushState` writes the URL; `layout` prop on `<motion.div>` wrappers animates the transition.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| HOME-01 | User sees a clean centered headline and prompt input box on the homepage | HeroSection redesign: remove ExampleCards from above the fold, replace CTA with integrated prompt input + Create button |
| HOME-02 | User can type a song description in the prompt box and click Create to start generation | Prompt state lives in HeroSection, passed to GenerationPage on Create; requires lifting prompt state or using event/context |
| HOME-03 | Homepage transforms in-place to a two-panel workspace (form left, results right) after clicking Create | `isWorkspaceActive` boolean state + Framer Motion `layout` + `AnimatePresence`; CSS Grid two-column layout |
| HOME-04 | Two-panel workspace layout is responsive (stacks vertically on mobile) | CSS Grid `grid-cols-1 md:grid-cols-[2fr_3fr]` + `pb-[var(--player-bar-height)]` on each column |
| HOME-05 | Workspace state is reflected in URL (`?mode=create`) so it survives page refresh | `window.history.pushState` to enter; `useSearchParams` reads on mount; existing `Suspense` wrapper in `page.tsx` covers the requirement |
| HOME-06 | Transition from homepage to workspace is animated (Framer Motion layout) | `layout` prop on hero wrapper + workspace wrapper; `AnimatePresence mode="wait"` or `mode="sync"` |
</phase_requirements>

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| framer-motion | ^12.35.0 | Layout animation, AnimatePresence | Already installed; `layout` prop is the correct non-layoutId approach |
| next/navigation | (Next.js 16.1.6) | `useSearchParams`, `useRouter`, `usePathname` | Official Next.js App Router hooks — already used in GenerationPage |
| react | 19.2.3 | useState, useEffect, useCallback | Already in project |
| tailwindcss | ^4 | CSS Grid, responsive utilities | Already in project |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| window.history.pushState | native browser API | Write `?mode=create` to URL without router hop | Official Next.js recommendation for same-page state encoding that syncs with `useSearchParams` |
| window.history.replaceState | native browser API | Replace URL in workspace without stacking history | When already in workspace and updating other params (e.g., `?mode=create&job=xxx`) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `window.history.pushState` | `router.replace` | `router.replace` does NOT add a back-button entry; `pushState` does — required for HOME-05 back navigation |
| `layout` prop only | `layoutId` shared animation | `layoutId` broken in Next.js App Router (issue #49279, unresolved as of 2026-03) |
| CSS-only collapse | Framer Motion `layout` | CSS grid-template-rows trick (used in GenerationForm) works but cannot coordinate with sibling panel expansion |

**Installation:** No new packages needed. All libraries already installed.

---

## Architecture Patterns

### Recommended Project Structure

The transformation adds two new components and modifies three existing ones:

```
src/
├── components/
│   ├── HeroSection.tsx           # REWRITE: prompt-first hero, no ExampleCards above fold
│   ├── HeroSection.test.tsx      # UPDATE: tests for new prompt input + Create CTA
│   ├── GenerationPage.tsx        # MODIFY: accept initialPrompt prop; render workspace panels
│   ├── GenerationPage.test.tsx   # UPDATE: workspace mode tests
│   └── WorkspaceLayout.tsx       # NEW: two-panel CSS Grid wrapper with Framer Motion layout
├── app/
│   └── page.tsx                  # MODIFY: pass searchParams to control initial mode
└── hooks/
    └── useWorkspaceMode.ts       # NEW: encapsulates ?mode=create read/write logic
```

### Pattern 1: URL-Driven Workspace State

**What:** `isWorkspaceActive` boolean is initialized from `searchParams.get('mode') === 'create'` on mount. State transitions write to URL via `window.history.pushState`.

**When to use:** Any state that must survive hard refresh without a route change.

**How it integrates with Next.js:** Official Next.js docs explicitly document that `window.history.pushState` and `replaceState` "integrate into the Next.js Router, allowing you to sync with `usePathname` and `useSearchParams`." The back button pops the history entry, `useSearchParams` re-reads `null` for `mode`, and the workspace collapses.

```typescript
// Source: https://nextjs.org/docs/app/getting-started/linking-and-navigating#native-history-api
// Pattern: enter workspace (adds back-button entry)
function enterWorkspace() {
  const params = new URLSearchParams(window.location.search);
  params.set('mode', 'create');
  window.history.pushState(null, '', `?${params.toString()}`);
  setIsWorkspaceActive(true);
}

// Pattern: exit workspace (removes mode param)
function exitWorkspace() {
  const params = new URLSearchParams(window.location.search);
  params.delete('mode');
  const qs = params.toString();
  window.history.pushState(null, '', qs ? `?${qs}` : '/');
  setIsWorkspaceActive(false);
}
```

**Reading on mount (survives refresh):**

```typescript
// Source: https://nextjs.org/docs/app/api-reference/functions/use-search-params
'use client';
import { useSearchParams } from 'next/navigation';

// Inside component:
const searchParams = useSearchParams();
const [isWorkspaceActive, setIsWorkspaceActive] = useState(
  () => searchParams.get('mode') === 'create'
);
```

**CRITICAL: Suspense boundary is required.** Any component that calls `useSearchParams` in a statically rendered route must be wrapped in `<Suspense>`. `page.tsx` already wraps `GenerationPage` in `<Suspense fallback={null}>` — the new workspace component must live inside that same boundary or its own.

### Pattern 2: Back-Button Sync via useSearchParams

**What:** The browser back button pops the `pushState` entry. Because `window.history.pushState` integrates with Next.js Router, `useSearchParams` will re-render with the updated (now `mode`-less) params. The component detects this via a `useEffect` watching `searchParams`.

```typescript
// Sync isWorkspaceActive when URL changes (back button)
const searchParams = useSearchParams();
useEffect(() => {
  const modeActive = searchParams.get('mode') === 'create';
  setIsWorkspaceActive(modeActive);
}, [searchParams]);
```

This replaces the old `navigate-create` event pattern for the back button case. The `navigate-create` event remains for sidebar "Create" link → workspace entry.

### Pattern 3: Framer Motion Layout Animation (No layoutId)

**What:** `layout` prop on a `<motion.div>` animates changes to that element's size and position when React re-renders. It uses FLIP technique internally.

**When to use:** Same-page collapse/expand where the element persists across both states. Does NOT require `layoutId` (which is broken in App Router).

```typescript
// Source: https://motion.dev/docs/react-layout-animations
// Hero collapses when isWorkspaceActive becomes true
<motion.div layout className={isWorkspaceActive ? 'hidden' : 'block'}>
  <HeroContent />
</motion.div>

// OR: use AnimatePresence for mount/unmount
<AnimatePresence mode="wait">
  {!isWorkspaceActive && (
    <motion.section
      key="hero"
      layout
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20, height: 0 }}
      transition={{ duration: 0.3 }}
    >
      <HeroContent />
    </motion.section>
  )}
</AnimatePresence>

// Workspace panels expand into view
<AnimatePresence>
  {isWorkspaceActive && (
    <motion.div
      key="workspace"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="grid grid-cols-1 md:grid-cols-[2fr_3fr] gap-6"
    >
      {/* left: form */}
      {/* right: results */}
    </motion.div>
  )}
</AnimatePresence>
```

**Child elements that shift position must also have `layout` prop** to avoid distortion during parent size change.

### Pattern 4: Two-Panel CSS Grid Layout

**What:** CSS Grid with named columns. Form panel left (narrower), results panel right (wider). Each panel scrolls independently within the main scroll container.

**Mobile:** Grid stacks to single column at `< 768px`. Each panel has `pb-[var(--player-bar-height)]` so content is not obscured by the bottom player bar.

```typescript
// Two-panel workspace grid
<div className="grid grid-cols-1 md:grid-cols-[2fr_3fr] gap-6 px-4 py-6 min-h-0">
  {/* Left: generation form */}
  <div className="overflow-y-auto pb-[var(--player-bar-height)]">
    <GenerationForm ... />
  </div>

  {/* Right: results */}
  <div className="overflow-y-auto pb-[var(--player-bar-height)]">
    <GenerationResults ... />
  </div>
</div>
```

**Player bar height CSS variables already defined in globals.css:**
- Desktop: `--player-bar-height: 80px`
- Mobile: `--player-bar-height: 56px` (via `@media (max-width: 767px)`)

### Pattern 5: Prompt State Handoff (Hero → GenerationPage)

**What:** HeroSection collects the initial prompt text. When Create is clicked, the prompt value must be passed to GenerationPage so it pre-fills the form and can auto-submit.

**Implementation options:**
- Option A: Lift prompt state to `page.tsx` (simple, requires page to be 'use client')
- Option B: Pass via URL param (`?prompt=...`) — survives refresh but exposes prompt in URL
- Option C: Use a React context or callback prop — cleanest for in-memory handoff

**Recommendation:** Option A is simplest. Page.tsx can become a thin 'use client' wrapper since it already renders client components. State flows: `page.tsx` holds `initialPrompt`, passes to both `HeroSection` (for the prompt input) and `GenerationPage` (as a seed value).

The current page.tsx is a Server Component — switching to 'use client' removes SSR for the homepage, which is acceptable since the hero renders dynamically anyway (Typewriter animation, AudioPlayer context).

### Anti-Patterns to Avoid

- **Using `layoutId` for hero↔workspace transition:** Broken in Next.js App Router (issue #49279, open since 2023). Use `layout` + `AnimatePresence` instead.
- **Using `router.replace` for workspace entry:** Does NOT add a history entry, so browser back button will navigate away from the page entirely. Use `window.history.pushState` for "enter workspace" action.
- **Calling `useSearchParams` outside Suspense:** In production builds this causes a build error. The component tree must always be inside a `<Suspense>` boundary.
- **Duplicating the `?job=` param with `?mode=create`:** GenerationPage already writes `?job=...` via `router.replace`. Phase 12 must merge `mode=create` into the existing params, not replace them.
- **Animating `height` directly in Framer Motion `animate` prop:** Height animations via `animate={{ height: 0 }}` do not coordinate with sibling layout shifts. Use the `layout` prop instead — it uses FLIP and handles all siblings automatically.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| URL-driven state | Custom hash routing or localStorage | `window.history.pushState` + `useSearchParams` | Official Next.js pattern; syncs with router; back button works |
| Height collapse animation | CSS `max-height` transitions | Framer Motion `layout` + `AnimatePresence` | FLIP handles variable heights; no "max-height: 9999px" hacks needed |
| Two-panel responsive grid | Custom flexbox layout | CSS Grid `grid-cols-[2fr_3fr]` + Tailwind responsive prefixes | Grid handles gap, column sizing, stacking automatically |
| Reduced motion | Custom media query listener | `useReducedMotion()` hook already in project | Re-use existing hook at `/src/hooks/useReducedMotion.ts` |

**Key insight:** The project already has all the hard infrastructure. The planner should use existing hooks and patterns — do not re-invent URL management or animation utilities.

---

## Common Pitfalls

### Pitfall 1: `router.replace` vs `window.history.pushState` for Back Button

**What goes wrong:** Using `router.replace` to set `?mode=create` means pressing browser Back navigates away from the page entirely, not back to the hero view. The user loses their work.

**Why it happens:** `router.replace` replaces the current history entry; it does not add a new one. So there is no prior entry to pop back to.

**How to avoid:** Use `window.history.pushState` to enter workspace. Use `window.history.replaceState` only for updating params while already in workspace (e.g., adding `&job=xyz` after submission). This matches the official Next.js docs pattern.

**Warning signs:** Testing back button exits the page instead of returning to hero.

### Pitfall 2: Merging `?mode=create` with Existing `?job=` Param

**What goes wrong:** GenerationPage uses `router.replace` to write `?job=xxx` to the URL. If Phase 12 naively sets `?mode=create` without preserving `job`, the job param is lost on page refresh.

**Why it happens:** Each URL write builds params independently.

**How to avoid:** Always build new params from `new URLSearchParams(window.location.search)` (or `searchParams.toString()`), then `set`/`delete` the specific key before writing.

```typescript
function enterWorkspace() {
  const params = new URLSearchParams(window.location.search);
  params.set('mode', 'create');
  window.history.pushState(null, '', `?${params.toString()}`);
}
```

### Pitfall 3: `useSearchParams` Build Failure Without Suspense

**What goes wrong:** Production build fails with "Missing Suspense boundary with useSearchParams."

**Why it happens:** The homepage at `/` is statically rendered. Any client component calling `useSearchParams` must be inside a Suspense boundary in a static route.

**How to avoid:** Keep the workspace component inside the existing `<Suspense fallback={null}>` already in `page.tsx`, or add a new boundary. Never call `useSearchParams` in the top-level page component without Suspense.

**Warning signs:** Dev builds work fine; `next build` fails.

### Pitfall 4: `layout` Prop Distorts Child Text

**What goes wrong:** When a parent `<motion.div layout>` changes size, child text stretches or compresses during animation because CSS transforms scale the container.

**Why it happens:** Framer Motion uses `scaleX`/`scaleY` transforms for FLIP. Text inside scales with the container.

**How to avoid:** Add `layout` prop to child elements that should NOT scale — they will be counter-scaled automatically. Or use `layoutScroll` on scroll containers.

```typescript
<motion.div layout>
  <motion.h1 layout>Headline</motion.h1>  {/* counter-scales */}
</motion.div>
```

### Pitfall 5: ExampleCards in HeroSection Have WaveSurfer Dependencies

**What goes wrong:** ExampleCards import/init WaveSurfer. Removing them from HeroSection is a non-trivial render change that affects the existing `HeroSection.test.tsx` (which mocks ExampleCard).

**Why it happens:** ExampleCards are currently inside HeroSection render tree.

**How to avoid:** Plan 12-01 explicitly removes ExampleCards from the hero above-the-fold. Tests must be updated to reflect the new structure. The ExampleCard component itself stays — it may be used elsewhere (style-guide, below-fold section).

### Pitfall 6: `navigate-create` Event Still Fired by Sidebar

**What goes wrong:** The Sidebar's "Create" nav item fires `window.dispatchEvent(new Event('navigate-create'))` and scrolls to `#create`. After Phase 12, there is no `#create` section to scroll to.

**Why it happens:** The sidebar uses the old architecture (two stacked sections on the page).

**How to avoid:** Plan 12-02 must update the Sidebar "Create" nav item to call `enterWorkspace()` instead of dispatching the event and scrolling. The sidebar NavLink `href="#create"` should become `href="/"` with an `onClick` that calls `enterWorkspace`.

---

## Code Examples

Verified patterns from official sources:

### Reading ?mode=create on Mount (Refresh Survivability)

```typescript
// Source: https://nextjs.org/docs/app/api-reference/functions/use-search-params
'use client';
import { useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';

export function HomePage() {
  const searchParams = useSearchParams();

  const [isWorkspaceActive, setIsWorkspaceActive] = useState(
    () => searchParams.get('mode') === 'create'
  );

  // Sync when URL changes (back/forward navigation)
  useEffect(() => {
    setIsWorkspaceActive(searchParams.get('mode') === 'create');
  }, [searchParams]);

  // ...
}
```

### Writing ?mode=create (Enter Workspace with Back Button Support)

```typescript
// Source: https://nextjs.org/docs/app/getting-started/linking-and-navigating#native-history-api
function enterWorkspace(prompt: string) {
  const params = new URLSearchParams(window.location.search);
  params.set('mode', 'create');
  window.history.pushState(null, '', `?${params.toString()}`);
  setIsWorkspaceActive(true);
  setInitialPrompt(prompt);
}
```

### Framer Motion AnimatePresence for Hero Collapse

```typescript
// Source: https://motion.dev/docs/react-layout-animations
import { AnimatePresence, motion } from 'framer-motion';

// Hero unmounts; workspace mounts. layout prop on both sections
// coordinates the page reflow into a smooth transition.
<AnimatePresence mode="wait">
  {!isWorkspaceActive ? (
    <motion.section
      key="hero"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
      transition={{ duration: reducedMotion ? 0 : 0.25 }}
    >
      <HeroContent onCreateClick={enterWorkspace} />
    </motion.section>
  ) : (
    <motion.div
      key="workspace"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reducedMotion ? 0 : 0.25 }}
      className="grid grid-cols-1 md:grid-cols-[2fr_3fr] gap-6"
    >
      {/* form column */}
      {/* results column */}
    </motion.div>
  )}
</AnimatePresence>
```

### Responsive Two-Panel Grid

```typescript
// CSS Grid, stacks at mobile, both columns have player-bar padding
<div className={`
  grid
  grid-cols-1
  md:grid-cols-[2fr_3fr]
  gap-6
  px-4
  py-6
`}>
  <div className="pb-[var(--player-bar-height)]">
    {/* GenerationForm */}
  </div>
  <div className="pb-[var(--player-bar-height)]">
    {/* GenerationResults */}
  </div>
</div>
```

### Vitest Mock Pattern for useSearchParams

```typescript
// Required for tests — useSearchParams must be mocked in jsdom
vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams('mode=create'),
  useRouter: () => ({ replace: vi.fn() }),
  usePathname: () => '/',
}));
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Separate `/create` route | Same-page `?mode=create` URL state | v2.0 decision | No route change, no full page reload, state preserved |
| `layoutId` shared animations | `layout` prop + `AnimatePresence` | Next.js 13+ (issue #49279) | Same visual result, avoids broken shared-layout API |
| `router.push/replace` for shallow routing | `window.history.pushState` | Next.js App Router | Native API that integrates with `useSearchParams` without triggering RSC refetch |
| Hero + scrolled-to form | Hero collapses, workspace replaces | Phase 12 | Matches Suno/modern AI tool UX pattern |

**Deprecated/outdated:**
- `router.events` (Pages Router): Replaced by `usePathname` + `useSearchParams` useEffect composition.
- `navigate-create` scroll event (Phase 9): Was a workaround for the old two-section layout. Phase 12 replaces it with `enterWorkspace()`.

---

## Open Questions

1. **Prompt state handoff architecture**
   - What we know: Hero needs to collect a prompt, pass it to GenerationPage which currently manages its own state
   - What's unclear: Whether page.tsx should become 'use client' to lift state, or whether an event/context is cleaner
   - Recommendation: Lift to page.tsx as 'use client'. It's the simplest path that avoids prop drilling through Suspense boundaries. Alternatively, encode `?prompt=...` in the URL (auto-populated on workspace mount) but that exposes potentially long prompt strings in the URL.

2. **Sidebar "Create" nav item update scope**
   - What we know: Sidebar dispatches `navigate-create` and scrolls to `#create`. Both behaviors are wrong after Phase 12.
   - What's unclear: Whether Sidebar update belongs in Plan 12-02 or Plan 12-01
   - Recommendation: Put in Plan 12-02 (same-page transformation plan) since it's about navigation behavior, not hero redesign.

3. **`navigate-create` event backward compatibility**
   - What we know: GenerationPage listens for `navigate-create` to reset to idle. This still makes sense in the new architecture.
   - What's unclear: Whether to rename or extend the event.
   - Recommendation: Keep the existing event. `enterWorkspace()` can still dispatch it to reset GenerationPage state. No rename needed.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.0.18 + @testing-library/react 16.3.2 |
| Config file | `vitest.config.ts` (project root) |
| Quick run command | `npx vitest run --reporter=verbose src/components/HeroSection.test.tsx src/components/GenerationPage.test.tsx` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| HOME-01 | HeroSection renders centered headline + prompt input, no ExampleCards above fold | unit | `npx vitest run src/components/HeroSection.test.tsx` | ✅ (needs update) |
| HOME-02 | Create button triggers `enterWorkspace(prompt)` with the typed value | unit | `npx vitest run src/components/HeroSection.test.tsx` | ✅ (needs update) |
| HOME-03 | isWorkspaceActive=true renders workspace grid, not hero | unit | `npx vitest run src/components/GenerationPage.test.tsx` | ✅ (needs update) |
| HOME-04 | Workspace grid has `grid-cols-1 md:grid-cols-[2fr_3fr]` and `pb-[var(--player-bar-height)]` | unit (className assertion) | `npx vitest run src/components/GenerationPage.test.tsx` | ✅ (needs update) |
| HOME-05 | Mounting with `?mode=create` sets isWorkspaceActive=true | unit | `npx vitest run src/components/GenerationPage.test.tsx` | ✅ (needs update) |
| HOME-06 | Framer Motion motion.div wrappers present on hero + workspace elements | unit (DOM assertion) | `npx vitest run src/components/GenerationPage.test.tsx` | ✅ (needs update) |

### Sampling Rate

- **Per task commit:** `npx vitest run src/components/HeroSection.test.tsx src/components/GenerationPage.test.tsx`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

None — existing test infrastructure covers all phase requirements. `HeroSection.test.tsx` and `GenerationPage.test.tsx` exist and must be updated (not created) to reflect the new component structure. No new test files or framework installs required.

---

## Current Codebase State (Critical for Planner)

The planner must know what exists today before writing tasks:

### `src/app/page.tsx`
Currently a Server Component. Renders `<HeroSection />` in `#home` section and `<GenerationPage />` in `#create` section. Must become a coordination point for workspace mode.

### `src/components/HeroSection.tsx`
Has: Typewriter headline, subtitle, CTA button (dispatches `navigate-create` event + smooth scrolls), three ExampleCards. Must be rewritten to: centered headline + large prompt textarea + Create button that calls `enterWorkspace()`.

### `src/components/GenerationPage.tsx`
Already uses: `useSearchParams`, `useRouter`, `router.replace` for `?job=` param, `AnimatePresence` for phase transitions, `phaseRef` pattern. Must be extended with: `isWorkspaceActive` state, `?mode=create` read on mount, workspace two-panel layout.

### `src/components/layout/Sidebar.tsx`
Has: `handleCreateNav` that dispatches `navigate-create` and scrolls to `#create`. Must be updated: navigate to `/?mode=create` instead (or call workspace entry function).

### `globals.css`
Has: `--player-bar-height: 80px` (desktop), `56px` (mobile via media query). Use these CSS vars for `pb-[var(--player-bar-height)]` padding on workspace columns.

### Existing `navigate-create` event
Fired by: Sidebar "Create" nav, HeroSection CTA. Listened by: GenerationPage (resets to idle). After Phase 12: Sidebar fires `enterWorkspace()` which may also dispatch the event. HeroSection CTA no longer needs to dispatch it separately since it calls `enterWorkspace()` directly.

---

## Sources

### Primary (HIGH confidence)
- [Next.js useSearchParams docs](https://nextjs.org/docs/app/api-reference/functions/use-search-params) — Suspense requirement, read/write patterns, static rendering behavior (fetched 2026-03-05, version 16.1.6)
- [Next.js useRouter docs](https://nextjs.org/docs/app/api-reference/functions/use-router) — `router.replace({ scroll: false })`, `router.push` signatures (fetched 2026-03-05)
- [Next.js Linking and Navigating](https://nextjs.org/docs/app/getting-started/linking-and-navigating) — `window.history.pushState` integrates with `useSearchParams` (official, confirmed)
- Project codebase — GenerationPage.tsx, HeroSection.tsx, Sidebar.tsx, AppShell.tsx, globals.css (direct file reads)

### Secondary (MEDIUM confidence)
- [Motion layout animations docs](https://motion.dev/docs/react-layout-animations) — `layout` prop FLIP behavior, AnimatePresence coordination (verified against project's framer-motion ^12.35.0)
- GitHub issue [#49279](https://github.com/vercel/next.js/issues/49279) — `layoutId` broken in Next.js App Router, confirmed OPEN (fetched 2026-03-05)

### Tertiary (LOW confidence)
- None — all critical claims verified against official sources.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already installed, versions confirmed in package.json
- Architecture: HIGH — URL patterns verified against official Next.js docs; `layoutId` issue confirmed via GitHub
- Pitfalls: HIGH — most pitfalls derived from confirmed bugs (issue #49279) and official API behavior

**Research date:** 2026-03-05
**Valid until:** 2026-06-05 (stable APIs; `layoutId` issue may be fixed, re-check if using layoutId)
