# Phase 3: Playback and Download - Context

**Gathered:** 2026-03-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can listen to their generated songs in-browser with a waveform visualization and download them as MP3 or WAV. Both song variants from a generation are independently playable and downloadable. This phase replaces the basic HTML `<audio>` element from Phase 2 with a proper waveform player and adds MP3 format support.

</domain>

<decisions>
## Implementation Decisions

### Waveform player
- Use wavesurfer.js for waveform rendering
- Classic vertical bars style (SoundCloud-like), not smooth wave
- Color scheme: violet gradient — played portion in solid violet, unplayed in zinc-700
- Minimal controls: play/pause button + current time / total duration display
- Seeking via clicking/dragging on the waveform itself
- Auto-pause: playing one variant automatically pauses the other (no overlapping audio)

### MP3 conversion
- Convert WAV→MP3 at generation time (server-side, immediately after audio fetch from RunPod)
- Store BOTH WAV and MP3 in R2 for each variant
- 320 kbps MP3 quality (highest, standard for music distribution)
- Conversion location: Claude's discretion (RunPod pod with ffmpeg vs Vercel API route)
- Playback source: use MP3 presigned URL for waveform rendering (smaller file = faster load)
- WAV still available as lossless download option

### Download UX
- Two separate buttons per variant: "Download MP3" and "Download WAV" — no dropdown picker
- Descriptive file names based on prompt/genre (e.g., "happy-jazz-birthday-variant-1.mp3")
- Generation results persist via URL — jobId in page URL (e.g., /generate?job=abc) so results survive page refresh/revisit
- Presigned URL expiry: Claude's discretion (reasonable window)

### Variant card redesign
- Stacked vertical layout: label on top → waveform with play/pause + time in middle → download buttons at bottom
- Show duration and approximate file size per variant (e.g., "2:00 • 4.8 MB MP3")
- Active (playing) variant card gets a violet border glow/accent to indicate which is playing
- Mobile: cards stack vertically (same as current behavior), waveform scales to full width

### Claude's Discretion
- WAV→MP3 conversion location (RunPod ffmpeg vs Vercel function vs other)
- Presigned URL expiry duration
- Exact waveform bar height/density/responsiveness
- Waveform loading state while audio buffer loads
- R2 key naming for MP3 files (alongside existing WAV key pattern)
- File name sanitization for descriptive download names
- Error states for failed audio load or conversion

</decisions>

<specifics>
## Specific Ideas

- Waveform should feel like SoundCloud's classic player — familiar and clean
- Violet accent matches the existing UI (violet-500/400 used throughout Phase 2)
- Auto-pause between variants makes A/B comparison natural — play one, then play the other
- Descriptive file names make downloads meaningful in the user's file system
- URL persistence means users can bookmark or share a generation link (even without accounts)

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/components/VariantCard.tsx`: Current basic card with `<audio>` + download link — will be replaced/upgraded with waveform player
- `src/components/GenerationResults.tsx`: Grid layout rendering variant cards — update to pass MP3 URLs and manage auto-pause state
- `src/hooks/useGenerationStatus.ts`: Polling hook returns `data.outputs[].url` — needs to return both MP3 and WAV URLs
- `src/lib/r2.ts`: `buildR2Key()` and `getPresignedUrl()` already working for WAV — extend for MP3 keys
- `src/lib/runpod.ts`: Audio fetch pipeline — add MP3 conversion step after WAV download

### Established Patterns
- Components are stateless where possible, state lives in parent (GenerationForm)
- Design tokens used: bg-primary, text-muted-foreground, border-border (though VariantCard currently uses hardcoded zinc/violet)
- API routes use Next.js App Router (`src/app/api/`)
- Error responses follow `{ error: { category, retryable, message, technical } }` shape

### Integration Points
- VariantCard.tsx: Replace `<audio>` with wavesurfer.js waveform component
- GenerationResults.tsx: Add auto-pause coordination between variant players
- `/api/status/:jobId`: Response needs MP3 URLs alongside WAV URLs
- `/api/generate` pipeline: Add WAV→MP3 conversion after R2 WAV upload
- `src/db/schema.ts`: May need MP3 R2 key columns in outputs table
- Page URL: Add jobId to URL params for result persistence

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 03-playback-and-download*
*Context gathered: 2026-03-04*
