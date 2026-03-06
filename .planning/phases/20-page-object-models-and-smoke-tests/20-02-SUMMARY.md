---
phase: 20-page-object-models-and-smoke-tests
plan: "02"
subsystem: testing
tags: [playwright, e2e, quiz, validation, navigation, page-object-model]

requires:
  - phase: 20-01
    provides: QuizPage POM, fixtures (VALID_QUIZ_DATA, STEP_HEADINGS), Playwright config

provides:
  - e2e/quiz-validation.spec.ts: 6 tests covering per-step invalid input rejection
  - e2e/quiz-navigation.spec.ts: 3 tests covering full traversal and back/forward state preservation
  - Full E2E suite green (13 tests: smoke + landing + validation + navigation)

affects: [21-generation-e2e, 22-mobile-viewports]

tech-stack:
  added: []
  patterns:
    - "errorAlert locator: filter out Next.js route announcer via :not(#__next-route-announcer__)"
    - "selectOption: use locator('button:has(span:text-is(...))') for SelectionCards with subLabels"
    - "nextButton: exact 'Next' string (not regex) to avoid matching Next.js DevTools button"
    - "localStorage seeding before page.reload() to pre-populate quiz state"

key-files:
  created:
    - e2e/quiz-validation.spec.ts
    - e2e/quiz-navigation.spec.ts
  modified:
    - e2e/pages/quiz.ts

key-decisions:
  - "errorAlert uses :not(#__next-route-announcer__) filter — Next.js injects a route announcer div with role=alert that conflicts with strict mode"
  - "selectOption changed from exact:true getByRole to button:has(span:text-is()) — SelectionCards include subLabel text in accessible name, breaking exact match"
  - "nextButton changed from /next/i regex to exact 'Next' string — Next.js DevTools button contains 'next' causing strict mode violation"

patterns-established:
  - "Strict mode: always scope role locators away from framework-injected elements (Next.js DevTools, route announcer)"
  - "SelectionCard clicks: use button:has(span:text-is()) not getByRole with exact label"
  - "Assertion-based waiting: toHaveValue() before clickNext(), toBeVisible() for step transitions"

requirements-completed: [E2E-02, E2E-03, E2E-04]

duration: 4min
completed: 2026-03-06
---

# Phase 20 Plan 02: Quiz Validation and Navigation E2E Specs Summary

**9 quiz E2E tests covering per-step validation rejection and forward/back state preservation, using QuizPage POM and assertion-based waiting only**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-06T20:24:49Z
- **Completed:** 2026-03-06T20:29:02Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Created `e2e/quiz-validation.spec.ts`: 6 tests each exercising one quiz step — invalid input triggers error alert, valid input advances to next step
- Created `e2e/quiz-navigation.spec.ts`: 3 tests covering full 6-step traversal with valid data (E2E-02), back button navigation (E2E-04 partial), and multi-step forward/back/forward state preservation (E2E-04 full)
- Fixed 3 QuizPage POM locator bugs discovered during test execution — all caused strict mode violations with Next.js framework-injected elements
- Full suite `npm run test:e2e` green: 13 tests pass in 5.3s

## Task Commits

Each task was committed atomically:

1. **Task 1: Create quiz validation E2E spec** - `39d8178` (feat)
2. **Task 2: Create quiz navigation E2E spec** - `713e13d` (feat)

## Files Created/Modified

- `e2e/quiz-validation.spec.ts` - 6 quiz validation tests with `fillStepAndAdvance` helper
- `e2e/quiz-navigation.spec.ts` - 3 quiz navigation tests including localStorage seeding pattern
- `e2e/pages/quiz.ts` - Fixed 3 locator bugs (nextButton, selectOption, errorAlert)

## Decisions Made

- Fixed QuizPage POM in Task 1 rather than workarounding in spec files — POM fixes benefit all future specs
- Used `button:has(span:text-is())` for SelectionCard clicks (consistent with how SelectionCard renders label in nested span with subLabel)
- Test 3 (forward-back-forward) seeds localStorage before `page.reload()` rather than navigating all 6 steps — faster and tests the actual persistence mechanism

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed nextButton regex matching Next.js DevTools button**
- **Found during:** Task 1 (quiz validation spec)
- **Issue:** `getByRole('button', { name: /next/i })` matched both the quiz "Next" button and the Next.js DevTools button (aria-label="Open Next.js Dev Tools"), causing strict mode violation on every test
- **Fix:** Changed to `getByRole('button', { name: 'Next', exact: true })`
- **Files modified:** `e2e/pages/quiz.ts`
- **Verification:** All 6 validation tests passed after fix
- **Committed in:** `39d8178` (Task 1 commit)

**2. [Rule 1 - Bug] Fixed selectOption for SelectionCards with subLabels**
- **Found during:** Task 1 (quiz validation spec, step 3+ tests timing out)
- **Issue:** `getByRole('button', { name: label, exact: true })` failed for SelectionCards because accessible name includes both label ("Pop") and subLabel ("Upbeat and fun"), so `exact: 'Pop'` never matched
- **Fix:** Changed to `page.locator('button:has(span:text-is("${label}"))')` targeting the inner label span exactly
- **Files modified:** `e2e/pages/quiz.ts`
- **Verification:** All 6 validation tests passed after fix; navigation tests also confirm selectOption works
- **Committed in:** `39d8178` (Task 1 commit)

**3. [Rule 1 - Bug] Fixed errorAlert strict mode violation from Next.js route announcer**
- **Found during:** Task 1 (quiz validation spec, all tests)
- **Issue:** `getByRole('alert')` matched multiple elements: validation `<p role="alert">` elements AND Next.js route announcer `<div role="alert" id="__next-route-announcer__">`, causing strict mode violation
- **Fix:** Changed to `page.locator('[role="alert"]:not(#__next-route-announcer__)').first()` to exclude the framework element
- **Files modified:** `e2e/pages/quiz.ts`
- **Verification:** All 6 validation tests passed; error alerts correctly detected per step
- **Committed in:** `39d8178` (Task 1 commit)

---

**Total deviations:** 3 auto-fixed (all Rule 1 - Bug in QuizPage POM locators)
**Impact on plan:** All fixes required for correctness — Next.js dev-mode framework injections conflict with naive role selectors. No scope creep.

## Issues Encountered

None beyond the 3 POM locator bugs — all resolved automatically per deviation rules.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All quiz E2E specs (validation + navigation) are green and committed
- QuizPage POM is now robust against Next.js framework-injected elements
- Phase 21 (generation E2E) can use same POM patterns — note `createSongButton` was intentionally NOT clicked in these tests (Phase 21 scope)

---
*Phase: 20-page-object-models-and-smoke-tests*
*Completed: 2026-03-06*
