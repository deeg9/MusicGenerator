---
phase: 12-same-page-workspace-transformation
plan: 03
subsystem: ui
tags: [framer-motion, css-grid, responsive, animation, react]

# Dependency graph
requires:
  - phase: 12-same-page-workspace-transformation
    provides: "Plan 12-02: page.tsx HomeContent with isWorkspaceActive state, HeroSection onCreateClick wiring, URL ?mode=create sync"

provides:
  - "Two-panel CSS Grid workspace layout (form left 2fr, results right 3fr) on md+ screens"
  - "Single-column mobile stack on < 768px"
  - "AnimatePresence + motion.section/motion.div hero-to-workspace animated transition in page.tsx"
  - "Reduced motion support (duration: 0 when prefers-reduced-motion)"
  - "Back button in workspace header with onBack prop plumbing"
  - "Player bar clearance via pb-[var(--player-bar-height)] on both grid columns"
  - "Idle state hint in right column ('Submit a prompt to get started')"

affects:
  - "Phase 12 visual verification"
  - "Any future phase modifying page.tsx or GenerationPage.tsx layout"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "AnimatePresence mode=wait for mutually exclusive hero/workspace transition in page.tsx"
    - "isWorkspaceActive boolean drives entirely separate layout branch in GenerationPage"
    - "onBack prop passed from page.tsx exitWorkspace() to GenerationPage for back navigation"
    - "pb-[var(--player-bar-height)] CSS var for safe area clearance above player bar"

key-files:
  created: []
  modified:
    - src/app/page.tsx
    - src/components/GenerationPage.tsx
    - src/components/GenerationPage.test.tsx

key-decisions:
  - "onBack prop accepted by GenerationPage — page.tsx owns exitWorkspace logic (pushState cleanup + state reset)"
  - "isWorkspaceActive=true renders entirely separate JSX branch (two-panel grid), not just CSS class toggle"
  - "Idle right column shows 'Submit a prompt to get started' hint instead of empty space"
  - "ArrowLeft (lucide-react) used for back button icon — consistent with project icon library"

patterns-established:
  - "Two-panel workspace pattern: left column = always-visible form, right column = async result states via AnimatePresence"

requirements-completed: [HOME-04, HOME-06]

# Metrics
duration: 15min
completed: 2026-03-06
---

# Phase 12 Plan 03: Two-Panel Workspace Layout and Animated Transition Summary

**Framer Motion AnimatePresence hero-to-workspace transition with two-panel CSS Grid (form left 2fr, results right 3fr), player bar clearance, back button, and reduced-motion support**

## Performance

- **Duration:** ~45 min
- **Started:** 2026-03-06T17:03:35Z
- **Completed:** 2026-03-06T17:48:00Z
- **Tasks:** 2 of 2 (complete)
- **Files modified:** 3

## Accomplishments
- Added `AnimatePresence mode="wait"` + `motion.section`/`motion.div` wrappers in `page.tsx` for smooth hero-to-workspace transition
- Added `useReducedMotion` to `page.tsx` — animation duration becomes 0 when `prefers-reduced-motion: reduce` is set
- Added `exitWorkspace()` in `page.tsx` with `pushState` cleanup and `onBack` prop passed to `GenerationPage`
- Restructured `GenerationPage` into two-panel CSS Grid (`grid-cols-1 md:grid-cols-[2fr_3fr]`) when `isWorkspaceActive` is true
- Left column always shows `GenerationForm`; right column shows idle hint / loading / error / results via `AnimatePresence`
- Both columns have `pb-[var(--player-bar-height)]` for player bar clearance
- Back button above grid using `ArrowLeft` lucide icon, fires `onBack` prop
- Added 6 new TDD tests covering grid classes, player bar padding, AnimatePresence presence, motion wrappers, and column structure

## Task Commits

Each task was committed atomically:

1. **Task 1: Two-panel grid layout and Framer Motion hero/workspace transition** - `857580a` (feat)
2. **Task 2: Visual verification of complete workspace transformation** - approved via Playwright automated testing (no code commit — checkpoint approval)

**Plan metadata:** `60b3dd9` (docs: complete two-panel workspace layout plan)

## Files Created/Modified
- `src/app/page.tsx` - Added AnimatePresence + motion wrappers, useReducedMotion, exitWorkspace(), onBack prop
- `src/components/GenerationPage.tsx` - Added two-panel grid layout branch when isWorkspaceActive, back button, onBack prop
- `src/components/GenerationPage.test.tsx` - Added 6 new tests + updated framer-motion mock to include motion.section and AnimatePresence with data-testid

## Decisions Made
- `onBack` prop accepted by `GenerationPage` — `page.tsx` owns `exitWorkspace` logic (pushState + state reset). This keeps page.tsx as the single source of truth for URL state.
- `isWorkspaceActive=true` renders an entirely separate JSX branch (two-panel grid), not just a CSS class toggle — cleaner separation of concerns, no conditional class soup.
- Idle state in right column shows a brief prompt hint ("Submit a prompt to get started") rather than empty space — better UX.
- Used `ArrowLeft` from `lucide-react` for the back button icon, consistent with the rest of the project icon library.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered
- The framer-motion mock in the test file needed to be extended to support `motion.section` (only `motion.div` was mocked previously). Added `motion.section` to the mock and updated `AnimatePresence` to render a `<div data-testid="animate-presence">` wrapper so tests can assert its presence in the DOM.

## User Setup Required
None — no external service configuration required.

## Next Phase Readiness
- Phase 12 is fully complete — v2.0 milestone delivered
- All 3 Phase 12 plans complete: HeroSection prompt-first rewrite, workspace URL state wiring, two-panel animated workspace layout
- Visual verification approved via Playwright automated testing — all 8 verification steps passed
- No blockers. AudioPlayerContext initialization timing concern (blocker in STATE.md) was not triggered — Phase 11 integration handles it correctly.

---
*Phase: 12-same-page-workspace-transformation*
*Completed: 2026-03-06*
