# Project Research Summary

**Project:** MusicGenerator
**Domain:** AI Music Generation SaaS (text-to-music, credits, payments)
**Researched:** 2026-03-03
**Confidence:** MEDIUM-HIGH

## Executive Summary

This is a GPU-backed generative AI SaaS product — a class of product with well-understood patterns from established competitors (Suno, Udio) and a specific integration challenge: wrapping ACE-Step 1.5's async REST API behind a credit-gated Next.js application. The recommended approach is a narrow, focused v1: text-to-music generation with custom lyrics, a credit-based freemium model, and a polling-based UI that handles the 10-60 second generation latency gracefully. The architecture is a BFF (Backend-for-Frontend) pattern where Next.js API routes are the sole intermediary between the browser and all backend services — RunPod GPU inference, Supabase Postgres, and Stripe. This keeps credentials server-side and enforces credit rules at the API layer.

The highest risk in this stack is not the Next.js or Stripe integration — those are well-documented — but the ACE-Step 1.5 API layer running on RunPod. Two confirmed bugs (memory leak accumulating RAM across generations, audio distortion artifacts on rock/electronic genres) will affect production quality if not addressed during infrastructure setup. The RunPod deployment strategy (Persistent Pod for prototype, not Serverless) and the async polling architecture (never poll inside a Vercel function) are non-negotiable patterns established by the research. Get these right from day one.

The feature scope for v1 is clear: clone the Suno user flow with dual-variant generation, waveform playback, MP3/WAV download, and a simple credit system with Stripe checkout. Defer song library, social features, stem extraction, and remix tools to v2+. The credit system must implement an atomic reservation pattern — deduct on submission and refund on failure — from the first commit, not as a later fix.

---

## Key Findings

### Recommended Stack

The stack is a modern TypeScript-first Next.js monorepo. Next.js 15.5.x (stable, App Router) with React 19.2 provides SSR for the landing page and Server Actions for form handling. Clerk handles authentication (better Next.js App Router DX than NextAuth or Supabase Auth). Supabase provides the Postgres database accessed via Drizzle ORM — chosen for its 7KB bundle vs. Prisma's 300KB, which matters on Vercel serverless cold starts. Stripe handles payments via one-time credit purchase (Checkout, `mode: "payment"`) rather than complex subscription metering. wavesurfer.js with `@wavesurfer/react` renders the audio waveform player. SWR handles client-side polling of generation status.

The ACE-Step API is a REST interface running on RunPod at `http://<pod>:8001`. The critical constraint: `workers=1` only — the in-memory job queue corrupts with multiple uvicorn workers. Generation flow is submit (`POST /release_task` → `task_id`) then poll (`POST /query_result` → status 0/1/2). Use RunPod Persistent Pod for prototype (RTX 4090, ~$0.59/hr, manually started) not RunPod Serverless (20-60s cold starts ruin UX).

**Core technologies:**
- Next.js 15.5.x: Full-stack framework — SSR landing page, BFF API routes, App Router
- Clerk @clerk/nextjs ^6.x: Authentication — best-in-class Next.js App Router support, free to 10K MAU
- Supabase (hosted): Postgres database + Storage for audio files
- Drizzle ORM ^0.45.x: Database access — TypeScript-first, 7KB bundle, SQL-like credit deduction queries
- Stripe ^20.x: Payments — one-time credit packs via Checkout, webhook-driven credit grants
- wavesurfer.js ^7.11.x + @wavesurfer/react: Audio waveform player component
- Zustand ^5.x: Client state — generation job state (task_id, status, audio URL)
- SWR ^3.x: Polling — `refreshInterval` for polling `/api/status/:jobId` every 2.5 seconds

See `.planning/research/STACK.md` for full version compatibility table, alternatives considered, and environment variable reference.

### Expected Features

The Suno/Udio competitor analysis defines the standard user flow: landing page → sign up → generate (text prompt + optional lyrics) → loading state (10-60s) → 2 song variants with waveform player → download. Every feature in v1 should support this flow. Nothing else.

