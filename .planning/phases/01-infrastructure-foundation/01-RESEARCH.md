# Phase 1: Infrastructure Foundation - Research

**Researched:** 2026-03-03
**Domain:** RunPod Persistent Pod / ACE-Step 1.5 REST API / Next.js 15 / Drizzle ORM / Supabase / Cloudflare R2
**Confidence:** MEDIUM-HIGH (core APIs verified; ACE-Step memory leak workaround is LOW confidence)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- No authentication in v1 — no Clerk, no users table, no sessions
- Anyone can hit the app and generate freely
- No rate limiting — acceptable risk for a 5-10 user prototype
- Auth and billing deferred to v2
- Supabase with a generations table only — no users, no credit_transactions
- Rich generation records: job ID, RunPod job ID, status, prompt text, lyrics, genre tags, duration, instrumental flag, audio URLs (R2 keys), timestamps, error info
- One generation parent row → separate output records for each variant (batch_size=2 produces 2 children)
- Store Cloudflare R2 object keys only — generate presigned URLs on demand (no stale URL management)
- Status column with stage timestamps: started_at, completed_at, failed_at (not a full status log table)
- Record ALL generations including failures — error type, timestamp, and inputs that caused the failure
- Validate basic generation (text prompt in → audio file out) PLUS the 3 known unknowns:
  - `caption` vs `prompt` field name for style input
  - Instrumental toggle mechanism (empty lyrics vs `[instrumental]` tag)
  - Custom lyrics with structure tags ([Verse], [Chorus], etc.)
