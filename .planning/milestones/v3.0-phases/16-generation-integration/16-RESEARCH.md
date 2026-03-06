# Phase 16: Generation Integration - Research

**Researched:** 2026-03-06
**Domain:** Next.js API routes, quiz-to-prompt conversion, HeartMuLa API, loading UX, Next.js dynamic routing
**Confidence:** HIGH — all findings based on direct code inspection of existing project, no stale training-data assumptions

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Single song generated (batch_size=1) — not dual variants (v3.0 locked decision)
- Use `heartmula.ts` exports (`submitGenerationJob`, `enhancePrompt`, `queryJobStatus`) — don't bypass
- `QuizData` type from `src/lib/quiz-types.ts` is the input contract
- Loading state must feel warm and encouraging, not clinical
- Job ID must end up in URL at `/quiz/success/[jobId]` for Phase 17

### Claude's Discretion
All four implementation areas delegated:
- **Quiz-to-prompt conversion**: Whether recipient name appears in lyrics vs prompt-only; how qualities/memories/message map to prompt vs lyrics; whether to use `enhancePrompt`; song duration default
- **Loading experience**: Personalize copy with quiz answers; animation style; full-page vs card; progress approach
- **API route**: New `/api/quiz-generate` vs modify existing `/api/generate`; keep DB record or skip; server-side vs client-side prompt building; redirect approach
- **Error handling**: Error display/retry UX; when to clear localStorage; whether success page polls; refresh-during-loading behavior

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| GENF-01 | Quiz answers converted to ACE-Step generation payload (prompt, lyrics, genre tags) | See "Quiz-to-Prompt Conversion" section — prompt template pattern established |
| GENF-02 | Single song generated (batch_size=1) after quiz completion | `submitGenerationJob` is already single-job; locked decision; no `batch_size` param in `heartmula.ts` |
| GENF-03 | Loading state shown during ~7s generation wait with encouraging copy | See "Loading Architecture" section — framer-motion v12 available, polling vs wait analysis |
| GENF-04 | User redirected to success page with job ID in URL after generation starts | See "URL and Routing" section — `router.push` after job submit, dynamic route scaffold |
</phase_requirements>

---

## Summary

Phase 16 wires the quiz funnel to HeartMuLa song generation. The core work is: (1) building a quiz-to-prompt converter function, (2) creating a new `/api/quiz-generate` route that wraps the existing `heartmula.ts` client with a quiz-specific interface, (3) adding a full-page loading state in the quiz page after submission, and (4) redirecting to `/quiz/success/[jobId]` once the job ID is returned.

All infrastructure already exists: `heartmula.ts` is typed and working, `quiz-types.ts` defines the input contract, `errors.ts` handles classification, framer-motion v12 is installed, and the quiz page has a clear hook (`console.log('Quiz complete...')`) where the generation trigger goes. The highest-risk unknown — quiz-to-prompt conversion quality — should be handled conservatively: keep `enhancePrompt` disabled for personal content and build the prompt from structured templates rather than free-form text.

The DB record (`generations` table) should be skipped for v3.0 to avoid schema coupling. Instead, the new route returns the HeartMuLa `job_id` directly to the client, which redirects to `/quiz/success/[jobId]`. This keeps Phase 16 stateless from the database perspective, matching the v3.0 philosophy of validating funnel UX before adding persistence layers.

**Primary recommendation:** Create `/api/quiz-generate` (new, thin route), build `quizToPrompt()` in `src/lib/quiz-prompt.ts`, add a loading overlay in quiz/page.tsx, and scaffold the empty success route. Keep it simple — Phase 17 fills in the success page.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `framer-motion` | 12.35.0 | Loading state animations | Already installed; used for quiz step transitions |
| `next/navigation` (`useRouter`) | Next 16.1.6 | Client-side redirect after job submit | App Router standard; `router.push('/quiz/success/[id]')` |
| `heartmula.ts` | (internal) | HeartMuLa API client | Typed, working, has timeout signals — use exclusively |
| `quiz-types.ts` | (internal) | Input contract (`QuizData`) | Shared contract between quiz page and API route |
| `errors.ts` | (internal) | Error classification | `classifyError` + `toErrorResponse` — established pattern |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `zod` | 4.3.6 | Request body validation in API route | Validate that the QuizData sent from client is complete before conversion |
| Lucide React | 0.577.0 | Icons in loading/error states | Consistent with rest of UI |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| New `/api/quiz-generate` route | Modify existing `/api/generate` | Existing route submits 2 jobs, does DB inserts — too entangled; new route is cleaner |
| Skip `enhancePrompt` for personal content | Use `enhancePrompt` | Risk of stripping "Mom", "Sarah", personal names — skip it for quiz prompts |
| Inline prompt building in API route | Separate `quiz-prompt.ts` utility | Separate file is testable in isolation with vitest; single responsibility |

