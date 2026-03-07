# Phase 29: Database Schema + Song Persistence - Research

**Researched:** 2026-03-07
**Domain:** Drizzle ORM schema, Supabase RLS, HTTP-only cookies, session claim pattern
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Schema design:**
- Create a new `songs` table purpose-built for the gift funnel — do NOT extend old `generations`/`outputs` tables
- Key quiz fields as individual columns: `recipient_name`, `relationship`, `genre` (useful for dashboard display/filtering)
- Remaining quiz data in a `quiz_data` JSONB column (occasion, qualities, memories, message, voice_gender)
- Remove old `generations` and `outputs` tables from schema.ts — they were never migrated to the database
- R2 object keys stored on the song row (not presigned URLs) — presign at read time

**RLS policies:**
- Anonymous songs (session_token only, no user_id) are locked via RLS until claimed — invisible to all users
- Authenticated users can only read/modify their own songs (user_id match)
- The success page continues using HeartBula proxy for playback (no RLS needed for the pre-claim flow)

**Song finalization flow:**
- Insert song row at generation start in `quiz-generate` route with status='generating' — allows tracking failed/abandoned generations
- Finalize in `poll-job` route on first COMPLETED detection: download WAV → convert to MP3 → upload both to R2 → update song row with R2 keys and status='completed'
- Store both WAV and MP3 in R2 (WAV for archival quality, MP3 for playback/download)
- Audio proxy route (`/api/audio/[jobId]`) serves from R2 presigned URL first, falls back to HeartBula proxy if R2 keys don't exist yet

**Anonymous session tokens:**
- HTTP-only cookie set by `quiz-generate` route on generation start
- UUID v4 format, 30-day expiry
- Only set for anonymous users — authenticated users get `user_id` directly on the song row (no session_token)

**Claim mechanism:**
- Claim happens during the `signup()` server action — atomic, songs are claimed before user sees dashboard
- Direct Drizzle query (bypasses RLS, matches existing DB access pattern): `UPDATE songs SET user_id = ?, session_token = NULL WHERE session_token = ? AND user_id IS NULL`
- Claims ALL matching songs for that session_token (not just most recent)
- Clear session_token on claim (set to null) — claimed songs associated by user_id only

### Claude's Discretion

No specific requirements — open to standard approaches

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SONG-01 | Songs table exists in Supabase with RLS policies (user can only access own songs) | Schema design with pgPolicy, drizzle-kit push workflow, RLS on `songs` table |
| SONG-02 | Generated songs are saved to database with user_id (if authenticated) or session_token (if anonymous) | Insert in quiz-generate route, Supabase auth user detection, HTTP-only cookie pattern |
| SONG-03 | Quiz context stored on song record (recipient name, relationship, message, genre) | Column design for QuizData fields, JSONB for overflow fields |
| SONG-04 | Anonymous songs are claimed by user account on sign-up via session_token match | Direct Drizzle update in signup() action, RLS bypass via postgres role, cookie read in server action |
</phase_requirements>

## Summary

Phase 29 wires the database persistence layer that has been absent since the v3.0 quiz funnel shipped. Every HeartBula generation will now produce a `songs` row in Supabase — inserted optimistically at job submission with `status='generating'`, then finalized to `status='completed'` with R2 keys when the poll-job route detects COMPLETED. Anonymous users get an HTTP-only `session_token` cookie that links their song to them across page reloads; when they sign up, the `signup()` server action performs a single UPDATE that claims all matching songs.

The primary technical challenge is the two-database-role problem: the existing `db` export uses `DATABASE_URL` which connects as the `postgres` role and bypasses Supabase RLS entirely. This is **intentional and correct** for server-side API routes (trusted code paths). RLS policies on the `songs` table protect against direct Supabase JS client access from the browser — the server never queries through the browser client. The claim operation in `signup()` also deliberately bypasses RLS, which is appropriate because the server action is the trusted claim authority.

