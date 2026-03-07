---
phase: 28-auth-infrastructure
plan: "02"
subsystem: auth
tags: [supabase, ssr, auth-pages, server-actions, zod, nextjs15]
dependency_graph:
  requires:
    - src/lib/supabase/server.ts (createClient factory from Plan 01)
    - src/lib/supabase/auth-schemas.ts (Zod schemas from Plan 01)
  provides:
    - Sign-up page and server action (/signup)
    - Login page and server action (/login)
    - signOut server action (canonical export in login/actions.ts)
    - Forgot password page and server action (/forgot-password)
    - Update password page and server action (/update-password)
    - PKCE auth confirm callback route (/auth/confirm)
    - Auth error display page (/auth/error)
  affects:
    - Plan 03 (HeaderClient imports signOut from login/actions.ts)
    - Plan 03 (Dashboard protected route redirect target for unauthenticated users)
tech_stack:
  added: []
  patterns:
    - useTransition + startTransition for non-blocking server action calls
    - Client-side Zod validation before invoking server actions (no round-trip for field errors)
    - Inline success state in forgot-password (no separate /sent route)
    - async searchParams pattern for Next.js 15+ page components
    - PKCE token exchange via verifyOtp in route handler
    - Dynamic origin for resetPasswordForEmail using headers().get('origin')
key_files:
  created:
    - src/app/signup/page.tsx
    - src/app/signup/actions.ts
    - src/app/login/page.tsx
    - src/app/login/actions.ts
    - src/app/forgot-password/page.tsx
    - src/app/forgot-password/actions.ts
    - src/app/update-password/page.tsx
    - src/app/update-password/actions.ts
    - src/app/auth/confirm/route.ts
    - src/app/auth/error/page.tsx
  modified: []
decisions:
  - "signOut exported from login/actions.ts as canonical location — HeaderClient (Plan 03) imports from there"
  - "Forgot-password shows inline success state (no /sent route) — simpler UX, fewer routes"
  - "Password visibility toggle uses lucide-react Eye/EyeOff — already in dependency tree"
  - "useTransition used for server action calls — non-blocking, no useActionState complexity"
  - "PKCE reset links warn 'Open the link on this device' in muted text — helpful not alarming"
  - "next query param preserved in cross-links between login and signup pages"
metrics:
  duration: "~2 minutes"
  completed_date: "2026-03-07"
  tasks_completed: 2
  tasks_total: 2
  files_created: 10
  files_modified: 0
---

# Phase 28 Plan 02: Auth Pages and Server Actions Summary

**One-liner:** Six auth routes with server actions, Zod client-side validation, Notevra brand styling, PKCE confirm callback, async Next.js 15+ searchParams, and signOut exported from login/actions.ts for HeaderClient consumption.

## What Was Built

### Sign-up (`/signup`)

- **`src/app/signup/page.tsx`** — Client Component with useTransition-driven form submission. Zod validates `signupSchema` before calling server action. Field-level red errors below each input. Password visibility toggle via Eye/EyeOff. Preserves `next` query param in hidden field and cross-link to `/login`.
- **`src/app/signup/actions.ts`** — `signup()` server action calling `supabase.auth.signUp`. Maps "User already registered" to a warm friendly message. On success: `revalidatePath('/', 'layout')` then `redirect(next || '/dashboard')`.

### Login (`/login`)

- **`src/app/login/page.tsx`** — Same centered card layout. `loginSchema` Zod validation. "Forgot your password?" link below password field. Cross-link to `/signup` preserving `next` param.
- **`src/app/login/actions.ts`** — `login()` calling `supabase.auth.signInWithPassword`. **Also exports `signOut()`** — the canonical location for sign-out used by Plan 03's HeaderClient. `signOut()` calls `supabase.auth.signOut()`, `revalidatePath('/', 'layout')`, then `redirect('/')`.

### Forgot Password (`/forgot-password`)

- **`src/app/forgot-password/page.tsx`** — Client Component with inline success state. On server action success, replaces form with "Check your inbox" message showing the submitted email. Includes muted PKCE hint: "Open the link on this device for it to work."
- **`src/app/forgot-password/actions.ts`** — `resetPassword()` calling `supabase.auth.resetPasswordForEmail` with `redirectTo: '${origin}/auth/confirm'`. Origin resolved from `headers().get('origin')` with fallback to `NEXT_PUBLIC_SITE_URL`. Returns `{ success: true }` (no redirect — page handles inline display).

### Update Password (`/update-password`)

- **`src/app/update-password/page.tsx`** — Password-only form with `updatePasswordSchema` Zod validation and visibility toggle. Error banner for server-side failures.
- **`src/app/update-password/actions.ts`** — `updatePassword()` calling `supabase.auth.updateUser({ password })`. On success: `redirect('/dashboard')`.

### PKCE Confirm Callback (`/auth/confirm`)

- **`src/app/auth/confirm/route.ts`** — GET handler extracts `token_hash`, `type`, and `next` from searchParams. Guards against missing params (redirects to `/auth/error?error=Missing+token`). Calls `supabase.auth.verifyOtp({ type, token_hash })`. Routes `recovery` type to `/update-password`, all others to validated `next` path (must start with `/` for security). Error responses redirect to `/auth/error?error={encoded}`.

### Auth Error Page (`/auth/error`)

- **`src/app/auth/error/page.tsx`** — Server Component using async `props.searchParams` pattern required for Next.js 15+. Displays error message (default: "The link you followed may have expired or is invalid."). Two action links: "Try logging in" → `/login`, "Request a new reset link" → `/forgot-password`. Warm, non-alarming tone consistent with gift service brand.

## Verification Results

- `npx tsc --noEmit` — zero errors in all 10 new files (pre-existing unrelated errors in quiz test files and HeroAudioCard/VideoSection test stubs are out of scope, carried from before this milestone)
- All 6 routes exist and files confirmed on disk
- All server actions import from `@/lib/supabase/server` (not client)
- No `getSession()` usage anywhere in new files
- `login/actions.ts` exports both `login` and `signOut`
- `auth/error/page.tsx` uses `await props.searchParams` async pattern
- Cross-links between signup ↔ login preserve `next` query param

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

All 10 created files confirmed on disk.
Task commits confirmed: a88c3de (Task 1), 1b6f1b7 (Task 2).
