# Phase 17: Success Page - Research

**Researched:** 2026-03-06
**Domain:** Confetti animation, native audio playback, API polling, download mechanics, celebration UX
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Native `<audio>` element — no wavesurfer
- No DB reads — poll HeartMuLa directly via `queryJobStatus` from heartmula.ts
- Meaningful download filename (not UUID); include recipient name if possible (e.g. `notevra-song-for-sarah.mp3`)
- canvas-confetti package (listed in Phase 15 research as available)
- Warm, celebratory, gift-service feel
- This is the LAST phase of v3.0 — the complete funnel end-to-end must work
- Page must be refresh-safe — jobId in URL is the only state needed

### Claude's Discretion
- Whether to stream audio directly from HeartMuLa or upload to R2 first (existing R2 utilities available)
- Confetti style and timing (dramatic reveal vs immediate)
- Page layout and emotional copy
- Whether confetti fires on page load or after a brief reveal animation
- "Create Another Song" behavior (clear all data vs keep some)
- Social sharing prompt approach (record reaction vs share link vs both)
- Any additional CTAs on the page
- Poll interval and timeout for HeartMuLa job completion
- What to show while waiting for generation to complete
- Error/timeout handling UX

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SUCC-01 | Confetti animation plays on page load | canvas-confetti imperative API via useEffect on mount; brand colors for particles |
| SUCC-02 | Song playback via native audio player (not wavesurfer) | Native `<audio>` element + controlled state; API proxy route delivers audio/mpeg stream |
| SUCC-03 | MP3 download button for the generated song | `buildDownloadFilename` utility + anchor tag download attribute OR blob fetch pattern; recipient name via URL param |
| SUCC-04 | "Create Another Song" CTA button | `router.push('/quiz')` + `localStorage.removeItem('notevra_quiz_v1')` for fresh state |
| SUCC-05 | Social sharing prompt (record their reaction) | Static UI section — no Web Share API needed; emotional copy + optional clipboard copy of page URL |
</phase_requirements>

---

## Summary

Phase 17 closes the v3.0 gift funnel. The success page at `/quiz/success/[jobId]` must convert from a server-rendered scaffold into a client component that polls HeartMuLa directly (no DB), plays audio natively, fires confetti, and allows download and sharing. All five requirements are well-covered by the existing codebase — `heartmula.ts`, `filename.ts`, and `framer-motion` are already installed. The only missing package is `canvas-confetti` (plus `@types/canvas-confetti` for TypeScript).

The highest architectural decision is audio delivery: stream from HeartMuLa directly via an API proxy route vs. upload to R2 first. **Recommendation: use a lightweight Next.js API proxy route (`/api/audio/[jobId]`) that pipes HeartMuLa's `/download_track/{jobId}` response to the browser.** This avoids the R2 upload latency and AWS SDK credential complexity while keeping HeartMuLa's internal URL hidden from the client. R2 upload is a future concern when persistence matters (payments phase).

The second key finding is recipient name availability. Phase 16's `quiz/page.tsx` clears `localStorage.removeItem('notevra_quiz_v1')` immediately after a successful API response — before the redirect. This means `notevra_quiz_v1` will NOT be available on the success page. The planner must pass `recipientName` as a URL search param (e.g., `/quiz/success/{jobId}?name=Sarah`) during the Phase 16 redirect, or the download filename falls back to a generic slug.

**Primary recommendation:** Client component with `useEffect` polling loop at 2s intervals → on COMPLETED render confetti + show player. Recipient name from `searchParams`. Audio served via `/api/audio/[jobId]` proxy route.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| canvas-confetti | ^1.9.4 | Imperative confetti bursts | Industry standard; zero deps; direct DOM canvas API |
| @types/canvas-confetti | ^1.9.0 | TypeScript types for canvas-confetti | Required — types not bundled with library |
| framer-motion | ^12.35.0 | Reveal animation before confetti fires | Already installed; used across quiz pages |
| lucide-react | ^0.577.0 | Download, share, play icons | Already installed project-wide |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| react (built-in hooks) | 19.2.3 | useEffect polling, useState for audio state | All interactive behavior |
| next/navigation | (built-in) | useRouter for "Create Another Song" nav | Client-side navigation |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| canvas-confetti | react-confetti | react-confetti is DOM-based with React component model — heavier, no imperative API |
| canvas-confetti | @tsparticles/confetti | More powerful but 40KB larger; overkill for a one-time burst |
| API proxy route | R2 presigned URL | R2 requires upload step, AWS SDK on hot path, adds ~500ms latency |
| API proxy route | Direct HeartMuLa URL in `<audio src>` | Exposes internal URL to browser; CORS issues from RunPod |

