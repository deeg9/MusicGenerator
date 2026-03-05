# Pitfalls Research

**Domain:** Suno-Style UX Overhaul — Persistent audio player, GSAP animations, library page, two-panel workspace in existing Next.js App Router app
**Researched:** 2026-03-05
**Confidence:** HIGH (wavesurfer.js pitfalls from official GitHub issues; GSAP from official docs and confirmed Next.js forum discussions; audio state hydration from official Next.js/Zustand docs; layout pitfalls from first-principles code analysis of the existing codebase)

---

## Critical Pitfalls

### Pitfall 1: AudioPlayerContext Uses React Reducer — No Actual Audio Element

**What goes wrong:**
The existing `AudioPlayerContext.tsx` manages playback *state* (isPlaying, currentTrack) but owns no actual `<audio>` element or wavesurfer instance. The real audio lives inside `BottomAudioPlayer.tsx` → `PlayerContent` → `useWavesurfer`. This means the context and the audio engine are decoupled through a fragile "sync" loop: context says `isPlaying: true`, wavesurfer reads that and calls `wavesurfer.play()`. When adding a library page that also dispatches `play()`, three separate sync loops can race — the context state, wavesurfer's internal state, and the new library card's local state — producing double-plays, ghost plays (context says playing but wavesurfer is paused), or the waveform not loading at all because wavesurfer's container element is hidden while trying to initialize.

**Why it happens:**
The current design was built for a single-page use case where the BottomAudioPlayer is always mounted and the only thing that plays audio. Adding a library page with its own "Play" buttons creates new callers of `play()` that assume the BottomAudioPlayer is visible and wavesurfer is initialized — but wavesurfer only initializes when `currentTrack` changes and the container ref is attached. A library card dispatching `play()` before the BottomAudioPlayer's `useWavesurfer` has mounted causes a no-op.

**How to avoid:**
Before building the library page, consolidate the audio engine. The audio element (or wavesurfer instance) must be the single source of truth, not the context reducer. Two valid approaches:

Option A — Move the wavesurfer instance into context directly (store the ref in context, expose `wavesurfer` to consumers). All play/pause calls go through the wavesurfer instance, not a mirrored state variable.

Option B — Keep the current architecture but add an explicit initialization guard: library card "Play" buttons do not dispatch `play()` directly; they dispatch `requestPlay(track)` which the BottomAudioPlayer acknowledges and confirms when ready. No double-trigger possible.

The simpler fix is Option B: rename `play` to `requestPlay` in context, and have `PlayerContent` listen for `requestPlay` and only confirm the play after wavesurfer fires its `ready` event.

```tsx
// In context, add state:
type AudioPlayerAction =
  | { type: 'REQUEST_PLAY'; track: AudioTrack }  // new: intent
  | { type: 'CONFIRM_PLAY' }                      // new: wavesurfer ready
  | { type: 'PAUSE' }
  | { type: 'STOP' };
```

**Warning signs:**
- Library card "Play" button dispatches but no audio starts
- Clicking Play twice makes audio start (first click sets track, second click catches wavesurfer after it initializes)
- `isPlaying: true` in context but wavesurfer `isPlaying()` returns `false`
- Audio plays correctly from VariantCard but not from library page

**Phase to address:** Persistent Player foundation phase — fix the context architecture before building any additional callers.

---

### Pitfall 2: wavesurfer.js Container Renders with Zero Width When Hidden

**What goes wrong:**
wavesurfer.js reads the container element's dimensions at initialization time to calculate how wide to draw the waveform SVG. If the container has `display: none`, `visibility: hidden`, or zero width at initialization, wavesurfer renders a 0px waveform — audio loads and plays but no waveform is visible. The mobile layout in `BottomAudioPlayer.tsx` already does this intentionally (hidden wavesurfer div for audio engine only), but it becomes a problem if the BottomAudioPlayer is conditionally hidden during transitions or if the library page uses cards that start with the waveform container display:none until expansion.

In the library page context: a song card that hides its waveform until the user clicks "expand" will get a 0px waveform that never renders correctly — the container is 0px at wavesurfer init time.

**Why it happens:**
This is a documented wavesurfer.js behavior: `getBoundingClientRect()` on a hidden element returns zeros. wavesurfer does not re-measure on visibility changes. This was confirmed in wavesurfer.js GitHub discussions #3190 and #3523.

**How to avoid:**
Never initialize wavesurfer into a hidden or zero-width container. Two patterns work:

