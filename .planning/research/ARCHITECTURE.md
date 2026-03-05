# Architecture Research

**Domain:** Suno-style UX overhaul — persistent audio player, library page, two-panel workspace integration into existing Next.js App Router app
**Researched:** 2026-03-05
**Confidence:** HIGH — based on direct codebase inspection; no speculation about what exists

---

## Note on Prior Architecture Document

The previous ARCHITECTURE.md (v1.1, 2026-03-05) covered design system and token infrastructure. That content remains valid and complete. This document supersedes it as ARCHITECTURE.md for the v2.0 Suno-style UX overhaul milestone. The v1.1 design system content is preserved in `.planning/phases/` plan files.

---

## What Already Exists (Do Not Re-build)

A direct codebase audit reveals these structures are already in place:

| Component | File | Status |
|-----------|------|--------|
| `AudioPlayerContext` | `src/contexts/AudioPlayerContext.tsx` | Complete — useReducer state, PLAY/PAUSE/RESUME/STOP actions, `AudioTrack` type |
| `AudioPlayerProvider` | same | Complete — wraps `AppShell`, scoped to entire app |
| `BottomAudioPlayer` | `src/components/layout/BottomAudioPlayer.tsx` | Complete — wavesurfer.js, desktop + mobile layouts, AnimatePresence slide-in |
| `AppShell` | `src/components/layout/AppShell.tsx` | Complete — `SidebarProvider` + `AudioPlayerProvider` + `BottomAudioPlayer` wired in layout |
| `Sidebar` | `src/components/layout/Sidebar.tsx` | Complete — hover-expand desktop, mobile overlay, Home/Create/Library/Search nav items |
| `SidebarProvider` | `src/components/layout/SidebarProvider.tsx` | Complete — open/mobileOpen state, context |
| `VariantCard` | `src/components/VariantCard.tsx` | Complete — delegates play to `AudioPlayerContext`, inline waveform visual-only |
| `GenerationPage` | `src/components/GenerationPage.tsx` | Complete — phase state machine (idle/submitting/polling/done/error), form + results |
| `useGenerationStatus` | `src/hooks/useGenerationStatus.ts` | Complete — polling hook, 2.5s interval, returns `StatusResult` |

**Key finding:** The persistent bottom player bar, audio player context, sidebar with Library link, and AppShell layout are already built. The v2.0 milestone is about wiring them to actual content and adding the missing pages — not rebuilding infrastructure.

---

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           layout.tsx (RSC)                                   │
│  ThemeProvider                                                                │
│  └── AppShell (Client)                                                        │
│       ├── SidebarProvider (Context)                                           │
│       ├── AudioPlayerProvider (Context) ◄─── ALREADY EXISTS                  │
│       ├── Sidebar (Client) ◄────────────────── ALREADY EXISTS                │
│       ├── <main> (scrollable content area)                                    │
│       │    └── {children} ─── page.tsx routes                                │
│       └── BottomAudioPlayer (Client) ◄──── ALREADY EXISTS                    │
└─────────────────────────────────────────────────────────────────────────────┘

Page Routes (src/app/)
├── page.tsx ─────────── MODIFY: HeroSection → same-page two-panel workspace
└── library/
     └── page.tsx ──── NEW: library browsing page

Context Layer (src/contexts/)
└── AudioPlayerContext.tsx ─── ALREADY EXISTS (PLAY/PAUSE/RESUME/STOP + AudioTrack)

Components (src/components/)
├── layout/
│   ├── AppShell.tsx ─────── EXISTS (minor: player bar height CSS var)
│   ├── Sidebar.tsx ──────── MODIFY (Library link: href='#' → href='/library')
│   ├── SidebarProvider.tsx ─ NO CHANGE
│   └── BottomAudioPlayer.tsx ─ NO CHANGE (already complete)
├── HeroSection.tsx ──────── MODIFY (add prompt input + Create CTA, remove example cards)
├── GenerationPage.tsx ───── MODIFY (two-panel layout when active)
├── VariantCard.tsx ──────── NO CHANGE (already calls audioPlayer.play())
└── [NEW components]
     ├── WorkspacePanel.tsx ─ NEW (right panel: results/workspace)
     ├── LibraryPage.tsx ──── NEW (or colocate in app/library/page.tsx)
     ├── LibraryCard.tsx ──── NEW (music player card for library items)
     └── LibraryList.tsx ──── NEW (GSAP portfolio list container)