**Installation:**
```bash
npm install canvas-confetti @types/canvas-confetti
```

---

## Architecture Patterns

### Recommended Project Structure
```
src/app/quiz/success/[jobId]/
├── page.tsx              # 'use client' — replaces scaffold, orchestrates polling + UI
└── _components/
    ├── ConfettiBlast.tsx # canvas-confetti imperative component — fires on mount
    ├── SongPlayer.tsx    # native <audio> with play/pause + progress bar
    └── SharePrompt.tsx   # "Record their reaction" static section

src/app/api/audio/[jobId]/
└── route.ts              # GET — proxy HeartMuLa /download_track/{jobId}
```

### Pattern 1: Polling State Machine in 'use client'
**What:** Success page is a client component with a polling loop. State machine has 4 states: `loading | ready | error | timeout`.
**When to use:** When the page may load before generation completes (jobId in URL, song still processing).

```typescript
// Source: project pattern from quiz/page.tsx + research
'use client';

import { useState, useEffect, useRef } from 'react';
import { useReducedMotion } from '@/hooks/useReducedMotion';

type PageState = 'loading' | 'ready' | 'error' | 'timeout';
const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 120_000; // 2 minutes — generous for cold RunPod starts

export default function SuccessPage({ params, searchParams }: SuccessPageProps) {
  const { jobId } = use(params);
  const recipientName = use(searchParams).name ?? '';
  const [pageState, setPageState] = useState<PageState>('loading');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const startedAt = useRef(Date.now());

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      while (!cancelled) {
        if (Date.now() - startedAt.current > POLL_TIMEOUT_MS) {
          if (!cancelled) setPageState('timeout');
          return;
        }

        try {
          const res = await fetch(`/api/poll-job/${jobId}`);
          const data = await res.json() as { status: string; error?: string };

          if (data.status === 'COMPLETED') {
            if (!cancelled) {
              setAudioUrl(`/api/audio/${jobId}`);
              setPageState('ready');
            }
            return;
          }
          if (data.status === 'FAILED') {
            if (!cancelled) setPageState('error');
            return;
          }
        } catch {
          // Network blip — continue polling
        }

        await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));
      }
    }

    void poll();
    return () => { cancelled = true; };
  }, [jobId]);
  // ...
}
```

### Pattern 2: canvas-confetti Imperative Burst
**What:** Fire confetti once when `pageState` transitions to `ready`. Single `useEffect` with `[pageState]` dependency.
**When to use:** On success reveal — not on every render.

```typescript
// Source: canvas-confetti 1.9.4 docs + React useEffect pattern
'use client';

import confetti from 'canvas-confetti';

function ConfettiBlast() {
  useEffect(() => {
    // Dual burst from two top corners — celebratory without being distracting
    void confetti({
      particleCount: 80,
      spread: 70,
      origin: { x: 0.3, y: 0.4 },
      colors: ['#7bb8f5', '#fde68a', '#ffffff', '#93c5fd'],  // brand blue + yellow
    });
    void confetti({
      particleCount: 80,
      spread: 70,
      origin: { x: 0.7, y: 0.4 },
      colors: ['#7bb8f5', '#fde68a', '#ffffff', '#93c5fd'],
    });
  }, []);

  return null; // Canvas is appended to body by the library
}
```

**Note on colors:** canvas-confetti requires HEX strings. Brand tokens are OKLCH — convert:
- `--blue-500` (oklch 0.72 0.12 220) → approximately `#4a90d9` — use a hand-coded approximation
- `--yellow-400` (oklch 0.82 0.17 88) → approximately `#f5d060`
- Use `#ffffff` for white particles

### Pattern 3: Native Audio Player with Controlled State
**What:** `<audio>` element with React ref + play/pause button + progress bar via `timeupdate` event.
**When to use:** Always — no wavesurfer in v3.0.

```typescript
// Source: MDN HTMLAudioElement API + project pattern
'use client';

import { useRef, useState, useEffect } from 'react';

interface SongPlayerProps {
  src: string;
  autoPlay?: boolean;
}

export function SongPlayer({ src, autoPlay = false }: SongPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0); // 0-100

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => {
      if (audio.duration) {
        setProgress((audio.currentTime / audio.duration) * 100);
      }
    };
    const onEnded = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('ended', onEnded);
    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('ended', onEnded);
    };
  }, []);

  function togglePlay() {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) { audio.pause(); setIsPlaying(false); }
    else { void audio.play(); setIsPlaying(true); }
  }

  return (
    <div>
      <audio ref={audioRef} src={src} preload="metadata" />
      {/* Progress bar + play/pause controls here */}
    </div>
  );
}
```