**Installation:** No new packages needed. All dependencies already installed.

---

## Architecture Patterns

### Recommended Project Structure
```
src/
├── lib/
│   └── quiz-prompt.ts          # NEW — QuizData → SubmitJobParams converter
├── app/
│   ├── quiz/
│   │   ├── page.tsx            # MODIFY — wire "Create My Song" to generation
│   │   └── _components/
│   │       └── GeneratingOverlay.tsx  # NEW — full-page loading state
│   └── quiz/
│       └── success/
│           └── [jobId]/
│               └── page.tsx    # NEW — scaffold (Phase 17 builds out)
├── app/api/
│   └── quiz-generate/
│       └── route.ts            # NEW — POST endpoint, returns job_id
```

### Pattern 1: Quiz-to-Prompt Conversion

**What:** A pure function that maps `QuizData` → `SubmitJobParams`. Lives in `src/lib/quiz-prompt.ts`. No side effects, easy to unit-test.

**When to use:** Called server-side inside `/api/quiz-generate` route, after validating the incoming `QuizData` object.

**Prompt strategy (recommended):**
- `prompt` field: Style/mood description — derived from genre, relationship, and emotional tone. Example: `"A heartfelt pop ballad"`. Do NOT include personal names or free text here — `enhancePrompt` would process this, so keep it generic enough that enhancement is safe, or skip enhancement entirely.
- `lyrics` field: The personal content — recipient name, qualities, memories, message. Structured with ACE-Step lyric format tags (`[Verse]`, `[Chorus]`). Personal details go here because HeartMuLa passes lyrics through directly without LLM processing.
- `tags` field: Genre from quiz + voice preference (if supported). Comma-separated string.
- `duration_ms`: Default 90,000 ms (90 seconds) — appropriate for a gift song; not too short to feel incomplete, not so long it burdens first-time listeners.
- Skip `enhancePrompt` entirely for quiz prompts — risk of stripping personal names and emotional content is too high.

**Example:**
```typescript
// Source: direct inspection of src/lib/heartmula.ts SubmitJobParams + src/lib/quiz-types.ts QuizData
import type { QuizData } from '@/lib/quiz-types';
import type { SubmitJobParams } from '@/lib/heartmula';

const RELATIONSHIP_MOOD: Record<string, string> = {
  Mom: 'warm, nurturing, deeply loving',
  Dad: 'proud, steady, deeply loving',
  Partner: 'romantic, intimate, passionate',
  Friend: 'joyful, loyal, uplifting',
  Child: 'tender, playful, full of wonder',
  Other: 'heartfelt, personal, meaningful',
};

const GENRE_TAG_MAP: Record<string, string> = {
  Pop: 'pop',
  'R&B': 'rnb, soul',
  Country: 'country',
  'Hip-Hop': 'hip-hop',
  Rock: 'rock',
  Jazz: 'jazz',
  Classical: 'orchestral, classical',
  Folk: 'folk, acoustic',
  Electronic: 'electronic, synth',
};

export function quizToPrompt(data: QuizData): SubmitJobParams {
  const mood = RELATIONSHIP_MOOD[data.relationshipType] || 'heartfelt, personal';
  const genre = data.genre || 'pop';
  const genreTag = GENRE_TAG_MAP[data.genre] ?? data.genre.toLowerCase();

  const prompt = `A ${genre} song — ${mood}. Written as a personal gift.`;

  const lyrics = buildLyrics(data);
  const tags = genreTag;

  return {
    prompt,
    lyrics,
    duration_ms: 90_000,
    tags,
  };
}

function buildLyrics(data: QuizData): string {
  const name = data.recipientName || 'you';
  const lines: string[] = [];

  lines.push('[Verse]');
  if (data.qualities) lines.push(data.qualities);

  lines.push('[Chorus]');
  lines.push(`This song is for ${name}`);
  if (data.message) lines.push(data.message);

  if (data.memories) {
    lines.push('[Verse]');
    lines.push(data.memories);
  }

  lines.push('[Outro]');
  lines.push(`For ${name}, always.`);

  return lines.join('\n');
}
```