**Must have (table stakes):**
- Text prompt input (free-form description) — users expect Suno-style "type a vibe and get music"
- Custom lyrics input with `[Verse]`/`[Chorus]` structure tags — core "personalized birthday song" differentiator
- Genre/style tags in prompt — dramatically improves output quality; free-form chips, not dropdown
- In-browser audio playback with waveform visualization — wavesurfer.js; plain `<audio>` feels low-quality
- MP3 download for all users — core value delivery; without this the app has no lasting use
- User auth (email + Google) — required for credits and commercial licensing
- Credit balance display in header — users abandon when they don't know their remaining credits
- Async generation loading state — 30-60s generation requires animated placeholder, not a spinner
- Error state with credit non-charge confirmation — users must know credits weren't lost on failure
- Free tier (no credit card required) — 10 credits/day, daily cron reset; without this Suno wins by default
- Stripe checkout for paid credit purchase

**Should have (competitive):**
- Dual variant generation (batch_size=2) — 2 cards per generation, user picks the winner; Suno does this
- Instrumental toggle (empty lyrics or `[instrumental]` tag) — catches background music use case
- Duration presets (Short ~1min / Standard ~2min / Full ~4min) — ACE-Step supports 10-600s; low effort
- WAV download for paid tiers — meaningful tier differentiation, negligible technical effort
- Commercial license for paid tiers (ToS only, no technical complexity)
- Upgrade CTA when credits reach 0 or low threshold

**Defer (v2+):**
- Song library with persistent audio storage (requires S3/R2, CDN, doubles scope)
- Remixing / repaint tools (ACE-Step base model only, requires audio segmentation UI)
- Stem export (base model only, slower, niche use case)
- Social features / explore feed (content moderation, legal exposure)
- Native mobile apps (responsive web works on mobile; native is v2+)
- LoRA style personalization (training pipeline, per-user model storage)
- Admin dashboard (Stripe dashboard + direct DB access is sufficient at prototype scale)

See `.planning/research/FEATURES.md` for the full feature prioritization matrix, credit system design, and competitor comparison table.

### Architecture Approach

The architecture is a three-tier BFF pattern: React UI talks only to Next.js API routes, which talk to RunPod (GPU inference), Supabase (database + storage), and Stripe (payments). The browser never touches RunPod credentials, ACE-Step endpoints, or Supabase service keys. All credit enforcement and auth validation happens in the BFF layer.

**Major components:**
1. Next.js App (Vercel) — UI (React Server Components + Client Components), BFF API routes (`/api/generate`, `/api/status/:jobId`, `/api/download/:jobId`, `/api/stripe/webhook`)
2. RunPod Persistent Pod — Docker container running ACE-Step 1.5 REST API on port 8001; Python handler wraps ACE-Step and returns audio as base64 or uploads to Supabase Storage
3. Supabase Postgres (via Drizzle ORM) — `users` (credits, stripe_customer_id), `generations` (job tracking, storage_path), `credit_transactions` (append-only audit ledger)
4. Supabase Storage — private bucket `audio-files`; audio stored by path; signed URLs generated per-request, never stored in DB
5. Stripe — Checkout sessions for credit purchase; webhook at `/api/stripe/webhook` grants credits on `checkout.session.completed`
6. Clerk — Middleware-based session auth; `getUser()` in API routes for validation

**Key architectural patterns:**
- **Client-side polling, never server-side:** Submit job → return `jobId` → frontend polls `/api/status/:jobId` every 2.5s. Never poll RunPod inside a Vercel function (hits 10s/60s timeout).
- **Atomic credit deduction:** Single `UPDATE users SET credits = credits - 1 WHERE id = x AND credits >= 1`. Two-phase reservation: hold on submit, confirm on success, cancel on failure.
- **Path-only storage:** Store `storage_path` in DB, never signed URLs. Generate fresh signed URLs per request.
- **ACE-Step workers=1:** Single uvicorn worker; concurrent requests corrupt the in-memory job queue.

