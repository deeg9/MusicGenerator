# Project Research Summary

**Project:** MusicGenerator — Suno-Style UX Overhaul (v2.0)
**Domain:** AI Music Generation App — persistent audio player, library page, two-panel workspace, GSAP animations
**Researched:** 2026-03-05
**Confidence:** HIGH

## Executive Summary

This is a UX overhaul milestone for an existing, functional AI music generation app. The v1.x foundation is solid: Next.js 15 App Router, Drizzle + Supabase, Cloudflare R2, wavesurfer.js, Framer Motion, and a full generation pipeline (RunPod → HeartMuLa → R2) are all working. Critically, the persistent bottom audio player, AudioPlayerContext, AppShell layout shell, collapsible sidebar, and GenerationPage phase state machine are already built. The v2.0 work is not building infrastructure — it is wiring existing infrastructure to real content (a library page) and redesigning the homepage flow to match the Suno creation UX pattern (same-page transformation to a two-panel workspace on Create click).

The recommended approach is additive: modify three existing files (GenerationPage, HeroSection, Sidebar), create one new route (`library/page.tsx` as a React Server Component), add three new library components (LibraryList, LibraryCard, LibraryEmpty), and install two new packages (`gsap` + `@gsap/react`). Total new packages: 2. Total new files: approximately 6. The only net-new architectural concept is the same-page view transformation from landing to workspace, driven by a URL query parameter (`?mode=create`) for deep-link survivability. Everything else reuses existing patterns already in the codebase.

