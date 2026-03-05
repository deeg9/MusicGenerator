# Feature Research

**Domain:** Suno-Style UX Overhaul — AI Music Generation App (v2.0)
**Researched:** 2026-03-05
**Confidence:** HIGH (codebase audited directly; patterns verified against live products Suno/Spotify/SoundCloud; implementation approach confirmed via Next.js App Router docs)

---

## Scope Note

This file covers the **UX feature landscape** for milestone v2.0 (Suno-style UX overhaul). The prior FEATURES.md (v1.1) covered brand/design tokens — that work is complete. This research answers: what does a persistent audio player, music library page, two-panel create workspace, and same-page view transformation look like in practice, and what already exists vs. what needs to be built?

---

## What Is Already Built (Do Not Rebuild)

Audited from codebase as of 2026-03-05:

| Component | Status | Notes |
|-----------|--------|-------|
| `AppShell` + `AudioPlayerProvider` | BUILT | Layout shell with sidebar + persistent player slot wired |
| `BottomAudioPlayer` | BUILT | Wavesurfer-based bottom bar, AnimatePresence slide-in, desktop+mobile layouts |
| `AudioPlayerContext` | BUILT | React Context + useReducer, `play/pause/resume/stop` actions, `AudioTrack` type |
| `Sidebar` | BUILT | Collapsible hover-to-expand desktop sidebar, mobile overlay; nav items: Home, Create, Library, Search |
| `GenerationPage` | BUILT | Full generation flow: idle → submitting → polling → done → error; AnimatePresence phase transitions |
| `HeroSection` | BUILT | Centered headline + Typewriter + CTA button scrolling to `#create`; example cards |
| `VariantCard` | BUILT | Per-variant waveform player with play/download |
| `GenerationResults` | BUILT | Fetches job results, renders VariantCards |
| Drizzle schema | BUILT | `generations` + `outputs` tables; `outputs.r2Key`, `mp3R2Key` for audio storage |

**The persistent bottom player, sidebar, and audio context are already functional.** The v2.0 work is completing the UX patterns that these lay the foundation for.

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features users expect in any Suno-style music creation app. Missing these = product feels incomplete or inconsistent with the mental model established by the existing infrastructure.

| Feature | Why Expected | Complexity | Dependencies on Existing |
|---------|--------------|------------|--------------------------|
| **Suno-style homepage** — centered headline, large prompt input, single Create CTA, minimal chrome | Users coming from Suno expect a clean "type and go" entry point; current hero + generation form are separate sections requiring a scroll | MEDIUM | Replaces/merges current `HeroSection` + `GenerationPage` idle state into a single centered unit |
| **Two-panel create workspace** — form left, results/loading right, same page | After hitting Create, the layout expands to show input context alongside output; users should not lose their prompt while reviewing results | MEDIUM | Uses existing `GenerationPage` phase logic; layout change only, not logic change |
| **Same-page view transformation** — homepage morphs into workspace on Create click, no route change | Suno/Midjourney pattern: the prompt box is the entry point AND the workspace anchor; page navigation feels heavy for a creation loop | HIGH | Existing `navigate-create` event + scroll pattern is the v1 version; needs to become an animated layout transform instead of scroll |
| **`/library` route** — separate page for browsing all generated songs | Users who have generated multiple songs need a place to revisit them; the sidebar "Library" link currently goes to `#` | HIGH | Needs new Next.js route, DB query (generations + outputs), and new MusicPlayerCard component |
| **Music player card component** — compact card showing song title, prompt snippet, waveform preview, play/download | Library page needs a scannable card format; VariantCard is the generation results version but library cards are simpler (no inline generation state) | MEDIUM | Can reuse `useAudioPlayer` context; VariantCard is too generation-result-specific to reuse directly |
| **Sidebar Library link wired to `/library`** — currently placeholder `#` | Sidebar already renders Library nav item; it goes nowhere | LOW | Sidebar is built; just change `href: '#'` to `href: '/library'` and convert to Next.js `<Link>` |
| **Bottom audio player persists across `/library` navigation** | Core reason for building the persistent player; users tap play in library, navigate to create, music keeps playing | ALREADY BUILT | `BottomAudioPlayer` in `AppShell` — already persists; only missing: library cards need to call `useAudioPlayer().play()` |
| **Library page DB query** — fetch completed generations with their outputs from Supabase | Library data must come from the existing `generations`/`outputs` tables; no new tables needed | MEDIUM | Drizzle schema has everything needed; need a server component or API route to query `status = 'completed'` |

