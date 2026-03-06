---
phase: 20-page-object-models-and-smoke-tests
plan: 01
subsystem: testing
tags: [playwright, page-object-model, e2e, typescript]

# Dependency graph
requires:
  - phase: 18-playwright-infrastructure
    provides: Playwright config, global setup, chromium project, webServer config
provides:
  - LandingPage POM with hero heading, CTA link, and nav link locators
  - QuizPage POM with per-step selectors, navigation methods, error alert locator
  - SuccessPage POM stub (for Phase 21)
  - VALID_QUIZ_DATA and STEP_HEADINGS shared fixtures
  - Landing page smoke spec — 3 passing E2E tests
affects: [21-quiz-e2e-spec, 22-mobile-responsive-tests]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - POM classes encapsulate all locator knowledge — specs never contain raw selectors
    - Type-only imports for Page/Locator (import { type Page }) keep e2e code clean
    - beforeEach creates POM instance; each test calls goto() itself for clarity

key-files:
  created:
    - e2e/pages/landing.ts
    - e2e/pages/quiz.ts
    - e2e/pages/success.ts
    - e2e/fixtures.ts
    - e2e/landing.spec.ts

key-decisions:
  - "POM nav link selectors use .first() to resolve desktop/mobile duplicates in Header component"
  - "nextButton and createSongButton kept separate in QuizPage (not merged) — forces specs to be explicit about which step they are on"
  - "VALID_QUIZ_DATA uses 'as const' — prevents accidental mutation across specs"

patterns-established:
  - "POM pattern: constructor(page) + readonly Locator properties + action methods (goto, click*, select*)"
  - "Fixtures: shared VALID_QUIZ_DATA object with empty email (optional field) for all quiz traversal tests"

requirements-completed: [INFRA-04, E2E-01]

# Metrics
duration: 8min
completed: 2026-03-06
---

# Phase 20 Plan 01: Page Object Models and Fixtures Summary

**Three Playwright POM classes (LandingPage, QuizPage, SuccessPage) plus shared fixtures file and a 3-test landing page smoke spec — all tests pass on chromium**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-03-06T20:14:00Z
- **Completed:** 2026-03-06T20:22:41Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- LandingPage POM with hero heading, CTA link, and desktop nav link locators
- QuizPage POM with per-step inputs, navigation buttons, error alert, and helper methods
- SuccessPage POM stub (loading/ready headings, audio player, download link) ready for Phase 21
- Shared fixtures: VALID_QUIZ_DATA and STEP_HEADINGS (all 6 step headings)
- Landing page E2E spec: 3 tests pass (hero loads, CTA navigates to /quiz, nav links visible)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create POMs and fixtures file** - `5ad1372` (feat)
2. **Task 2: Create landing page smoke E2E spec** - `a1ffe5d` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `e2e/pages/landing.ts` - LandingPage POM (hero heading, CTA button, nav links, howItWorks section)
- `e2e/pages/quiz.ts` - QuizPage POM (step inputs, next/back/create buttons, error alert, helper methods)
- `e2e/pages/success.ts` - SuccessPage POM stub (loading, ready, audio, download locators)
- `e2e/fixtures.ts` - VALID_QUIZ_DATA and STEP_HEADINGS shared exports
- `e2e/landing.spec.ts` - 3-test landing page smoke spec using LandingPage POM

## Decisions Made

- Nav link locators use `.first()` to resolve desktop/mobile duplicate anchors in the Header component (both desktop nav and mobile drawer render the same links)
- `nextButton` and `createSongButton` are kept as separate locators in QuizPage — specs must be explicit about which step they are on, preventing accidental "Next" clicks on the final step
- `VALID_QUIZ_DATA` uses `as const` to prevent test data mutation across specs

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All three POM classes ready for Phase 21 (quiz flow E2E spec) and Phase 22 (mobile responsive tests)
- VALID_QUIZ_DATA provides a complete, valid quiz submission for full-funnel traversal
- SuccessPage POM stub needs real assertions added in Phase 21
- Existing smoke.spec.ts continues to pass alongside the new landing spec

---
*Phase: 20-page-object-models-and-smoke-tests*
*Completed: 2026-03-06*
