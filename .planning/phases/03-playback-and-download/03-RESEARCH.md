# Phase 3: Playback and Download - Research

**Researched:** 2026-03-04
**Domain:** Browser audio playback (wavesurfer.js), WAV-to-MP3 conversion (server-side via ffmpeg), Cloudflare R2 CORS, Next.js URL persistence
**Confidence:** HIGH (core stack), MEDIUM (ffmpeg deployment path)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Use wavesurfer.js for waveform rendering
- Classic vertical bars style (SoundCloud-like), not smooth wave
- Color scheme: violet gradient — played portion in solid violet, unplayed in zinc-700
- Minimal controls: play/pause button + current time / total duration display
- Seeking via clicking/dragging on the waveform itself
- Auto-pause: playing one variant automatically pauses the other (no overlapping audio)
- Convert WAV to MP3 at generation time (server-side, immediately after audio fetch from RunPod)
- Store BOTH WAV and MP3 in R2 for each variant
- 320 kbps MP3 quality (highest, standard for music distribution)
- Playback source: use MP3 presigned URL for waveform rendering (smaller file = faster load)
- WAV still available as lossless download option
- Two separate buttons per variant: "Download MP3" and "Download WAV" — no dropdown picker
- Descriptive file names based on prompt/genre (e.g., "happy-jazz-birthday-variant-1.mp3")
- Generation results persist via URL — jobId in page URL (e.g., /generate?job=abc) so results survive page refresh/revisit
- Stacked vertical layout: label on top → waveform with play/pause + time in middle → download buttons at bottom
- Show duration and approximate file size per variant (e.g., "2:00 • 4.8 MB MP3")
- Active (playing) variant card gets a violet border glow/accent to indicate which is playing
- Mobile: cards stack vertically, waveform scales to full width

### Claude's Discretion
- WAV to MP3 conversion location (RunPod ffmpeg vs Vercel function vs other)
- Presigned URL expiry duration
- Exact waveform bar height/density/responsiveness
- Waveform loading state while audio buffer loads
- R2 key naming for MP3 files (alongside existing WAV key pattern)
- File name sanitization for descriptive download names
- Error states for failed audio load or conversion

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PLAY-01 | User can play/pause/seek generated songs in-browser with waveform visualization | wavesurfer.js v7 + @wavesurfer/react — full waveform player with barWidth/barGap bars, interact=true for seek |
| PLAY-02 | User can download songs as MP3 | Server-side WAV→MP3 conversion (ffmpeg via child_process or on RunPod), stored in R2, presigned download URL with content-disposition |
| PLAY-03 | User can download songs as WAV | Already stored in R2 from Phase 2; add download presigned URL with content-disposition |
</phase_requirements>

---

## Summary

Phase 3 has three distinct technical workstreams: (1) waveform player component using wavesurfer.js v7, (2) WAV-to-MP3 server-side conversion, and (3) result persistence via URL search params plus schema/API changes to carry both WAV and MP3 URLs.

The waveform player is straightforward: `wavesurfer.js@7.x` with `@wavesurfer/react@1.x` provides a hooks-based React integration where all config options become props. The bars style, violet gradient, and seek-on-click all map directly to first-class wavesurfer options (`barWidth`, `barGap`, `waveColor`, `progressColor`, `interact`). The one critical pitfall is CORS: wavesurfer uses the Web Audio API to decode audio for waveform generation, which requires CORS headers on R2. R2 already has CORS configured for localhost:3000 (Phase 1), but production origin(s) must be added.

For WAV-to-MP3 conversion, the cleanest path is a Node.js child_process call to the system `ffmpeg` binary from within the existing `/api/status` route, where audio is already downloaded. Vercel's build environment does NOT include ffmpeg and the 50 MB function size limit makes bundling it impractical. The recommended approach is to call ffmpeg on the RunPod pod via a new `/convert` endpoint, or to add an `ffmpeg` call via `child_process.exec` on a Vercel function that explicitly includes `ffmpeg-static` — with careful attention to the 50 MB limit. The safest path given existing infrastructure: add a `/convert` endpoint to the ACE-Step pod that accepts a WAV path and returns an MP3, then call it from the status route after WAV download.