Pattern A — Lazy initialization: only mount the wavesurfer component after the container becomes visible. Use CSS for the expand/collapse animation, and only render `<WaveformPlayer>` in the DOM after the card is expanded (conditional render, not CSS hide).

Pattern B — Deferred initialization: pass `width` explicitly to wavesurfer options, bypassing the container measurement. Only works if you know the container width in advance (e.g., 100% of a known parent).

Pattern A is simpler and already consistent with the existing codebase approach:

```tsx
{isExpanded && <WaveformPlayer url={track.url} ... />}
// Not: <WaveformPlayer url={track.url} className={isExpanded ? '' : 'hidden'} />
```

**Warning signs:**
- Waveform container is empty (no SVG drawn) even though audio plays
- `wavesurfer.getDuration()` returns correct value but the visual is blank
- Waveform renders correctly after navigating away and back (because remount triggers re-initialization with visible container)
- Mobile layout has audio playing but no visual feedback

**Phase to address:** Library page phase — establish the conditional-render pattern for waveform cards before building any library list component.

---

### Pitfall 3: GSAP Imported in a Server Component File Crashes the Build

**What goes wrong:**
GSAP requires direct DOM access (`window`, `document`, `requestAnimationFrame`). If a file that imports GSAP — or imports a component that imports GSAP — is treated as a Server Component by Next.js App Router (no `"use client"` directive), the build fails with `ReferenceError: window is not defined` or the module fails to resolve in the Node.js server environment.

In this project the risk is subtle: the library page (`/app/library/page.tsx`) will be a Server Component by default. If a developer imports a `LibraryList` component that imports GSAP directly at the top level, the server component is poisoned even though the actual GSAP animation code only runs in browser effects.

**Why it happens:**
Next.js App Router evaluates all imports at the module level on the server. Even if GSAP is only *used* inside a `useEffect`, the `import gsap from 'gsap'` statement at the top of the file is evaluated on the server, where `window` does not exist.

**How to avoid:**
Establish a strict boundary: all GSAP imports live in files with `"use client"` at the top. Never import a GSAP-using component into a Server Component directly — import a client wrapper instead.

Create a central GSAP config file:

```tsx
// src/lib/gsap-config.ts — "use client" at top
'use client';
import { gsap } from 'gsap';
import { TextPlugin } from 'gsap/TextPlugin';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(TextPlugin, ScrollTrigger);

export { gsap, ScrollTrigger };
```

All animated components import from `@/lib/gsap-config`, never directly from `gsap`. Plugin registration happens once.

**Warning signs:**
- `ReferenceError: window is not defined` during `next build`
- Build succeeds in development (`next dev`) but fails in production build (dev mode is more lenient about server/client boundaries)
- Error message points to a GSAP plugin import line, not the animation code itself
- The error disappears when you add `"use client"` to the page file (wrong fix — fixes symptom, not cause)

**Phase to address:** GSAP setup phase — establish `gsap-config.ts` before writing any animation code.

---

### Pitfall 4: GSAP ScrollTrigger Leaks Across Route Changes in App Router

**What goes wrong:**
ScrollTrigger instances attach to the document scroll position. In Next.js App Router, navigating from the library page (which has GSAP ScrollTrigger animations on the song list) to the home page does not fully unmount the library page immediately — especially if the BottomAudioPlayer or AppShell layout is persistent. ScrollTrigger instances that weren't killed during unmount continue to fire their callbacks on the home page. Symptoms: GSAP animations from the library page trigger on the home page scroll, console errors about GSAP animating elements that no longer exist in the DOM, or the library page animations play in wrong positions on revisit.

