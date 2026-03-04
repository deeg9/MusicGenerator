# Phase 2: Generation API - Research

**Researched:** 2026-03-04
**Domain:** React 19 / Next.js 16 App Router frontend, ACE-Step format_input integration, polling hooks
**Confidence:** HIGH (codebase is concrete, ACE-Step behavior confirmed via MEMORY.md)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Input form design**
- Two modes: Simple and Custom, with a visible toggle built in Phase 2
- Simple mode: text prompt + genre tag chips + duration preset selector + instrumental toggle
- Custom mode: adds a free-form lyrics textarea with [Verse]/[Chorus]/[Bridge] tag hints shown inline
- Genre input: preset chips (mood + genre mix, ~10 chips) that are multi-selectable, plus a custom text field for additional tags
- Preset genre chips: mood + genre mix (e.g., Happy, Sad, Chill, Energetic, Romantic, Pop, Rock, Jazz, Hip-Hop, Electronic)

**Duration presets**
- Three presets only, no custom slider
- Short (1 min) = 60s, Standard (2 min) = 120s, Full (4 min) = 240s
- Labels show name + time: "Short (1 min)" / "Standard (2 min)" / "Full (4 min)"
- Default selection: Standard (2 min)

**Genre/style tag handling**
- Use ACE-Step's `/format_input` endpoint to LLM-enhance the user's prompt + genre tags into a full caption with BPM, key, time signature
- Show the enhanced caption to the user in a read-only area (transparency)
- Selected genre chips + custom text tags are combined and sent alongside the prompt to format_input

**Polling & results UX**
- Frontend polls `/api/status/:jobId` every 2.5 seconds using a custom `useGenerationStatus(jobId)` React hook
- During generation: show "Generating your song..." with elapsed time counter
- Two variants displayed side by side as cards when complete
- Each variant card includes basic HTML `<audio>` element with native controls + download link (Phase 3 replaces with waveform player)
- Form stays visible above results — user can tweak inputs and regenerate immediately

### Claude's Discretion
- Exact layout/spacing of form controls
- Genre chip visual style
- Enhanced caption display styling
- Error state presentation
- Mobile responsive behavior for side-by-side cards (may stack on narrow screens)

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| GEN-01 | User can generate a song by describing a vibe in plain text | Simple mode form → POST /api/generate with prompt; existing route needs format_input wiring |
| GEN-02 | User can generate a song by providing custom lyrics with structure tags ([Verse], [Chorus], [Bridge]) | Custom mode textarea; lyrics sent as-is to format_input then ACE-Step |
| GEN-03 | User can specify genre/style via freeform tags (e.g., "jazz", "hip-hop", "cinematic") | Chip multi-select + text field; genre tags concatenated and sent to format_input alongside prompt |
| GEN-04 | User can choose song duration (Short ~1min, Standard ~2min, Full ~4min) | Three-button preset selector maps to 60/120/240; existing route already accepts duration param |
| GEN-05 | User can toggle instrumental mode (no vocals) | Toggle maps instrumental=true → resolved lyrics becomes "[Instrumental]" (already implemented in route) |
| GEN-06 | User receives 2 song variants per generation (dual output) | batchSize=2 already hardcoded in existing generate route; status route returns both outputs |
</phase_requirements>

---

## Summary

Phase 2 is predominantly a frontend build. The backend API routes (`/api/generate`, `/api/status/:jobId`, `/api/audio/:key`) are **already implemented and working** from Phase 1. The primary gap is:

1. **format_input wiring** — the existing `/api/generate` route submits directly to ACE-Step without calling `/format_input` first. Phase 2 must call `/format_input` to get an LLM-enhanced caption (with BPM, key, time signature) before submitting the generation job.
2. **Frontend page** — `src/app/page.tsx` is a placeholder. Phase 2 replaces it with the full generation UI: mode toggle, form controls, polling, and results display.
3. **`useGenerationStatus` hook** — encapsulates the 2.5s polling loop against `/api/status/:jobId`.

