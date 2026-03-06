# Deferred Items — Phase 12

## Pre-existing Test Failures (Out of Scope)

### src/app/library/page.test.tsx — 4 failing tests

**Discovered during:** Plan 12-02 Task 2 full suite run

**Error:** `useAudioPlayer must be used within an AudioPlayerProvider`

**Affected tests:**
- (LIB2-02) renders song titles and count when songs exist
- (LIB2-03) renders genre pills, instrumental badge, and duration
- renders "Library" as page heading
- shows "1 song" singular when there is exactly one song

**Root cause:** LibrarySongCard uses `useAudioPlayer` hook directly, but the test renders the page without wrapping in `AudioPlayerProvider`. This was verified to be pre-existing (reproduced with git stash of plan 12-02 changes).

**Recommended fix:** Wrap the test render with `AudioPlayerProvider` or mock `useAudioPlayer` in the library page tests.

**Priority:** Medium — library page still functions at runtime (AudioPlayerProvider is in AppShell). Only tests are broken.
