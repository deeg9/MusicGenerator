---
phase: 12-same-page-workspace-transformation
plan: 02
subsystem: ui
tags: [react, next.js, url-state, client-components, navigation, workspace]

# Dependency graph
requires:
  - phase: 12-same-page-workspace-transformation
    provides: "HeroSection onCreateClick prop and page.tsx 'use client' stub from Plan 12-01"
provides:
  - "page.tsx HomeContent coordinator toggling hero vs workspace via ?mode=create URL state"
  - "GenerationPage isWorkspaceActive + initialPrompt props"
  - "GenerationForm initialPrompt prop for pre-fill"
  - "Sidebar Create nav using pushState/?mode=create instead of #create scroll"
  - "Browser back button support via popstate event listener"
  - "9 TDD tests covering URL state coordinator and workspace props"
affects: [12-03-three-panel-workspace-layout]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "pushState for history-entry-creating navigation (enables back button)"
    - "popstate listener for browser back/forward sync in client coordinator"
    - "Conditional render pattern: hero vs workspace based on URL state"
    - "initialPrompt as prop chain: page.tsx → GenerationPage → GenerationForm"

key-files:
  created: []
  modified:
    - src/app/page.tsx
    - src/components/GenerationPage.tsx
    - src/components/GenerationForm.tsx
    - src/components/GenerationPage.test.tsx
    - src/components/layout/Sidebar.tsx

key-decisions:
  - "popstate listener (not useEffect[searchParams]) used for back-button sync — avoids reverting state when pushState fires but Next.js searchParams hasn't updated"
  - "Create nav item excluded from isActive state in Sidebar — it's a transient action, not a destination"
  - "Sidebar handleCreateNav: pushState when on homepage, router.push when on other pages"

patterns-established:
  - "pushState pattern: use for workspace entry (adds history entry), use router.replace only for within-workspace param updates (?job=)"
  - "popstate sync: window.addEventListener('popstate') in coordinator to sync URL state changes from browser navigation"

requirements-completed: [HOME-03, HOME-05]

# Metrics
duration: 6min
completed: 2026-03-06
---

# Phase 12 Plan 02: Same-Page Workspace Transformation Summary

**Hero-to-workspace in-place toggle via ?mode=create URL state with pushState history entries, popstate back-button sync, and Sidebar Create link updated to navigate to /?mode=create**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-06T00:55:30Z
- **Completed:** 2026-03-06T01:01:09Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- page.tsx converted to 'use client' HomeContent coordinator that toggles between HeroSection and GenerationPage based on `?mode=create` URL param — refresh on `?mode=create` restores workspace
- Browser back button works: `popstate` listener in HomeContent reverts `isWorkspaceActive` to false when user presses back from workspace
- `enterWorkspace(prompt)` uses `window.history.pushState` (not `router.replace`) to add a history entry, enabling back navigation
- GenerationPage and GenerationForm now accept `isWorkspaceActive` and `initialPrompt` props — hero prompt pre-fills workspace form
- Sidebar Create link updated: uses `pushState` when on homepage, `router.push('/?mode=create')` when on other pages; dispatches `navigate-create` event for GenerationPage idle reset
- 9 TDD tests written and passing covering workspace props, URL state coordinator behavior, and the navigate-create listener pattern

## Task Commits

Each task was committed atomically:

1. **Task 1: Convert page.tsx to client coordinator + update GenerationPage props** - `2942a4a` (feat)
2. **Task 2: Update Sidebar Create link to enter workspace mode** - `8761e62` (feat)

**Plan metadata:** (docs commit — see final commit)

## Files Created/Modified

- `src/app/page.tsx` - Rewritten as 'use client' HomeContent coordinator with popstate listener and enterWorkspace function
- `src/components/GenerationPage.tsx` - Added `isWorkspaceActive` and `initialPrompt` props interface
- `src/components/GenerationForm.tsx` - Added `initialPrompt` prop, uses it as initial useState value
- `src/components/GenerationPage.test.tsx` - Replaced minimal source-grep tests with 9 full behavioral tests covering workspace props and URL state coordinator
- `src/components/layout/Sidebar.tsx` - Updated Create nav: href `/`, pushState navigation, no active state, mobile drawer close

## Decisions Made

- **popstate vs useEffect[searchParams] for back-button sync**: Chose `window.addEventListener('popstate')` in HomeContent because `useEffect` watching `searchParams` would revert the state immediately after `pushState` (Next.js `useSearchParams` doesn't update synchronously with `pushState`). popstate fires only on actual browser back/forward, not on `pushState` calls.
- **Create nav never "active"**: Sidebar Create item excluded from `isActive` logic — it's a transient action that enters workspace mode, not a destination page.

## Deviations from Plan

None - plan executed exactly as written. The `useEffect[searchParams]` → `popstate` change was a necessary implementation detail discovered during TDD, not a scope deviation.

## Issues Encountered

- **Test 5 initially failing**: The `useEffect[searchParams]` approach reverted `isWorkspaceActive` immediately because the mock doesn't update when `pushState` is called. Switched to `popstate` listener which fires only on browser navigation events — tests then all passed.
- **Pre-existing library test failures**: `src/app/library/page.test.tsx` has 4 pre-existing failures (missing `AudioPlayerProvider` wrapper). Verified pre-existing via git stash. Logged to `deferred-items.md` — out of scope for this plan.

## Next Phase Readiness

- HOME-03 (in-place transformation) and HOME-05 (URL-encoded state) requirements complete
- Plan 12-03 can now build the three-panel workspace layout on top of the `isWorkspaceActive=true` rendering path
- The `isWorkspaceActive` prop in GenerationPage is the entry point for Plan 12-03 to add the grid layout

---
*Phase: 12-same-page-workspace-transformation*
*Completed: 2026-03-06*
