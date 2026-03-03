# Architecture Research

**Domain:** AI music generation SaaS (Next.js + ACE-Step 1.5 on RunPod)
**Researched:** 2026-03-03
**Confidence:** HIGH (stack decisions) / MEDIUM (ACE-Step API specifics — docs sparse, deepwiki-sourced)

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                                 │
│  ┌──────────────┐  ┌────────────────┐  ┌────────────────────────┐   │
│  │  Generation  │  │   Auth Pages   │  │   Account / Billing    │   │
│  │  UI (React)  │  │  (Supabase UI) │  │   (Stripe Portal)      │   │
│  └──────┬───────┘  └────────┬───────┘  └───────────┬────────────┘   │
└─────────┼────────────────────┼───────────────────────┼───────────────┘
          │ fetch / polling    │ cookie auth            │ redirect
┌─────────┼────────────────────┼───────────────────────┼───────────────┐
│                       NEXT.JS APP LAYER                               │
│                 (Vercel — serverless functions)                        │
│  ┌───────────────┐  ┌────────────────┐  ┌────────────────────────┐   │
│  │  /api/generate│  │  /api/status   │  │  /api/stripe/webhook   │   │
│  │  (submit job) │  │  (poll result) │  │  (credit top-up)       │   │
│  └──────┬────────┘  └───────┬────────┘  └────────────────────────┘   │
│         │                   │                                          │
│  ┌──────┴───────────────────┴──────────────────────────────────────┐  │
│  │              API Gateway / BFF Logic                             │  │
│  │  • Auth validation (Supabase session)                            │  │
│  │  • Credit check + atomic deduction (Postgres)                    │  │
│  │  • Job record creation (generations table)                       │  │
│  │  • RunPod job dispatch + status relay                            │  │
│  └──────┬───────────────────┬──────────────────────────────────────┘  │
└─────────┼───────────────────┼────────────────────────────────────────┘
          │ HTTP POST          │ GET poll
┌─────────┼───────────────────┼────────────────────────────────────────┐
│                      EXTERNAL SERVICES                                 │
│  ┌──────┴────────────────┐  ┌─────────────────────────────────────┐  │
│  │  RunPod Serverless    │  │  Supabase                           │  │
│  │  Endpoint             │  │  ┌──────────────┐ ┌─────────────┐  │  │
│  │  ┌────────────────┐   │  │  │  PostgreSQL  │ │  Storage    │  │  │
│  │  │  ACE-Step 1.5  │   │  │  │  (users,     │ │  (audio     │  │  │
│  │  │  turbo handler │   │  │  │   credits,   │ │   files)    │  │  │
│  │  └────────────────┘   │  │  │   jobs)      │ └─────────────┘  │  │
│  │  GPU: RTX 4090/3090   │  │  └──────────────┘                  │  │
│  └───────────────────────┘  └─────────────────────────────────────┘  │
│                                                                        │
│  ┌──────────────────────┐                                             │
│  │  Stripe              │                                             │
│  │  (checkout, webhooks,│                                             │
│  │   customer portal)   │                                             │
│  └──────────────────────┘                                             │
└────────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Implementation |
|-----------|----------------|----------------|
| Next.js frontend | UI, auth flows, generation form, audio player | React, App Router, shadcn/ui |
| Next.js API routes (BFF) | Auth guard, credit deduction, RunPod dispatch, status relay | Route Handlers in `/app/api/` |
| RunPod Serverless Endpoint | GPU inference — wraps ACE-Step REST API in runpod handler | Custom Docker image + Python handler |
| ACE-Step 1.5 (inside RunPod) | Actual music generation from text/lyrics | `acestep-api` on port 8001 |
| Supabase Postgres | Users, credits, generations table, Stripe metadata | Drizzle ORM, RLS policies |
| Supabase Storage | Audio file storage, CDN delivery, signed URLs | Private bucket, signed URLs per user |
| Stripe | Payment checkout, subscriptions, credit top-up webhooks | Stripe Checkout + webhooks |

