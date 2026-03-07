---
phase: 28-auth-infrastructure
plan: "01"
subsystem: auth
tags: [supabase, ssr, middleware, zod, testing]
dependency_graph:
  requires: []
  provides:
    - Supabase browser client factory
    - Supabase server client factory with cookie handling
    - Next.js middleware with auth token refresh
    - Zod auth validation schemas
    - Shared Supabase test mocks
    - Wave 0 test stubs for all auth actions and routes
  affects:
    - middleware.ts (new file at project root)
    - All future auth plans (28-02, 28-03) depend on these client factories
tech_stack:
  added:
    - "@supabase/supabase-js"
    - "@supabase/ssr"
  patterns:
    - Cookie-based auth with getAll/setAll (not deprecated get/set/remove)
    - getUser() in middleware (not getSession() which can be spoofed)
    - Shared vi.fn() mocks in __mocks__ directory for test isolation
key_files:
  created:
    - src/lib/supabase/client.ts
    - src/lib/supabase/server.ts
    - src/lib/supabase/middleware.ts
    - src/lib/supabase/auth-schemas.ts
    - middleware.ts
    - src/lib/supabase/__mocks__/server.ts
    - src/lib/supabase/__mocks__/client.ts
    - src/app/login/actions.test.ts
    - src/app/signup/actions.test.ts
    - src/app/forgot-password/actions.test.ts
    - src/app/update-password/actions.test.ts
    - src/app/auth/confirm/route.test.ts
    - src/app/auth/error/page.test.tsx
  modified:
    - package.json (added @supabase/supabase-js and @supabase/ssr)
    - .env.local (added NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY placeholders)
decisions:
  - "Used NEXT_PUBLIC_SUPABASE_ANON_KEY consistently across all three client files (project pre-dates Nov 2025 publishable key change)"
  - "getUser() used in middleware (not getSession()) — prevents session spoofing"
  - "getAll/setAll cookie methods used (not deprecated get/set/remove) — prevents silent session failures"
  - "middleware.ts matcher excludes static assets to avoid 400 errors and Supabase quota inflation"
  - "Quiz funnel routes remain public — middleware only refreshes tokens, adds no redirect logic"
  - "Test stubs use it.todo() so Wave 2 plans inherit a passing test suite baseline"
metrics:
  duration: "~10 minutes"
  completed_date: "2026-03-07"
  tasks_completed: 3
  tasks_total: 3
  files_created: 13
  files_modified: 2
---

# Phase 28 Plan 01: Supabase Auth Infrastructure Foundation Summary

**One-liner:** Cookie-based Supabase SSR auth foundation with browser/server client factories, Next.js middleware using getUser() for token refresh, Zod validation schemas, and 29 Wave 0 test stubs ready for Wave 2 implementation.

## What Was Built

### Supabase Client Factories

- **`src/lib/supabase/client.ts`** — Browser client using `createBrowserClient` from `@supabase/ssr`. Used in Client Components that need auth state.
- **`src/lib/supabase/server.ts`** — Async server client using `createServerClient` with `getAll()`/`setAll()` cookie methods. The `setAll` is wrapped in try/catch because Server Components cannot write cookies — middleware handles persistence.
- **`src/lib/supabase/middleware.ts`** — `updateSession()` utility that reads cookies from `request.cookies` and writes to BOTH `request.cookies` and `supabaseResponse.cookies`. Uses `getUser()` (not `getSession()`) to trigger proper JWT revalidation.

### Middleware

- **`middleware.ts`** at project root delegates to `updateSession`. Matcher excludes `_next/static`, `_next/image`, `favicon.ico`, and image file extensions to prevent 400 errors and quota inflation. Quiz funnel at `/quiz/*` remains public — middleware runs but only refreshes tokens, no redirect logic.

### Zod Auth Schemas

- **`src/lib/supabase/auth-schemas.ts`** — Four schemas with Notevra-brand-friendly error messages:
  - `loginSchema`: email + non-empty password (min 1, login doesn't enforce length)
  - `signupSchema`: email + min 8 character password
  - `forgotPasswordSchema`: email only
  - `updatePasswordSchema`: min 8 character password
  - No complexity requirements (no uppercase/number rules) per user decision

### Test Infrastructure

- **`__mocks__/server.ts`** — Shared mock with `mockSupabaseAuth` exposing all 7 auth methods as `vi.fn()` for isolation in action tests
- **`__mocks__/client.ts`** — Browser client mock with `onAuthStateChange` and `getUser` stubs
- **6 test stub files** — All use `it.todo()` placeholders, producing 29 todos that are skipped (not failed) in `npm run test:unit`

## Verification Results

- `npm run build` — passes, middleware shown as "Proxy (Middleware)" in route table
- `npx tsc --noEmit` — no errors in new files (4 pre-existing errors in quiz test files are out of scope)
- `npm run test:unit` — 153 passing, 29 todos (all new), 2 pre-existing failures (unrelated: HeroAudioCard, VideoSection missing modules)

## Deviations from Plan

None — plan executed exactly as written.

## User Action Required

Before Wave 2 (28-02, 28-03) executes, complete Supabase Dashboard configuration:

1. Add env vars to `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL` — from Dashboard > Settings > API > Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — from Dashboard > Settings > API > anon/public key

2. **Disable email confirmation** — Dashboard > Authentication > Providers > Email > toggle 'Confirm email' OFF

3. **Add redirect URL** — Dashboard > Authentication > URL Configuration > add `http://localhost:3000/auth/confirm`

4. **Set Site URL** — Dashboard > Authentication > URL Configuration > Site URL > `http://localhost:3000`

## Self-Check: PASSED

All 13 created files confirmed on disk.
All 3 task commits confirmed in git log: 7da48f5, d954386, 9b413fd.