- Configure RunPod restart policy for the memory leak (GitHub #142), then run 5-10 sequential test generations to prove automatic recovery works
- Document validation findings as a reference for Phase 2 development
- Phase 1 includes full RunPod Persistent Pod setup from scratch (Docker template, ACE-Step API server, environment config)
- API returns both layers: technical error code/category (e.g., `model_error`, `timeout`, `gpu_unavailable`) + retryable flag, AND a user-friendly display message
- No auto-retry server-side — return errors immediately, let the user decide whether to retry
- RunPod Persistent Pod (NOT Serverless) — 20-60s cold starts on Serverless break UX
- ACE-Step turbo variant specifically — optimized for speed

### Claude's Discretion
- Polling timeout value (informed by validation benchmarks)
- Supabase schema column types and constraints
- R2 bucket naming and key structure
- Next.js project scaffolding choices (app router, folder structure)
- Drizzle ORM configuration details

### Deferred Ideas (OUT OF SCOPE)
- Clerk authentication — v2 scope
- Credit/billing system (credit_transactions table) — v2 scope
- Rate limiting / abuse prevention — solve if it becomes a problem
- Users table — not needed until auth is added
</user_constraints>

---

## Summary

Phase 1 builds the entire technical foundation for the music generator: a RunPod Persistent Pod running ACE-Step 1.5 turbo's built-in REST API, a Next.js 15 app skeleton with Supabase/Drizzle for database persistence, and Cloudflare R2 for audio storage. The phase ends when a raw API call (no UI) to the RunPod endpoint returns a completed audio file that is stored in R2 and recorded in the database.

The ACE-Step REST API is well-documented and uses an async job model: POST `/release_task` to submit, poll `/query_result` with the `task_id` to check status. Field names are confirmed: `prompt` is the primary style/caption field (with `caption` as an alias), `lyrics` handles vocals (use `[Instrumental]` tag for instrumental mode, not empty string). The API ships as a pre-built Docker image (`valyriantech/ace-step-1.5`) with RunPod deployment templates available.

The critical operational risk is the ACE-Step memory leak (GitHub #142 on ace-step/ACE-Step-1.5). Every generation accumulates ~12GB of RAM and does not release it — the system locks up after 2-3 generations. The mitigation strategy is to embed `supervisord` in the Docker container and configure it with `autorestart=true` to restart the ACE-Step process after each job completes. RunPod itself does not provide container-level restart policies; this must be solved in the Docker image. This is the highest-risk item in the phase.

**Primary recommendation:** Set up the RunPod pod first and validate all ACE-Step API unknowns (field names, instrumental mode, memory leak behavior) before writing any Next.js or Drizzle code. Block all subsequent tasks on this validation to prevent building on unconfirmed assumptions.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 15.x | App framework, API routes (BFF pattern) | Project constraint; App Router is current standard |
| Drizzle ORM | 0.40+ | Type-safe PostgreSQL queries | Chosen for 7KB bundle vs Prisma 300KB; cold start performance |
| drizzle-kit | 0.31+ | Schema migrations, push/generate | Companion to Drizzle ORM |
| postgres (npm) | 3.x | PostgreSQL driver for Drizzle | Recommended driver for Supabase + Drizzle |
| @aws-sdk/client-s3 | 3.x | Cloudflare R2 uploads (S3-compatible API) | R2 is S3-compatible; AWS SDK v3 is the standard client |
| @aws-sdk/s3-request-presigner | 3.x | Presigned URL generation for audio downloads | Required for secure, time-limited audio download URLs |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| dotenv | 16.x | Environment variable loading | Local dev only; Vercel/production uses platform env vars |
| zod | 3.x | Runtime environment variable validation | Validate all required env vars at startup to catch misconfiguration early |

### External Services
| Service | Purpose | Key Detail |
|---------|---------|-----------|
| RunPod Persistent Pod | GPU runtime for ACE-Step | NOT Serverless — zero cold start, stop when idle |
| ACE-Step 1.5 turbo | Music generation model | Pre-built Docker image available: `valyriantech/ace-step-1.5` |
| Supabase | PostgreSQL database | Use Transaction mode pooler (requires `prepare: false` in postgres driver) |
| Cloudflare R2 | Audio file storage | Zero egress fees; S3-compatible; region: "auto" |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Drizzle ORM | Prisma | Prisma has better DX but 300KB bundle hurts serverless cold starts |
| @aws-sdk/client-s3 for R2 | Cloudflare's Workers SDK | Workers SDK doesn't work in Node.js/Next.js; AWS SDK v3 is correct choice |
| Supabase direct connection | Supabase pooler | Direct connection limited to 60 connections; pooler required for serverless |

### Installation
```bash
# Next.js scaffold
npx create-next-app@latest music-generator --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"

# Database
npm install drizzle-orm postgres
npm install -D drizzle-kit

# Cloudflare R2
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner

# Utilities
npm install zod dotenv
```

---

## ACE-Step API: Confirmed Field Names and Behavior

This is the highest-priority research finding for Phase 1 because the CONTEXT.md explicitly lists these as known unknowns.

### Endpoint: POST /release_task
Submits an async job. Returns `task_id`.

```typescript
// Source: https://github.com/ace-step/ACE-Step-1.5/blob/main/docs/en/API.md
const response = await fetch(`${RUNPOD_URL}/release_task`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    prompt: "upbeat indie pop with jangly guitars, energetic vocals, warm production",  // style/caption
    lyrics: "[Verse]\nLyric line one\nLyric line two\n\n[Chorus]\nChorus line",
    audio_duration: 120,      // seconds (max 240)
    batch_size: 2,            // number of variants
    // Optional:
    bpm: 120,
    key_scale: "C major",
    time_signature: "4",      // "2", "3", "4", "6"
    seed: -1,                 // -1 for random
    use_random_seed: true,
  })
});
const { task_id } = await response.json();
```

**CONFIRMED:** The primary style field is `prompt`. The `caption` field is an alias — use `prompt`.

### Instrumental Mode: CONFIRMED
Use `[Instrumental]` tag in the `lyrics` field (do NOT leave `lyrics` empty):
```json
{
  "prompt": "cinematic orchestral score, epic, strings and brass",
  "lyrics": "[Instrumental]",
  "audio_duration": 120,
  "batch_size": 2
}
```
Source: ACE-Step-1.5 Tutorial.md — "use `[Instrumental]` for instrumental music"

### Custom Lyrics with Structure Tags: CONFIRMED
```json
{
  "prompt": "warm acoustic folk, fingerpicked guitar, intimate vocals",
  "lyrics": "[Verse 1]\nLine one of verse\nLine two of verse\n\n[Chorus]\nChorus line one\nChorus line two\n\n[Bridge]\nBridge content\n\n[Outro]",
  "audio_duration": 180,
  "batch_size": 2
}
```
Supported tags: `[Intro]`, `[Verse]`, `[Verse 1]`, `[Pre-Chorus]`, `[Chorus]`, `[Bridge]`, `[Outro]`
Tags can include performance hints: `[Chorus - anthemic]`, `[Bridge - whispered]`

### Endpoint: POST /query_result (polling)
```typescript
// Source: https://github.com/ace-step/ACE-Step-1.5/blob/main/docs/en/API.md
const result = await fetch(`${RUNPOD_URL}/query_result`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ task_id_list: [taskId] })
});
const data = await result.json();
// Status: 0 = queued/running, 1 = succeeded, 2 = failed
```

### Response Structure
```json
{
  "data": { "audio_urls": ["/v1/audio?path=..."] },
  "code": 200,
  "error": null,
  "timestamp": 1234567890
}
```

### Turbo Model Performance
- ACE-Step turbo uses 8 diffusion steps (not 50 like the SFT model)
- Turbo does NOT use CFG (Classifier-Free Guidance) — do not set `guidance_scale`
- Expected generation time: under 10 seconds on RTX 3090; under 6 seconds on RTX 4090
- For polling timeout: recommend 90 seconds (10x expected max, covers GPU cold variance)

---

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/
│   ├── api/
│   │   ├── generate/route.ts     # POST: submit job to RunPod, insert DB record
│   │   ├── status/[jobId]/       # GET: poll RunPod, update DB, return status
│   │   │   └── route.ts
│   │   └── audio/[key]/          # GET: generate presigned R2 URL for audio
│   │       └── route.ts
│   ├── layout.tsx
│   └── page.tsx                  # Placeholder for Phase 2 UI
├── db/
│   ├── index.ts                  # Drizzle client singleton
│   └── schema.ts                 # Table definitions
├── lib/
│   ├── runpod.ts                 # ACE-Step API client
│   ├── r2.ts                     # Cloudflare R2 client
│   └── errors.ts                 # Error types and categorization
└── env.ts                        # Zod env validation
drizzle/                          # Generated migration files
drizzle.config.ts                 # Drizzle kit configuration
```

### Pattern 1: Async Job Submit-Poll
**What:** Submit job to ACE-Step, return `jobId` immediately; client polls `/api/status/:jobId` every 2.5 seconds.
**When to use:** All generation requests — never hold the HTTP connection open waiting for generation.

```typescript
// src/app/api/generate/route.ts
export async function POST(request: Request) {
  const body = await request.json();

  // 1. Submit to ACE-Step
  const aceResponse = await fetch(`${process.env.RUNPOD_URL}/release_task`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt: body.prompt,
      lyrics: body.lyrics || '[Instrumental]',
      audio_duration: body.duration ?? 120,
      batch_size: 2,
    }),
  });
  const { task_id } = await aceResponse.json();

  // 2. Record in DB
  const [generation] = await db.insert(generations).values({
    runpodJobId: task_id,
    status: 'pending',
    promptText: body.prompt,
    lyrics: body.lyrics,
    duration: body.duration ?? 120,
    startedAt: new Date(),
  }).returning();

  // 3. Return job ID — client polls
  return Response.json({ jobId: generation.id, runpodJobId: task_id });
}
```

### Pattern 2: Status Polling with DB Cache
**What:** Status endpoint checks ACE-Step once per client poll, updates DB, returns current state.
**Why:** Never poll RunPod from inside a Vercel function that waits — serverless timeout risk. Instead, the client polls our API, which calls RunPod and stores results.

```typescript
// src/app/api/status/[jobId]/route.ts
export async function GET(request: Request, { params }: { params: { jobId: string } }) {
  const generation = await db.query.generations.findFirst({
    where: eq(generations.id, params.jobId),
    with: { outputs: true },
  });

  if (generation.status === 'completed' || generation.status === 'failed') {
    return Response.json(generation); // Serve from DB, no RunPod call
  }

  // Poll RunPod
  const result = await queryRunpodStatus(generation.runpodJobId);

  if (result.status === 1) { // succeeded
    // Upload audio to R2, update DB
    await handleSuccess(generation.id, result.data.audio_urls);
  } else if (result.status === 2) { // failed
    await handleFailure(generation.id, result.error);
  }

  return Response.json(await refreshGeneration(params.jobId));
}
```

### Pattern 3: Error Classification
**What:** Map ACE-Step/RunPod errors to typed categories with user-facing messages and retry signals.

```typescript
// src/lib/errors.ts
type ErrorCategory = 'model_error' | 'timeout' | 'gpu_unavailable' | 'invalid_input' | 'unknown';

