---
phase: 29-database-schema-song-persistence
verified: 2026-03-07T12:35:00Z
status: passed
score: 9/9 must-haves verified
re_verification: false
---

# Phase 29: Database Schema + Song Persistence Verification Report

**Phase Goal:** Every generated song is saved to the database with its quiz context — authenticated users are linked by user_id, anonymous users by session_token, and anonymous songs can be claimed when the user subsequently signs up
**Verified:** 2026-03-07T12:35:00Z
**Status:** PASSED
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| #  | Truth | Status | Evidence |
|----|-------|--------|----------|
| 1  | Songs table exists in Supabase with all required columns (id, userId, sessionToken, status, heartbulaJobId, recipientName, relationship, genre, quizData, r2WavKey, r2Mp3Key, createdAt, completedAt, failedAt) | VERIFIED | `src/db/schema.ts` defines all 14 columns; schema.test.ts asserts each column name; SUMMARY confirms raw SQL applied to Supabase |
| 2  | RLS policies prevent anonymous role from accessing songs; authenticated users restricted to own rows via user_id = auth.uid() | VERIFIED | `src/db/schema.ts` lines 59-87: 4 pgPolicy definitions using authenticatedRole/anonRole; enableRLS() called on table |
| 3  | Old generations and outputs tables removed from schema.ts | VERIFIED | schema.ts exports only `songs` and `songStatusEnum`; schema.test.ts has 5 dedicated negative-assertion tests that all pass |
| 4  | R2 key helpers produce songs/{songId}/audio.wav and songs/{songId}/audio.mp3 paths | VERIFIED | `src/lib/r2.ts` lines 48-60: buildSongR2WavKey and buildSongR2Mp3Key implemented; schema.test.ts asserts exact path format |
| 5  | Every successful HeartBula generation creates a songs row with user_id (auth) or session_token (anonymous) | VERIFIED | `src/app/api/quiz-generate/route.ts` lines 99-138: identity determination then db.insert(songs) before HeartBula submission |
| 6  | On first COMPLETED poll, WAV downloaded, converted to MP3, both uploaded to R2, song row finalized | VERIFIED | `src/app/api/poll-job/[jobId]/route.ts` lines 23-57: finalizeSong() function implements full pipeline; isNull(r2WavKey) double-finalization guard present |
| 7  | Audio proxy serves from R2 presigned URL when available, falls back to HeartBula proxy otherwise | VERIFIED | `src/app/api/audio/[jobId]/route.ts` lines 36-50: DB lookup for r2Mp3Key → redirect; HeartBula proxy fallback lines 52-66 |
| 8  | When anonymous user signs up, all their songs are claimed and appear under their user_id | VERIFIED | `src/app/signup/actions.ts` lines 29-44: reads notevra_session cookie, db.update(songs).set({userId, sessionToken: null}).where(eq+isNull guard) |
| 9  | Finalization errors and claim errors are non-fatal (do not break poll response or signup redirect) | VERIFIED | poll-job wraps finalizeSong in try/catch (line 91-95); signup wraps claim in try/catch (lines 29-44); tests confirm behavior |

