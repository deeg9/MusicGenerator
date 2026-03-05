# Stack Research

**Domain:** Suno-style UX overhaul — persistent audio player, library page, two-panel workspace, GSAP scramble text (Next.js music app)
**Researched:** 2026-03-05
**Confidence:** HIGH (GSAP/ScrambleText verified via official docs and npm; existing architecture verified by reading live source files)

---

## Context: What Already Exists (Do Not Re-add)

The v1.0 and v1.1 stack is fully operational. This research covers ONLY net-new additions needed for the v2.0 Suno-style UX milestone.

### Already Installed and Working

| Already In Place | Version | Status |
|------------------|---------|--------|
| Next.js | 16.1.6 | App Router, no changes needed |
| React | 19.2.3 | No changes needed |
| Tailwind CSS | ^4 | CSS-first config in globals.css |
| Framer Motion | ^12.35.0 | Installed — Sidebar, BottomAudioPlayer, AnimatePresence all using it |
| wavesurfer.js | ^7.12.1 | Installed |
| @wavesurfer/react | ^1.0.12 | Installed — BottomAudioPlayer uses `useWavesurfer` hook |
| next-themes | ^0.4.6 | Installed — theme toggle working |
| lucide-react | ^0.577.0 | Installed — all icons sourced from here |
| clsx / tailwind-merge | — | Should be present (cn() pattern used) |

### Already Built (Not In package.json, In Source)

These features are **already implemented** in the codebase. Research confirmed by reading live source files. No new library needed for any of them:

| Feature | Implementation | Where |
|---------|---------------|-------|
| Persistent bottom audio player | `useWavesurfer` + React Context + `AnimatePresence` slide-up animation | `src/components/layout/BottomAudioPlayer.tsx` |
| Audio player state management | React Context + `useReducer` — `play/pause/resume/stop` | `src/contexts/AudioPlayerContext.tsx` |
| Two-panel layout shell | Flex layout: `<Sidebar>` (fixed-width) + `<main>` (flex-1) | `src/components/layout/AppShell.tsx` |
| Sidebar navigation | Framer Motion spring expand/collapse, mobile overlay | `src/components/layout/Sidebar.tsx` |
| Sidebar state | React Context — `isOpen`, `isMobileOpen` | `src/components/layout/SidebarProvider.tsx` |
| Reduced motion hook | `useReducedMotion` | `src/hooks/useReducedMotion.ts` |

---

## Recommended Stack — New Additions Only

The only library gap for v2.0 is GSAP for the library page scramble text animation. Everything else is already in place.

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| gsap | ^3.14.2 | ScrambleText animation engine for library page | Industry-standard animation library. ScrambleText plugin (previously Club GSAP paid) is now 100% free as of Webflow's acquisition in 2024. Ships in the main `gsap` npm package — no separate plugin package needed. Use `import ScrambleTextPlugin from 'gsap/ScrambleTextPlugin'` |
| @gsap/react | ^2.1.2 | `useGSAP()` hook — the correct way to use GSAP in React | Drop-in for `useLayoutEffect/useEffect` that properly handles GSAP context and cleanup in React's render cycle. Prevents animation leaks on unmount. Implements `useIsomorphicLayoutEffect` so it's safe in Next.js SSR. Requires `"use client"` directive on any component using it. |

### What NOT to Install

| Do NOT Add | Why | Already Have / Use Instead |
|------------|-----|---------------------------|
| `react-gsap` (community package) | Last published 5 years ago, unmaintained | Use `@gsap/react` (official GreenSock package) |
| `howler.js` or `react-player` | Redundant with wavesurfer.js already installed | `@wavesurfer/react` already handles audio playback |
| `zustand` or `redux` for audio state | Adds state management library for one concern | React Context + useReducer is already implemented and sufficient at prototype scale (5-10 users) |
| `react-resizable-panels` | Two-panel resize library | Current layout uses CSS flex — no resize handles needed for Suno-style layout |
| Any waveform alternative library | Redundant | wavesurfer.js ^7 + @wavesurfer/react already installed and working in BottomAudioPlayer |

---

## Installation

```bash
# Only two new packages needed for v2.0
npm install gsap @gsap/react
```

---

## GSAP Integration Pattern for Next.js App Router

GSAP requires "use client" because it manipulates the DOM. The correct pattern for Next.js App Router:

```tsx
// src/components/library/LibraryList.tsx
"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrambleTextPlugin } from "gsap/ScrambleTextPlugin";

// Register once per module (idempotent — safe to call multiple times)
gsap.registerPlugin(useGSAP, ScrambleTextPlugin);

export function LibraryList() {
  const container = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    // GSAP context is scoped to container — auto-cleanup on unmount
    gsap.to(".song-title", {
      duration: 1,
      scrambleText: {
        text: "Your Song Title",
        chars: "upperCase",
        speed: 0.5,
      },
    });
  }, { scope: container });

  return <div ref={container}>{/* library items */}</div>;
}
```

**Key points:**
- Register plugins at module level (once per file), not inside components
- `useGSAP()` with `{ scope: container }` auto-cleans animations on unmount — prevents React StrictMode double-fire leaks
- Never use bare `useEffect` with GSAP in React — use `useGSAP` instead
- `ScrambleTextPlugin` is imported from `gsap/ScrambleTextPlugin` (included in the main `gsap` package)

---