interface GenerationError {
  category: ErrorCategory;
  retryable: boolean;
  userMessage: string;
  technicalMessage: string;
}

function classifyError(rawError: unknown): GenerationError {
  if (isTimeout(rawError)) return {
    category: 'timeout',
    retryable: true,
    userMessage: 'Generation timed out. The GPU may be busy — please try again.',
    technicalMessage: String(rawError),
  };
  // ... more cases
}
```

### Anti-Patterns to Avoid
- **Polling RunPod inside a Vercel function that awaits completion:** Serverless functions time out at 10s (Hobby) or 60s (Pro). Never `while (status !== done) { await poll(); }` in a route handler.
- **Storing presigned audio URLs in the DB:** URLs expire. Store only R2 object keys; generate presigned URLs on-demand per request.
- **Direct connection to Supabase from Vercel:** Use the Supabase Transaction mode pooler (port 6543) with `prepare: false` in the postgres driver. Direct connections exhaust the 60-connection limit.
- **Leaving `lyrics` empty for instrumental:** Use `[Instrumental]` tag explicitly. Empty `lyrics` behavior is unconfirmed and may produce unpredictable results.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Audio file storage and delivery | Custom file server, express static | Cloudflare R2 + presigned URLs | Egress costs, CDN, CORS complexity, expiry |
| Database migrations | Raw SQL files, manual ALTER TABLE | `drizzle-kit generate` + `drizzle-kit migrate` | Type drift, rollback safety |
| Process restart after memory leak | Shell scripts, cron jobs | supervisord in Dockerfile | Proper signal handling, max restart count, logging |
| R2 authentication/signing | Custom HMAC implementation | `@aws-sdk/s3-request-presigner` | S3 signing is non-trivial; SDK handles SigV4 |
| Environment variable validation | `if (!process.env.X) throw` scattered | Zod schema at startup | Centralized, typed, fails fast with clear message |

**Key insight:** The ACE-Step memory leak is the most dangerous custom problem to solve. Use supervisord's `autorestart=true` — rolling your own restart loop inside the Node app will miss the process crash and leave the container unresponsive.

---

## Common Pitfalls

### Pitfall 1: ACE-Step Memory Leak Kills the Pod
**What goes wrong:** After 2-3 generations, RAM fills to 30GB+ and the container becomes unresponsive. New requests hang silently.
**Why it happens:** ACE-Step 1.5 does not release RAM between generations (GitHub #142, ace-step/ACE-Step-1.5, open as of 2026-03).
**How to avoid:** Add supervisord to the Docker image with `autorestart=true` for the `acestep-api` process. When the process crashes from OOM, supervisord restarts it automatically. The RunPod pod itself stays alive.
**Warning signs:** Polling requests hang indefinitely; `/health` endpoint stops responding after multiple sequential generations.
**Supervisord config pattern:**
```ini
[supervisord]
nodaemon=true

