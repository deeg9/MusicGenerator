---
phase: 12-same-page-workspace-transformation
plan: 01
subsystem: ui
tags: [react, typescript, vitest, tdd, hero, prompt]

# Dependency graph
requires:
  - phase: 11-library-ui-persistent-player
    provides: AudioPlayerContext and persistent player infrastructure
provides:
  - HeroSection component with onCreateClick(prompt) prop interface
  - Prompt-first homepage layout with textarea + Create button
  - page.tsx updated to pass onCreateClick with hero-create event dispatch
affects: [12-02, 12-same-page-workspace-transformation]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Prompt-first hero: textarea + Create button; parent receives prompt via onCreateClick callback"
    - "Disabled button pattern: disabled={!prompt.trim()} with disabled:opacity-50 disabled:cursor-not-allowed"

key-files:
  created: []
  modified:
    - src/components/HeroSection.tsx
    - src/components/HeroSection.test.tsx
    - src/app/page.tsx

key-decisions:
  - "HeroSection onCreateClick prop receives full prompt string — parent (page.tsx) decides what to do with it (workspace entry in Phase 12-02)"
  - "page.tsx updated to 'use client' + dispatches hero-create CustomEvent for Phase 12-02 to listen on"
  - "ExampleCard component NOT deleted — removed only from HeroSection render; file remains for style-guide use"

patterns-established:
  - "onCreateClick callback pattern: hero collects prompt, passes up; parent wires workspace entry"

requirements-completed: [HOME-01, HOME-02]

# Metrics
duration: 7min
completed: 2026-03-06
---

# Phase 12 Plan 01: HeroSection Prompt-First Rewrite Summary

**Prompt-first HeroSection with onCreateClick(prompt) prop, replacing ExampleCards and CTA with a centered textarea + disabled-when-empty Create button**

## Performance

- **Duration:** 7 min
- **Started:** 2026-03-06T00:51:08Z
- **Completed:** 2026-03-06T00:58:00Z
- **Tasks:** 1 (TDD)
- **Files modified:** 3

## Accomplishments
- Rewrote HeroSection to be prompt-first: headline, subtitle, large textarea, Create button
- Added `onCreateClick: (prompt: string) => void` prop; button disabled when textarea empty
- Removed ExampleCard import, EXAMPLES array, navigate-create event, scrollIntoView from component
- Kept Typewriter headline, amber glow blob, wave SVG background, py-16 layout
- Updated page.tsx to pass `onCreateClick` handler that scrolls to #create and dispatches `hero-create` CustomEvent
- 9 tests written and passing (TDD RED then GREEN)

## Task Commits

Each task was committed atomically:

1. **Task 1 RED: Failing tests for prompt-first HeroSection** - `a673039` (test)
2. **Task 1 GREEN: HeroSection implementation + page.tsx update** - `329acae` (feat)

**Plan metadata:** _(docs commit follows)_

_Note: TDD task has two commits: failing tests first, then implementation._

## Files Created/Modified
- `src/components/HeroSection.tsx` - Rewritten prompt-first hero with onCreateClick prop, textarea, disabled Create button
- `src/components/HeroSection.test.tsx` - 9 tests covering all behaviors (textarea, Create button, onCreateClick, empty-guard, no ExampleCards, Typewriter, glow)
- `src/app/page.tsx` - Updated to 'use client', passes onCreateClick handler, dispatches hero-create event

## Decisions Made
- `page.tsx` promoted to `'use client'` to wire `onCreateClick` with browser scroll + CustomEvent dispatch for Phase 12-02 workspace entry
- `hero-create` CustomEvent dispatched with `{ detail: { prompt } }` — Phase 12-02 will listen and switch to workspace mode
- `ExampleCard` component file untouched — only removed from HeroSection's render tree

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Updated page.tsx to pass required onCreateClick prop**
- **Found during:** Task 1 (HeroSection implementation)
- **Issue:** HeroSection now requires `onCreateClick` prop; page.tsx called `<HeroSection />` with no props, which would cause TypeScript error and break the build
- **Fix:** Added `'use client'` directive, `handleCreateClick` function, and passed `onCreateClick={handleCreateClick}` to HeroSection. Handler scrolls to #create section and dispatches `hero-create` CustomEvent for Phase 12-02 to wire workspace entry
- **Files modified:** src/app/page.tsx
- **Verification:** Build compiles, HeroSection tests pass
- **Committed in:** 329acae (Task 1 GREEN commit)

---

**Total deviations:** 1 auto-fixed (Rule 3 - blocking)
**Impact on plan:** Required to prevent build failure. Minimal scope — page.tsx stub that Phase 12-02 will extend.

## Issues Encountered
- Pre-existing build error in `/style-guide` page (unrelated to this plan) — confirmed pre-existing via git stash test, left in deferred-items
- Pre-existing test failures in `src/app/library/page.test.tsx` (LibrarySongCard/AudioPlayerProvider missing) — confirmed pre-existing, not caused by our changes

## Next Phase Readiness
- HeroSection delivers prompt via `onCreateClick(prompt)` callback — Phase 12-02 can listen for `hero-create` event and wire same-page workspace transformation
- page.tsx is already `'use client'` with stub handler in place for Phase 12-02 to extend

---
*Phase: 12-same-page-workspace-transformation*
*Completed: 2026-03-06*