**Primary recommendation:** Use wavesurfer.js v7 + @wavesurfer/react for the player. For MP3 conversion, use `ffmpeg-static` + `fluent-ffmpeg` in the Vercel API route (the WAV buffer is already in memory in `/api/status`) — this avoids adding a new RunPod endpoint and keeps conversion atomic with the audio pipeline. Monitor function bundle size; fall back to RunPod-side conversion if Vercel function exceeds 50 MB.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| wavesurfer.js | 7.12.1 | Audio waveform rendering + playback | Industry standard, actively maintained, v7 is TypeScript rewrite with Shadow DOM isolation |
| @wavesurfer/react | 1.0.12 | React hooks/component wrapper for wavesurfer | Official first-party package from wavesurfer maintainer |
| ffmpeg-static | ^5.x | Pre-built static ffmpeg binary for Node | Zero-config ffmpeg in Node.js; no system dep |
| fluent-ffmpeg | ^2.x | Node.js ffmpeg API wrapper | Cleaner API than raw child_process; ARCHIVED but stable for simple use |

**Note on fluent-ffmpeg:** The repository was archived May 22, 2025 (read-only). For a single WAV→MP3 conversion command, `child_process.execFile` with `ffmpeg-static` is simpler and avoids the archived dependency. Use either approach — both are viable.

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Next.js useSearchParams | built-in | Read jobId from URL on page load | URL persistence of generation results |
| Next.js useRouter | built-in | Write jobId to URL after generation | Push job=<id> into URL on submission |
| @aws-sdk/s3-request-presigner | ^3.x (already installed) | Presigned URLs with response-content-disposition | Download links with proper filename |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| ffmpeg-static on Vercel | RunPod /convert endpoint | RunPod is more reliable for large files but adds API surface; Vercel is simpler if bundle fits |
| ffmpeg-static on Vercel | lamejs in Node.js | lamejs is pure JS (no binary), but max ~128 kbps MP3; does not support 320 kbps |
| @wavesurfer/react | Raw wavesurfer.js + useRef | More control, more boilerplate — not needed given official React package exists |

**Installation:**
```bash
npm install wavesurfer.js @wavesurfer/react
npm install ffmpeg-static
# If using fluent-ffmpeg wrapper (optional):
npm install fluent-ffmpeg
npm install --save-dev @types/fluent-ffmpeg
```

---

## Architecture Patterns

### Recommended Project Structure Changes

```
src/
├── components/
│   ├── WaveformPlayer.tsx        # new: wavesurfer.js waveform + play/pause/time
│   ├── VariantCard.tsx           # replace: upgrade from <audio> to WaveformPlayer
│   └── GenerationResults.tsx     # update: manage activeVariantId for auto-pause
├── hooks/
│   └── useGenerationStatus.ts   # update: returns mp3Url + wavUrl per output
├── lib/
│   └── r2.ts                    # update: buildR2MpegKey(), uploadAudioToR2 reuse
│   └── audio.ts                 # new: convertWavToMp3(buffer) → Buffer
│   └── filename.ts              # new: buildDownloadFilename(prompt, variant, ext)
├── app/
│   └── api/
│       └── status/[jobId]/
│           └── route.ts          # update: call convertWavToMp3 + upload MP3 to R2
└── db/
    └── schema.ts                 # update: add mp3R2Key column to outputs table
```

### Pattern 1: WaveformPlayer Component

**What:** A `'use client'` React component that wraps `@wavesurfer/react`. Accepts `url`, `isActive`, `onPlay` props. Renders bar-style waveform with play/pause button and current-time/duration display.

**When to use:** Inside VariantCard for each generated variant.