API Routes (src/app/api/)
├── generate/ ──── NO CHANGE
├── status/ ───── NO CHANGE
├── audio/ ────── NO CHANGE
└── library/ ──── NEW: GET /api/library — fetch generations list from DB
```

---

## Component Responsibilities

| Component | Responsibility | Status |
|-----------|----------------|--------|
| `AppShell` | Root shell: sidebar + main content area + bottom player | EXISTS — no structural change needed |
| `AudioPlayerContext` | Global audio state: current track, play/pause/stop actions | EXISTS — may need `queue` addition later |
| `BottomAudioPlayer` | Persistent player bar: wavesurfer, controls, track info | EXISTS — no change needed |
| `Sidebar` | Navigation: Home / Create / Library links | EXISTS — change Library `href` from `#` to `/library` |
| `HeroSection` | Homepage hero: headline + prompt input + Create CTA | MODIFY — becomes slim prompt-first layout; remove example cards section or defer below fold |
| `GenerationPage` | Two-panel workspace: form left, results right when active | MODIFY — add two-panel layout state |
| `WorkspacePanel` | Right panel in workspace: results, loading, error | NEW — extracted from GenerationPage or built alongside |
| `/library` page | Library browsing: list of past generations | NEW route + page component |
| `LibraryCard` | Individual song card in library: play, download, metadata | NEW — similar to VariantCard but library-oriented |
| `LibraryList` | GSAP-animated list container for library items | NEW |
| `GET /api/library` | Fetch generations from DB with outputs and presigned URLs | NEW API route |

---

## Recommended Project Structure

```
src/
├── app/
│   ├── layout.tsx              # NO CHANGE
│   ├── page.tsx                # MODIFY: add same-page transformation logic
│   ├── library/
│   │   └── page.tsx            # NEW: /library route (RSC — fetches generations server-side)
│   ├── api/
│   │   ├── generate/           # NO CHANGE
│   │   ├── status/             # NO CHANGE
│   │   ├── audio/              # NO CHANGE
│   │   └── library/
│   │       └── route.ts        # NEW: GET — list generations with outputs
│   └── globals.css             # NO CHANGE (tokens + theme complete)
│
├── components/
│   ├── layout/
│   │   ├── AppShell.tsx        # MINOR: verify --player-bar-height CSS var exists
│   │   ├── Sidebar.tsx         # MODIFY: Library href → '/library', active state
│   │   ├── BottomAudioPlayer.tsx # NO CHANGE
│   │   └── SidebarProvider.tsx # NO CHANGE
│   │
│   ├── HeroSection.tsx         # MODIFY: slim hero + prompt input + CTA
│   ├── GenerationPage.tsx      # MODIFY: two-panel layout when active
│   ├── GenerationForm.tsx      # NO CHANGE (form fields unchanged)
│   ├── GenerationResults.tsx   # NO CHANGE (results rendering unchanged)
│   ├── VariantCard.tsx         # NO CHANGE (already delegates to AudioPlayerContext)
│   ├── WaveformPlayer.tsx      # NO CHANGE
│   │
│   ├── library/               # NEW directory
│   │   ├── LibraryList.tsx     # NEW: GSAP-animated list container
│   │   ├── LibraryCard.tsx     # NEW: individual song card (play + download + meta)
│   │   └── LibraryEmpty.tsx    # NEW: empty state for library
│   │
│   └── ui/                    # NO CHANGE (existing shadcn-style primitives)
│
├── contexts/
│   └── AudioPlayerContext.tsx  # NO CHANGE (PLAY/PAUSE/RESUME/STOP complete)
│
├── hooks/
│   ├── useGenerationStatus.ts  # NO CHANGE
│   └── useReducedMotion.ts     # NO CHANGE
│
└── lib/
    ├── r2.ts                   # NO CHANGE (getAudioPresignedUrl already works)
    └── [existing files]        # NO CHANGE
```

### Structure Rationale

- **`app/library/`:** Next.js App Router colocation — route + page in same folder. The page.tsx can be a React Server Component that fetches generations directly from the DB via Drizzle, passing data to client components.
- **`components/library/`:** New directory groups library-specific components. Mirrors the `layout/` pattern already in the project.
- **`api/library/route.ts`:** Simple DB read — no RunPod involvement. Returns generations with their outputs, with presigned URLs for playback. Reuses existing Drizzle + R2 patterns.