### Pattern 4: Audio Proxy Route
**What:** Next.js Route Handler at `/api/audio/[jobId]` fetches `fetchAudioBuffer(jobId)` server-side and pipes the buffer to the client with correct headers.
**When to use:** Always — keeps HeartMuLa URL internal.

```typescript
// Source: Next.js Route Handler docs + fetchAudioBuffer from heartmula.ts
import { NextRequest, NextResponse } from 'next/server';
import { fetchAudioBuffer } from '@/lib/heartmula';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
): Promise<NextResponse> {
  const { jobId } = await params;
  try {
    const buffer = await fetchAudioBuffer(jobId);
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Audio not available' }, { status: 502 });
  }
}
```

### Pattern 5: Lightweight HeartMuLa Poll Route
**What:** A NEW `GET /api/poll-job/[jobId]` route that calls `queryJobStatus(jobId)` from heartmula.ts and returns `{ status, error }`. This is separate from the old `/api/status/[jobId]` (which reads from DB — unusable in v3.0).

```typescript
// Source: queryJobStatus from heartmula.ts — project pattern
import { NextRequest, NextResponse } from 'next/server';
import { queryJobStatus } from '@/lib/heartmula';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
): Promise<NextResponse> {
  const { jobId } = await params;
  try {
    const result = await queryJobStatus(jobId);
    return NextResponse.json({ status: result.status, error: result.error_msg ?? null });
  } catch {
    return NextResponse.json({ status: 'QUEUED', error: null }); // treat poll failure as still-running
  }
}
```

### Pattern 6: Download with Meaningful Filename
**What:** Anchor `download` attribute triggers browser save dialog with a custom filename. `buildDownloadFilename` needs to be extended/replaced for recipient-name-based filenames.

```typescript
// Source: filename.ts + MDN anchor download attribute
function buildGiftFilename(recipientName: string): string {
  const slug = recipientName
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 30) || 'someone-special';
  return `notevra-song-for-${slug}.mp3`;
}

// In component:
<a href={`/api/audio/${jobId}`} download={buildGiftFilename(recipientName)}>
  Download MP3
</a>
```

**Note:** The `download` attribute on `<a>` works for same-origin URLs. Since `/api/audio/[jobId]` is same-origin (proxied), this works correctly.

### Pattern 7: "Create Another Song" Navigation
**What:** Clear localStorage key + navigate to `/quiz`. The key `notevra_quiz_v1` is set in quiz/page.tsx.

```typescript
function handleCreateAnother() {
  try {
    localStorage.removeItem('notevra_quiz_v1');
  } catch {
    // Storage unavailable — proceed anyway
  }
  router.push('/quiz');
}
```

### Anti-Patterns to Avoid
- **Direct HeartMuLa URL in `<audio src>`:** Exposes internal RunPod URL to browser. CORS from RunPod is not configured for browser requests, only server-to-server.
- **Using old `/api/status/[jobId]`:** That route queries DB via Drizzle. No DB in v3.0 — will throw a Drizzle/Postgres error.
- **Reading localStorage for recipient name on success page:** Phase 16 clears localStorage before redirecting. Storage is empty on arrival.
- **Calling `confetti()` on every render:** Use `useEffect` with `[]` dependency on the `ConfettiBlast` component — only renders when `pageState === 'ready'`.
- **`autoplay` attribute on `<audio>`:** Browsers block autoplay for audio without user interaction. Use a prominent play button instead.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Confetti particles | Custom canvas particle system | `canvas-confetti` | Physics, decay, gravity, spread all handled |
| Audio progress tracking | Custom timeupdate polling | Native `timeupdate` event on `<audio>` | Already fires at browser's internal rate |
| Download with filename | Fetch + createObjectURL + revoke | `<a download="filename.mp3" href="/api/audio/...">` | Same-origin href + download attribute is simpler and works |
| Polling abort on unmount | Manual AbortController per poll | `cancelled` boolean ref in loop | Simpler, avoids AbortController noise for non-fetch async |

**Key insight:** The native `<audio>` element's event API (`timeupdate`, `ended`, `canplay`, `error`) covers all player state without custom tracking. The only React concern is keeping DOM events and state in sync.

