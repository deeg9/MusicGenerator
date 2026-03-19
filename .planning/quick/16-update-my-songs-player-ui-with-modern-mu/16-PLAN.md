---
phase: quick-16
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/app/quiz/success/[jobId]/_components/SongPlayer.tsx
  - src/app/dashboard/_components/SongCard.tsx
  - src/app/quiz/success/[jobId]/page.tsx
  - src/app/share/[songId]/page.tsx
  - src/app/quiz/success/[jobId]/page.test.tsx
autonomous: true
requirements: [QUICK-16]

must_haves:
  truths:
    - "SongPlayer displays circular album art placeholder"
    - "Play/pause button animates with framer-motion AnimatePresence"
    - "Progress bar has styled custom thumb and smooth fill"
    - "Song title and artist/recipient name displayed within the player"
    - "All existing functionality preserved: preview mode, seek, analytics"
    - "Download and Share buttons in SongCard remain unchanged"
  artifacts:
    - path: "src/app/quiz/success/[jobId]/_components/SongPlayer.tsx"
      provides: "Modern music player with album art, title, animated controls"
      min_lines: 150
  key_links:
    - from: "src/app/dashboard/_components/SongCard.tsx"
      to: "SongPlayer"
      via: "songTitle and recipientName props"
      pattern: "songTitle=.*recipientName="
    - from: "src/app/quiz/success/[jobId]/page.tsx"
      to: "SongPlayer"
      via: "songTitle and recipientName props"
      pattern: "songTitle=.*recipientName="
---

<objective>
Update SongPlayer component with modern music player design featuring album art, animated play/pause, styled progress bar, and song metadata display. Keep all existing functionality (preview mode, seek, analytics) intact.

Purpose: Dashboard and success page players look basic — modernizing to match premium product feel.
Output: Updated SongPlayer.tsx with new visual design, updated consumer call sites passing new props.
</objective>

<execution_context>
@/Users/deeg/.claude/get-shit-done/workflows/execute-plan.md
@/Users/deeg/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@src/app/quiz/success/[jobId]/_components/SongPlayer.tsx
@src/app/dashboard/_components/SongCard.tsx
@src/app/quiz/success/[jobId]/page.tsx
@src/app/share/[songId]/page.tsx
</context>

<interfaces>
<!-- Current SongPlayer props (will be extended) -->
```typescript
interface SongPlayerProps {
  src: string;
  isPreview?: boolean;
  onPreviewEnd?: () => void;
  songId?: string;
  source?: 'success_page' | 'listen_page' | 'dashboard';
}
```

<!-- SongCard has these values available to pass through -->
```typescript
// In SongCard: displayTitle = title || `A song for ${recipientName}`
// recipientName is always available as a prop
// title is string | null
```

<!-- Success page has song data from quiz state -->
<!-- Share page has song.title and song.recipientName from DB query -->
</interfaces>

<tasks>

<task type="auto">
  <name>Task 1: Redesign SongPlayer with modern music player UI</name>
  <files>src/app/quiz/success/[jobId]/_components/SongPlayer.tsx</files>
  <action>
Extend SongPlayerProps with two new optional props:
- songTitle?: string (displayed as song name)
- recipientName?: string (displayed as "For {recipientName}" subtitle)

Redesign the component layout (keeping ALL existing logic — audio handling, preview mode, seek/drag, analytics tracking, refs, state). New visual structure:

1. **Album art** (left side or top):
   - Circular div, ~80px on mobile / ~96px on desktop
   - Use a gradient placeholder: `bg-gradient-to-br from-primary/30 via-primary/10 to-accent/20` with a music note icon (lucide `Music` icon) centered
   - Optional: wrap in framer-motion `motion.div` with `animate={{ rotate: 360 }}` and `transition={{ duration: 8, repeat: Infinity, ease: "linear" }}` that only spins when `isPlaying` is true (use conditional animation, not mount/unmount)

2. **Song info** (next to album art):
   - Song title: `songTitle || 'Untitled Song'` in `font-display text-base font-semibold text-foreground truncate`
   - Recipient: `recipientName ? \`For ${recipientName}\` : ''` in `text-sm text-muted-foreground truncate`
   - Only render the info block if songTitle or recipientName is provided

3. **Play/Pause button** — replace the plain button with framer-motion AnimatePresence:
   ```tsx
   <button onClick={handlePlayPause} aria-label={isPlaying ? 'Pause' : 'Play'}
     className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md hover:scale-105 transition-transform">
     <AnimatePresence mode="wait" initial={false}>
       <motion.div
         key={isPlaying ? 'pause' : 'play'}
         initial={{ scale: 0, opacity: 0 }}
         animate={{ scale: 1, opacity: 1 }}
         exit={{ scale: 0, opacity: 0 }}
         transition={{ duration: 0.15 }}
       >
         {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
       </motion.div>
     </AnimatePresence>
   </button>
   ```

