# Project Research Summary

**Project:** Notevra v4.2 — Supabase Auth, Resend Email Delivery, Song Dashboard
**Domain:** Authentication + transactional email + user data persistence added to an existing anonymous gift song funnel
**Researched:** 2026-03-06
**Confidence:** HIGH

## Executive Summary

Notevra v4.2 adds user accounts, song persistence, and gift email delivery on top of an already-shipped anonymous quiz funnel. The established pattern for this type of addition to a Next.js App Router project is: Supabase Auth with the `@supabase/ssr` package for cookie-based SSR sessions, Resend for transactional email, Drizzle ORM for the new songs table (linked to `auth.users` via a nullable `user_id` FK), and React Email for branded email templates. These choices are directly aligned with the existing stack — no new infrastructure categories are introduced. The entire addition is six new packages, six new files, and modifications to five existing files.

The recommended approach keeps the quiz funnel entirely public and anonymous, adding auth as an opt-in upsell on the success page after the song is ready. This sequencing is critical: auth presented before generation kills funnel conversion, while auth offered after generation catches users at peak emotional investment ("post-purchase euphoria" window). The song claim mechanism — anonymous generation followed by sign-up with the song linked to the new account — is the highest-complexity integration point and must be designed into the database schema from day one. Resend domain verification must begin before any other email work since DNS propagation takes up to 48 hours.

The biggest risks are infrastructure ordering failures: starting auth implementation with the wrong Supabase package (`@supabase/auth-helpers-nextjs` instead of `@supabase/ssr`), creating the songs table without RLS enabled, and storing R2 presigned URLs in the database instead of object keys. All three produce working code at development time but broken production behavior hours or weeks later. These risks are fully mitigated by the build order documented in ARCHITECTURE.md: auth infrastructure first, database schema second, email infrastructure third, UI integration last.

## Key Findings

### Recommended Stack

The net-new packages for v4.2 are minimal: `@supabase/supabase-js` + `@supabase/ssr` for auth, `resend` + `@react-email/components` + `@react-email/render` for email. All other capabilities (Zod validation, Framer Motion, Tailwind, Drizzle, native `<form>`) are already installed. The stack is chosen for zero new infrastructure categories — Supabase is already the database provider, Resend was already selected in v4.1 for the contact form. One required config addition: `serverExternalPackages: ['@react-email/render']` in `next.config.ts` to prevent webpack bundling errors.

See `.planning/research/STACK.md` for full version compatibility matrix, configuration code examples, and alternatives considered.

**Core technologies (net-new):**
- `@supabase/ssr` (^0.9.0): Cookie-based SSR auth sessions for Next.js App Router — the only supported package; `@supabase/auth-helpers-nextjs` is deprecated and must not be installed
- `@supabase/supabase-js` (^2.98.0): Supabase JS client for auth API calls (`signUp`, `signInWithPassword`, `getUser`, `signOut`) — required peer dependency of `@supabase/ssr`
- `resend` (^6.9.3): Transactional email API — same SDK already selected for contact form in v4.1; free tier covers 3,000 emails/month, 100/day
- `@react-email/components` + `@react-email/render` (^0.0.36 / ^1.1.3): React components for branded email templates — handles cross-client HTML rendering so Notevra's gift emails render correctly in Outlook, Gmail, and Apple Mail without manual inline CSS

**Do not add:**
- `@supabase/auth-helpers-nextjs` — officially deprecated, maintenance-only, causes silent session failures when mixed with `@supabase/ssr`
- `next-auth` / `auth.js` — adds a second auth layer on top of Supabase Auth; unnecessary when Supabase Auth is already integrated
- `react-hook-form` (net-new) — auth forms are 2-3 fields; Zod + `useActionState` is sufficient
- `nodemailer` — Resend API-based approach is simpler with better deliverability

### Expected Features

The feature scope divides cleanly into three dependency layers: auth infrastructure (foundation), song persistence (depends on auth), and email delivery (depends on domain verification). Gift email delivery to the song recipient is Notevra's primary differentiator — no AI music competitor currently sends a personalized gift email to the person the song was made for. The auth upsell being a non-blocking inline nudge (not a modal gate) is a hard requirement driven by conversion research and the "generate first, commit second" positioning.

See `.planning/research/FEATURES.md` for the full feature dependency graph, competitor analysis, database schema, and route table.

