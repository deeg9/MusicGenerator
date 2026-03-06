# Phase 10: Library Data Layer - Research

**Researched:** 2026-03-05
**Domain:** Next.js RSC data fetching, Drizzle ORM relational queries, Cloudflare R2 presigned URLs, React Server Components
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Song title derivation**
- Display title derived from promptText — truncate to first ~40 characters with ellipsis if longer
- Fallback title: "Untitled Song" when promptText is empty or missing
- One entry per generation (not per variant) — variants are an internal detail, user picks which to play in Phase 11
- Only show completed generations (status='completed') — no failed/pending songs in library

**List layout style**
- Vertical card list — full-width cards stacked vertically (Suno library pattern)
- Each card is a horizontal row: title, genre tags, duration, generation date
- Simple header: "Library" title + song count (e.g. "12 songs"), no sort controls (always newest-first)
- Fetch 50 songs max server-side (50-item LIMIT in Drizzle query)
- Generate MP3 presigned URLs now — include them in server data so Phase 11 can wire play buttons without additional API calls

**Tag and metadata display**
- Genre tags displayed as colored pills/chips — split genreTags on comma, use brand accent colors (amber/muted variants)
- Duration format: mm:ss (e.g. "2:00")
- Date format: relative time ("2 hours ago", "yesterday", "Mar 3")
- Instrumental songs get a small "Instrumental" badge alongside genre tags

**Empty state**
- Keep Phase 9's existing empty state design (Library icon in circle + "Your library is empty" + CTA)
- Extract to separate LibraryEmpty component (src/components/LibraryEmpty.tsx)
- CTA navigates to home (/) — will be updated to /?mode=create when Phase 12 workspace exists
- Add app/library/error.tsx boundary for friendly "Something went wrong" fallback if DB query fails
- Pure SSR for happy path — no loading.tsx, no client-side spinner

### Claude's Discretion

None — discussion stayed within phase scope.

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| LIB2-02 | Library page displays all previously generated songs as browsable cards | Drizzle `findMany` with `where eq(status,'completed')`, `orderBy desc(startedAt)`, `limit 50`, `with: {outputs: true}` — confirmed pattern from existing status route |
| LIB2-03 | Each library card shows song title, genre/style, duration, and generation date | All fields exist in schema: promptText, genreTags, duration (integer seconds), startedAt — see schema.ts lines 26-36 |
| LIB2-06 | Library page shows an empty state when no songs have been generated | LibraryEmpty component extraction from existing stub; conditional render in RSC based on empty array |
</phase_requirements>

---

## Summary

Phase 10 is a focused data-plumbing phase: replace the existing `/library` stub with a real Next.js React Server Component that queries Supabase via Drizzle, generates R2 presigned URLs for each output, and renders a vertical card list with an extracted `LibraryEmpty` fallback. All data arrives on the initial HTML — no client-side loading state.

The existing codebase already has every building block: `db.query.generations.findFirst({ with: { outputs: true } })` is live in `src/app/api/status/[jobId]/route.ts`, `getAudioPresignedUrl()` is established in `src/lib/r2.ts`, and the Drizzle schema exposes all needed fields. Phase 10 is primarily composition: write the RSC query, format display values, build the card and empty-state components.

The single meaningful design decision for the planner is the presigned URL generation strategy: generating one URL per output record inside the RSC (sequentially vs. in parallel with `Promise.all`). Parallel generation is the correct choice — the existing status route demonstrates this pattern.

**Primary recommendation:** Write `app/library/page.tsx` as an `async` RSC. Use `db.query.generations.findMany({ where: eq(generations.status, 'completed'), orderBy: [desc(generations.startedAt)], limit: 50, with: { outputs: true } })`. Call `getAudioPresignedUrl` in parallel via `Promise.all`. Render `<LibraryEmpty />` when array is empty, otherwise a vertical card list.

---

## Standard Stack

### Core (all already installed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| drizzle-orm | ^0.45.1 | Relational query builder | Already in project; `db.query.*` relational API for type-safe joins |
| postgres | ^3.4.8 | DB client (Supabase pooler) | Already configured with `prepare: false` for transaction pooler |
| @aws-sdk/client-s3 | ^3.1001.0 | R2 presigned URL generation | Already in project; `GetObjectCommand` pattern established |
| @aws-sdk/s3-request-presigner | ^3.1001.0 | `getSignedUrl` helper | Already in project |
| next | 16.1.6 | RSC runtime, `error.tsx` boundary | App Router RSC is the entire architecture |
| lucide-react | ^0.577.0 | Icon set | Already used throughout (Library icon in current stub) |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| InferSelectModel (drizzle-orm) | same | TypeScript type for schema rows | Use for `LibrarySong` type derived from query result |

