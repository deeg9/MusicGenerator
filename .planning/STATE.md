---
gsd_state_version: 1.0
milestone: v4.2
milestone_name: Auth & Email Delivery
status: planning
stopped_at: Completed 28-01-PLAN.md
last_updated: "2026-03-07T03:12:03.240Z"
last_activity: 2026-03-06 — v4.2 roadmap created (4 phases, 24 requirements mapped)
progress:
  total_phases: 14
  completed_phases: 6
  total_plans: 15
  completed_plans: 13
  percent: 0
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

Progress: [░░░░░░░░░░] 0% (v4.2)

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

### Pending Todos

None.

### Blockers/Concerns

- [Pre-milestone]: Resend domain verification takes 24-48 hours DNS propagation — start before Phase 30 email code
- [Pre-milestone]: Corrupt git object 75510b3 prevents push — run `git fsck` to diagnose before milestone ships
- [Phase 28]: PKCE reset links are browser-session-bound — UI must warn user to click on same device (decide copy during planning)
- [Phase 30]: R2 presigned URL expiration in gift emails must be 7 days minimum, cannot exceed 30-day R2 object lifetime

## Session Continuity

Last session: 2026-03-07T03:12:03.238Z
Stopped at: Completed 28-01-PLAN.md
Resume file: None
Next action: `/gsd:plan-phase 28`