See `.planning/research/ARCHITECTURE.md` for the full component diagram, database schema, build order dependency graph, and code patterns for each major flow.

### Critical Pitfalls

The research identified 10 pitfalls across infrastructure, payments, audio, and security. These 5 are the highest priority — they either cause data corruption, user-facing money loss, or silent production failures.

1. **ACE-Step memory leak kills workers after 2-3 generations** — Configure RunPod to restart workers after 1-2 jobs. Set max job retries low. Monitor RAM metrics per job. This is GitHub issue #142, confirmed open as of Feb 2026. Address in Infrastructure Setup phase before any user traffic.

2. **Credits deducted before generation confirms success** — Never do subtract-on-submit without a reservation. Implement a two-phase credit pattern: hold credits at submission, confirm on successful audio delivery, cancel/refund on failure. Set this up in the Credit System phase before any real money is involved.

3. **Stripe webhook race condition: user sees Free tier after paying** — The Stripe Checkout redirect fires before the webhook arrives. Implement a `/api/billing/sync-checkout` endpoint that the success page calls first, querying Stripe directly for the session and updating the DB synchronously. Add webhook idempotency (store processed event IDs) in the same phase.

4. **Vercel function timeout kills the generation polling loop** — Never poll RunPod inside a Next.js API route. Submit returns `jobId` immediately; the frontend handles polling. This is the most common architecture mistake and fails silently in production (works fine locally). Establish the async pattern from the first generation endpoint.

5. **Signed URL expiry breaks downloads hours later** — Never store signed URLs in the DB. Store only `storage_path`. Generate fresh signed URLs at serve time. One-line fix if done from the start; painful migration if discovered later.

See `.planning/research/PITFALLS.md` for the full pitfall list including audio distortion artifacts, WAV file size issues, free tier abuse patterns, and a "looks done but isn't" QA checklist.

---

## Implications for Roadmap

Based on research, the architecture's build order dependency graph and pitfall-to-phase mapping combine to suggest this phase structure:

### Phase 1: Infrastructure Foundation
**Rationale:** Everything depends on auth, database, and the RunPod/ACE-Step integration. These have no UI dependencies but block all subsequent phases. The ACE-Step memory leak and Persistent Pod configuration must be resolved here before any application code is written against it.
**Delivers:** Working Supabase project (schema + migrations), Clerk auth with middleware, RunPod Persistent Pod with ACE-Step running and tested, end-to-end generation verified via direct API call (no UI).
**Addresses:** Text-to-music generation (ACE-Step `text2music` task), basic user auth
**Avoids:** ACE-Step memory leak (configure worker restart policy here), RunPod TTL misconfiguration, ACE-Step `workers=1` constraint

### Phase 2: Generation API and Core UI
**Rationale:** With infrastructure validated, the generation flow (BFF API routes + client polling) is the product core. This phase implements the async polling pattern correctly from day one — if done wrong here, it fails in production. Audio player comes with generation output.
**Delivers:** `/api/generate` (auth guard + credit stub + RunPod dispatch), `/api/status/:jobId` (polling relay), generation UI with waveform player, MP3 download, async loading state with timer display
**Addresses:** Text prompt input, custom lyrics, duration presets, instrumental toggle, dual variant output, waveform playback, MP3 download, loading state, error state with retry
**Avoids:** Server-side polling timeout (Vercel 10s/60s limit), audio stored as BYTEA in Postgres, signed URLs stored in DB, WAV served without MP3 conversion
**Stack:** `wavesurfer.js`, `@wavesurfer/react`, `zustand`, `swr` (polling), Drizzle ORM