**Must have (table stakes — P1):**
- Email + password sign up and login — `signUp()` / `signInWithPassword()`; Supabase SMTP via Resend required before any auth email is reliable
- Auth callback route at `/auth/confirm` — exchanges one-time token for session cookie; required for email confirmation and password reset
- Password reset flow — `/auth/forgot-password`, `/auth/update-password`, confirm callback, error page
- Middleware session refresh — non-optional for SSR; without it tokens expire and users are silently logged out
- `songs` table with `user_id` FK and RLS policies — database foundation for all persistence features
- Song-to-user association at generation time — `user_id` written to songs row if user is signed in; null otherwise
- Auth upsell on success page — non-blocking inline nudge after song is ready, never before, never as a modal gate
- Song claim on sign-up — user generates anonymously, signs up, song appears in their dashboard; requires `session_token` column on songs table from the start
- Creator song-ready email via Resend — fires after HeartBula job completes; requires verified sending domain
- Recipient gift delivery email via Resend — branded React Email template; creator explicitly triggers send (never auto-sent)
- Song dashboard at `/dashboard` — protected route; lists songs with context (recipient name, relationship, date) plus playback and re-download via fresh R2 presigned URLs
- Header auth-aware nav — "My Songs" link when signed in, "Sign up / Log in" when anonymous

**Should have (differentiators — P2):**
- Warm brand-consistent React Email templates — baby blue + yellow brand treatment; emotionally significant touchpoint for recipients
- Gift email includes quiz message — Step 5 message from the quiz in the recipient email body; high emotional impact at no additional engineering cost
- Dashboard song context (recipient name, relationship, date) — turns dashboard from file list into meaningful gift archive
- Recipient email field with privacy framing — "We'll send them a private link — no marketing, ever." One sentence of microcopy; critical for conversion

**Defer (v4.x+):**
- Google/GitHub OAuth — add after email+password is validated; social login adds OAuth provider complexity and account-linking edge cases
- Public song sharing URLs — requires permanent R2 storage, CDN, and URL management; gift email IS the sharing mechanism for v4.2
- In-dashboard song regeneration — quiz is public; link back to quiz instead
- Gift scheduling ("send on her birthday") — requires queued email infrastructure

### Architecture Approach

The architecture adds auth as a cross-cutting concern via middleware that runs on every non-static request, using cookie-based sessions managed by `@supabase/ssr`. Two Supabase client factories — `src/lib/supabase/server.ts` and `src/lib/supabase/client.ts` — serve server and browser contexts respectively. The songs table lives in Supabase's `public` schema with a nullable `user_id` FK to `auth.users` (declared via Drizzle's `pgSchema('auth')` proxy). RLS policies are written in raw SQL migrations, not managed by Drizzle. Email sends originate from the client-side success page via POST to two dedicated API routes — fire-and-forget, never blocking song playback. The dashboard is a pure Server Component auth guard pattern.

See `.planning/research/ARCHITECTURE.md` for full directory structure, data flow diagrams, annotated code examples for all six patterns, and build order.

**Major components:**
1. `src/middleware.ts` (NEW) — Supabase session refresh on every non-static request; protects `/dashboard` only using a protect-list pattern; quiz funnel stays entirely public
2. `src/lib/supabase/client.ts` + `server.ts` (NEW) — split Supabase client factories; server client for Server Components + API routes; browser client for Client Components
3. `src/db/schema.ts` (MODIFY) — `songs` table with `user_id`, `session_token`, `recipient_name`, `relationship`, `genre`, `audio_r2_key`, `expires_at`; `user_id` nullable for pre-signup generation; FK via `pgSchema('auth')` proxy
4. `src/lib/emails/` (NEW) — React Email templates `SongReadyEmail.tsx` and `GiftDeliveryEmail.tsx` with Notevra brand OKLCH tokens
5. `/auth/*` routes (NEW) — sign-up, login, forgot-password, update-password, confirm callback (Route Handler), error page
6. `src/app/dashboard/` (NEW) — protected Server Component; reads songs via Drizzle; generates fresh R2 presigned URLs at load time; `SongCard` co-located in `_components/`
7. `/api/send-creator-email/` + `/api/send-recipient-email/` (NEW) — Resend API routes; fire-and-forget from success page client
8. Success page additions (MODIFY) — `AuthPrompt` (inline, non-blocking) + `RecipientEmailForm` + email trigger calls after song is in `COMPLETED` state