### Differentiators (Competitive Advantage)

Features that elevate the experience above functional parity.

| Feature | Value Proposition | Complexity | Dependencies on Existing |
|---------|-------------------|------------|--------------------------|
| **GSAP scramble text on library list** — song titles animate with letter scramble on page load/reveal | Retro-futuristic brand moment; Suno uses static lists; scramble text signals "generative" and aligns with the musical/creative brand | MEDIUM | Requires GSAP `@gsap/react` (not yet in stack); `useGSAP` hook for SSR safety; apply to `MusicPlayerCard` title on mount or scroll-into-view |
| **Animated same-page expansion** — prompt box expands/splits into two-panel workspace using Framer Motion `layout` prop | No page flash, no scroll jump; the creation feels continuous and spatial; Framer Motion `layoutId` connects the prompt across homepage → workspace states | HIGH | Framer Motion already in stack; `layoutId` for the prompt textarea is the key primitive; `LayoutGroup` wraps both states; known App Router caveat: wrap in `<LayoutGroup>` at page level |
| **Waveform peaks pre-generation in library** — store decoded peaks at generation time, pass to WaveSurfer in library cards | Library with many cards would stall decoding all audio simultaneously; pre-computed peaks load instantly; Suno shows waveforms immediately | HIGH | Requires schema change: add `peaksJson` column to `outputs`; generate peaks server-side after audio upload; passed as `peaks` option to WaveSurfer |
| **Play from library into bottom player** — tapping play on any library card hands off to the global player without leaving the page | Users can browse library like a music streaming app (Spotify-parity UX); the bottom player becomes a fully-functional mini-player for the library | LOW | `AudioPlayerContext.play()` already accepts `AudioTrack`; library card just needs to call it with the R2 presigned URL |
| **Hover-reveal play button on library cards** — card shows waveform preview image, play button overlays on hover | Reduces UI noise for browsed items; Spotify/SoundCloud use this pattern; makes the library feel like a gallery not a list | LOW | Pure CSS/Tailwind hover state on `MusicPlayerCard` |
| **Empty library state with CTA** — when no songs exist, show branded empty state with "Create your first song" button | Users landing on `/library` before generating get direction not confusion; empty states are table stakes for production apps | LOW | New component; uses existing brand tokens and CTA pattern |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **Route-based create page (`/create` route)** | Feels "normal" — one route per screen | Breaks the same-page transformation UX goal; adds a navigation step between hero and workspace; existing `navigate-create` event + scroll would be thrown away | Keep generation on `/` (homepage); use same-page animated layout transformation |
| **Infinite scroll in library** | "Feels modern"; Spotify/SoundCloud do it | For 5-10 prototype users, infinite scroll adds complexity (intersection observer, cursor pagination, race conditions) with no user benefit; paginated list is simpler and sufficient | Simple offset pagination with page numbers; upgrade to infinite scroll only if library grows to 50+ items per user |
| **Autoplay next track in library** | Queue-based playback like Spotify | Requires a playback queue data structure, shuffle logic, skip controls — significant scope expansion; not in Suno's core UX either | Single-track play only; "next" is just tapping the next card |
| **Search within library** | Quickly find a specific song | Prototype has too few songs for search to add value; client-side filter over 10 items is more confusing than scrolling | Sidebar "Search" item already exists as placeholder; wire to `/library` with filter later, after user base grows |
| **Waveform on every library card simultaneously** | Rich visual library experience | Decoding audio for 10+ WaveSurfer instances simultaneously crashes browsers; even with lazy loading, 10 instances = high memory pressure | Static waveform thumbnail image (generated server-side at upload time) or simplified bar-chart SVG from pre-computed peaks; full WaveSurfer only in bottom player |
| **Real-time library updates (WebSocket/SSE)** | New generations appear in library without refresh | Complex infrastructure (Supabase Realtime or custom SSE), adds latency edge cases; not needed for prototype | After generation completes, redirect or add a "View in Library" button; library page refresh is acceptable |
| **Social sharing from library** | "Share my song" | Requires public URLs, share metadata (OG tags), and potentially user accounts — full feature in itself; out of scope per PROJECT.md | Download button is sufficient for now; sharing via file is the v1 pattern |

---

## Feature Dependencies