The stack is Next.js 16.1.6 with React 19.2, Tailwind CSS v4, TypeScript — no new dependencies needed. All patterns use existing project conventions (App Router, Drizzle, manual validation, `classifyError`/`toErrorResponse`).

**Primary recommendation:** Build in three plans: (1) format_input integration in the BFF, (2) frontend form components and page layout, (3) polling hook + results display wiring.

---

## Standard Stack

### Core (already in project — no installs needed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js App Router | 16.1.6 | Page and API routing | Already in use; App Router is the locked pattern |
| React | 19.2.3 | Component rendering, hooks | Project baseline |
| Tailwind CSS | v4 | Styling | Project baseline; v4 is utility-first with new `@layer` and `@theme` APIs |
| TypeScript | 5.x | Type safety | Project baseline |
| Drizzle ORM | 0.45.1 | Database reads | Already used in status route for generation lookups |

### No New Dependencies Required

All Phase 2 needs are met by what is already installed:
- HTML `<audio>` element (native browser) handles playback — no audio library needed
- Chip multi-select is hand-rolled with Tailwind (no headlessui or radix needed for this scope)
- Polling uses `setInterval` + `useRef` + `useEffect` — no SWR or react-query needed

## Architecture Patterns

### Recommended File Structure for Phase 2

```
src/
├── app/
│   ├── page.tsx                      # Replace placeholder — full generation page
│   └── api/
│       └── generate/
│           └── route.ts              # MODIFY: add format_input call before submitGenerationJob
├── components/
│   ├── GenerationForm.tsx            # "use client" — form with mode toggle, chips, textarea
│   ├── ModeToggle.tsx                # Simple/Custom toggle button pair
│   ├── GenreChips.tsx                # Multi-select chip grid + custom text input
│   ├── DurationPreset.tsx            # Three-button preset selector
│   ├── LyricsTextarea.tsx            # Custom mode textarea with tag hints
│   ├── GenerationResults.tsx         # "use client" — polling state + variant card display
│   ├── VariantCard.tsx               # Single audio card with <audio> + download link
│   └── EnhancedCaptionDisplay.tsx    # Read-only display of format_input result
├── hooks/
│   └── useGenerationStatus.ts        # "use client" hook — 2.5s polling loop
└── lib/
    └── runpod.ts                     # MODIFY: add callFormatInput() function
```

### Pattern 1: format_input Call in BFF

**What:** `/api/generate` calls ACE-Step's `/format_input` endpoint first, gets enhanced caption + BPM/key/time signature, then calls `/release_task` with the enhanced values.

**When to use:** Always — every generation flows through format_input to get structured metadata.

**Confirmed ACE-Step behavior (from MEMORY.md):**
- Endpoint: `POST /format_input`
- Response: JSON with `caption` (enhanced), `bpm`, `keyscale`, `timesignature`, `lyrics`, `language`
- The enhanced caption is what gets sent as `prompt` to `/release_task`

**Example flow:**
```typescript
// In runpod.ts — new function
export interface FormatInputParams {
  prompt: string;    // user's vibe description
  lyrics: string;    // user's lyrics OR "[Instrumental]"
  tags?: string;     // genre tags combined as comma-separated string
}

export interface FormatInputResult {
  caption: string;        // LLM-enhanced caption — send this as `prompt` to /release_task
  bpm: number | string;
  keyscale: string;       // e.g. "C major"
  timesignature: string;  // e.g. "4"
  lyrics: string;         // may be reformatted
  language: string;
}

export async function callFormatInput(params: FormatInputParams): Promise<FormatInputResult> {
  const response = await fetch(`${env.RUNPOD_URL}/format_input`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt: params.tags ? `${params.prompt}, ${params.tags}` : params.prompt,
      lyrics: params.lyrics,
    }),
    signal: createTimeoutSignal(30_000),
  });

  if (!response.ok) {
    throw new Error(`ACE-Step format_input failed: HTTP ${response.status}`);
  }

  // Response wraps in { data: {...}, code: 200, error: null }
  const raw = (await response.json()) as { data: FormatInputResult; code: number; error: string | null };
  return raw.data;
}
```