### Phase 3: Credit System
**Rationale:** Generation works without credits (stubbed in Phase 2). Credit system is isolated enough to add without breaking the generation flow, but must be implemented before payments. The atomic reservation pattern is the core correctness requirement — get it right here before Stripe is wired in.
**Delivers:** Atomic credit deduction with two-phase reservation/confirmation/cancellation, credit balance in header (live updates), daily free credit cron reset, credit refund on generation failure, "Upgrade" CTA when credits are low or zero
**Addresses:** Free tier (10 credits/day), credit balance display, error state with credit-not-charged confirmation, upgrade prompt
**Avoids:** Check-then-deduct race condition, credits lost on generation failure, free tier trusted from client (must be server-enforced)

### Phase 4: Payments and Subscriptions
**Rationale:** Payments build on the credit system established in Phase 3. Stripe Checkout + webhooks are well-understood but require careful idempotency and race condition handling. This is a discrete phase because Stripe integration introduces its own complexity that should not be mixed with generation or credit logic.
**Delivers:** Stripe Checkout for credit pack purchase, `/api/stripe/webhook` with idempotency (stored event IDs), `/api/billing/sync-checkout` endpoint for race condition prevention, WAV download gate for paid tier, commercial license acknowledgment for paid tier
**Addresses:** Paid Pro tier (~$8-10/mo or credit pack), WAV download for paid users, commercial license, Stripe customer portal link
**Avoids:** Stripe webhook race condition (sync endpoint), duplicate credit grants (idempotent webhook handler), Stripe secret key on client side

### Phase 5: Polish and Launch Hardening
**Rationale:** Before any real users, security hygiene and UX polish must be in place. This phase closes the remaining pitfalls and improves the experience for cold demos.
**Delivers:** Disposable email domain blocking at signup, rate limiting on generation endpoint (per-user concurrent job limit), audio post-processing normalization (FFmpeg loudnorm to prevent distortion on rock/electronic genres), named loading stage progression ("Initializing" → "Generating" → "Finalizing"), landing page with example generations, genre/style tag UI chips
**Addresses:** Free tier abuse, audio distortion on specific genres, audio file size (WAV to MP3 conversion), UX polish on generation flow
**Avoids:** Disposable email abuse, clipping/distortion artifacts, mobile data burn from raw WAV delivery

### Phase Ordering Rationale

- Infrastructure before API before UI: The build order dependency graph from ARCHITECTURE.md makes this non-negotiable. Supabase schema must exist before Drizzle queries. RunPod must work before `/api/generate` can dispatch. Auth must exist before credits.
- Credits before Payments: The atomic reservation pattern in Phase 3 is the foundation that Stripe webhooks in Phase 4 build on. Mixing these phases risks implementing Stripe before the credit model is correct.
- Generation API before Credit System: Generation can be tested with a stub credit deduction (always succeeds) to validate the async polling pattern independently. Combining all three in one phase would make it impossible to isolate failures.
- Polish last but not optional: The ACE-Step audio distortion bug and free tier abuse patterns are documented production issues. Phase 5 is not "nice to have" — it's required before any public demo with real GPU costs.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 1 (Infrastructure):** ACE-Step REST API specifics are MEDIUM confidence (derived from DeepWiki, not live testing). The RunPod handler integration pattern needs validation against actual ACE-Step 1.5 behavior. Specifically: confirm the `workers=1` constraint, verify the `/release_task` → `/query_result` polling flow end-to-end, and test the memory leak behavior to calibrate worker restart policy.
- **Phase 4 (Payments):** Credit top-up as one-time purchase (Stripe `mode: "payment"`) vs. subscription (`mode: "subscription"`) has architectural implications for the credit model. Confirm the approach before implementing the webhook handler — switching from one-time to subscription midway through requires schema changes.