**Example:**
```typescript
// Source: @wavesurfer/react README + wavesurfer.js v7 API
'use client';
import { useState, useCallback } from 'react';
import { useWavesurfer } from '@wavesurfer/react';

interface WaveformPlayerProps {
  url: string;
  isActive: boolean;     // true when this variant is the playing one
  onPlay: () => void;    // notify parent so it can pause sibling
}

export function WaveformPlayer({ url, isActive, onPlay }: WaveformPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [duration, setDuration] = useState(0);

  const { wavesurfer, isReady, isPlaying, currentTime } = useWavesurfer({
    container: containerRef,
    url,
    waveColor: '#3f3f46',        // zinc-700
    progressColor: '#8b5cf6',    // violet-500
    barWidth: 3,
    barGap: 1,
    barRadius: 2,
    height: 64,
    interact: true,              // clicking waveform seeks
    normalize: true,
    fillParent: true,
    onReady: (ws) => setDuration(ws.getDuration()),
    onPlay: onPlay,
  });

  const handlePlayPause = useCallback(() => {
    wavesurfer?.playPause();
  }, [wavesurfer]);

  // If sibling becomes active, pause this one
  useEffect(() => {
    if (!isActive && isPlaying) {
      wavesurfer?.pause();
    }
  }, [isActive, isPlaying, wavesurfer]);

  return (
    <div>
      <div ref={containerRef} />
      <div className="flex items-center gap-2 mt-2">
        <button onClick={handlePlayPause} disabled={!isReady}>
          {isPlaying ? 'Pause' : 'Play'}
        </button>
        <span>{formatTime(currentTime)} / {formatTime(duration)}</span>
      </div>
    </div>
  );
}
```

### Pattern 2: Auto-Pause Coordination in GenerationResults

**What:** `GenerationResults` tracks which variant is currently playing via `activeVariantId` state. When a variant fires `onPlay`, set it as active. Pass `isActive={output.id === activeVariantId}` to each card. WaveformPlayer watches `isActive` and pauses itself when it becomes false.

**When to use:** Anytime two waveform instances share a page and should not overlap.

```typescript
// GenerationResults.tsx update (simplified)
const [activeVariantId, setActiveVariantId] = useState<string | null>(null);

// In the map:
<VariantCard
  key={output.id}
  isActive={activeVariantId === output.id}
  onPlay={() => setActiveVariantId(output.id)}
  mp3Url={output.mp3Url}
  wavUrl={output.wavUrl}
  ...
/>
```

### Pattern 3: URL-Based Job Persistence

**What:** On generation submit, write jobId into URL search params so the result survives page refresh. On page load, read jobId from params and resume polling if needed.

**When to use:** Replacing the current pure-state approach.

```typescript
// In GenerationPage.tsx (client component)
'use client';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';

const router = useRouter();
const pathname = usePathname();
const searchParams = useSearchParams();

// On mount, initialize from URL
const [jobId, setJobId] = useState<string | null>(
  searchParams.get('job')
);

// On submit success:
function handleJobStarted(newJobId: string) {
  setJobId(newJobId);
  const params = new URLSearchParams(searchParams.toString());
  params.set('job', newJobId);
  router.replace(`${pathname}?${params.toString()}`, { scroll: false });
}
```

**Important:** `useSearchParams()` requires the component to be wrapped in `<Suspense>` when used in App Router — wrap `GenerationPage` at the page.tsx level.

```typescript
// app/page.tsx
import { Suspense } from 'react';
import { GenerationPage } from '@/components/GenerationPage';

export default function Home() {
  return (
    <Suspense fallback={null}>
      <GenerationPage />
    </Suspense>
  );
}
```

### Pattern 4: Server-Side WAV-to-MP3 Conversion

**What:** After downloading WAV buffer from RunPod, convert in-process using `ffmpeg-static` binary via Node.js `child_process`. Write WAV to a temp file, run ffmpeg, read MP3 output buffer, delete temp files.

**When to use:** Inside `/api/status/[jobId]/route.ts`, in the same loop that currently uploads WAV to R2.

