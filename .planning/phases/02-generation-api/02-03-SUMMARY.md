---
phase: 02-generation-api
plan: "03"
subsystem: ui
tags: [react, nextjs, polling, hooks, tailwind, audio]

# Dependency graph
requires:
  - phase: 02-generation-api plan 01
    provides: format_input BFF integration, /api/generate and /api/status/:jobId routes
  - phase: 02-generation-api plan 02
    provides: GenerationForm component with all input controls (prompt, lyrics, genre chips, duration, instrumental)
provides:
  - useGenerationStatus polling hook (2.5s interval, elapsed time, cleanup on unmount)
  - VariantCard component with native audio player and download link
  - EnhancedCaptionDisplay component for AI-enhanced caption
  - GenerationResults orchestrator component (loading / completed / failed states)
  - GenerationPage client orchestrator wiring form, API, and results
  - Complete end-to-end generation flow at /
affects: [phase-03-playback-download, phase-04-ux-polish]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - useEffect + setInterval polling hook with dual-interval cleanup (poll + elapsed)
    - Immediate first poll on mount, then recurring 2500ms interval
    - Clear jobId before new submission to prevent stale poll stacking
    - Client orchestrator (GenerationPage) owns state; sub-components are stateless presentational
    - Server Component (page.tsx) as thin wrapper delegating to client orchestrator

key-files:
  created:
    - src/hooks/useGenerationStatus.ts
    - src/components/VariantCard.tsx
    - src/components/EnhancedCaptionDisplay.tsx
    - src/components/GenerationResults.tsx
    - src/components/GenerationPage.tsx
  modified:
    - src/app/page.tsx

key-decisions:
  - "useGenerationStatus clears both poll and elapsed intervals via stopPolling() — single cleanup path prevents timer leak on unmount or jobId change"
  - "Network errors (fetch throws) keep polling; HTTP non-ok responses set error and stop polling — distinguishes transient from terminal failures"
  - "setJobId(null) before new submission clears stale useEffect, prevents two simultaneous poll loops"
  - "page.tsx is a Server Component thin shell — only renders GenerationPage; all interactivity lives in client components"

patterns-established:
  - "Polling Hook Pattern: useEffect watching jobId, dual setInterval (poll + elapsed), immediate first fetch, terminal-status stop"
  - "State Lifting: GenerationPage owns jobId/enhancedCaption/isSubmitting; results and form are purely prop-driven"
  - "Error Tiers: alert() for submit errors (Phase 4 replaces with toast), red inline card for poll errors"

requirements-completed: [GEN-01, GEN-02, GEN-03, GEN-04, GEN-05, GEN-06]

# Metrics
duration: 25min
completed: 2026-03-05
---

# Phase 2 Plan 03: Polling Hook, Results Display, and Page Wiring Summary

**React polling hook + 4 components wiring form → /api/generate → 2.5s status poll → dual variant audio cards with download links**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-03-05T02:20:00Z
- **Completed:** 2026-03-05T02:45:00Z
- **Tasks:** 3 (2 auto + 1 human-verify checkpoint)
- **Files modified:** 6

## Accomplishments

- `useGenerationStatus` hook polls `/api/status/:jobId` every 2.5 seconds with proper cleanup, immediate first poll, elapsed-time counter, and terminal-status stop
- `GenerationResults` shows four states: loading with animated pulsing dot and elapsed time, completed with 2-column variant grid, failed with retryable hint, hook error
- `GenerationPage` orchestrates form submission to `/api/generate`, captures jobId + enhancedCaption, passes both to results — form stays visible for regeneration
- End-to-end flow verified by human: form controls, submit, loading state, AI-enhanced caption display, dual variant cards with native audio playback and WAV download

## Task Commits

Each task was committed atomically:

1. **Task 1: Create useGenerationStatus hook and result display components** - `62c368e` (feat)
2. **Task 2: Wire page.tsx and GenerationPage orchestrator** - `3d93729` (feat)
3. **Task 3: Verify end-to-end generation flow** - checkpoint approved by user

**Plan metadata:** (docs commit — see below)

## Files Created/Modified

- `src/hooks/useGenerationStatus.ts` - Polling hook: 2.5s interval, 1s elapsed counter, immediate first poll, dual-interval cleanup, transient network error tolerance
- `src/components/VariantCard.tsx` - Stateless card: native `<audio controls>` + download link, "Audio unavailable" fallback
- `src/components/EnhancedCaptionDisplay.tsx` - Stateless read-only display for AI-enhanced caption in monospace font
- `src/components/GenerationResults.tsx` - Client component orchestrating hook + four display states + variant grid
- `src/components/GenerationPage.tsx` - Client orchestrator: owns jobId/enhancedCaption/isSubmitting, calls /api/generate, renders form above results
- `src/app/page.tsx` - Server Component thin shell rendering GenerationPage

## Decisions Made

- `useGenerationStatus` uses a single `stopPolling()` callback that clears both intervals (poll + elapsed) — keeps cleanup logic in one place and prevents leaked timers on re-render
- Network errors on fetch keep polling (transient); HTTP non-ok stops polling with error state — important distinction: a 503 should not kill the UX permanently
- `setJobId(null)` before each new submission ensures the previous useEffect cleanup runs before a new poll loop starts, preventing two simultaneous polling loops
- `alert()` used for submit-time errors in Phase 2 with an explicit code comment noting Phase 4 replaces with a toast — keeps scope clean

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 2 complete: all input options (prompt, lyrics, genre chips, duration, instrumental), format_input BFF integration, async polling, and results display are fully wired
- Phase 3 (Playback and Download) can replace `VariantCard`'s native `<audio>` element with waveform visualization (WaveSurfer or similar) — the card's `url` prop is the clean integration point
- R2 presigned URL 403 issue (HEAD returns 403, GET works) is pre-existing from Phase 1 — browser audio players use GET so playback is unaffected; download links also use GET

## Self-Check: PASSED

All expected artifacts verified:
- FOUND: 02-03-SUMMARY.md
- FOUND: src/hooks/useGenerationStatus.ts
- FOUND: src/components/GenerationPage.tsx
- FOUND: src/components/VariantCard.tsx
- FOUND: src/components/EnhancedCaptionDisplay.tsx
- FOUND: src/components/GenerationResults.tsx
- FOUND commit: 62c368e (Task 1)
- FOUND commit: 3d93729 (Task 2)

---
*Phase: 02-generation-api*
*Completed: 2026-03-05*
