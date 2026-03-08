# Phase 31: Success Page + Dashboard UI — Research

**Researched:** 2026-03-07
**Domain:** Next.js 16 App Router — auth-gated Server Components, inline auth upsell, R2 presigned URL playback, re-download
**Confidence:** HIGH

---

## Summary

Phase 31 has two distinct surfaces: (1) additions to the existing success page (`/quiz/success/[jobId]/page.tsx`) and (2) a brand-new `/dashboard` page. The success page already exists as a full `'use client'` component with polling, audio playback, download, and a `SharePrompt` block. Phase 31 adds an `AuthPrompt` component (inline sign-up nudge, only after `pageState === 'ready'`) and a `RecipientEmailForm` component (triggers `POST /api/send-recipient-email`). The dashboard is a new Server Component route that authenticates via `createClient()` from `@/lib/supabase/server`, queries songs via Drizzle with `userId = auth.uid()` through RLS, generates presigned R2 URLs at read time, and renders a list of `SongCard` components (Client Component, contains the existing `SongPlayer` pattern and re-download anchor).

No new dependencies are required. All infrastructure (Drizzle, R2, Supabase SSR, `getAudioPresignedUrl`) was built in Phases 28-30 and is ready to consume. The only non-trivial design question is whether to use a middleware redirect or a server-component redirect for the dashboard auth guard — the STATE.md locked decision says only `/dashboard` is protected in middleware, but the current `middleware.ts` does not implement that guard. The correct pattern for this project is a server-component redirect (`redirect('/login?next=/dashboard')`) inside the dashboard page itself, which keeps middleware simple and avoids the middleware matcher complexity.

**Primary recommendation:** Build `AuthPrompt` and `RecipientEmailForm` as collocated `_components` inside the success `[jobId]` directory. Build `/dashboard` as a `async` Server Component page. Use `createClient()` + `supabase.auth.getUser()` for the auth guard. Query songs with Drizzle directly (bypasses RLS via `postgres` role), then generate presigned URLs in parallel with `Promise.all`. Embed `SongPlayer` (import from its existing location) in `SongCard` for each song row.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SUCC-01 | Non-blocking auth upsell appears on success page after generation — never a modal gate, never before COMPLETED state | `AuthPrompt` component renders only when `pageState === 'ready'`; Supabase browser client (`createBrowserClient`) checks `getUser()` in a `useEffect` to determine anonymous vs authenticated |
| SUCC-02 | Creator can enter recipient email on success page to send gift delivery email — send button not active until COMPLETED | `RecipientEmailForm` renders only in `ready` state; calls `POST /api/send-recipient-email`; button disabled while `isPending` or email is blank |
| SUCC-03 | Recipient email field includes privacy framing copy ("Private link — no marketing, ever") beneath the input | Static text node rendered below the `<input>` in `RecipientEmailForm` |
| DASH-01 | Authenticated users can access /dashboard — redirects to login if unauthenticated | Server Component: `const { data: { user } } = await supabase.auth.getUser(); if (!user) redirect('/login?next=/dashboard')` |
| DASH-02 | Dashboard lists all user's past songs with recipient name, relationship, genre, and date | Drizzle query on `songs` table selecting those columns ordered by `createdAt DESC` |
| DASH-03 | User can play songs in dashboard via native audio player with R2 presigned URLs | `getAudioPresignedUrl(song.r2Mp3Key, 3600)` per song, prop-drilled into `SongCard` (Client Component containing the `SongPlayer` pattern) |
| DASH-04 | User can re-download songs from dashboard | `<a href={presignedUrl} download={filename}>` in `SongCard` — same pattern as success page download button |
</phase_requirements>

---

## Standard Stack

### Core (already installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@supabase/ssr` | ^0.9.0 | Server-side auth client | Project-locked — only use this, not `auth-helpers-nextjs` |
| `drizzle-orm` | ^0.45.1 | DB queries for dashboard song list | Already used in all API routes; type-safe |
| `@aws-sdk/s3-request-presigner` | ^3.1001.0 | Generate R2 presigned URLs | Already in `src/lib/r2.ts` via `getAudioPresignedUrl` |
| `framer-motion` | ^12.35.0 | Animate-in transitions on dashboard | Already used on success page |
| `lucide-react` | ^0.577.0 | Icons (Download, Music, Play, Pause) | Already used throughout |
| `zod` | ^4.3.6 | Email validation in RecipientEmailForm | Already in project; use `z.string().email()` |

