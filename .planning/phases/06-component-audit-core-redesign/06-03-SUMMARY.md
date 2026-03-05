---
phase: 06-component-audit-core-redesign
plan: 03
subsystem: ui
tags: [react, wavesurfer, next-themes, tailwind, semantic-tokens, tdd, vitest]

# Dependency graph
requires:
  - phase: 06-component-audit-core-redesign
    plan: 01
    provides: getCssColorAsHex utility for JS-level OKLCH-to-hex color resolution

provides:
  - WaveformPlayer with theme-synced waveform colors via wavesurfer.setOptions() on resolvedTheme change
  - VariantCard fully rewritten with semantic token classes (amber CTA, sky-blue active ring)
  - VariantCard.test.tsx with 6 render assertions covering active state, download buttons, audio unavailable
  - Zero hardcoded palette violations across entire src/components/ directory

affects:
  - Phase 07+ (all component consumers inherit brand-correct token usage)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Imperative wavesurfer.setOptions() for theme sync — avoids destroy/recreate audio interruption"
    - "Static placeholder colors in useWavesurfer() init, then live update via setOptions() effect keyed on resolvedTheme"
    - "Mock WaveformPlayer in JSDOM tests to avoid wavesurfer Shadow DOM complexity"
    - "TDD flow: RED commit (failing tests) → GREEN commit (implementation) → verify full suite"

key-files:
  created:
    - src/components/VariantCard.test.tsx
  modified:
    - src/components/WaveformPlayer.tsx
    - src/components/VariantCard.tsx
    - src/components/WaveformPlayer.test.tsx

key-decisions:
  - "setOptions() for wavesurfer theme sync — imperative update avoids destroy/recreate cycle that would interrupt playback"
  - "Static placeholder waveColor/progressColor in useWavesurfer() init — do NOT pass as reactive props"
  - "Amber (bg-accent) locked to Download MP3 CTA — amber = action, sky-blue (bg-primary) = interactive/playing state"
  - "Active VariantCard uses ring-primary/50 + border-primary/30 + shadow-primary/10 for cohesive sky-blue playing state"

patterns-established:
  - "Pattern: Wavesurfer theme sync via useEffect([wavesurfer, resolvedTheme]) calling setOptions(getCssColorAsHex(...))"
  - "Pattern: WaveformPlayer mocked in JSDOM tests with vi.mock('./WaveformPlayer') returning data-testid div"

requirements-completed: [COMP-04, COMP-05]

# Metrics
duration: 2min
completed: 2026-03-05
---

# Phase 06 Plan 03: WaveformPlayer Theme Sync + VariantCard Token Rewrite Summary

**Theme-synced WaveformPlayer via imperative setOptions() on resolvedTheme, VariantCard fully rewritten with amber CTA and sky-blue active ring, and final grep audit confirming zero hardcoded palette violations across all components.**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-05T20:20:51Z
- **Completed:** 2026-03-05T20:22:55Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- WaveformPlayer now calls `wavesurfer.setOptions({ waveColor, progressColor })` in a `useEffect` keyed on `[wavesurfer, resolvedTheme]` — colors update on theme toggle without interrupting audio playback
- All hardcoded zinc/violet/red/white classes replaced in both WaveformPlayer and VariantCard with semantic tokens
- VariantCard MP3 download uses `bg-accent text-accent-foreground` (amber CTA), active card uses `ring-primary/50` (sky-blue playing state)
- Final grep audit: zero hardcoded palette violations in any .tsx component file
- Full test suite: 46 tests pass, 13 test files, 0 failures

## Task Commits

Each task was committed atomically with TDD RED/GREEN commits:

1. **Task 1 RED: WaveformPlayer failing tests** - `f8d7b1b` (test)
2. **Task 1 GREEN: WaveformPlayer implementation** - `d8e6dcd` (feat)
3. **Task 2 RED: VariantCard failing tests** - `b32a392` (test)
4. **Task 2 GREEN: VariantCard implementation** - `39ec452` (feat)

_Note: TDD tasks have separate RED (test) and GREEN (implementation) commits._

## Files Created/Modified

- `src/components/WaveformPlayer.tsx` - Added useTheme, getCssColorAsHex imports; theme sync useEffect; replaced all hardcoded classes with semantic tokens
- `src/components/WaveformPlayer.test.tsx` - Added mockSetOptions, next-themes mock, 3 new semantic token assertions
- `src/components/VariantCard.tsx` - Full className rewrite: bg-card, border-border, ring-primary/50, bg-accent, hover:bg-secondary
- `src/components/VariantCard.test.tsx` - New: 6 render assertions for active ring, download buttons, audio unavailable text

## Decisions Made

- **setOptions() imperative pattern:** Using `wavesurfer.setOptions()` in a separate `useEffect` keyed on `[wavesurfer, resolvedTheme]` avoids the destroy/recreate cycle that reactive prop passing would trigger — critical for not interrupting mid-playback audio
- **Static placeholder colors in init:** `waveColor: '#888', progressColor: '#0ea5e9'` as static strings in `useWavesurfer()` — the theme sync effect immediately overwrites them on mount with the correct OKLCH-resolved hex
- **Amber for CTA, sky-blue for interactive:** Download MP3 = `bg-accent` (amber = action), play button + active ring = `bg-primary`/`ring-primary` (sky-blue = interactive/playing state)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All components in src/components/ now use semantic tokens exclusively — zero hardcoded palette classes
- WaveformPlayer theme sync is production-ready: colors update on toggle without audio interruption
- Full component test suite passing (46 tests, 13 files)
- Phase 06 component audit + core redesign is complete: ready to advance to Phase 07

---
*Phase: 06-component-audit-core-redesign*
*Completed: 2026-03-05*

## Self-Check: PASSED

All files found, all commits verified:
- FOUND: src/components/WaveformPlayer.tsx
- FOUND: src/components/VariantCard.tsx
- FOUND: src/components/VariantCard.test.tsx
- FOUND: .planning/phases/06-component-audit-core-redesign/06-03-SUMMARY.md
- COMMIT f8d7b1b: test(06-03): add failing tests for WaveformPlayer semantic tokens + theme sync
- COMMIT d8e6dcd: feat(06-03): WaveformPlayer theme sync + semantic token replacement
- COMMIT b32a392: test(06-03): add failing tests for VariantCard semantic token rewrite
- COMMIT 39ec452: feat(06-03): VariantCard semantic token rewrite + final grep audit clean