4. **Progress bar** — restyle with better visual treatment:
   - Track: `h-1.5 bg-muted/60 rounded-full` (thinner, subtler)
   - Fill: `bg-primary rounded-full` with a subtle glow: add `shadow-[0_0_6px_rgba(var(--primary-rgb),0.3)]` or just keep it clean
   - Thumb: `w-3.5 h-3.5 rounded-full bg-primary ring-2 ring-white shadow-md` — always visible when hovering or dragging, hidden otherwise
   - Keep all existing mouse/touch drag handlers exactly as-is

5. **Layout**: Use a horizontal layout on larger screens:
   ```
   [Album Art] [Title/Artist + Play Button]
   [────────── Progress Bar ──────────────]
   [  0:15                           1:30  ]
   ```
   Container: `flex flex-col gap-4` wrapping a `flex items-center gap-4` row for art + info + play, then progress below.

6. **Preserve entirely without modification**:
   - `<audio>` element and ref
   - All useEffect hooks (timeupdate, loadedmetadata, ended, canplay)
   - handlePlayPause logic (preview reset, analytics tracking)
   - handleMouseDown / handleTouchStart / handleDragStart / seekTo / getTimeFromX
   - progressPercent calculation
   - Preview ended gradient overlay
   - PREVIEW_LIMIT_S constant
   - formatTime utility

Import `motion, AnimatePresence` from `framer-motion` and `Music` from `lucide-react`.
  </action>
  <verify>
    <automated>cd /Users/deeg/Documents/GitHub/MusicGenerator && npx tsc --noEmit src/app/quiz/success/\[jobId\]/_components/SongPlayer.tsx 2>&1 | head -20</automated>
  </verify>
  <done>SongPlayer renders with circular album art placeholder, animated play/pause, styled progress bar, and optional song title/recipient display. All existing audio logic, preview mode, seek, and analytics unchanged.</done>
</task>

<task type="auto">
  <name>Task 2: Update all SongPlayer consumers to pass new props</name>
  <files>src/app/dashboard/_components/SongCard.tsx, src/app/quiz/success/[jobId]/page.tsx, src/app/share/[songId]/page.tsx, src/app/quiz/success/[jobId]/page.test.tsx</files>
  <action>
Update each SongPlayer call site to pass `songTitle` and `recipientName`:

**SongCard.tsx** (line ~364):
```tsx
<SongPlayer
  src={audioUrl}
  isPreview={!showFull}
  songTitle={displayTitle}
  recipientName={recipientName}
/>
```
`displayTitle` and `recipientName` are already in scope — no new data needed.

**success/[jobId]/page.tsx** (line ~561):
The success page has quiz state. Find where `recipientName` and song title are available in the component. Look for variables like `songTitle`, `recipientName`, `quizData.recipientName`, etc. Pass them:
```tsx
<SongPlayer
  src={audioUrl}
  isPreview={isPreview}
  onPreviewEnd={() => setPreviewEnded(true)}
  songId={songId}
  source="success_page"
  songTitle={songTitle}           // from page state/data
  recipientName={recipientName}   // from page state/data
/>
```
If the variable names differ, find the correct ones from the page component's state/props. The page definitely has these values since it displays them elsewhere on the page.

**share/[songId]/page.tsx** (line ~85):
The share page loads song data from DB. Find the song object (likely `song.title` and `song.recipientName` or similar). Pass:
```tsx
<SongPlayer
  src={audioUrl}
  isPreview={false}
  songTitle={song.title || undefined}
  recipientName={song.recipientName}
/>
```
Adapt variable names to match what the page actually uses.

**page.test.tsx** (line ~37-38):
Update the SongPlayer mock to accept the new optional props without breaking:
```tsx
vi.mock('./_components/SongPlayer', () => ({
  SongPlayer: ({ src, songTitle, recipientName }: { src: string; songTitle?: string; recipientName?: string }) => (
    <audio data-testid="song-player" src={src} data-title={songTitle} data-recipient={recipientName} />
  ),
}));
```
  </action>
  <verify>
    <automated>cd /Users/deeg/Documents/GitHub/MusicGenerator && npx tsc --noEmit 2>&1 | tail -5</automated>
  </verify>
  <done>All three SongPlayer consumer sites pass songTitle and recipientName. TypeScript compiles clean. Existing test mock updated to accept new props.</done>
</task>

</tasks>

<verification>
- `npx tsc --noEmit` passes with zero errors
- `npx vitest run src/app/quiz/success/[jobId]/page.test.tsx` passes
- Visual check: run `npm run dev`, navigate to /dashboard, confirm player shows album art circle, song title, recipient name, animated play/pause
</verification>

<success_criteria>
- SongPlayer displays circular album art placeholder with gradient/music-note
- Album art optionally rotates when playing (framer-motion)
- Play/pause button has AnimatePresence scale animation on toggle
- Progress bar has refined styling with hover/drag thumb
- Song title and "For {recipient}" shown within the player when props provided
- All existing features work: preview 30s limit, seek bar drag, analytics tracking
- Download/Share buttons in SongCard unaffected
- TypeScript compiles, existing tests pass
</success_criteria>

<output>
After completion, create `.planning/quick/16-update-my-songs-player-ui-with-modern-mu/16-SUMMARY.md`
</output>