## Recommended Project Structure

```
src/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── signup/page.tsx
│   ├── (dashboard)/
│   │   ├── generate/page.tsx       # Main generation UI
│   │   └── account/page.tsx        # Credits, billing, history
│   ├── api/
│   │   ├── generate/route.ts       # POST — submit generation job
│   │   ├── status/[jobId]/route.ts # GET — poll job status
│   │   ├── download/[jobId]/route.ts # GET — signed URL for audio
│   │   └── stripe/
│   │       └── webhook/route.ts    # POST — Stripe event handler
│   ├── layout.tsx
│   └── middleware.ts               # Supabase session refresh
├── lib/
│   ├── supabase/
│   │   ├── client.ts               # Browser client
│   │   ├── server.ts               # Server component client
│   │   └── middleware.ts           # Session middleware helper
│   ├── db/
│   │   ├── schema.ts               # Drizzle schema (all tables)
│   │   ├── queries.ts              # Typed query helpers
│   │   └── migrations/             # Drizzle migration files
│   ├── runpod/
│   │   ├── client.ts               # RunPod API wrapper
│   │   └── types.ts                # Job input/output types
│   ├── stripe/
│   │   ├── client.ts               # Stripe SDK instance
│   │   └── webhooks.ts             # Webhook event handlers
│   └── credits/
│       └── deduct.ts               # Atomic credit deduction logic
├── components/
│   ├── generation/
│   │   ├── GenerationForm.tsx      # Prompt + lyrics input
│   │   ├── GenerationStatus.tsx    # Polling + progress display
│   │   └── AudioPlayer.tsx         # Preview + download
│   └── ui/                         # shadcn/ui components
└── runpod-handler/                 # Separate — deployed to RunPod
    ├── handler.py                  # RunPod serverless handler
    ├── Dockerfile
    └── requirements.txt
```

### Structure Rationale

- **`app/api/` as BFF:** Next.js Route Handlers act as a Backend-for-Frontend. The browser never talks directly to RunPod or Supabase Storage — all auth, credit checks, and GPU dispatch happen server-side. RunPod API key and Supabase service-role key never reach the browser.
- **`lib/runpod/`:** Isolated RunPod client so the job submission logic is swappable (swap RunPod for Modal or self-hosted GPU without touching API routes).
- **`lib/credits/deduct.ts`:** Credit deduction is a single atomic function with Postgres-level locking. Centralizing it prevents the "check-then-deduct race condition" anti-pattern.
- **`runpod-handler/`:** The Python RunPod handler lives in the same repo but is deployed independently as a Docker image. Keeps infrastructure code adjacent to the app code.

## Architectural Patterns

### Pattern 1: Client Polling for Async Generation

**What:** Frontend submits a generation request (POST `/api/generate`), receives a `jobId` immediately, then polls GET `/api/status/:jobId` every 2-3 seconds until the job is `COMPLETED` or `FAILED`.

**When to use:** When generation takes 5-30 seconds and you're deploying to Vercel serverless (which has function duration limits of 60s on Pro). Polling avoids the timeout problem entirely — each status check is a short-lived function call.

**Why not SSE:** SSE requires the Next.js function to stay open for the duration of the generation (potentially 10-30s). On Vercel Hobby tier this hits the 10s limit. On Pro the 60s limit is workable but fragile. Polling is architecturally simpler and avoids this entirely. SSE is excellent for streaming LLM tokens but overkill for a job-completion notification.

**Why not WebSockets:** WebSockets require persistent connections, which don't work reliably in serverless environments. Next.js Route Handlers cannot maintain WebSocket connections.

**Trade-offs:** Polling creates slightly more HTTP overhead than SSE/WebSockets, but at 1-5 concurrent users (prototype scale) this is negligible. If scaling to 1000+ users with high-concurrency generation, revisit with a proper job queue (BullMQ + Redis) and SSE.