**Key anti-patterns to avoid:**
- `getSession()` in server code — reads cookie without revalidating JWT; can be spoofed; always use `getUser()`
- Middleware without the `config.matcher` — runs on static assets, produces 400 errors, inflates Supabase quota
- Middleware that redirects unauthenticated users from all routes — destroys the anonymous quiz funnel; use a protect-list targeting `/dashboard` only
- Storing R2 presigned URLs in the database — they expire; store object keys and generate URLs on demand
- `middleware.ts` placed inside `src/app/` — silently ignored by Next.js; must be at `src/middleware.ts`

### Critical Pitfalls

See `.planning/research/PITFALLS.md` for all 13 pitfalls with warning signs, "Looks Done But Isn't" checklist, recovery strategies, and phase-to-pitfall mapping.

**Top pitfalls requiring prevention from the first commit:**

1. **Installing `@supabase/auth-helpers-nextjs`** — that package is deprecated. Install only `@supabase/ssr`. Mixing both causes silent session failures that are difficult to diagnose. Verify `package.json` on first commit.

2. **Using `getSession()` in server code** — reads the session cookie without revalidating the JWT; any page protected with `getSession()` can be bypassed by a crafted cookie. Use `getUser()` exclusively in middleware and Server Components.

3. **Middleware runs on static assets** — without `config.matcher`, auth runs on every image and JS asset, producing 400 errors and inflating Supabase Auth request quotas. Add the matcher before any other middleware logic.

4. **Middleware redirects the quiz funnel** — a blanket "redirect if not authenticated" breaks Notevra's core value proposition. Only protect `/dashboard` explicitly.

5. **RLS disabled on songs table** — Supabase tables default to RLS off. Enable RLS and write policies in the same migration that creates the table. Never as a separate step.

6. **R2 presigned URLs stored instead of object keys** — works at development time; produces 403 errors days later when URLs expire. Store `audio_r2_key` (object path); presign at read time.

7. **Anonymous song not claimable after sign-up** — the primary acquisition path fails if there is no claim mechanism. Requires `session_token` column in songs table from schema design. Add it before writing any migration.

8. **Resend domain verification not started early** — DNS propagation takes 24-48 hours. Start verification before writing any email code.

## Implications for Roadmap

Based on combined research, the milestone sequences into four phases driven by strict dependency ordering. Auth infrastructure is a prerequisite for everything. Database schema is a prerequisite for song persistence and the dashboard. Email domain verification is a prerequisite for all email features. Success page surgery — the most complex existing-file change — comes last after all its dependencies are verified working.

### Phase 1: Auth Infrastructure

**Rationale:** Foundation for all v4.2 features. No other phase can proceed without a working auth layer. Establishes the correct `@supabase/ssr` package from the first commit. All new files, one env change — no modifications to existing production paths.
**Delivers:** Working email+password sign-up, login, password reset, session middleware with correct protect-list, auth callback route handler, error page. Full auth round-trip verified before any UI is built on top. Email confirmation disabled for v4.2 (re-enable procedure documented for the payments milestone).
**Addresses:** Sign up, login, email confirmation flow, password reset, session persistence, protected route infrastructure, auth error page, header auth state.
**Avoids:** Deprecated package pitfall (Pitfall 1), `getSession()` pitfall (Pitfall 2), static asset matcher pitfall (Pitfall 3), quiz funnel breakage (Pitfall 4), email confirmation UX conversion loss (Pitfall 7), PKCE signout bug (Pitfall 8).
**Research flag:** No additional research needed. Supabase Auth SSR patterns are thoroughly documented in official docs and verified in this research with working code samples.

### Phase 2: Database Schema + Song Persistence

**Rationale:** Songs table design is the second-hardest decision in the milestone. Must be decided before any UI that reads or writes songs. Schema is a prerequisite for the dashboard, the generation pipeline modification, and the song claim feature.
**Delivers:** `songs` table with all required columns including `session_token` for the claim flow, RLS policies, Drizzle schema update with `pgSchema('auth')` proxy, raw SQL migration, `user_id` index. Generation pipeline (`quiz-generate` route) modified to insert a songs row on successful job creation.
**Addresses:** Song-to-user association, song claim on sign-up (via `session_token` column), secure schema (RLS enabled, correct FK to `auth.users` with `ON DELETE CASCADE`, nullable `user_id` for anonymous generation, R2 key storage not presigned URLs).
**Avoids:** RLS disabled pitfall (Pitfall 6), wrong FK schema pitfall (Pitfall 11), presigned URL storage pitfall (Pitfall 12), unclaimed songs pitfall (Pitfall 5).
**Research flag:** No additional research needed. Drizzle `pgSchema('auth')` pattern, RLS policy syntax, FK constraint format, and schema field list are all confirmed and fully specified in FEATURES.md and ARCHITECTURE.md.