---

## Critical Finding: Recipient Name Gap

Phase 16 (`quiz/page.tsx` line 111) calls `localStorage.removeItem(QUIZ_STORAGE_KEY)` immediately after a successful API response, THEN calls `router.push('/quiz/success/${jobId}')`. This means:

**`notevra_quiz_v1` is always empty when the success page loads.**

The planner must address this in the Phase 16 redirect step. Two options:

1. **URL search param (recommended):** Change Phase 16's redirect to `router.push(\`/quiz/success/${jobId}?name=${encodeURIComponent(data.recipientName)}\`)`. Success page reads from `searchParams.name`. Simple, refresh-safe.

2. **Re-read before clear:** Read `recipientName` from data state before clearing, embed in URL. Same result.

This is a cross-phase dependency. The Phase 17 planner must include a task that modifies `quiz/page.tsx` to add `?name=` to the redirect URL, OR document this gap if they choose to handle it as a two-plan sequence.

---

## Common Pitfalls

### Pitfall 1: Polling Never Stops
**What goes wrong:** If `cancelled` boolean is not set in cleanup, the while-loop continues after the component unmounts (React Strict Mode double-mounts make this visible immediately).
**Why it happens:** `useEffect` cleanup only runs on unmount; async loops don't know they should stop.
**How to avoid:** Always check `if (cancelled) return` at the top of the async loop and in the success/failure branches. Use a `let cancelled = false` closure ref, not `useRef`, for simplicity.
**Warning signs:** Console shows multiple "COMPLETED" log lines; network tab shows duplicate poll requests after unmount.

### Pitfall 2: Audio Not Found on First Render
**What goes wrong:** `pageState` transitions to `ready` and `audioUrl` is set, but the audio proxy route returns 502 because HeartMuLa's job file isn't ready for download yet even though status is COMPLETED.
**Why it happens:** There can be a brief window between status = COMPLETED and the file being downloadable from HeartMuLa.
**How to avoid:** Add a 500ms buffer after COMPLETED status before setting `audioUrl`. Or handle `<audio>` error event gracefully with retry.
**Warning signs:** Audio element fires `error` event immediately after src is set.

### Pitfall 3: confetti() called in SSR
**What goes wrong:** If canvas-confetti is imported in a module that runs server-side, it throws because `window` is undefined.
**Why it happens:** Next.js runs module-level code during SSR even for client components during their static shell generation phase.
**How to avoid:** Always call `confetti()` only inside `useEffect`. Never at module top level. The import itself is fine in 'use client' components. Alternatively use dynamic import with `{ ssr: false }` as extra safety.

### Pitfall 4: Download Attribute Fails for Cross-Origin
**What goes wrong:** If audio URL points directly to HeartMuLa or R2 (different origin), the `download` attribute is ignored by the browser and it opens the file instead.
**Why it happens:** Security: browsers only honor `download` for same-origin or data: URLs.
**How to avoid:** Always serve audio through the Next.js proxy route (`/api/audio/[jobId]`). Same-origin. `download` attribute works.

### Pitfall 5: react/next params are Promises in Next 15+
**What goes wrong:** TypeScript error — `params.jobId` is not available directly; must `await params` or use `React.use(params)`.
**Why it happens:** Next.js 15 made route params async. The existing scaffold already uses `Promise<{ jobId: string }>` correctly.
**How to avoid:** The scaffold already shows the right pattern. In 'use client' components, use `React.use(params)` instead of `await` (which requires async component). See quiz/success scaffold.

---

## Code Examples

### Full Polling Loop (complete, production-safe)
```typescript
// Source: project pattern + research
useEffect(() => {
  let cancelled = false;
  const start = Date.now();

  async function poll() {
    while (!cancelled) {
      if (Date.now() - start > POLL_TIMEOUT_MS) {
        if (!cancelled) setPageState('timeout');
        return;
      }

      try {
        const res = await fetch(`/api/poll-job/${jobId}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json() as { status: string };

        if (!cancelled) {
          if (json.status === 'COMPLETED') {
            setAudioUrl(`/api/audio/${jobId}`);
            setPageState('ready');
            return;
          }
          if (json.status === 'FAILED') {
            setPageState('error');
            return;
          }
        }
      } catch {
        // Network blip — keep polling
      }

      await new Promise<void>(r => setTimeout(r, POLL_INTERVAL_MS));
    }
  }

  void poll();
  return () => { cancelled = true; };
}, [jobId]);
```

### Confetti with Brand Colors
```typescript
// Source: canvas-confetti 1.9.4 API + brand primitives research
import confetti from 'canvas-confetti';

