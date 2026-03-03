# Stack Research

**Domain:** AI music generation SaaS (text-to-music, credits, payments)
**Researched:** 2026-03-03
**Confidence:** MEDIUM-HIGH (core stack HIGH, ACE-Step API details MEDIUM — derived from DeepWiki/API.md, not live testing)

---

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Next.js | 15.5.x (stable) | Full-stack React framework | App Router gives you React Server Components, Server Actions, and API Routes in one repo. SSR benefits SEO for landing page. Next.js 16 exists but is very new (Oct 2025) — stay on 15.5.x for stability. |
| React | 19.2 | UI component model | Ships with Next.js 15. Server Components reduce client JS bundle. Stable as of Oct 2025. |
| TypeScript | 5.x (bundled) | Type safety across stack | Catch payload shape mismatches with ACE-Step API at compile time, not runtime. |
| Tailwind CSS | 4.x | Utility-first styling | Bundled in Next.js 16 scaffolding and works well with 15.x. v4 is faster and CSS-first (no tailwind.config.js required). Compatible with Next.js 15. |
| Supabase | hosted (free/pro) | PostgreSQL database + Auth (backup) | Managed Postgres with generous free tier (500 MB DB, 50K MAU). Provides both database and optional auth. Prefer Clerk for auth but Supabase for the database layer. |
| Clerk | @clerk/nextjs ^6.x | Authentication | Best-in-class Next.js App Router support, pre-built components, handles sessions, middleware, and server-side auth helpers. Free up to 10K MAU — more than enough for prototype phase. |
| Drizzle ORM | drizzle-orm ^0.45.x | Database access layer | Lightweight (~7 KB), TypeScript-first, zero binary dependencies (no Prisma engine). Pairs cleanly with Supabase Postgres via the `postgres` driver. SQL-like API makes credit deduction queries readable and auditable. |
| Stripe | stripe ^20.x | Payment processing | Industry standard for SaaS subscriptions + one-time purchases. Handles SCA, tax, retries, and invoices. `stripe` (server SDK) + `@stripe/stripe-js` (client). |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| wavesurfer.js | ^7.11.x | Audio waveform visualization + playback | The player UI for song preview. v7 ships a React wrapper (`@wavesurfer/react`). Renders into Shadow DOM — style via `::part()`. Use instead of raw `<audio>` for visual waveform. |
| @wavesurfer/react | ^1.0.x | React component wrapper for wavesurfer.js | Use this instead of manually instantiating wavesurfer. Turns wavesurfer options into React props. Memo the plugins array (required, or renders will error). |
| Zustand | ^5.x | Lightweight client state | Track generation job state (polling status, task_id, audio URL) on the client. Much lighter than Redux for this simple use case. |
| @stripe/stripe-js | ^5.x | Stripe client-side SDK | Required to redirect to Stripe Checkout from browser. Load via `loadStripe()` — never put secret key on client. |
| swr or react-query | swr ^3.x | Polling / data fetching | Poll the ACE-Step `/query_result` endpoint on an interval until status = 1 (success). SWR's `refreshInterval` option makes this trivial. Lighter than react-query for this narrow use case. |
| zod | ^3.x | Schema validation | Validate ACE-Step request payloads and Stripe webhook bodies before processing. Prevents bad data from reaching the GPU. |
| @upstash/ratelimit (optional) | ^2.x | Rate limiting credits | If you want server-side rate limiting on generation route without a Redis instance, Upstash provides serverless Redis. Defer unless abuse becomes a real problem at prototype scale. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| drizzle-kit | Database migrations | `npx drizzle-kit generate` + `npx drizzle-kit migrate`. Use push for local dev, migrations for production. |
| Stripe CLI | Local webhook testing | `stripe listen --forward-to localhost:3000/api/webhooks/stripe` — required to test subscription events locally without ngrok. |
| ngrok (optional) | Expose local server for ACE-Step testing | Only needed if testing ACE-Step running on local GPU against hosted Next.js. Defer to RunPod deployment setup. |

---

## ACE-Step REST API Integration

This is the critical external integration point. Document it explicitly to avoid guessing during implementation.

### API Base URL
```
http://<RUNPOD_HOST>:8001
```
Set via environment variable: `ACESTEP_API_URL` and `ACESTEP_API_KEY`.

### Auth Header
```
Authorization: Bearer <ACESTEP_API_KEY>
```

### Text-to-Music Flow

**Step 1 — Submit job:**
```http
POST /release_task
Content-Type: application/json
Authorization: Bearer <key>

{
  "prompt": "upbeat jazz birthday song, trumpet, piano",
  "lyrics": "[verse]\nHappy birthday...",
  "audio_duration": 30,
  "inference_steps": 8,
  "model": "turbo",
  "guidance_scale": 7.5,
  "seed": -1
}
```