```typescript
// Source: ffmpeg-static npm + Node.js child_process docs
import { execFile } from 'child_process';
import { promisify } from 'util';
import { writeFile, readFile, unlink } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
// @ts-ignore — ffmpeg-static has no types
import ffmpegPath from 'ffmpeg-static';

const execFileAsync = promisify(execFile);

export async function convertWavToMp3(wavBuffer: Buffer): Promise<Buffer> {
  const tmpIn = join(tmpdir(), `audio-in-${Date.now()}.wav`);
  const tmpOut = join(tmpdir(), `audio-out-${Date.now()}.mp3`);
  try {
    await writeFile(tmpIn, wavBuffer);
    await execFileAsync(ffmpegPath as string, [
      '-i', tmpIn,
      '-codec:a', 'libmp3lame',
      '-b:a', '320k',
      '-y',
      tmpOut,
    ]);
    return await readFile(tmpOut);
  } finally {
    await unlink(tmpIn).catch(() => {});
    await unlink(tmpOut).catch(() => {});
  }
}
```

### Pattern 5: Presigned Download URLs with Filename Override

**What:** Generate R2 presigned URLs with `ResponseContentDisposition` header to force browser to download with a descriptive filename rather than the R2 key basename.

```typescript
// Source: AWS SDK GetObjectCommand docs + Cloudflare R2 presigned URL docs
export async function getAudioPresignedUrl(
  key: string,
  downloadFilename?: string,
  expiresIn = 3600,
): Promise<string> {
  return getSignedUrl(
    r2Client,
    new GetObjectCommand({
      Bucket: env.R2_BUCKET_NAME,
      Key: key,
      ...(downloadFilename && {
        ResponseContentDisposition: `attachment; filename="${downloadFilename}"`,
      }),
    }),
    { expiresIn },
  );
}
```

### Pattern 6: Descriptive Download Filename Generation

**What:** Build a safe, descriptive filename from the generation prompt and variant index.

```typescript
// lib/filename.ts
export function buildDownloadFilename(
  promptText: string,
  variantIndex: number,
  ext: 'mp3' | 'wav',
): string {
  const slug = promptText
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')      // strip special chars
    .trim()
    .replace(/\s+/g, '-')              // spaces to hyphens
    .slice(0, 40);                     // cap length
  return `${slug}-variant-${variantIndex + 1}.${ext}`;
}
// e.g. "happy-jazz-birthday-variant-1.mp3"
```

### Anti-Patterns to Avoid

- **Instantiating WaveSurfer in a Server Component:** wavesurfer.js uses `document`, `window`, and Web Audio API. Always use `'use client'` on any component that mounts wavesurfer.
- **Using wavesurfer with `url` from a cross-origin source without CORS headers:** wavesurfer's Web Audio decode will fail with a CORS error even if `<audio src>` works. R2 must have CORS configured to allow the production domain.
- **Sharing a WaveSurfer instance between React renders:** Each `useWavesurfer` call creates its own instance. Do not attempt to share or reuse wavesurfer instances across components.
- **Memoizing plugins outside of useMemo:** The @wavesurfer/react docs explicitly state plugins must be wrapped in `useMemo` or defined outside the component because wavesurfer mutates plugin instances.
- **Running ffmpeg on Vercel without ffmpeg-static:** System ffmpeg is not available in Vercel serverless runtime. Must bundle via `ffmpeg-static`.
- **Skipping `<Suspense>` around components using useSearchParams:** Next.js 15/16 App Router throws a build error if useSearchParams is used outside Suspense. The page.tsx must wrap GenerationPage in `<Suspense>`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Waveform rendering | Custom canvas bar painter | wavesurfer.js barWidth/barGap options | Web Audio decode, canvas double-buffering, seek math are all handled |
| Audio playback state | Manual HTMLAudioElement management | wavesurfer.js `isPlaying`, `currentTime` from @wavesurfer/react | Race conditions on seek, mobile autoplay policies are already handled |
| WAV to MP3 | Custom PCM encoding loop | ffmpeg-static binary | LAME encoder, frame headers, ID3 tags, channel handling — 320 kbps correctly requires libmp3lame |
| URL-safe filename slugs | Custom regex sanitizer | The simple slug pattern above is sufficient (no npm package needed) | Scope is small; the pattern above handles all ASCII-only edge cases for music prompt text |
| Presigned URL filename control | Separate download API route | ResponseContentDisposition in GetObjectCommand | No proxy needed; R2 supports the response header override in presigned URLs |

