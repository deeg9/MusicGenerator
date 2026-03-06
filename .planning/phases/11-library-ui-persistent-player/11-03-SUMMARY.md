---
phase: 11-library-ui-persistent-player
plan: "03"
subsystem: ui
tags: [gsap, scramble-text, animation, react, vitest]

# Dependency graph
requires:
  - phase: 11-library-ui-persistent-player
    provides: LibrarySongCard as 'use client' component with cardRef and useAudioPlayer integration (plan 01)
provides:
  - GSAP ScrambleTextPlugin hover animation on LibrarySongCard title using contextSafe pattern
  - 14-test suite covering animation trigger, safety guard, and all existing card behaviors
affects:
  - 12-animated-workspace-transitions

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "vi.hoisted() for mock functions used inside vi.mock() factory closures — avoids 'cannot access before initialization' hoisting error"
    - "contextSafe from useGSAP wraps event handlers so GSAP tweens are tracked and reverted on component unmount"
    - "gsap imported exclusively from @/lib/gsap-config.ts — never directly from 'gsap' package"

key-files:
  created: []
  modified:
    - src/components/LibrarySongCard.tsx
    - src/components/LibrarySongCard.test.tsx

key-decisions:
  - "vi.hoisted() required for mock functions used inside vi.mock() factories — plain const declarations are not available at hoist time"
  - "contextSafe is critical: without it, hover-triggered tweens are not tracked by GSAP context and leak on unmount"

patterns-established:
  - "vi.hoisted() pattern: always use for mock functions referenced in vi.mock() factory bodies in Vitest"
  - "GSAP contextSafe pattern: wrap all event-triggered gsap.to() calls in contextSafe() from useGSAP({ scope: ref })"

requirements-completed: [LIB2-05]

# Metrics
duration: 2min
completed: 2026-03-05
---

# Phase 11 Plan 03: GSAP ScrambleText Hover Animation Summary

**GSAP ScrambleTextPlugin animation on LibrarySongCard title hover — music symbols (♪♫♩♬♭♮♯) cycle before resolving, using contextSafe for proper tween cleanup on unmount**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-05T23:47:38Z
- **Completed:** 2026-03-05T23:49:30Z
- **Tasks:** 1
- **Files modified:** 2

## Accomplishments

- Added GSAP ScrambleTextPlugin hover animation to LibrarySongCard title with music symbol character set
- Used contextSafe from useGSAP({ scope: cardRef }) to ensure tween cleanup on component unmount
- Added two new tests: scrambleText assertion on mouseenter, null-safety guard for titleRef
- Fixed vi.hoisted() mock pattern to avoid Vitest factory hoisting error
- All 14 tests green, TypeScript clean

## Task Commits

1. **Task 1: Add GSAP ScrambleText hover animation to LibrarySongCard title** - `946d281` (feat)

**Plan metadata:** _(docs commit follows)_

## Files Created/Modified

- `src/components/LibrarySongCard.tsx` — Added useRef, useGSAP, gsap imports; cardRef + titleRef; contextSafe handleMouseEnter with scrambleText config; onMouseEnter and ref attachments
- `src/components/LibrarySongCard.test.tsx` — vi.hoisted() for mock functions; vi.mock for gsap-config and @gsap/react; two new tests for scramble behavior

## Decisions Made

- `vi.hoisted()` is required (not optional) when mock functions are referenced inside `vi.mock()` factory closures — plain `const mockGsapTo = vi.fn()` at module scope is not available when the factory runs due to Vitest hoisting
- `contextSafe` pattern from `useGSAP` is the correct way to attach GSAP tweens in event handlers — ensures tweens are part of the GSAP context and reverted on unmount

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Used vi.hoisted() for mock function to fix Vitest hoisting error**
- **Found during:** Task 1 (test file authoring)
- **Issue:** Plan instructed `const mockGsapTo = vi.fn()` as module-level variable, then referenced inside `vi.mock()` factory. Vitest hoists `vi.mock()` calls to the top of the file, before `const` declarations are initialized — results in "Cannot access 'mockGsapTo' before initialization" ReferenceError
- **Fix:** Replaced `const mockGsapTo = vi.fn()` with `const { mockGsapTo } = vi.hoisted(() => ({ mockGsapTo: vi.fn() }))`, which runs before hoisted mocks
- **Files modified:** src/components/LibrarySongCard.test.tsx
- **Verification:** All 14 tests pass after fix
- **Committed in:** 946d281 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 — bug in plan's mock pattern)
**Impact on plan:** Essential fix for tests to work at all. No scope creep.

## Issues Encountered

Pre-existing test failures in `HeroSection.test.tsx`, `library/page.test.tsx`, and `BottomAudioPlayer.test.tsx` (16 failing tests across 3 files) — all unrelated to this plan's changes. Out-of-scope per deviation boundary rule. Logged here for awareness but not fixed.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- LibrarySongCard is fully complete: play/pause integration (plan 01), scramble text animation (plan 03)
- Phase 11 wave 2 is now complete (plans 02 and 03 done)
- Phase 12 (animated workspace transitions) can proceed — no blockers from this plan

## Self-Check: PASSED

- src/components/LibrarySongCard.tsx — FOUND
- src/components/LibrarySongCard.test.tsx — FOUND
- .planning/phases/11-library-ui-persistent-player/11-03-SUMMARY.md — FOUND
- commit 946d281 — FOUND

---
*Phase: 11-library-ui-persistent-player*
*Completed: 2026-03-05*