// Fire on first render — wrap in 'use client' component
useEffect(() => {
  const BRAND_COLORS = ['#4a90d9', '#f5d060', '#ffffff', '#7bb8f5'];

  // Left burst
  void confetti({ particleCount: 80, spread: 70, origin: { x: 0.25, y: 0.5 }, colors: BRAND_COLORS });
  // Right burst — slight delay for visual interest
  setTimeout(() => {
    void confetti({ particleCount: 80, spread: 70, origin: { x: 0.75, y: 0.5 }, colors: BRAND_COLORS });
  }, 150);
}, []);
```

### Reduced Motion Guard for Confetti
```typescript
// Source: useReducedMotion hook (project existing)
const reducedMotion = useReducedMotion();

useEffect(() => {
  if (reducedMotion) return; // Skip confetti for accessibility
  void confetti({ particleCount: 80, spread: 70, origin: { x: 0.5, y: 0.5 } });
}, [reducedMotion]);
```

### Progress Bar with Native Audio
```typescript
// Source: MDN HTMLAudioElement.timeupdate event
const [currentTime, setCurrentTime] = useState(0);
const [duration, setDuration] = useState(0);

// In useEffect:
audio.addEventListener('timeupdate', () => setCurrentTime(audio.currentTime));
audio.addEventListener('loadedmetadata', () => setDuration(audio.duration));

// In JSX:
<div className="w-full bg-muted rounded-full h-1">
  <div
    className="bg-primary h-1 rounded-full transition-all"
    style={{ width: duration ? `${(currentTime / duration) * 100}%` : '0%' }}
  />
</div>
```

---

## Audio Delivery Decision: Proxy vs R2

**Decision (Claude's discretion): Use API proxy route — no R2 upload.**

| Factor | Proxy Route | R2 Upload |
|--------|------------|-----------|
| Latency to first byte | ~100-200ms (direct pipe) | +500-1500ms (buffer → S3 PUT → presigned URL → redirect) |
| Code complexity | 15 lines | 50+ lines, S3 client config |
| Persistence | None — file only in HeartMuLa pod | 24h+ via presigned URL |
| Cost | None | R2 PUT + storage |
| Refresh-safe? | Yes (jobId in URL) | Yes (presigned URL stored somewhere) |
| v3.0 constraint match | Good — no DB, no persistence | Over-engineered for UX validation phase |

R2 upload makes sense when jobs need persistence past HeartMuLa pod lifecycle (future payments phase). For v3.0, proxy is correct.

---

## Loading State UX Recommendation

Three distinct loading states needed on the success page:

| State | Condition | UI |
|-------|-----------|-----|
| `loading` | Job still QUEUED or PROCESSING | Animated music note + "Creating your song for [Name]..." copy (reuse GeneratingOverlay style) |
| `ready` | COMPLETED — audio available | Full celebration UI with confetti + player + CTAs |
| `error` | FAILED | Warm error message + "Try Again" link back to /quiz |
| `timeout` | > 2 min and no completion | "This is taking longer than expected" + option to try again |

**Loading copy ideas (personalized):**
- "Your song for [Name] is being composed..."
- "The AI is adding the finishing touches..."
- "Almost ready — this takes about 10 seconds on first generation"

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| WaveSurfer.js for playback | Native `<audio>` element | v3.0 decision | Simpler, no WASM, no canvas init race |
| DB polling via `/api/status/[jobId]` | Direct HeartMuLa poll via new `/api/poll-job/[jobId]` | v3.0 (no DB) | Removes Drizzle dependency from hot path |
| next/params sync access | `React.use(params)` in client | Next.js 15 | Scaffold already updated |

**Deprecated in this phase:**
- `/api/status/[jobId]` — built for v2.0 DB-backed generations; not used in v3.0

---

## Open Questions

1. **Phase 16 redirect URL — who fixes it?**
   - What we know: Phase 16's `quiz/page.tsx` redirects to `/quiz/success/${jobId}` without `?name=`
   - What's unclear: Does Phase 17's plan include modifying Phase 16 code, or is it a separate task?
   - Recommendation: Phase 17 Plan 1 should include a "patch Phase 16 redirect" task as its first step. It's a 1-line change but is blocking for personalized filenames.

2. **HeartMuLa file availability after COMPLETED status**
   - What we know: `/download_track/{jobId}` is the endpoint; heartmula.ts implements `fetchAudioBuffer`
   - What's unclear: Is there any delay between COMPLETED status and downloadable file?
   - Recommendation: Add error handling on `<audio>` src load failure with user-friendly retry.

3. **RunPod pod lifecycle**
   - What we know: RunPod pod has restart policy for memory leaks
   - What's unclear: If the pod restarts mid-poll, does `queryJobStatus` for an old jobId return FAILED or error out?
   - Recommendation: Treat any 5xx from `/api/poll-job` as transient (keep polling, not error state).

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.0.18 + jsdom + @testing-library/react |
| Config file | `vitest.config.ts` (project root) |
| Quick run command | `npx vitest run src/app/quiz/success` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SUCC-01 | Confetti fires when pageState = ready | unit | `npx vitest run src/app/quiz/success/[jobId]/page.test.tsx` | ❌ Wave 0 |
| SUCC-02 | Audio player renders with src when ready | unit | `npx vitest run src/app/quiz/success/[jobId]/page.test.tsx` | ❌ Wave 0 |
| SUCC-03 | Download link has correct filename and href | unit | `npx vitest run src/app/quiz/success/[jobId]/page.test.tsx` | ❌ Wave 0 |
| SUCC-04 | Create Another Song clears storage + navigates | unit | `npx vitest run src/app/quiz/success/[jobId]/page.test.tsx` | ❌ Wave 0 |
| SUCC-05 | Share prompt section renders | unit | `npx vitest run src/app/quiz/success/[jobId]/page.test.tsx` | ❌ Wave 0 |
| SUCC-02 | /api/audio/[jobId] returns audio/mpeg | unit | `npx vitest run src/app/api/audio` | ❌ Wave 0 |
| polling | /api/poll-job/[jobId] returns status shape | unit | `npx vitest run src/app/api/poll-job` | ❌ Wave 0 |

**Note on canvas-confetti in tests:** `canvas-confetti` uses browser canvas APIs unavailable in jsdom. Mock it:
```typescript
// In test file or test-setup.ts
vi.mock('canvas-confetti', () => ({ default: vi.fn() }));
```

### Sampling Rate
- **Per task commit:** `npx vitest run src/app/quiz/success`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/app/quiz/success/[jobId]/page.test.tsx` — covers SUCC-01 through SUCC-05
- [ ] `src/app/api/audio/[jobId]/route.test.ts` — covers audio proxy behavior
- [ ] `src/app/api/poll-job/[jobId]/route.test.ts` — covers poll status passthrough