**Key insight:** Do not proxy audio through Next.js for the waveform player. Let wavesurfer load the MP3 directly from the R2 presigned URL. The CORS headers on R2 are the correct solution — routing audio through Vercel would add unnecessary latency and cost.

---

## Common Pitfalls

### Pitfall 1: CORS Error on Waveform Decode (Critical)

**What goes wrong:** wavesurfer.js fetches the audio URL using the Fetch API to decode it via Web Audio for waveform generation. Even though the `<audio>` tag would work fine (media elements bypass CORS), wavesurfer's fetch request requires proper `Access-Control-Allow-Origin` headers from R2.

**Why it happens:** Web Audio API's `decodeAudioData` requires the response to not be opaque (i.e., not CORS-blocked). Native audio elements use a different network path that doesn't have this restriction.

**How to avoid:** Ensure R2 CORS policy includes the production domain (not just localhost:3000). The bucket already has CORS configured from Phase 1 for localhost — add `https://{production-domain}` to `AllowedOrigins` before production deploy.

**Warning signs:** In dev, audio plays but waveform shows as flat/empty line. Console shows `"blocked by CORS policy"` for the fetch of the presigned URL (but not the audio element src).

**R2 CORS rule needed:**
```json
[
  {
    "AllowedOrigins": ["http://localhost:3000", "https://your-production-domain.com"],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedHeaders": ["Range", "Content-Type"],
    "ExposeHeaders": ["Content-Length", "Content-Range", "Accept-Ranges"]
  }
]
```

### Pitfall 2: Vercel Function Size Limit with ffmpeg-static

**What goes wrong:** `ffmpeg-static` packages a pre-built ffmpeg binary (~60-80 MB). Vercel's serverless function size limit is 50 MB (compressed) / 250 MB (uncompressed). Including ffmpeg-static in the `/api/status` route bundle may exceed this.

**Why it happens:** Next.js bundles API routes. ffmpeg-static's binary is large.

**How to avoid:** Check function size after adding the dependency with `next build` and inspect `.next/server/chunks/`. If the limit is hit, move conversion to the RunPod pod (add a `/convert` endpoint that accepts a WAV file path and returns MP3 bytes). Alternatively, run conversion only in a separate Vercel function with `maxDuration` and `memory` configured.

**Warning signs:** `Error: The Serverless Function "api/status/[jobId]" is X MB which exceeds the maximum allowed size` on Vercel build.

**Fallback plan (RunPod conversion):**
- Add a `/convert_to_mp3` endpoint to the ACE-Step FastAPI server on the pod
- Call it from the status route after WAV download, passing the audio path
- Pod has system ffmpeg available (Ubuntu-based Docker images include it)

### Pitfall 3: useSearchParams Suspense Requirement

**What goes wrong:** `useSearchParams()` in App Router requires the component (or its closest ancestor) to be wrapped in `<Suspense>`. Without it, Next.js 15/16 throws a build error and the page fails to render.

**Why it happens:** Next.js App Router statically renders pages by default; `useSearchParams` is dynamic and requires client-side evaluation.

**How to avoid:** Wrap `GenerationPage` in `<Suspense fallback={null}>` in `app/page.tsx` (already a server component, zero cost to add Suspense there).

### Pitfall 4: Two WaveSurfer Instances Both Playing Audio

**What goes wrong:** Without explicit auto-pause coordination, both variant players can play simultaneously when a user starts Variant 2 while Variant 1 is already playing.

**Why it happens:** Each WaveSurfer instance is independent with its own HTMLAudioElement.

