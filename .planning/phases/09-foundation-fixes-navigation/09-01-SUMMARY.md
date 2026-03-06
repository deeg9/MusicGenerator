---
phase: 09-foundation-fixes-navigation
plan: 01
subsystem: ui
tags: [react, gsap, next.js, routing, testing-library, vitest]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: Next.js scaffold with Sidebar and GenerationPage components

provides:
  - Fixed GenerationPage useEffect with phaseRef pattern and [] dependency array
  - gsap@3.14.2 and @gsap/react@2.1.2 installed
  - Centralized GSAP config at src/lib/gsap-config.ts with ScrambleTextPlugin
  - /library route with branded empty state
  - Sidebar Library link wired to /library with active state (border-l-[3px] border-primary)
  - Mobile nav active state matching desktop
  - Vitest setup with @testing-library/jest-dom matchers

affects: [10-library-ui, 11-audio-player, 12-transitions]

# Tech tracking
tech-stack:
  added: [gsap@^3.14.2, @gsap/react@^2.1.2]
  patterns:
    - "phaseRef pattern: use useRef to capture state for stable event listener closures"
    - "gsap-config.ts: centralized GSAP import with plugin registration, all consumers import from this module"
    - "Active nav: usePathname() === href with border-l-[3px] border-primary on active, padding compensation pl-[9px] to prevent icon shift"

key-files:
  created:
    - src/lib/gsap-config.ts
    - src/app/library/page.tsx
    - src/app/library/page.test.tsx
    - src/components/GenerationPage.test.tsx
    - src/lib/gsap-config.test.ts
    - src/test-setup.ts
  modified:
    - src/components/GenerationPage.tsx
    - src/components/layout/Sidebar.tsx
    - package.json
    - vitest.config.ts

key-decisions:
  - "gsap-config.ts is the single import source for gsap — no other file imports directly from 'gsap'"
  - "phaseRef pattern chosen over adding phase to useEffect deps to avoid re-registering event listener on every phase change"
  - "Library page is a Server Component (no 'use client') — static markup, Phase 10 will extract LibraryEmpty component"
  - "Sidebar Home href changed from '#home' to '/' enabling real pathname-based active state"

patterns-established:
  - "phaseRef: useRef(state) + useEffect to keep ref current — stable event listener without stale closure"
  - "Sidebar active: border-l-[3px] border-primary bg-accent/10 with pl-[9px] padding compensation"
  - "GSAP imports: always from src/lib/gsap-config.ts, never directly from 'gsap'"

requirements-completed: [FIX-01, FIX-02, FIX-03, LIB2-01]

# Metrics
duration: 15min
completed: 2026-03-05
---

# Phase 9 Plan 01: Foundation Fixes + Navigation Summary

**Fixed GenerationPage useEffect memory leak with phaseRef pattern, installed gsap@3.14.2 with centralized gsap-config.ts, and wired /library route with sidebar active state**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-03-05T22:01:15Z
- **Completed:** 2026-03-05T22:16:00Z
- **Tasks:** 3 (Task 0 + Task 1 + Task 2)
- **Files modified:** 10

## Accomplishments

- Fixed navigate-create useEffect: added phaseRef to avoid stale closure, added [] dependency array so listener registers exactly once on mount
- Installed gsap@^3.14.2 and @gsap/react@^2.1.2; created src/lib/gsap-config.ts as single GSAP import point with ScrambleTextPlugin registered
- Created /library route (Server Component) with branded empty state and "Create your first song" CTA
- Updated Sidebar: Home href '/', Library href '/library', active state with border-l-[3px] border-primary on both desktop and mobile nav
- Added @testing-library/jest-dom setup so React component tests can use toBeInTheDocument() and related matchers
- All 8 tests pass across 3 plan test files

## Task Commits

Each task was committed atomically:

1. **Task 0: Create Wave 0 test stubs** - `ee3e09e` (test)
2. **Task 1: Fix useEffect leak + install GSAP + create gsap-config.ts** - `1381577` (feat)
3. **Task 2: Wire sidebar Library link + active state + /library stub page** - `57256f6` (feat)
4. **Deviation fix: Remove /s regex flag for ES2017 compatibility** - `2b9b8bd` (fix)

## Files Created/Modified

