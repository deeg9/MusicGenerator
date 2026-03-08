---
gsd_state_version: 1.0
milestone: v4.2
milestone_name: Auth & Email Delivery
status: planning
stopped_at: Completed 31-02 — Dashboard page + SongCard component
last_updated: "2026-03-08T03:44:25.802Z"
last_activity: 2026-03-06 — v4.2 roadmap created (4 phases, 24 requirements mapped)
progress:
  total_phases: 14
  completed_phases: 9
  total_plans: 23
  completed_plans: 22
  percent: 96
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-06)

**Core value:** Anyone can create a deeply personal, one-of-a-kind song for someone they love — in seconds.
**Current focus:** Phase 28 — Auth Infrastructure

## Current Position

Phase: 28 of 31 (Auth Infrastructure)
Plan: 0 of TBD in current phase
Status: Ready to plan
Last activity: 2026-03-06 — v4.2 roadmap created (4 phases, 24 requirements mapped)

Progress: [██████████] 96% (v4.2)

## Performance Metrics

**Velocity:**
- Total plans completed: 0 (this milestone)
- Average duration: —
- Total execution time: —

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 28. Auth Infrastructure | TBD | - | - |
| 29. Database Schema + Song Persistence | TBD | - | - |
| 30. Email Infrastructure | TBD | - | - |
| 31. Success Page + Dashboard UI | TBD | - | - |

*Updated after each plan completion*
| Phase 28-auth-infrastructure P01 | 10m | 3 tasks | 13 files |
| Phase 28-auth-infrastructure P02 | 2m | 2 tasks | 10 files |
| Phase 28-auth-infrastructure P03 | ~2 minutes | 2 tasks | 4 files |
| Phase 29-database-schema-song-persistence P01 | 30m | 2 tasks | 3 files |
| Phase 29-database-schema-song-persistence P02 | 45m | 2 tasks | 8 files |
| Phase 30-email-infrastructure P01 | ~2m auto + human dashboard config | 2 tasks | 5 files |
| Phase 30-email-infrastructure P02 | 28m | 2 tasks | 4 files |
| Phase 30-email-infrastructure P03 | 9m | 2 tasks | 4 files |
| Phase 31-success-page-dashboard-ui P01 | 15m | 1 tasks | 7 files |
| Phase 31-success-page-dashboard-ui P02 | 10m | 2 tasks | 4 files |

## Accumulated Context

### Decisions

- [v4.2 research]: Use `@supabase/ssr` only — `@supabase/auth-helpers-nextjs` is deprecated, causes silent session failures
- [v4.2 research]: Use `getUser()` in all server code — `getSession()` reads cookie without JWT revalidation and can be spoofed
- [v4.2 research]: Middleware matcher must exclude static assets to avoid 400 errors and Supabase quota inflation
- [v4.2 research]: Only protect `/dashboard` in middleware — quiz funnel must remain entirely public
- [v4.2 research]: Store R2 object keys in songs table, not presigned URLs — presign at read time
- [v4.2 research]: Disable email confirmation for v4.2 — document re-enable procedure in Phase 28 for future payments milestone
- [v4.2 research]: Auth upsell on success page is non-blocking inline nudge — never a modal gate, never before COMPLETED state
- [v4.1]: Legal pages use TSX over MDX — simpler, no new dependencies
- [v4.1]: No `@tailwindcss/typography` — write `.prose-legal` manually using existing OKLCH tokens
- [Phase 28-01]: Use NEXT_PUBLIC_SUPABASE_ANON_KEY consistently across all three Supabase client files (project pre-dates Nov 2025 publishable key change)
- [Phase 28-01]: Use getAll/setAll cookie methods (not deprecated get/set/remove) to prevent silent session failures
- [Phase 28-01]: Wave 0 test stubs use it.todo() so Wave 2 plans inherit a passing test suite baseline
- [Phase 28-02]: signOut exported from login/actions.ts as canonical location for HeaderClient (Plan 03) consumption
- [Phase 28-02]: Forgot-password shows inline success state (no /sent route) — simpler UX
- [Phase 28-02]: useTransition used for server action calls — non-blocking, no useActionState complexity
- [Phase Phase 28-03]: Header split into Server (Header.tsx) and Client (HeaderClient.tsx) to thread auth state from layout without client-side flicker
- [Phase Phase 28-03]: Avatar dropdown uses form action={signOut} pattern — clean server action invocation without useTransition
- [Phase Phase 28-03]: Tests updated to import HeaderClient directly (Server Components cannot be rendered in Vitest)
- [Phase 29-01]: drizzle-kit push blocked by Supabase CHECK constraint bug — applied schema via raw SQL in Supabase SQL Editor as equivalent workaround
- [Phase 29-01]: songs-anon-deny-all RLS policy uses FOR ALL with USING false to block all anonymous operations at the DB level
- [Phase Phase 29-02]: response.cookies.set() not cookies() store for Route Handler cookies — cookies() from next/headers is read-only in that context
- [Phase Phase 29-02]: Finalization pipeline errors are non-fatal in poll-job — client sees COMPLETED, errors logged
- [Phase Phase 29-02]: Use vi.hoisted() for Vitest mock variables referenced inside vi.mock() factory functions to avoid TDZ initialization errors
- [Phase 30-01]: Use process.env.RESEND_API_KEY directly in resend.ts (not getEnv()) to match Supabase client module-scope instantiation pattern
- [Phase 30-01]: Same Resend API key used for both Supabase SMTP auth emails and SDK transactional emails — Resend's standard guidance
- [Phase Phase 30-02]: render() from @react-email/components v1.0.8 is async — must use await render() in tests
- [Phase Phase 30-02]: React Email PreviewProps static property added to both templates for dev server preview support
- [Phase Phase 30-03]: Anonymous songs use 'Someone' as creatorFirstName — no Supabase admin lookup needed for recipient email
- [Phase Phase 30-03]: First name extracted from user_metadata.full_name (split on space), falling back to email prefix
- [Phase 31-01]: AuthPrompt renders null while isAnon is null (checking) — prevents layout shift and flash before auth check
- [Phase 31-01]: songId flows via URL search param (?songId=) alongside ?name= — consistent pattern, no localStorage needed
- [Phase 31-01]: RecipientEmailForm checks response body for 'not finalized' to show contextual error vs generic error
- [Phase 31-02]: Dashboard filtering uses isNotNull at Drizzle query level AND JS filter before Promise.all for defense in depth
- [Phase 31-02]: createdAt prop on SongCard typed as string (not Date) — Server Component prop boundary serializes to JSON, formatted with new Date(createdAt).toLocaleDateString() in component
- [Phase 31-02]: SongPlayer imported via @/ alias cross-route — left in quiz route tree, alias is stable

### Pending Todos

None.

### Blockers/Concerns

- [RESOLVED 2026-03-07]: Resend domain notevra.net verified, Supabase SMTP configured — 30-01 complete
- [Pre-milestone]: Corrupt git object 75510b3 prevents push — run `git fsck` to diagnose before milestone ships
- [Phase 28]: PKCE reset links are browser-session-bound — UI must warn user to click on same device (decide copy during planning)
- [Phase 30]: R2 presigned URL expiration in gift emails must be 7 days minimum, cannot exceed 30-day R2 object lifetime

## Session Continuity

Last session: 2026-03-08T03:44:25.799Z
Stopped at: Completed 31-02 — Dashboard page + SongCard component
Resume file: None
Next action: Execute 30-02 (React Email templates)
