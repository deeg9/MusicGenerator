---
phase: 06-component-audit-core-redesign
plan: 01
subsystem: ui
tags: [tailwind, oklch, color-tokens, semantic-tokens, vitest]

# Dependency graph
requires:
  - phase: 05-token-foundation-theme-infrastructure
    provides: "Semantic token system (globals.css, primitives.css) with --accent, --primary, --muted, --foreground, --background, --card, --border, --destructive tokens"
provides:
  - "src/lib/colors.ts with getCssColorAsHex() and oklchToHex() exports for JS color consumers (wavesurfer.js)"
  - "EnhancedCaptionDisplay using semantic tokens (border-border, bg-card/50, text-muted-foreground, text-foreground)"
  - "LoadingAnimation EQ bars using amber gradient (from-accent to-accent/70)"
  - "GenerationPage container using bg-background text-foreground"
  - "GenerationForm submit button using bg-accent text-accent-foreground (amber CTA)"
affects:
  - "06-02 WaveformPlayer (imports getCssColorAsHex from colors.ts)"
  - "06-03 VariantCard (visual consistency with updated GenerationPage)"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "OKLCH-to-hex pure math conversion via oklchToHex() for wavesurfer.js Shadow DOM color sync"
    - "getCssColorAsHex(varName, el) reads getComputedStyle then converts oklch() format to hex"
    - "Amber (bg-accent) for action/CTA buttons, sky-blue (bg-primary) for playback elements"

key-files:
  created:
    - src/lib/colors.ts
    - src/lib/colors.test.ts
  modified:
    - src/components/EnhancedCaptionDisplay.tsx
    - src/components/LoadingAnimation.tsx
    - src/components/GenerationPage.tsx
    - src/components/GenerationForm.tsx

key-decisions:
  - "TDD getCssColorAsHex tests use real jsdom DOM elements (not plain object mocks) — jsdom's getComputedStyle requires Element type"
  - "Amber locked to CTA backgrounds (bg-accent) — submit button changed from bg-primary to bg-accent per locked brand decision"
  - "EQ loading bars use from-accent to-accent/70 gradient — generating is an action per locked brand decision"

patterns-established:
  - "Pattern: Use real document.createElement() in jsdom tests for getComputedStyle — plain object mocks fail type check"
  - "Pattern: getCssColorAsHex handles both decimal (0.75) and percentage (75%) L values via regex group capture"

requirements-completed: [COMP-02, COMP-03]

# Metrics
duration: 2min
completed: 2026-03-05
---

# Phase 6 Plan 1: OKLCH Color Utility + Leaf Component Token Cleanup Summary

**Pure OKLCH-to-hex converter (colors.ts) and systematic semantic token replacement across 4 components — zero hardcoded palette violations, amber EQ bars and amber submit CTA locked in**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-03-05T20:17:03Z
- **Completed:** 2026-03-05T20:18:41Z
- **Tasks:** 2
- **Files modified:** 6 (2 created, 4 modified)

## Accomplishments
- Created `src/lib/colors.ts` with pure OKLCH math (no deps) — `oklchToHex()` and `getCssColorAsHex()` ready for WaveformPlayer in Plan 03
- 8 unit tests covering black/white/achromatic/out-of-gamut edge cases and DOM fallback behavior — all passing
- Converted all 4 target components to semantic tokens: grep audit returns 0 hardcoded violations
- Amber gradient EQ bars (`from-accent to-accent/70`) and amber submit button (`bg-accent`) match locked brand decisions

## Task Commits

1. **Task 1: Create OKLCH-to-hex color utility with tests** - `b8487be` (feat + test TDD)
2. **Task 2: Replace hardcoded classes in leaf components** - `5ad8592` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `src/lib/colors.ts` - oklchToHex() + getCssColorAsHex() for wavesurfer.js color sync
- `src/lib/colors.test.ts` - 8 unit tests covering edge cases
- `src/components/EnhancedCaptionDisplay.tsx` - border-zinc-700/bg-zinc-900/50/text-zinc-* -> semantic tokens
- `src/components/LoadingAnimation.tsx` - from-violet-600 to-violet-400 -> from-accent to-accent/70
- `src/components/GenerationPage.tsx` - bg-zinc-950 text-white text-zinc-400 -> bg-background text-foreground text-muted-foreground + font-display on h1
- `src/components/GenerationForm.tsx` - submit bg-primary -> bg-accent text-accent-foreground

## Decisions Made
- TDD tests require real jsdom `document.createElement()` elements rather than plain object mocks — jsdom's `getComputedStyle` performs strict `Element` type checking
- Amber locked for CTA/action buttons per Phase 5 brand decisions; sky-blue (primary) reserved for playback controls

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered
- getCssColorAsHex test mock pattern failed with jsdom's strict Element type check. Fixed by using real `document.createElement('div')` with inline style injection in tests. No logic changes to the implementation.

## User Setup Required
None — no external service configuration required.

## Next Phase Readiness
- `getCssColorAsHex` and `oklchToHex` exports ready for import in WaveformPlayer (Plan 02/03)
- Leaf components clean — Plan 02 can focus on WaveformPlayer + VariantCard without leaf component distraction
- All existing tests continue to pass (15 passing, 1 todo)

---
*Phase: 06-component-audit-core-redesign*
*Completed: 2026-03-05*