**Updated /api/generate flow:**
```
1. Validate request (existing validateRequest function)
2. Resolve lyrics: instrumental ? "[Instrumental]" : rawLyrics ?? ""
3. Call callFormatInput({ prompt, lyrics: resolvedLyrics, tags: genreTags })
4. Extract enhanced caption, bpm, keyscale, timesignature from result
5. Store enhanced caption in DB (new optional column OR log only — see pitfalls)
6. Call submitGenerationJob({ prompt: enhancedCaption, lyrics: result.lyrics, bpm, keyScale, timeSignature, audioDuration })
7. Return { jobId, status: "pending", enhancedCaption } — frontend displays it
```

### Pattern 2: useGenerationStatus Hook

**What:** Custom React hook that polls `/api/status/:jobId` every 2.5 seconds, stops on terminal state.

**When to use:** Mounted after form submit returns a jobId.

```typescript
// Source: Standard React polling pattern with cleanup
// src/hooks/useGenerationStatus.ts
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

type GenerationStatus = 'pending' | 'processing' | 'completed' | 'failed';

interface Output {
  id: string;
  variantIndex: number;
  r2Key: string;
  url: string | null;
  createdAt: string;
}

interface StatusResult {
  jobId: string;
  status: GenerationStatus;
  startedAt: string;
  completedAt: string | null;
  failedAt: string | null;
  outputs: Output[];
  error: { category: string; retryable: boolean; message: string } | null;
}

interface UseGenerationStatusReturn {
  data: StatusResult | null;
  isPolling: boolean;
  elapsedSeconds: number;
  error: string | null;
}

export function useGenerationStatus(jobId: string | null): UseGenerationStatusReturn {
  const [data, setData] = useState<StatusResult | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (elapsedRef.current) clearInterval(elapsedRef.current);
    intervalRef.current = null;
    elapsedRef.current = null;
    setIsPolling(false);
  }, []);

  useEffect(() => {
    if (!jobId) return;

    setIsPolling(true);
    setElapsedSeconds(0);
    setError(null);
    startTimeRef.current = Date.now();

    // Elapsed counter — updates every second
    elapsedRef.current = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);

    // Poll every 2.5 seconds
    const poll = async () => {
      try {
        const res = await fetch(`/api/status/${jobId}`);
        if (!res.ok) {
          setError('Failed to check generation status.');
          stopPolling();
          return;
        }
        const result = (await res.json()) as StatusResult;
        setData(result);
        if (result.status === 'completed' || result.status === 'failed') {
          stopPolling();
        }
      } catch {
        // Network error — keep polling (transient issue)
      }
    };

    poll(); // immediate first poll
    intervalRef.current = setInterval(poll, 2500);

    return () => stopPolling();
  }, [jobId, stopPolling]);

  return { data, isPolling, elapsedSeconds, error };
}
```

### Pattern 3: Client vs Server Component Boundary

**Rule:** Page shell (`page.tsx`) can be a Server Component. Any component using `useState`, `useEffect`, event handlers, or browser APIs must be `'use client'`.

**Phase 2 boundary:**
```
page.tsx (Server Component — just renders layout)
  └── GenerationForm.tsx ('use client' — form state)
  └── GenerationResults.tsx ('use client' — polling state)
        └── VariantCard.tsx (can be plain — no state needed)
```

**Note:** In Next.js 16, params are async. The status API route already does `await params` correctly. No changes needed.

### Pattern 4: Genre Chip Multi-Select (No Library)

**What:** Clickable chip buttons that toggle selected state. Pure Tailwind + React state.