**How to avoid:** Use the `activeVariantId` state pattern described in Architecture Patterns — Pattern 2. The parent tracks which variant is active; each WaveformPlayer receives `isActive` and pauses itself in a `useEffect` when `!isActive && isPlaying`.

### Pitfall 5: Temp File Cleanup in ffmpeg Conversion

**What goes wrong:** If the ffmpeg execution throws an error, temp WAV/MP3 files on the Vercel instance's `/tmp` filesystem accumulate and can cause failures on subsequent calls.

**Why it happens:** Temp files are written to `/tmp` (the only writable path in Vercel functions). If not cleaned up in error paths, they persist for the lifetime of the warm instance.

**How to avoid:** Use a `try/finally` block that always deletes both temp files, catching deletion errors (`unlink` failures should not throw). See the `convertWavToMp3` example above.

### Pitfall 6: Presigned URL Expiry vs. DB Caching

**What goes wrong:** The status route re-generates presigned URLs every time the client polls while generation is pending. Once completed, the DB stores the R2 key but not the URL — the status route calls `getAudioPresignedUrl()` on each subsequent fetch of a completed job.

**Why it happens:** Current design (Phase 2): DB stores `r2Key`, not the presigned URL (correct — presigned URLs expire). But the 1-hour default expiry means a user who revisits via bookmarked URL after 1+ hour gets a working R2 key lookup but the browser's cached URL in the React component may be stale.

**How to avoid:** Set presigned URL expiry to 24 hours (86400 seconds) — long enough for a typical session. R2's maximum is 7 days (604800 seconds). The 24-hour window is a reasonable balance. Keep generating fresh presigned URLs on each status call (current pattern) — no additional change needed.

---

## Code Examples

### WaveSurfer Bar-Style Configuration (Verified Options)

```typescript
// Source: wavesurfer.js v7.12.1 TypeScript source (github.com/katspaugh/wavesurfer.js)
// Matches: waveColor as zinc-700, progressColor as violet-500
WaveSurfer.create({
  container: containerRef.current,
  waveColor: '#3f3f46',       // Tailwind zinc-700
  progressColor: '#8b5cf6',  // Tailwind violet-500
  barWidth: 3,               // pixels per bar
  barGap: 1,                 // pixels between bars
  barRadius: 2,              // rounded bar ends
  height: 64,                // pixels; or 'auto' to fill container
  normalize: true,           // stretch waveform to full height
  fillParent: true,          // stretch to container width (default: true)
  interact: true,            // enable click-to-seek (default: true)
  minPxPerSec: 0,            // no forced zoom
});
```

### @wavesurfer/react Hook Returns

```typescript
// Source: @wavesurfer/react@1.0.12 (github.com/katspaugh/wavesurfer-react)
const {
  wavesurfer,    // WaveSurfer instance | null
  isReady,       // boolean — audio decoded and ready to play
  isPlaying,     // boolean — currently playing
  currentTime,   // number — seconds elapsed
} = useWavesurfer({
  container: containerRef,  // RefObject<HTMLElement>
  url: 'https://...',
  waveColor: '...',
  // ... all WaveSurferOptions as props
  onReady: (ws) => { /* wavesurfer instance */ },
  onPlay: () => { /* callback */ },
  onPause: () => { /* callback */ },
  onFinish: () => { /* callback */ },
  onTimeupdate: (currentTime) => { /* callback, fires continuously */ },
  onError: (err) => { /* callback */ },
});
```

### Drizzle Schema Update for MP3

```typescript
// Source: existing src/db/schema.ts pattern
export const outputs = pgTable('outputs', {
  id: uuid('id').defaultRandom().primaryKey(),
  generationId: uuid('generation_id').notNull().references(() => generations.id, { onDelete: 'cascade' }),
  variantIndex: integer('variant_index').notNull(),
  r2Key: text('r2_key').notNull(),         // WAV key: generations/{id}/output_{i}.wav
  mp3R2Key: text('mp3_r2_key'),            // MP3 key: generations/{id}/output_{i}.mp3 (nullable — conversion may fail)
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [index('outputs_generation_idx').on(table.generationId)]);
```

