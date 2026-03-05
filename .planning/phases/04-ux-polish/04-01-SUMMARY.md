---
phase: 04-ux-polish
plan: "01"
subsystem: ui
tags: [loading-animation, state-machine, error-handling, test-stubs]
dependency_graph:
  requires: []
  provides: [LoadingAnimation, GenerationPhase, inline-error-banners, wave-keyframes, test-stubs]
  affects: [GenerationPage, GenerationResults]
tech_stack:
  added: [framer-motion]
  patterns: [phase-state-machine, inline-error-banner, css-keyframes-animation]
key_files:
  created:
    - src/components/LoadingAnimation.tsx
    - src/components/ui/text-shimmer.tsx
    - src/components/ExampleCard.tsx
    - src/components/LoadingAnimation.test.tsx
    - src/components/ModeToggle.test.tsx
    - src/components/ExampleCard.test.tsx
    - src/components/GenerationForm.test.tsx
  modified:
    - src/components/GenerationPage.tsx
    - src/components/GenerationResults.tsx
    - src/app/globals.css
    - package.json
key_decisions:
  - "Phase state machine (idle/submitting/polling/done/error) replaces isSubmitting boolean for clean view swapping"
  - "ExampleCard.tsx stub created to satisfy TypeScript — full implementation deferred to Plan 03"
  - "TextShimmer uses inline backgroundImage rather than Tailwind class to avoid purging issues"
  - "showElapsed prop on LoadingAnimation allows elapsed timer during polling but hides it during submitting phase"
metrics:
  duration: "2 min"
  completed_date: "2026-03-05"
  tasks_completed: 3
  files_modified: 10
---

# Phase 04 Plan 01: Loading Animation and State Machine Summary

**One-liner:** Equalizer-bar loading animation with 3-stage progression, phase state machine replacing isSubmitting, and inline error banners replacing all alert() calls — plus Wave 0 test stubs for all Phase 4 components.

## What Was Built

### LoadingAnimation Component

`src/components/LoadingAnimation.tsx` renders 7 equalizer bars animated with CSS `scaleY` transforms using staggered `animationDelay` inline styles (Tailwind v4 has no `animation-delay-*` utilities). The bar animation is defined via `@keyframes eq-bar` in `globals.css` and referenced through the `--animate-eq-bar` custom property in the `@theme inline` block. Below the bars, the stage label renders via `TextShimmer` — a Framer Motion component that sweeps a violet gradient highlight across the text in a loop.

Exports: `STAGE_LABELS = ['Initializing', 'Generating', 'Finalizing']` and `STAGE_DURATIONS = [1500, 4000, Infinity]`.

### TextShimmer Component

`src/components/ui/text-shimmer.tsx` wraps any string in a Framer Motion `motion.span` that animates `backgroundPosition` from right to left on repeat, creating a shimmer effect across the text. Uses `bg-clip-text text-transparent` with a linear gradient containing the project's violet accent color.

### GenerationPage State Machine

`src/components/GenerationPage.tsx` now uses `type GenerationPhase = 'idle' | 'submitting' | 'polling' | 'done' | 'error'` instead of an `isSubmitting` boolean. Key behaviors:

- **idle**: GenerationForm is visible
- **submitting**: LoadingAnimation shown at stageIndex 0 (Initializing); form hidden
- **polling**: LoadingAnimation shown with live stageIndex (advances at 1500ms and 5500ms) and elapsed timer
- **done**: GenerationResults rendered
- **error**: Inline error banner with "Try again" (retryable) or "Change settings" (non-retryable) buttons

`handleRetry` re-submits `lastFormData.current`, allowing the user to retry without re-filling the form. All `alert()` calls removed.

### GenerationResults Simplification

`src/components/GenerationResults.tsx` now only renders when `data?.status === 'completed'`. All loading and error UI removed — those states are handled by GenerationPage. The component returns `null` if `jobId` is null or data is not yet completed.

### CSS Keyframes

`src/app/globals.css` additions:
- `@keyframes eq-bar`: scaleY(0.15) → scaleY(1) alternate, creating the pumping equalizer effect
- `@keyframes wave`: translateX 0 → -5% → 0, for the hero wave accent used by Plan 03
- `--animate-eq-bar` and `--animate-wave` custom properties in `@theme inline`
- `scroll-behavior: smooth` on body for anchor links

### Wave 0 Test Stubs

Four test stub files created following the `WaveformPlayer.test.tsx` pattern:
- `LoadingAnimation.test.tsx`: 5 tests — all passing immediately
- `ModeToggle.test.tsx`: 4 tests (3 active + 1 todo) — will pass after Plan 02
- `ExampleCard.test.tsx`: 3 tests (2 active + 1 todo) — will pass after Plan 03
- `GenerationForm.test.tsx`: 3 tests (2 active + 1 todo) — will pass after Plan 02

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing] Created ExampleCard.tsx stub component**
- **Found during:** Task 2 TypeScript check
- **Issue:** `ExampleCard.test.tsx` imports `./ExampleCard` which doesn't exist; `npx tsc --noEmit` failed with TS2307
- **Fix:** Created minimal `src/components/ExampleCard.tsx` stub with correct prop interface (`title`, `genre`, `audioUrl`, `isActive`, `onPlay`) — Plan 03 will replace with full implementation
- **Files modified:** `src/components/ExampleCard.tsx`
- **Commit:** 2672151

## Self-Check: PASSED

All files verified present:
- src/components/LoadingAnimation.tsx - FOUND
- src/components/ui/text-shimmer.tsx - FOUND
- src/components/ExampleCard.tsx - FOUND
- src/components/LoadingAnimation.test.tsx - FOUND
- src/components/ModeToggle.test.tsx - FOUND
- src/components/ExampleCard.test.tsx - FOUND
- src/components/GenerationForm.test.tsx - FOUND

All commits verified:
- 3a6ee41: test(04-01): add Wave 0 test stubs for all Phase 4 components - FOUND
- 73c86d1: feat(04-01): add LoadingAnimation component with equalizer bars and CSS keyframes - FOUND
- 2672151: feat(04-01): refactor GenerationPage with phase state machine and inline error banners - FOUND
