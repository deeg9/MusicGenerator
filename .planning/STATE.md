---
gsd_state_version: 1.0
milestone: v4.3
milestone_name: E-Card Feature
status: planning
stopped_at: null
last_updated: "2026-03-25"
last_activity: 2026-03-25 — Milestone v4.3 started
progress:
  total_phases: 0
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-06)

**Core value:** Anyone can create a deeply personal, one-of-a-kind song for someone they love — in seconds.
**Current focus:** v4.3 E-Card Feature — defining requirements

## Current Position

Phase: Not started (defining requirements)
Plan: —
Status: Defining requirements
Last activity: 2026-03-25 — Milestone v4.3 started

Progress: [░░░░░░░░░░] 0% (v4.3)

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
| Phase 31-success-page-dashboard-ui P03 | 10m | 2 tasks | 2 files |
| Phase 32-google-oauth-sign-in-integration P01 | 20m | 2 tasks | 8 files |
| Phase 32-google-oauth-sign-in-integration P02 | 5m | 2 tasks | 0 files |

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
- [Phase Phase 31-03]: RESEND_API_KEY made optional in env.ts so builds without email credentials succeed — consistent with Supabase client pattern
- [Phase Phase 32-01]: signInWithGoogle lives in login/actions.ts — shared by both login and signup pages via cross-route import
- [Phase Phase 32-01]: origin read from headers() not NEXT_PUBLIC_SITE_URL — real origin needed for correct OAuth callback domain
- [Phase Phase 32-01]: next param sanitized in /auth/callback (must start with /) to prevent open redirect

### Roadmap Evolution

- Phase 32 added: Google OAuth sign-in integration

### Pending Todos

None.

### Blockers/Concerns

- [RESOLVED 2026-03-07]: Resend domain notevra.net verified, Supabase SMTP configured — 30-01 complete
- [Pre-milestone]: Corrupt git object 75510b3 prevents push — run `git fsck` to diagnose before milestone ships
- [Phase 28]: PKCE reset links are browser-session-bound — UI must warn user to click on same device (decide copy during planning)
- [Phase 30]: R2 presigned URL expiration in gift emails must be 7 days minimum, cannot exceed 30-day R2 object lifetime

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 1 | 30s preview paywall with Unlock Full Song CTA linking to /pricing | 2026-03-14 | 5e42af5 | [1-30s-preview-paywall-with-unlock-full-son](./quick/1-30s-preview-paywall-with-unlock-full-son/) |
| 2 | Auto-send creator email when song finishes generating | 2026-03-16 | a4d8f27 | [2-email-notifications-when-songs-are-ready](./quick/2-email-notifications-when-songs-are-ready/) |
| 3 | Professional privacy policy, terms of service, and cookie consent banner (GDPR/CCPA) | 2026-03-16 | 23d9cad | [3-research-and-create-professional-privacy](./quick/3-research-and-create-professional-privacy/) |
| 4 | Validate Audible-style credit system across 9 files | 2026-03-16 | 1821179 | [4-validate-audible-style-credit-system-for](./quick/4-validate-audible-style-credit-system-for/) |
| 6 | Fix email links — app pages instead of raw R2 URLs + new /listen/[songId] page | 2026-03-16 | 6a9f6d7 | [6-fix-email-links-app-pages-instead-of-raw](./quick/6-fix-email-links-app-pages-instead-of-raw/) |
| 7 | PostHog analytics instrumentation + dashboard creation script | 2026-03-16 | e0b27a5 | [7-research-and-set-up-posthog-dashboards-a](./quick/7-research-and-set-up-posthog-dashboards-a/) |
| 8 | Auto-send gift email to recipient when song generation completes | 2026-03-16 | 6ace1e8 | [8-auto-send-gift-email-to-recipient-when-s](./quick/8-auto-send-gift-email-to-recipient-when-s/) |
| 9 | Fix Stripe checkout 500 error — ensureScheme() URL normalization in stripe.ts | 2026-03-16 | f77749f | [9-fix-stripe-checkout-500-error-by-adding-](./quick/9-fix-stripe-checkout-500-error-by-adding-/) |
| 10 | Thank-you page with Meta Pixel Purchase, GA4 purchase, and PostHog conversion tracking | 2026-03-17 | 0a85c06 | [10-add-thank-you-page-with-meta-pixel-purch](./quick/10-add-thank-you-page-with-meta-pixel-purch/) |
| 11 | Fix tierFromPriceId Proxy bug + webhook missing songsRemaining | 2026-03-17 | 25f2cbb | [11-fix-tierfrompriceid-proxy-bug-and-subscr](./quick/11-fix-tierfrompriceid-proxy-bug-and-subscr/) |
| 12 | Always re-sync subscription from Stripe on dashboard load | 2026-03-17 | 2be8684 | [12-fix-stale-subscription-data-always-re-s](./quick/12-fix-stale-subscription-data-always-re-s/) |
| 13 | Fix subscription upgrade stacking + sync picks highest tier | 2026-03-17 | 81119db | [13-fix-subscription-upgrade-stacking](./quick/13-fix-subscription-upgrade-stacking/) |
| 14 | Homepage chat box with genre dropdown — caches input, routes to quiz | 2026-03-19 | 0799c25 | [14-homepage-chat-box-with-genre-dropdown-si](./quick/14-homepage-chat-box-with-genre-dropdown-si/) |
| 15 | Song preview carousel below homepage chat box | 2026-03-19 | 67275ac | [15-song-preview-carousel-below-homepage-cha](./quick/15-song-preview-carousel-below-homepage-cha/) |
| 16 | SongPlayer modern music player UI with album art, animated controls, song metadata | 2026-03-19 | 1fb7abf | [16-update-my-songs-player-ui-with-modern-mu](./quick/16-update-my-songs-player-ui-with-modern-mu/) |
| 17 | Mobile-first homepage conversion optimization — above-fold hero, remove signup gate, lazy-load videos | 2026-03-24 | 2171f65 | [17-mobile-first-homepage-conversion-optimiz](./quick/17-mobile-first-homepage-conversion-optimiz/) |
| 260324-w5x | Add 8 new genres, duet/choir voice options, mood/energy selector, and instrumental-only toggle to quiz | 2026-03-25 | ae66cfd | [260324-w5x-add-8-new-genres-duet-choir-voice-option](./quick/260324-w5x-add-8-new-genres-duet-choir-voice-option/) |

## Session Continuity

Last session: 2026-03-24T19:34:24Z
Stopped at: Completed quick task 17 — mobile-first homepage conversion optimization
Resume file: None
Next action: Execute 30-02 (React Email templates)