### Pattern 2: API Route — `/api/quiz-generate`

**What:** A lean POST route. Accepts `QuizData`, converts to prompt, calls `submitGenerationJob`, returns `{ jobId }`. No DB insert in v3.0.

**When to use:** Called by the quiz page when user clicks "Create My Song".

**Example:**
```typescript
// Source: pattern derived from src/app/api/generate/route.ts — stripped of DB and dual-job logic
import { NextRequest, NextResponse } from 'next/server';
import { submitGenerationJob } from '@/lib/heartmula';
import { quizToPrompt } from '@/lib/quiz-prompt';
import { classifyError, toErrorResponse } from '@/lib/errors';
import type { QuizData } from '@/lib/quiz-types';

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Validate that body looks like QuizData (at minimum: recipientName + genre)
  const data = body as QuizData;
  if (!data.recipientName || !data.genre) {
    return NextResponse.json({ error: 'Incomplete quiz data' }, { status: 400 });
  }

  const params = quizToPrompt(data);

  try {
    const result = await submitGenerationJob(params);
    return NextResponse.json({ jobId: result.job_id }, { status: 201 });
  } catch (rawError) {
    const classified = classifyError(rawError);
    const errorResponse = toErrorResponse(classified);
    return NextResponse.json(
      { error: errorResponse.error },
      { status: 502 },
    );
  }
}
```

### Pattern 3: Loading Overlay in Quiz Page

**What:** After "Create My Song" is clicked, hide the quiz steps and show a full-page animated loading state. Use `AnimatePresence` + framer-motion (already imported in quiz/page.tsx).

**When to use:** From the moment the API call is fired until `router.push` is called with the job ID.

**State machine:** `'idle' | 'generating' | 'error'` — stored as `useState` in quiz page. Replace the current `console.log` branch in `goNext()`.

**Loading copy that feels warm:**
```
"Composing [Name]'s song..."
"Weaving your memories into music..."
"Almost there — your gift is taking shape..."
"Adding the finishing notes for [Name]..."
```
Rotate via a `useEffect` interval (every 2.5s) — no fake progress bar needed; rotating copy feels more honest and personal.

**Example:**
```typescript
// Source: framer-motion AnimatePresence pattern from src/app/quiz/page.tsx (existing)
const [genStatus, setGenStatus] = useState<'idle' | 'generating' | 'error'>('idle');
const [genError, setGenError] = useState<string | null>(null);

async function handleCreate() {
  setGenStatus('generating');
  try {
    const res = await fetch('/api/quiz-generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const body = await res.json() as { error?: { userMessage?: string } };
      throw new Error(body.error?.userMessage ?? 'Generation failed');
    }
    const { jobId } = await res.json() as { jobId: string };
    // Clear quiz storage after successful submission
    localStorage.removeItem('notevra_quiz_v1');
    router.push(`/quiz/success/${jobId}`);
  } catch (err) {
    setGenError(err instanceof Error ? err.message : 'Something went wrong');
    setGenStatus('error');
  }
}
```

### Pattern 4: Success Route Scaffold

**What:** Create `/quiz/success/[jobId]/page.tsx` as a minimal scaffold so routing works. Phase 17 builds out the page fully.

**When to use:** Phase 16 only creates the route — Phase 17 fills content.

**Example:**
```typescript
// src/app/quiz/success/[jobId]/page.tsx
export default async function SuccessPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = await params;
  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-muted-foreground">Preparing your song... Job: {jobId}</p>
    </div>
  );
}
```