The schema migration is unusual: the `./drizzle/` directory does not yet exist and the old `generations`/`outputs` tables were defined in schema.ts but never applied to the database. The clean path is `drizzle-kit push` — it compares the new schema against the empty (or zero-matching-tables) database state and applies CREATE TABLE + RLS policy SQL directly. The old table definitions should be removed from `schema.ts` before pushing.

**Primary recommendation:** Use `drizzle-kit push --verbose` for the initial migration, define all RLS policies inline using Drizzle's `pgPolicy` + `authenticatedRole`/`anonRole` imports from `drizzle-orm/supabase`, and insert the `songs` row from the `quiz-generate` route using the existing `db` export (postgres role — server-side trusted path).

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| drizzle-orm | ^0.45.1 (installed) | TypeScript ORM, schema declaration, query building | Already in use; `pgPolicy` + `pgEnum` support in current version |
| drizzle-kit | ^0.31.9 (installed) | Schema migration CLI | Already in use; `push` command applies schema to Supabase |
| postgres | ^3.4.8 (installed) | PostgreSQL driver | Already powering `db` export with `prepare: false` for Supabase pooler |
| @supabase/ssr | ^0.9.0 (installed) | Server-side Supabase client for auth detection | Phase 28 infrastructure; `createClient()` gives `getUser()` in route handlers |
| crypto (Node built-in) | N/A | UUID v4 generation for session tokens | `crypto.randomUUID()` — no extra package needed |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| drizzle-orm/supabase | (sub-module) | `authenticatedRole`, `anonRole`, `authUid` helpers for RLS policies | Inline in schema.ts next to `pgPolicy` definitions |
| drizzle-orm/pg-core | (sub-module) | `pgTable`, `pgEnum`, `pgPolicy`, `jsonb`, `uuid`, `text`, `timestamp`, `index` | Schema column declarations |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| drizzle-kit push | generate + migrate | generate produces reviewable SQL files but adds `./drizzle/` git noise; push is faster for this first-time schema with no existing tables |
| crypto.randomUUID() | `uuid` npm package | crypto is built into Node 15+; no extra dependency needed |
| HTTP-only cookie for session_token | localStorage | localStorage is readable by JS and not sent on server requests; HTTP-only cookie is read by the `quiz-generate` route on generation start and `signup()` server action on claim |

**Installation:** No new packages needed. All required libraries are already installed.

## Architecture Patterns

### Recommended Project Structure

```
src/db/
├── schema.ts          # NEW: songs table + pgEnum + pgPolicy + remove generations/outputs
└── index.ts           # UNCHANGED: db export (postgres role, prepare: false)

src/app/
├── api/
│   ├── quiz-generate/
│   │   └── route.ts   # MODIFIED: insert songs row + set session_token cookie
│   ├── poll-job/[jobId]/
│   │   └── route.ts   # MODIFIED: finalization pipeline on COMPLETED
│   └── audio/[jobId]/
│       └── route.ts   # MODIFIED: R2 presigned URL first, HeartBula fallback
└── signup/
    └── actions.ts     # MODIFIED: claim songs after successful signUp
```

### Pattern 1: Songs Table with Inline RLS Policies (Drizzle)

**What:** Define the `songs` table with `pgPolicy` entries inline — Drizzle emits the CREATE TABLE + ALTER TABLE ENABLE ROW LEVEL SECURITY + CREATE POLICY SQL automatically during `drizzle-kit push`.

**When to use:** Any table that needs row-level security on Supabase.

**Example:**