---

## Sources

### Primary (HIGH confidence)
- `src/lib/heartmula.ts` (project code) — `queryJobStatus`, `fetchAudioBuffer` signatures verified directly
- `src/lib/filename.ts` (project code) — `buildDownloadFilename` signature and sanitization logic
- `src/app/quiz/page.tsx` (project code) — confirmed localStorage clear before redirect (line 111)
- `src/app/api/status/[jobId]/route.ts` (project code) — confirmed DB dependency, unusable in v3.0
- canvas-confetti GitHub README (fetched) — v1.9.4 API options verified: `particleCount`, `spread`, `origin`, `colors`, `shapes`
- `package.json` (project code) — confirmed canvas-confetti NOT yet installed; framer-motion 12.35 installed

### Secondary (MEDIUM confidence)
- canvas-confetti official demo page (kirilv.com) — multi-burst patterns and color arrays verified
- MDN HTMLAudioElement — `timeupdate`, `loadedmetadata`, `ended` events are stable web APIs
- Next.js Route Handler docs — `new NextResponse(buffer, { headers })` pattern for binary responses
- WebSearch results — canvas-confetti useEffect on mount pattern confirmed by multiple React tutorials

### Tertiary (LOW confidence)
- HeartMuLa file availability after COMPLETED status — not verifiable without live testing
- Exact HEX approximations for OKLCH brand colors — hand-calculated, not measured

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — package.json confirms installed libs; canvas-confetti API directly verified from GitHub README
- Architecture (polling, proxy): HIGH — built on existing project patterns from heartmula.ts and quiz/page.tsx
- Audio delivery decision: HIGH — tradeoffs are well understood; proxy is clearly correct for v3.0
- Recipient name gap: HIGH — directly verified in quiz/page.tsx line 111
- Pitfalls: HIGH — directly derived from project constraints and browser API specs

**Research date:** 2026-03-06
**Valid until:** 2026-04-06 (stable — Next.js, canvas-confetti, and Web Audio APIs are not fast-moving)
