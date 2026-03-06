# Phase 11: Library UI + Persistent Player - Research

**Researched:** 2026-03-05
**Domain:** React Context state machines, GSAP ScrambleTextPlugin, wavesurfer.js playlist mechanics
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Library card play interaction**
- Always-visible play button on each library card (left side of card)
- Play button toggles to pause icon when that card's track is actively playing
- Clicking play on a card calls AudioPlayerContext.play() — no local wavesurfer in cards
- Active (currently-playing) card gets a subtle primary/amber tinted background to distinguish from other cards
- On mobile: same always-visible play button (no hover-dependent behavior)
- Convert LibrarySongCard from server component to client component ('use client') — simpler than wrapper pattern, library page itself stays RSC

**Player bar enhancements**
- Skip forward/backward = next/previous song in the library list (playlist-aware, not time-seek)
- AudioPlayerContext needs a playlist/queue concept — library page sets the playlist, skip navigates it
- Player bar subtitle: genre tags as plain comma-separated text (not pills), replacing current variant display
- Always show genre text in player bar (for both library songs and generation results)
- Keep existing full interactive waveform in BottomAudioPlayer — already satisfies "mini waveform visualization" requirement
- Existing volume, download, close controls remain unchanged

**Variant handling**
- Auto-play first variant (variant 0) when user clicks play on a library card
- Skip forward cycles: variant 0 → variant 1 → next song's variant 0 → next song's variant 1 → ...
- Skip backward reverses: goes to previous variant, then previous song's last variant
- Continuous auto-advance: after both variants of a song finish, automatically start next song in library
- Subtle variant indicator in player bar: small "1/2" or "2/2" badge near the title
- Library playlist order matches library display order (newest-first)

**GSAP scramble text**
- Scramble animation on card title text only (genre pills stay static)
- Custom character set: music symbols (♪ ♫ ♩ ♬ ♭ ♮ ♯) mixed with random letters
- Medium speed: 0.7-0.8 second duration for the scramble-to-resolve animation
- Triggers on every mouse enter (not once-per-session)
- Uses useGSAP hook with scope for proper cleanup
- Import gsap from src/lib/gsap-config.ts (centralized, ScrambleTextPlugin already registered)
- No scramble on mobile (no hover) — title displays normally

### Claude's Discretion

None specified — all decisions locked.

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| LIB2-04 | User can play a song directly from a library card (triggers persistent player) | AudioPlayerContext.play() call pattern confirmed from VariantCard; playlist extension in context reducer |
| LIB2-05 | Library cards have GSAP scramble text hover animation on title/genre | ScrambleTextPlugin chars property confirmed; contextSafe pattern required for hover events in useGSAP |
| PERS-01 | Fixed bottom audio player bar is visible across all pages when a track is playing | Already architecturally solved — AppShell renders BottomAudioPlayer outside route tree |
| PERS-02 | Player bar shows current track title, artist/genre, and playback progress | AudioTrack needs genre field; progress display already exists |
| PERS-03 | Player bar has play/pause, skip forward, and skip backward controls | Skip requires playlist state + currentIndex in AudioPlayerContext reducer |
| PERS-04 | Player bar displays a mini waveform visualization of the current track | Existing wavesurfer in BottomAudioPlayer satisfies this — no new work needed |
| PERS-05 | Player bar persists across page navigation (home ↔ library) without interrupting playback | Already solved — AudioPlayerProvider lives in AppShell above route changes |
</phase_requirements>

---

## Summary

Phase 11 is an interactivity phase, not a data phase. All infrastructure is already in place — the challenge is extending existing patterns carefully without breaking them. There are three distinct workstreams: (1) extending AudioPlayerContext with playlist/queue state and skip actions, (2) converting LibrarySongCard to a client component with play button + active state, and (3) adding GSAP scramble text to card titles using the contextSafe pattern.

The most significant engineering decision is the AudioPlayerContext extension. The context currently manages a single track. It needs a `playlist` array, `currentIndex`, and `skipNext`/`skipPrev` actions. The variant traversal logic (flat traversal across song variants) is the most complex piece — a flat `PlaylistEntry[]` array flattened from `[{song, variantIndex}]` tuples is cleaner than nested arrays and makes skip arithmetic trivial.

The GSAP scramble requires the `contextSafe` wrapper because hover events fire after `useGSAP` hook execution — animations created in event handlers are not automatically context-tracked and will not be cleaned up on unmount without it. This is a documented GSAP/React pitfall that must be followed exactly.

