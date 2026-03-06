# Phase 17: Success Page - Context

**Gathered:** 2026-03-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Build the celebratory success page at /quiz/success/[jobId]. When generation completes, show confetti, instant playback via native `<audio>`, MP3 download, "Create Another Song" CTA, and social sharing prompt. This page polls HeartMuLa for job completion since v3.0 has no DB record (Phase 16 decision). This is the final phase of v3.0.

</domain>

<decisions>
## Implementation Decisions

### Song Playback & Download
- All decisions delegated to Claude's discretion:
  - Whether to stream audio directly from HeartMuLa or upload to R2 first (existing R2 utilities available)
  - Native `<audio>` element — locked v3.0 decision, no wavesurfer
  - Download filename should be meaningful (e.g. "song-for-sarah.mp3") — not a UUID
  - MP3 format for download

### Celebration Moment
- All decisions delegated to Claude's discretion:
  - Confetti style and timing (dramatic reveal vs immediate)
  - Page layout and emotional copy
  - Whether confetti fires on page load or after a brief reveal animation
- Must feel warm and celebratory — this is the gift payoff moment

### Next Actions & Sharing
- All decisions delegated to Claude's discretion:
  - "Create Another Song" behavior (clear all data vs keep some)
  - Social sharing prompt approach (record reaction vs share link vs both)
  - Any additional CTAs on the page
- "Create Another Song" must navigate back to /quiz with fresh state

### Polling & Loading State
- All decisions delegated to Claude's discretion:
  - Poll interval and timeout for HeartMuLa job completion
  - What to show while waiting for generation to complete (page may load before song is ready)
  - Error/timeout handling UX
- Must poll HeartMuLa directly (no DB in v3.0) — use `queryJobStatus` from heartmula.ts
- Page must be refresh-safe — jobId in URL is the only state needed

### Claude's Discretion
All areas delegated to Claude's judgment. Key constraints:
- Native `<audio>` — no wavesurfer
- No DB reads — poll HeartMuLa directly via queryJobStatus
- Meaningful download filename (not UUID)
- canvas-confetti package available (listed in Phase 15 research as new package)
- Warm, celebratory, gift-service feel
- This is the LAST phase of v3.0 — the complete funnel end-to-end must work

</decisions>

<specifics>
## Specific Ideas

- This is the emotional payoff of the entire funnel — user poured their heart into the quiz, waited through generation, and now sees the result. It should feel like a gift reveal, not a download page
- Confetti is specifically called out in SUCC-01 — must be visually celebratory
- "Record their reaction" sharing prompt (SUCC-05) is about encouraging the gift-giving moment, not just sharing a link
- Download filename should include recipient name if possible (e.g. "notevra-song-for-sarah.mp3")

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `heartmula.ts`: `queryJobStatus(jobId)` returns `{status, audio_path, error_msg}`, `fetchAudioBuffer(jobId)` returns MP3 buffer
- `r2.ts`: `uploadAudioToR2()`, `getAudioPresignedUrl()` — if we want persistent storage
- `filename.ts`: `buildDownloadFilename()` — existing filename utility
- `/api/status/[jobId]/route.ts`: Existing status polling route (but reads from DB — may need a new lightweight route)
- `framer-motion` (v12.35): For reveal animations
- Success page scaffold exists at `src/app/quiz/success/[jobId]/page.tsx`

### Established Patterns
- Quiz page uses 'use client' with useState for interactive state
- API routes use NextRequest/NextResponse with structured error responses
- Tailwind v4 with OKLCH tokens for styling
- Lucide React for icons

### Integration Points
- `/quiz/success/[jobId]` — scaffold exists, needs to become a client component for polling
- HeartMuLa job ID comes from URL params (set by Phase 16 redirect)
- Quiz data in localStorage (key: `notevra_quiz_v1`) — available for personalization (recipient name for filename)
- Phase 16 clears localStorage after successful API response — so quiz data may NOT be available on the success page. Need to either: pass recipient name via URL param, or read before clearing

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 17-success-page*
*Context gathered: 2026-03-06*