- `src/components/GenerationPage.tsx` - Added phaseRef pattern, fixed useEffect dep array
- `src/components/GenerationPage.test.tsx` - Tests for phaseRef and [] dep array
- `src/lib/gsap-config.ts` - Centralized GSAP with ScrambleTextPlugin registration
- `src/lib/gsap-config.test.ts` - Tests for exports and directive
- `src/components/layout/Sidebar.tsx` - usePathname, NAV_ITEMS href updates, active state
- `src/app/library/page.tsx` - Branded empty state Server Component
- `src/app/library/page.test.tsx` - Render tests for empty state and CTA
- `src/test-setup.ts` - @testing-library/jest-dom import
- `vitest.config.ts` - Added setupFiles pointing to test-setup.ts
- `package.json` - Added gsap and @gsap/react

## Decisions Made

- phaseRef pattern chosen over adding `phase` to useEffect deps — prevents re-registering event listener every time phase changes
- gsap-config.ts established as the sole GSAP import source for the project — centralizes plugin registration, prevents double-registration in future files
- Library page is a Server Component (static) — no "use client" needed until Phase 10 adds interactive library cards
- Sidebar Home href changed from '#home' to '/' — required for usePathname-based active state to work on the home route

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed test regex too restrictive for multi-line useEffect body**
- **Found during:** Task 1 (verification run)
- **Issue:** Test used `[^}]*navigate-create[^}]*` which fails when useEffect body contains nested `}` (closing brace of inner function). Pattern worked in isolation but failed against actual code structure.
- **Fix:** Rewrote regex to match the distinctive `window.addEventListener` + `return` + `}` + `, []` closing sequence instead of matching the entire body with `[^}]*`
- **Files modified:** src/components/GenerationPage.test.tsx
- **Verification:** Tests passed after regex update
- **Committed in:** 1381577 (Task 1 commit)

**2. [Rule 3 - Blocking] Added @testing-library/jest-dom setup file**
- **Found during:** Task 2 (library page test run)
- **Issue:** `toBeInTheDocument()` and `toHaveAttribute()` were invalid Chai properties — jest-dom matchers not registered. Package was installed but no setup file configured in vitest.
- **Fix:** Created `src/test-setup.ts` importing `@testing-library/jest-dom`; added to `vitest.config.ts` `setupFiles`
- **Files modified:** src/test-setup.ts, vitest.config.ts
- **Verification:** Library page tests passed (3/3)
- **Committed in:** 57256f6 (Task 2 commit)

**3. [Rule 1 - Bug] Removed /s regex flag incompatible with ES2017 tsconfig target**
- **Found during:** TypeScript check after Task 2
- **Issue:** `npx tsc --noEmit` reported error TS1501 — `/s` dotall flag requires ES2018+, tsconfig targets ES2017. The patterns used explicit `\n` so dotall flag was unnecessary.
- **Fix:** Removed `/s` flag from both regex patterns in GenerationPage.test.tsx
- **Files modified:** src/components/GenerationPage.test.tsx
- **Verification:** TypeScript check clean, tests still pass
- **Committed in:** 2b9b8bd (separate fix commit)

---

**Total deviations:** 3 auto-fixed (2 Rule 1 bugs, 1 Rule 3 blocking)
**Impact on plan:** All auto-fixes necessary for correctness. No scope creep. Pre-existing HeroSection.test.tsx failures and /style-guide build error are out of scope (logged to deferred items).

## Issues Encountered

- Pre-existing HeroSection.test.tsx failures (2 tests) from Phase 6 — not caused by our changes, out of scope
- Pre-existing /style-guide build error in next build — present before our changes, out of scope

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Library route /library is live with empty state — Phase 10 can add library cards and extract LibraryEmpty component
- GSAP available globally via gsap-config.ts — Phase 12 animation work can begin
- Sidebar active state working for Home (/) and Library (/library)
- phaseRef pattern documented for future useEffect event listeners

## Self-Check: PASSED

- src/lib/gsap-config.ts: FOUND
- src/app/library/page.tsx: FOUND
- src/test-setup.ts: FOUND
- Commit ee3e09e (test stubs): FOUND
- Commit 1381577 (GSAP + useEffect fix): FOUND
- Commit 57256f6 (library page + sidebar): FOUND
- Commit 2b9b8bd (regex fix): FOUND

---
*Phase: 09-foundation-fixes-navigation*
*Completed: 2026-03-05*