---

## Architectural Patterns

### Pattern 1: Same-Page Transformation (Home → Workspace)

**What:** The homepage `page.tsx` renders `HeroSection` and `GenerationPage` as siblings. When the user clicks Create, `GenerationPage` transitions from a centered single-column form to a two-panel layout (form left, results right). This is a layout-only change — no route change, no new URL.

**When to use:** The PROJECT.md decision is explicit: "Same-page create transformation — User stays on homepage, page transforms to workspace on Create click. No separate /create route."

**How it works:** `GenerationPage` already has phase state (`idle | submitting | polling | done | error`). Add a `isWorkspaceActive` boolean that becomes true on first submit and stays true. When `isWorkspaceActive`, apply a two-panel grid layout. When false, render the centered single-column form.

**Trade-offs:** Simpler URL structure (no /create route to maintain). The main complexity is responsive layout — two-panel on desktop, stacked on mobile.

**Example:**
```typescript
// GenerationPage.tsx modification
const [isWorkspaceActive, setIsWorkspaceActive] = useState(false);

async function handleSubmit(data: GenerationFormData) {
  setIsWorkspaceActive(true); // lock into workspace mode on first submit
  // ... existing submit logic
}

return (
  <div className={isWorkspaceActive
    ? 'grid md:grid-cols-[1fr_1fr] gap-6 px-4 py-8'
    : 'mx-auto max-w-2xl px-4 py-8'
  }>
    {/* Left panel: always the form */}
    <div>
      <GenerationForm onSubmit={handleSubmit} ... />
    </div>

    {/* Right panel: results/loading/error — only rendered when active */}
    {isWorkspaceActive && (
      <div>
        {/* loading, results, error states */}
      </div>
    )}
  </div>
);
```

### Pattern 2: Library Page as React Server Component

**What:** `/library` page fetches generations from Supabase via Drizzle directly in the RSC (no API round-trip needed). Passes serialized data to client `LibraryList` and `LibraryCard` components. Presigned URLs are generated server-side and passed as props — they don't need to be fetched client-side.

**When to use:** Anytime you have a read-only page that can be pre-rendered. Library browsing is a natural RSC — no user input drives the initial data load.

**Trade-offs:** Presigned URLs expire (typically 1 hour for R2). For the prototype scale (5-10 users), this is fine. If users load the page and leave it open for hours, URLs will expire. Accept this tradeoff now; solve with refresh-on-play later if needed.

**Example:**
```typescript
// app/library/page.tsx (RSC — no 'use client')
import { db } from '@/db';
import { generations, outputs } from '@/db/schema';
import { desc, eq } from 'drizzle-orm';
import { getAudioPresignedUrl } from '@/lib/r2';
import { LibraryList } from '@/components/library/LibraryList';

export default async function LibraryPage() {
  const rows = await db.query.generations.findMany({
    where: eq(generations.status, 'completed'),
    with: { outputs: true },
    orderBy: [desc(generations.startedAt)],
    limit: 50,
  });

  // Resolve presigned URLs server-side
  const tracks = await Promise.all(rows.map(async (gen) => ({
    id: gen.id,
    promptText: gen.promptText,
    startedAt: gen.startedAt,
    outputs: await Promise.all(gen.outputs.map(async (out) => ({
      ...out,
      playbackUrl: await getAudioPresignedUrl(out.r2Key, false),
      mp3Url: out.mp3R2Key ? await getAudioPresignedUrl(out.mp3R2Key, true) : null,
    }))),
  })));

  return <LibraryList tracks={tracks} />;
}
```

### Pattern 3: LibraryCard → AudioPlayerContext (Existing Pattern)

**What:** `LibraryCard` calls `audioPlayer.play(track)` from `AudioPlayerContext` — exactly the same pattern `VariantCard` already uses. The bottom player bar responds automatically. No new audio infrastructure needed.

**When to use:** Every component that needs to trigger audio playback. The context is already provided at the root via `AppShell`.

**Trade-offs:** None. This is the existing pattern. Reusing it means the library and the create workspace share the same player state — playing from the library stops whatever was playing in the workspace, which is the correct Suno-like behavior.