```
/library route
    └──requires──> DB query: completed generations + outputs (server component or API route)
    └──requires──> MusicPlayerCard component
                       └──requires──> AudioPlayerContext.play() (already built)
                       └──requires──> R2 presigned URL generation (already built in /api/audio route)
    └──requires──> Sidebar Library link → Next.js <Link href="/library"> (low complexity fix)

Same-page view transformation (homepage → workspace)
    └──requires──> Layout state: 'hero' | 'workspace' (useState at page level)
    └──requires──> Framer Motion layout + layoutId on prompt textarea
    └──requires──> LayoutGroup wrapping both hero and workspace sections
    └──conflicts-with──> Current scroll-to-#create pattern (must be replaced, not coexisted)

Two-panel workspace
    └──requires──> Same-page view transformation trigger
    └──requires──> GenerationPage phase logic (already built — reused, not replaced)
    └──enhances──> VariantCard / GenerationResults (already built — rendered in right panel)

GSAP scramble text (library cards)
    └──requires──> GSAP + @gsap/react installed (not yet in stack)
    └──requires──> MusicPlayerCard component (built as part of /library work)
    └──requires──> 'use client' directive + useGSAP() hook

Waveform peaks pre-computation (differentiator)
    └──requires──> Schema migration: add peaksJson to outputs table
    └──requires──> Server-side peak generation after R2 upload (modify /api/generate route)
    └──requires──> MusicPlayerCard to pass peaks option to WaveSurfer (avoids decode cost)
    └──optional──> Library cards with instant waveforms (without this, cards use placeholder)

Bottom audio player persists across pages
    └──already-built──> AppShell places BottomAudioPlayer outside <main> in layout.tsx
    └──already-built──> Next.js App Router: layouts don't remount on navigation
    └──requires──> Library cards to call useAudioPlayer().play() with correct AudioTrack
```

### Dependency Notes

- **Library route depends on DB query, not a new table.** The `generations` + `outputs` tables already have everything: prompt text (for display), `r2Key` (for audio URL), `completedAt` (for sorting). No schema migration needed for the basic library page — only needed for the peaks pre-computation differentiator.
- **Bottom player already works across pages.** The architecture is correct. The only gap is that library cards don't yet call `useAudioPlayer().play()` because they don't exist yet.
- **Same-page transformation replaces the current scroll pattern.** The existing `navigate-create` event + `scrollIntoView` must be removed and replaced by a layout state toggle. The `GenerationPage` component logic (form/loading/done phases) is preserved — only the layout container changes.
- **GSAP must not conflict with Framer Motion.** Both can coexist (GSAP for text effects, Framer Motion for layout transitions) but they should not animate the same elements. Assign GSAP to text-only effects (scramble on titles); Framer Motion to layout/positional transitions.

---

## MVP Definition

### Launch With (v2.0)

Minimum feature set to deliver the Suno-style UX goal:

- [ ] **Suno-style homepage** — prompt-first centered layout with single "Create" CTA; hero section simplified to headline + subtitle + prompt box
- [ ] **Same-page transformation** — clicking Create expands homepage into two-panel workspace using Framer Motion layout animation; no route change
- [ ] **Two-panel workspace** — form panel (left, ~40% width) + results panel (right, ~60% width); both visible simultaneously after Create; GenerationPage phases render in right panel
- [ ] **`/library` route** — page listing all completed generations; server component queries Supabase; shows `MusicPlayerCard` per output
- [ ] **`MusicPlayerCard` component** — compact card: song title (from prompt), timestamp, duration, play button (hands off to bottom player), download link
- [ ] **Sidebar Library link wired** — `href: '/library'` with `next/link`; active state indicator for current route
- [ ] **Empty library state** — branded empty state with "Create your first song" CTA when no completed generations exist

### Add After Validation (v2.x)

Features to add once v2.0 core is working and used:

- [ ] **GSAP scramble text on library cards** — title scramble on mount/scroll reveal; add `gsap` + `@gsap/react` to deps; trigger: `IntersectionObserver` entry
- [ ] **Hover-reveal play button on cards** — play button overlays on card hover; currently visible, refine to show-on-hover for cleaner browsing UX
- [ ] **Waveform peaks pre-computation** — store peaks JSON at generation time; instant waveforms in library without audio decode; requires schema migration + route change
- [ ] **Library sort/filter** — sort by date, duration; filter by genre tag; simple client-side filter over loaded records