**Step 2 — Receive task_id:**
```json
{
  "data": { "task_id": "abc-123" },
  "code": 200,
  "error": null
}
```

**Step 3 — Poll until complete (status = 1):**
```http
POST /query_result
Content-Type: application/json

{ "task_id_list": ["abc-123"] }
```

Response status values:
- `0` = queued / processing
- `1` = succeeded (audio_url present)
- `2` = failed

**Step 4 — Download audio:**
```
GET /v1/audio?path=<audio_url_from_result>
```

### Key Constraints
- ACE-Step API requires `workers=1` — only one uvicorn worker process. Multiple workers corrupt the in-memory job queue.
- Generation on turbo variant: ~8-15 seconds on RTX 4090. Budget 30 seconds polling timeout on client.
- RunPod cold start adds ~20-60 seconds on first request if using serverless (not persistent pod).

---

## Deployment Architecture

### Next.js App — Vercel
Deploy Next.js to Vercel. Free tier covers prototype volume. API Routes and Server Actions run as edge/serverless functions.

### ACE-Step API — RunPod
Two options depending on cost tolerance:

**Option A: RunPod Persistent Pod (recommended for prototype)**
- RTX 4090 at ~$0.59/hr on-demand
- Start/stop manually between dev sessions
- No cold start penalty — API is always warm when pod is running
- Simple Docker container: `acestep-api` process bound to port 8001
- Expose via RunPod's public URL feature

**Option B: RunPod Serverless (recommended for production)**
- Pay-per-second billing, scales to zero when idle
- Cold starts of 20-60s on first request (significant UX issue for music generation)
- Better for bursty unpredictable traffic
- Requires worker image with model weights pre-baked

**Prototype decision: Use Persistent Pod.** Stop it when not in use. Cold start UX is unacceptable for demo.

---

## Installation

```bash
# Core framework
npx create-next-app@latest musicgen --typescript --tailwind --app --src-dir

# Auth
npm install @clerk/nextjs

# Database ORM
npm install drizzle-orm postgres
npm install -D drizzle-kit

# Payments
npm install stripe @stripe/stripe-js

# Audio player
npm install wavesurfer.js @wavesurfer/react

# Client state + data fetching
npm install zustand swr

# Validation
npm install zod

# Dev tools
npm install -D stripe  # Stripe CLI is installed separately via brew/apt
```

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Clerk | NextAuth.js (Auth.js) | When you need full data ownership, already have a database auth setup, or have >10K MAU on free tier and want to avoid Clerk costs scaling |
| Clerk | Supabase Auth | When you're using Supabase for everything and want one vendor — acceptable, but Clerk's Next.js DX is significantly better |
| Supabase Postgres | Neon | Neon is marginally cheaper for true serverless but had a 5.5-hour outage in May 2025 and was acquired by Databricks — avoid for prototypes where reliability matters more than cost |
| Drizzle ORM | Prisma | When you want automated schema migration tooling and don't care about bundle size. Prisma's generated client is ~300 KB vs Drizzle's ~7 KB — matters on Vercel cold starts |
| SWR (polling) | WebSocket / SSE | When you need real-time push updates for many concurrent jobs. For v1 with 5-10 users, polling every 2 seconds is fine |
| wavesurfer.js | Howler.js | When you only need audio playback without waveform visualization. Howler is 7 KB vs wavesurfer's ~50 KB. Use Howler if you drop the waveform UI |
| Vercel | Railway / Fly.io | When you need persistent server state (e.g., in-process job queue). Next.js on Vercel is stateless by design — fine here since ACE-Step handles its own queue |
| RunPod Persistent Pod | Modal / Replicate | Modal has cleaner Python SDK and better cold start handling. Replicate bills per second with no infra management. Switch to Replicate/Modal if RunPod operational overhead becomes a burden |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `react-player` | Adds YouTube/Vimeo support you don't need, large bundle, no waveform visualization | wavesurfer.js or Howler.js |
| `next-auth` (v4) | Legacy API, being replaced by Auth.js v5 which is still beta. Confusing versioning and naming | Clerk for new projects |
| Prisma | Binary engine adds ~300 KB to serverless function cold start and requires separate migration binary | Drizzle ORM |
| Stripe Metered Billing API | Complex setup for variable usage billing — unnecessary overhead | Pre-paid credit system stored in your DB, deducted per generation |
| Redux / Redux Toolkit | Far too heavy for managing generation job state across 2-3 components | Zustand |
| `pg` (node-postgres) directly | Verbose, no type safety on queries, more boilerplate | Drizzle ORM with `postgres` driver |
| RunPod Serverless for prototype | Cold starts ruin the music generation UX (20-60s before generation even starts) | RunPod Persistent Pod during prototype |
| Edge Runtime for webhook handler | Stripe webhook signature verification requires `crypto` — not available on all edge runtimes. Use Node.js runtime for `/api/webhooks/stripe` | Next.js API Route with `runtime = 'nodejs'` |