### No New Dependencies Needed
All required capabilities are already installed. Do NOT add `react-hook-form` — the project uses `useTransition` + manual `FormData` + Zod inline validation pattern (see login/signup pages). Do NOT add `swr` or `react-query` — dashboard is a Server Component that fetches data on load.

---

## Architecture Patterns

### Recommended Project Structure
```
src/app/
├── quiz/success/[jobId]/
│   ├── page.tsx                     # existing — add AuthPrompt + RecipientEmailForm
│   └── _components/
│       ├── SongPlayer.tsx           # existing — reuse in SongCard on dashboard
│       ├── SharePrompt.tsx          # existing
│       ├── ConfettiBlast.tsx        # existing
│       ├── AuthPrompt.tsx           # NEW — inline sign-up nudge
│       └── RecipientEmailForm.tsx   # NEW — send gift email to recipient
└── dashboard/
    ├── page.tsx                     # NEW — Server Component, auth guard, song list
    └── _components/
        └── SongCard.tsx             # NEW — Client Component, SongPlayer + re-download
```

### Pattern 1: Server Component Auth Guard (DASH-01)
**What:** Async Server Component reads user from Supabase, redirects if null.
**When to use:** All auth-required pages. Middleware in this project only refreshes the session token; it does NOT redirect — so the page itself must guard.

```typescript
// src/app/dashboard/page.tsx
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/db';
import { songs } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { getAudioPresignedUrl } from '@/lib/r2';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?next=/dashboard');
  }

  // Drizzle query — postgres role bypasses RLS, but user_id filter is explicit
  const userSongs = await db
    .select()
    .from(songs)
    .where(eq(songs.userId, user.id))
    .orderBy(desc(songs.createdAt));

  // Generate presigned URLs in parallel
  const songsWithUrls = await Promise.all(
    userSongs
      .filter((s) => s.r2Mp3Key !== null)
      .map(async (s) => ({
        ...s,
        audioUrl: await getAudioPresignedUrl(s.r2Mp3Key!, 3600),
      }))
  );

  return (/* render SongCard list */);
}
```

**IMPORTANT:** Use `supabase.auth.getUser()` — NOT `getSession()`. Project locked decision from v4.2 research: `getSession()` reads cookie without JWT revalidation and can be spoofed.

### Pattern 2: Inline Auth Upsell (SUCC-01)
**What:** Client Component rendered AFTER `pageState === 'ready'`. Checks Supabase browser session to decide whether to show the nudge at all.
**When to use:** Non-blocking — it disappears if user is already authenticated.

```typescript
// src/app/quiz/success/[jobId]/_components/AuthPrompt.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export function AuthPrompt({ jobId }: { jobId: string }) {
  const [isAnon, setIsAnon] = useState<boolean | null>(null);

  useEffect(() => {
    const supabase = createClient();
    void supabase.auth.getUser().then(({ data: { user } }) => {
      setIsAnon(user === null);
    });
  }, []);

  // Don't render while checking (null) or if authenticated (false)
  if (isAnon !== true) return null;

  // Construct a next param that returns user to this page after signup
  const returnUrl = `/quiz/success/${jobId}`;

  return (
    <div className="w-full bg-secondary/40 rounded-2xl border border-border p-6 text-center flex flex-col items-center gap-4">
      <h2 className="font-display text-xl text-foreground">Save your song</h2>
      <p className="text-muted-foreground text-sm max-w-sm">
        Create a free account to keep this song in your library and access it anytime.
      </p>
      <div className="flex gap-3">
        <Link
          href={`/signup?next=${encodeURIComponent(returnUrl)}`}
          className="bg-primary text-primary-foreground px-5 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          Sign up free
        </Link>
        <Link
          href={`/login?next=${encodeURIComponent(returnUrl)}`}
          className="border border-border text-foreground px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-muted transition-colors"
        >
          Log in
        </Link>
      </div>
    </div>
  );
}
```

### Pattern 3: RecipientEmailForm (SUCC-02, SUCC-03)
**What:** Client Component that POSTs to `/api/send-recipient-email` with `{ songId, recipientEmail }`.
**Critical:** Needs `songId` (UUID from the `songs` table), which is NOT the `jobId` (HeartBula job ID). The success page currently only has the `jobId`. The planner must address how to pass `songId` to the success page — see Open Questions.