### Anti-Patterns to Avoid
- **Using the existing `/api/generate` route:** It submits 2 jobs, does DB inserts, and has wrong interface for QuizData — don't modify it.
- **Calling `enhancePrompt` on quiz text:** It passes the prompt to an LLM that may rewrite personal names and emotional phrasing — skip for quiz prompts.
- **Building prompt on the client:** Prompt logic should live server-side so it can be changed without client deploys and can't be inspected/manipulated.
- **`router.push` before job ID returns:** Don't redirect until `submitGenerationJob` returns the job_id. The URL must contain a real HeartMuLa job_id for Phase 17 polling to work.
- **Clearing localStorage before redirect succeeds:** Only `localStorage.removeItem('notevra_quiz_v1')` after the API call succeeds and before `router.push` — so data is preserved if the API fails and user can retry.
- **Polling during loading in Phase 16:** This phase only submits the job and redirects. Polling happens in Phase 17 on the success page. Don't add polling here.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| HTTP timeout handling | Custom AbortController logic | `heartmula.ts` `createTimeoutSignal` (internal) | Already implemented with proper Node.js `unref()` |
| Error classification | Custom try/catch string matching | `classifyError` from `errors.ts` | Covers model_error, timeout, gpu_unavailable, rate_limited — tested |
| Animated transitions | CSS keyframes | framer-motion `AnimatePresence` + `motion.div` | Already in quiz/page.tsx; consistent with step transitions |
| Loading copy rotation | Third-party library | `useEffect` + `setInterval` + `useState` | Trivial — 3 lines of code, no dependency needed |
| Lyrics formatting | AI prompt engineering | Structured template with ACE-Step tags | `[Verse]`, `[Chorus]` tags are HeartMuLa-native; templates are deterministic and testable |

**Key insight:** The "complexity" in this phase is in the quiz-to-prompt conversion — which is actually a deterministic mapping problem, not an ML problem. Templates beat prompt engineering here because they're predictable, testable, and don't rely on a second LLM call.

---

## Common Pitfalls

### Pitfall 1: `enhancePrompt` Strips Personal Names
**What goes wrong:** Calling `enhancePrompt` on a prompt containing "a song for Sarah, who loves hiking and made me laugh when..." causes the LLM to rewrite it into generic music-production language, losing all the personal detail.
**Why it happens:** `enhancePrompt` is designed for production-style prompts, not narrative personal content.
**How to avoid:** Skip `enhancePrompt` entirely in the quiz-generate route. Build a genre-only style prompt for the `prompt` field and put all personal content in `lyrics`.
**Warning signs:** Test output songs where the recipient's name or specific qualities aren't audible in the generated song.

### Pitfall 2: `router.push` in a Server Component
**What goes wrong:** Creating the success page scaffold as a server component and trying to use `useRouter` inside it — or calling `redirect()` from the quiz page (a client component) where server redirect doesn't work.
**Why it happens:** App Router has distinct client/server redirect APIs.
**How to avoid:** Quiz page is already `'use client'`. Use `import { useRouter } from 'next/navigation'` and `router.push()`. The success page scaffold can be a server component (no router needed there in Phase 16).

### Pitfall 3: QuizData Not Validated in API Route
**What goes wrong:** If quiz state is corrupt or missing fields (e.g., user navigated directly to the API), the `quizToPrompt` function receives incomplete data and builds a malformed prompt — which HeartMuLa may accept (generating a bad song) or reject (unhelpful 500 error).
**Why it happens:** Trusting client input.
**How to avoid:** Validate minimum required fields in the API route before calling `quizToPrompt`. At minimum: `recipientName` (non-empty string) and `genre` (non-empty string). Return 400 with a clear message if invalid.

### Pitfall 4: Clearing localStorage Too Early
**What goes wrong:** Clearing `notevra_quiz_v1` before the API response succeeds means that if generation fails, the user loses all their quiz answers and must start over.
**Why it happens:** Natural to clear on "submit" click.
**How to avoid:** Only clear localStorage after `submitGenerationJob` succeeds and the job ID is received. Keep data during error state so retry works.

### Pitfall 5: Loading State Race — Double Submit
**What goes wrong:** User clicks "Create My Song" rapidly; two API calls fire; two jobs are submitted; the second `router.push` with a different job ID overwrites the first.
**Why it happens:** No guard on the button during async operation.
**How to avoid:** Set `genStatus === 'generating'` before the fetch and disable/hide the button. The state machine (`idle | generating | error`) handles this naturally if the button is disabled when `genStatus !== 'idle'`.

### Pitfall 6: Dynamic Route Params in Next.js 15+
**What goes wrong:** Using `params.jobId` directly in a page component instead of `await params.jobId` causes a build warning or runtime error in Next.js 15/16.
**Why it happens:** App Router made `params` a Promise in Next.js 15+.
**How to avoid:** Always `const { jobId } = await params` in async server components, or use `React.use(params)` in client components. The existing codebase pattern confirms this — see `src/app/api/status/[jobId]/route.ts` line 57: `const { jobId } = await params`.

---

## Code Examples

Verified patterns from direct code inspection:

