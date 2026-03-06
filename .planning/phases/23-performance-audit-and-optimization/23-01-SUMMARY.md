---
phase: 23-performance-audit-and-optimization
plan: 01
subsystem: ui
tags: [next/dynamic, code-splitting, bundle-optimization, canvas-confetti, lazy-loading]

# Dependency graph
requires:
  - phase: 13-landing-page
    provides: "Landing page sections (HowItWorksSection, TestimonialsSection, VideoSection, BottomCtaSection)"
  - phase: 19-error-boundaries
    provides: "Success page ConfettiBlast component"

provides:
  - "Landing page below-fold sections split into lazy-loaded chunks via next/dynamic"
  - "canvas-confetti removed from eager success page bundle via dynamic import() in useEffect"
  - "Bundle analysis baseline documented (webpack build)"

affects: [23-performance-audit-and-optimization]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "next/dynamic with .then((m) => m.NamedExport) for named export lazy loading in Server Components"
    - "Dynamic import('library') inside useEffect for client-only libraries (ESM/CJS interop via { default: lib } destructuring)"
    - "Cleanup-safe async import pattern: declare timer with let before .then() so clearTimeout(timer) is a no-op if component unmounts before import resolves"

key-files:
  created: []
  modified:
    - "src/app/page.tsx"
    - "src/app/quiz/success/[jobId]/_components/ConfettiBlast.tsx"

key-decisions:
  - "HeroSection kept as static import — LCP element must never be lazy loaded"
  - "No ssr: false on next/dynamic — components are used in Server Component file and have no browser APIs"
  - "No Suspense fallbacks added — below-fold sections are pure static content, null fallback is acceptable"
  - "next/dynamic requires .then((m) => m.ComponentName) for named exports (not default exports)"
  - "Bundle analyzer not compatible with Turbopack builds — webpack flag required for analysis (ANALYZE=true npx next build --webpack)"
  - "canvas-confetti chunk was already split by webpack at the route level (not present in landing page bundle); dynamic import makes it additionally lazy within the success page"

patterns-established:
  - "Named export lazy loading: dynamic(() => import('./Component').then((m) => m.ComponentName))"
  - "Library lazy loading: void import('library').then(({ default: lib }) => { lib(...) })"

requirements-completed: [PERF-01, PERF-02, PERF-03]

# Metrics
duration: 4min
completed: 2026-03-06
---

# Phase 23 Plan 01: Bundle Analysis and Lazy Loading Summary

**Lazy loaded 4 below-fold landing sections via next/dynamic and converted canvas-confetti to dynamic import() inside useEffect, with webpack bundle analysis baseline documented.**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-06T22:30:44Z
- **Completed:** 2026-03-06T22:34:15Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Ran webpack bundle analysis (`ANALYZE=true npx next build --webpack`) and documented baseline chunk sizes
- Replaced 4 static below-fold imports in `page.tsx` with `next/dynamic` calls — HeroSection kept static (LCP)
- Converted `ConfettiBlast.tsx` top-level `import confetti from 'canvas-confetti'` to `void import('canvas-confetti').then(({ default: confetti }) => ...)` inside useEffect
- Build passes (Turbopack production build), all 3 landing page E2E tests pass with no regressions

## Bundle Analysis Baseline (Before Optimization)

**Build tool:** webpack (`ANALYZE=true npx next build --webpack`)

| Chunk | Size | Content |
|-------|------|---------|
| `app/page-ed3b75169adb1e17.js` | 3,274 bytes | Landing page (all 4 below-fold sections statically imported) |
| `688-050551bf6125e1d2.js` | 11,845 bytes | canvas-confetti (loaded eagerly on success route) |
| `794-37dad9bbc14b04b8.js` | 188,151 bytes | Framer Motion + shared components |
| `200-60ef2064d60e1a5a.js` | 99,607 bytes | Shared vendor chunk |
| `framework-75892d61b920805f.js` | 189,684 bytes | React framework |

**Key findings:**
- canvas-confetti chunk (688) was already NOT loaded on the landing page route — webpack split it to the success route only
- Below-fold landing sections (HowItWorksSection, TestimonialsSection, VideoSection, BottomCtaSection) were statically imported in page.tsx, meaning their client-side hydration JS loaded eagerly
- Framer Motion is NOT in the landing page chunks (only in success page via shared chunk) — no lazy loading needed

## After Optimization

| Chunk | Size | Change |
|-------|------|--------|
| `app/page-0a2c81d99a81f91d.js` | 4,984 bytes | +1,710 bytes (next/dynamic loader wrappers added) |
| `855.667d28c3f8810a63.js` | 10,428 bytes | NEW — canvas-confetti now a separate lazy chunk |
| chunk 688 | gone | canvas-confetti removed from eager bundle |

**Optimization outcome:** The 4 below-fold landing sections' client-side hydration JS is now deferred (loaded on demand). canvas-confetti is split to its own lazy chunk (855) and only loaded when the useEffect fires on the success page.

## Task Commits

Each task was committed atomically:

1. **Task 1: Run baseline bundle analysis and document findings** - analysis only, no files modified (documented in SUMMARY)
2. **Task 2: Lazy load below-fold landing sections and canvas-confetti** - `74442e8` (feat)

**Plan metadata:** (see final docs commit)

## Files Created/Modified

- `src/app/page.tsx` — Replaced 4 static below-fold section imports with next/dynamic calls; HeroSection remains static
- `src/app/quiz/success/[jobId]/_components/ConfettiBlast.tsx` — Removed top-level `import confetti from 'canvas-confetti'`; replaced with `void import('canvas-confetti').then(({ default: confetti }) => ...)` inside useEffect

## Decisions Made

- **HeroSection must remain static**: It is the LCP element — lazy loading above-fold content would harm Core Web Vitals
- **No `ssr: false`**: The 4 below-fold sections are used in a Server Component (`page.tsx`). Adding `ssr: false` would break SSR for components that have no browser-only APIs — they need SSR for SEO and initial paint
- **No Suspense fallbacks**: Below-fold pure static sections have no interactivity during load; null fallback (default) is appropriate
- **`{ default: confetti }` destructure pattern**: Required for ESM/CJS interop when dynamically importing canvas-confetti
- **`let timer` before `.then()`**: Cleanup-safe pattern — if component unmounts before `.then()` resolves, `timer` is undefined and `clearTimeout(undefined)` is a harmless no-op

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- **Bundle analyzer incompatible with Turbopack**: `npm run analyze` (which runs `ANALYZE=true next build`) was silently ignored when Turbopack was active. Required adding `--webpack` flag: `ANALYZE=true npx next build --webpack`. The Turbopack build still serves as the production build verification — webpack was used only for analysis.

## Next Phase Readiness

- Bundle analysis baseline documented; lazy loading optimizations applied
- Ready for Phase 23 Plan 02 (image optimization, if planned) or subsequent performance work
- No blockers

---
*Phase: 23-performance-audit-and-optimization*
*Completed: 2026-03-06*