```typescript
// src/app/quiz/success/[jobId]/_components/RecipientEmailForm.tsx
'use client';

import { useState, useTransition } from 'react';
import { Loader2, Send } from 'lucide-react';

interface RecipientEmailFormProps {
  songId: string; // UUID from songs table — must be provided by parent
}

export function RecipientEmailForm({ songId }: RecipientEmailFormProps) {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !songId) return;

    startTransition(async () => {
      const res = await fetch('/api/send-recipient-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ songId, recipientEmail: email }),
      });
      if (res.ok) {
        setSent(true);
      } else {
        setError('Could not send — please try again.');
      }
    });
  }

  if (sent) {
    return (
      <p className="text-sm text-muted-foreground text-center">
        Gift email sent! They'll receive it shortly.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="w-full flex flex-col gap-2">
      <label htmlFor="recipient-email" className="text-sm font-medium text-foreground">
        Send this song as a gift
      </label>
      <div className="flex gap-2">
        <input
          id="recipient-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="recipient@example.com"
          disabled={isPending}
          className="flex-1 rounded-lg border border-border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
        <button
          type="submit"
          disabled={isPending || !email}
          className="bg-primary text-primary-foreground px-4 py-2.5 rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-60 transition-opacity flex items-center gap-2"
        >
          {isPending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          Send
        </button>
      </div>
      {/* SUCC-03: Privacy framing */}
      <p className="text-xs text-muted-foreground">
        Private link — no marketing, ever.
      </p>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </form>
  );
}
```

### Pattern 4: SongCard Client Component (DASH-03, DASH-04)
**What:** Wraps the existing `SongPlayer` pattern for dashboard display. Re-download uses a presigned URL with `Content-Disposition` set by `getAudioPresignedUrl(key, expiresIn, filename)`.

```typescript
// src/app/dashboard/_components/SongCard.tsx
'use client';

import { Download } from 'lucide-react';
import { SongPlayer } from '@/app/quiz/success/[jobId]/_components/SongPlayer';

interface SongCardProps {
  recipientName: string;
  relationship: string;
  genre: string;
  createdAt: Date;
  audioUrl: string;         // presigned R2 URL from server
  downloadFilename: string; // e.g. "notevra-song-for-emma.mp3"
}

export function SongCard({ recipientName, relationship, genre, createdAt, audioUrl, downloadFilename }: SongCardProps) {
  return (
    <div className="bg-card rounded-2xl border border-border p-6 flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="font-display text-xl text-foreground">A song for {recipientName}</h2>
        <p className="text-sm text-muted-foreground capitalize">
          {relationship} · {genre} · {createdAt.toLocaleDateString()}
        </p>
      </div>
      <SongPlayer src={audioUrl} />
      <a
        href={audioUrl}
        download={downloadFilename}
        className="inline-flex items-center justify-center gap-2 border border-border text-foreground px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-muted transition-colors"
      >
        <Download className="w-4 h-4" />
        Download
      </a>
    </div>
  );
}
```

### Anti-Patterns to Avoid

- **Modal gate for sign-up:** Requirements and locked decisions explicitly forbid this. Auth upsell is inline-only, never a dialog.
- **Showing AuthPrompt before COMPLETED:** The `AuthPrompt` must be inside the `pageState === 'ready'` branch of the success page, not hoisted above the state machine.
- **Using getSession() for auth guard:** Always use `supabase.auth.getUser()` — locked project decision from v4.2 research.
- **Storing presigned URLs in the DB:** RLS decision locked in Phase 29 — store R2 object keys, presign at read time.
- **Middleware redirect for /dashboard:** Current middleware only calls `updateSession()` without any redirect logic. The dashboard page itself handles the redirect. Adding redirect logic to middleware would require extra conditional complexity and risks affecting other routes.
- **Fetching `songId` from the DB in the client:** `songId` should flow from the server response of `quiz-generate` through the URL or query param. See Open Questions for the resolution path.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Auth session reading on server | Custom cookie parsing | `createClient()` from `@/lib/supabase/server` | Handles token refresh, PKCE, getAll/setAll |
| R2 presigned URL generation | Custom S3 signing | `getAudioPresignedUrl()` from `@/lib/r2` | Already handles R2 quirks, expiry, Content-Disposition |
| Email validation | Custom regex | `z.string().email()` from Zod | Already in project, same pattern as auth forms |
| Audio playback | `<audio>` from scratch | `SongPlayer` from `@/app/quiz/success/[jobId]/_components/SongPlayer` | Already handles play/pause, progress bar, time formatting, R2 CORS |
| Server action for forms | Plain `fetch` | `useTransition` + `fetch` pattern | Server actions not needed here — the email send is a POST to an existing API route, not a form action |

