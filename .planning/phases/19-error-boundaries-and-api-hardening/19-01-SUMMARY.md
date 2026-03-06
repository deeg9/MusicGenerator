---
phase: 19-error-boundaries-and-api-hardening
plan: 01
subsystem: api
tags: [error-handling, vitest, tdd, next-api-routes, heartmula]

# Dependency graph
requires:
  - phase: 16-quiz-generation-pipeline
    provides: "quiz-generate route and heartmula integration being hardened"
  - phase: 17-success-page-and-audio-delivery
    provides: "poll-job and audio routes being hardened"
provides:
  - "Production-safe toErrorResponse that strips technicalMessage when NODE_ENV=production"
  - "Structured {error: {category, retryable, userMessage}} shape from all three API routes on failure"
  - "poll-job distinguishes gpu_unavailable (502) from transient errors (QUEUED fallback)"
  - "errors.test.ts with 14 tests covering classifyError + toErrorResponse"
  - "poll-job/route.test.ts with 7 tests"
affects: [19-02, 19-03, phase-19-error-boundaries]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Single enforcement point for production stripping in toErrorResponse (not per-route)"
    - "TDD RED-GREEN for all API hardening changes"
    - "classifyError used at all catch sites — never raw JSON error objects"

key-files:
  created:
    - src/lib/errors.test.ts
    - src/app/api/poll-job/[jobId]/route.test.ts
  modified:
    - src/lib/errors.ts
    - src/app/api/poll-job/[jobId]/route.ts
    - src/app/api/audio/[jobId]/route.ts
    - src/app/api/quiz-generate/route.ts
    - src/app/api/quiz-generate/route.test.ts

key-decisions:
  - "Production stripping lives in toErrorResponse (single enforcement point) not per-route"
  - "poll-job: only gpu_unavailable returns 502; all other throws return QUEUED fallback (preserves existing transient blip handling)"

patterns-established:
  - "toErrorResponse strips debug.technicalMessage to [redacted] in production"
  - "All API route catch blocks use classifyError + toErrorResponse — no bare string errors"

requirements-completed: [ERR-02]

# Metrics
duration: 8min
completed: 2026-03-06
---

# Phase 19 Plan 01: Error Boundaries and API Hardening — Structured Error Responses

**toErrorResponse production stripping + all three API routes (poll-job, audio, quiz-generate) returning structured {error: {category, retryable, userMessage}} with technicalMessage redacted in production**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-06T11:34:00Z
- **Completed:** 2026-03-06T11:42:00Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- `toErrorResponse` now strips `debug.technicalMessage` to `[redacted]` when `NODE_ENV=production`, with the check living in a single enforcement point
- poll-job route classifies errors granularly — network failures (ECONNREFUSED) return 502 with structured error; unknown transient errors keep the QUEUED fallback so callers don't surface errors for blips
- audio route replaces bare `{ error: 'Audio not available' }` string with `classifyError + toErrorResponse`
- quiz-generate validation errors (400) now return standard `{error: {category: 'invalid_input', retryable: false, userMessage}}` instead of non-standard `{error: string}`
- 35 tests covering all routes and error utilities (all passing)

## Task Commits

Each task was committed atomically:

1. **Task 1: Add production stripping to toErrorResponse + errors.test.ts** - `f819ced` (feat)
2. **Task 2: Harden poll-job, audio, quiz-generate with structured errors** - `03e47b7` (feat)

**Plan metadata:** _(final docs commit follows)_

_Note: TDD tasks — tests written first (RED), then implementation (GREEN), committed together per task._

## Files Created/Modified
- `src/lib/errors.ts` - Added `process.env.NODE_ENV === 'production'` check in `toErrorResponse`; fixed `isAbortError` to detect "timed out" keyword (Rule 1 bug fix)
- `src/lib/errors.test.ts` - 14 tests: production stripping (3), classifyError categories (9), retryable flag (2)
- `src/app/api/poll-job/[jobId]/route.ts` - Granular catch: gpu_unavailable → 502 structured error; other → QUEUED fallback
- `src/app/api/poll-job/[jobId]/route.test.ts` - 7 tests: happy path (3), network error (2), transient blip (2)
- `src/app/api/audio/[jobId]/route.ts` - Replaced bare string error with `classifyError + toErrorResponse`
- `src/app/api/quiz-generate/route.ts` - JSON parse error + validation errors use `toErrorResponse` with `invalid_input` category
- `src/app/api/quiz-generate/route.test.ts` - Updated 2 assertions to check `body.error.userMessage` instead of `body.error`

## Decisions Made
- Production stripping lives in `toErrorResponse` as the single enforcement point. Per plan spec — not per-route, not per-middleware.
- poll-job only returns 502 for `gpu_unavailable` category. All other thrown errors (unknown, transient) preserve the QUEUED fallback so minor network blips don't surface to the user as hard failures.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed isAbortError to detect "timed out" keyword**
- **Found during:** Task 1 (errors.test.ts RED phase — test for "Request timed out after 30000ms" classified as 'unknown' instead of 'timeout')
- **Issue:** `isAbortError` checked for `timeout` keyword but not `timed out` — a common error message from native fetch timeouts
- **Fix:** Added `error.message.toLowerCase().includes('timed out')` to the `isAbortError` check
- **Files modified:** `src/lib/errors.ts`
- **Verification:** `classifyError` test for "Request timed out after 30000ms" now passes green
- **Committed in:** `f819ced` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - bug)
**Impact on plan:** Bug fix improves classification accuracy. No scope creep.

## Issues Encountered
- Pre-existing TypeScript issue: `tsconfig.json` missing `"types": ["vitest/globals"]` — tsc cannot see `describe`/`it`/`vi` globals in test files. Logged to deferred-items.md. This is out-of-scope (pre-existing, not caused by this plan's changes). All test files run correctly via vitest runner.

## Next Phase Readiness
- All three API routes now return structured errors — Plan 19-02 (React error boundaries) can rely on `error.category` and `error.retryable` from poll-job/audio routes
- Plan 19-03 (success page integration) has consistent error shape to work with
- 153/153 unit tests passing, 24/24 test files green

---
*Phase: 19-error-boundaries-and-api-hardening*
*Completed: 2026-03-06*

## Self-Check: PASSED

- src/lib/errors.ts: FOUND
- src/lib/errors.test.ts: FOUND
- src/app/api/poll-job/[jobId]/route.test.ts: FOUND
- src/app/api/audio/[jobId]/route.ts: FOUND
- Commit f819ced: FOUND
- Commit 03e47b7: FOUND