The primary risks are audio playback architecture (AudioPlayerContext manages state but the actual wavesurfer engine lives in BottomAudioPlayer — adding library page callers can cause initialization race conditions), GSAP server-component boundary violations (build breaks if GSAP is imported in an RSC file), and the two-panel layout being obscured by the fixed bottom player when audio is active. All three are well-understood and have clear prevention strategies. The ScrambleTextPlugin is now free (included in the main `gsap` npm package since Webflow's 2024 acquisition), eliminating the previously documented Club GSAP licensing concern.

---

## Key Findings

### Recommended Stack

The stack is essentially frozen — only two packages need to be added. GSAP 3.14.2+ and @gsap/react 2.1.2+ are the only new dependencies required for the GSAP scramble text animation on the library page. All other requirements (audio, layout, icons, theming, data fetching) are already covered by installed packages.

**Core technologies (new additions only):**
- `gsap` ^3.14.2: ScrambleText animation engine — ScrambleTextPlugin is now free, ships in the main package; import from `gsap/ScrambleTextPlugin`
- `@gsap/react` ^2.1.2: Official React hook for GSAP — use `useGSAP()` instead of `useEffect` for all GSAP animations; SSR-safe via `useIsomorphicLayoutEffect`; handles cleanup and React StrictMode double-fire

**Existing stack confirmed operational (no changes):**
- Next.js 15 App Router, React 19, Tailwind v4 (CSS-first), Framer Motion 12, wavesurfer.js 7 + @wavesurfer/react, next-themes, lucide-react, Drizzle + Supabase, Cloudflare R2

**What NOT to add:** react-gsap (5 years unmaintained), howler.js (redundant with wavesurfer.js), zustand for audio state (Context + useReducer already sufficient at prototype scale), react-resizable-panels (CSS Grid covers the fixed-proportion two-panel layout).

See `.planning/research/STACK.md` for full detail and integration patterns.

### Expected Features

The Suno-style UX pattern is well-understood from competitor analysis (Suno, Spotify, SoundCloud). A prompt-first homepage that transforms into a two-panel workspace on Create click, plus a persistent library for browsing past generations.

**Must have (table stakes — v2.0 launch):**
- Suno-style homepage — centered headline + large prompt input + single Create CTA; minimal chrome; remove example cards from above-the-fold
- Same-page workspace transformation — hero collapses, two-panel workspace expands; no route change; `?mode=create` URL param for survivability
- Two-panel workspace — form left (~40%), results right (~60%); existing GenerationPage phase logic reused in right panel; responsive stacked on mobile
- `/library` route — RSC fetching completed generations from Supabase; sorted newest-first; 50-item limit
- `LibraryCard` component — compact card with play button (delegates to BottomAudioPlayer), download link, prompt/title, timestamp
- Sidebar Library link wired — `href="#"` → `href="/library"` with active state via `usePathname()`
- Empty library state — branded empty state with "Create your first song" CTA

**Should have (v2.x polish after validation):**
- GSAP scramble text on library card titles — retro-futuristic brand differentiator; `useGSAP` with `scope` required
- Hover-reveal play button on library cards — reduces UI noise; pure CSS/Tailwind hover state
- Waveform peaks pre-computation — store peaks JSON at generation time; instant waveforms in library without client-side audio decode; requires schema migration + route change

**Defer (v2+, after scale justifies):**
- Infinite scroll — meaningful only at 50+ songs per user; add with TanStack Query `useInfiniteQuery`
- Playback queue — requires queue state in AudioPlayerContext + skip controls in BottomAudioPlayer
- Full-text search over library — fuse.js or Supabase textsearch; meaningful at 20+ songs

See `.planning/research/FEATURES.md` for prioritization matrix, dependency graph, and competitor analysis.

### Architecture Approach

The existing architecture is correctly structured for everything v2.0 requires. The `AppShell → AudioPlayerProvider → BottomAudioPlayer` hierarchy already provides a persistent audio player across page navigations (Next.js App Router layouts do not remount on navigation). The RSC-first pattern for the library page (fetch from DB server-side, generate presigned URLs server-side, pass to client components as props) eliminates a client round-trip and loading spinner. Library cards never own their own wavesurfer instance — they call `audioPlayer.play(track)` and the BottomAudioPlayer handles all audio. This is the identical pattern VariantCard already uses.

**Major components and their status:**

| Component | Status | Change |
|-----------|--------|--------|
| `AppShell` + `AudioPlayerProvider` + `BottomAudioPlayer` | EXISTS | No changes — persistent player already works across routes |
| `AudioPlayerContext` | EXISTS | Verify initialization timing before adding library callers |
| `Sidebar` | EXISTS | Change Library `href="#"` → `href="/library"`; add active state via `usePathname()` |
| `GenerationPage` | EXISTS | Add `isWorkspaceActive` boolean + two-panel grid layout; all phase logic preserved |
| `HeroSection` | EXISTS | Redesign to slim prompt-first layout; remove example cards to below-fold |
| `app/library/page.tsx` | NEW | RSC: Drizzle query + R2 presigned URL generation server-side; 50-item limit |
| `LibraryList` | NEW | GSAP-animated list container using `useGSAP` with `scope` |
| `LibraryCard` | NEW | Play-request button that delegates to AudioPlayerContext (no local audio engine) |
| `LibraryEmpty` | NEW | Branded empty state with CTA |

**Build order dictated by dependencies:**
1. Navigation fix (Sidebar Library link) — unblocks everything, visible quick win
2. Library data layer (`app/library/page.tsx` RSC) — establishes the route with real data
3. Library UI (LibraryCard, LibraryList, LibraryEmpty) — delivers functional library page
4. GSAP setup + library animations — additive polish on functional library
5. Two-panel workspace (GenerationPage + HeroSection modifications) — last because it modifies working pages

See `.planning/research/ARCHITECTURE.md` for full file change map, data flow diagrams, and anti-patterns.

### Critical Pitfalls

1. **AudioPlayerContext/wavesurfer initialization race** — Context manages state but BottomAudioPlayer owns the wavesurfer instance. Library card `play()` calls can fire before wavesurfer initializes on track change, causing silent no-ops. Prevention: verify the existing `PLAY` action → wavesurfer `useEffect` chain works correctly from a new caller before building all library UI. If race conditions appear, add `requestPlay`/`confirmPlay` handshake (PITFALLS.md Pitfall 1, Option B). Address before building library UI.

2. **GSAP in Server Component crashes build** — `import gsap from 'gsap'` in any file without `"use client"` causes `ReferenceError: window is not defined` at build time (works in `next dev`, fails in `next build`). Prevention: create `src/lib/gsap-config.ts` with `"use client"` at top; all animated components import from there. Establish before writing any animation code.

3. **Two-panel layout obscured by BottomAudioPlayer** — `<main>` paddingBottom fix from AppShell works for single-scroll-area pages but not for independently-scrolling panel columns. Prevention: each panel column needs `pb-[var(--player-bar-height)]`; test with audio actively playing before marking workspace phase complete.

4. **Multiple simultaneous wavesurfer instances** — Library cards that own their own wavesurfer instance cannot be paused when off-screen (React does not re-render off-screen components). Prevention: library cards are play-request buttons only; no `<WaveformPlayer>` inside library cards; waveforms in library are static/decorative SVG only.

5. **Workspace state lost on refresh** — `isWorkspaceActive` as React state only survives navigation but not page refresh. Prevention: encode workspace mode in URL (`?mode=create`) from the start; read via `useSearchParams()`. Existing `?job=` param coexists cleanly as `?mode=create&job=abc123`.

6. **`useEffect` without dependency array in GenerationPage** — `window.addEventListener('navigate-create', ...)` is inside a `useEffect` with no `[]` dependency array, causing re-registration on every render. The two-panel workspace will trigger significantly more re-renders, amplifying this. Fix before the workspace phase.

---

## Implications for Roadmap

The natural phase groupings follow the dependency chain. The build order is not arbitrary — each phase unblocks the next and avoids touching working code unnecessarily. The ARCHITECTURE.md build order directly maps to recommended phases.

### Phase 1: Foundation Fixes + Navigation

**Rationale:** Two known bugs exist in the current codebase that will worsen significantly under v2.0 changes. Fix them first, before adding complexity. Wire the Sidebar Library link while here — it is the visible entry point to everything built in subsequent phases, and the fix takes minutes.

**Delivers:** Clean foundation; Sidebar Library link functional at `/library` with active state; GenerationPage `useEffect` dependency array bug fixed

**Addresses:** FEATURES.md sidebar link requirement (LOW complexity, HIGH user-visible impact); PITFALLS.md Pitfall 10 (`useEffect` memory leak that compounds under two-panel)

**Avoids:** Carrying known bugs into phases where they become harder to isolate

**Research flag:** None — both fixes are surgical line-level changes with no unknowns

---

### Phase 2: Library Data Layer

**Rationale:** The `/library` route must exist before any library UI can be built or tested against real data. The RSC pattern (server-side DB query + presigned URL generation) is the correct architectural choice — simplest to implement, no client-side loading state, no API round-trip.

**Delivers:** `/library` route rendering real data from Supabase; presigned URLs generated server-side; LibraryEmpty component for zero-song state

**Addresses:** FEATURES.md `/library` route requirement; FEATURES.md empty library state

**Uses:** Existing Drizzle schema (`generations` + `outputs` tables — no migration needed for basic library); existing `getAudioPresignedUrl()` from `src/lib/r2.ts`

**Implements:** ARCHITECTURE.md Pattern 2 (Library Page as RSC)

**Avoids:** Client-side fetch anti-pattern (ARCHITECTURE.md Anti-Pattern 3); pagination complexity (defer to v2+)

**Research flag:** None — RSC + Drizzle + R2 pattern is already used elsewhere in the codebase

---

### Phase 3: Library UI (LibraryCard + LibraryList)

**Rationale:** With the data layer working, build the UI that displays and plays it. Establish the play-request-only architecture (no local wavesurfer in cards) before GSAP is introduced, so the animation layer does not obscure potential audio bugs. Verify AudioPlayerContext `play()` works correctly from a library caller before assuming it does.

**Delivers:** Functional library page with playable song cards; audio delegates correctly to BottomAudioPlayer; hover-reveal play button; active track indicator on card; mobile layout verified at 375px

**Addresses:** FEATURES.md MusicPlayerCard requirement; play from library into bottom player (differentiator); hover-reveal play button (P2, low complexity — do it here)

**Uses:** `useAudioPlayer()` from existing AudioPlayerContext — same pattern as VariantCard

**Implements:** ARCHITECTURE.md Pattern 3 (LibraryCard → AudioPlayerContext)

**Avoids:** PITFALLS.md Pitfall 1 (audio context sync race — verify `play()` works before GSAP phase); Pitfall 7 (multiple simultaneous audio — library cards are play-request buttons only, no WaveformPlayer inside cards); Pitfall 2 (wavesurfer 0px container — no wavesurfer in library cards)

**Research flag:** Mild — if AudioPlayerContext `play()` dispatched from library card does not trigger BottomAudioPlayer reliably, implement `requestPlay`/`confirmPlay` handshake (PITFALLS.md Pitfall 1, Option B). Only investigate if the basic integration test fails.

---

### Phase 4: GSAP Setup + Library Animations

**Rationale:** GSAP is isolated to its own phase because it requires a strict client-boundary setup pattern. Establishing `gsap-config.ts` as the centralized import point before writing any animation code prevents the entire class of Server Component build failures. GSAP polish is additive on top of a functional library page — verify function before layering animation.

**Delivers:** `gsap` + `@gsap/react` installed; centralized `src/lib/gsap-config.ts` with plugin registration; ScrambleText animation on LibraryList card titles on mount/scroll-reveal; scroll-reveal entrance animations for library rows

**Addresses:** FEATURES.md GSAP scramble text differentiator (v2.x polish per FEATURES.md, promoted to this milestone per spec)

**Uses:** `gsap` ^3.14.2, `@gsap/react` ^2.1.2 (install in this phase); ScrambleTextPlugin (free, included in gsap package since 2024)

**Avoids:** PITFALLS.md Pitfall 3 (GSAP in Server Component build crash — `gsap-config.ts` pattern); Pitfall 4 (ScrollTrigger leak — `useGSAP` with `scope: containerRef`); Pitfall 9 (ScrambleText licensing — confirmed free since Webflow acquisition)

**Research flag:** None — GSAP integration pattern is documented in STACK.md and confirmed via official docs; `useGSAP` with `scope` is the established pattern; ScrambleTextPlugin availability confirmed

---

### Phase 5: Same-Page Workspace Transformation

**Rationale:** This is the highest-complexity change because it modifies the existing working homepage flow. It is done last among core v2.0 features so all library work is complete and stable before touching the homepage. The URL encoding (`?mode=create`) must be established from the start of this phase — not bolted on after.

**Delivers:** Homepage transforms to two-panel workspace on Create click; URL encodes workspace state (`?mode=create`) for deep-link survivability and refresh persistence; back navigation returns to hero; two-panel layout is responsive (stacked on mobile); HeroSection redesigned to prompt-first centered layout

**Addresses:** FEATURES.md same-page transformation requirement (P1); FEATURES.md two-panel workspace (P1); FEATURES.md Suno-style homepage (P1)

**Implements:** ARCHITECTURE.md Pattern 1 (Same-Page Transformation); `isWorkspaceActive` + `?mode=create` URL param

**Avoids:** PITFALLS.md Pitfall 5 (two-panel layout + player bar overlap — each panel column gets `pb-[var(--player-bar-height)]`); Pitfall 8 (workspace URL state loss — `?mode=create` from day one); ARCHITECTURE.md Anti-Pattern 1 (no separate `/create` route)

**Research flag:** Moderate — Framer Motion `layoutId` with Next.js App Router has a documented issue (GitHub #49279). If layout animation causes problems, fall back to CSS-only transition (non-animated layout switch is still valid UX and not a regression from v1.x).

---

### Phase 6: Mobile Polish + QA Pass

**Rationale:** Additive polish on top of all functional features. Mobile verification, BottomAudioPlayer obscuring content check at 375px, UX refinements from using the product, and any remaining visual detail from the two-panel workspace.

**Delivers:** All interactive elements accessible above player bar on mobile at 375px; sidebar active state visual verified; GSAP scramble animation plays once (not on every scroll-back); "Minimize" affordance or back arrow to return workspace to hero; final visual QA pass

**Addresses:** PITFALLS.md UX Pitfalls (scramble animation on every scroll, player obscuring content on mobile, waveform confusion in library cards); FEATURES.md two-panel workspace back-navigation

**Research flag:** None — pure UI/CSS work; standard responsive patterns

---

### Phase Ordering Rationale

- Phase 1 first: bugs in the current codebase compound under the complexity added in later phases; fix while the system is simple
- Phase 2 before Phase 3: data layer must exist before UI can be built or tested against real data
- Phase 3 before Phase 4: verify audio architecture is correct before adding GSAP animations that could mask bugs
- Phase 4 before Phase 5: GSAP is isolated setup + library-only work; keeping it before the homepage transformation means one independent change at a time
- Phase 5 last among core features: modifies the most code in the most visible part of the app; defer until all additive phases are complete
- Phase 6 last: polish by definition comes after function

### Research Flags

Phases likely needing `/gsd:research-phase` during planning:

- **Phase 3 (Library UI):** If AudioPlayerContext race conditions appear during implementation, the `requestPlay`/`confirmPlay` handshake needs detailed implementation design. Only research if the basic integration test fails — do not pre-engineer.
- **Phase 5 (Workspace Transformation):** Framer Motion `layoutId` caveat with Next.js App Router (GitHub #49279) may require research if the layout animation approach is chosen. Safe fallback is CSS-only transition without Framer Motion `layoutId` — no research needed for the fallback path.

Phases with standard patterns (skip `/gsd:research-phase`):

- **Phase 1 (Foundation Fixes):** Both fixes are surgical line-level changes with clear solutions documented in PITFALLS.md
- **Phase 2 (Library Data Layer):** RSC + Drizzle + R2 pattern is already proven in the codebase
- **Phase 4 (GSAP Setup + Animations):** Pattern is documented in STACK.md with implementation-ready code examples and confirmed via official GSAP + Next.js docs
- **Phase 6 (Mobile Polish):** Pure CSS/Tailwind responsive work; no research needed

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Existing stack confirmed by direct codebase inspection; GSAP additions verified via official docs and npm registry; ScrambleText licensing confirmed via Webflow announcement and CSS-Tricks coverage |
| Features | HIGH | Codebase audited directly to establish what exists vs. what needs building; competitor analysis (Suno) confirms UX direction; feature prioritization based on actual user value at prototype scale (5-10 users) |
| Architecture | HIGH | Based entirely on direct source file inspection of the live codebase; no speculation; build order derived from actual dependency graph; anti-patterns grounded in code analysis |
| Pitfalls | HIGH | Pitfalls sourced from official wavesurfer.js GitHub issues, official GSAP docs, official Zustand Next.js guide, and direct codebase code analysis; warning signs and recovery strategies documented for all 10 pitfalls |

**Overall confidence:** HIGH

### Gaps to Address

- **Framer Motion `layoutId` + Next.js App Router compatibility:** A documented issue (GitHub #49279) exists. The safe fallback is CSS-only transition for the workspace transformation — functional UX without animation risk. Validate during Phase 5 planning; do not over-engineer the animation before proving the layout switch works correctly.

- **AudioPlayerContext initialization timing:** PITFALLS.md Pitfall 1 identifies a potential race condition between library card `play()` dispatch and wavesurfer initialization. This may not manifest in practice if BottomAudioPlayer is always mounted (which it is, in AppShell). Validate in Phase 3 with a simple integration test before implementing the requestPlay handshake.

- **Presigned URL expiry in library:** URLs generated at RSC render time expire (typically 1 hour for R2). Users who load the library page and leave it open for hours will get expired URLs on play. Accept this tradeoff for the prototype; solve with `router.refresh()` on play error or on-demand URL generation if it becomes a real problem.

- **GSAP ScrambleTextPlugin availability:** Confirmed free in `gsap` npm package as of Webflow's 2024 acquisition. Verify at install time with `console.log(ScrambleTextPlugin)` — if undefined, fall back to TextPlugin (also free, also in the main package) or a custom 15-line `setInterval` hook.

---

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection — `src/components/layout/`, `src/contexts/AudioPlayerContext.tsx`, `src/app/layout.tsx`, `src/components/GenerationPage.tsx`, `src/db/schema.ts` (ground truth for what exists)
- GSAP official docs — https://gsap.com/resources/React/ (useGSAP, scope, SSR safety, cleanup)
- GSAP ScrambleTextPlugin docs — https://gsap.com/docs/v3/Plugins/ScrambleTextPlugin/
- Webflow blog — GSAP all plugins free: https://webflow.com/blog/gsap-becomes-free
- CSS-Tricks — GSAP free for commercial use: https://css-tricks.com/gsap-is-now-completely-free-even-for-commercial-use/
- gsap npm ^3.14.2 — https://www.npmjs.com/package/gsap
- @gsap/react npm ^2.1.2 — https://www.npmjs.com/package/@gsap/react
- Next.js App Router RSC docs — https://nextjs.org/docs/app/building-your-application/rendering/server-components
- Next.js `usePathname()` — https://nextjs.org/docs/app/api-reference/functions/use-pathname
- Zustand Next.js guide (official) — https://zustand.docs.pmnd.rs/guides/nextjs
- PROJECT.md decision log — "Same-page create transformation" and "Persistent bottom audio player" architectural decisions

### Secondary (MEDIUM confidence)
- wavesurfer.js GitHub discussions #3190, #3523, #3591 — multiple instance patterns, global player architecture, 0px container behavior
- GSAP Community forums — ScrollTrigger + Next.js App Router cleanup patterns: https://gsap.com/community/forums/topic/40128-using-scrolltriggers-in-nextjs-with-usegsap/
- Medium — GSAP in Next.js 15 best practices: https://medium.com/@thomasaugot/optimizing-gsap-animations-in-next-js-15-best-practices-for-initialization-and-cleanup-2ebaba7d0232
- Framer Motion layout animations docs — https://motion.dev/docs/react-layout-animations
- Next.js App Router + Framer Motion issue — https://github.com/vercel/next.js/issues/49279
- Suno v4.5 interface analysis — https://www.0580rc.com/ai-chat/suno-v45-interface-guide-2025/
- Next.js persistent player pattern — https://github.com/vercel/next.js/issues/8441

### Tertiary (LOW confidence / needs validation)
- wavesurfer.js GitHub discussion #3190 — persistent bottom player with MediaElement pattern (community discussion, not official docs)
- BBC Sounds persistent player prototype (Medium) — React audio state architecture pattern validation

---
*Research completed: 2026-03-05*
*Ready for roadmap: yes*