---

## Common Pitfalls

### Pitfall 1: songId vs jobId Confusion
**What goes wrong:** The success page URL contains `jobId` (HeartBula's job ID, e.g. `abc123`). The `send-recipient-email` route requires `songId` (the Supabase UUID from the `songs` table). These are different values.
**Why it happens:** The success page was built before song persistence existed (Phase 29 came after Phase 18's success page).
**How to avoid:** The `quiz-generate` API route creates the song record and returns the `songId` alongside `jobId`. The `QuizPage` must store `songId` in the URL search params or localStorage when redirecting to the success page. Then the success page reads it. Check `quiz-generate/route.ts` to confirm the response shape includes `songId`.
**Warning signs:** `send-recipient-email` returns 404 "Song not found" or 400 "songId is required" during testing.

### Pitfall 2: presigned URL Expiry During Playback
**What goes wrong:** Dashboard uses 1-hour presigned URLs. If a user leaves the dashboard tab open for an hour and then tries to play, they get a 403. The audio element silently fails.
**Why it happens:** R2 presigned URLs are time-limited; there is no auto-refresh.
**How to avoid:** 1-hour expiry is acceptable for the dashboard — consistent with the `/api/audio/[jobId]` route's 1-hour presign. Add an `onError` handler to `SongPlayer` that shows a "Refresh to replay" message. Do not generate longer expiries (7-day max from the email route is for emailed links, not dashboard sessions).
**Warning signs:** Playback fails silently after 60 minutes.

### Pitfall 3: Dashboard Rendering Songs With Null r2Mp3Key
**What goes wrong:** A song in status `generating` or `failed` has `r2Mp3Key = null`. Calling `getAudioPresignedUrl(null!, 3600)` throws at runtime.
**Why it happens:** The dashboard query returns ALL songs for the user, including incomplete ones.
**How to avoid:** Filter in the Drizzle query: `.where(and(eq(songs.userId, user.id), isNotNull(songs.r2Mp3Key)))`. Or filter in JS before `Promise.all`. Show an empty state if no completed songs exist.
**Warning signs:** `TypeError: Cannot read properties of null` in `getAudioPresignedUrl` during dashboard load.

### Pitfall 4: SongPlayer Import Path in SongCard
**What goes wrong:** `SongCard` in `src/app/dashboard/_components/SongCard.tsx` imports `SongPlayer` from a long relative path or hardcoded path that breaks on move.
**Why it happens:** `SongPlayer` lives deep inside the quiz route tree.
**How to avoid:** Use the `@/` alias: `import { SongPlayer } from '@/app/quiz/success/[jobId]/_components/SongPlayer'`. This is stable under the current structure. Alternatively, the planner may choose to move `SongPlayer` to `@/components/SongPlayer` in this phase — see Open Questions.
**Warning signs:** Module resolution error during `next build`.

### Pitfall 5: AuthPrompt Causes Layout Shift
**What goes wrong:** `AuthPrompt` starts with `isAnon = null` (no render), then switches to `true` (renders), causing a visible layout jump below the audio player.
**Why it happens:** `useEffect` runs after first paint; `getUser()` is async.
**How to avoid:** The component should render a fixed-height skeleton or simply `return null` while `isAnon === null` (current approach in the example above). Since this runs only on the success page after the song is ready, the brief flash of absent content is acceptable. The layout already has `gap-8` between sections, so a sudden insert is less jarring. Do not use a suspense boundary — this is client-only.

### Pitfall 6: send-recipient-email Called Before Song Is Finalized
**What goes wrong:** `RecipientEmailForm` is rendered in `ready` state, but `r2Mp3Key` might still be null if `finalizeSong()` in `poll-job` failed silently.
**Why it happens:** `finalizeSong` errors are swallowed (intentional design decision from Phase 29-02) — client sees COMPLETED even if finalization failed.
**How to avoid:** The `send-recipient-email` route already validates `song.r2Mp3Key` and returns 400 if null. The form should handle this error response gracefully: show "Song is still processing — try again in a moment" rather than a generic error.
**Warning signs:** 400 response from send-recipient-email with body `{ error: "Song is not finalized" }`.

---

## Code Examples

Verified from existing codebase:

### Drizzle Query — User's Songs, Completed Only
```typescript
// Pattern from src/app/api/audio/[jobId]/route.ts and src/app/api/poll-job/[jobId]/route.ts
import { eq, desc, and, isNotNull } from 'drizzle-orm';
import { db } from '@/db';
import { songs } from '@/db/schema';

const userSongs = await db
  .select()
  .from(songs)
  .where(and(eq(songs.userId, user.id), isNotNull(songs.r2Mp3Key)))
  .orderBy(desc(songs.createdAt));
```

### Server Component Redirect Pattern
```typescript
// Source: next/navigation docs + layout.tsx pattern in this codebase
import { redirect } from 'next/navigation';

// Inside an async Server Component:
const { data: { user } } = await supabase.auth.getUser();
if (!user) {
  redirect('/login?next=/dashboard');
}
```

### R2 Presigned URL for Re-download (with filename)
```typescript
// Source: src/lib/r2.ts — getAudioPresignedUrl with downloadFilename
const downloadUrl = await getAudioPresignedUrl(
  song.r2Mp3Key!,
  3600,
  `notevra-song-for-${song.recipientName.toLowerCase().replace(/\s+/g, '-')}.mp3`
);
```

### Supabase Browser Client Check (for AuthPrompt)
```typescript
// Source: src/lib/supabase/client.ts
import { createClient } from '@/lib/supabase/client';

const supabase = createClient(); // createBrowserClient under the hood
const { data: { user } } = await supabase.auth.getUser();
// user === null → anonymous; user !== null → authenticated
```

### useTransition + fetch Pattern (for RecipientEmailForm)
```typescript
// Source: src/app/login/page.tsx + src/app/signup/page.tsx — project standard
const [isPending, startTransition] = useTransition();

startTransition(async () => {
  const res = await fetch('/api/send-recipient-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ songId, recipientEmail: email }),
  });
  // handle res.ok
});
```

---

## State of the Art

| Old Approach | Current Approach | Notes |
|--------------|------------------|-------|
| `@supabase/auth-helpers-nextjs` | `@supabase/ssr` | Locked decision — never use the old package |
| `getSession()` | `getUser()` | Locked decision — getSession can be spoofed |
| `cookies().set()` in route handlers | `response.cookies.set()` | Locked decision from Phase 29-02 |
| `vi.mock()` with non-hoisted variables | `vi.hoisted()` + `vi.mock()` | Locked decision from Phase 29-02 to avoid TDZ errors |

---

## Open Questions

### 1. How does `songId` reach the success page?
**What we know:** The success page URL is `/quiz/success/[jobId]`. The email send API needs `songId` (UUID). The `quiz-generate` route creates the song record.
**What's unclear:** Does `quiz-generate/route.ts` currently return `songId` in its response? The quiz page (`/quiz/page.tsx`) would need to pass it forward.
**Recommendation:** Read `quiz-generate/route.ts` and `quiz/page.tsx` during planning. If `songId` is not returned, the `quiz-generate` route needs a one-line addition. The success page can then receive `songId` via a `?songId=` search param (same mechanism as `?name=` for `recipientName`). This is a low-risk addition.

### 2. Should `SongPlayer` be promoted to `@/components/`?
**What we know:** `SongPlayer` is currently colocated inside the quiz success route. The dashboard `SongCard` needs to import it.
**What's unclear:** Is cross-route component import (`@/app/quiz/success/[jobId]/_components/SongPlayer`) acceptable?
**Recommendation:** Leave `SongPlayer` in place for Plan 31-01 and import via `@/` alias. The planner can optionally move it to `@/components/` in Plan 31-02. No functional difference — just organization. The `@/` alias works across route boundaries.

### 3. Empty dashboard state copy
**What we know:** If a user has no completed songs (signed up but never generated), dashboard should show an empty state.
**What's unclear:** Exact copy and CTA not specified in requirements.
**Recommendation:** "You haven't created any songs yet. [Create your first song →]" linking to `/quiz`. This is straightforward and within scope.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.x + @testing-library/react 16.x |
| Config file | `vitest.config.ts` (root) |
| Quick run command | `npx vitest run src/app/dashboard` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SUCC-01 | AuthPrompt hidden when authenticated | unit | `npx vitest run src/app/quiz/success/[jobId]/_components/AuthPrompt.test.tsx` | ❌ Wave 0 |
| SUCC-01 | AuthPrompt visible when anonymous | unit | `npx vitest run src/app/quiz/success/[jobId]/_components/AuthPrompt.test.tsx` | ❌ Wave 0 |
| SUCC-01 | AuthPrompt not rendered before pageState=ready | unit | `npx vitest run src/app/quiz/success/[jobId]/page.test.tsx` | ✅ (extend existing) |
| SUCC-02 | RecipientEmailForm send button disabled when email blank | unit | `npx vitest run src/app/quiz/success/[jobId]/_components/RecipientEmailForm.test.tsx` | ❌ Wave 0 |
| SUCC-02 | RecipientEmailForm POSTs to send-recipient-email on submit | unit | `npx vitest run src/app/quiz/success/[jobId]/_components/RecipientEmailForm.test.tsx` | ❌ Wave 0 |
| SUCC-03 | Privacy framing text visible below input | unit | `npx vitest run src/app/quiz/success/[jobId]/_components/RecipientEmailForm.test.tsx` | ❌ Wave 0 |
| DASH-01 | Dashboard redirects to /login?next=/dashboard when unauthenticated | unit | `npx vitest run src/app/dashboard/page.test.tsx` | ❌ Wave 0 |
| DASH-02 | Dashboard renders song list with recipient name, relationship, genre, date | unit | `npx vitest run src/app/dashboard/page.test.tsx` | ❌ Wave 0 |
| DASH-03 | SongCard renders SongPlayer with audioUrl prop | unit | `npx vitest run src/app/dashboard/_components/SongCard.test.tsx` | ❌ Wave 0 |
| DASH-04 | SongCard download anchor has correct href and download attribute | unit | `npx vitest run src/app/dashboard/_components/SongCard.test.tsx` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run src/app/quiz/success/[jobId]/_components` or `npx vitest run src/app/dashboard`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/app/quiz/success/[jobId]/_components/AuthPrompt.test.tsx` — covers SUCC-01
- [ ] `src/app/quiz/success/[jobId]/_components/RecipientEmailForm.test.tsx` — covers SUCC-02, SUCC-03
- [ ] `src/app/dashboard/page.test.tsx` — covers DASH-01, DASH-02 (Server Component — mock createClient)
- [ ] `src/app/dashboard/_components/SongCard.test.tsx` — covers DASH-03, DASH-04

**Testing Server Components in Vitest:** Dashboard `page.tsx` is an `async` Server Component. It cannot be rendered with `@testing-library/react` directly. The project pattern (from `HeaderClient.test.tsx`) is to test Server Components via their Client children. For the dashboard page test, mock `createClient` (via `src/lib/supabase/__mocks__/server.ts` which already exists) and test redirect behavior by asserting the `redirect` call from `next/navigation`.

---

## Sources

### Primary (HIGH confidence)
- Existing codebase — `src/app/quiz/success/[jobId]/page.tsx`, `src/lib/r2.ts`, `src/lib/supabase/`, `src/db/schema.ts`, `src/app/api/send-recipient-email/route.ts` — all read directly
- `.planning/STATE.md` — locked decisions from all prior phases
- `.planning/REQUIREMENTS.md` — DASH-01 through SUCC-03 definitions

### Secondary (MEDIUM confidence)
- Next.js App Router documentation patterns — `redirect()` in async Server Components, `'use client'` + `useEffect` for browser-only Supabase checks

### Tertiary (LOW confidence)
- None — all findings grounded in the existing codebase

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already installed and used
- Architecture patterns: HIGH — derived from existing page patterns in codebase
- Pitfalls: HIGH — derived from schema shape, API route logic, and locked decisions
- Open questions: MEDIUM — songId flow requires confirming quiz-generate response shape

**Research date:** 2026-03-07
**Valid until:** 2026-04-07 (stable project — no fast-moving dependencies expected to change)
