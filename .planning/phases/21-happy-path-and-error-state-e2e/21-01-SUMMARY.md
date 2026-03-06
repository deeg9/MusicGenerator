---
phase: 21-happy-path-and-error-state-e2e
plan: 01
subsystem: testing
tags: [playwright, e2e, page-object-model, error-states, route-mocking]

# Dependency graph
requires:
  - phase: 20-page-object-models-and-smoke-tests
    provides: QuizPage POM, SuccessPage POM, fixtures (VALID_QUIZ_DATA, STEP_HEADINGS)
provides:
  - Extended SuccessPage POM with 4 error state locators (errorHeading, podDownHeading, tryAgainButton, startOverButton)
  - E2E-06: generation failure test (FAILED poll status shows error heading + retry button, no infinite spinner)
  - E2E-07: pod offline test (502 from quiz-generate shows graceful error overlay on /quiz, no navigation away)
affects: [21-02-happy-path, Phase 22 mobile E2E, any future error state regression tests]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "page.route() mocks registered BEFORE navigation — ensures mock is active for immediate responses"
    - "Pitfall 4 mitigation: skip loading heading assertion when mock returns FAILED synchronously"
    - "Specific regex anchor (^creating your song) avoids collision with error heading (something went wrong creating your song)"

key-files:
  created:
    - e2e/error-states.spec.ts
  modified:
    - e2e/pages/success.ts

key-decisions:
  - "/creating your song/i regex in SuccessPage.loadingHeading also matches error heading 'Something went wrong creating your song' — use anchored regex ^creating your song/i in not.toBeVisible() assertion to avoid false positive"
  - "Skip loading heading assertion in E2E-06 per Research Pitfall 4 — mock returns FAILED synchronously so loading state may be gone before assertion can run"
  - "Test 2 (pod offline) uses page.route() for /api/quiz-generate — confirms user stays on /quiz URL after 502 response"

patterns-established:
  - "Route mocks: register page.route() before goto() to guarantee mock is in place when page starts fetching"
  - "URL assertion: await expect(page).toHaveURL(/\\/quiz$/) to verify no navigation after quiz error"
  - "Title assertion: await expect(page).not.toHaveTitle(/error/i) to verify not on error boundary page"

requirements-completed: [E2E-06, E2E-07]

# Metrics
duration: 15min
completed: 2026-03-06
---

# Phase 21 Plan 01: Error State E2E Summary

**page.route() mocked E2E tests proving FAILED generation shows error heading with retry button and 502 pod-offline keeps user on /quiz with graceful error overlay**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-03-06T20:35:00Z
- **Completed:** 2026-03-06T20:49:02Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Extended SuccessPage POM with 4 error state locators (errorHeading, podDownHeading, tryAgainButton, startOverButton) without modifying any existing locators
- Created E2E-06: generation failure test that mocks poll-job to return FAILED status and asserts the error heading and Try Again button are visible with no infinite spinner
- Created E2E-07: pod offline test that mocks quiz-generate to return 502 gpu_unavailable, navigates all 6 quiz steps, and asserts the graceful error overlay appears while user stays on /quiz
- All 15 previously-passing E2E tests remain passing with 2 new tests added

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend SuccessPage POM with error state locators** - `1fce920` (feat)
2. **Task 2: Create error state E2E specs for generation failure and pod offline** - `0fb44a3` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `e2e/pages/success.ts` - Added errorHeading, podDownHeading, tryAgainButton, startOverButton locators
- `e2e/error-states.spec.ts` - New file: 2 error state E2E tests using page.route() mocks

## Decisions Made

- **Regex collision discovered and mitigated:** The existing `loadingHeading` locator uses `/creating your song/i` which also matches the error heading `"Something went wrong creating your song"`. To avoid a false-positive in the `not.toBeVisible()` assertion, used `^creating your song/i` (anchored regex) directly in the test instead of through the POM locator. The existing POM locator was NOT modified per plan constraint.
- **Loading assertion skipped per Pitfall 4:** In E2E-06, the plan explicitly notes that when the mock returns FAILED synchronously, the loading heading may be gone before any assertion can run. The test does not assert the loading heading was ever visible — it only asserts the error heading IS visible (implying loading resolved) and the loading heading is NOT visible (no infinite spinner).
- **Happy-path.spec.ts pre-existing failure noted:** `e2e/happy-path.spec.ts` was an untracked pre-existing file that times out waiting 90s for real A40 generation. This failure is not caused by this plan's changes and is outside scope (Plan 02 scope).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Anchored regex to avoid loadingHeading/errorHeading locator collision**
- **Found during:** Task 2 (test execution, first run)
- **Issue:** `success.loadingHeading` uses `/creating your song/i` which also matches the error heading `"Something went wrong creating your song"` — the `not.toBeVisible()` assertion failed because the locator found the error heading (which is visible)
- **Fix:** Used `page.getByRole('heading', { name: /^creating your song/i })` directly in the assertion to anchor the match, avoiding the collision without modifying the existing POM locator
- **Files modified:** e2e/error-states.spec.ts
- **Verification:** Both tests pass — `2 passed (3.0s)`
- **Committed in:** `0fb44a3` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - bug in test assertion caused by ambiguous regex)
**Impact on plan:** Auto-fix necessary for test correctness. No scope creep. POM locator unchanged per plan constraint.

## Issues Encountered

- Pre-existing `e2e/happy-path.spec.ts` (untracked file from plan 21-02) times out after 90s waiting for real A40 pod generation. Not caused by this plan's changes, documented here for awareness. Full suite: 15/16 pass (the 1 failure is plan 21-02's happy-path test).

## Next Phase Readiness

- Error state E2E coverage complete for generation failure and pod offline scenarios
- SuccessPage POM is fully equipped with error state locators for plan 21-02's happy path test
- All mocked E2E tests run unconditionally without the A40 pod — CI-friendly
- Plan 21-02 (happy path E2E) can now proceed knowing error state infrastructure is in place

## Self-Check: PASSED

- e2e/error-states.spec.ts: FOUND
- e2e/pages/success.ts: FOUND
- 21-01-SUMMARY.md: FOUND
- Commit 1fce920 (Task 1): FOUND
- Commit 0fb44a3 (Task 2): FOUND

---
*Phase: 21-happy-path-and-error-state-e2e*
*Completed: 2026-03-06*
