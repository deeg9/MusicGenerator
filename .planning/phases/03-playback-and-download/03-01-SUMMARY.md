---
phase: 03-playback-and-download
plan: 01
subsystem: api
tags: [vitest, ffmpeg, mp3, r2, audio, presigned-urls, drizzle]

# Dependency graph
requires:
  - phase: 01-infrastructure-foundation
    provides: R2 upload/presign, DB schema, status route
  - phase: 02-generation-api
    provides: Generation flow, outputs table, runpod integration
provides:
  - WAV-to-MP3 conversion using ffmpeg-static (convertWavToMp3)
  - Descriptive download filenames (buildDownloadFilename)
  - R2 MP3 key builder (buildR2Mp3Key)
  - Updated presigned URL generation with content-disposition
  - Status route returns both mp3Url and url (WAV) per output
  - mp3FileSizeBytes in response for frontend file size display
  - Vitest test infrastructure with jsdom environment
affects: [03-02-frontend-playback, frontend-download-buttons]

# Tech tracking
tech-stack:
  added: [vitest, @vitejs/plugin-react, jsdom, @testing-library/react, @testing-library/jest-dom, ffmpeg-static]
  patterns: [vi.mock for env isolation in tests, non-fatal MP3 conversion with WAV fallback, descriptive filenames via slug sanitization]

key-files:
  created:
    - vitest.config.ts
    - src/lib/audio.ts
    - src/lib/filename.ts
    - src/lib/audio.test.ts
    - src/lib/r2.test.ts
    - src/app/api/status/route.test.ts
    - src/components/WaveformPlayer.test.tsx
    - src/components/GenerationResults.test.tsx
    - scripts/migrate-add-mp3-columns.mjs
  modified:
    - src/lib/r2.ts
    - src/db/schema.ts
    - src/app/api/status/[jobId]/route.ts

key-decisions:
  - "drizzle-kit push hangs indefinitely — used direct SQL migration script (ALTER TABLE IF NOT EXISTS) for reliability"
  - "ffmpeg-static import via require() instead of ESM import — @ts-expect-error unused with ESM because TS resolves it as any"
  - "MP3 conversion failure is non-fatal: log error, mp3R2Key stays null, WAV URL still returned"
  - "Presigned URL expiry bumped from 1h to 24h per research recommendation (users may share/use later)"
  - "vi.mock('@/env') pattern established for testing modules with module-level env validation"

patterns-established:
  - "Non-fatal conversions: try/catch around optional pipeline steps, log error, continue with partial data"
  - "Descriptive download filenames: slug(prompt)-variant-N.ext pattern for all audio downloads"
  - "Env mocking in vitest: vi.mock('@/env') with fake values, dynamic import in beforeAll"

requirements-completed: [PLAY-02, PLAY-03]

# Metrics
duration: 18min
completed: 2026-03-05
---

# Phase 03 Plan 01: Backend Audio Delivery Summary

**WAV-to-MP3 pipeline via ffmpeg-static, dual-format R2 storage, and descriptive download URLs returning both mp3Url and url (WAV) from the status API**

## Performance

- **Duration:** 18 min
- **Started:** 2026-03-05T04:55:10Z
- **Completed:** 2026-03-05T05:13:00Z
- **Tasks:** 3 (Task 0, Task 1, Task 2)
- **Files modified:** 13

## Accomplishments

- Vitest test infrastructure installed and configured with jsdom and @ alias
- WAV-to-MP3 conversion implemented using ffmpeg-static with temp file cleanup
- Status route now uploads both WAV and MP3 to R2 and returns dual presigned URLs
- Presigned URLs include Content-Disposition headers with descriptive filenames
- MP3 conversion failure is graceful — route returns WAV-only without crashing
- Schema extended with mp3R2Key and mp3FileSizeBytes columns (Supabase updated)

## Task Commits

Each task was committed atomically:

1. **Task 0: Install vitest and create test stubs** - `def84da` (chore)
2. **Task 1: Add MP3 conversion lib, filename helper, and extend R2/schema** - `5d8e7c2` (feat)
3. **Task 2: Wire MP3 conversion into status route and return dual URLs** - `35edbad` (feat)