### Phase 3: Email Infrastructure + Resend Integration

**Rationale:** Resend domain verification must start as early as possible due to DNS propagation time. Separating email infrastructure from the success page UI phase allows email to be built and tested independently before it is wired into the primary user journey.
**Delivers:** Verified sending domain in Resend, Resend configured as Supabase SMTP provider (required for all auth emails including confirmation and password reset), `SongReadyEmail` + `GiftDeliveryEmail` React Email templates with Notevra brand tokens, `/api/send-creator-email` and `/api/send-recipient-email` route handlers, `serverExternalPackages` config addition to `next.config.ts`.
**Addresses:** Creator song-ready email, recipient gift delivery email, Resend SMTP as Supabase auth email provider, branded email templates.
**Avoids:** Unverified domain pitfall (Pitfall 9), silent Resend error drops (Pitfall 10 — every `resend.emails.send()` must destructure `{ data, error }`), Supabase built-in SMTP rate limit (2 emails/hour — inadequate for production).
**Research flag:** No additional research needed. Resend + React Email integration is confirmed in official docs. Domain setup procedure and DNS record format are fully specified in PITFALLS.md.

### Phase 4: Success Page + Dashboard UI

**Rationale:** Comes last because it depends on all prior phases: auth routes (for sign-up flow), songs table (for persistence), and email API routes (to wire triggers). The success page is the most complex existing-file change — it touches the primary user journey. The dashboard is the user-facing payoff for having an account.
**Delivers:** Non-blocking inline `AuthPrompt` on success page (below audio player, after song is in COMPLETED state, never a modal gate), song claim flow wired to sign-up via `session_token` in localStorage, `RecipientEmailForm` with privacy microcopy, email send triggers for both API routes, `/dashboard` page with song list + playback + re-download (fresh R2 presigned URLs), `SongCard` component with recipient context, header updated with auth-aware nav, sign-out server action.
**Addresses:** Auth upsell (non-blocking inline), song claim on sign-up, recipient email capture + gift send (creator-triggered), song dashboard (playback, re-download, song context), header auth state.
**Avoids:** Auth prompt as blocking modal (Pitfall 13), auth prompt shown before song is ready (UX pitfall), gift email auto-sent before creator review (UX pitfall), dashboard redirect without explanation (UX pitfall).
**Research flag:** No additional research needed. All patterns are established. One minor implementation decision for Header auth state (keep as `'use client'` with `useEffect` vs. extract server `UserNav` wrapper) — both options are documented in ARCHITECTURE.md; resolve during Phase 4 planning.

### Phase Ordering Rationale

- Auth must come first because `auth.uid()` is required by every other feature: RLS policies, songs FK, session-gated dashboard.
- Schema must come second because it references `auth.users` and the generation pipeline must insert songs rows before the success page expects them to exist.
- Email infrastructure is a separate phase from UI because DNS propagation is calendar-time, not engineering-time. Starting it in Phase 3 allows one full planning cycle for propagation before Phase 4 wires up the email triggers.
- The success page is last because it is the highest-risk existing-file modification, and all its dependencies should be verified independently before surgery is performed on the primary user journey.

### Research Flags

Phases with standard patterns (no additional research needed during planning):
- **Phase 1 (Auth Infrastructure):** All patterns (middleware, client factories, callback handler, PKCE, email confirmation toggle) are verified in this research with code samples ready to use.
- **Phase 2 (Database Schema):** Drizzle + Supabase FK pattern confirmed. RLS policy syntax confirmed. Schema design is complete in FEATURES.md.
- **Phase 3 (Email):** Resend + React Email integration confirmed in official docs. No unresolved questions.
- **Phase 4 (Success Page + Dashboard):** All patterns established. Header architecture decision is documented with both options in ARCHITECTURE.md.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All package versions verified against npm registry on 2026-03-06. Official Supabase docs confirmed updated for Next.js 16. React Email webpack config requirement confirmed independently via official GitHub issues and multiple community sources. |
| Features | HIGH | All features verified against official Supabase UI docs (complete route list for password-based auth), Resend SMTP docs, and Supabase RLS docs. UX recommendations (post-conversion auth upsell, non-blocking prompt) supported by multiple conversion research sources. |
| Architecture | HIGH | Architecture research includes direct inspection of the existing codebase. All patterns include working code samples from official docs. Build order is informed by actual file dependency analysis of the current project structure. |
| Pitfalls | HIGH | All 13 critical pitfalls verified against official Supabase docs, GitHub issue tracker (specific issue numbers cited for known bugs), and npm package status. RLS default-off behavior and deprecated-package pitfalls are documented in Supabase's own troubleshooting guide. |