---

## Stack Patterns by Variant

**Credit system — pre-paid credits (recommended):**
- Store `credits_remaining` on the user row in Postgres
- Deduct atomically in a DB transaction when generation is submitted (not when it completes — prevents double-spend on retry)
- On failed generation, refund the credit in the same transaction
- Use Stripe one-time payment (Checkout, mode: "payment") to top up credits, not subscriptions
- Stripe webhook `checkout.session.completed` → increment user credits in DB

**Credit system — subscriptions (alternative, more complex):**
- User has a subscription tier (free/pro/creator) with monthly credit refill
- Requires Stripe webhook handling for `customer.subscription.updated`, `invoice.paid`, `customer.subscription.deleted`
- More profitable long-term but significantly more Stripe/DB complexity for v1
- **Defer to v2** unless freemium credit refill is confirmed as core v1 requirement

**If ACE-Step API is behind a VPN/private network:**
- Add `ACESTEP_API_URL` as a server-side env var only (never expose to client)
- All generation calls go through a Next.js API Route or Server Action — client never calls ACE-Step directly

**If generation queue grows beyond single RunPod pod:**
- Switch ACE-Step from persistent pod to serverless workers
- Add a Redis-backed queue (Upstash) in front to buffer requests
- Not needed at prototype scale — design for it, don't build it yet

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| Next.js 15.5.x | React 19.2, Tailwind CSS 4.x | Next.js 15 requires React 19 peer dependency |
| @clerk/nextjs 6.x | Next.js 15 App Router | Clerk v6 dropped Pages Router support — App Router only |
| drizzle-orm 0.45.x | postgres driver ^3.x | Use `postgres` (not `pg`) for best TypeScript inference with Drizzle |
| wavesurfer.js 7.x | @wavesurfer/react 1.0.x | v7 breaks shadow DOM styling from v6 — use `::part()` selector for custom styles |
| stripe 20.x | Node.js 18+ | stripe v20 requires Node 18 minimum — Vercel uses Node 20 by default |
| Tailwind CSS 4.x | Next.js 15.x | v4 uses CSS-first config (`@import "tailwindcss"` in globals.css, no tailwind.config.js required) |

---

## Environment Variables

```bash
# ACE-Step GPU API
ACESTEP_API_URL=https://<runpod-pod-id>-8001.proxy.runpod.net
ACESTEP_API_KEY=sk-your-secret-key

# Clerk Auth
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up

# Database (Supabase connection pooler URL)
DATABASE_URL=postgresql://postgres:[password]@[pooler-host]:6543/postgres

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

---

## Sources

- DeepWiki ACE-Step 1.5 (indexed 2026-02-03) — API architecture, endpoint overview, job model: https://deepwiki.com/ace-step/ACE-Step-1.5/7-configuration-and-deployment
- ACE-Step GitHub API.md (raw, current) — endpoint reference, payload fields, response schema, polling flow: https://github.com/ace-step/ACE-Step-1.5
- Next.js releases (Releasebot, 2026-02-04) — confirmed v15.5.12 as latest stable: https://releasebot.io/updates/vercel/next-js
- React blog — v19.2 released Oct 2025, stable for production: https://react.dev/blog/2025/10/01/react-19-2
- Tailwind CSS v4 release notes (Jan 2025) — CSS-first config, Next.js 15 compatible: https://tailwindcss.com/blog/tailwindcss-v4
- Clerk pricing (verified current) — free up to 10K MAU, @clerk/nextjs v6.39.0: https://clerk.com/pricing
- Supabase pricing (2026 sources) — 500 MB DB, 50K MAU free: https://supabase.com/pricing
- Drizzle vs Prisma comparison (2026) — bundle size, serverless cold starts, Drizzle recommended for Next.js: https://orm.drizzle.team/
- wavesurfer.js npm — v7.11.0 current, @wavesurfer/react 1.0.12: https://wavesurfer.xyz/
- stripe npm — v20.4.0 current (published ~2026-02-25): https://www.npmjs.com/package/stripe
- RunPod pricing — RTX 4090 at $0.59/hr on-demand, serverless pay-per-second: https://www.runpod.io/pricing
- Stripe + Next.js 15 integration guide (Pedro Alonso, 2025): https://www.pedroalonso.net/blog/stripe-nextjs-complete-guide-2025/
- Drizzle vs Prisma 2026 deep dive (Medium): https://medium.com/@codabu/drizzle-vs-prisma-choosing-the-right-typescript-orm-in-2026-deep-dive-63abb6aa882b

---

*Stack research for: AI music generation SaaS (ACE-Step 1.5 + Next.js)*
*Researched: 2026-03-03*
