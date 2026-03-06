# Phase 19: Error Boundaries and API Hardening - Research

**Researched:** 2026-03-06
**Domain:** Next.js App Router error boundaries, API error response hardening, polling timeout UX
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Error boundary placement and behavior**
- Add `error.tsx` at `/quiz` and `/quiz/success` routes — these are the interactive routes where crashes matter
- Landing page is mostly static with low crash risk — no error boundary needed there
- Recovery action: "Try again" button calls `reset()` to re-render the crashed route segment
- If retry also fails, fall back to a "Go home" link

**Error boundary visual style**
- Match the existing error/timeout states on the success page: yellow-100 circle icon, warm copy, rounded card layout
- Consistent with the baby blue + mellow yellow brand identity
- Warm + casual tone matching existing copy (e.g., "Something went wrong, but your progress is safe")

**API error response shape**
- All API routes (quiz-generate, poll-job, audio) use the same `classifyError` + `toErrorResponse` pattern from `src/lib/errors.ts`
- Consistent contract: `{error: {category, retryable, userMessage}, debug: {technicalMessage}}`
- Strip `debug.technicalMessage` in production (`NODE_ENV === 'production'`) to prevent information leakage

**Poll-job error granularity**
- Distinguish between "job not found" (404) and "pod unreachable" (502) instead of silently returning QUEUED for all errors
- Keep silent-QUEUED fallback only for transient network blips (fetch failures)
- Invalid jobId returns 404 with structured JSON error

**Audio route error handling**
- Return JSON `{error: ...}` with appropriate status code when audio isn't found or R2 fails
- Client already handles non-audio responses by checking content-type

**Timeout behavior**
- Keep 2-minute timeout (POLL_TIMEOUT_MS = 120000) — generous threshold covers cold-start scenarios
- On timeout: show two buttons — "Check Again" (re-polls same jobId) and "Start Over" (back to quiz)
- After 15 seconds of loading, swap subtitle to "Still working on it..." to reassure users it hasn't frozen (no elapsed timer — that creates anxiety)

**Error state differentiation**
- Differentiate "song failed" (retryable — "Try Again" button) vs "pod down" (not retryable — "Our servers are temporarily offline. Please try again later.")
- Different messages and actions for different problem types