## Files Created/Modified

- `vitest.config.ts` - Vitest config with jsdom environment and @ path alias
- `src/lib/audio.ts` - convertWavToMp3(wavBuffer): Buffer using ffmpeg-static + execFile
- `src/lib/filename.ts` - buildDownloadFilename: slug sanitization with 40-char cap
- `src/lib/r2.ts` - Added buildR2Mp3Key, contentType param, downloadFilename for presign
- `src/db/schema.ts` - Added mp3R2Key and mp3FileSizeBytes nullable columns to outputs
- `src/app/api/status/[jobId]/route.ts` - Full MP3 pipeline and dual-URL response
- `src/lib/audio.test.ts` - Real test: convertWavToMp3 is a function; 4 todo stubs
- `src/lib/r2.test.ts` - Real tests for buildR2Mp3Key; env mocked via vi.mock
- `src/app/api/status/route.test.ts` - Real test: GET export exists; env/db mocked
- `src/components/WaveformPlayer.test.tsx` - Todo stubs for PLAY-01 frontend plan
- `src/components/GenerationResults.test.tsx` - Todo stubs for PLAY-01 frontend plan
- `scripts/migrate-add-mp3-columns.mjs` - Direct SQL migration as drizzle-kit push workaround

## Decisions Made

- `drizzle-kit push` hangs indefinitely in this environment (pulls schema spinner, never resolves). Used direct `ALTER TABLE IF NOT EXISTS` migration script for reliability.
- ffmpeg-static imported via `require()` cast to string — ESM import with `@ts-expect-error` was unused error because TypeScript resolved the module type.
- MP3 conversion failure is explicitly non-fatal. If ffmpeg fails for any variant, the route logs the error, leaves mp3R2Key null, and returns WAV-only. The client must handle null mp3Url.
- Presigned URL default expiry changed from 3600s (1h) to 86400s (24h) — users may use URLs later and 24h is the research-recommended value.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] @ts-expect-error directive was unused (TypeScript resolved ffmpeg-static)**
- **Found during:** Task 1 (audio.ts TypeScript compilation)
- **Issue:** `@ts-expect-error` directive caused TS2578 error — TypeScript can import ffmpeg-static but returns `string | null` type, so the error suppression was unused
- **Fix:** Replaced with `const ffmpegPath = require('ffmpeg-static') as string` (CommonJS require with explicit cast)
- **Files modified:** src/lib/audio.ts
- **Verification:** `npx tsc --noEmit` passes clean
- **Committed in:** `5d8e7c2` (Task 1 commit)

**2. [Rule 2 - Missing Critical] Added vi.mock for env in r2.test.ts**
- **Found during:** Task 1 (vitest run for r2.test.ts)
- **Issue:** Importing r2.ts triggers module-level `new S3Client(env.*)` which calls env validation — fails in test environment without real env vars
- **Fix:** Added `vi.mock('@/env', () => ({ env: { ... } }))` + dynamic import in beforeAll
- **Files modified:** src/lib/r2.test.ts
- **Verification:** `npx vitest run src/lib/r2.test.ts` passes 2 real tests
- **Committed in:** `5d8e7c2` (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (1 bug, 1 missing critical)
**Impact on plan:** Both fixes required for correct TypeScript compilation and test isolation. No scope creep.

## Issues Encountered

- `drizzle-kit push` enters an infinite "Pulling schema from database..." spinner and never prompts for confirmation or exits. Root cause unknown (may be a TTY/interactive terminal detection issue). Resolved with a direct SQL migration script using `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`.

## User Setup Required

None - no external service configuration required beyond what was already set up.

## Next Phase Readiness

- Backend is ready: status route now returns `mp3Url`, `url` (WAV), `mp3FileSizeBytes`, and `promptText` for each output
- Frontend plan (03-02) can consume these fields directly
- Any null `mp3Url` means conversion failed — frontend should gracefully handle MP3-only showing WAV download
- `src/components/WaveformPlayer.test.tsx` and `GenerationResults.test.tsx` todo stubs are ready for the frontend implementation plan

---
*Phase: 03-playback-and-download*
*Completed: 2026-03-05*