```typescript
// src/db/schema.ts
// Source: https://orm.drizzle.team/docs/rls

import {
  pgTable, pgEnum, pgPolicy,
  uuid, text, timestamp, jsonb, index,
} from 'drizzle-orm/pg-core';
import { authenticatedRole, anonRole } from 'drizzle-orm/supabase';
import { sql } from 'drizzle-orm';

export const songStatusEnum = pgEnum('song_status', [
  'generating',
  'completed',
  'failed',
]);

export const songs = pgTable(
  'songs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    // Auth linkage — one of these is non-null
    userId: uuid('user_id'),           // Supabase auth.users id; null for anonymous
    sessionToken: text('session_token'), // anonymous session cookie; null after claim

    // Status tracking
    status: songStatusEnum('status').notNull().default('generating'),
    heartbulaJobId: text('heartbula_job_id').notNull(),

    // Quiz fields (top-level for dashboard display/filtering)
    recipientName: text('recipient_name').notNull(),
    relationship: text('relationship').notNull(),
    genre: text('genre').notNull(),

    // Remaining quiz context
    quizData: jsonb('quiz_data').notNull().$type<{
      occasion?: string;
      qualities?: string;
      memories?: string;
      message?: string;
      voiceGender?: string;
    }>(),

    // R2 audio storage
    r2WavKey: text('r2_wav_key'),   // null until finalized
    r2Mp3Key: text('r2_mp3_key'),   // null until finalized

    // Timing
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    failedAt: timestamp('failed_at', { withTimezone: true }),
  },
  (t) => [
    // ── RLS: Authenticated users see only their own songs ──────────────────
    pgPolicy('songs-authenticated-select', {
      for: 'select',
      to: authenticatedRole,
      using: sql`user_id = auth.uid()`,
    }),
    pgPolicy('songs-authenticated-update', {
      for: 'update',
      to: authenticatedRole,
      using: sql`user_id = auth.uid()`,
      withCheck: sql`user_id = auth.uid()`,
    }),
    pgPolicy('songs-authenticated-delete', {
      for: 'delete',
      to: authenticatedRole,
      using: sql`user_id = auth.uid()`,
    }),
    // ── RLS: anon role cannot read or write songs (all INSERT/UPDATE done
    //    by trusted server code via postgres role, which bypasses RLS) ──────
    pgPolicy('songs-anon-deny-all', {
      for: 'all',
      to: anonRole,
      using: sql`false`,
    }),
    // ── Indexes ─────────────────────────────────────────────────────────────
    index('songs_user_id_idx').on(t.userId),
    index('songs_session_token_idx').on(t.sessionToken),
    index('songs_status_idx').on(t.status),
  ],
).enableRLS();
```

**Note on `enableRLS()`:** When `pgPolicy` is defined, RLS is enabled automatically. The explicit `.enableRLS()` call is a belt-and-suspenders addition and is harmless — it does not create duplicate SQL. Confirmed in Drizzle docs.

### Pattern 2: Insert at Generation Start (quiz-generate route)

**What:** Detect auth state, generate session_token if anonymous, insert `songs` row with `status='generating'`, set HTTP-only cookie.

**When to use:** At the top of `POST /api/quiz-generate` before calling HeartBula.

**Example:**

```typescript
// src/app/api/quiz-generate/route.ts (additions)
import { createClient } from '@/lib/supabase/server';
import { db } from '@/db';
import { songs } from '@/db/schema';
import { cookies } from 'next/headers';

// Inside POST handler, after validation, before quizToPrompt:

const supabase = await createClient();
const { data: { user } } = await supabase.auth.getUser();

// Determine auth identity
const userId = user?.id ?? null;
let sessionToken: string | null = null;

if (!userId) {
  // Check for existing session cookie (repeat visitor)
  const cookieStore = await cookies();
  const existing = cookieStore.get('notevra_session')?.value;
  sessionToken = existing ?? crypto.randomUUID();
}

// Insert song row immediately (status='generating')
const [song] = await db
  .insert(songs)
  .values({
    userId,
    sessionToken,
    status: 'generating',
    heartbulaJobId: '',           // filled in after submitGenerationJob
    recipientName: validation.data.recipientName,
    relationship: validation.data.relationshipType,
    genre: validation.data.genre,
    quizData: {
      qualities: validation.data.qualities,
      memories: validation.data.memories,
      message: validation.data.message,
      voiceGender: validation.data.voicePreference,
    },
  })
  .returning({ id: songs.id });

// Submit to HeartBula
const result = await submitGenerationJob(params);

// Back-fill heartbulaJobId now that we have it
await db
  .update(songs)
  .set({ heartbulaJobId: result.job_id })
  .where(eq(songs.id, song.id));

// Build response — set session cookie if anonymous
const response = NextResponse.json({ jobId: result.job_id }, { status: 201 });

if (sessionToken && !userId) {
  response.cookies.set('notevra_session', sessionToken, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 days
    secure: process.env.NODE_ENV === 'production',
  });
}

return response;
```

