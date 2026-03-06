---
phase: 18-playwright-setup-and-environment
plan: 01
subsystem: testing
tags: [playwright, vitest, chromium, next.js, bundle-analyzer, e2e, global-setup]

# Dependency graph
requires: []
provides:
  - Playwright 1.58.x E2E harness with webServer, reducedMotion, 30s default timeout
  - globalSetup pod health check that sets POD_AVAILABLE env var
  - Chromium + mobile-iphone + mobile-ipad project definitions
  - e2e/smoke.spec.ts minimal smoke test (passes)
  - npm scripts: test:e2e, test:e2e:headed, test:unit, analyze
  - @next/bundle-analyzer integration in next.config.ts
affects: [19-landing-page-tests, 20-quiz-funnel-tests, 21-generation-tests, 22-mobile-responsive-tests, 23-performance]

# Tech tracking
tech-stack:
  added:
    - "@playwright/test ^1.58.2"
    - "@next/bundle-analyzer ^16.1.6"
  patterns:
    - "globalSetup for pre-test infrastructure check (pod health)"
    - "e2e/tsconfig.json with moduleResolution: node to override bundler mode"
    - "reducedMotion: reduce in contextOptions to disable Framer Motion animations"
    - "test.setTimeout(120_000) per-test for generation tests (not global)"

key-files:
  created:
    - playwright.config.ts
    - e2e/global-setup.ts
    - e2e/tsconfig.json
    - e2e/smoke.spec.ts
  modified:
    - package.json (added 4 scripts)
    - next.config.ts (wrapped with BundleAnalyzer)
    - .gitignore (added playwright-report/, test-results/, e2e/.auth/)
    - vitest.config.ts (added e2e/ to exclude list)

key-decisions:
  - "A40 pod URL updated to 96y089egxk3xm5 — pod confirmed reachable (HTTP 200) during execution"
  - "test:e2e runs --project=chromium only; mobile projects defined for Phase 22 explicit runs"
  - "globalSetup uses fetch with 10s AbortController timeout — any HTTP response = pod up"
  - "vitest exclude added for e2e/ — prevents Playwright specs from being picked up by vitest"

patterns-established:
  - "Pattern: generation-dependent tests call test.skip(process.env.POD_AVAILABLE !== 'true') in beforeAll"
  - "Pattern: per-test timeout override with test.setTimeout(120_000) for generation tests"

requirements-completed: [INFRA-01, INFRA-02, INFRA-03]

# Metrics
duration: 10min
completed: 2026-03-06
---

# Phase 18 Plan 01: Playwright Setup and Environment Summary

**Playwright 1.58.x E2E harness with webServer auto-start, A40 pod health check via globalSetup, reducedMotion for Framer Motion, and bundle analyzer integration**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-03-06T18:59:00Z
- **Completed:** 2026-03-06T19:09:12Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- Playwright installed and configured with chromium webServer auto-start, 30s default timeout, reducedMotion for Framer Motion
- globalSetup loads .env.local via dotenv, pings A40 pod (96y089egxk3xm5), logs reachability — A40 confirmed reachable (HTTP 200)
- Smoke test passes end-to-end (`npm run test:e2e` green), all 126 unit tests pass
- Four npm scripts added: test:e2e, test:e2e:headed, test:unit, analyze

## Task Commits

Each task was committed atomically:

1. **Task 1: Install packages and create all config files** - `827b3a0` (chore)
2. **Task 2: Update HEARTMULA_URL to A40 pod and verify connectivity** - `4045faa` (feat)

**Plan metadata:** (docs commit — to follow)

## Files Created/Modified
- `playwright.config.ts` - Playwright config with webServer, reducedMotion, 30s timeout, 3 projects (chromium, mobile-iphone, mobile-ipad)
- `e2e/global-setup.ts` - A40 pod health check, sets POD_AVAILABLE env var
- `e2e/tsconfig.json` - TypeScript config with moduleResolution: node (required for Node.js context)
- `e2e/smoke.spec.ts` - Minimal smoke test: app loads at root
- `package.json` - Added test:e2e, test:e2e:headed, test:unit, analyze scripts
- `next.config.ts` - Wrapped with @next/bundle-analyzer (ANALYZE=true flag)
- `.gitignore` - Added playwright-report/, test-results/, e2e/.auth/
- `vitest.config.ts` - Added e2e/ to exclude list (auto-fix)

## Decisions Made
- A40 pod URL confirmed as `96y089egxk3xm5-8000.proxy.runpod.net` — pod alive and returning HTTP 200
- test:e2e script runs --project=chromium only; mobile projects defined but activated in Phase 22
- globalSetup health check: any HTTP response (including 404) = pod up; only network error/timeout = pod down

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added vitest exclude for e2e/ directory**
- **Found during:** Task 2 (running `npm run test:unit` verification)
- **Issue:** Vitest was picking up `e2e/smoke.spec.ts` and failing because `@playwright/test` exports are incompatible with vitest's test runner — causing 1 failed test file
- **Fix:** Added `exclude: ['**/node_modules/**', '**/dist/**', 'e2e/**']` to vitest.config.ts `test` section
- **Files modified:** `vitest.config.ts`
- **Verification:** `npm run test:unit` now shows 20 passed / 0 failed (126 tests green)
- **Committed in:** `4045faa` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Auto-fix was necessary for unit test correctness. No scope creep.

## Issues Encountered
- Previous RTX 4090 pod URL (`zwysa4aou3a8it-8000.proxy.runpod.net`) was still active when Task 1 ran; A40 pod URL update in Task 2 confirmed A40 is running (HTTP 200). Both pods appear currently reachable.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Playwright harness complete and smoke test green — Phase 19 (landing page tests) can begin immediately
- A40 pod confirmed reachable (HTTP 200) — generation tests in Phase 21 can target live pod
- POD_AVAILABLE env var pattern established — generation specs use `test.skip(process.env.POD_AVAILABLE !== 'true')` in beforeAll

---
*Phase: 18-playwright-setup-and-environment*
*Completed: 2026-03-06*