```typescript
// No external library needed — simple controlled array
const [selectedGenres, setSelectedGenres] = useState<string[]>([]);

const toggleGenre = (genre: string) => {
  setSelectedGenres(prev =>
    prev.includes(genre) ? prev.filter(g => g !== genre) : [...prev, genre]
  );
};

// Chip render — Tailwind v4 classes
<button
  onClick={() => toggleGenre(chip)}
  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
    selectedGenres.includes(chip)
      ? 'bg-violet-600 text-white'
      : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
  }`}
>
  {chip}
</button>
```

### Pattern 5: Duration Preset Selector

```typescript
const DURATION_PRESETS = [
  { label: 'Short (1 min)', seconds: 60 },
  { label: 'Standard (2 min)', seconds: 120 },
  { label: 'Full (4 min)', seconds: 240 },
] as const;

const [duration, setDuration] = useState(120); // default: Standard

// Three-button group — segmented control style
{DURATION_PRESETS.map(preset => (
  <button
    key={preset.seconds}
    onClick={() => setDuration(preset.seconds)}
    className={duration === preset.seconds ? 'selected-style' : 'unselected-style'}
  >
    {preset.label}
  </button>
))}
```

### Anti-Patterns to Avoid

- **Polling inside a Vercel function:** Never await RunPod completion inside an API route. The existing status route polls RunPod on each frontend call — this is correct.
- **Re-using jobId across generations:** Clear jobId and data state when user submits a new form. Don't poll the old job while a new one is pending.
- **Calling format_input from the browser:** format_input requires RUNPOD_URL which is server-only. Always call it from the BFF (`/api/generate` route), never from a client component.
- **Skipping format_input on instrumental:** Even instrumental tracks benefit from format_input for BPM/key metadata. Call it always, but pass `lyrics: "[Instrumental]"`.
- **Storing enhancedCaption in a new DB column without a schema migration:** The existing `generations` schema has no `enhancedCaption` column. Options: (a) add column with `drizzle-kit push`, (b) log server-side only. The planner should decide — but option (b) requires no schema changes and the enhancedCaption is returned to the client in the generate response anyway.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Audio playback | Custom audio player | Native HTML `<audio controls>` | Phase 3 will replace with waveform; native is sufficient and zero-dep |
| Chip toggle | Complex dropdown/library | Plain `<button>` array with React state | 10 chips, no search needed, Tailwind handles styling |
| Polling state management | Redux/Zustand store | Custom `useGenerationStatus` hook | State is co-located with the component that needs it |
| Form state | React Hook Form or Formik | `useState` per field | Form is simple (5 fields); no complex validation library needed |
| LLM-enhanced captions | Custom prompt enhancement | ACE-Step `/format_input` | Already tested and working; handles BPM/key/time signature automatically |

**Key insight:** Phase 2 intentionally avoids new dependencies. Every piece of complexity is solved by the already-installed stack or browser APIs.

---

## Common Pitfalls

### Pitfall 1: format_input Response Envelope

**What goes wrong:** Treating `/format_input` response like a plain JSON object when it wraps in `{"data": {...}, "code": 200, "error": null}`.

**Why it happens:** All ACE-Step endpoints use this envelope — confirmed by MEMORY.md for `query_result` and `release_task`. Same applies to `format_input`.

**How to avoid:** In `callFormatInput()`, access `raw.data` not `raw` directly. Check `raw.error` before reading `raw.data`.

**Warning signs:** `caption` is undefined / parsing fails silently.

### Pitfall 2: Stale Closure in Polling Interval

**What goes wrong:** The poll callback captures a stale copy of state (e.g., old `jobId`) when `setInterval` is set up.

**Why it happens:** JavaScript closures capture the value at the time the function is created, not at call time.

**How to avoid:** Use `useRef` to store the latest jobId, or use the `useEffect` + `jobId` in the dependency array pattern shown above (re-runs the effect when jobId changes, clearing the old interval).

**Warning signs:** Status API returns 404 for the wrong jobId, or polling continues after a new job starts.

### Pitfall 3: Multiple Simultaneous Polls

**What goes wrong:** User submits twice quickly; two polling loops run in parallel; state updates race.

**Why it happens:** The first interval isn't cleared before the second starts.

**How to avoid:** In the `useEffect` cleanup, always clear both `intervalRef.current` and `elapsedRef.current`. The cleanup runs when `jobId` changes (new submission), which stops the old loop.

**Warning signs:** `elapsedSeconds` resets but then jumps; two status fetches happen at the same time.

### Pitfall 4: format_input Timeout Breaks Generation

**What goes wrong:** `/format_input` times out (LLM is slow), causing `/api/generate` to return 504, even though the user's song could have been generated with the raw prompt.

**Why it happens:** The 5Hz LLM is a separate model component — it can be slow under load.

**How to avoid:** Implement a fallback: if `callFormatInput()` throws a timeout error, continue generation with the raw prompt + raw lyrics (no enhanced metadata). Log the fallback. Do NOT surface this as an error to the user.

**Warning signs:** Generation always fails 30 seconds after submit; RunPod pod is otherwise healthy.

### Pitfall 5: Genre Tags Sent as Array vs String

**What goes wrong:** ACE-Step format_input expects a single `prompt` string, not a JSON array of tags.

**Why it happens:** Frontend collects genre chips as `string[]`, but ACE-Step wants them concatenated into the prompt.

**How to avoid:** On the BFF side, concatenate: `const enhancedPrompt = [userPrompt, ...selectedGenres, customTagText].filter(Boolean).join(', ')`. Send this single string as `prompt` to format_input.

**Warning signs:** Only the vibe description appears in the enhanced caption; genre tags are ignored.

### Pitfall 6: Presigned URL Expiry During Playback

**What goes wrong:** User loads the page, waits, then tries to play audio. The presigned URL expired (1-hour default).

**Why it happens:** R2 presigned URLs are generated at job-completion time in the status route and returned to the client. They expire in 3600 seconds.

**How to avoid (Phase 2 scope):** For Phase 2, this is acceptable — 1-hour window is sufficient for immediate use. The audio route at `/api/audio/:key` exists as a fallback for fresh presigned URL generation. Document the limitation for Phase 3.

**Warning signs:** Audio plays immediately but fails when user returns to the tab 1+ hours later.

---

## Code Examples

### Modified /api/generate Route (key change only)

```typescript
// src/app/api/generate/route.ts — replace the submitGenerationJob call section