**Primary recommendation:** Extend AudioPlayerContext reducer with flat playlist entries first (11-01 can call the extended API even if skip buttons aren't wired until 11-02). Build LibrarySongCard as a client component that computes active state from context. Wire GSAP scramble with contextSafe in 11-03.

---

## Standard Stack

### Core (all already installed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| gsap | ^3.14.2 | Animation engine + ScrambleTextPlugin | Already installed; ScrambleTextPlugin registered in gsap-config.ts |
| @gsap/react | ^2.1.2 | useGSAP hook for React lifecycle management | Already installed; drop-in replacement for useEffect for animations |
| wavesurfer.js | ^7.12.1 | Audio waveform rendering + playback | Already in BottomAudioPlayer; no new wavesurfer instances needed in Phase 11 |
| @wavesurfer/react | ^1.0.12 | React wrapper for wavesurfer | Already wired in BottomAudioPlayer |
| lucide-react | ^0.577.0 | Play, Pause, SkipBack, SkipForward icons | Already used throughout; SkipBack/SkipForward available |
| framer-motion | ^12.35.0 | AnimatePresence for player show/hide | Already in BottomAudioPlayer |
| react | 19.2.3 | useReducer, useRef, useCallback, useContext | Already in use |

### No New Installs Required

All dependencies for Phase 11 are already present in package.json. No `npm install` needed.

---

## Architecture Patterns

### Pattern 1: Flat Playlist Entry Structure

**What:** Flatten the library's songs + variants into a single ordered array of `PlaylistEntry` objects before storing in context. Each entry is one playable audio track with its song metadata.

**When to use:** Whenever skip logic needs to traverse across song boundaries and variant boundaries uniformly.

**Why flat over nested:** Skip arithmetic is `currentIndex + 1` instead of nested array traversal. Auto-advance on `finish` is trivial.

```typescript
// Flat playlist entry — one per variant per song
interface PlaylistEntry {
  url: string;
  title: string;
  genre: string | null;
  variantIndex: number;
  totalVariants: number;  // for "1/2" badge
  jobId: string;
  mp3Url: string | null;
  wavUrl: string | null;
}

// Updated AudioTrack type — add genre field
export interface AudioTrack {
  url: string;
  title: string;
  genre?: string | null;       // NEW — comma-separated genre tags
  variantIndex?: number;
  totalVariants?: number;      // NEW — for "1/2" badge in player bar
  jobId?: string;
  mp3Url?: string | null;
  wavUrl?: string | null;
}

// Updated state
interface AudioPlayerState {
  currentTrack: AudioTrack | null;
  isPlaying: boolean;
  playlist: PlaylistEntry[];   // NEW — flat list
  currentIndex: number;        // NEW — position in playlist (-1 if no playlist)
}
```

### Pattern 2: AudioPlayerContext Reducer Extension

**What:** Add `SET_PLAYLIST`, `SKIP_NEXT`, `SKIP_PREV` actions to the existing reducer. `SET_PLAYLIST` stores the flat array and sets the initial index. `SKIP_NEXT`/`SKIP_PREV` compute the new index and derive the next `AudioTrack` from the playlist.

```typescript
// New action types (added to existing union)
type AudioPlayerAction =
  | { type: 'PLAY'; track: AudioTrack }
  | { type: 'PAUSE' }
  | { type: 'RESUME' }
  | { type: 'STOP' }
  | { type: 'SET_PLAYLIST'; playlist: PlaylistEntry[]; startIndex: number }  // NEW
  | { type: 'SKIP_NEXT' }    // NEW
  | { type: 'SKIP_PREV' };   // NEW

// Reducer logic for SKIP_NEXT
case 'SKIP_NEXT': {
  if (state.playlist.length === 0) return state;
  const nextIndex = Math.min(state.currentIndex + 1, state.playlist.length - 1);
  const entry = state.playlist[nextIndex];
  return {
    ...state,
    currentIndex: nextIndex,
    currentTrack: entryToTrack(entry),
    isPlaying: true,
  };
}

// Helper to convert PlaylistEntry → AudioTrack
function entryToTrack(entry: PlaylistEntry): AudioTrack {
  return {
    url: entry.url,
    title: entry.title,
    genre: entry.genre,
    variantIndex: entry.variantIndex,
    totalVariants: entry.totalVariants,
    jobId: entry.jobId,
    mp3Url: entry.mp3Url,
    wavUrl: entry.wavUrl,
  };
}
```

### Pattern 3: Library Page Sets Playlist on Card Play

**What:** LibrarySongCard receives the full flattened playlist and its own `startIndex`. When the user clicks play, it calls `setPlaylist(fullPlaylist, myStartIndex)` rather than just `play(track)`. This gives the context enough information to skip across all songs.

**How to build the flat playlist in the library RSC:** The library page already has `songsWithUrls`. Before rendering, compute the flat array:

```typescript
// In LibraryPage (RSC) — build flat playlist for all songs
// Pass to LibraryList client component as a prop
const flatPlaylist: PlaylistEntry[] = songsWithUrls.flatMap((song) =>
  song.outputs
    .map((output, i) => ({
      url: song.playbackUrls[i] ?? null,
      title: deriveTitle(song.promptText),
      genre: song.genreTags,
      variantIndex: output.variantIndex,
      totalVariants: song.outputs.length,
      jobId: song.id,
      mp3Url: song.playbackUrls[i] ?? null,
      wavUrl: null,
    }))
    .filter((entry) => entry.url !== null) as PlaylistEntry[]
);
```

**LibraryList client wrapper:** The library page stays RSC but wraps cards in a `LibraryList` client component that holds the full playlist in scope for all cards to reference.

### Pattern 4: Active Card Detection via Context

**What:** LibrarySongCard computes its own "is active" state by comparing its song's `jobId` against `currentTrack?.jobId` from context.

```typescript
// Inside LibrarySongCard ('use client')
const { currentTrack, isPlaying, setPlaylist } = useAudioPlayer();

const isThisSongActive = currentTrack?.jobId === song.id;
const isThisVariantActive = isThisSongActive && currentTrack?.variantIndex === 0; // first variant by default

// Play button state
const isCurrentlyPlaying = isThisSongActive && isPlaying;

// Card active style — bg-primary/10 per brand tokens
const cardClass = isThisSongActive
  ? 'bg-primary/10 border-primary/20'
  : 'bg-card border-border';
```

### Pattern 5: GSAP ScrambleText with contextSafe

**What:** useGSAP with `scope` for cleanup, `contextSafe` to wrap the mouseenter handler so the tween is tracked by GSAP context and reverted on unmount.

**Critical:** Hover event handlers are created AFTER useGSAP executes. Without `contextSafe`, the scramble tween leaks on unmount.

```typescript
// Source: https://gsap.com/resources/React/
'use client';

import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import { gsap } from '@/lib/gsap-config';  // ScrambleTextPlugin already registered

function LibrarySongCard({ song, ... }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLSpanElement>(null);
  const title = deriveTitle(song.promptText);

  const { contextSafe } = useGSAP({ scope: cardRef });

  const handleMouseEnter = contextSafe(() => {
    if (!titleRef.current) return;
    gsap.to(titleRef.current, {
      duration: 0.75,
      scrambleText: {
        text: title,
        chars: '♪♫♩♬♭♮♯abcdefghijklmnopqrstuvwxyz',
        speed: 0.4,
        revealDelay: 0.1,
      },
    });
  });

  return (
    <div ref={cardRef} onMouseEnter={handleMouseEnter} ...>
      <span ref={titleRef}>{title}</span>
      ...
    </div>
  );
}
```

### Pattern 6: Auto-Advance on Finish

**What:** BottomAudioPlayer already has a `finish` event handler. Extend it to call `skipNext()` from context instead of (or after) `pause()`.

**Critical:** The auto-advance must check that there IS a next track before advancing. At playlist end, just stop.

```typescript
// In BottomAudioPlayer PlayerContent component
const { currentTrack, isPlaying, pause, resume, stop, skipNext, playlist, currentIndex } = useAudioPlayer();

// In the wavesurfer 'finish' event handler (already exists):
const onFinish = () => {
  setCurrentTime(0);
  // Auto-advance if playlist has more entries
  if (playlist.length > 0 && currentIndex < playlist.length - 1) {
    skipNext();  // context sets next track → wavesurfer detects url change → plays
  } else {
    pause();  // end of playlist
  }
};
```

### Recommended File Changes

```
src/contexts/AudioPlayerContext.tsx     — Extend with PlaylistEntry, playlist state, skipNext/skipPrev/setPlaylist
src/components/LibrarySongCard.tsx      — 'use client', play button, active state, GSAP scramble
src/components/LibraryList.tsx          — NEW client wrapper, holds flatPlaylist, renders cards
src/components/layout/BottomAudioPlayer.tsx — Add skip buttons, genre subtitle, variant badge, auto-advance
src/app/library/page.tsx               — Build flatPlaylist, pass to LibraryList instead of mapping cards directly
```

### Anti-Patterns to Avoid

- **Local wavesurfer in LibrarySongCard:** Explicitly forbidden by user decision. Cards are play-request buttons only. All audio lives in BottomAudioPlayer.
- **GSAP in useEffect without contextSafe:** Hover-triggered tweens created outside useGSAP's initial execution are not tracked and will not be cleaned up.
- **Importing gsap directly from 'gsap':** Project decision — always import from `src/lib/gsap-config.ts` to ensure ScrambleTextPlugin is registered.
- **Nested playlist structure `[[v0, v1], [v0, v1]]`:** Skip arithmetic becomes complex. Use flat array.
- **Placing playlist state outside AudioPlayerContext:** Library cards need to set it; BottomAudioPlayer needs to read it. Only the shared context can bridge this.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Audio waveform | Custom canvas renderer | wavesurfer.js (already in BottomAudioPlayer) | Handles WebAudio, cross-browser, theme sync, seek interactions |
| Text scramble animation | Custom setInterval character loop | GSAP ScrambleTextPlugin | Handles reveal timing, refresh rate, word boundaries, cleanup |
| Animation cleanup in React | Manual removeEventListener + kill() in useEffect | useGSAP + contextSafe | GSAP context tracks all tweens; revert() on unmount handles all cleanup |
| Play/pause icon toggle | Custom state | Lucide's Play/Pause icons + isPlaying from context | Already used in BottomAudioPlayer; consistent UX |

---

## Common Pitfalls

### Pitfall 1: AudioPlayerContext Initialization Race

**What goes wrong:** Library card's play() call fires before wavesurfer in BottomAudioPlayer has initialized. The context sets `currentTrack`, BottomAudioPlayer mounts and calls `useWavesurfer({ url: currentTrack.url })`, but if wavesurfer is not yet ready, the `play()` in the `onReady` handler may not fire.

**Why it happens:** The `onReady` handler in BottomAudioPlayer calls `wavesurfer.play()` exactly once on load. If the context track changes very quickly after mount, the ready event may have already fired and been missed.

**How to avoid:** This was pre-identified in STATE.md as a known concern. The existing `onReady` pattern (`wavesurfer.play()` in onReady handler) should handle it correctly because wavesurfer initializes fresh on each URL change. Monitor during integration testing. If race occurs, implement a `pendingPlay` flag in the component that triggers play when ready fires.

**Warning signs:** Track appears in context but audio doesn't start; player shows "not ready" state permanently.

### Pitfall 2: GSAP ScrambleText Without contextSafe

**What goes wrong:** Scramble tweens created in a mouseenter handler inside useGSAP are not tracked by GSAP context. When the component unmounts (user navigates away), the tween continues running against a detached DOM node, causing memory leaks and potential errors.

**Why it happens:** useGSAP only tracks tweens created during its synchronous initial execution. Event handlers run later and bypass context tracking.

**How to avoid:** Always wrap hover handlers with `contextSafe` from the useGSAP return value:
```typescript
const { contextSafe } = useGSAP({ scope: cardRef });
const handleMouseEnter = contextSafe(() => { gsap.to(...) });
```

**Warning signs:** Console warnings about animations on unmounted components; memory growth during library browsing.

### Pitfall 3: PlaylistEntry Has Null URL

**What goes wrong:** Some songs may have failed R2 presigned URL generation (caught with `.catch(() => null)` per Phase 10 pattern). If null-URL entries are included in the flat playlist, skip navigation plays a null-URL track and wavesurfer throws an error.

**Why it happens:** The library page uses `.catch(() => null)` to isolate R2 failures. A song may appear in the library (status=completed) but have a missing R2 key or expired presign.

**How to avoid:** Filter null-URL entries when building the flat playlist:
```typescript
.filter((entry) => entry.url !== null) as PlaylistEntry[]
```
Also defensively check in BottomAudioPlayer: if `currentTrack.url` is null/empty, show an error state instead of crashing wavesurfer.

**Warning signs:** Wavesurfer error event fires; player shows endless "loading" state.

### Pitfall 4: Skip Buttons Active When No Playlist

**What goes wrong:** BottomAudioPlayer skip buttons are visible/enabled even when the player was opened from VariantCard (not from library), where no playlist exists in context.

**Why it happens:** Skip buttons are added to the player bar globally, but playlist context only gets set when library cards are used.

**How to avoid:** Disable/hide skip buttons when `playlist.length === 0`. Check `currentIndex` bounds before enabling skip forward/backward:
```typescript
const canSkipNext = playlist.length > 0 && currentIndex < playlist.length - 1;
const canSkipPrev = playlist.length > 0 && currentIndex > 0;
```

**Warning signs:** Skip buttons visible when playing from homepage VariantCard; clicking skip does nothing or errors.

### Pitfall 5: LibraryList vs LibrarySongCard Client Boundary

**What goes wrong:** If LibrarySongCard is converted to 'use client' directly, and LibraryPage (RSC) tries to pass non-serializable props (like functions), Next.js will throw a serialization error at the RSC → client component boundary.

**Why it happens:** RSC-to-client boundaries can only pass serializable props. Functions (like callbacks) cannot cross the boundary.

**How to avoid:** The library page should pass only serializable data props to LibraryList (a client component). LibraryList builds callbacks internally. The `flatPlaylist` array of plain objects is serializable — functions are not. Do NOT pass play callbacks from the RSC.

**Warning signs:** Next.js build error about non-serializable props; runtime error about passing functions to client components.

### Pitfall 6: GSAP ScrambleText on Mobile

**What goes wrong:** If the scramble animation is wired via `onMouseEnter` without any device detection, it will silently not fire on mobile (no hover), which is correct — but if `useGSAP` scope or `contextSafe` has issues, it may still try to initialize.

**How to avoid:** The mouseenter handler approach naturally works on mobile — no hover means no trigger. No explicit device detection needed. The user decision says "no scramble on mobile" which is achieved automatically via hover-only event binding.

---

## Code Examples

### AudioPlayerContext Extended Reducer

```typescript
// Source: Pattern derived from existing src/contexts/AudioPlayerContext.tsx
// Extended with playlist support

export interface PlaylistEntry {
  url: string;
  title: string;
  genre: string | null;
  variantIndex: number;
  totalVariants: number;
  jobId: string;
  mp3Url: string | null;
  wavUrl: string | null;
}

export interface AudioTrack {
  url: string;
  title: string;
  genre?: string | null;      // NEW
  variantIndex?: number;
  totalVariants?: number;     // NEW
  jobId?: string;
  mp3Url?: string | null;
  wavUrl?: string | null;
}

interface AudioPlayerState {
  currentTrack: AudioTrack | null;
  isPlaying: boolean;
  playlist: PlaylistEntry[];  // NEW
  currentIndex: number;       // NEW — -1 means no playlist context
}

type AudioPlayerAction =
  | { type: 'PLAY'; track: AudioTrack }
  | { type: 'PAUSE' }
  | { type: 'RESUME' }
  | { type: 'STOP' }
  | { type: 'SET_PLAYLIST'; playlist: PlaylistEntry[]; startIndex: number }
  | { type: 'SKIP_NEXT' }
  | { type: 'SKIP_PREV' };

function entryToTrack(entry: PlaylistEntry): AudioTrack {
  return {
    url: entry.url,
    title: entry.title,
    genre: entry.genre,
    variantIndex: entry.variantIndex,
    totalVariants: entry.totalVariants,
    jobId: entry.jobId,
    mp3Url: entry.mp3Url,
    wavUrl: entry.wavUrl,
  };
}
```

### GSAP ScrambleText Hover Animation

```typescript
// Source: https://gsap.com/docs/v3/Plugins/ScrambleTextPlugin/
// Source: https://gsap.com/resources/React/ (contextSafe pattern)

import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import { gsap } from '@/lib/gsap-config'; // ScrambleTextPlugin already registered

const cardRef = useRef<HTMLDivElement>(null);
const titleRef = useRef<HTMLSpanElement>(null);

const { contextSafe } = useGSAP({ scope: cardRef });

const handleMouseEnter = contextSafe(() => {
  if (!titleRef.current) return;
  gsap.to(titleRef.current, {
    duration: 0.75,
    scrambleText: {
      text: title,           // resolve back to the actual title
      chars: '♪♫♩♬♭♮♯abcdefghijklmnopqrstuvwxyz',
      speed: 0.4,
      revealDelay: 0.1,
    },
  });
});
```

### Skip Buttons in BottomAudioPlayer

```typescript
// Source: Pattern derived from existing BottomAudioPlayer.tsx
// lucide-react exports SkipBack and SkipForward

import { SkipBack, SkipForward } from 'lucide-react';

const { skipNext, skipPrev, playlist, currentIndex } = useAudioPlayer();
const canSkipNext = playlist.length > 0 && currentIndex < playlist.length - 1;
const canSkipPrev = playlist.length > 0 && currentIndex > 0;

// Button JSX (between Play and Waveform in desktop layout)
<button
  onClick={skipPrev}
  disabled={!canSkipPrev}
  className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30"
  aria-label="Previous"
>
  <SkipBack className="h-4 w-4" />
</button>

<button
  onClick={skipNext}
  disabled={!canSkipNext}
  className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30"
  aria-label="Next"
>
  <SkipForward className="h-4 w-4" />
</button>
```

### Variant Badge in Player Bar

```typescript
// Source: Pattern from existing BottomAudioPlayer.tsx track info section
{currentTrack?.totalVariants && currentTrack.totalVariants > 1 && (
  <span className="text-xs text-muted-foreground/70 ml-1">
    {(currentTrack.variantIndex ?? 0) + 1}/{currentTrack.totalVariants}
  </span>
)}
```

### Genre Subtitle in Player Bar

```typescript
// Source: Pattern from existing BottomAudioPlayer.tsx track info section
// Replaces the current variantIndex display
<p className="text-sm font-medium text-foreground truncate">{currentTrack?.title}</p>
{currentTrack?.genre && (
  <p className="text-xs text-muted-foreground truncate">{currentTrack.genre}</p>
)}
```

---

## State of the Art

| Old Approach | Current Approach | Notes |
|--------------|------------------|-------|
| useEffect for GSAP animations | useGSAP hook with contextSafe | useGSAP handles revert on unmount; contextSafe required for event-triggered tweens |
| gsap.context() manual setup | useGSAP({ scope: ref }) | scope constrains selector text; contextSafe wraps event handlers |
| ScrambleTextPlugin was Club GSAP | Now free (Webflow acquisition 2024) | No licensing concern; already installed in project |
| Manual playlist management | Flat array in context reducer | Skip arithmetic trivial; auto-advance requires only index increment |

---

## Open Questions

1. **Auto-advance when a variant finishes vs. when the song finishes**
   - What we know: User decided "after both variants of a song finish, automatically start next song." The finish event fires per URL (per track loaded). Since playlist is flat with each variant as its own entry, the finish event naturally advances to the next entry (which may be variant 1 of the same song, or variant 0 of the next song).
   - What's unclear: No ambiguity — flat playlist + skipNext on finish handles this correctly.
   - Recommendation: Confirm in plan that "auto-advance" is handled by `skipNext()` in the finish handler.

2. **SkipBack behavior at currentIndex === 0**
   - What we know: `canSkipPrev` will be false; button disabled.
   - What's unclear: Should skip back at start rewind current track to 0? User decisions don't address this edge case explicitly.
   - Recommendation: When at index 0 with playlist, skip back should seek to start of current track (wavesurfer.seekTo(0)) rather than going to index -1. Implement as: if currentIndex === 0, seek to start; else skip to previous entry.

3. **LibraryList client component granularity**
   - What we know: Library page stays RSC; LibrarySongCard must be 'use client'.
   - What's unclear: Should there be one `LibraryList` client component that renders all cards, or should each card independently call useAudioPlayer?
   - Recommendation: Create `LibraryList` as a client wrapper that builds the flat playlist once and passes `playlist` + `startIndex` as props to each card. This avoids each card independently recomputing the playlist.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.x + @testing-library/react + jsdom |
| Config file | `/Users/deeg/Documents/GitHub/MusicGenerator/vitest.config.ts` |
| Setup file | `src/test-setup.ts` (imports @testing-library/jest-dom) |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| LIB2-04 | Clicking play on card calls context play() with correct track | unit | `npx vitest run src/components/LibrarySongCard.test.tsx` | ✅ (needs extension) |
| LIB2-04 | Active card shows bg-primary/10 when its track is playing | unit | `npx vitest run src/components/LibrarySongCard.test.tsx` | ✅ (needs extension) |
| LIB2-04 | Play button toggles to pause icon when card is active | unit | `npx vitest run src/components/LibrarySongCard.test.tsx` | ✅ (needs extension) |
| LIB2-05 | GSAP scramble tween is created on mouseenter (mock gsap) | unit | `npx vitest run src/components/LibrarySongCard.test.tsx` | ✅ (needs extension) |
| PERS-01 | BottomAudioPlayer renders when currentTrack is set | unit | `npx vitest run src/components/layout/BottomAudioPlayer.test.tsx` | ❌ Wave 0 |
| PERS-02 | Player bar shows track title and genre from context | unit | `npx vitest run src/components/layout/BottomAudioPlayer.test.tsx` | ❌ Wave 0 |
| PERS-03 | Skip next/prev buttons render; disabled when no playlist | unit | `npx vitest run src/components/layout/BottomAudioPlayer.test.tsx` | ❌ Wave 0 |
| PERS-03 | skipNext/skipPrev actions update currentIndex in reducer | unit | `npx vitest run src/contexts/AudioPlayerContext.test.tsx` | ❌ Wave 0 |
| PERS-04 | Waveform container renders (visual — manual verify) | manual | N/A | N/A |
| PERS-05 | Context persists across route changes (AppShell above routes) | unit | `npx vitest run src/components/layout/AppShell.test.tsx` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `npx vitest run src/components/LibrarySongCard.test.tsx src/contexts/AudioPlayerContext.test.tsx`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `src/components/layout/BottomAudioPlayer.test.tsx` — covers PERS-01, PERS-02, PERS-03
- [ ] `src/contexts/AudioPlayerContext.test.tsx` — covers skip action reducer logic, SET_PLAYLIST
- [ ] `src/components/layout/AppShell.test.tsx` — covers PERS-05 (provider wraps children)
- [ ] Mock strategy for wavesurfer in BottomAudioPlayer tests (wavesurfer mocks needed — follow existing WaveformPlayer.test.tsx mock pattern)

---

## Sources

### Primary (HIGH confidence)

- GSAP Official Docs — [ScrambleTextPlugin](https://gsap.com/docs/v3/Plugins/ScrambleTextPlugin/) — chars property, speed, duration, text options
- GSAP Official Docs — [React & GSAP](https://gsap.com/resources/React/) — useGSAP scope, contextSafe pattern for event-triggered animations
- Codebase: `src/contexts/AudioPlayerContext.tsx` — existing reducer shape, AudioTrack type, action union
- Codebase: `src/components/layout/BottomAudioPlayer.tsx` — wavesurfer wiring, finish event, theme sync, existing layout
- Codebase: `src/components/LibrarySongCard.tsx` — current server component structure, props shape
- Codebase: `src/components/VariantCard.tsx` — established pattern for calling AudioPlayerContext.play() from a card
- Codebase: `src/components/layout/AppShell.tsx` — confirms AudioPlayerProvider wraps above routes (PERS-05 already solved architecturally)
- Codebase: `src/lib/gsap-config.ts` — ScrambleTextPlugin already registered; confirmed import path
- Codebase: `package.json` — confirmed all deps installed (gsap 3.14.2, @gsap/react 2.1.2, wavesurfer.js 7.12.1)

### Secondary (MEDIUM confidence)

- [@gsap/react npm](https://www.npmjs.com/package/@gsap/react) — version 2.1.2 confirmed installed
- WebSearch: contextSafe pattern for hover events — verified against official GSAP React docs

### Tertiary (LOW confidence)

- WebSearch: wavesurfer.js finish event reliability — reported working in v7.x; edge case with MediaElement backend (not applicable here, using WebAudio default)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already installed and in use; versions verified from package.json
- Architecture (playlist extension): HIGH — standard React reducer pattern; flat array approach eliminates skip complexity
- GSAP scramble + contextSafe: HIGH — confirmed directly from official GSAP React docs
- Wavesurfer finish/auto-advance: HIGH — existing pattern in BottomAudioPlayer; skip is a context action call
- Pitfalls: HIGH — derived from existing code + official docs (not speculation)

**Research date:** 2026-03-05
**Valid until:** 2026-04-04 (stable libraries, 30-day window)