[program:acestep]
command=uv run acestep-api
directory=/app
autorestart=true
startretries=10
stderr_logfile=/var/log/acestep.err.log
stdout_logfile=/var/log/acestep.out.log
```

### Pitfall 2: Vercel Function Timeout on Polling
**What goes wrong:** Polling RunPod directly inside a Vercel route handler that loops will hit the 10s (Hobby) or 60s (Pro) timeout, causing 504s.
**Why it happens:** ACE-Step generation takes up to 10s on fast GPUs; polling + network overhead can exceed limits.
**How to avoid:** Submit to ACE-Step and return `jobId` immediately. Client-side polling hits `/api/status/:jobId` which makes a single RunPod call and returns, staying well under timeout limits.

### Pitfall 3: Supabase Connection Pool Exhaustion
**What goes wrong:** "too many connections" errors in production even with low traffic.
**Why it happens:** Each Vercel serverless invocation opens a new DB connection. Supabase direct connections are capped at 60.
**How to avoid:** Use Supabase's Transaction mode pooler URL (port 6543, not 5432). Set `prepare: false` in the postgres driver because prepared statements are not compatible with Transaction pooling mode.

### Pitfall 4: Cloudflare R2 CORS Blocks Audio Playback
**What goes wrong:** Browser can generate presigned URL but audio element throws CORS error when fetching it.
**Why it happens:** R2 requires explicit CORS configuration per bucket. Unlike AWS S3, R2 does NOT support wildcard `AllowedHeaders: ["*"]`.
**How to avoid:** Configure R2 bucket CORS policy during setup:
```json
[{
  "AllowedOrigins": ["https://yourapp.vercel.app", "http://localhost:3000"],
  "AllowedMethods": ["GET"],
  "AllowedHeaders": ["content-type"],
  "MaxAgeSeconds": 3600
}]
```

### Pitfall 5: ACE-Step Task ID vs Generation DB ID Confusion
**What goes wrong:** Client polls with the wrong ID type; DB lookups fail; duplicate records created.
**Why it happens:** There are two ID spaces: ACE-Step's `task_id` (RunPod-internal) and our DB `generation.id` (UUID).
**How to avoid:** Return both IDs from `/api/generate`. Client always polls with DB `jobId`. The DB row stores `runpod_job_id` for internal polling. Never expose RunPod task IDs directly to clients.

### Pitfall 6: R2 Audio URL Key Structure Ambiguity
**What goes wrong:** Retrieving audio from R2 fails because key structure was ad-hoc; collisions or missing files.
**How to avoid:** Use deterministic key structure: `generations/{generationId}/output_{index}.wav`
- `generationId` is the DB UUID
- `index` is 0-based variant index (0, 1 for batch_size=2)

---

## Database Schema (Drizzle ORM)

```typescript
// src/db/schema.ts
// Source: https://orm.drizzle.team/docs/column-types/pg
import { pgTable, uuid, text, integer, boolean, timestamp, jsonb, pgEnum, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const generationStatusEnum = pgEnum('generation_status', [
  'pending',
  'processing',
  'completed',
  'failed',
]);

export const generations = pgTable('generations', {
  id: uuid('id').defaultRandom().primaryKey(),
  runpodJobId: text('runpod_job_id').notNull(),
  status: generationStatusEnum('status').notNull().default('pending'),

  // Inputs
  promptText: text('prompt_text').notNull(),
  lyrics: text('lyrics'),
  genreTags: text('genre_tags'),
  duration: integer('duration').notNull().default(120),   // seconds
  instrumental: boolean('instrumental').notNull().default(false),

  // Timing
  startedAt: timestamp('started_at', { withTimezone: true }).defaultNow().notNull(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  failedAt: timestamp('failed_at', { withTimezone: true }),

  // Error tracking
  errorType: text('error_type'),           // 'model_error' | 'timeout' | 'gpu_unavailable' | etc.
  errorMessage: text('error_message'),
  retryable: boolean('retryable'),
}, (table) => ({
  statusIdx: index('generations_status_idx').on(table.status),
  runpodJobIdx: index('generations_runpod_job_idx').on(table.runpodJobId),
}));

export const outputs = pgTable('outputs', {
  id: uuid('id').defaultRandom().primaryKey(),
  generationId: uuid('generation_id').notNull().references(() => generations.id, { onDelete: 'cascade' }),
  variantIndex: integer('variant_index').notNull(),     // 0 or 1
  r2Key: text('r2_key').notNull(),                     // e.g. "generations/abc123/output_0.wav"
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  generationIdx: index('outputs_generation_idx').on(table.generationId),
}));

export const generationsRelations = relations(generations, ({ many }) => ({
  outputs: many(outputs),
}));

export const outputsRelations = relations(outputs, ({ one }) => ({
  generation: one(generations, {
    fields: [outputs.generationId],
    references: [generations.id],
  }),
}));
```

### drizzle.config.ts
```typescript
// Source: https://orm.drizzle.team/docs/get-started/supabase-new
import { defineConfig } from 'drizzle-kit';
export default defineConfig({
  out: './drizzle',
  schema: './src/db/schema.ts',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

### Drizzle client (singleton)
```typescript
// src/db/index.ts
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// Transaction mode pooler requires prepare: false
const client = postgres(process.env.DATABASE_URL!, { prepare: false });
export const db = drizzle({ client, schema });
```

---

## RunPod Persistent Pod Configuration

### Setup Steps
1. Create account at runpod.io
2. Go to Pods > New Pod > select GPU (RTX 3090 or 4090 recommended)
3. Choose "Custom" template or use ValyrianTech pre-built template
4. Container image: `valyriantech/ace-step-1.5` (pre-built with models ~15GB)
5. Expose HTTP port: **8000**
6. Volume mount: `/workspace` (persistent storage for outputs)
7. Set environment variables (see below)

### Environment Variables for RunPod Pod
```
ACESTEP_OUTPUT_DIR=/workspace/outputs
ACESTEP_DEVICE=cuda
ACESTEP_API_PORT=8000
```

### Accessing the Pod API
RunPod exposes pods via proxy URL:
```
https://{POD_ID}-8000.proxy.runpod.net
```
Set this as `RUNPOD_URL` in Next.js `.env.local`.

### Memory Leak Workaround: supervisord
The ValyrianTech image may or may not include supervisord. If it does not, build a custom Docker image:

```dockerfile
FROM valyriantech/ace-step-1.5:latest

RUN apt-get update && apt-get install -y supervisor

COPY supervisord.conf /etc/supervisor/conf.d/acestep.conf

CMD ["/usr/bin/supervisord", "-n", "-c", "/etc/supervisor/supervisord.conf"]
```

```ini
# supervisord.conf
[supervisord]
nodaemon=true
logfile=/workspace/logs/supervisord.log

[program:acestep-api]
command=uv run acestep-api
directory=/app
autorestart=true
startretries=999
stdout_logfile=/workspace/logs/acestep.log
stderr_logfile=/workspace/logs/acestep.err.log
stopasgroup=true
killasgroup=true
```

**Verification test:** Run 5-10 sequential generations and confirm `/health` stays responsive between each one.

---

## Cloudflare R2 Configuration

### Environment Variables
```
CLOUDFLARE_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_r2_access_key
R2_SECRET_ACCESS_KEY=your_r2_secret_key
R2_BUCKET_NAME=music-generator-audio
```

### R2 Client (Next.js server-side only)
```typescript
// src/lib/r2.ts
// Source: https://developers.cloudflare.com/r2/examples/aws/aws-sdk-js-v3/
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

export async function uploadAudioToR2(key: string, buffer: Buffer): Promise<void> {
  await r2.send(new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: key,
    Body: buffer,
    ContentType: 'audio/wav',
  }));
}

export async function getAudioPresignedUrl(key: string, expiresIn = 3600): Promise<string> {
  return getSignedUrl(r2, new GetObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: key,
  }), { expiresIn });
}
```

### R2 Key Naming Convention
```
generations/{generationId}/output_{variantIndex}.wav
```
Example: `generations/d4f2a8b1-3e9c/output_0.wav`

### CORS Configuration (required for browser audio playback)
Set via Cloudflare dashboard (R2 bucket > Settings > CORS):
```json
[{
  "AllowedOrigins": ["https://yourapp.vercel.app", "http://localhost:3000"],
  "AllowedMethods": ["GET"],
  "AllowedHeaders": ["content-type"],
  "MaxAgeSeconds": 3600
}]
```
Note: R2 does NOT support wildcard `AllowedHeaders: ["*"]`. Use explicit `["content-type"]`.

---

## Environment Variables Reference

### Next.js .env.local
```
# Supabase (use Transaction mode pooler URL — port 6543, NOT 5432)
DATABASE_URL=postgresql://postgres.[project]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres

# RunPod
RUNPOD_URL=https://{POD_ID}-8000.proxy.runpod.net

# Cloudflare R2 (server-side only — no NEXT_PUBLIC_ prefix)
CLOUDFLARE_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=music-generator-audio
```

### Env Validation (Zod)
```typescript
// src/env.ts
import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  RUNPOD_URL: z.string().url(),
  CLOUDFLARE_ACCOUNT_ID: z.string().min(1),
  R2_ACCESS_KEY_ID: z.string().min(1),
  R2_SECRET_ACCESS_KEY: z.string().min(1),
  R2_BUCKET_NAME: z.string().min(1),
});

export const env = envSchema.parse(process.env);
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| ACE-Step original REST API | ACE-Step 1.5 REST API (`uv run acestep-api`) | 2025 | Endpoint paths differ; use 1.5 API docs |
| Prisma ORM for Next.js | Drizzle ORM | 2024-2025 | Cold start performance; smaller bundle |
| AWS S3 for audio | Cloudflare R2 | 2023+ | Zero egress fees; 10GB free tier |
| Pages Router API routes | App Router Route Handlers | Next.js 13+ | export async function GET/POST pattern |

**Deprecated/outdated:**
- ACE-Step original (v1) Gradio API: Use ACE-Step 1.5 REST API server instead
- `next export` static sites: Not applicable here (App Router with server functions)
- Prisma for this project: Do not substitute — Drizzle is locked decision

---

## Open Questions

1. **Does the ValyrianTech Docker image already include supervisord?**
   - What we know: The image is pre-built with models (~15GB) and ACE-Step API server
   - What's unclear: Whether any process management is included for crash recovery
   - Recommendation: Validate by running 3+ sequential generations on the stock image; if the process crashes, build a custom image extending it with supervisord

2. **Polling timeout: what is the actual 95th-percentile generation time on RunPod's RTX 3090?**
   - What we know: Under 10s on RTX 3090 for turbo (from ACE-Step docs); under 2s on A100
   - What's unclear: RunPod's GPU performance may vary; network round-trip adds overhead
   - Recommendation: During Phase 1 validation, time 10 sequential generations and set timeout at max_observed * 3 (recommend starting with 90s until measured)

3. **ACE-Step POST /release_task: does it return `task_id` or another field name?**
   - What we know: API docs show `task_id` in responses; response envelope is `{ data, code, error, timestamp }`
   - What's unclear: Whether `task_id` is top-level or inside `data`
   - Recommendation: Test against live pod and log raw response before writing production polling logic

4. **Does supervisord autorestart adequately handle OOM (SIGKILL) vs clean exits?**
   - What we know: supervisord `autorestart=true` restarts on any exit including crashes
   - What's unclear: If OOM causes SIGKILL vs clean exit — supervisord handles both, but memory may not be fully released if supervisord itself is memory-constrained
   - Recommendation: After restart, verify `/health` actually responds and a new generation completes successfully

---

## Sources

### Primary (HIGH confidence)
- [ACE-Step-1.5 API.md](https://github.com/ace-step/ACE-Step-1.5/blob/main/docs/en/API.md) — endpoint paths, field names, response structure
- [ACE-Step-1.5 Tutorial.md](https://github.com/ace-step/ACE-Step-1.5/blob/main/docs/en/Tutorial.md) — `[Instrumental]` tag, lyrics structure tags, caption field semantics
- [Drizzle ORM PostgreSQL column types](https://orm.drizzle.team/docs/column-types/pg) — uuid, timestamp, pgEnum, jsonb patterns
- [Drizzle ORM Supabase setup](https://orm.drizzle.team/docs/get-started/supabase-new) — connection pattern, Transaction mode pooler, migration commands
- [Cloudflare R2 AWS SDK v3 docs](https://developers.cloudflare.com/r2/examples/aws/aws-sdk-js-v3/) — S3Client config, region "auto", credentials, presigned URLs

### Secondary (MEDIUM confidence)
- [ValyrianTech ace-step-1.5 GitHub](https://github.com/ValyrianTech/ace-step-1.5/) — RunPod pre-built image, port 8000, env vars, proxy URL format
- [ACE-Step-1.5 memory leak issue #142](https://github.com/ace-step/ACE-Step-1.5/issues/142) — crash after 2-3 generations, ~12GB RAM per generation
- [Cloudflare R2 CORS docs](https://developers.cloudflare.com/r2/buckets/cors/) — AllowedHeaders wildcard limitation, correct CORS setup
- [RunPod pod management docs](https://docs.runpod.io/pods/manage-pods) — pod lifecycle, stop/start, volume persistence

### Tertiary (LOW confidence — flag for validation)
- supervisord as restart mechanism for ACE-Step: Based on Docker best practices (docs.docker.com/config/containers/multi-service_container/) + community pattern. Not officially documented by ACE-Step or RunPod. **Must validate in Phase 1.**
- Polling timeout recommendation of 90 seconds: Based on stated <10s RTX 3090 performance + 9x safety buffer. **Must measure actual times during Phase 1 validation.**
- R2 key naming convention `generations/{id}/output_{n}.wav`: Claude's discretion. No official R2 naming requirements.

---

## Metadata

**Confidence breakdown:**
- ACE-Step API field names: HIGH — verified against official API.md and Tutorial.md
- ACE-Step memory leak behavior: HIGH — confirmed open GitHub issue with reproduction data
- Memory leak mitigation (supervisord): LOW — pattern is sound but unverified against ACE-Step specifically
- RunPod pod setup: MEDIUM — official docs confirm pod/template pattern; proxy URL format from ValyrianTech README
- Drizzle ORM schema patterns: HIGH — verified against official docs
- Cloudflare R2 integration: HIGH — official Cloudflare docs for AWS SDK v3 pattern
- Polling timeout value (90s): LOW — educated estimate pending validation benchmarks
- Vercel function timeout constraints: HIGH — official Vercel docs (10s Hobby, 60s Pro)

**Research date:** 2026-03-03
**Valid until:** 2026-04-03 (30 days — ACE-Step is active development, check for memory leak fix)
