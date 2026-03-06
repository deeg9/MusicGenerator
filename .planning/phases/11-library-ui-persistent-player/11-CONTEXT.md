# Phase 11: Library UI + Persistent Player - Context

**Gathered:** 2026-03-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Library songs become playable from cards that delegate audio to the persistent bottom player. The player bar is visible across all pages when a track is active and continues playing across navigation. GSAP scramble text animates card titles on hover. No new routes, no new data fetching — this phase adds interactivity and playback to the existing library data layer (Phase 10) and enhances the existing BottomAudioPlayer (Phase 3/6).

</domain>

<decisions>
## Implementation Decisions

### Library card play interaction
- Always-visible play button on each library card (left side of card)
- Play button toggles to pause icon when that card's track is actively playing
- Clicking play on a card calls AudioPlayerContext.play() — no local wavesurfer in cards
- Active (currently-playing) card gets a subtle primary/amber tinted background to distinguish from other cards
- On mobile: same always-visible play button (no hover-dependent behavior)
- Convert LibrarySongCard from server component to client component ('use client') — simpler than wrapper pattern, library page itself stays RSC

### Player bar enhancements
- Skip forward/backward = next/previous song in the library list (playlist-aware, not time-seek)
- AudioPlayerContext needs a playlist/queue concept — library page sets the playlist, skip navigates it
- Player bar subtitle: genre tags as plain comma-separated text (not pills), replacing current variant display
- Always show genre text in player bar (for both library songs and generation results)
- Keep existing full interactive waveform in BottomAudioPlayer — already satisfies "mini waveform visualization" requirement
- Existing volume, download, close controls remain unchanged

### Variant handling
- Auto-play first variant (variant 0) when user clicks play on a library card
- Skip forward cycles: variant 0 → variant 1 → next song's variant 0 → next song's variant 1 → ...
- Skip backward reverses: goes to previous variant, then previous song's last variant
- Continuous auto-advance: after both variants of a song finish, automatically start next song in library
- Subtle variant indicator in player bar: small "1/2" or "2/2" badge near the title
- Library playlist order matches library display order (newest-first)

### GSAP scramble text
- Scramble animation on card title text only (genre pills stay static)
- Custom character set: music symbols (♪ ♫ ♩ ♬ ♭ ♮ ♯) mixed with random letters
- Medium speed: 0.7-0.8 second duration for the scramble-to-resolve animation
- Triggers on every mouse enter (not once-per-session)
- Uses useGSAP hook with scope for proper cleanup
- Import gsap from src/lib/gsap-config.ts (centralized, ScrambleTextPlugin already registered)
- No scramble on mobile (no hover) — title displays normally

</decisions>

<specifics>
## Specific Ideas

- Library cards follow Suno's library pattern — clean horizontal rows with play button
- Active track highlight should feel like a "now playing" indicator, not just a selection state
- Scramble text with music symbols reinforces the music app identity — ♪ characters cycling before resolving to the song title
- Playlist skip behavior treats each generation's 2 variants as a mini-album within the library playlist

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `AudioPlayerContext` (`src/contexts/AudioPlayerContext.tsx`): Has play/pause/resume/stop actions with AudioTrack type (url, title, variantIndex, jobId, mp3Url, wavUrl). Needs playlist/queue extension for skip support.
- `BottomAudioPlayer` (`src/components/layout/BottomAudioPlayer.tsx`): Full player with wavesurfer, volume, download, close. Shows track title + variant subtitle. Needs: genre field in AudioTrack, skip controls, variant indicator.
- `LibrarySongCard` (`src/components/LibrarySongCard.tsx`): Pure display card with title, genre pills, duration, date. Currently server component — needs 'use client' + play button + active state + GSAP scramble.
- `AppShell` (`src/components/layout/AppShell.tsx`): Wraps app in AudioPlayerProvider + SidebarProvider. BottomAudioPlayer already rendered here — cross-route persistence is architecturally in place.
- `gsap-config.ts` (`src/lib/gsap-config.ts`): ScrambleTextPlugin registered and exported. Ready for use.
- `WaveformPlayer` (`src/components/WaveformPlayer.tsx`): Has visual-only mode with onRequestPlay callback — not needed for library cards (they use AudioPlayerContext directly).

### Established Patterns
- AudioPlayerProvider wraps the entire app via AppShell — state persists across route changes
- BottomAudioPlayer uses wavesurfer with theme sync via getCssColorAsHex + setOptions()
- Brand tokens: `bg-primary/10` for active states, `text-muted-foreground` for secondary text
- Framer Motion AnimatePresence for player bar show/hide animation
- `useGSAP` hook from @gsap/react for GSAP animation lifecycle management

### Integration Points
- `src/app/library/page.tsx`: RSC page passes song data to LibrarySongCard — will pass playbackUrls to client cards
- `src/contexts/AudioPlayerContext.tsx`: Needs playlist array, skipNext/skipPrev actions, genre field on AudioTrack
- `src/components/layout/BottomAudioPlayer.tsx`: Needs skip buttons, genre subtitle, variant badge
- `src/components/LibrarySongCard.tsx`: Needs 'use client', play button, active state, GSAP scramble

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 11-library-ui-persistent-player*
*Context gathered: 2026-03-05*
