---
phase: 22-mobile-responsiveness
plan: 02
subsystem: testing
tags: [playwright, e2e, mobile, touch-targets, quiz-funnel, success-page, mock]

requires:
  - phase: 22-01
    provides: CSS fixes for mobile responsiveness (touch targets, no overflow)
  - phase: 20-01
    provides: QuizPage POM, VALID_QUIZ_DATA, STEP_HEADINGS fixtures
  - phase: 21-01
    provides: SuccessPage POM, page.route() patterns, toBeAttached() pattern for audio

provides:
  - Mobile E2E test suite for quiz funnel at iPhone SE (375px) viewport
  - Mobile E2E test suite for success page audio player at iPhone SE (375px) viewport
  - Touch target assertions for SelectionCard, Next, Back, and Play buttons
  - Horizontal overflow assertions for quiz and success pages

affects: [23-performance]

tech-stack:
  added: []
  patterns:
    - "Mobile viewport from --project flag (not test.use() or setViewportSize)"
    - "PillButton voice selection uses getByRole with exact:true (not span selector)"
    - "poll-job mock uses path pattern /api/poll-job/** matching [jobId] route"
    - "status: 'COMPLETED' (not 'DONE') to match PollResponse type in success page"
    - "scrollIntoViewIfNeeded() for below-fold elements on mobile"

key-files:
  created:
    - e2e/mobile-quiz.spec.ts
    - e2e/mobile-success.spec.ts
  modified: []

key-decisions:
  - "PillButton (voice preference) uses getByRole with exact:true not button:has(span:text-is()) — PillButton renders text directly, no span wrapper"
  - "poll-job mock returns status: 'COMPLETED' not 'DONE' — PollResponse type uses COMPLETED/FAILED/QUEUED/PROCESSING"
  - "Route mock pattern /api/poll-job/** matches path param route [jobId], not query string ?jobId="

patterns-established:
  - "Mobile quiz spec: voice preference (PillButton) needs getByRole exact match, not span selector"
  - "Success page mock: always mock /api/audio/** alongside /api/poll-job/** to prevent audio errors"

requirements-completed: [MOB-02, MOB-03]

duration: 6min
completed: 2026-03-06
---

# Phase 22 Plan 02: Mobile E2E Specs Summary

**Playwright E2E specs for quiz funnel (5 tests) and success page (4 tests) at iPhone SE viewport verifying no overflow and 44px+ touch targets**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-06T22:18:08Z
- **Completed:** 2026-03-06T22:24:27Z
- **Tasks:** 2
- **Files modified:** 2 (created)

## Accomplishments
- Created `e2e/mobile-quiz.spec.ts` with 5 tests: no overflow, SelectionCard 44px, Next 44px, Back 44px, all 6 steps navigable
- Created `e2e/mobile-success.spec.ts` with 4 tests: audio player attached, play button 44px+, no overflow, download visible
- All 18 tests pass on both mobile-iphone (iPhone SE 375px) and mobile-ipad (iPad 768px) projects
- Mock pattern established: poll-job + audio API mocked before navigation for synchronous COMPLETED response

## Task Commits

Each task was committed atomically:

1. **Task 1: Create mobile-quiz.spec.ts for MOB-02** - `989a9e1` (feat)
2. **Task 2: Create mobile-success.spec.ts for MOB-03** - `456ecf3` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `e2e/mobile-quiz.spec.ts` - 5 mobile quiz funnel tests using QuizPage POM and VALID_QUIZ_DATA/STEP_HEADINGS
- `e2e/mobile-success.spec.ts` - 4 mobile success page tests with mocked poll-job + audio routes

## Decisions Made
- PillButton voice preference buttons use `getByRole('button', { name: '...', exact: true })` not the span-based selector — PillButton renders text directly as button text, not in a `<span>` like SelectionCard does
- poll-job mock returns `status: 'COMPLETED'` to match the `PollResponse` interface in the success page component (`'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED'`) — the plan example showed `'DONE'` which is the HeartMuLa raw status, not the client-facing status
- Route mock pattern `/api/poll-job/**` matches the actual path-param route `/api/poll-job/[jobId]`, not a query-string pattern

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] PillButton selector fix for voice preference in all-6-steps test**
- **Found during:** Task 1 (mobile-quiz.spec.ts)
- **Issue:** Plan specified `selectOption('Female')` but POM's `selectOption` uses `button:has(span:text-is())` which matches SelectionCard (has `<span>` children) but not PillButton (text rendered directly in button). Test timed out on 'Female' selection.
- **Fix:** Used `page.getByRole('button', { name: VALID_QUIZ_DATA.voicePreference, exact: true })` with `scrollIntoViewIfNeeded()` for the voice preference PillButton
- **Files modified:** `e2e/mobile-quiz.spec.ts`
- **Verification:** All 5 quiz tests pass (18/18 across both mobile projects)
- **Committed in:** `989a9e1` (Task 1 commit)

**2. [Rule 1 - Bug] Poll-job mock status corrected from 'DONE' to 'COMPLETED'**
- **Found during:** Task 2 (mobile-success.spec.ts) — caught via code review before running
- **Issue:** Plan example showed `status: 'DONE'` in mock body. But the success page `PollResponse` type is `'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED'` — `'DONE'` would not trigger the ready state, leaving the page in loading state.
- **Fix:** Used `status: 'COMPLETED'` in mock. The `'DONE'` note in the plan referred to HeartMuLa's raw status being normalized to uppercase, not the poll-job client response.
- **Files modified:** `e2e/mobile-success.spec.ts`
- **Verification:** All 4 success tests pass — readyHeading visible, audio player attached
- **Committed in:** `456ecf3` (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (both Rule 1 - Bug)
**Impact on plan:** Both fixes necessary for tests to pass — no scope creep.

## Issues Encountered
- Pre-existing happy-path.spec.ts failure on chromium (unrelated to this plan — pod availability/timing). This was pre-existing before any changes in this plan.

## Next Phase Readiness
- Phase 22 complete: CSS fixes (Plan 01) + E2E coverage (Plan 02) for mobile responsiveness
- 18 mobile tests passing across iPhone SE and iPad viewports
- Ready for Phase 23 (Performance) or `/gsd:new-milestone`

## Self-Check: PASSED

All files verified present. All commits verified in git log.

---
*Phase: 22-mobile-responsiveness*
*Completed: 2026-03-06*