**Why it happens:**
The `useGSAP()` hook from `@gsap/react` does handle cleanup automatically when the component unmounts — but only if the component *actually* unmounts. If the library page layout stays partially mounted (because it's inside a persistent layout segment), the cleanup hook never fires. Additionally, if `useEffect` is used instead of `useGSAP()`, cleanup must be manual and developers frequently forget to call `ScrollTrigger.getAll().forEach(t => t.kill())` in the cleanup function.

**How to avoid:**
Use `useGSAP()` from `@gsap/react` exclusively — never raw `useEffect` for GSAP. The hook handles revert/cleanup automatically on unmount.

```tsx
'use client';
import { useGSAP } from '@gsap/react';
import { gsap, ScrollTrigger } from '@/lib/gsap-config';
import { useRef } from 'react';

export function LibraryList({ tracks }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    gsap.from('.track-row', {
      opacity: 0,
      y: 20,
      stagger: 0.05,
      scrollTrigger: {
        trigger: containerRef.current,
        start: 'top 80%',
      },
    });
  }, { scope: containerRef }); // scope: prevents targeting outside the component

  return <div ref={containerRef}>...</div>;
}
```

The `scope` option is critical: it ensures GSAP only targets elements within `containerRef`, preventing cross-component contamination.

**Warning signs:**
- GSAP animations from library page run on home page after navigation
- Console errors: `GSAP target [.track-row] not found`
- Library animations play in wrong positions on second visit to library page
- ScrollTrigger count in `ScrollTrigger.getAll().length` grows with each page visit (never cleaned up)

**Phase to address:** GSAP animations phase — establish `useGSAP` with `scope` as the mandatory pattern before writing any scroll animations.

---

### Pitfall 5: Two-Panel Layout Breaks When Bottom Audio Player Appears

**What goes wrong:**
The two-panel create workspace (form panel left, results panel right) uses `h-screen` or `height: 100vh` to fill the viewport. When the BottomAudioPlayer slides in (`--player-bar-height: 80px`), the two-panel layout does not account for the player bar height — the bottom of the results panel is obscured by the persistent player. The existing `AppShell` adds `paddingBottom` to `<main>` dynamically when a track is playing, but a two-panel layout with `overflow-y-auto` on each panel independently (needed to allow each panel to scroll separately) does not inherit this padding correctly.

Additionally, on mobile where the layout collapses to a single-column stacked view, the fixed bottom player overlaps the last action button in the form or the download button in the results.

**Why it happens:**
The `AppShell` applies `paddingBottom: currentTrack ? 'var(--player-bar-height)' : undefined` to `<main>`, which works when the content is a single scrolling area. A two-panel layout with independently scrollable columns creates two separate scroll containers. The padding on `<main>` only affects the outer flex container, not the inner scroll containers of each panel.

**How to avoid:**
Use CSS custom properties to communicate the player height to all layout layers:

```css
/* globals.css */
:root {
  --player-bar-height: 0px; /* updated by JS when player is active */
}
[data-player-active="true"] {
  --player-bar-height: 80px;
}
```

In each independently scrollable panel column, use `padding-bottom: var(--player-bar-height)` rather than relying on the parent `<main>` padding. Add a `data-player-active` attribute to the `<html>` or layout wrapper based on `currentTrack` state.

Alternatively, use a layout that sizes panels with `calc(100vh - var(--player-bar-height))` and transitions this value when the player appears.

**Warning signs:**
- Bottom of results panel is cut off when audio is playing in the two-panel workspace
- Scrolling to the bottom of the results panel reveals content is hidden behind the player bar
- Mobile: "Download" or "Create New Song" button is behind the bottom player
- The padding appears correctly on the home page but not on the two-panel workspace

**Phase to address:** Two-panel workspace phase — test with audio playing before considering the layout complete.

---

### Pitfall 6: Zustand Persist Middleware Causes Hydration Mismatch for Audio State

**What goes wrong:**
If the audio player state is migrated from React Context to Zustand (a reasonable upgrade for the library page feature) and the persist middleware is added to remember the last-played track across page reloads, a hydration mismatch occurs. The server renders the page with `currentTrack: null` (initial state), but the client's Zustand store rehydrates from `localStorage` with a track object. React detects the difference and throws a hydration error, or worse, silently renders the wrong UI (player bar visible on initial server render because it was playing when the user last left).

This is the most commonly reported Zustand + Next.js issue — it has its own dedicated section in the official Zustand Next.js guide.

**Why it happens:**
Next.js renders on the server, where `localStorage` does not exist. Zustand's persist middleware hydrates from `localStorage` on the client after React's initial render. The two renders produce different HTML. React 18's hydration process detects the mismatch and errors.

**How to avoid:**
If adding Zustand for audio state, do NOT use the persist middleware naively. Instead, use the `skipHydration` pattern from the official Zustand Next.js docs:

```tsx
// In the store:
export const useAudioStore = create(
  persist(
    (set) => ({ currentTrack: null, isPlaying: false }),
    { name: 'audio-player', skipHydration: true }
  )
);

// In a root client component (e.g., AppShell):
useEffect(() => {
  useAudioStore.persist.rehydrate();
}, []);
```

This ensures the store is never rehydrated on the server, and client rehydration only happens after the initial render, preventing the mismatch.

Alternatively: do not persist audio state at all. The current React Context approach (no persistence) is correct for audio — users do not expect audio to resume where they left off after a full page reload. Only persist UI preferences (volume level, mute state) not the current track.

**Warning signs:**
- Hydration error: "Text content does not match server-rendered HTML"
- BottomAudioPlayer is visible on first server render (before user interaction)
- Player reappears with last track after hard page refresh (unexpected for most users)
- Console error mentions Zustand or localStorage during SSR

**Phase to address:** Audio state phase — if Zustand is introduced, implement `skipHydration` before adding any state that references `localStorage`.

---

### Pitfall 7: Multiple wavesurfer Instances Playing Simultaneously When Navigating Between Library Items

**What goes wrong:**
On the library page, each song card that has ever been expanded gets its own wavesurfer instance. When a user clicks Play on card A, then clicks Play on card B, both wavesurfer instances fire `play()` — card A's instance is not paused because only the context `isPlaying` state was updated, not card A's local wavesurfer instance directly. The result: two songs play at the same time.

The existing `WaveformPlayer.tsx` handles this for the VariantCard case via the `isActive` prop — when `isActive` becomes false, the component pauses its local wavesurfer. But the library page is a new context with many potential instances, and if `WaveformPlayer` is reused as-is, each instance has independent local `isPlaying` state that only pauses when `isActive` becomes false. If a library card is off-screen and not re-rendered when a new track starts, its `isActive` prop update never fires.

**Why it happens:**
React components that are off-screen (scrolled out of view but still mounted in the DOM) do not get re-rendered unless their props change. In a virtualized list or in a long non-virtualized list, cards that were playing but are now off-screen will not respond to the global state change.

**How to avoid:**
The only reliable way to prevent multi-instance playback is to route ALL play/pause commands through the global audio player. Library cards should not have their own independent audio playback — they are UI affordances that request playback from the BottomAudioPlayer:

```tsx
// Library card: no local audio playback
function LibraryCard({ track }) {
  const { currentTrack, isPlaying, play, pause } = useAudioPlayer();
  const isThisTrackPlaying = currentTrack?.url === track.url && isPlaying;

  return (
    <button onClick={() => isThisTrackPlaying ? pause() : play(track)}>
      {isThisTrackPlaying ? <Pause /> : <Play />}
    </button>
    // No <WaveformPlayer> here — the BottomAudioPlayer owns the waveform
  );
}
```

Library cards show a waveform *visualization* (static SVG or pre-computed peaks), not a live interactive wavesurfer instance. Only the BottomAudioPlayer gets a real wavesurfer instance.

**Warning signs:**
- Two songs play simultaneously when clicking between library cards
- Audio from previous card continues after navigating away from it
- Console shows multiple wavesurfer instances created (add a counter to verify)
- Pausing in the BottomAudioPlayer does not stop audio from a library card

**Phase to address:** Library page phase — design library cards as play-requestors, not audio players, from the start.

---

### Pitfall 8: Same-Page Workspace Transformation Breaks URL Deep-Linking

**What goes wrong:**
The existing `GenerationPage.tsx` already manages the `?job=` URL query parameter to allow deep-linking to a specific generation result. When the homepage transforms to the two-panel workspace, if this transformation is triggered by React state (e.g., `const [showWorkspace, setShowWorkspace] = useState(false)`) without a URL change, the workspace state is lost on page refresh. Users who are in the workspace, reload the page, and expect to return to their in-progress state instead see the blank hero. Worse: if a user shares the URL, the recipient sees the hero page, not the workspace.

**Why it happens:**
State-only transformations are not URL-serializable. The current codebase uses `router.replace` to persist `?job=` but the workspace visibility itself is not in the URL.

**How to avoid:**
Encode the workspace state in the URL from the start. The simplest approach: use a `?mode=create` query parameter. When the user clicks "Create" on the hero, add `?mode=create` to the URL. The page reads `searchParams.get('mode')` to determine whether to show the hero or the workspace. This preserves deep-linking and survives refresh.

```tsx
// In the home page component:
const searchParams = useSearchParams();
const mode = searchParams.get('mode'); // null = hero, 'create' = workspace
```

The existing `?job=` parameter can coexist — `?mode=create&job=abc123` means "workspace visible, showing results for job abc123".

**Warning signs:**
- Two-panel workspace disappears on page refresh, returning to hero
- Browser back button does not return to workspace from a subsequent navigation
- Sharing the URL while in workspace shows hero to the recipient
- The `handleNewGeneration` function in `GenerationPage.tsx` clears `?job=` but does not clear `?mode=create`, leaving the workspace visible with no job

**Phase to address:** Homepage transformation phase — establish URL encoding before adding GSAP transitions on top of state.

---

### Pitfall 9: GSAP ScrambleText / TextPlugin Requires GSAP Club License in Production

**What goes wrong:**
The milestone specifies "GSAP portfolio list with scramble text for library browsing." GSAP's ScrambleTextPlugin is a Club GSAP (paid) plugin. The free tier of GSAP (npm install gsap) does not include ScrambleText. If a developer installs the free `gsap` package and tries to import `ScrambleTextPlugin`, the import resolves to `undefined`, GSAP throws a warning, and the scramble animation is silently skipped. The library page appears to work in development (no error thrown, just no animation) but ships with a missing animation.

**Why it happens:**
The free GSAP npm package includes TextPlugin (text replacement, not scramble) but not ScrambleTextPlugin. The distinction is easy to miss because both sound similar and are both in the GSAP documentation. The error is silent in most configurations.

**How to avoid:**
Two valid paths:

Path A — Use TextPlugin (free, included). TextPlugin animates text content directly — not scramble/matrix style but smooth character-by-character reveal. It is sufficient for most UI animations and does not require a license.

Path B — Use a CSS-only scramble effect via a custom hook. A scramble effect can be implemented without GSAP using `setInterval` + character randomization in a React hook. This is approximately 15 lines of code and produces the same visual effect.

Path C — Purchase a GSAP Club license ($150/yr or one-time) which enables `ScrambleTextPlugin`.

Confirm which plugins are available before building animations that depend on them:

```ts
import { ScrambleTextPlugin } from 'gsap/ScrambleTextPlugin';
console.log(ScrambleTextPlugin); // undefined = not available in free tier
```

**Warning signs:**
- ScrambleTextPlugin import returns undefined without error
- Scramble animation works in a CodePen (where Club GSAP is often pre-loaded) but not in the local project
- `gsap.registerPlugin(ScrambleTextPlugin)` logs a GSAP warning about an invalid plugin
- Animation is "working" (no error) but text does not scramble

**Phase to address:** GSAP animations phase — verify available plugins before planning specific animation types.

---

### Pitfall 10: `useEffect` Listener Added Without Cleanup in GenerationPage Causes Memory Leak

**What goes wrong:**
`GenerationPage.tsx` line 146 adds a `window.addEventListener('navigate-create', onNavigateCreate)` inside a `useEffect` with no dependency array:

```tsx
useEffect(() => {
  function onNavigateCreate() { ... }
  window.addEventListener('navigate-create', onNavigateCreate);
  return () => window.removeEventListener('navigate-create', onNavigateCreate);
}); // No dependency array — runs on EVERY render
```

Without a dependency array, this `useEffect` runs on every render, adding a new event listener and removing the old one. In a two-panel workspace with frequent state updates (polling, phase transitions, GSAP animations triggering re-renders), this runs dozens of times per minute. Each listener addition/removal is a real DOM operation. While the `return () => removeEventListener` cleanup prevents listener accumulation, the excessive add/remove cycle degrades performance and is a latent bug waiting to cause issues if the return cleanup is ever accidentally removed.

**Why it happens:**
Missing dependency array is a common `useEffect` oversight. The React linter (eslint-plugin-react-hooks) would catch this as an "exhaustive-deps" warning if enabled.

**How to avoid:**
Add `[]` as the dependency array to run the listener registration once on mount:

```tsx
useEffect(() => {
  function onNavigateCreate() {
    if (phase !== 'idle') handleNewGeneration();
  }
  window.addEventListener('navigate-create', onNavigateCreate);
  return () => window.removeEventListener('navigate-create', onNavigateCreate);
}, []); // Empty array = mount/unmount only
```

Fix this before the two-panel workspace phase because the workspace will trigger significantly more re-renders than the current single-panel layout.

**Warning signs:**
- React DevTools profiler shows `GenerationPage` effects firing on every state update
- `window.addEventListener` / `removeEventListener` calls visible in Performance tab at high frequency
- ESLint `react-hooks/exhaustive-deps` warning on this specific `useEffect`
- The event listener occasionally fires twice on a single `navigate-create` event

**Phase to address:** Homepage/workspace foundation phase — fix before adding two-panel layout complexity.

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Library cards each own their own wavesurfer instance | Easy to implement, existing WaveformPlayer reusable | Multiple simultaneous playback, memory grows with library size, no coordination with BottomAudioPlayer | Never — always route through the global player |
| Using raw `useEffect` for GSAP instead of `useGSAP()` | Familiar React pattern, no additional package | ScrollTrigger leaks across routes, memory grows on navigation, animations re-run on wrong pages | Never — `@gsap/react` is free and official |
| Encoding workspace state in local React state only (not URL) | Simpler code, no router manipulation | Workspace lost on refresh, no deep-linking, broken browser back/forward | Never for main workspace view |
| Adding Zustand persist middleware to audio state | Restores last track on page reload | Hydration mismatch errors, player visible on first server render | Never for current track — acceptable for UI prefs (volume) |
| Hiding waveform container with `display:none` instead of conditional render | Smooth CSS transition for show/hide | wavesurfer initializes into 0px container, waveform never renders | Never — always use conditional render for wavesurfer containers |
| Importing GSAP plugins directly from `gsap` in each component file | Simpler per-file imports | Plugin registration runs multiple times, ScrollTrigger not registered when first animation runs | Never — use centralized `gsap-config.ts` with single registration |
| Using `window.dispatchEvent` / `window.addEventListener` for cross-component communication | Quick way to trigger actions without prop drilling | Not type-safe, no React integration, leaks if cleanup missed, impossible to test | Acceptable only as a temporary bridge; replace with context or Zustand |

---

## Integration Gotchas

Common mistakes when connecting to external services or libraries.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| wavesurfer.js + hidden container | `display:none` on container during init | Conditionally render `<WaveformPlayer>` only when its container is visible; never hide with CSS |
| wavesurfer.js + global player | Creating one instance per library card | Only one wavesurfer instance lives in BottomAudioPlayer; library cards are play-request buttons only |
| GSAP + Next.js App Router | Importing GSAP in Server Component files | All GSAP imports behind `"use client"`; central `gsap-config.ts` file; never in page.tsx directly |
| GSAP + React | Using `useEffect` for animations | Use `useGSAP()` from `@gsap/react`; it handles cleanup, revert, and SSR fallback automatically |
| GSAP ScrollTrigger + persistent layout | Not scoping to component ref | Always pass `scope: containerRef` to `useGSAP()`; prevents cross-component animation targeting |
| Zustand + Next.js SSR | Using persist middleware with `localStorage` | Use `skipHydration: true` in persist config; call `rehydrate()` in a client-side `useEffect` |
| BottomAudioPlayer + two-panel layout | Relying on `<main>` paddingBottom for scroll clearance | Each independently-scrolling panel column must have its own `pb-[var(--player-bar-height)]` |
| Same-page workspace transformation | State-only transition, no URL update | Encode workspace mode in URL (`?mode=create`) so the state survives refresh and can be deep-linked |

---

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Mounting a `<WaveformPlayer>` for every library item | Page sluggish, high memory, multiple audio contexts | Lazy-mount wavesurfer only for the active track in BottomAudioPlayer; library cards use static waveform SVG | At 20+ library items on one page |
| Non-virtualized library list with many DOM nodes | Scroll jank, layout recalculations | Use `react-window` or `react-virtual` if library grows beyond 50 items | At ~50 items for low-end devices |
| GSAP `stagger` on all rows without `ScrollTrigger` viewport check | Entire list animates instantly on page load, no progressive reveal | Add `scrollTrigger.start: 'top 80%'` so only visible rows animate | Immediately on lists longer than the viewport |
| `AnimatePresence` wrapping the entire two-panel workspace | Every panel state change triggers full exit/enter animation | Scope `AnimatePresence` to only the element that actually transitions (results panel content, not the panels themselves) | Any time a form field updates |
| Polling interval running in library page (if status polling is added for "generating" library items) | Network requests every 2s even when user is on a different page | Always cancel polling intervals on component unmount; tie polling to route-level focus | Immediately — polling is always active until explicitly stopped |

---

## Security Mistakes

Domain-specific security issues beyond general web security.

| Mistake | Risk | Prevention |
|---------|------|------------|
| Storing `currentTrack.url` (presigned R2 URL) in localStorage via Zustand persist | Presigned URL exposed in localStorage (accessible to any JS), URL may expire but remains in storage | Do not persist track URLs; persist only track metadata (title, jobId) and regenerate the presigned URL on demand |
| GSAP plugin loaded from CDN fallback | If CDN is compromised, malicious animation scripts run in user context | Always import GSAP from npm; never use `<script>` CDN tag as fallback |
| Library page fetches all user tracks without pagination at the API level | API returns unlimited rows; malicious actor can enumerate all tracks | Add `LIMIT` to all library queries; paginate at the database level, not just the UI level |

---

## UX Pitfalls

Common user experience mistakes in this domain.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Scramble text animation on library items plays on every scroll | Animation is exciting the first time, annoying after 3 scrolls; re-triggers on back navigation | Use `once: true` in ScrollTrigger; do not replay animation on scroll-back |
| BottomAudioPlayer appears while user is on homepage before any interaction | Jarring first impression; player shows last persisted track that user didn't intend to play | Never show BottomAudioPlayer until user explicitly triggers play in this session; do not restore track from storage |
| Two-panel workspace has no way to collapse back to hero / single-column view | Users who want more room feel trapped in the split layout | Add a "Minimize" or back-arrow affordance that returns to hero (clears `?mode=create`) |
| Library page plays audio but the BottomAudioPlayer is not visible because user scrolled | User cannot see what is playing; no playback control | BottomAudioPlayer must be `position: fixed` (already implemented) — verify it is not obscured by library page scroll container |
| Waveform visualization in library cards is a live interactive player | Users click the waveform expecting to scrub; it jumps to BottomAudioPlayer instead | Be explicit in design: library cards have a play button only, waveform in library is decorative; full scrubbing only in BottomAudioPlayer |
| GSAP animation on library list delays first paint of track titles | Users see blank rows for 0.3-0.5s before items animate in | Always set `opacity: 1` by default; use GSAP `from` not `to` so content is visible if GSAP fails to load |

---

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **BottomAudioPlayer:** Shows waveform and plays audio — verify it accounts for `--player-bar-height` in both the two-panel workspace and library page scroll containers
- [ ] **Library page play buttons:** Click triggers audio — verify only ONE audio source plays at a time (no simultaneous playback from multiple library cards)
- [ ] **GSAP library animations:** Animations play on scroll — verify `useGSAP` with `scope` is used, not raw `useEffect`, and verify ScrollTrigger instances are killed on library page unmount
- [ ] **GSAP ScrambleText:** Scramble animation runs — verify the plugin is actually available in the npm package being used (free vs Club GSAP)
- [ ] **Same-page workspace:** Homepage transforms to two-panel — verify `?mode=create` is in the URL and the workspace survives page refresh
- [ ] **Workspace + player:** Two-panel layout looks correct — verify the bottom panel content is NOT obscured by the BottomAudioPlayer bar when a track is playing
- [ ] **wavesurfer in library:** Waveform renders in library cards — verify wavesurfer container is never initialized while hidden; if library cards use conditional waveform display, verify unmount/remount not CSS hide
- [ ] **Context architecture:** Play button works from library page — verify `play()` from a library card actually starts wavesurfer in BottomAudioPlayer (test with the BottomAudioPlayer visible)
- [ ] **`useEffect` dependency arrays:** All `useEffect` calls have correct deps — verify `GenerationPage.tsx` listener `useEffect` has `[]` dependency array
- [ ] **Mobile:** All features work at 375px — verify BottomAudioPlayer does not obscure CTA buttons on library page or workspace at small viewport

---

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Context/wavesurfer sync race (double-play, ghost play) | HIGH | Consolidate audio engine into context; add `requestPlay`/`confirmPlay` handshake; retest all callers |
| wavesurfer 0px container (blank waveform) | LOW | Replace `display:none` hide with conditional render; wavesurfer re-initializes on mount with correct container size |
| GSAP in Server Component (build crash) | LOW | Add `"use client"` to the file that imports GSAP; move GSAP import to `gsap-config.ts` |
| ScrollTrigger leak (cross-page animations) | MEDIUM | Replace all raw `useEffect` GSAP calls with `useGSAP()`; add `scope: ref` to each; verify `ScrollTrigger.getAll().length` resets on navigation |
| Two-panel layout obscured by player bar | LOW | Add `pb-[var(--player-bar-height)]` to each panel scroll container; test with track playing |
| Zustand hydration mismatch | LOW | Add `skipHydration: true` to persist config; add `rehydrate()` in `useEffect([], [])` |
| Multiple simultaneous audio | MEDIUM | Remove wavesurfer from library cards entirely; route all play through BottomAudioPlayer context |
| Workspace state lost on refresh | LOW | Add `?mode=create` URL param; read from `useSearchParams()` to determine view |
| ScrambleText not available | LOW | Switch to TextPlugin (free) or implement custom scramble hook |
| `useEffect` listener without deps leaking | LOW | Add `[]` dependency array; verify with React DevTools profiler |

---

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| AudioPlayerContext/wavesurfer sync race | Persistent player architecture phase | Play from BottomAudioPlayer; then dispatch `play()` programmatically from a test button; verify single audio source |
| wavesurfer 0px container | Library page phase | Expand/collapse a library card; verify waveform renders after expand; inspect container dimensions in DevTools |
| GSAP build crash (Server Component import) | GSAP setup phase | Run `next build`; confirm no `window is not defined` errors |
| GSAP ScrollTrigger leak | GSAP animations phase | Navigate library → home → library; verify `ScrollTrigger.getAll().length` does not grow |
| Two-panel layout + player bar overlap | Workspace layout phase | Start audio playback, then use workspace; verify all content is scrollable and accessible above player bar |
| Zustand hydration mismatch | Audio state phase (if Zustand is added) | Run `next build && next start`; verify no hydration errors in console |
| Multiple simultaneous audio | Library page phase | Click Play on 3 different library cards in quick succession; verify only 1 audio source plays |
| Workspace URL state loss | Homepage transformation phase | Navigate to workspace, hard refresh; verify workspace is restored |
| GSAP plugin availability | GSAP setup phase | `console.log(ScrambleTextPlugin)` before using; confirm defined or switch to TextPlugin |
| useEffect listener memory leak | GenerationPage fix phase | React DevTools profiler; verify `navigate-create` listener does not accumulate |
| Bottom player obscuring content on mobile | Mobile polish phase | Test at 375px with audio playing; verify all interactive elements are accessible above player bar |

---

## Sources

- wavesurfer.js Discussion #3190 — Multiple Wavesurfer instances and bottom player in React/Next.js (Soundcloud-like): https://github.com/katspaugh/wavesurfer.js/discussions/3190
- wavesurfer.js Discussion #3523 — Global player bug, waveform not displaying when switching sources: https://github.com/katspaugh/wavesurfer.js/discussions/3523
- wavesurfer.js Discussion #3591 — Multiple waveforms: how to stop a playing waveform when another starts: https://github.com/katspaugh/wavesurfer.js/discussions/3591
- GSAP React docs (official) — useGSAP hook, cleanup, scope, ScrollTrigger with Next.js App Router: https://gsap.com/resources/React/
- GSAP Community — ScrollTrigger and React component cycle cleanup: https://gsap.com/community/forums/topic/35810-scrolltrigger-and-react-component-cycle-cleanup/
- GSAP Community — Using ScrollTriggers in Next.js with useGSAP(): https://gsap.com/community/forums/topic/40128-using-scrolltriggers-in-nextjs-with-usegsap/
- Medium — Optimizing GSAP Animations in Next.js 15: Best Practices for Initialization and Cleanup: https://medium.com/@thomasaugot/optimizing-gsap-animations-in-next-js-15-best-practices-for-initialization-and-cleanup-2ebaba7d0232
- Zustand Next.js guide (official) — skipHydration pattern, per-request stores, SSR hydration: https://zustand.docs.pmnd.rs/guides/nextjs
- Zustand Discussion #1382 — Persist middleware with localStorage causes hydration errors in Next.js: https://github.com/pmndrs/zustand/discussions/1382
- Medium — Fix Next.js 14 hydration error with Zustand state management: https://medium.com/@koalamango/fix-next-js-hydration-error-with-zustand-state-management-0ce51a0176ad
- Next.js Docs — React Hydration Error: https://nextjs.org/docs/messages/react-hydration-error
- Medium — Using Context API or Redux to Store and Manage an Audio Element in Next.js: https://medium.com/@milton_bhowmick/how-to-store-an-audio-element-in-next-js-3bfbc324c5d9
- Next.js GitHub Issue #8441 — How to make music player continue playing when moving between pages: https://github.com/vercel/next.js/issues/8441
- Existing codebase analysis — AudioPlayerContext.tsx, BottomAudioPlayer.tsx, WaveformPlayer.tsx, GenerationPage.tsx, AppShell.tsx (direct inspection, 2026-03-05)

---
*Pitfalls research for: Suno-Style UX Overhaul — persistent audio player, GSAP animations, library page, two-panel workspace in existing Next.js App Router app*
*Researched: 2026-03-05*