### Future Consideration (v2+)

Defer until product-market fit is clear:

- [ ] **Infinite scroll in library** — meaningful only after 50+ songs per user; add with TanStack Query `useInfiniteQuery` + Supabase cursor pagination
- [ ] **Playback queue** — queue multiple library songs for sequential play; requires queue state in AudioPlayerContext + skip controls in BottomAudioPlayer
- [ ] **Search** — full-text search over prompt text; Supabase `textsearch` or client-side fuse.js; meaningful at 20+ songs

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Suno-style homepage (prompt-first) | HIGH | MEDIUM | P1 |
| Same-page transformation (hero → workspace) | HIGH | HIGH | P1 |
| Two-panel workspace layout | HIGH | MEDIUM | P1 |
| `/library` route with DB query | HIGH | MEDIUM | P1 |
| `MusicPlayerCard` component | HIGH | LOW | P1 |
| Sidebar Library link wired | HIGH | LOW | P1 |
| Empty library state | MEDIUM | LOW | P1 |
| GSAP scramble text | MEDIUM | MEDIUM | P2 |
| Hover-reveal play button | LOW | LOW | P2 |
| Waveform peaks pre-computation | MEDIUM | HIGH | P2 |
| Library sort/filter | LOW | LOW | P2 |
| Infinite scroll | LOW | HIGH | P3 |
| Playback queue | LOW | HIGH | P3 |
| Search | LOW | MEDIUM | P3 |

**Priority key:**
- P1: Required for v2.0 milestone to feel complete
- P2: Adds polish/differentiation; add in v2.x
- P3: Future — defer until scale justifies

---

## Competitor Feature Analysis

| Feature | Suno | Spotify Web | SoundCloud | Our Approach |
|---------|------|-------------|------------|--------------|
| Homepage entry point | Centered prompt box only; no marketing content on create page | Search-first (different product type) | Discovery feed | Simplified hero (headline + subtitle) + large prompt box; minimal chrome |
| View transformation | Prompt → results in same panel; no route change | N/A | N/A | Framer Motion `layout` animation: hero collapses, workspace panels expand |
| Two-panel create | Single panel (prompt on top, results below) | N/A | N/A | Left panel (form/controls) + Right panel (loading/results) split |
| Library/history | Songs page with grid; persistent generation access | Full library with albums/playlists | Profile page with tracks | `/library` route with compact list; sorted newest-first |
| Persistent player | Fixed bottom bar; track info + waveform + controls + volume | Fixed bottom bar; album art + controls + progress bar + volume + queue | Fixed bottom bar; waveform only | Already built; adds: library card integration |
| Library card UX | Click card → opens player; waveform thumbnail visible | Album art grid; hover reveals play | Waveform visible in list; hover reveals controls | `MusicPlayerCard`: play button hands off to bottom player; inline waveform thumbnail (peaks-based or simplified) |
| Navigation | Left sidebar: Home, Create, Library, Explore | Left sidebar: Home, Search, Library | Top navigation | Left sidebar already built: Home, Create, Library, Search |
| Library data | All user's songs; filter by workspace | Albums, playlists, liked songs, podcasts | Uploaded + liked tracks | Query `generations` table where `status = 'completed'`, join `outputs`; show all variants or just one per generation |

---

## Implementation Pattern Notes

### Same-Page View Transformation

The current pattern (scroll to `#create` section) is the v1 approach. The v2 approach:

1. Page-level state: `type PageView = 'landing' | 'workspace'`
2. `HeroSection` renders when `pageView === 'landing'`; hides when `workspace`
3. `GenerationPage` in `workspace` view fills the two-panel layout
4. Framer Motion `layoutId="prompt-input"` on the prompt textarea connects the hero prompt (centered, large) to the workspace form panel prompt (left panel, standard size)
5. `LayoutGroup` wraps the entire page so `layoutId` transitions work across conditional renders
6. Trigger: clicking "Create" CTA sets `pageView = 'workspace'` AND starts generation submit
7. Back button or "New Song" resets `pageView = 'landing'`

