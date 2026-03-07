---
phase: 28-auth-infrastructure
plan: "03"
subsystem: auth
tags: [header, auth-state, server-component, client-component, supabase, avatar-dropdown, testing]
dependency_graph:
  requires:
    - 28-01 (Supabase client factories: server.ts)
    - 28-02 (signOut server action in login/actions.ts)
  provides:
    - Auth-aware Header with user avatar dropdown
    - Server/client split Header architecture (no auth flicker)
    - Sign-out wired via imported server action
  affects:
    - src/app/layout.tsx (now async, fetches user)
    - src/components/Header.tsx (converted to Server Component)
    - src/components/HeaderClient.tsx (new Client Component with all interactivity)
tech_stack:
  added: []
  patterns:
    - Server Component wrapper delegating to Client Component (prevents auth flicker)
    - getUser() in layout.tsx for auth state (not getSession() — prevents spoofing)
    - form action={serverAction} pattern for sign-out (no useTransition needed)
    - useEffect + useRef for click-outside dropdown dismissal
key_files:
  created:
    - src/components/HeaderClient.tsx
  modified:
    - src/app/layout.tsx
    - src/components/Header.tsx
    - src/components/Header.test.tsx
decisions:
  - "Header split into Server (Header.tsx) and Client (HeaderClient.tsx) to thread auth state from layout without client-side flicker"
  - "signOut imported from @/app/login/actions (not locally defined) — canonical location per Plan 02"
  - "Avatar dropdown uses form action={signOut} pattern — clean server action invocation without useTransition"
  - "Tests updated to import HeaderClient directly (Server Components cannot be rendered in Vitest)"
metrics:
  duration: "~2 minutes"
  completed_date: "2026-03-07"
  tasks_completed: 2
  tasks_total: 2
  files_created: 1
  files_modified: 3
---

# Phase 28 Plan 03: Auth-Aware Header Summary

**One-liner:** Header refactored into server/client split threading auth state from layout.tsx via getUser(), with avatar dropdown for authenticated users (My Songs + Sign Out) and Sign Up/Log In text links for anonymous visitors — zero auth flicker.

## What Was Built

### Server/Client Header Split

- **`src/app/layout.tsx`** — Converted to `async` function. Imports `createClient` from `@/lib/supabase/server`, calls `supabase.auth.getUser()`, and passes `user` to `<Header user={user} />`. All other layout content (fonts, metadata, Footer) unchanged.

- **`src/components/Header.tsx`** — Converted from `'use client'` to a pure Server Component. Removed `useState`, `mobileMenuOpen`, and all JSX. Now a thin wrapper: accepts `{ user: User | null }` and renders `<HeaderClient user={user} />`. This makes it importable as a Server Component without bundling client code.

- **`src/components/HeaderClient.tsx`** — New Client Component containing all Header interactivity:
  - `mobileMenuOpen` state for hamburger drawer
  - `dropdownOpen` state for avatar dropdown
  - `useRef` + `useEffect` for click-outside and Escape key dismissal of dropdown
  - Desktop nav: anonymous users see "Sign Up" → `/signup` and "Log In" → `/login` text links; authenticated users see initial-in-circle avatar button (`h-8 w-8 rounded-full bg-primary text-primary-foreground`) that toggles a dropdown with "My Songs" → `/dashboard` and "Sign Out" via `<form action={signOut}>`
  - Mobile drawer: same auth-conditional links below existing nav items
  - "Create Your Song" CTA present and visible in BOTH auth states (desktop + mobile)
  - Sign out imported from `@/app/login/actions` — not locally defined

### Updated Tests

- **`src/components/Header.test.tsx`** — Updated to test `HeaderClient` (Server Components cannot be rendered in Vitest):
  - Mocks `@/app/login/actions` with `signOut: vi.fn()`
  - Existing tests pass `user={null}` — all green
  - Removed obsolete "contains Examples nav link" test (Examples link was never in current Header)
  - Added anonymous state tests: Sign Up link visible, Log In link visible, no avatar button
  - Added authenticated state tests: avatar button with correct initial ("T" for test@notevra.com), Sign Up/Log In hidden, CTA still visible
  - All 12 Header tests pass

## Verification Results

- `npx tsc --noEmit` — No errors in any new or modified files (pre-existing quiz test TS errors remain out of scope)
- `npm run test:unit` — All 12 Header tests pass (160 total passing, 3 pre-existing failures in HeroAudioCard/VideoSection/BottomCtaSection are out of scope)
- No `'use client'` in Header.tsx (confirmed server component)
- `'use client'` present in HeaderClient.tsx (confirmed)
- `signOut` imported from `@/app/login/actions` (confirmed, not locally defined)
- `layout.tsx` passes `user={user}` to `<Header>` and uses `getUser()` (confirmed)

## Deviations from Plan

None — plan executed exactly as written. `login/actions.ts` was already present (created during Plan 02 execution), so no stub creation was needed.

## Self-Check: PASSED

All 4 files confirmed on disk:
- src/app/layout.tsx — FOUND
- src/components/Header.tsx — FOUND
- src/components/HeaderClient.tsx — FOUND
- src/components/Header.test.tsx — FOUND

Both task commits confirmed in git log: 5ec24dc, f37274e.
