# Phase 29: Database Schema + Song Persistence - Context

**Gathered:** 2026-03-07
**Status:** Ready for planning

<domain>
## Phase Boundary

Every generated song is saved to the database with its quiz context. Authenticated users are linked by user_id, anonymous users by session_token. Anonymous songs can be claimed when the user signs up. RLS policies prevent cross-user access. Old `generations`/`outputs` tables are removed.

</domain>

<decisions>
## Implementation Decisions

### Schema design
- Create a new `songs` table purpose-built for the gift funnel — do NOT extend old `generations`/`outputs` tables
- Key quiz fields as individual columns: `recipient_name`, `relationship`, `genre` (useful for dashboard display/filtering)
- Remaining quiz data in a `quiz_data` JSONB column (occasion, qualities, memories, message, voice_gender)
- Remove old `generations` and `outputs` tables from schema.ts — they were never migrated to the database
- R2 object keys stored on the song row (not presigned URLs) — presign at read time

### RLS policies
- Anonymous songs (session_token only, no user_id) are locked via RLS until claimed — invisible to all users
- Authenticated users can only read/modify their own songs (user_id match)
- The success page continues using HeartBula proxy for playback (no RLS needed for the pre-claim flow)

### Song finalization flow
- Insert song row at generation start in `quiz-generate` route with status='generating' — allows tracking failed/abandoned generations
- Finalize in `poll-job` route on first COMPLETED detection: download WAV → convert to MP3 → upload both to R2 → update song row with R2 keys and status='completed'
- Store both WAV and MP3 in R2 (WAV for archival quality, MP3 for playback/download)
- Audio proxy route (`/api/audio/[jobId]`) serves from R2 presigned URL first, falls back to HeartBula proxy if R2 keys don't exist yet

### Anonymous session tokens
- HTTP-only cookie set by `quiz-generate` route on generation start
- UUID v4 format, 30-day expiry
- Only set for anonymous users — authenticated users get `user_id` directly on the song row (no session_token)

### Claim mechanism
- Claim happens during the `signup()` server action — atomic, songs are claimed before user sees dashboard
- Direct Drizzle query (bypasses RLS, matches existing DB access pattern): `UPDATE songs SET user_id = ?, session_token = NULL WHERE session_token = ? AND user_id IS NULL`
- Claims ALL matching songs for that session_token (not just most recent)
- Clear session_token on claim (set to null) — claimed songs associated by user_id only

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `r2.ts`: `uploadAudioToR2()`, `getAudioPresignedUrl()`, `buildR2Key()`, `buildR2Mp3Key()` — fully built, ready to wire in
- `audio.ts`: `convertToMp3()` (ffmpeg-static), `detectAudioFormat()` — built but not wired
- `heartmula.ts`: `fetchAudioBuffer(jobId)` — downloads WAV from HeartBula server
- Supabase client factories: `server.ts`, `client.ts`, `middleware.ts` — Phase 28 infrastructure
- Drizzle `db` export in `src/db/index.ts` — postgres driver with `prepare: false` for Supabase pooler

### Established Patterns
- Drizzle ORM for DB access (schema in `src/db/schema.ts`, config in `drizzle.config.ts`)
- No migrations have ever been generated/applied — `./drizzle/` directory doesn't exist
- Server actions for auth mutations (`login/actions.ts` has `signup()`, `login()`, `signOut()`)
- `quiz-generate` route explicitly comments "No DB insert — persistence comes later"
- `poll-job` returns status enum: QUEUED | PROCESSING | COMPLETED | FAILED

### Integration Points
- `quiz-generate/route.ts` — insert song row here at generation start
- `poll-job/[jobId]/route.ts` — finalization pipeline runs here on COMPLETED
- `audio/[jobId]/route.ts` — add R2 presigned URL path before HeartBula fallback
- `login/actions.ts` signup() — add claim query after successful sign-up
- `src/db/schema.ts` — new songs table, remove old tables
- `middleware.ts` — session cookie already refreshed on every request

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 29-database-schema-song-persistence*
*Context gathered: 2026-03-07*
