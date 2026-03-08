---
phase: 32-google-oauth-sign-in-integration
plan: 01
subsystem: auth
tags: [supabase, oauth, google, next-server-actions, drizzle]

# Dependency graph
requires:
  - phase: 28-auth-infrastructure
    provides: Supabase client (createClient), login/actions.ts pattern, auth route patterns
  - phase: 29-database-schema-song-persistence
    provides: songs table schema, anonymous song claim pattern (sessionToken/userId)

provides:
  - signInWithGoogle server action in src/app/login/actions.ts
  - /auth/callback route handler with OAuth code exchange and anonymous song claim
  - "Continue with Google" button with Google icon on login and signup pages
  - Unit tests for all new auth paths (28 tests passing)

affects: [33-any-future-auth-phase, e2e-testing, dashboard]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - signInWithOAuth with redirectTo for Google OAuth initiation
    - /auth/callback route using exchangeCodeForSession (PKCE flow)
    - next param threading through OAuth round-trip via callback URL search param
    - Non-fatal anonymous song claim in OAuth callback (try/catch, non-blocking)
    - Cross-route server action import: signup/page.tsx imports from @/app/login/actions

key-files:
  created:
    - src/app/auth/callback/route.ts
    - src/app/auth/callback/route.test.ts
    - src/app/login/page.test.tsx
    - src/app/signup/page.test.tsx
  modified:
    - src/app/login/actions.ts
    - src/app/login/actions.test.ts
    - src/app/login/page.tsx
    - src/app/signup/page.tsx

key-decisions:
  - "signInWithGoogle lives in login/actions.ts — shared by both login and signup pages via cross-route import"
  - "origin read from headers() not NEXT_PUBLIC_SITE_URL — real origin needed for correct OAuth callback domain"
  - "next param sanitized in callback (must start with /) to prevent open redirect"
  - "GoogleIcon inlined as local component in each page file (8 lines, avoids shared component extraction)"
  - "isGooglePending separate useTransition from isPending — each button has independent loading state"

patterns-established:
  - "TDD pattern: test file written first (RED), implementation added (GREEN), both committed together via task commit"
  - "vi.hoisted() for mock variables referenced in vi.mock() factory functions"
  - "Dual useTransition hooks: one per async action to allow independent pending states per button"

requirements-completed: [OAUTH-01, OAUTH-02, OAUTH-03, OAUTH-04, OAUTH-06]

# Metrics
duration: 20min
completed: 2026-03-08
---

# Phase 32 Plan 01: Google OAuth Sign-In Summary

**Google OAuth sign-in via Supabase signInWithOAuth, /auth/callback route with anonymous song claim, and "Continue with Google" buttons with GoogleIcon SVG on login and signup pages**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-03-08T06:10:00Z
- **Completed:** 2026-03-08T06:31:15Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments

- Added `signInWithGoogle` server action to `login/actions.ts` — calls `supabase.auth.signInWithOAuth` with provider `google`, threads `next` param through callback URL, redirects to OAuth provider URL or `/auth/error` on failure
- Created `/auth/callback` route that exchanges OAuth code for session, claims anonymous songs (non-fatal), sanitizes `next` param, and redirects to destination
- Added "Continue with Google" button with Google-colors SVG icon above email form on both login and signup pages, with independent loading state and mutual disable behavior
- 28 unit tests added: 6 for signInWithGoogle, 12 for callback route, 5 each for login/signup page renders

## Task Commits

Each task was committed atomically:

1. **Task 1: signInWithGoogle action and /auth/callback route** - `d8564f5` (feat)
2. **Task 2: Continue with Google button on login/signup pages** - `fbe5313` (feat)

## Files Created/Modified

- `src/app/login/actions.ts` - Added `signInWithGoogle` export and `headers` import
- `src/app/login/actions.test.ts` - Replaced todo stubs with full signInWithGoogle tests (6 tests)
- `src/app/auth/callback/route.ts` - New OAuth code exchange route with anonymous song claim
- `src/app/auth/callback/route.test.ts` - New test file for callback route (12 tests)
- `src/app/login/page.tsx` - Added GoogleIcon, isGooglePending state, Google button, or divider
- `src/app/login/page.test.tsx` - New render tests for login page (5 tests)
- `src/app/signup/page.tsx` - Same Google button additions, imports signInWithGoogle cross-route
- `src/app/signup/page.test.tsx` - New render tests for signup page (5 tests)

## Decisions Made

- `signInWithGoogle` lives in `login/actions.ts` and is imported cross-route in `signup/page.tsx` — action is shared, not duplicated, consistent with plan spec
- `origin` header used (not `NEXT_PUBLIC_SITE_URL`) so callback URL matches actual request domain in all environments
- `next` param sanitized in callback: must start with `/`, defaults to `/dashboard` — prevents open redirect attacks
- `GoogleIcon` inlined as local function component in each page (not extracted to shared component) — 8-line SVG, plan explicitly called for duplication over extraction
- Two `useTransition` hooks per page: `isPending`/`startTransition` for email form, `isGooglePending`/`startGoogleTransition` for Google button — both disable each other for exclusive pending state

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- Render test for password field initially used `getByLabelText(/password/i)` but matched multiple elements (password label + show/hide button aria-label). Fixed to use `getByPlaceholderText` for specificity. Auto-fixed inline per deviation Rule 1.

## User Setup Required

**External service configuration required before Google OAuth will function:**

1. In Supabase Dashboard > Authentication > Providers > Google: enable Google provider
2. Add Google OAuth client ID and secret (from Google Cloud Console)
3. Add `https://[project].supabase.co/auth/v1/callback` as authorized redirect URI in Google Cloud Console

No new environment variables required in `.env.local` — Supabase handles Google OAuth credentials through the dashboard.

## Next Phase Readiness

- Google OAuth initiation and callback handling is fully implemented and tested
- Manual Supabase Google provider configuration needed before the OAuth flow works end-to-end
- Pre-existing test failures in `landing/` components (HeroAudioCard, VideoSection, BottomCtaSection) are out of scope and were present before this plan

---
*Phase: 32-google-oauth-sign-in-integration*
*Completed: 2026-03-08*