**Example:**
```typescript
// app/api/generate/route.ts
export async function POST(req: Request) {
  const user = await getAuthenticatedUser(req);
  const { prompt, lyrics, duration } = await req.json();

  // 1. Atomic credit check + deduction
  await deductCredit(user.id, 1);  // throws if insufficient

  // 2. Create job record in DB
  const job = await db.insert(generations).values({
    userId: user.id,
    status: 'pending',
    prompt,
    lyrics,
  }).returning();

  // 3. Dispatch to RunPod
  const runpodJob = await submitRunPodJob({
    prompt,
    lyrics,
    duration,
    jobId: job[0].id,
  });

  // 4. Store RunPod job ID for status polling
  await db.update(generations)
    .set({ runpodJobId: runpodJob.id })
    .where(eq(generations.id, job[0].id));

  return Response.json({ jobId: job[0].id });
}

// Frontend polling loop
async function pollGeneration(jobId: string) {
  const poll = setInterval(async () => {
    const res = await fetch(`/api/status/${jobId}`);
    const { status, audioUrl } = await res.json();

    if (status === 'completed') {
      clearInterval(poll);
      setAudioUrl(audioUrl);
    } else if (status === 'failed') {
      clearInterval(poll);
      setError('Generation failed');
    }
  }, 2500);
}
```

### Pattern 2: API Gateway / BFF Pattern

**What:** Next.js API routes act as the sole intermediary between frontend and all backend services. The browser makes requests only to `/api/*` endpoints on the same domain. Those routes authenticate, check credits, call RunPod, and return sanitized responses.

**When to use:** Always, for this architecture. Keeps GPU endpoint credentials server-side, enables credit enforcement at the API layer, and simplifies CORS.

**Trade-offs:** Adds one hop of latency vs. direct-to-GPU calls. Acceptable for music generation where the dominant latency is GPU inference (5-30s), not the BFF hop (10-50ms).

**Example:**
```typescript
// lib/runpod/client.ts
const RUNPOD_ENDPOINT = process.env.RUNPOD_ENDPOINT_ID!;
const RUNPOD_API_KEY = process.env.RUNPOD_API_KEY!;

export async function submitRunPodJob(input: GenerationInput) {
  const res = await fetch(
    `https://api.runpod.ai/v2/${RUNPOD_ENDPOINT}/run`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RUNPOD_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ input }),
    }
  );
  return res.json(); // { id: "job-xyz", status: "IN_QUEUE" }
}

export async function getRunPodJobStatus(runpodJobId: string) {
  const res = await fetch(
    `https://api.runpod.ai/v2/${RUNPOD_ENDPOINT}/status/${runpodJobId}`,
    { headers: { 'Authorization': `Bearer ${RUNPOD_API_KEY}` } }
  );
  return res.json(); // { status: "COMPLETED", output: { audioBase64: "..." } }
}
```

### Pattern 3: Atomic Credit Deduction with Postgres

**What:** Credit check and deduction happen in a single Postgres UPDATE with a WHERE clause guard. No separate SELECT + UPDATE. This prevents race conditions where two simultaneous requests both pass the balance check before either deducts.

**When to use:** Every time a credit-costing action is taken. Must run in the API route, before dispatching to RunPod.

**Trade-offs:** Slightly more complex SQL than a simple UPDATE, but eliminates the double-spend bug entirely. Postgres ACID guarantees make this safe without application-level locks.

**Example:**
```typescript
// lib/credits/deduct.ts
export async function deductCredit(userId: string, amount: number) {
  // Single atomic UPDATE — only succeeds if credits >= amount
  const result = await db
    .update(users)
    .set({ credits: sql`credits - ${amount}` })
    .where(and(
      eq(users.id, userId),
      gte(users.credits, amount)
    ))
    .returning({ remainingCredits: users.credits });

  if (result.length === 0) {
    throw new Error('INSUFFICIENT_CREDITS');
  }

  return result[0].remainingCredits;
}
```

### Pattern 4: RunPod Serverless Handler Wrapping ACE-Step

**What:** A custom Python RunPod handler receives job input, calls the ACE-Step REST API locally (both running in the same container), retrieves the audio file, encodes it to base64 or uploads to Supabase Storage, and returns the result.

**When to use:** For prototype scale. ACE-Step's built-in REST API (`acestep-api` on port 8001) runs in the same container as the RunPod handler — the handler is just a thin wrapper that connects RunPod's job system to ACE-Step's async endpoint.

**Trade-offs:** Running ACE-Step inside the RunPod container means the full model loads on each cold start (6-12s). RunPod FlashBoot mitigates this. For warm workers, subsequent jobs are fast.

**Example:**
```python
# runpod-handler/handler.py
import runpod
import requests
import time
import base64