**Known caveat (MEDIUM confidence):** Framer Motion `layoutId` with Next.js App Router has a documented issue (GitHub #49279) where `AnimatePresence` at the layout level can conflict. Mitigation: avoid AnimatePresence at the `RootLayout` level; use it only within client components at the page level.

### Persistent Bottom Player Architecture

Already correct — confirmed by Next.js App Router docs: "On navigation, layouts preserve state, remain interactive, and do not rerender." The `BottomAudioPlayer` is in `AppShell` which is in `layout.tsx`, so it survives navigation to `/library`. The only work remaining is library cards calling `useAudioPlayer().play()`.

### Library Page DB Query

Server component pattern (avoid API route — server component is simpler):

```typescript
// src/app/library/page.tsx (Server Component)
import { db } from '@/db';
import { generations, outputs } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';

const songs = await db
  .select()
  .from(generations)
  .innerJoin(outputs, eq(outputs.generationId, generations.id))
  .where(eq(generations.status, 'completed'))
  .orderBy(desc(generations.completedAt))
  .limit(50);
```

Drizzle client must remain server-side only (confirmed — Drizzle clients fail in client components). The `MusicPlayerCard` components receive presigned URL props; the presigned URL generation happens in the server component or a separate `/api/audio/[key]` route (already built per codebase memory).

### GSAP + Next.js

GSAP is now fully free including all plugins (Webflow sponsorship, 2024). Integration with Next.js App Router requires:
1. `npm install gsap @gsap/react`
2. `useGSAP()` hook from `@gsap/react` (SSR-safe; replaces manual `useEffect` + `gsap.context`)
3. All GSAP animation code in `'use client'` components
4. For scramble text: `gsap.to(element, { duration: 1, scrambleText: { text: title, chars: "abcdef..." } })`

---

## Sources

- Suno interface review: [Suno v4.5 Interface Guide](https://www.0580rc.com/ai-chat/suno-v45-interface-guide-2025/), [Suno Workspaces announcement](https://x.com/SunoMusic/status/1879269631854088490), [Jack Righteous Suno guides](https://jackrighteous.com/en-us/blogs/guides-using-suno-ai-music-creation/suno-ai-v4-5-plus-create-page-guide)
- Next.js App Router layout persistence: [Next.js Layouts and Pages docs](https://nextjs.org/docs/app/building-your-application/routing/pages-and-layouts), [LogRocket Next.js layouts guide](https://blog.logrocket.com/guide-next-js-layouts-nested-layouts/), [Next.js persistent player discussion](https://github.com/vercel/next.js/discussions/22220)
- Framer Motion layout animations: [Motion layout animations docs](https://motion.dev/docs/react-layout-animations), [LayoutGroup docs](https://www.framer.com/motion/layout-group/), [App Router + Framer Motion issue](https://github.com/vercel/next.js/issues/49279)
- Persistent audio state in React: [BBC Sounds persistent player prototype (Medium)](https://medium.com/bbc-product-technology/sounds-web-next-a-persistent-player-prototype-for-bbc-sounds-bf996ef0c332), [Global Music Player in NextJS (Medium)](https://medium.com/@tejnav1808/music-player-in-nextjs-376714c70cb2)
- WaveSurfer mini-player + peaks pattern: [wavesurfer-react-player (GitHub)](https://github.com/TheDecipherist/wavesurfer-react-player)
- Supabase + Drizzle + infinite scroll: [Supabase infinite scroll + Framer Motion](https://supabase.com/blog/infinite-scroll-with-nextjs-framer-motion), [React Query + Supabase pagination (Medium)](https://medium.com/@ctrlaltmonique/how-to-implement-infinite-scroll-with-react-query-supabase-pagination-in-next-js-6db8ed4f664c)
- GSAP + Next.js: [GSAP React integration docs](https://gsap.com/resources/React/), [Setting Up GSAP with Next.js 2025 (Medium)](https://javascript.plainenglish.io/setting-up-gsap-with-next-js-2025-edition-bcb86e48eab6), [GSAP scramble text + React (Medium)](https://medium.com/@moraromerojuan8/creating-an-advanced-text-scramble-with-gsap-react-and-nextjs-48b86b0e9767)
- State management for audio context: [Context API vs Zustand 2025 (DEV)](https://dev.to/cristiansifuentes/react-state-management-in-2025-context-api-vs-zustand-385m)
- Codebase audit: `/src/components/layout/`, `/src/contexts/AudioPlayerContext.tsx`, `/src/db/schema.ts`, `/src/app/layout.tsx`, `/src/components/GenerationPage.tsx`

---
*Feature research for: Suno-Style UX Overhaul — MusicGenerator v2.0*
*Researched: 2026-03-05*