### No New Installs Needed

All dependencies for Phase 10 are already in `package.json`. Zero `npm install` steps required.

---

## Architecture Patterns

### Recommended File Structure

```
src/
├── app/
│   └── library/
│       ├── page.tsx          # RSC — async, fetches data, renders list or empty
│       ├── error.tsx         # "use client" error boundary (Next.js requirement)
│       └── page.test.tsx     # REPLACE existing test — mock db module
├── components/
│   ├── LibraryEmpty.tsx      # Extracted empty state (no "use client" needed)
│   └── LibrarySongCard.tsx   # Single card component (pure display, no "use client")
```

### Pattern 1: Async RSC with Drizzle Relational Query

**What:** `page.tsx` is an `async` function that `await`s a Drizzle query inside the component body. No `useEffect`, no `useState`, no loading spinner.

**When to use:** Any Next.js App Router page that needs server-side data. This is the canonical RSC data-fetching pattern.

**Example (matches project's existing Drizzle usage):**

```typescript
// src/app/library/page.tsx
import { db } from '@/db';
import { generations } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { getAudioPresignedUrl } from '@/lib/r2';
import { LibraryEmpty } from '@/components/LibraryEmpty';

export const metadata = { title: 'Library | Notera' };

// Mirrors the shape used in status route
type GenerationRow = Awaited<ReturnType<typeof fetchLibrarySongs>>[number];

async function fetchLibrarySongs() {
  return db.query.generations.findMany({
    where: eq(generations.status, 'completed'),
    orderBy: [desc(generations.startedAt)],
    limit: 50,
    with: { outputs: true },
  });
}

export default async function LibraryPage() {
  const songs = await fetchLibrarySongs();

  if (songs.length === 0) {
    return <LibraryEmpty />;
  }

  // Generate presigned URLs in parallel — same approach as buildOutputsWithUrls in status route
  const songsWithUrls = await Promise.all(
    songs.map(async (song) => {
      const firstOutput = song.outputs[0];
      const playbackUrl = firstOutput?.mp3R2Key
        ? await getAudioPresignedUrl(firstOutput.mp3R2Key, 86400).catch(() => null)
        : null;
      return { ...song, playbackUrl };
    }),
  );

  return (
    <div className="px-6 py-8">
      <header className="mb-6">
        <h1 className="font-display text-3xl font-bold text-foreground">Library</h1>
        <p className="text-sm text-muted-foreground">{songs.length} songs</p>
      </header>
      <ul className="space-y-3">
        {songsWithUrls.map((song) => (
          <LibrarySongCard key={song.id} song={song} />
        ))}
      </ul>
    </div>
  );
}
```

### Pattern 2: error.tsx Boundary

**What:** A `"use client"` component that catches thrown errors from the RSC and renders a friendly fallback. Next.js App Router requires this to be a Client Component.

**When to use:** Any route that does async I/O (DB, API calls) and should show a graceful fallback instead of a white crash page.

**Example:**

```typescript
// src/app/library/error.tsx
'use client';

import { useEffect } from 'react';

export default function LibraryError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[library] Page error:', error);
  }, [error]);

  return (
    <div className="flex min-h-full flex-col items-center justify-center px-4 py-16">
      <p className="mb-4 text-muted-foreground">Something went wrong loading your library.</p>
      <button
        onClick={reset}
        className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
      >
        Try again
      </button>
    </div>
  );
}
```

### Pattern 3: LibraryEmpty Component Extraction

**What:** Move the inline empty state from the current page stub into `src/components/LibraryEmpty.tsx`. This is a pure presentational component — no `"use client"` needed.

**Why extract:** The RSC can import it cleanly, and Phase 11 or 12 may reuse it. Keeps `page.tsx` focused on data logic.

```typescript
// src/components/LibraryEmpty.tsx
import { Library } from 'lucide-react';

export function LibraryEmpty() {
  return (
    <div className="flex min-h-full flex-col items-center justify-center px-4 py-16">
      <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-accent/10">
        <Library className="h-10 w-10 text-primary" />
      </div>
      <h2 className="mb-2 font-display text-2xl font-bold text-foreground">
        Your library is empty
      </h2>
      <p className="mb-8 text-center text-sm text-muted-foreground">
        Songs you generate will appear here.
      </p>
      <a
        href="/"
        className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
      >
        Create your first song
      </a>
    </div>
  );
}
```

### Pattern 4: Display Utilities (pure functions, no library needed)

**Duration formatting (mm:ss):**

```typescript
// Returns "2:00" for 120, "0:45" for 45, "4:03" for 243
export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}
```

**Title truncation:**

```typescript
export function deriveTitle(promptText: string | null | undefined): string {
  if (!promptText?.trim()) return 'Untitled Song';
  return promptText.length > 40 ? `${promptText.slice(0, 40)}…` : promptText;
}
```

**Relative date — use a lightweight approach (no external library):**

```typescript
export function formatRelativeDate(date: Date): string {
  const now = Date.now();
  const diff = now - date.getTime();
  const hours = diff / (1000 * 60 * 60);
  const days = diff / (1000 * 60 * 60 * 24);

  if (hours < 1) return 'Just now';
  if (hours < 24) return `${Math.floor(hours)} hours ago`;
  if (days < 2) return 'Yesterday';
  // Format as "Mar 3"
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
```

Note: Relative dates will be static on first render (SSR) — that is correct for this phase. Phase 11 can hydrate with a `"use client"` wrapper if live updates are needed.

### Pattern 5: Genre Tag Pills

```typescript
// Split CSV genreTags into individual pills
// Example: "jazz, hip-hop, cinematic" → ["jazz", "hip-hop", "cinematic"]
const tags = song.genreTags ? song.genreTags.split(',').map(t => t.trim()).filter(Boolean) : [];
```

Render with brand tokens:

```tsx
{tags.map((tag) => (
  <span
    key={tag}
    className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
  >
    {tag}
  </span>
))}
{song.instrumental && (
  <span className="rounded-full bg-accent/20 px-2 py-0.5 text-xs font-medium text-accent-foreground">
    Instrumental
  </span>
)}
```

### Anti-Patterns to Avoid

- **Adding `"use client"` to page.tsx:** This destroys the SSR guarantee (SC3 requires data on first paint). The page MUST be an async RSC.
- **Using `useEffect` + `fetch` in page.tsx:** Client-side fetching means a loading skeleton on first paint — explicitly ruled out by SC3.
- **Adding `loading.tsx` to the library route:** No loading spinner wanted. The RSC blocks and renders once data is ready (this is the correct behavior for a library).
- **Sequential presigned URL generation:** Generating URLs with `for...of await` instead of `Promise.all` adds unnecessary latency (50 songs × ~50ms = 2.5s sequential vs. ~50ms parallel).
- **Calling `getAudioPresignedUrl` without error handling:** R2 calls can fail transiently. Wrap with `.catch(() => null)` so one bad URL doesn't crash the entire page.
- **Importing directly from `'gsap'` in any new file:** Project convention from Phase 9 — all GSAP goes through `gsap-config.ts`. Phase 10 has no GSAP usage so this is a non-issue, but do not add it.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Joining generations with outputs | Manual JOIN SQL | `db.query.generations.findMany({ with: { outputs: true } })` | Drizzle relational API handles type-safe eager loading with defined relations |
| Presigned URL generation | Custom signing logic | `getAudioPresignedUrl(key, 86400)` in `src/lib/r2.ts` | Already built, tested, handles R2 endpoint quirks |
| TypeScript types for DB rows | Manual interface | `InferSelectModel<typeof generations>` from drizzle-orm | Auto-syncs with schema changes |
| Error boundary | Try/catch wrapping entire RSC | `app/library/error.tsx` with Next.js App Router error.tsx convention | Next.js handles this automatically when file exists |

**Key insight:** Every primitive needed is already built. Phase 10 is orchestration — calling existing functions in the right order and rendering the result.

---

## Common Pitfalls

### Pitfall 1: RSC Cannot Be Tested with `render()` Directly

**What goes wrong:** The existing `page.test.tsx` calls `render(<LibraryPage />)` synchronously. Once `LibraryPage` becomes `async`, the test throws because Vitest/Testing Library's `render` doesn't natively handle async RSC functions.

**Why it happens:** React Server Components are async functions. Testing Library's `render` is designed for synchronous Client Components.

**How to avoid:** Replace the existing page test with a module-level mock approach OR test the data-fetching function and display components separately.

Recommended test strategy:
1. Mock `@/db` at module level in the page test, then `await LibraryPage()` to get the JSX, then `render()` the result
2. Test `LibraryEmpty` and `LibrarySongCard` as normal synchronous component tests
3. Test `formatDuration`, `deriveTitle`, `formatRelativeDate` as pure unit functions (no render needed)

```typescript
// page.test.tsx — async RSC test pattern
import { vi, describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

// Mock the db module before importing the page
vi.mock('@/db', () => ({
  db: {
    query: {
      generations: {
        findMany: vi.fn(),
      },
    },
  },
}));
vi.mock('@/lib/r2', () => ({
  getAudioPresignedUrl: vi.fn().mockResolvedValue('https://presigned.url/test'),
}));

import { db } from '@/db';
import LibraryPage from './page';

describe('LibraryPage', () => {
  it('renders empty state when no songs', async () => {
    vi.mocked(db.query.generations.findMany).mockResolvedValue([]);
    const jsx = await LibraryPage();
    render(jsx);
    expect(screen.getByText('Your library is empty')).toBeInTheDocument();
  });
});
```

### Pitfall 2: outputs Array May Be Empty for Completed Generations

**What goes wrong:** A generation can be `status='completed'` but have zero outputs if R2 upload failed for all variants (the status route logs the error and proceeds). Accessing `song.outputs[0]` without a null check throws.

**Why it happens:** The status route's audio upload is wrapped in per-variant try/catch — a failed upload is logged but doesn't change the generation status to 'failed'.

**How to avoid:** Always guard `song.outputs[0]`:

```typescript
const firstOutput = song.outputs?.[0] ?? null;
const playbackUrl = firstOutput?.mp3R2Key
  ? await getAudioPresignedUrl(firstOutput.mp3R2Key, 86400).catch(() => null)
  : null;
```

Cards with `playbackUrl === null` should still render — Phase 11 will handle the "no playback URL" state gracefully (play button disabled or hidden).

### Pitfall 3: Relative Date Hydration Mismatch

**What goes wrong:** If `formatRelativeDate` is called on the server and produces "2 hours ago", then a client-side component re-runs the same function 1 second later, React's hydration diff detects a mismatch ("2 hours ago" vs "2 hours ago" — usually fine, but at hour boundaries it can produce hydration warnings).

**Why it happens:** SSR and client hydration run at slightly different times, and time-based strings are inherently dynamic.

**How to avoid:** For Phase 10 (pure SSR, no client components in the card), this is not an issue — the date is rendered once and static. Only becomes relevant in Phase 11 if cards become client components. Document for Phase 11 awareness.

### Pitfall 4: Drizzle `findMany` Requires Schema Loaded in `db` Instance

**What goes wrong:** `db.query.generations.findMany(...)` requires the `db` instance to be created with the schema passed. If the schema isn't loaded, `db.query` is undefined.

**Why it happens:** Drizzle's relational query API is opt-in — must pass `schema` to `drizzle()`.

**How to avoid:** Already solved. `src/db/index.ts` line 9: `export const db = drizzle({ client, schema })`. The schema IS loaded. No change needed — just don't accidentally create a new `drizzle()` instance without the schema.

---

## Code Examples

Verified from existing codebase sources:

### Drizzle Relational Query (verified from status route)

```typescript
// Source: src/app/api/status/[jobId]/route.ts lines 62-65
const result = await db.query.generations.findFirst({
  where: eq(generations.id, jobId),
  with: { outputs: true },
});
```

For `findMany` with ordering and limit (same API, documented pattern):

```typescript
// Source: Drizzle ORM relational queries API
import { eq, desc } from 'drizzle-orm';

const songs = await db.query.generations.findMany({
  where: eq(generations.status, 'completed'),
  orderBy: [desc(generations.startedAt)],
  limit: 50,
  with: { outputs: true },
});
```

### Presigned URL (verified from status route)

```typescript
// Source: src/app/api/status/[jobId]/route.ts line 233
const playbackUrl = await getAudioPresignedUrl(mp3R2Key, 86400);
```

### Parallel URL Generation (verified pattern from status route Promise.allSettled pattern)

```typescript
// Source: adapted from src/app/api/status/[jobId]/route.ts lines 117-135
const songsWithUrls = await Promise.all(
  songs.map(async (song) => {
    const firstOutput = song.outputs?.[0] ?? null;
    const playbackUrl = firstOutput?.mp3R2Key
      ? await getAudioPresignedUrl(firstOutput.mp3R2Key, 86400).catch(() => null)
      : null;
    return { ...song, playbackUrl };
  }),
);
```

### Brand Token Usage (verified from existing components)

```typescript
// Source: src/app/library/page.tsx (existing stub)
// text-foreground, text-muted-foreground, bg-accent/10, text-primary,
// bg-primary, text-primary-foreground — all confirmed in use

// Source: src/app/api/status/[jobId]/route.ts type patterns
import type { InferSelectModel } from 'drizzle-orm';
type Generation = InferSelectModel<typeof generations>;
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `getServerSideProps` (Pages Router) | `async` RSC in App Router | Next.js 13+ App Router | Data fetching is now in the component body, not a separate lifecycle function |
| Separate data fetching + page component | Single async RSC component | Next.js App Router | Simpler mental model — the component IS the query |
| Client-side fetch on mount | RSC top-level await | Next.js 13+ | Zero client JS for data fetching; data on first HTML byte |
| `pages/api/` route for data | Direct DB call in RSC | Next.js App Router | No round-trip to a separate API route for page data |

**Deprecated/outdated:**
- `getServerSideProps`: Do not use — this is Pages Router only. `app/library/page.tsx` uses App Router.
- `loading.tsx` for this route: Explicitly excluded by user constraint ("no loading spinner").

---

## Open Questions

1. **Variant selection strategy for presigned URL**
   - What we know: The context says "one entry per generation" and "presigned URLs for MP3s now" — Phase 11 picks which variant to play.
   - What's unclear: Should the RSC generate presigned URLs for ALL variants (0 and 1) or just the first (index 0)?
   - Recommendation: Generate for all outputs (`song.outputs.map(...)`) and include all in the card data. Phase 11 will render variant selection UI. Store as `playbackUrls: string[]` on the card data object. This avoids Phase 11 needing to fetch anything.

2. **Song count in header**
   - What we know: Context says "12 songs" style header using the array length.
   - What's unclear: Should it be "12 songs" or "12 song" for singular?
   - Recommendation: `${songs.length} ${songs.length === 1 ? 'song' : 'songs'}` — standard English pluralization, one line.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.x |
| Config file | `vitest.config.ts` (project root) |
| Quick run command | `npx vitest run src/app/library` |
| Full suite command | `npx vitest run` |

### Phase Requirements to Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| LIB2-02 | Songs list renders when DB returns completed generations | unit (async RSC) | `npx vitest run src/app/library/page.test.tsx` | Exists (must be replaced) |
| LIB2-03 | Card displays title, genre tags, duration, date | unit (component) | `npx vitest run src/components/LibrarySongCard.test.tsx` | Wave 0 gap |
| LIB2-06 | Empty state renders when DB returns empty array | unit (async RSC) | `npx vitest run src/app/library/page.test.tsx` | Exists (must be replaced) |

### Sampling Rate

- **Per task commit:** `npx vitest run src/app/library`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `src/components/LibrarySongCard.test.tsx` — covers LIB2-03 card display
- [ ] `src/components/LibraryEmpty.test.tsx` — covers LIB2-06 extracted component
- [ ] `src/app/library/page.test.tsx` — REPLACE existing tests (current tests render stub; must be rewritten to mock `@/db` and test async RSC)

**Note on existing `page.test.tsx`:** The three current tests (`renders empty state heading`, `renders create CTA`, `CTA links to /`) will break once the page becomes an async RSC. The plan MUST include rewriting these tests as part of the implementation task, not as a separate clean-up task.

---

## Sources

### Primary (HIGH confidence)

- `src/db/schema.ts` — exact field names, types, and relations in the Drizzle schema
- `src/lib/r2.ts` — `getAudioPresignedUrl` signature and behavior verified
- `src/db/index.ts` — confirmed schema is loaded in `db` instance (relational API available)
- `src/app/api/status/[jobId]/route.ts` — confirmed `db.query.generations.findFirst({ with: { outputs: true } })` pattern works in this project
- `src/app/library/page.tsx` — exact markup to preserve in LibraryEmpty extraction
- `vitest.config.ts` — confirmed test environment (jsdom, globals, setupFiles)
- `package.json` — confirmed all needed dependencies present, no installs needed

### Secondary (MEDIUM confidence)

- Next.js App Router documentation: `error.tsx` must be `"use client"` — standard App Router convention, confirmed by multiple Next.js docs references

### Tertiary (LOW confidence)

- None — all research findings verified against project source files directly

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — verified against package.json and existing source files
- Architecture: HIGH — Drizzle relational query pattern is live in the project; RSC async pattern is standard Next.js App Router
- Pitfalls: HIGH — outputs empty array pitfall verified against status route error handling logic; RSC test pitfall verified against Vitest behavior with async functions

**Research date:** 2026-03-05
**Valid until:** 2026-06-05 (stable stack — Next.js, Drizzle, R2 APIs are stable)