**Example:**
```typescript
// components/library/LibraryCard.tsx
'use client';
import { useAudioPlayer } from '@/contexts/AudioPlayerContext';

export function LibraryCard({ track }: { track: LibraryTrack }) {
  const { play, currentTrack, isPlaying } = useAudioPlayer();
  const isNowPlaying = currentTrack?.url === track.playbackUrl && isPlaying;

  return (
    <div onClick={() => play({
      url: track.playbackUrl,
      title: track.promptText,
      mp3Url: track.mp3Url,
    })}>
      {/* card content */}
    </div>
  );
}
```

### Pattern 4: Sidebar Active State via usePathname

**What:** The Sidebar currently has `Library` pointing to `href="#"`. To make it a real route link and highlight the active nav item, use Next.js `usePathname()` to compare the current path against each nav item's href.

**When to use:** Any sidebar/nav with multiple routes. Standard Next.js App Router pattern.

**Trade-offs:** Sidebar is already a client component (`'use client'`), so `usePathname()` works without additional wrappers.

**Example:**
```typescript
// In Sidebar.tsx, update NAV_ITEMS and NavLink
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { label: 'Home', href: '/', icon: House },
  { label: 'Create', href: '/', icon: Music, scrollToCreate: true },
  { label: 'Library', href: '/library', icon: Library },
];

function NavLink({ href, ... }) {
  const pathname = usePathname();
  const isActive = pathname === href;

  return (
    <a
      href={href}
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors',
        isActive
          ? 'bg-accent/20 text-foreground'
          : 'text-muted-foreground hover:bg-accent/10 hover:text-foreground'
      )}
    >
      ...
    </a>
  );
}
```

---

## Data Flow

### Homepage → Workspace Transformation

```
User lands on /
    ↓
page.tsx renders: HeroSection (prompt + CTA) + GenerationPage (form, idle state)
    ↓
User enters prompt, clicks Create
    ↓
HeroSection dispatches 'navigate-create' event (existing pattern)
  OR GenerationPage.handleSubmit() called directly from new prompt input
    ↓
GenerationPage: isWorkspaceActive = true
  → layout changes to two-panel grid
  → form moves to left panel
  → right panel shows loading state
    ↓
Poll /api/status/{jobId} every 2.5s (existing useGenerationStatus hook)
    ↓
Completion → right panel shows GenerationResults + VariantCards
    ↓
User clicks play on VariantCard
    ↓
audioPlayer.play(track) → AudioPlayerContext dispatches PLAY
    ↓
BottomAudioPlayer renders (already fixed at bottom via position:fixed)
Audio plays — persists if user navigates to /library
```

### Library Page Data Flow

```
User clicks Library in Sidebar
    ↓
Next.js App Router navigates to /library
  → AppShell persists (BottomAudioPlayer continues playing if active)
    ↓
RSC: app/library/page.tsx runs on server
  → db.query.generations.findMany({ status: 'completed', with: { outputs } })
  → getAudioPresignedUrl() for each output (server-side R2 signing)
    ↓
Serialized track data passed to LibraryList (client component)
    ↓
LibraryList renders LibraryCards with GSAP animation
    ↓
User clicks play on LibraryCard
    ↓
audioPlayer.play(track) — same AudioPlayerContext, same BottomAudioPlayer
  → if something was playing, it stops (PLAY action replaces currentTrack)
```

### Audio Player State Flow

```
AudioPlayerContext (root — persists across navigation)
    ↓ provides
  play(track) / pause() / resume() / stop()
  currentTrack: AudioTrack | null
  isPlaying: boolean
    ↓ consumed by
  BottomAudioPlayer ← renders when currentTrack !== null
  VariantCard ← calls play() on click
  LibraryCard ← calls play() on click (new)
  AppShell ← reads currentTrack to add paddingBottom to <main>
```

---

## Integration Points: New vs Modified vs Unchanged

### New Files to Create

| File | What It Does | Depends On |
|------|--------------|------------|
| `src/app/library/page.tsx` | RSC: fetches generations from DB, renders LibraryList | `db`, `getAudioPresignedUrl`, `LibraryList` |
| `src/app/api/library/route.ts` | Optional: if library page needs client-side refresh | Drizzle, R2 — same patterns as `/api/status/[jobId]` |
| `src/components/library/LibraryList.tsx` | GSAP-animated list of LibraryCards | GSAP (must install), LibraryCard |
| `src/components/library/LibraryCard.tsx` | Clickable song card: play, download, metadata | `useAudioPlayer` (exists) |
| `src/components/library/LibraryEmpty.tsx` | Empty state shown when no completed generations | none |