// Step 1: Call format_input to get LLM-enhanced caption
let enhancedCaption = prompt;
let bpm: number | undefined;
let keyScale: string | undefined;
let timeSignature: string | undefined;
let enhancedLyrics = resolvedLyrics;

try {
  const formatted = await callFormatInput({
    prompt: genreTags ? `${prompt}, ${genreTags}` : prompt,
    lyrics: resolvedLyrics,
  });
  enhancedCaption = formatted.caption;
  bpm = typeof formatted.bpm === 'number' ? formatted.bpm : parseInt(String(formatted.bpm), 10) || undefined;
  keyScale = formatted.keyscale;
  timeSignature = formatted.timesignature;
  enhancedLyrics = formatted.lyrics || resolvedLyrics;
} catch (rawError) {
  // Fallback: continue with raw prompt if format_input fails
  const classified = classifyError(rawError);
  console.warn('[generate] format_input failed, falling back to raw prompt:', classified.technicalMessage);
}

// Step 2: Submit to ACE-Step with enhanced values
const submitResponse = await submitGenerationJob({
  prompt: enhancedCaption,
  lyrics: enhancedLyrics,
  audioDuration: duration,
  batchSize: 2,
  bpm,
  keyScale,
  timeSignature,
});

// Step 3: Return enhanced caption to frontend for display
return NextResponse.json({
  jobId: generationId,
  status: 'pending',
  enhancedCaption, // frontend shows this in the read-only area
}, { status: 201 });
```

### Variant Card Component (results display)

```typescript
// src/components/VariantCard.tsx
interface VariantCardProps {
  variantIndex: number;
  url: string | null;
  downloadKey: string;
}

