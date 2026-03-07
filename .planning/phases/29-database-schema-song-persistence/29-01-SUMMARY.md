---
phase: 29-database-schema-song-persistence
plan: 01
subsystem: database
tags: [drizzle-orm, supabase, postgres, rls, r2, songs-table, vitest]

# Dependency graph
requires:
  - phase: 28-auth-infrastructure
    provides: Supabase auth setup (authenticatedRole, anonRole for RLS policies)
provides:
  - songs table live in Supabase with 14 columns and RLS policies
  - songStatusEnum (generating, completed, failed) in Supabase
  - buildSongR2WavKey and buildSongR2Mp3Key helpers in src/lib/r2.ts
  - Schema tests verifying exports and column structure
affects:
  - 29-02 (song persistence wiring uses songs table + R2 key helpers)
  - 30-email-infrastructure (queries songs table for completed songs)
  - 31-success-page-dashboard (reads songs table for user's song history)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - drizzle-orm pgPolicy with authenticatedRole/anonRole from drizzle-orm/supabase for RLS
    - enableRLS() belt-and-suspenders alongside pgPolicy definitions
    - R2 key helpers follow songs/{songId}/audio.{ext} path convention
    - drizzle-kit push blocked by CHECK constraint bug — raw SQL applied via Supabase SQL Editor

key-files:
  created:
    - src/db/schema.ts
    - src/db/schema.test.ts
  modified:
    - src/lib/r2.ts

key-decisions:
  - "drizzle-kit push blocked by Supabase CHECK constraint bug — applied schema via raw SQL in Supabase SQL Editor as equivalent workaround"
  - "Old generations/outputs tables removed from schema.ts only (they never existed in the DB, no DROP needed)"
  - "songs-anon-deny-all policy uses FOR ALL with USING false to block all anonymous operations at RLS level"

patterns-established:
  - "RLS pattern: pgPolicy with authenticatedRole/anonRole imported from drizzle-orm/supabase"
  - "R2 key convention: songs/{songId}/audio.wav and songs/{songId}/audio.mp3"
  - "Schema test pattern: verify exports exist and old exports do NOT exist"

requirements-completed: [SONG-01, SONG-03]

# Metrics
duration: ~30min
completed: 2026-03-06
---

# Phase 29 Plan 01: Database Schema + Song Persistence Summary

**songs table with 14 columns, 4 RLS policies, 3 indexes live in Supabase via raw SQL (drizzle-kit push blocked by CHECK constraint bug)**

## Performance

- **Duration:** ~30 min
- **Started:** 2026-03-06
- **Completed:** 2026-03-06
- **Tasks:** 2 (Task 1 auto, Task 2 human-action checkpoint)
- **Files modified:** 3

## Accomplishments
- Replaced old generations/outputs schema with songs table (14 columns, songStatusEnum, RLS policies, 3 indexes)
- Applied schema to Supabase — songs table live with RLS enabled, all 4 policies active
- Added buildSongR2WavKey and buildSongR2Mp3Key to src/lib/r2.ts
- 13 schema tests pass verifying exports, column structure, and R2 key paths

## Task Commits

Each task was committed atomically:

1. **Task 1: Replace schema with songs table + RLS policies, add R2 key helpers** - `52af4fd` (feat)
2. **Task 2: Push schema to Supabase** - Human-action checkpoint; no source files modified

**Plan metadata:** (docs commit — see below)

## Files Created/Modified
- `src/db/schema.ts` - songs pgTable with songStatusEnum, 14 columns, 4 pgPolicy RLS rules, 3 indexes, enableRLS()
- `src/db/schema.test.ts` - 13 Vitest tests verifying schema exports and R2 key helpers
- `src/lib/r2.ts` - Added buildSongR2WavKey and buildSongR2Mp3Key (kept existing helpers)

## Decisions Made
- drizzle-kit push has a known bug with Supabase CHECK constraints that caused it to fail on the songStatusEnum. Schema was applied via raw SQL in the Supabase SQL Editor as an equivalent workaround — all 10 SQL statements applied successfully.
- songs-anon-deny-all policy covers FOR ALL operations so anonymous role cannot read, insert, update, or delete any songs row.
- Old generations/outputs tables were removed from schema.ts only — no DROP statements needed since they never existed in the production DB.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] drizzle-kit push blocked by Supabase CHECK constraint bug**
- **Found during:** Task 2 (Push schema to Supabase)
- **Issue:** drizzle-kit push generates CHECK constraints for pgEnum that Supabase rejects, causing the push to fail interactively
- **Fix:** User applied equivalent raw SQL directly in Supabase SQL Editor — all 10 statements (CREATE TYPE, CREATE TABLE, ALTER TABLE ENABLE ROW LEVEL SECURITY, 4 CREATE POLICY, 3 CREATE INDEX) applied successfully
- **Files modified:** None (database-only change)
- **Verification:** Supabase Dashboard confirmed table exists, relrowsecurity=true, all 4 policies and 3 indexes present
- **Committed in:** N/A (database migration, no source file change)

---

**Total deviations:** 1 (blocking — drizzle-kit push workaround)
**Impact on plan:** The workaround produced identical database state. No scope creep. The songs table in Supabase is exactly as designed.

## Issues Encountered
- drizzle-kit push is incompatible with Supabase's handling of CHECK constraints on pgEnum columns. Future migrations for this project should apply raw SQL via Supabase SQL Editor or use supabase CLI migrations instead of drizzle-kit push.

## User Setup Required
None - schema is now live in Supabase. No additional environment variables needed.

## Next Phase Readiness
- songs table fully live with RLS; Plan 29-02 can wire song persistence into the generation pipeline
- buildSongR2WavKey and buildSongR2Mp3Key ready for use in Plan 29-02 upload logic
- Blocker to note: future schema changes should bypass drizzle-kit push and use raw SQL or supabase CLI

---
*Phase: 29-database-schema-song-persistence*
*Completed: 2026-03-06*