### Submitting a Single HeartMuLa Job
```typescript
// Source: src/lib/heartmula.ts — submitGenerationJob function
import { submitGenerationJob } from '@/lib/heartmula';

const result = await submitGenerationJob({
  prompt: 'A warm pop ballad, tender and loving',
  lyrics: '[Verse]\nShe always knew what to say\n[Chorus]\nFor Mom, always',
  duration_ms: 90_000,
  tags: 'pop, soft',
});
// result.job_id is the HeartMuLa job ID — use this in the URL
console.log(result.job_id); // e.g. "hm-abc123xyz"
```

### Client-Side Redirect After Job Submit (App Router)
```typescript
// Source: Next.js App Router pattern — useRouter from 'next/navigation'
'use client';
import { useRouter } from 'next/navigation';

const router = useRouter();

// After successful API call:
router.push(`/quiz/success/${jobId}`);
```

### AnimatePresence for Loading/Quiz Toggle (existing pattern)
```typescript
// Source: src/app/quiz/page.tsx — AnimatePresence already in use
import { AnimatePresence, motion } from 'framer-motion';

// Wrap both quiz and loading overlay in AnimatePresence
<AnimatePresence mode="wait">
  {genStatus === 'generating' ? (
    <motion.div
      key="loading"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <GeneratingOverlay recipientName={data.recipientName} />
    </motion.div>
  ) : (
    <motion.div key="quiz" /* existing quiz render */>
      {/* quiz steps */}
    </motion.div>
  )}
</AnimatePresence>
```

### Error Pattern from Existing Route
```typescript
// Source: src/app/api/generate/route.ts — error handling pattern
import { classifyError, toErrorResponse } from '@/lib/errors';

try {
  const result = await submitGenerationJob(params);
  return NextResponse.json({ jobId: result.job_id }, { status: 201 });
} catch (rawError) {
  const classified = classifyError(rawError);
  const errorResponse = toErrorResponse(classified);
  return NextResponse.json(
    { error: errorResponse.error },
    { status: 502 },
  );
}
```

### Rotating Loading Copy Pattern
```typescript
// Source: standard React pattern — no library needed
const LOADING_MESSAGES = (name: string) => [
  `Composing ${name}'s song...`,
  'Weaving your memories into music...',
  `Adding a personal touch for ${name}...`,
  'Almost there — your gift is taking shape...',
  `The final notes for ${name} are coming together...`,
];

function GeneratingOverlay({ recipientName }: { recipientName: string }) {
  const messages = LOADING_MESSAGES(recipientName || 'them');
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIdx((i) => (i + 1) % messages.length);
    }, 2500);
    return () => clearInterval(interval);
  }, [messages.length]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6">
      {/* Music note animation via framer-motion */}
      <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ repeat: Infinity, duration: 1.5 }}>
        {/* SVG music note or Lucide icon */}
      </motion.div>
      <p className="text-xl font-heading text-foreground">{messages[idx]}</p>
    </div>
  );
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `params.jobId` direct access | `await params` (Promise) | Next.js 15+ | Must `await params` in server components — confirmed by existing codebase |
| Batch generation (2 variants) | Single job (batch_size=1) | v3.0 pivot | `submitGenerationJob` called once, not with `Promise.allSettled` |
| DB-first job tracking | Stateless redirect (v3.0 only) | Phase 16 design | Job ID lives in URL; no DB row for v3.0 quiz jobs |
| `enhancePrompt` for all prompts | Skip for personal/quiz prompts | Phase 16 design decision | Prevents LLM from stripping personal names |

**Deprecated/outdated:**
- Dual-job `Promise.allSettled` pattern from `/api/generate`: Replaced by single `submitGenerationJob` call in quiz route

---

## Open Questions

1. **HeartMuLa lyrics format — does it support all ACE-Step section tags?**
   - What we know: `heartmula.ts` passes `lyrics` as a raw string directly to the API. The old workspace UI used `[Verse]`, `[Chorus]`, `[Bridge]` tags (per `GEN-02` requirement).
   - What's unclear: Whether HeartMuLa's backend validates/requires specific tags or is flexible.
   - Recommendation: Use `[Verse]` and `[Chorus]` at minimum — these are the most universal ACE-Step tags. Build the `buildLyrics()` function to always include at least one of each. If a field is empty, skip that section rather than emitting empty lines.