**Overall confidence:** HIGH

### Gaps to Address

- **Header component implementation decision:** `Header.tsx` is currently `'use client'` due to mobile menu state. Two approaches for adding server-side auth state are documented in ARCHITECTURE.md — resolve during Phase 4 planning, not research.

- **Email confirmation toggle:** Disabling email confirmation for v4.2 is the correct call per PITFALLS.md (Pitfall 7). The procedure to re-enable it when payments are added (v5+) should be documented during Phase 1 so it is not forgotten.

- **PKCE password reset cross-device UX:** PKCE reset links are browser-session-bound. The UI must warn users to click the reset link on the same device. Copy for this warning should be decided during Phase 1 planning.

- **R2 presigned URL expiration in gift emails:** Gift emails are forwarded and opened days later. URL expiration in email must be set to 7-30 days — but must not exceed the 30-day R2 object lifetime (current Notevra policy). Enforce this constraint during Phase 3 template implementation.

- **Resend free tier rate limits:** 100 emails/day hard limit on free plan. If launch volume exceeds this, upgrade to Resend Pro (~$20/month for 50k emails). Not a code change — operational decision to track post-launch.

## Sources

### Primary (HIGH confidence)
- https://supabase.com/docs/guides/auth/server-side/nextjs — `@supabase/ssr` setup, middleware pattern, `getUser()` vs `getSession()` security distinction
- https://supabase.com/docs/guides/auth/server-side/creating-a-client — `createServerClient`, `createBrowserClient` factory patterns with cookie handling
- https://supabase.com/docs/guides/auth/quickstarts/nextjs — env var names including new `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` format
- https://supabase.com/ui/docs/nextjs/password-based-auth — complete route list: sign-up, login, forgot-password, update-password, confirm, error
- https://supabase.com/docs/guides/database/postgres/row-level-security — RLS policy syntax, `WITH CHECK`, testing methodology
- https://supabase.com/docs/guides/auth/managing-user-data — `auth.users` FK pattern, `ON DELETE CASCADE`
- https://resend.com/docs/send-with-nextjs — Server Actions pattern, `{ data, error }` response handling
- https://resend.com/docs/send-with-supabase-smtp — SMTP integration for Supabase Auth email delivery (host, port, credentials)
- https://resend.com/docs/knowledge-base/account-quotas-and-limits — rate limits (2 req/s), daily quota (100/day), monthly quota (3,000/month)
- npm registry: `@supabase/ssr@0.9.0`, `@supabase/supabase-js@2.98.0`, `resend@6.9.3`, `@react-email/components@0.0.36`, `@react-email/render@1.1.3` — all verified 2026-03-06

### Secondary (MEDIUM confidence)
- https://orm.drizzle.team/docs/tutorials/drizzle-with-supabase — `pgSchema('auth')` proxy for FK to `auth.users`
- https://github.com/orgs/supabase/discussions/27426 — Drizzle + `auth.users` FK without `.references()` in schema definition
- https://github.com/orgs/supabase/discussions/29260 — publishable key vs anon key transition, backward compatibility
- https://github.com/resend/react-email/issues/977 — `serverExternalPackages` requirement for `@react-email/render` with Next.js webpack
- https://github.com/supabase/ssr/issues/55 — PKCE code verifier cookie lost after `signOut()` (known bug, documented workaround)
- https://github.com/orgs/supabase/discussions/22377 — anonymous-to-authenticated data linking patterns
- https://github.com/orgs/supabase/discussions/28655 — PKCE password reset same-browser limitation
- https://passionates.com/one-click-post-purchase-upsell-landing-page/ — post-conversion auth upsell timing ("post-purchase euphoria" window)

### Tertiary (LOW confidence)
- Community sources confirming `@react-email/render` + Next.js 15-16 `serverExternalPackages` fix — consistent across multiple community posts; underlying cause confirmed in official issue tracker

---
*Research completed: 2026-03-06*
*Ready for roadmap: yes*