export function VariantCard({ variantIndex, url, downloadKey }: VariantCardProps) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-zinc-800 bg-zinc-900 p-4">
      <p className="text-sm font-medium text-zinc-400">
        Variant {variantIndex + 1}
      </p>
      {url ? (
        <>
          <audio controls src={url} className="w-full" preload="metadata" />
          <a
            href={url}
            download={`variant-${variantIndex + 1}.wav`}
            className="text-center text-sm text-violet-400 hover:text-violet-300 transition-colors"
          >
            Download WAV
          </a>
        </>
      ) : (
        <p className="text-sm text-zinc-500 italic">Audio unavailable</p>
      )}
    </div>
  );
}
```

### Enhanced Caption Display

```typescript
// src/components/EnhancedCaptionDisplay.tsx
interface EnhancedCaptionDisplayProps {
  caption: string;
}

export function EnhancedCaptionDisplay({ caption }: EnhancedCaptionDisplayProps) {
  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-900/50 p-3">
      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-zinc-500">
        AI-Enhanced Caption
      </p>
      <p className="text-sm text-zinc-300 font-mono leading-relaxed">{caption}</p>
    </div>
  );
}
```

---

## ACE-Step format_input Confirmed Behavior

**Source:** MEMORY.md (confirmed working in Phase 1) + DeepWiki ACE-Step-1.5 LLMHandler documentation

| Field | Description | Notes |
|-------|-------------|-------|
| Request `prompt` | Combined vibe description + genre tags | String — not array |
| Request `lyrics` | User lyrics or `[Instrumental]` | Already resolved before calling |
| Response `caption` | LLM-enhanced description with BPM, key, time sig embedded | Use as `prompt` in release_task |
| Response `bpm` | Numeric BPM (int or string) | Parse to int for submitGenerationJob |
| Response `keyscale` | Key + scale, e.g. "C major" | Maps to `keyScale` param |
| Response `timesignature` | "2", "3", "4", or "6" | Maps to `timeSignature` param |
| Response `lyrics` | May be reformatted | Use if non-empty, else fall back to input lyrics |
| Response envelope | `{ data: {...}, code: 200, error: null }` | Same pattern as all ACE-Step endpoints |

**Confidence:** MEDIUM — endpoint confirmed working (MEMORY.md), field names inferred from Python `format_sample_from_input` return tuple + community docs. Validate field names against actual RunPod response on first integration.

---

## State of the Art

| Old Approach | Current Approach | Impact for Phase 2 |
|--------------|------------------|--------------------|
| Middleware for edge logic | `proxy.ts` in Next.js 16 | No middleware needed in Phase 2; informational only |
| React 18 useEffect patterns | React 19.2 `useEffectEvent` available | Stick with standard useEffect + useRef for polling; useEffectEvent is new and optional |
| Implicit Next.js caching | Opt-in caching (`"use cache"`) in Next.js 16 | API routes are dynamic by default — no change needed |
| Sync `params` access | Must `await params` | Already done correctly in existing routes |

**Note:** The project uses Next.js 16 with React 19.2. The React Compiler is available but not enabled. No reason to enable it in Phase 2 — it's an optimization pass that can be added later.

---

## Open Questions

1. **format_input response field names**
   - What we know: Python `format_sample_from_input` returns `keyscale`, `timesignature`, `caption`, `bpm`, `lyrics`, `language`
   - What's unclear: Whether the HTTP `/format_input` endpoint uses these exact JSON keys or camelCase variants
   - Recommendation: In `callFormatInput()`, defensively handle both `keyscale` and `keyScale`, `timesignature` and `timeSignature`. Log the raw response on first call to confirm.

2. **enhancedCaption storage in DB**
   - What we know: The `generations` table has no `enhancedCaption` column
   - What's unclear: Whether planner wants to persist it for display on page refresh
   - Recommendation: Phase 2 should return `enhancedCaption` in the generate response for immediate display. Persist it in DB only if needed for page refresh (requires `drizzle-kit push` with new column). Default: don't persist, keep Phase 2 simple.

3. **Lyrics textarea content when switching modes**
   - What we know: Simple mode has no lyrics textarea; Custom mode adds it
   - What's unclear: Whether lyrics textarea should be preserved when toggling back to Simple mode
   - Recommendation: Preserve textarea content in state even when hidden (user might toggle back). Clear on new generation submit.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | None installed — manual API testing via curl/scripts |
| Config file | None |
| Quick run command | `npx tsx scripts/validate-acestep.ts` (tests RunPod integration) |
| Full suite command | Same — no automated frontend tests in this project |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| GEN-01 | Vibe prompt generates song | manual | `curl -X POST /api/generate -d '{"prompt":"upbeat pop"}'` | N/A |
| GEN-02 | Custom lyrics with tags produces structured song | manual | `curl -X POST /api/generate -d '{"prompt":"pop","lyrics":"[Verse]\nLine one"}'` | N/A |
| GEN-03 | Genre tags reach ACE-Step via format_input caption | manual | Verify `enhancedCaption` in generate response contains genre tags | N/A |
| GEN-04 | Duration preset maps to correct audio length | manual | Submit with duration=60/120/240, check generation output length | N/A |
| GEN-05 | Instrumental mode produces no vocals | manual | Submit with `instrumental:true`, verify `[Instrumental]` in lyrics field | N/A |
| GEN-06 | Two variants returned per generation | manual | Poll status until complete, verify `outputs.length === 2` | N/A |

### Sampling Rate

- **Per task commit:** Run `curl -X POST localhost:3000/api/generate -H 'Content-Type: application/json' -d '{"prompt":"test"}'` and verify jobId returned
- **Per wave merge:** Full end-to-end: submit → poll until complete → verify 2 audio URLs load in browser
- **Phase gate:** All 6 GEN requirements verified manually before `/gsd:verify-work`

### Wave 0 Gaps

No test framework installation needed. Validation is manual end-to-end plus the existing `validate-acestep.ts` script for RunPod health.

---

## Sources

### Primary (HIGH confidence)
- Project MEMORY.md — ACE-Step confirmed behavior (format_input, response envelope, audio URL patterns)
- `/Users/deeg/Documents/GitHub/MusicGenerator/src/` codebase — runpod.ts, generate/route.ts, status/route.ts, schema.ts
- Next.js 16 release blog (nextjs.org/blog/next-16) — confirmed React 19.2, async params, proxy.ts patterns

### Secondary (MEDIUM confidence)
- DeepWiki ACE-Step-1.5 LLMHandler API docs — format_sample_from_input return fields (keyscale, timesignature, caption, bpm, lyrics)
- React polling patterns (overreacted.io, shadcn.io/hooks/use-interval) — useRef + setInterval cleanup patterns

### Tertiary (LOW confidence — validate on first use)
- format_input HTTP endpoint JSON field names — inferred from Python API, not confirmed from HTTP response

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already in project, no new choices needed
- Architecture: HIGH — patterns directly mirror existing Phase 1 code conventions
- format_input integration: MEDIUM — endpoint confirmed working, field names need first-call validation
- Pitfalls: HIGH — based on concrete Phase 1 experience documented in MEMORY.md and STATE.md

**Research date:** 2026-03-04
**Valid until:** 2026-04-04 (ACE-Step API is stable; Next.js 16 is the locked version)