2. **Voice preference mapping — does HeartMuLa `tags` accept voice directives?**
   - What we know: `SubmitJobParams.tags` is a freeform string. The QuizData includes `voicePreference: 'Male' | 'Female' | 'No Preference'`.
   - What's unclear: Whether tags like "male vocals" or "female vocals" are respected by the HeartMuLa/ACE-Step model.
   - Recommendation: Include voice preference in tags if it's not "No Preference" (e.g., `"pop, male vocals"`). The model may honor it; if not, it degrades gracefully. Worst case is a song with unexpected voice gender, which is not a critical failure.

3. **Duration for gift songs — what feels right?**
   - What we know: The old workspace used 30–240 seconds. HeartMuLa accepts `duration_ms`.
   - What's unclear: What duration feels appropriate for a one-time personalized gift song. Too short (30s) feels like a jingle. Too long (240s) may not hold emotional weight throughout with AI-generated content.
   - Recommendation: Default to 90,000ms (90 seconds / 1.5 minutes). This is long enough for a complete song structure with verse/chorus but short enough to feel focused. Could expose this as a hardcoded constant `GIFT_SONG_DURATION_MS = 90_000` for easy adjustment.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.0.18 |
| Config file | `vitest.config.ts` |
| Quick run command | `npx vitest run src/lib/quiz-prompt.test.ts` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| GENF-01 | `quizToPrompt(data)` returns valid `SubmitJobParams` with prompt, lyrics, tags, duration_ms | unit | `npx vitest run src/lib/quiz-prompt.test.ts` | ❌ Wave 0 |
| GENF-01 | Recipient name appears in lyrics output | unit | `npx vitest run src/lib/quiz-prompt.test.ts` | ❌ Wave 0 |
| GENF-01 | Genre maps correctly to tags string | unit | `npx vitest run src/lib/quiz-prompt.test.ts` | ❌ Wave 0 |
| GENF-02 | API route calls `submitGenerationJob` exactly once (not twice) | unit (mock) | `npx vitest run src/app/api/quiz-generate/route.test.ts` | ❌ Wave 0 |
| GENF-03 | Loading overlay renders with personalized copy | unit | `npx vitest run src/app/quiz` | ❌ Wave 0 |
| GENF-04 | `router.push` called with `/quiz/success/[jobId]` after success | unit (mock) | `npx vitest run src/app/quiz` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run src/lib/quiz-prompt.test.ts`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/lib/quiz-prompt.test.ts` — covers GENF-01 (pure function, no mocks needed)
- [ ] `src/app/api/quiz-generate/route.test.ts` — covers GENF-02 (mock `submitGenerationJob`)
- [ ] No new framework install needed — vitest already configured with jsdom environment

---

## Sources

### Primary (HIGH confidence)
- Direct code inspection: `src/lib/heartmula.ts` — full API client, all types and signatures confirmed
- Direct code inspection: `src/lib/quiz-types.ts` — `QuizData` interface, all fields confirmed
- Direct code inspection: `src/app/quiz/page.tsx` — existing state management, generation hook location
- Direct code inspection: `src/app/api/generate/route.ts` — existing API route pattern
- Direct code inspection: `src/app/api/status/[jobId]/route.ts` — `await params` pattern, error handling
- Direct code inspection: `src/lib/errors.ts` — `classifyError`, `toErrorResponse` signatures
- Direct code inspection: `src/db/schema.ts` — `generations` table structure
- Direct code inspection: `package.json` — confirmed framer-motion 12.35.0, vitest 4.0.18, Next.js 16.1.6, no missing deps
- Direct code inspection: `vitest.config.ts` — jsdom environment, path aliases

### Secondary (MEDIUM confidence)
- STATE.md — blockers/decisions around `enhancePrompt` risk and heartmula.ts-only pattern
- CONTEXT.md — all discretion areas and locked decisions for this phase
- REQUIREMENTS.md — GENF-01 through GENF-04 full text

### Tertiary (LOW confidence)
- None — all findings verified by direct code inspection

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages confirmed via package.json direct inspection
- Architecture: HIGH — patterns derived from existing working code in the same project
- Pitfalls: HIGH — identified from direct code patterns and known Next.js 15+ behaviors visible in existing codebase
- Quiz-to-prompt conversion quality: MEDIUM — the template approach is sound, but actual HeartMuLa output quality for personal content needs live testing during Phase 16 execution

**Research date:** 2026-03-06
**Valid until:** 2026-04-05 (30 days — stable codebase, no fast-moving external APIs involved)