ACESTEP_BASE = "http://localhost:8001"

def handler(event):
    input_data = event["input"]

    # 1. Submit to local ACE-Step API
    submit_res = requests.post(f"{ACESTEP_BASE}/release_task", json={
        "caption": input_data["prompt"],
        "lyrics": input_data.get("lyrics", ""),
        "duration": input_data.get("duration", 60),
        "task_type": "text2music",
        "inference_steps": 8,  # turbo
    })
    task_id = submit_res.json()["task_id"]

    # 2. Poll ACE-Step until complete
    for _ in range(120):  # max 2 min
        result = requests.get(f"{ACESTEP_BASE}/query_result",
                              params={"task_id": task_id}).json()
        if result["status"] == "completed":
            audio_path = result["audio_path"]
            break
        time.sleep(1)

    # 3. Read audio and return as base64 (or upload to Supabase)
    with open(audio_path, "rb") as f:
        audio_b64 = base64.b64encode(f.read()).decode()

    return {
        "audio_base64": audio_b64,
        "duration": result.get("duration"),
        "metadata": result.get("metadata"),
    }

runpod.serverless.start({"handler": handler})
```

## Data Flow

### Generation Request Flow

```
User submits form (prompt + lyrics)
    ↓
POST /api/generate (Next.js Route Handler)
    ↓ validate session (Supabase getClaims)
    ↓ deductCredit(userId, 1) — atomic Postgres UPDATE
    ↓ INSERT INTO generations (status='pending')
    ↓ POST https://api.runpod.ai/v2/{endpoint}/run
    ↓ UPDATE generations SET runpod_job_id = '{id}'
    → return { jobId }
    ↓
Client begins polling GET /api/status/:jobId every 2.5s
    ↓
GET /api/status/:jobId (Next.js Route Handler)
    ↓ SELECT generation WHERE id = jobId AND user_id = userId
    ↓ GET https://api.runpod.ai/v2/{endpoint}/status/{runpodJobId}
    ↓ if COMPLETED:
        → decode audio from base64 / get path
        → upload to Supabase Storage (private bucket)
        → generate signed URL (expires 1h)
        → UPDATE generations SET status='completed', storage_path=...
        → return { status: 'completed', audioUrl: signedUrl }
    ↓ if IN_QUEUE or IN_PROGRESS:
        → return { status: 'processing' }
    ↓ if FAILED:
        → refund credit (UPDATE users SET credits = credits + 1)
        → UPDATE generations SET status='failed'
        → return { status: 'failed' }
    ↓
Client receives audioUrl → renders AudioPlayer component
User previews → clicks Download → fetches signed URL again if expired
```

### Stripe Credit Top-Up Flow

```
User clicks "Buy Credits"
    ↓
POST /api/stripe/checkout — creates Stripe Checkout Session
    ↓
User redirected to Stripe → completes payment
    ↓
Stripe sends webhook to POST /api/stripe/webhook
    ↓
Validate webhook signature (stripe.webhooks.constructEvent)
    ↓
