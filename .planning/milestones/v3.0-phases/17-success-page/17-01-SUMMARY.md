---
phase: 17-success-page
plan: "01"
subsystem: api-routes
tags: [api, heartmula, proxy, audio, polling, quiz]
dependency_graph:
  requires: [src/lib/heartmula.ts, src/app/quiz/page.tsx]
  provides: [/api/poll-job/[jobId], /api/audio/[jobId], quiz-redirect-name-param]
  affects: [src/app/quiz/success/[jobId]/page.tsx]
tech_stack:
  added: [canvas-confetti@1.9.4, "@types/canvas-confetti"]
  patterns: [nextjs-route-handler, heartmula-proxy, next15-async-params]
key_files:
  created:
    - src/app/api/poll-job/[jobId]/route.ts
    - src/app/api/audio/[jobId]/route.ts
  modified:
    - src/app/quiz/page.tsx
    - package.json
decisions:
  - "Buffer converted to Uint8Array for NextResponse BodyInit compatibility — Node.js Buffer not assignable to BodyInit in Next.js types"
  - "poll-job error returns status=QUEUED not HTTP error — client keeps polling through transient RunPod restarts"
  - "audio route uses Cache-Control public max-age=3600 — generated songs are immutable after completion"
metrics:
  duration: "~2 minutes"
  completed: "2026-03-06"
  tasks: 2
  files_changed: 4
---

# Phase 17 Plan 01: API Routes for Success Page Summary

## One-liner

HeartMuLa poll and audio proxy routes with canvas-confetti install; quiz redirect patched with recipient name URL param.

## What Was Built

Two Next.js Route Handlers that the Phase 17 success page will consume, plus a surgical patch to the Phase 16 quiz redirect:

1. **GET /api/poll-job/[jobId]** — Proxies `queryJobStatus()` from heartmula.ts, returning `{ status, error }`. Treats any HeartMuLa error as QUEUED so the client keeps polling through transient pod restarts.

2. **GET /api/audio/[jobId]** — Proxies `fetchAudioBuffer()` from heartmula.ts and streams it as `audio/mpeg`. Keeps the internal RunPod URL hidden from the browser and enables the `download` attribute on same-origin anchor tags.

3. **Quiz redirect patch** — Changed `router.push('/quiz/success/${jobId}')` to include `?name=${encodeURIComponent(data.recipientName)}` so the success page can personalize the MP3 download filename without reading cleared localStorage.

4. **canvas-confetti@1.9.4** — Installed with `@types/canvas-confetti` for the success page confetti animation in Plan 17-02.

## Decisions Made

| Decision | Why |
|----------|-----|
| `new Uint8Array(buffer)` instead of `buffer` in NextResponse | Node.js `Buffer` not assignable to `BodyInit` in Next.js TypeScript types — Uint8Array is the correct typed subtype |
| Poll errors return `{ status: 'QUEUED', error: null }` not HTTP 4xx/5xx | Prevents success page from showing error on transient network blips; keeps polling gracefully |
| Cache-Control 1h on audio route | Generated songs are immutable after completion; caching reduces HeartMuLa load on replays |
| Recipient name via URL param not localStorage | Phase 16 clears localStorage before redirect; URL param is refresh-safe and survives hard navigation |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed Buffer type incompatibility in audio proxy route**
- **Found during:** Task 1 verification (tsc --noEmit)
- **Issue:** `fetchAudioBuffer` returns Node.js `Buffer<ArrayBufferLike>` which is not assignable to `BodyInit` (NextResponse parameter) — TypeScript error TS2345
- **Fix:** Wrapped buffer with `new Uint8Array(buffer)` — Uint8Array satisfies `BodyInit` and is a subtype of Buffer
- **Files modified:** src/app/api/audio/[jobId]/route.ts
- **Commit:** 55fb451

## Self-Check: PASSED

- [x] `src/app/api/poll-job/[jobId]/route.ts` exists with GET export
- [x] `src/app/api/audio/[jobId]/route.ts` exists with GET export
- [x] `src/app/quiz/page.tsx` contains `?name=${encodeURIComponent`
- [x] `canvas-confetti@1.9.4` in package.json dependencies
- [x] Both new routes compile without TypeScript errors
- [x] Task 1 commit: 55fb451
- [x] Task 2 commit: 6fe5f2b