**Important:** `response.cookies.set()` is used (not `(await cookies()).set()`) because in a Route Handler setting cookies via `NextResponse` is the correct pattern — the `cookies()` write API throws in Route Handlers.

### Pattern 3: Finalization Pipeline (poll-job route)

**What:** On first COMPLETED detection, download WAV → convert to MP3 → upload both to R2 → update song row. Use the song's `heartbulaJobId` to look up the song row.

**When to use:** Inside `poll-job` route, after `queryJobStatus` returns `status === 'COMPLETED'`, guarded against double-execution by checking `r2WavKey IS NULL`.

**Example:**

```typescript
// src/app/api/poll-job/[jobId]/route.ts (additions)
import { db } from '@/db';
import { songs } from '@/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { fetchAudioBuffer } from '@/lib/heartmula';
import { convertToMp3 } from '@/lib/audio';
import { uploadAudioToR2, buildR2Key, buildR2Mp3Key } from '@/lib/r2';

// After status === 'COMPLETED':

// Look up the song row — guard against double-finalization
const [song] = await db
  .select({ id: songs.id, r2WavKey: songs.r2WavKey })
  .from(songs)
  .where(and(eq(songs.heartbulaJobId, jobId), isNull(songs.r2WavKey)))
  .limit(1);

if (song) {
  // Download from HeartBula
  const wavBuffer = await fetchAudioBuffer(jobId);

  // Convert to MP3
  const mp3Buffer = await convertToMp3(wavBuffer);

  // Upload both formats to R2
  const wavKey = buildR2Key(song.id, 0);
  const mp3Key = buildR2Mp3Key(song.id, 0);
  await Promise.all([
    uploadAudioToR2(wavKey, wavBuffer, 'audio/wav'),
    uploadAudioToR2(mp3Key, mp3Buffer, 'audio/mpeg'),
  ]);

  // Finalize the song row
  await db
    .update(songs)
    .set({
      status: 'completed',
      r2WavKey: wavKey,
      r2Mp3Key: mp3Key,
      completedAt: new Date(),
    })
    .where(eq(songs.id, song.id));
}
```

### Pattern 4: Audio Proxy with R2 Fallback (audio route)

**What:** Try to serve from R2 presigned URL (redirect), fall back to HeartBula proxy if R2 keys aren't populated yet.

**When to use:** `GET /api/audio/[jobId]` route — `jobId` here is the HeartBula job ID.

**Example:**

```typescript
// src/app/api/audio/[jobId]/route.ts
import { db } from '@/db';
import { songs } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getAudioPresignedUrl } from '@/lib/r2';

// Look up song by heartbulaJobId
const [song] = await db
  .select({ r2Mp3Key: songs.r2Mp3Key })
  .from(songs)
  .where(eq(songs.heartbulaJobId, jobId))
  .limit(1);

if (song?.r2Mp3Key) {
  // Song is finalized — serve from R2 via presigned URL redirect
  const url = await getAudioPresignedUrl(song.r2Mp3Key, 3600);
  return NextResponse.redirect(url);
}

// R2 keys not populated yet — fall back to HeartBula proxy
// (existing code path)
const buffer = await fetchAudioBuffer(jobId);
return new NextResponse(new Uint8Array(buffer), {
  headers: {
    'Content-Type': 'audio/mpeg',
    'Cache-Control': 'public, max-age=3600',
  },
});
```

### Pattern 5: Song Claim on Sign-Up

**What:** Read `notevra_session` cookie in `signup()` server action; after successful Supabase sign-up, run an UPDATE that claims all matching anonymous songs.

**When to use:** In `src/app/signup/actions.ts` after `supabase.auth.signUp()` succeeds.

**Example:**