Phases with standard patterns (skip research-phase):
- **Phase 2 (Generation API):** Client-side polling, BFF pattern, SWR `refreshInterval`, wavesurfer.js integration — all well-documented with examples in STACK.md and ARCHITECTURE.md.
- **Phase 3 (Credit System):** Atomic Postgres UPDATE pattern is fully specified in ARCHITECTURE.md with working code. No ambiguity.
- **Phase 5 (Polish):** FFmpeg loudnorm, disposable email blocklist, rate limiting — all standard patterns with drop-in libraries.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Next.js, Clerk, Supabase, Drizzle, Stripe all verified against current docs and npm versions. ACE-Step API details are MEDIUM (DeepWiki-sourced, not live tested). |
| Features | HIGH | Competitor analysis from live Suno and Udio products. ACE-Step capability mapping is MEDIUM — instrumental toggle (`[instrumental]` tag) needs testing to confirm behavior. |
| Architecture | HIGH | BFF pattern, polling architecture, and Postgres atomic credit deduction are established patterns with working code examples. ACE-Step/RunPod handler architecture is MEDIUM (derived from docs, not a deployed example). |
| Pitfalls | HIGH | ACE-Step memory leak and distortion bugs are from live GitHub issues. Stripe race condition and idempotency patterns are from multiple production post-mortems. RunPod TTL and Vercel timeout patterns are from official docs. |

**Overall confidence:** MEDIUM-HIGH

### Gaps to Address

- **ACE-Step API field names:** The API field for style prompt is variously called `caption` or `prompt` across sources. Validate against a live ACE-Step 1.5 instance in Phase 1 before building the generation API.
- **Instrumental toggle mechanism:** Empty `lyrics` field vs. `[instrumental]` tag — behavior not confirmed from docs. Test both in Phase 1.
- **RunPod Serverless vs. Persistent Pod in production:** The research recommends Persistent Pod for prototype and Serverless for production. The exact migration path (Docker image, FlashBoot configuration, cold start mitigation) needs a dedicated spike before scaling beyond 10 users.
- **Credit model: one-time purchase vs. subscription:** Research documents both patterns. One-time purchase packs are recommended for v1, but if the product hypothesis is monthly recurring revenue, subscription billing should be evaluated before Phase 4. This is a business decision that affects schema design.
- **Audio storage strategy at scale:** Supabase Storage is recommended for v1. At production scale (1000+ users), Cloudflare R2 + CDN is the migration target. This doesn't affect Phase 1-3 architecture but should be documented as a known future migration.

---

## Sources

### Primary (HIGH confidence)
- ACE-Step 1.5 GitHub — API endpoints, capability matrix, confirmed bugs (#142 memory leak, #298 distortion): https://github.com/ace-step/ACE-Step-1.5
- Vercel Function Duration Limits — 10s Hobby / 60s Pro confirmed: https://vercel.com/docs/functions/limitations
- RunPod Serverless Endpoint Configuration — TTL, execution timeout, worker lifecycle: https://docs.runpod.io/serverless/references/endpoint-configurations
- Stripe Webhook Best Practices — signature verification, idempotency, event handling: https://stripe.com/docs/webhooks/best-practices
- Suno live product (suno.com) — competitor feature analysis, credit model, user flow
- Udio live product — competitor feature analysis, pricing tiers

### Secondary (MEDIUM confidence)
- DeepWiki ACE-Step 1.5 (indexed 2026-02-03) — API architecture, endpoint overview: https://deepwiki.com/ace-step/ACE-Step-1.5
- Stripe Webhook Race Condition (Pedro Alonso) — sync-checkout pattern: https://www.pedroalonso.net/blog/stripe-webhooks-solving-race-conditions/
- Drizzle vs Prisma 2026 deep dive — bundle size, cold start impact: https://medium.com/@codabu/drizzle-vs-prisma-choosing-the-right-typescript-orm-in-2026-deep-dive-63abb6aa882b
- Voice Cloning App with Next.js + RunPod (Geronimo) — RunPod handler architecture reference: https://medium.com/@geronimo7/building-a-voice-cloning-app-9a146f3357db

### Tertiary (LOW confidence / needs validation)
- ACE-Step instrumental toggle via `[instrumental]` tag — mentioned in docs but behavior unconfirmed via testing
- RunPod FlashBoot cold start performance — marketing claims, not independently verified: https://www.runpod.io/blog/introducing-flashboot-serverless-cold-start

---

*Research completed: 2026-03-03*
*Ready for roadmap: yes*