### Files to Modify

| File | What Changes | Risk |
|------|--------------|------|
| `src/app/page.tsx` | Minimal: HeroSection redesign may change how `#home`/`#create` sections stack | LOW — structural, not logic |
| `src/components/HeroSection.tsx` | Add inline prompt input + Create button at hero level; remove or reposition example cards | MEDIUM — visual redesign |
| `src/components/GenerationPage.tsx` | Add `isWorkspaceActive` state; conditional two-panel grid layout; keep all existing phase logic | LOW — additive change only |
| `src/components/layout/Sidebar.tsx` | Change Library `href="#"` → `href="/library"`; add active state via `usePathname()`; use `<Link>` for real routes | LOW — surgical change |
| `src/components/layout/AppShell.tsx` | Verify `--player-bar-height` CSS var is set in globals.css; no other changes expected | LOW |

### Files That Require No Changes

| File | Why Unchanged |
|------|---------------|
| `src/contexts/AudioPlayerContext.tsx` | Complete — PLAY/PAUSE/RESUME/STOP + AudioTrack type covers all use cases |
| `src/components/layout/BottomAudioPlayer.tsx` | Complete — handles desktop + mobile, wavesurfer, AnimatePresence |
| `src/components/layout/SidebarProvider.tsx` | Complete |
| `src/components/VariantCard.tsx` | Already calls `audioPlayer.play()` — integrates with library pattern naturally |
| `src/components/WaveformPlayer.tsx` | Reusable — LibraryCard can use it optionally |
| `src/hooks/useGenerationStatus.ts` | Polling infrastructure complete |
| `src/app/api/generate/route.ts` | Generation endpoint unchanged |
| `src/app/api/status/[jobId]/route.ts` | Status endpoint unchanged |
| `src/db/schema.ts` | Schema complete — `generations` + `outputs` tables cover library needs |
| `src/lib/r2.ts` | `getAudioPresignedUrl()` already works — reuse directly |

---

## Build Order

Dependencies dictate this order. Each step unlocks the next.

```
PHASE 1: Navigation (unblocks everything)
  1. Modify Sidebar.tsx — Library href + active state via usePathname()
  → Sidebar now links to /library (even before page exists, 404 is acceptable)

PHASE 2: Library Data Layer
  2. Write app/library/page.tsx RSC — DB query + presigned URL generation
  → /library route exists, renders data (unstyled is fine)
  3. Write optional GET /api/library route if SSR refresh is needed

PHASE 3: Library UI
  4. Write LibraryCard.tsx — uses existing useAudioPlayer() pattern
  5. Write LibraryEmpty.tsx — empty state
  6. Write LibraryList.tsx — GSAP animation wrapper
  → /library fully functional with play-to-bottom-bar behavior

PHASE 4: Two-Panel Workspace
  7. Modify GenerationPage.tsx — add isWorkspaceActive + two-panel grid layout
  8. Modify HeroSection.tsx — slim hero + inline prompt + Create CTA
  9. Modify page.tsx if section layout needs adjustment
  → Same-page transformation works

PHASE 5: Polish
  10. Responsive breakpoints for two-panel (mobile: stacked, desktop: side-by-side)
  11. GSAP scramble text on library list items
  12. Transition animations for panel appearance
```

**Why this order:**
- Phase 1 first because nav links are visible and broken links are annoying during dev
- Phase 2-3 before Phase 4 because library page is independent of workspace changes
- Phase 4 last because it modifies existing working pages — lower risk when library is already done
- Phase 5 is additive polish on top of functional features

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Creating a Separate /create Route

**What people do:** Add `src/app/create/page.tsx` as a separate route for the generation workspace.

**Why it's wrong:** The PROJECT.md decision is explicit — same-page transformation, no /create route. A separate route means the URL changes on Create click, which breaks the scroll-based transformation UX. It also requires duplicating the `GenerationPage` component or restructuring routing.

**Do this instead:** Keep everything on `page.tsx`. `isWorkspaceActive` state in `GenerationPage` drives the layout switch.

### Anti-Pattern 2: Moving AudioPlayerProvider Out of AppShell