```typescript
// src/app/signup/actions.ts (additions)
import { db } from '@/db';
import { songs } from '@/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { cookies } from 'next/headers';

// After successful signUp, before redirect:
const { data: { user } } = await supabase.auth.getUser();

if (user) {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('notevra_session')?.value;

  if (sessionToken) {
    // Claim all anonymous songs for this session
    await db
      .update(songs)
      .set({ userId: user.id, sessionToken: null })
      .where(and(
        eq(songs.sessionToken, sessionToken),
        isNull(songs.userId),
      ));
  }
}
```

**Why this bypasses RLS safely:** `db` uses the `postgres` role via `DATABASE_URL`. This is a trusted server action — no browser client is involved. The claim is authorized by the just-confirmed auth sign-up and the HTTP-only session cookie that the browser cannot forge.

### Pattern 6: drizzle-kit push for First-Time Schema

**What:** Since `./drizzle/` does not exist and the old tables were never applied, use `drizzle-kit push` to apply the new schema directly to Supabase.

**Command sequence:**

```bash
# 1. Remove old tables from schema.ts (generations, outputs, their relations, generationStatusEnum)
# 2. Add songs table + songStatusEnum + pgPolicy

# 3. Push — verbose shows generated SQL before applying
npx drizzle-kit push --verbose

# 4. Verify in Supabase dashboard: songs table exists, RLS is ON, policies visible
```

**What happens on push with removed tables:** drizzle-kit compares the schema against the live database. Since `generations` and `outputs` never existed in the database (only in schema.ts), removing them causes no `DROP TABLE`. It simply won't try to create them. This is safe.

### Anti-Patterns to Avoid

- **Setting `heartbulaJobId` before insert:** The job ID isn't known until after `submitGenerationJob()` — insert first with empty string, then update. Alternatively, generate a local UUID as the song ID and use `songs.id` as the R2 key prefix (independent of job ID).
- **Using `(await cookies()).set()` in Route Handlers to set response cookies:** In Next.js App Router Route Handlers, use `response.cookies.set()` on the `NextResponse` object — the `cookies()` write API only works in Server Actions and Server Components.
- **Querying songs table with Supabase JS client from server actions:** Use `db` (Drizzle + postgres role) for all server-side mutations. Never use `supabase.from('songs')` in server actions — the anon key client is subject to RLS and would fail inserts/updates.
- **Reading session_token cookie client-side:** The cookie is HTTP-only — intentionally unreadable by JavaScript. Cookie reading always happens server-side.
- **Double-finalization in poll-job:** The `isNull(songs.r2WavKey)` guard in the finalization path prevents re-uploading if the same COMPLETED poll fires twice.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| SQL migration generation | Manual CREATE TABLE SQL | `drizzle-kit push` | drizzle-kit generates RLS policy SQL, enum creation, indexes — complex to hand-write correctly |
| UUID generation | Custom random ID | `crypto.randomUUID()` (Node built-in) | Standards-compliant UUID v4; no extra package |
| RLS policy definitions | Raw SQL in Supabase dashboard | `pgPolicy` in schema.ts | Keeps policy definitions version-controlled alongside table definition |
| WAV→MP3 conversion | Shell exec of system ffmpeg | `convertToMp3()` in `src/lib/audio.ts` | Already built, uses ffmpeg-static; handles both WAV and MP3 input |
| R2 upload/presign | Direct S3 SDK calls | `uploadAudioToR2()`, `getAudioPresignedUrl()` in `src/lib/r2.ts` | Already built and tested |
| HeartBula audio download | Direct fetch | `fetchAudioBuffer()` in `src/lib/heartmula.ts` | Already built with timeout handling |

**Key insight:** This phase primarily wires together already-built utilities. The highest-complexity new work is the schema definition with RLS policies and the finalization pipeline in poll-job.

## Common Pitfalls