### R2 Key for MP3

```typescript
// Extend existing buildR2Key in src/lib/r2.ts
export function buildR2Key(generationId: string, variantIndex: number): string {
  return `generations/${generationId}/output_${variantIndex}.wav`;
}

export function buildR2Mp3Key(generationId: string, variantIndex: number): string {
  return `generations/${generationId}/output_${variantIndex}.mp3`;
}
```

### useGenerationStatus Output Type Update

```typescript
// Update Output interface in src/hooks/useGenerationStatus.ts
interface Output {
  id: string;
  variantIndex: number;
  r2Key: string;
  url: string | null;         // WAV presigned URL
  mp3Url: string | null;      // MP3 presigned URL (null if conversion failed)
  createdAt: string;
  promptText?: string;        // for filename generation
  duration?: number;          // seconds, for display
  mp3FileSizeBytes?: number;  // for "4.8 MB MP3" display
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| wavesurfer.js v5/v6 (imperative, non-typed) | v7.x (TypeScript, Shadow DOM, HTMLAudioElement default) | v7.0 (2023) | Must use v7 API — `backend: 'MediaElement'` no longer opt-in, it's the default |
| Separate react-wavesurfer package (ShiiRochi/wavesurfer-react) | Official @wavesurfer/react from same maintainer | 2023 | Use @wavesurfer/react, not third-party wrappers |
| fluent-ffmpeg for Node audio conversion | fluent-ffmpeg archived May 2025 | May 2025 | Use child_process.execFile with ffmpeg-static directly |
| Presigned URL Content-Disposition as server header | ResponseContentDisposition in GetObjectCommand | Always supported | Set it in SDK, not via separate proxy route |

**Deprecated/outdated:**
- `wavesurfer.js` Markers plugin: Removed in v7 (use Regions instead)
- `backend: 'MediaElement'` as option: No longer needed — it's the default in v7
- `wavesurfer.load()` imperative method: Still exists but @wavesurfer/react handles it via `url` prop

---

## Validation Architecture

> `workflow.nyquist_validation` key is absent from `.planning/config.json` — treat as enabled.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | None detected — no jest.config.*, vitest.config.*, or test/ directory found |
| Config file | None — see Wave 0 |
| Quick run command | `npx vitest run --reporter=verbose` (after Wave 0 setup) |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PLAY-01 | WaveformPlayer renders without crashing | unit | `npx vitest run src/components/WaveformPlayer.test.tsx` | ❌ Wave 0 |
| PLAY-01 | Auto-pause: starting Variant 2 pauses Variant 1 | unit | `npx vitest run src/components/GenerationResults.test.tsx` | ❌ Wave 0 |
| PLAY-02 | convertWavToMp3 returns Buffer with mp3 magic bytes | unit | `npx vitest run src/lib/audio.test.ts` | ❌ Wave 0 |
| PLAY-02 | MP3 presigned URL returned in status response | integration | `npx vitest run src/app/api/status/route.test.ts` | ❌ Wave 0 |
| PLAY-03 | WAV download presigned URL includes content-disposition | unit | `npx vitest run src/lib/r2.test.ts` | ❌ Wave 0 |
| PLAY-01 | Seek via waveform click (end-to-end) | manual-only | Browser test — Web Audio + canvas cannot be unit tested headlessly | — |
| PLAY-01 | Waveform renders bars at correct color | manual-only | Visual regression — requires browser | — |

### Sampling Rate
- **Per task commit:** `npx vitest run --reporter=verbose`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `vitest.config.ts` — configure jsdom environment for React component tests
- [ ] `src/components/WaveformPlayer.test.tsx` — REQ PLAY-01 (mock wavesurfer.js)
- [ ] `src/components/GenerationResults.test.tsx` — REQ PLAY-01 auto-pause behavior
- [ ] `src/lib/audio.test.ts` — REQ PLAY-02 MP3 conversion (uses real ffmpeg-static)
- [ ] `src/lib/r2.test.ts` — REQ PLAY-03 presigned URL content-disposition
- [ ] `src/app/api/status/route.test.ts` — REQ PLAY-02 integration (mock R2 + RunPod)
- [ ] Framework install: `npm install --save-dev vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom`

---

## Open Questions

1. **Vercel function size with ffmpeg-static**
   - What we know: ffmpeg binary is ~60-80 MB; Vercel limit is 50 MB compressed / 250 MB uncompressed; the uncompressed limit may accommodate it
   - What's unclear: Next.js bundle splitting behavior for API routes and whether ffmpeg-static is tree-shaken or included in full
   - Recommendation: After `npm install ffmpeg-static`, run `next build` locally and check `.next/server/app/api/status/[jobId]/page.js` size before deploying. If it fails, fall back to RunPod-side conversion.

2. **R2 CORS for production domain**
   - What we know: R2 CORS is configured for `localhost:3000`; wavesurfer needs CORS to decode audio
   - What's unclear: Production domain is not yet set (project is pre-deploy)
   - Recommendation: Add a `*` wildcard or the Vercel preview domain to R2 CORS AllowedOrigins during Phase 3 development. Before production launch, lock it to the specific domain.

3. **MP3 file size estimation for display**
   - What we know: 320 kbps MP3 of a 120-second track ≈ (320,000 bits/s × 120s) / 8 = ~4.8 MB
   - What's unclear: Exact size depends on audio content; S3 HeadObject provides Content-Length but R2 presigned HEAD returns 403
   - Recommendation: Calculate estimated size from duration: `Math.round((320 * duration) / 8 / 1024)` KB. Store actual size when ffmpeg returns the MP3 buffer (`mp3Buffer.byteLength`). Return it from the status API.

---

## Sources

### Primary (HIGH confidence)
- `github.com/katspaugh/wavesurfer.js` — WaveSurferOptions interface, all options, all events (fetched directly from TypeScript source)
- `github.com/katspaugh/wavesurfer-react` README — @wavesurfer/react useWavesurfer hook API, WavesurferPlayer component, plugin memoization requirement
- `developers.cloudflare.com/r2/buckets/cors/` — R2 CORS configuration format, presigned URL CORS requirement, 7-day max expiry
- `developers.cloudflare.com/r2/api/s3/presigned-urls/` — R2 presigned URL 1s-7d range

### Secondary (MEDIUM confidence)
- WebSearch: wavesurfer.js v7 changelog — HTMLAudioElement as default backend, Shadow DOM rendering
- WebSearch: CORS blocked for wavesurfer (GitHub discussion #3673) — confirmed Web Audio API requires CORS, native audio element does not
- WebSearch: fluent-ffmpeg archived May 22, 2025 — confirmed repository read-only
- WebSearch: Next.js useSearchParams + useRouter App Router pattern — confirmed Suspense requirement
- WebSearch: Vercel serverless functions and ffmpeg-static 50 MB size issue (#53791) — confirmed deployment risk

### Tertiary (LOW confidence)
- WebSearch: lamejs 320 kbps support — research showed lamejs max ~128 kbps, not sufficient for locked 320 kbps requirement
- WebSearch: RunPod ffmpeg via pod shell — feasible but not verified against the specific ACE-Step Docker image

---

## Metadata

**Confidence breakdown:**
- Standard stack (wavesurfer.js): HIGH — verified against TypeScript source and official README
- Architecture (React integration): HIGH — @wavesurfer/react is first-party, patterns verified
- FFmpeg conversion: MEDIUM — approach is well-established but Vercel bundle size is a real unknown
- Pitfalls (CORS): HIGH — confirmed via official R2 docs and wavesurfer GitHub discussion
- URL persistence: HIGH — verified against Next.js official docs

**Research date:** 2026-03-04
**Valid until:** 2026-04-04 (30 days; wavesurfer and Next.js are stable)