On checkout.session.completed:
    → UPDATE users SET credits = credits + {purchased_amount}
    → INSERT INTO credit_transactions (type='purchase', amount, stripe_session_id)
    ↓
User redirected back to app → credits updated
```

### Auth Flow (Supabase + Next.js Middleware)

```
Every request hits middleware.ts
    ↓
supabase.auth.getClaims() refreshes expired tokens
    ↓
If token refreshed: set cookie on response
    ↓
Protected routes: redirect to /login if no valid session
    ↓
API routes: call supabase.auth.getUser() to get authenticated user
```

## Database Schema

### Tables

```sql
-- Core users table (augments Supabase Auth)
CREATE TABLE users (
  id          UUID PRIMARY KEY REFERENCES auth.users(id),
  email       TEXT NOT NULL UNIQUE,
  credits     INTEGER NOT NULL DEFAULT 3,      -- free tier starts with 3
  stripe_customer_id TEXT UNIQUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Generation jobs (one per user music request)
CREATE TABLE generations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id),
  status          TEXT NOT NULL DEFAULT 'pending',
                  -- pending | processing | completed | failed
  prompt          TEXT NOT NULL,
  lyrics          TEXT,
  duration_secs   INTEGER NOT NULL DEFAULT 60,
  runpod_job_id   TEXT,                         -- RunPod job ID for polling
  storage_path    TEXT,                         -- Supabase Storage path
  audio_duration  REAL,                         -- actual output duration
  metadata_json   JSONB,                        -- BPM, key, etc from ACE-Step
  credits_used    INTEGER NOT NULL DEFAULT 1,
  error_message   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at    TIMESTAMPTZ
);