**What people do:** Move `AudioPlayerProvider` into individual pages or closer to where audio is triggered.

**Why it's wrong:** Audio must persist across page navigations. The provider must be in the root shell (above the router outlet). It's already correctly placed in `AppShell`.

**Do this instead:** Leave `AudioPlayerProvider` in `AppShell.tsx`. All pages and components can consume `useAudioPlayer()`.

### Anti-Pattern 3: Fetching Presigned URLs Client-Side in Library

**What people do:** Make `/library` a client component that calls `GET /api/library` on mount to get track URLs.

**Why it's wrong:** Adds a loading state, a spinner, and a round-trip fetch when the data could be server-rendered. For a browsing page, there's no user input that changes the initial data — RSC is the right pattern.

**Do this instead:** Use RSC for `app/library/page.tsx`. Fetch from DB and generate presigned URLs server-side. Pass resolved data to client components as props.

### Anti-Pattern 4: Duplicating Audio Logic in LibraryCard

**What people do:** Implement a separate wavesurfer instance inside each `LibraryCard` for preview playback.

**Why it's wrong:** The bottom player bar already handles all audio playback. Inline audio in library cards means N wavesurfer instances competing for audio focus. This is exactly what `VariantCard` was refactored away from (it now uses `mode="visual-only"`).

**Do this instead:** `LibraryCard` calls `audioPlayer.play(track)` and the bottom player handles everything. Library cards can show a visual-only waveform or a simple play button — no audio engine in the card.

### Anti-Pattern 5: Storing Library State in Component-Level useState

**What people do:** Fetch library data in a `useState` + `useEffect` inside `LibraryPage` client component, creating loading spinners and potential stale data.

**Why it's wrong:** The library is a read-mostly page. Data staleness is acceptable for a browsing view. RSC eliminates the loading spinner entirely and renders data immediately.

**Do this instead:** RSC for the page, client components only for interactivity (play button, hover states). If the user needs to refresh the library after generating a new song, a simple page reload or router.refresh() is sufficient.

---

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0-10 users (current) | RSC library page, no pagination, 50-item limit. Presigned URLs generated at page load. Fine. |
| 10-1k users | Add pagination to library API (cursor-based). Consider caching presigned URLs in DB instead of re-generating per request. Library becomes a real API call with SWR/TanStack Query. |
| 1k+ users | Auth layer (per-user libraries). Library API behind auth middleware. Consider CDN-level caching for public-shareable tracks. |

**First bottleneck at scale:** Presigned URL generation for many tracks per page load. Mitigation: cache URL + expiry in the DB, only regenerate when expired. Not needed for 5-10 user prototype.

---

## GSAP for Library List

The PROJECT.md spec calls for "GSAP portfolio list with scramble text." This requires adding GSAP as a dependency since it's not currently installed.

**Recommended:** `gsap` + `@gsap/react` for React integration.

```bash
npm install gsap @gsap/react
```

**Integration point:** `LibraryList.tsx` uses `useGSAP()` from `@gsap/react` for the list animation. Text scramble uses `gsap.utils.scrambleText()` or GSAP's `ScrambleTextPlugin`. The scramble effect on library item titles is a `useGSAP` effect triggered on mount or hover.

**Confidence:** MEDIUM — GSAP is a well-established library but the ScrambleTextPlugin is a Club GSAP (paid) plugin. Verify if the project has a GSAP Club license or use an alternative like gsap-scramble-text (open source alternative). If not, a custom character scramble with `setInterval` is a viable fallback.

---

## Sources

- Direct codebase inspection — `src/components/layout/`, `src/contexts/`, `src/app/` (HIGH confidence — ground truth)
- Next.js App Router RSC patterns — https://nextjs.org/docs/app/building-your-application/rendering/server-components (HIGH confidence)
- Next.js `usePathname()` — https://nextjs.org/docs/app/api-reference/functions/use-pathname (HIGH confidence)
- GSAP React integration — https://gsap.com/resources/React/ (MEDIUM confidence — version compatibility with React 19 not verified against latest docs)
- PROJECT.md decision log — "Same-page create transformation" and "Persistent bottom audio player" decisions (HIGH confidence — authoritative)

---

*Architecture research for: Suno-style UX overhaul — persistent audio player, library page, two-panel workspace*
*Researched: 2026-03-05*