## Two-Panel Workspace Layout — No New Libraries Needed

The AppShell already implements the core structure. The two-panel workspace (form left, results right) on the homepage is a CSS-only concern:

```tsx
// Homepage two-panel: add inside AppShell's <main>
<div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
  <div className="panel-form overflow-y-auto">{/* prompt form */}</div>
  <div className="panel-results overflow-y-auto">{/* generated tracks */}</div>
</div>
```

CSS Grid (`grid-cols-2`) with Tailwind responsive prefixes handles the responsive collapse. No library needed.

---

## Persistent Audio Player — No Changes Needed

The architecture is already correct and complete:

1. `AudioPlayerContext` — global state via React Context + `useReducer`
2. `BottomAudioPlayer` — fixed `position: fixed` at bottom, `AnimatePresence` slide-in
3. `AppShell` — wraps entire app, provider at root so state survives page navigation
4. `useWavesurfer` — handles waveform rendering; MediaElement backend used for the global audio

The only remaining work is wiring up library song cards to call `play(track)` from the context — no architectural changes.

---

## Library Page — No New Libraries Needed

The `/library` page requires:

1. **Route**: `src/app/library/page.tsx` — Next.js file-based routing, no new library
2. **Data fetching**: Drizzle ORM query (already installed) to fetch generated songs from Supabase
3. **Song cards**: Custom component using existing Tailwind + lucide-react icons
4. **GSAP scramble text**: `gsap` + `@gsap/react` (the only new npm addition)
5. **Waveform mini-preview**: `@wavesurfer/react` already installed

---

## Alternatives Considered

| Recommended | Alternative | Why Not |
|-------------|-------------|---------|
| GSAP ScrambleText (via gsap package) | Hand-rolled scramble text with `setInterval` | 30-50 lines of custom JS, harder to coordinate with scroll triggers and entrance animations. GSAP ScrambleText is now free and purpose-built. |
| GSAP ScrambleText | shadcn scrambled-text component (shadcn.com/text/scrambled-text) | Copy-paste component that uses `useEffect` + `setInterval`. Works but: no GSAP scroll trigger integration, less configurability, doesn't set up GSAP for future animations. If GSAP is being added anyway for library entrance animations, use ScrambleText. |
| `@gsap/react` (official) | `react-gsap` (community) | react-gsap is 5 years unmaintained. `@gsap/react` is maintained by the original GSAP team at Webflow. |
| React Context + useReducer (existing) | Zustand | Zustand adds a dependency for a use case that existing Context already handles. At 5-10 user prototype scale, there is no performance argument for Zustand over Context here. Revisit if audio player needs derived state across many subscribers. |
| CSS Grid (Tailwind) | `react-resizable-panels` | Resizable panels add complexity and interaction burden. Suno doesn't have resizable panels — fixed proportions are the right call. |

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| gsap ^3.14.2 | React 19, Next.js 16, Tailwind v4 | No framework dependencies — pure JS animation engine |
| @gsap/react ^2.1.2 | React 19, Next.js 16 App Router | Requires "use client" directive. Uses `useIsomorphicLayoutEffect` internally so SSR-safe. Works with React 19 Strict Mode. |
| gsap ScrambleTextPlugin | gsap ^3.14.2 | Bundled in main gsap package since all plugins became free. Import from `gsap/ScrambleTextPlugin`. |

---

## File Structure for v2.0 Additions

```
src/
  app/
    library/
      page.tsx               # New: /library route — song browsing
  components/
    library/
      LibraryList.tsx        # New: GSAP-animated song list
      SongCard.tsx           # New: music player card for library items
```

Everything else (AppShell, Sidebar, BottomAudioPlayer, AudioPlayerContext) is already built.

---

## Sources

- Webflow blog — GSAP all plugins free announcement (confirmed all Club GSAP plugins including ScrambleText now free): https://webflow.com/blog/gsap-becomes-free (HIGH confidence)
- CSS-Tricks — "GSAP is Now Completely Free, Even for Commercial Use": https://css-tricks.com/gsap-is-now-completely-free-even-for-commercial-use/ (HIGH confidence)
- gsap npm — version 3.14.2 current, last published ~Jan 2026: https://www.npmjs.com/package/gsap (HIGH confidence)
- @gsap/react npm — version 2.1.2, official GreenSock React package: https://www.npmjs.com/package/@gsap/react (HIGH confidence)
- GSAP React docs — useGSAP hook, "use client" requirement, scope pattern: https://gsap.com/resources/React/ (HIGH confidence)
- GSAP ScrambleText docs — plugin usage, character options: https://gsap.com/docs/v3/Plugins/ScrambleTextPlugin/ (HIGH confidence)
- wavesurfer.js GitHub discussion #3190 — persistent bottom player with MediaElement pattern: https://github.com/katspaugh/wavesurfer.js/discussions/3190 (MEDIUM confidence — community discussion, pattern matches current codebase)
- Live codebase inspection — `src/components/layout/BottomAudioPlayer.tsx`, `AppShell.tsx`, `Sidebar.tsx`, `src/contexts/AudioPlayerContext.tsx` — confirmed what's already built (HIGH confidence — direct source read)

---

*Stack research for: Suno-style UX overhaul — persistent audio player, library page, GSAP scramble text, two-panel workspace (v2.0 milestone)*
*Researched: 2026-03-05*