### Claude's Discretion
- Exact error boundary component structure and reset logic
- How to detect pod-down vs song-failed in the client (likely from poll-job's structured error response)
- Whether to add error logging/reporting hooks

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| ERR-01 | Add error.tsx boundaries at /quiz and /quiz/success routes | Next.js App Router error boundary convention documented below; `reset()` function API confirmed |
| ERR-02 | API route errors return structured JSON (not stack traces) | `errors.ts` pattern is complete; gaps in quiz-generate validation path and production stripping identified |
| ERR-03 | Network timeout during generation shows recovery UI | Success page timeout state exists; "Check Again" + "Still working on it..." enhancements documented |
</phase_requirements>

---

## Summary

Phase 19 is primarily a code hardening phase — no new architecture, no new libraries. The project already has a mature error classification system (`src/lib/errors.ts`) and most of the visual error states on the success page. The work is bringing the whole application up to the same standard as `quiz-generate/route.ts`, which is the reference implementation.

Three areas need attention. First, two `error.tsx` files must be created using Next.js App Router's built-in error boundary convention — a well-understood pattern with no external dependencies. Second, `poll-job` currently swallows all errors silently (returning `QUEUED`), which prevents the client from distinguishing pod-down from transient blips; that logic needs to be made granular. Third, the success page timeout state needs a "Check Again" button and a 15-second reassurance subtitle swap — both are UI-only additions to existing component state.

The most notable consistency gap: `quiz-generate/route.ts` validation errors (400 responses) currently return `{ error: string }`, not the standard `{ error: {category, retryable, userMessage}, debug: {...} }` shape. This violates ERR-02 and needs alignment. Additionally, `toErrorResponse()` does not currently strip `debug.technicalMessage` in production — that stripping logic must be added (either in `toErrorResponse` itself or at the call site in each route handler).

**Primary recommendation:** Address all three ERR requirements as three separate plans — error boundaries, API hardening, and timeout UX — in that order, since the API hardening (poll-job structured errors) must precede the client-side differentiation logic on the success page.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 16.1.6 (in use) | App Router error boundaries via `error.tsx` convention | Built-in — no additional package needed |
| React | 19.2.3 (in use) | `useEffect`, `useState` for timeout/reassurance timer | Already used throughout |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `src/lib/errors.ts` | (project-local) | `classifyError`, `toErrorResponse` — already exists | Use for ALL API route error responses |
| lucide-react | ^0.577.0 (in use) | `RefreshCw`, `Home` icons for error boundary UI | Already used in success page error states |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Next.js `error.tsx` | React `ErrorBoundary` class component | `error.tsx` is the App Router standard — class component would bypass Next.js segment isolation |
| In-component timeout timer | External library | `setTimeout`/`useEffect` is sufficient; no library needed |

**Installation:** No new packages required.

---

## Architecture Patterns

### Recommended Project Structure (additions only)
```
src/app/quiz/
├── error.tsx                   # NEW — error boundary for all /quiz/** segments
└── success/
    └── error.tsx               # NEW — error boundary scoped to /quiz/success/**

src/lib/
└── errors.ts                   # MODIFY — add production stripping to toErrorResponse

src/app/api/
├── quiz-generate/route.ts      # MODIFY — align 400 validation errors to standard shape
├── poll-job/[jobId]/route.ts   # MODIFY — granular error handling (404 vs 502)
└── audio/[jobId]/route.ts      # MODIFY — align catch block to classifyError pattern

src/app/quiz/success/[jobId]/
└── page.tsx                    # MODIFY — "Check Again" button, 15s subtitle swap, error differentiation
```

### Pattern 1: Next.js App Router Error Boundary (`error.tsx`)

**What:** A `'use client'` component placed in a route segment folder. Next.js automatically wraps the segment's layout with a React error boundary using this component. It receives `error` and `reset` props.

**When to use:** Any route segment where a client-side JavaScript error could leave users on a blank screen.

**Key API (confirmed from Next.js 13+ App Router docs):**
```typescript
// Source: https://nextjs.org/docs/app/api-reference/file-conventions/error
'use client';

import { useEffect } from 'react';

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    // Log the error to an error reporting service if desired
    console.error('[ErrorBoundary]', error);
  }, [error]);

  return (
    // Recovery UI — call reset() to attempt re-render
    <div>
      <button onClick={reset}>Try again</button>
    </div>
  );
}
```

**Segment scoping:**
- `src/app/quiz/error.tsx` catches errors from all `/quiz/**` route segments (quiz page, any nested routes)
- `src/app/quiz/success/error.tsx` — placing a more specific `error.tsx` here catches errors only within `/quiz/success/**` and does NOT override the parent; both coexist
- The `error.tsx` does NOT catch errors in the layout of the same segment; it only wraps the `page.tsx` and children below it

**`reset()` behavior:** Calls React's error boundary reset, re-rendering the segment from scratch. It does NOT perform a full page navigation. If the underlying problem persists, `reset()` will throw again immediately and the error boundary will re-display. This is why a "Go home" fallback link is needed.

**`digest` property:** A hash of the error generated server-side. Safe to log for debugging — does not expose stack traces.

### Pattern 2: Production Debug Stripping in `toErrorResponse`

**What:** Conditionally omit `debug.technicalMessage` based on `NODE_ENV`.

**Current state:** `toErrorResponse()` always includes `debug.technicalMessage` — stack traces can reach the browser in production.

**Fix options:**
- Option A (recommended): Strip in `toErrorResponse` itself — single enforcement point
- Option B: Strip at each call site — more explicit but requires changes in every route handler

```typescript
// Source: src/lib/errors.ts — recommended modification
export function toErrorResponse(error: GenerationError): ErrorResponse {
  return {
    error: {
      category: error.category,
      retryable: error.retryable,
      userMessage: error.userMessage,
    },
    debug: {
      // Strip technical details in production to prevent information leakage
      technicalMessage:
        process.env.NODE_ENV === 'production' ? '[redacted]' : error.technicalMessage,
    },
  };
}
```

Confidence: HIGH — `process.env.NODE_ENV` is a Node.js standard; Next.js sets it correctly in production builds.

### Pattern 3: Poll-Job Granular Error Handling

**What:** Replace the blanket `catch { return QUEUED }` with differentiated responses based on what actually failed.

**Current behavior (poll-job/route.ts):**
```typescript
// Everything becomes QUEUED — client can never know if pod is down
} catch {
  return NextResponse.json({ status: 'QUEUED', error: null });
}
```

**Target behavior:** The `queryJobStatus` function from `heartmula.ts` needs to surface HTTP status codes. When it throws, the error message should indicate whether it was a 404 (jobId not found) or a connection failure (pod down/network).

```typescript
// Pseudocode for granular handling
try {
  const result = await queryJobStatus(jobId);
  return NextResponse.json({ status: result.status, error: result.error_msg ?? null });
} catch (rawError) {
  const classified = classifyError(rawError);
  const errorResponse = toErrorResponse(classified);
  console.error('[poll-job] queryJobStatus failed:', classified.technicalMessage);

  // Network/connection errors = pod unreachable (502)
  if (classified.category === 'gpu_unavailable') {
    return NextResponse.json(errorResponse, { status: 502 });
  }

  // Unknown/other = treat as transient, keep polling (return QUEUED-like)
  // But preserve structured response shape for consistency
  return NextResponse.json({ status: 'QUEUED', error: null });
}
```

**Note:** The `heartmula.ts` `queryJobStatus` implementation must be reviewed to understand what errors it actually throws and under what conditions. If it doesn't currently throw on 404 (maybe it returns a status), the poll-job route may need different handling. Read `heartmula.ts` before writing the plan.

### Pattern 4: Success Page — "Check Again" + Reassurance Subtitle

**What:** Two modifications to the existing polling loop in `success/[jobId]/page.tsx`.

**Modification 1 — "Check Again" on timeout:**
The timeout state currently shows only "Try Again" (navigates to `/quiz`). It needs a second button that re-enters the polling loop for the same `jobId` without navigation.

```typescript
// In SuccessPage component — add restart mechanism
const [pollKey, setPollKey] = useState(0);

// "Check Again" handler
function handleCheckAgain() {
  setPageState('loading');
  setPollKey(k => k + 1); // Changing the key causes useEffect to re-run
}

// Update useEffect dependency array
useEffect(() => {
  // ... existing poll logic ...
}, [jobId, pollKey]); // pollKey triggers re-poll on "Check Again"
```

**Modification 2 — Reassurance subtitle swap at 15s:**
Add a second state variable that tracks whether 15 seconds have elapsed. No timer display — just a silent text swap.

```typescript
const [isStillWorking, setIsStillWorking] = useState(false);

useEffect(() => {
  if (pageState !== 'loading') return;
  const timer = setTimeout(() => setIsStillWorking(true), 15_000);
  return () => clearTimeout(timer);
}, [pageState]);

// In loading JSX:
<p className="text-muted-foreground text-sm">
  {isStillWorking
    ? 'Still working on it...'
    : 'This usually takes about 10 seconds. Hang tight!'}
</p>
```

**Modification 3 — Error state differentiation:**
The success page polls `/api/poll-job/[jobId]`. Currently, `PollResponse` is `{ status, error: string | null }`. After the poll-job hardening, the client can receive structured error responses. The page needs to inspect `retryable` from the poll-job response to decide which error UI to show.

The current `PollResponse` type should be extended:
```typescript
interface PollResponse {
  status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  error: string | null;
  // Present when poll-job returns a structured error
  errorData?: {
    category: ErrorCategory;
    retryable: boolean;
    userMessage: string;
  };
}
```

When `FAILED` status arrives with `retryable: false` → show pod-down message ("Our servers are temporarily offline.").
When `FAILED` with `retryable: true` → show current error UI ("Our music AI had a hiccup").

### Anti-Patterns to Avoid
- **Placing `error.tsx` in the same folder as `layout.tsx` expecting it to catch layout errors:** `error.tsx` does not catch errors thrown in the layout of the same segment — only in `page.tsx` and children. Layout errors bubble up to the parent segment's error boundary.
- **Using `error.tsx` without `'use client'`:** The file MUST have `'use client'` — error boundaries are a React client concept; Next.js will fail to compile without it.
- **Logging full `error.stack` to the browser console in production:** Use `error.digest` for production logs, full error in development only.
- **Making "Check Again" navigate away:** It must stay on the same page and re-enter the polling loop — navigation loses the jobId context from URL params.
- **Resetting `isStillWorking` on re-poll:** When "Check Again" is pressed, `isStillWorking` should reset to `false` so the subtitle starts fresh for the new poll cycle. This requires resetting in the `handleCheckAgain` handler.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| React error boundaries | Custom `ErrorBoundary` class component | Next.js `error.tsx` convention | App Router handles segment isolation, fallback rendering, and `reset()` automatically |
| Error classification | String parsing logic in route handlers | `classifyError()` from `src/lib/errors.ts` | Already handles all categories; adding more logic in route handlers creates divergence |
| Error response formatting | Ad-hoc `{ error: string }` responses | `toErrorResponse()` from `src/lib/errors.ts` | Consistent shape; client can rely on it |

**Key insight:** The hard work is already done in `errors.ts`. Phase 19 is about applying the existing pattern uniformly — not building new infrastructure.

---

## Common Pitfalls

### Pitfall 1: `error.tsx` Does Not Catch Server Component Errors on Initial Load
**What goes wrong:** A developer adds `error.tsx` expecting it to catch errors thrown during server-side rendering of a Server Component within the segment.
**Why it happens:** `error.tsx` uses React's error boundary API, which only works client-side. Server rendering errors are caught differently (by Next.js itself, which shows a 500 page or the nearest error boundary that could be hydrated).
**How to avoid:** The success page `page.tsx` is `'use client'` so this is not an issue here. The quiz `page.tsx` is also client-side. No action needed, but document clearly.
**Warning signs:** If the route segment is a pure Server Component and an error boundary is expected to catch server-side errors.

### Pitfall 2: Forgetting to Reset `isStillWorking` on "Check Again"
**What goes wrong:** User clicks "Check Again" — the polling restarts but the subtitle is already showing "Still working on it..." from time 0 instead of the normal message.
**Why it happens:** `isStillWorking` state persists between poll cycles.
**How to avoid:** Call `setIsStillWorking(false)` inside `handleCheckAgain()` before re-triggering the poll.
**Warning signs:** Subtitle shows "Still working on it..." immediately when "Check Again" is clicked.

### Pitfall 3: `quiz-generate` Validation Errors Use Non-Standard Shape
**What goes wrong:** The 400 validation error responses from `quiz-generate/route.ts` currently return `{ error: string }` — not the `{ error: {category, retryable, userMessage}, debug: {...} }` shape. Any client code or test that expects the standard shape will break on validation failures.
**Why it happens:** The validation path predates the standardized `classifyError` pattern.
**How to avoid:** Update the validation failure responses to use the standard shape. Use `category: 'invalid_input'`, `retryable: false`.
**Warning signs:** Existing `route.test.ts` checks `body.error` as a string — tests will need updating after this change.

### Pitfall 4: `reset()` Failing Silently After Initial Error
**What goes wrong:** User clicks "Try again" in the error boundary. `reset()` runs, the component re-renders, but the same underlying error occurs immediately — the user sees the error boundary flashing and then returning to the error state with no explanation.
**Why it happens:** `reset()` only re-renders, it doesn't fix the underlying problem. If the quiz page crashed due to a persistent bug (not a transient error), `reset()` will re-crash.
**How to avoid:** Show the "Go home" fallback link alongside or after the "Try again" button. Consider tracking retry count and showing "Go home" prominently after the first failed reset.
**Warning signs:** Error boundary appears, user clicks retry, boundary immediately re-appears.

### Pitfall 5: Audio Route Already Partially Hardened — Don't Double-Apply
**What goes wrong:** `audio/[jobId]/route.ts` already returns `{ error: 'Audio not available' }` with 502. A developer might add full `classifyError` wrapping unnecessarily, potentially changing the response shape in a way that breaks client expectations.
**Why it happens:** The CONTEXT.md says "align to standard shape" but the audio client only checks `Content-Type`, not the error body structure. Over-engineering is possible.
**How to avoid:** For the audio route, the key fix is aligning the error body shape to the standard `{ error: {category, retryable, userMessage} }` format and adding production stripping. The client-side check is already correct (checking content-type). Keep it minimal.

---

## Code Examples

### Example 1: Minimal `error.tsx` matching Notevra brand
```typescript
// Source: Next.js App Router docs + project brand patterns from success page
'use client';

import { useEffect } from 'react';
import { RefreshCw, Home } from 'lucide-react';

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function QuizErrorBoundary({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    // Development logging only — digest is safe for production
    if (process.env.NODE_ENV !== 'production') {
      console.error('[QuizErrorBoundary]', error);
    }
  }, [error]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-16">
      <div className="flex flex-col items-center gap-6 max-w-sm text-center">
        <div className="w-16 h-16 rounded-full bg-yellow-100 flex items-center justify-center">
          <RefreshCw className="w-8 h-8 text-yellow-600" />
        </div>
        <div className="flex flex-col gap-2">
          <h1 className="font-display text-2xl text-foreground">
            Our music AI had a hiccup
          </h1>
          <p className="text-muted-foreground text-sm">
            Something went wrong, but your progress is safe. Try again and it usually works right away.
          </p>
        </div>
        <div className="flex flex-col gap-3 w-full">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-xl font-medium hover:opacity-90 transition-opacity"
          >
            <RefreshCw className="w-4 h-4" />
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center gap-2 border border-border text-foreground px-6 py-3 rounded-xl font-medium hover:bg-muted transition-colors"
          >
            <Home className="w-4 h-4" />
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}
```

### Example 2: Granular `poll-job` error handling
```typescript
// Modified src/app/api/poll-job/[jobId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { queryJobStatus } from '@/lib/heartmula';
import { classifyError, toErrorResponse } from '@/lib/errors';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
): Promise<NextResponse> {
  const { jobId } = await params;

  // Basic validation — empty/invalid jobId
  if (!jobId || typeof jobId !== 'string' || jobId.trim() === '') {
    return NextResponse.json(
      toErrorResponse({
        category: 'invalid_input',
        retryable: false,
        userMessage: 'Invalid job ID.',
        technicalMessage: `Invalid jobId received: ${String(jobId)}`,
      }),
      { status: 404 },
    );
  }

  try {
    const result = await queryJobStatus(jobId);
    return NextResponse.json({ status: result.status, error: result.error_msg ?? null });
  } catch (rawError) {
    const classified = classifyError(rawError);
    console.error('[poll-job] queryJobStatus failed:', classified.technicalMessage);

    // Pod/network unreachable — tell client, don't pretend it's QUEUED
    if (classified.category === 'gpu_unavailable') {
      return NextResponse.json(toErrorResponse(classified), { status: 502 });
    }

    // Truly transient (unknown network blip) — keep client polling
    return NextResponse.json({ status: 'QUEUED', error: null });
  }
}
```

### Example 3: Standardizing validation errors in `quiz-generate`
```typescript
// Before (non-standard shape):
return NextResponse.json({ error: validation.message }, { status: 400 });

// After (standard shape, aligned with ERR-02):
import { toErrorResponse } from '@/lib/errors';

return NextResponse.json(
  toErrorResponse({
    category: 'invalid_input',
    retryable: false,
    userMessage: validation.message,
    technicalMessage: validation.message,
  }),
  { status: 400 },
);
```

**Note:** Existing `route.test.ts` tests for quiz-generate check `body.error` as a string (e.g., `expect(body.error).toContain('Incomplete quiz data')`). After this change, `body.error` is an object — tests must be updated to check `body.error.userMessage` instead.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| React class `ErrorBoundary` component | Next.js App Router `error.tsx` file convention | Next.js 13 (App Router launch) | Zero boilerplate; segment-scoped isolation |
| Global error page (`pages/_error.js`) | Per-segment `error.tsx` | Next.js 13 | Errors contained to the failing route segment |

**Deprecated/outdated:**
- `pages/_error.js`: Pages Router pattern — not applicable in App Router (project uses App Router)
- `react-error-boundary` package: Still functional but unnecessary when App Router `error.tsx` provides equivalent behavior natively

---

## Open Questions

1. **What does `queryJobStatus` in `heartmula.ts` throw when a jobId is not found?**
   - What we know: It calls the HeartMuLa API and parses the response. The ACE-Step API returns `status: 2` for FAILED jobs. "Not found" behavior is not yet confirmed from code review.
   - What's unclear: Does `queryJobStatus` throw on a 404 from HeartMuLa, return a FAILED status, or return a QUEUED status? This determines how poll-job should handle the "job not found" case.
   - Recommendation: Read `src/lib/heartmula.ts` before writing the poll-job plan. The handler behavior depends on this.

2. **Should the `success/error.tsx` boundary differ from `quiz/error.tsx` in copy?**
   - What we know: CONTEXT.md says both use the same yellow-100 card style. The quiz context ("progress is safe") differs from the success context ("your song couldn't be delivered").
   - What's unclear: Exact copy for the success-route error boundary.
   - Recommendation: Claude's Discretion — tailor the copy to context (success boundary implies generation completed but delivery failed; quiz boundary implies form/UI crash).

3. **Do existing `route.test.ts` assertions need to be updated for the quiz-generate validation shape change?**
   - What we know: Yes — `expect(body.error).toContain('Incomplete quiz data')` will break because `body.error` becomes an object.
   - What's unclear: Nothing — this is certain.
   - Recommendation: The plan must include updating the `quiz-generate/route.test.ts` tests alongside the route change. Not doing so will leave a failing test suite.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.0.18 + @testing-library/react 16.3.2 |
| Config file | `vitest.config.ts` (root) |
| Quick run command | `npx vitest run src/app/api/poll-job` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ERR-01 | Error boundaries render recovery UI when error is thrown | unit (React Testing Library) | `npx vitest run src/app/quiz/error` | Wave 0 gap |
| ERR-02 | API routes return `{error: {category, retryable, userMessage}}` shape, not stack traces | unit (route handler tests) | `npx vitest run src/app/api/poll-job` | Wave 0 gap |
| ERR-02 | Production stripping of `debug.technicalMessage` | unit (errors.ts) | `npx vitest run src/lib/errors` | ❌ Wave 0 gap |
| ERR-02 | quiz-generate validation errors return standard shape | unit (route handler) | `npx vitest run src/app/api/quiz-generate` | ✅ (needs update) |
| ERR-03 | Timeout state shows "Check Again" + "Start Over" buttons | unit (React Testing Library) | `npx vitest run src/app/quiz/success` | Wave 0 gap |
| ERR-03 | "Still working on it..." subtitle appears after 15s | unit (fake timers) | `npx vitest run src/app/quiz/success` | Wave 0 gap |

### Sampling Rate
- **Per task commit:** `npx vitest run src/` (unit tests only, ~5s)
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full unit suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/app/quiz/error.test.tsx` — covers ERR-01 (quiz boundary renders, `reset()` called, "Go home" link present)
- [ ] `src/app/quiz/success/error.test.tsx` — covers ERR-01 (success boundary renders)
- [ ] `src/app/api/poll-job/[jobId]/route.test.ts` — covers ERR-02 (granular 404 vs 502, standard shape)
- [ ] `src/lib/errors.test.ts` — covers ERR-02 production stripping (`NODE_ENV=production` → `[redacted]`)
- [ ] `src/app/quiz/success/[jobId]/page.test.tsx` — covers ERR-03 (timeout UI, Check Again button, 15s subtitle, error differentiation via fake timers)
- [ ] Update `src/app/api/quiz-generate/route.test.ts` — update existing assertions from `body.error` (string) to `body.error.userMessage` after ERR-02 shape alignment

---

## Sources

### Primary (HIGH confidence)
- Next.js App Router documentation — `error.tsx` file convention, `reset()` prop, segment scoping behavior
- `src/lib/errors.ts` (direct code read) — `classifyError`, `toErrorResponse`, `ErrorResponse` type
- `src/app/api/quiz-generate/route.ts` (direct code read) — reference implementation of structured error responses
- `src/app/api/poll-job/[jobId]/route.ts` (direct code read) — current silent-QUEUED fallback pattern
- `src/app/api/audio/[jobId]/route.ts` (direct code read) — partial hardening, non-standard shape
- `src/app/quiz/success/[jobId]/page.tsx` (direct code read) — existing error/timeout states, polling loop

### Secondary (MEDIUM confidence)
- Next.js 13+ App Router `error.tsx` behavior verified against Next.js version 16.1.6 in use

### Tertiary (LOW confidence)
- `queryJobStatus` error-throwing behavior — inferred from project memory; `heartmula.ts` not yet read. Needs direct verification before poll-job plan is written.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new packages; all libraries in use
- Architecture: HIGH — Next.js error boundary API is stable and well-documented; code patterns read directly from source
- Pitfalls: HIGH for items derived from direct code reading; MEDIUM for `queryJobStatus` behavior (unread)
- Test gaps: HIGH — gaps identified from direct file system check

**Research date:** 2026-03-06
**Valid until:** 2026-04-06 (stable APIs, no fast-moving dependencies)