**Score:** 9/9 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/db/schema.ts` | songs table with pgPolicy RLS, songStatusEnum | VERIFIED | 88 lines; exports songs and songStatusEnum; 4 RLS policies; enableRLS(); 3 indexes |
| `src/db/schema.test.ts` | Schema export verification tests, min 30 lines | VERIFIED | 122 lines; 13 tests covering exports, column names, enum values, R2 key formats, and negative assertions for removed exports |
| `src/lib/r2.ts` | buildSongR2WavKey and buildSongR2Mp3Key helpers | VERIFIED | Lines 48-60: both functions exported; existing buildR2Key/buildR2Mp3Key preserved |
| `src/app/api/quiz-generate/route.ts` | Song row insert + session cookie for anonymous users | VERIFIED | Lines 99-182: createClient → getUser → identity → db.insert(songs) → HeartBula → back-fill → set cookie |
| `src/app/api/poll-job/[jobId]/route.ts` | Finalization pipeline: WAV download, MP3 convert, R2 upload, song row update | VERIFIED | Lines 1-123: finalizeSong() fully implemented; FAILED path at lines 99-108 |
| `src/app/api/audio/[jobId]/route.ts` | R2 presigned URL redirect with HeartBula fallback | VERIFIED | Lines 36-66: DB lookup → redirect or HeartBula proxy |
| `src/app/signup/actions.ts` | Anonymous song claim on sign-up via session_token match | VERIFIED | Lines 29-44: getUser → cookies → db.update with and(eq(sessionToken), isNull(userId)) |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/db/schema.ts` | `drizzle-orm/supabase` | authenticatedRole, anonRole imports for RLS | VERIFIED | Line 11: `import { authenticatedRole, anonRole } from 'drizzle-orm/supabase'` |
| `src/db/schema.ts` | `drizzle-orm/pg-core` | pgPolicy for RLS definitions | VERIFIED | Line 8: `pgPolicy` imported; used in 4 policy definitions |
| `src/app/api/quiz-generate/route.ts` | `src/db/schema.ts` | songs table insert | VERIFIED | Line 7: `import { songs } from '@/db/schema'`; line 115: `db.insert(songs)` |
| `src/app/api/poll-job/[jobId]/route.ts` | `src/lib/r2.ts` | uploadAudioToR2 for WAV and MP3 | VERIFIED | Line 8: import; lines 47-50: Promise.all([uploadAudioToR2(wavKey,...), uploadAudioToR2(mp3Key,...)]) |
| `src/app/api/poll-job/[jobId]/route.ts` | `src/lib/audio.ts` | convertToMp3 for WAV-to-MP3 conversion | VERIFIED | Line 7: import; line 40: `const mp3Buffer = await convertToMp3(wavBuffer)` |
| `src/app/api/audio/[jobId]/route.ts` | `src/db/schema.ts` | song lookup by heartbulaJobId for R2 key | VERIFIED | Lines 5-6: db and songs imported; line 40: `eq(songs.heartbulaJobId, jobId)` |
| `src/app/signup/actions.ts` | `src/db/schema.ts` | claim UPDATE matching session_token | VERIFIED | Lines 8-9: db and songs imported; lines 35-38: `db.update(songs).set({...}).where(and(eq(songs.sessionToken,...), isNull(songs.userId)))` |
| `src/db` (index.ts) | `src/db/schema.ts` | `* as schema` wildcard import exposes songs to drizzle | VERIFIED | `src/db/index.ts` line 3: `import * as schema from './schema'`; line 9: `drizzle({ client, schema })` |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| SONG-01 | 29-01 | Songs table exists in Supabase with RLS policies (user can only access own songs) | SATISFIED | songs table defined with 4 RLS policies in schema.ts; SUMMARY confirms applied to Supabase via raw SQL; schema tests pass |
| SONG-02 | 29-02 | Generated songs are saved to database with user_id (if authenticated) or session_token (if anonymous) | SATISFIED | quiz-generate route inserts songs row with userId or sessionToken based on Supabase auth.getUser(); 6 tests covering both paths |
| SONG-03 | 29-01 | Quiz context stored on song record (recipient name, relationship, message, genre) | SATISFIED | songs table has recipientName, relationship, genre as top-level columns; quizData JSONB holds qualities, memories, message, voiceGender, language |
| SONG-04 | 29-02 | Anonymous songs are claimed by user account on sign-up via session_token match | SATISFIED | signup/actions.ts claims songs by session_token after successful signUp; 4 dedicated tests verify claim behavior including no-cookie and error resilience cases |

No orphaned requirements found — all 4 SONG-* IDs are mapped in REQUIREMENTS.md to Phase 29 and are covered by Plans 29-01 and 29-02.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/app/api/quiz-generate/route.ts` | 112 | Comment reads "placeholder heartbulaJobId" | Info | This is a code comment describing the intentional two-step pattern (insert with empty string, then back-fill after HeartBula responds). The implementation immediately back-fills on line 164. Not a stub. |

No blocker or warning anti-patterns found.

---

### Test Results

All 68 tests pass across 5 test files (run verified 2026-03-07):

- `src/db/schema.test.ts` — 13 tests (schema exports, column names, enum values, R2 key formats, removed export assertions)
- `src/app/api/quiz-generate/route.test.ts` — 23 tests (DB persistence, anonymous/auth identity, session cookie, error handling, validation)
- `src/app/api/poll-job/[jobId]/route.test.ts` — 16 tests (finalization pipeline, double-finalization guard, FAILED status update, error resilience, network errors)
- `src/app/api/audio/[jobId]/route.test.ts` — 7 tests (R2 redirect path, HeartBula fallback, error handling)
- `src/app/signup/actions.test.ts` — 9 tests (anonymous claim, no-cookie path, claim error resilience, signup error cases)

Commits verified in git: `52af4fd` (Plan 01 Task 1), `556f4f2` (Plan 02 Task 1), `84204f2` (Plan 02 Task 2)

---

### Human Verification Required

#### 1. Songs table live in Supabase

**Test:** In Supabase Dashboard SQL Editor, run:
```sql
SELECT relname, relrowsecurity FROM pg_class WHERE relname='songs';
SELECT * FROM information_schema.tables WHERE table_schema='public' AND table_name='songs';
SELECT policyname FROM pg_policies WHERE tablename='songs';
```
**Expected:** relrowsecurity=true; table row returned; 4 policy names (songs-authenticated-select, songs-authenticated-update, songs-authenticated-delete, songs-anon-deny-all)
**Why human:** Cannot verify live Supabase database state programmatically. SUMMARY confirms raw SQL was applied but database state requires dashboard access to confirm.

---

### Gaps Summary

No gaps. All 9 observable truths verified against actual code. All 4 requirements satisfied. All 68 unit tests pass. All 7 key links are wired from imports through to usage. No blocking anti-patterns.

The one human verification item (Supabase live database state) is informational — the SUMMARY documents the raw SQL was applied and user confirmed it in the Supabase Dashboard during execution. The automated code verification fully confirms all source code artifacts are correct and properly integrated.

---

_Verified: 2026-03-07T12:35:00Z_
_Verifier: Claude (gsd-verifier)_