### Pitfall 1: heartbulaJobId Not Known at Insert Time
**What goes wrong:** `submitGenerationJob()` is called after the songs row is inserted. The job ID returned by HeartBula cannot be stored in the row at insert time.
**Why it happens:** The flow is: insert row (with empty heartbulaJobId) → submit to HeartBula → get job_id back → update row.
**How to avoid:** Insert with `heartbulaJobId: ''` (empty string), then immediately update with `SET heartbula_job_id = ?` after receiving the job ID. Alternatively use `songs.id` (UUID generated at insert) as the R2 key prefix instead of the HeartBula job ID — then the R2 keys can be pre-computed before submission.
**Warning signs:** Foreign key constraint failures, or lookup by `heartbulaJobId` returning nothing in the audio/poll-job routes.

### Pitfall 2: RLS Blocks Drizzle DB Queries (Unexpected)
**What goes wrong:** Server-side inserts/updates fail with Postgres RLS errors.
**Why it happens:** Only occurs if someone accidentally switches `DATABASE_URL` to use a restricted role (e.g., `anon` key instead of `postgres` connection string), or if code uses `supabase.from('songs')` with the anon key client for mutations.
**How to avoid:** All server-side mutations use `db` (Drizzle + `DATABASE_URL`). The `DATABASE_URL` must use the Supabase `postgres` connection string (port 5432 direct connection or transaction pooler), never the PostgREST REST API URL. Verify: `DATABASE_URL` in `.env.local` starts with `postgresql://postgres.` or `postgresql://postgres:`.
**Warning signs:** 403 or "new row violates row-level security policy" errors in API route logs.

### Pitfall 3: Cookie Not Set on Concurrent Requests
**What goes wrong:** Two rapid quiz submissions (edge case) could each generate a different `session_token` cookie, with the second overwriting the first.
**Why it happens:** The `quiz-generate` route reads the existing cookie before deciding whether to generate a new UUID.
**How to avoid:** Read the existing `notevra_session` cookie first; only generate a new UUID if no cookie is present. The current pattern in the code example handles this: `const existing = cookieStore.get('notevra_session')?.value; sessionToken = existing ?? crypto.randomUUID();`.
**Warning signs:** Anonymous user has two songs with different session_tokens, only one survives claim.