-- Credit transaction ledger (append-only audit trail)
CREATE TABLE credit_transactions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id),
  type            TEXT NOT NULL,  -- 'purchase' | 'generation' | 'refund' | 'free_grant'
  amount          INTEGER NOT NULL,             -- positive = credit, negative = debit
  stripe_session_id TEXT,                       -- for purchases
  generation_id   UUID REFERENCES generations(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_generations_user_id ON generations(user_id);
CREATE INDEX idx_generations_status ON generations(status);
CREATE INDEX idx_generations_runpod_job_id ON generations(runpod_job_id);
CREATE INDEX idx_credit_transactions_user_id ON credit_transactions(user_id);
```

### Schema Rationale

- **`users.credits` is the live balance.** Single column, atomically decremented. No need to sum a ledger on every request.
- **`credit_transactions` is the audit log.** Append-only. Never update rows. Used for billing disputes, debugging, analytics.
- **`generations.runpod_job_id`** stored so polling can go directly to RunPod status endpoint without re-submitting.
- **`generations.storage_path`** stored once upload is complete. `/api/download/:jobId` generates a fresh signed URL from this path on each request (URLs expire, paths don't).
- No separate "subscriptions" table for v1 — freemium with one-time credit purchases is simpler than recurring subscriptions. Add Stripe subscription fields to `users` in v2.

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0-10 users (prototype) | RunPod Flex Workers (pay-per-use, zero idle cost). Supabase free tier. Vercel Hobby. In-memory ACE-Step job queue is fine since single worker = single job at a time. |
| 10-500 users | Add 1 RunPod Active Worker (reduces cold starts, ~20-30% cost discount). Upgrade Supabase to Pro for connection pooling. Vercel Pro for 60s function timeout. |
| 500-5000 users | Multiple RunPod workers with auto-scaling. Add job queue table in Postgres (BullMQ + Redis) to decouple Next.js API from RunPod latency. SSE becomes viable for status updates. |
| 5000+ users | Migrate GPU to dedicated cluster. Separate job worker service. CDN (Cloudflare R2) for audio delivery instead of Supabase Storage. |

### Scaling Priorities

1. **First bottleneck (prototype):** RunPod cold starts (6-12s). Mitigation: keep at least 1 Active Worker warm during peak hours.
2. **Second bottleneck (100+ users):** Supabase connection pool exhaustion. Mitigation: enable Supabase connection pooling (PgBouncer) in Transaction mode — requires `prepare: false` in Drizzle config.
3. **Third bottleneck (500+ users):** Vercel function timeout on status polling if RunPod is slow. Mitigation: decouple status checking into a background job, return from DB instead of live RunPod query.

## Anti-Patterns

### Anti-Pattern 1: Direct Browser-to-RunPod Calls

**What people do:** Call RunPod API endpoint directly from frontend JavaScript to skip the Next.js BFF.
**Why it's wrong:** Exposes RunPod API key in browser. Anyone with the key can run unlimited GPU jobs at your cost. Also skips credit enforcement.
**Do this instead:** Always route through `/api/generate` which validates session and deducts credits before dispatching to RunPod.

### Anti-Pattern 2: Check-Then-Deduct Credit Race Condition

**What people do:** `SELECT credits WHERE user_id = x`, check if > 0, then `UPDATE credits - 1`. Two simultaneous requests both see credits = 1, both pass, both deduct, user ends up at -1 credits.
**Why it's wrong:** Non-atomic read-then-write is vulnerable to concurrent requests. A user with 1 credit can trigger 2 generations simultaneously.
**Do this instead:** Single `UPDATE users SET credits = credits - 1 WHERE id = x AND credits >= 1 RETURNING credits`. If 0 rows updated, credit was insufficient.

### Anti-Pattern 3: SSE for Generation Status on Vercel

**What people do:** Implement an SSE endpoint in a Next.js Route Handler that polls RunPod internally and streams status to the browser.
**Why it's wrong:** Vercel serverless functions have a 10s timeout (Hobby) or 60s timeout (Pro). ACE-Step generation can take up to 30s on cold start. The SSE connection will be killed before generation completes.
**Do this instead:** Use client-side polling. Browser calls `/api/status/:jobId` every 2.5s. Each call is a short-lived function. Total wait time can be 60s+ with no timeout issues.

### Anti-Pattern 4: Storing Audio in Postgres as BYTEA

**What people do:** Store generated audio as a binary blob directly in the database (convenient, one system).
**Why it's wrong:** 3-10MB audio files bloat the database, slow queries on unrelated tables, blow through Supabase storage limits, and make CDN delivery impossible.
**Do this instead:** Upload to Supabase Storage (object store). Store only the path in Postgres. Serve via signed URLs for access control.

### Anti-Pattern 5: Calling ACE-Step Directly from Next.js API Routes

**What people do:** Have Next.js API routes call ACE-Step's REST API directly (if self-hosted), expecting it to be fast enough to respond within the function timeout.
**Why it's wrong:** ACE-Step must run with `workers=1` (in-memory job store). Concurrent requests from multiple users will queue inside ACE-Step, potentially exceeding Vercel's function timeout while waiting for prior jobs to complete.
**Do this instead:** Use RunPod serverless — each job gets its own worker. Job state is managed by RunPod, not ACE-Step's in-memory queue.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| RunPod Serverless | REST API from Next.js BFF. `POST /v2/{endpoint}/run` to submit, `GET /v2/{endpoint}/status/{id}` to poll. | API key in `RUNPOD_API_KEY` env var. Never in browser. |
| ACE-Step 1.5 | Runs inside RunPod Docker container. Python handler calls `localhost:8001/release_task` then polls `/query_result`. | Must run with `workers=1`. Single job per worker instance. |
| Supabase Auth | `@supabase/ssr` package. Cookie-based sessions. Middleware refreshes tokens. `getUser()` in API routes for validation. | Use `getClaims()` not `getSession()` in server code. |
| Supabase Postgres | Drizzle ORM with connection pooler. Connection string from Supabase dashboard (Transaction mode). | Set `prepare: false` for PgBouncer Transaction mode. |
| Supabase Storage | Private bucket `audio-files`. Upload from RunPod handler (base64 decode + upload) or from Next.js after receiving RunPod output. Generate signed URLs with 1h expiry. | Never expose bucket as public. Always signed URLs. |
| Stripe | Stripe Checkout for payment. Webhook at `/api/stripe/webhook` handles `checkout.session.completed`. Validate with `stripe.webhooks.constructEvent`. | Store Stripe customer ID in `users.stripe_customer_id`. |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| React UI ↔ Next.js API | fetch() over HTTP. REST conventions. | API routes are the only entry point. No direct DB or RunPod calls from client. |
| Next.js API ↔ RunPod | REST API calls using fetch(). Fire-and-forget submit, then poll. | RunPod job IDs stored in `generations` table so status can be re-queried across function invocations. |
| Next.js API ↔ Supabase | Drizzle ORM (Postgres) + Supabase Storage SDK. | Drizzle for relational data. Storage SDK for file operations. |
| RunPod Handler ↔ ACE-Step | HTTP to localhost:8001. ACE-Step REST API. | Both in same container. ACE-Step starts first in Dockerfile CMD. |

## Build Order (Dependency Graph)

```
1. Supabase project setup (DB, Auth, Storage)
       ↓
2. Database schema + Drizzle migrations
       ↓
3. Supabase Auth + Next.js middleware (login/signup)
       ↓
4. RunPod handler + Docker image (ACE-Step wrapper)
       ↓
5. /api/generate route (requires: auth, DB, RunPod)
   /api/status route  (requires: DB, RunPod)
       ↓
6. Generation UI + polling client (requires: API routes)
       ↓
7. Audio player + Supabase Storage + signed URL download
       ↓
8. Credit system (deduct.ts) — integrate into /api/generate
       ↓
9. Stripe checkout + webhook → credit top-up
       ↓
10. Account page (credit balance, generation history)
```

Auth and DB must come before any API routes. RunPod handler is independently deployable (no Next.js dependency). Credits integrate into the existing generate flow, not a separate system.

## Sources

- [ACE-Step 1.5 GitHub](https://github.com/ace-step/ACE-Step-1.5)
- [ACE-Step API Details — DeepWiki](https://deepwiki.com/ace-step/ACE-Step-1.5) (MEDIUM confidence — third-party documentation source)
- [RunPod Serverless Overview](https://docs.runpod.io/serverless/overview)
- [RunPod Create Custom Endpoint](https://docs.runpod.io/serverless/get-started)
- [RunPod Serverless vs GPU Pods](https://www.runpod.io/articles/comparison/serverless-gpu-deployment-vs-pods)
- [SSE vs Polling vs WebSockets 2025 — DEV Community](https://dev.to/haraf/server-sent-events-sse-vs-websockets-vs-long-polling-whats-best-in-2025-5ep8)
- [Vercel Function Duration Limits](https://vercel.com/docs/functions/limitations)
- [Supabase Auth with Next.js App Router](https://supabase.com/docs/guides/auth/server-side/nextjs)
- [Supabase Storage Smart CDN](https://supabase.com/docs/guides/storage/cdn/smart-cdn)
- [Drizzle ORM with Supabase](https://orm.drizzle.team/docs/connect-supabase)
- [Next.js SaaS Starter Schema](https://github.com/nextjs/saas-starter) (reference for Stripe + Drizzle patterns)
- [Atomic Credit Deduction — Pedro Alonso](https://www.pedroalonso.net/blog/stripe-usage-credit-billing/)
- [SSE in Next.js — Upstash Blog](https://upstash.com/blog/sse-streaming-llm-responses)
- [Voice Cloning App with Next.js + RunPod — Geronimo](https://medium.com/@geronimo7/building-a-voice-cloning-app-9a146f3357db)

---
*Architecture research for: AI music generation SaaS (Next.js + ACE-Step 1.5 + RunPod)*
*Researched: 2026-03-03*