### Pitfall 4: drizzle-kit Push Fails on Old Schema Artifacts
**What goes wrong:** If `generations` or `outputs` tables somehow exist in the Supabase database, `drizzle-kit push` will attempt to DROP them (since they're no longer in schema.ts). Pushing with `--force` would execute the drop.
**Why it happens:** The CONTEXT.md says these tables were never migrated, but it's worth verifying with `SELECT * FROM information_schema.tables WHERE table_schema='public'` before pushing.
**How to avoid:** Run the SQL check first. If the tables exist (unexpected), remove them manually via Supabase SQL editor before pushing.
**Warning signs:** drizzle-kit push output shows `DROP TABLE generations` or `DROP TABLE outputs`.

### Pitfall 5: `response.cookies.set()` vs `(await cookies()).set()` in Route Handler
**What goes wrong:** Session cookie is not set in the browser response.
**Why it happens:** In Next.js App Router Route Handlers, `(await cookies()).set()` from `next/headers` throws at runtime — you can only write cookies on `NextResponse` objects.
**How to avoid:** Always use `response.cookies.set(...)` in Route Handlers. Use `(await cookies()).set()` only in Server Actions.
**Warning signs:** `cookies()` write call throws "cookies can only be modified in a Server Action or Route Handler" — confusingly, some versions of Next.js throw this even in a Route Handler if using the wrong API.

### Pitfall 6: Poll-Job Finalization Fires Multiple Times
**What goes wrong:** R2 upload + Drizzle update runs on every COMPLETED poll response instead of only once.
**Why it happens:** The success page polls until it gets COMPLETED — if the finalization is triggered on every poll hit, it re-uploads on each poll.
**How to avoid:** Guard with `isNull(songs.r2WavKey)` in the WHERE clause of the lookup query. If the song row already has `r2WavKey` set, skip finalization entirely.
**Warning signs:** R2 upload metrics show 5+ uploads for the same song ID.

## Code Examples

Verified patterns from official sources:

### Drizzle pgPolicy with Supabase auth helpers

```typescript
// Source: https://orm.drizzle.team/docs/rls
import { pgPolicy } from 'drizzle-orm/pg-core';
import { authenticatedRole, anonRole } from 'drizzle-orm/supabase';
import { sql } from 'drizzle-orm';

// In pgTable third argument (table factory function):
pgPolicy('songs-authenticated-select', {
  for: 'select',
  to: authenticatedRole,
  using: sql`user_id = auth.uid()`,
}),
pgPolicy('songs-anon-deny-all', {
  for: 'all',
  to: anonRole,
  using: sql`false`,
}),
```

### Drizzle insert with .returning()

```typescript
// Source: https://orm.drizzle.team/docs/tutorials/drizzle-with-supabase
const [row] = await db
  .insert(songs)
  .values({ ... })
  .returning({ id: songs.id });
// row.id is the UUID of the inserted row
```

### Drizzle update with eq + isNull guard

```typescript
// Source: drizzle-orm/pg-core standard pattern
import { eq, and, isNull } from 'drizzle-orm';

await db
  .update(songs)
  .set({ userId: user.id, sessionToken: null })
  .where(and(eq(songs.sessionToken, sessionToken), isNull(songs.userId)));
```

### NextResponse cookie set (Route Handler pattern)

```typescript
// Source: https://nextjs.org/docs/app/api-reference/functions/cookies
// In a Route Handler — use response.cookies.set(), NOT (await cookies()).set()
const response = NextResponse.json({ jobId }, { status: 201 });
response.cookies.set('notevra_session', sessionToken, {
  httpOnly: true,
  sameSite: 'lax',
  path: '/',
  maxAge: 60 * 60 * 24 * 30,
  secure: process.env.NODE_ENV === 'production',
});
return response;
```

### Read cookie in Server Action

```typescript
// Source: https://nextjs.org/docs/app/api-reference/functions/cookies
// In a Server Action — (await cookies()).get() works correctly
import { cookies } from 'next/headers';
const cookieStore = await cookies();
const sessionToken = cookieStore.get('notevra_session')?.value;
```

### drizzle-kit push (first time)

```bash
# Source: https://orm.drizzle.team/docs/drizzle-kit-push
npx drizzle-kit push --verbose
# Outputs generated SQL for review before applying
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `.enableRLS()` method | `pgPolicy` auto-enables RLS; `.enableRLS()` still available as explicit opt-in | drizzle-orm v0.36+ | Use `pgPolicy` in third arg; no separate `.enableRLS()` call required |
| `drizzle-orm/pg-core` for all RLS | `drizzle-orm/supabase` for auth helpers | drizzle-orm v0.36+ | Import `authenticatedRole`, `anonRole`, `authUid` from `drizzle-orm/supabase` |
| Direct Supabase SQL editor for RLS | `pgPolicy` inline in schema.ts | 2024 | Policies are version-controlled alongside schema |

**Deprecated/outdated:**
- `generationStatusEnum`, `generations`, `outputs` in `schema.ts`: Entire old schema will be replaced. These table definitions exist only in TypeScript and have never been applied to the database — safe to delete from schema.ts with no migration needed.

## Open Questions

1. **Two-step heartbulaJobId insert**
   - What we know: The song row needs to be inserted before HeartBula submission (to track abandoned generations), but `heartbula_job_id` isn't available until after.
   - What's unclear: Whether an empty-string placeholder or a nullable column is cleaner. An alternative: generate the song `id` (UUID) locally before insert, use `song.id` as the R2 key prefix independent of HeartBula job ID, and the polling routes look up by HeartBula job ID separately.
   - Recommendation: Keep `heartbula_job_id` as `text('heartbula_job_id').notNull()` with an empty string placeholder updated immediately after submit. The lookup in poll-job and audio routes by job ID is the cleanest API surface.

2. **R2 key naming: songs/{id} vs generations/{id}**
   - What we know: Existing `buildR2Key()` uses `generations/{generationId}/output_0.wav` format. The songs table uses `songs.id` as the identifier.
   - What's unclear: Whether to update `buildR2Key()` to support a `songs/` prefix or add new key-building functions.
   - Recommendation: Add `buildSongR2WavKey(songId: string)` and `buildSongR2Mp3Key(songId: string)` helpers to `r2.ts` with format `songs/{songId}/audio.wav` and `songs/{songId}/audio.mp3`. Keep the old `buildR2Key()` for backward compatibility (no existing R2 objects to migrate).

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest ^4.0.18 |
| Config file | `vitest.config.ts` |
| Quick run command | `npm run test:unit -- --reporter=verbose` |
| Full suite command | `npm run test:unit` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SONG-01 | RLS policies exist in schema.ts (pgPolicy definitions) | unit (schema export check) | `npm run test:unit -- src/db/schema.test.ts` | Wave 0 |
| SONG-01 | drizzle-kit push applies schema without errors | manual (one-time) | `npx drizzle-kit push --verbose` | N/A |
| SONG-02 | quiz-generate inserts songs row on valid quiz submission | unit | `npm run test:unit -- src/app/api/quiz-generate/route.test.ts` | Exists (needs expansion) |
| SONG-02 | quiz-generate sets session_token cookie for anonymous user | unit | `npm run test:unit -- src/app/api/quiz-generate/route.test.ts` | Exists (needs expansion) |
| SONG-02 | poll-job finalizes song row on COMPLETED status | unit | `npm run test:unit -- src/app/api/poll-job/[jobId]/route.test.ts` | Exists (needs expansion) |
| SONG-03 | Song row has quiz context columns after insert | unit | `npm run test:unit -- src/db/schema.test.ts` | Wave 0 |
| SONG-04 | signup() claims matching anonymous songs and clears session_token | unit | `npm run test:unit -- src/app/signup/actions.test.ts` | Exists (stubs only — needs real tests) |
| SONG-04 | signup() with no session cookie does not crash | unit | `npm run test:unit -- src/app/signup/actions.test.ts` | Exists (stubs only) |

### Sampling Rate
- **Per task commit:** `npm run test:unit -- --reporter=dot`
- **Per wave merge:** `npm run test:unit`
- **Phase gate:** Full unit suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/db/schema.test.ts` — verifies songs table exports, enum values, pgPolicy names (SONG-01, SONG-03)
- [ ] `src/db/__mocks__/index.ts` — shared mock for `db` export used by quiz-generate, poll-job, and signup tests

*(Existing test files for quiz-generate/route.test.ts, poll-job/route.test.ts, and signup/actions.test.ts exist but need expansion for the new DB behavior)*

## Sources

### Primary (HIGH confidence)
- https://orm.drizzle.team/docs/rls — pgPolicy, authenticatedRole, anonRole, authUid, RLS enablement patterns
- https://orm.drizzle.team/docs/drizzle-kit-push — push command behavior, first-time schema, --verbose flag
- https://orm.drizzle.team/docs/tutorials/drizzle-with-supabase — insert/update patterns, migration workflow
- https://nextjs.org/docs/app/api-reference/functions/cookies — Route Handler cookie API (response.cookies.set vs next/headers cookies)

### Secondary (MEDIUM confidence)
- https://github.com/rphlmr/drizzle-supabase-rls — dual client pattern (postgres role bypasses RLS); confirms `DATABASE_URL` postgres role behavior
- https://supabase.com/docs/guides/database/postgres/row-level-security — confirmed postgres role bypasses RLS by design
- https://orm.drizzle.team/docs/get-started/supabase-new — drizzle-kit push for new Supabase project

### Tertiary (LOW confidence)
- None — all critical claims verified with official sources

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already installed, versions confirmed in package.json
- Schema patterns: HIGH — verified against Drizzle RLS docs
- Migration workflow: HIGH — drizzle-kit push docs confirm first-time behavior
- Cookie handling: HIGH — Next.js official docs confirm response.cookies.set() pattern
- Pitfalls: MEDIUM — heartbulaJobId insert-order issue is reasoned from code inspection; cookie concurrent-write is edge case analysis

**Research date:** 2026-03-07
**Valid until:** 2026-04-07 (Drizzle and Next.js move fast; re-verify if version bumps occur)
