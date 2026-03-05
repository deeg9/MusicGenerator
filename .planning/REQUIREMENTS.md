# Requirements: Notera (MusicGenerator)

**Defined:** 2026-03-03
**Core Value:** Anyone can create a unique, personal song in seconds — no musical skill required.

## v1.0 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Generation

- [x] **GEN-01**: User can generate a song by describing a vibe in plain text
- [x] **GEN-02**: User can generate a song by providing custom lyrics with structure tags ([Verse], [Chorus], [Bridge])
- [x] **GEN-03**: User can specify genre/style via freeform tags (e.g., "jazz", "hip-hop", "cinematic")
- [x] **GEN-04**: User can choose song duration (Short ~1min, Standard ~2min, Full ~4min)
- [x] **GEN-05**: User can toggle instrumental mode (no vocals)
- [x] **GEN-06**: User receives 2 song variants per generation (dual output)

### Playback

- [x] **PLAY-01**: User can play/pause/seek generated songs in-browser with waveform visualization
- [x] **PLAY-02**: User can download songs as MP3
- [x] **PLAY-03**: User can download songs as WAV

### Infrastructure

- [x] **INFRA-01**: ACE-Step 1.5 turbo model runs on RunPod GPU with restart policy for memory leak mitigation
- [x] **INFRA-02**: Next.js frontend communicates with ACE-Step via async polling (submit → poll → retrieve)
- [x] **INFRA-03**: Generation errors display clearly with retry option

### UX

- [x] **UX-01**: User sees a clear loading state during song generation (animated placeholder, not just a spinner)
- [x] **UX-02**: User can switch between Simple mode (text prompt) and Custom mode (lyrics + style)
- [x] **UX-03**: Landing page with examples and clear call-to-action to generate

## v1.1 Requirements

Requirements for brand redesign milestone. Each maps to roadmap phases.

### Brand Tokens

- [x] **BRAND-01**: Design tokens define a warm color palette (cream, amber, sky-blue) in OKLCH format with light and dark mode variants
- [x] **BRAND-02**: Typography uses Bricolage Grotesque for headings and Figtree for body text, loaded via next/font
- [x] **BRAND-03**: Spacing, border-radius, and shadow tokens are defined in the Tailwind v4 @theme system
- [x] **BRAND-04**: User can toggle between light and dark mode, with preference persisted and no FOUC on reload

### Component Redesign

- [x] **COMP-01**: Hero section reflects the warm brand with updated colors, typography, and layout
- [x] **COMP-02**: Generation form (inputs, buttons, mode toggle, tags) uses brand tokens throughout
- [x] **COMP-03**: Loading animation and error banners use brand colors and feel cohesive with the new design
- [x] **COMP-04**: Waveform player and result cards use brand accent colors, updating dynamically on theme switch
- [x] **COMP-05**: Example cards use brand styling with warm card backgrounds and updated typography

### New Components

- [x] **NEW-01**: Typewriter component replaced with danielpetho's Framer Motion typewriter (configurable speed, cursor animation)
- [x] **NEW-02**: Stacked circular footer with navigation links, social icons, and email subscription form
- [x] **NEW-03**: A /style-guide dev page displays all brand colors, typography, spacing, and component variants

## v2.0 Requirements

Requirements for Suno-Style UX Overhaul. Each maps to roadmap phases.

### Homepage & Workspace

- [ ] **HOME-01**: User sees a clean centered headline and prompt input box on the homepage
- [ ] **HOME-02**: User can type a song description in the prompt box and click Create to start generation
- [ ] **HOME-03**: Homepage transforms in-place to a two-panel workspace (form left, results right) after clicking Create
- [ ] **HOME-04**: Two-panel workspace layout is responsive (stacks vertically on mobile)
- [ ] **HOME-05**: Workspace state is reflected in URL (`?mode=create`) so it survives page refresh
- [ ] **HOME-06**: Transition from homepage to workspace is animated (Framer Motion layout)

### Library

- [ ] **LIB2-01**: User can navigate to /library page from the sidebar
- [ ] **LIB2-02**: Library page displays all previously generated songs as browsable cards
- [ ] **LIB2-03**: Each library card shows song title, genre/style, duration, and generation date
- [ ] **LIB2-04**: User can play a song directly from a library card (triggers persistent player)
- [ ] **LIB2-05**: Library cards have GSAP scramble text hover animation on title/genre
- [ ] **LIB2-06**: Library page shows an empty state when no songs have been generated

### Persistent Player

- [ ] **PERS-01**: Fixed bottom audio player bar is visible across all pages when a track is playing
- [ ] **PERS-02**: Player bar shows current track title, artist/genre, and playback progress
- [ ] **PERS-03**: Player bar has play/pause, skip forward, and skip backward controls
- [ ] **PERS-04**: Player bar displays a mini waveform visualization of the current track
- [ ] **PERS-05**: Player bar persists across page navigation (home ↔ library) without interrupting playback

### Bug Fixes & Prerequisites

- [ ] **FIX-01**: Fix GenerationPage useEffect missing dependency array (performance leak)
- [ ] **FIX-02**: Install gsap + @gsap/react dependencies
- [ ] **FIX-03**: Create centralized gsap-config.ts with "use client" boundary

## v3.0 Requirements

Deferred to future milestone. Tracked but not in current roadmap.

### Authentication & Accounts

- **AUTH-01**: User can sign up with email and Google OAuth
- **AUTH-02**: User session persists across browser refresh

### Credits & Billing

- **CRED-01**: User receives daily free credits (10/day, refreshed at midnight UTC)
- **CRED-02**: User can see credit balance in header
- **CRED-03**: User can subscribe to paid tier via Stripe ($8-10/mo Pro, $24-30/mo Premier)
- **CRED-04**: Credits deducted atomically at generation submission, refunded on failure
- **CRED-05**: Upgrade CTA shown when credits are low or exhausted

### Discovery & Social

- **DISC-01**: Homepage "For You" section showing recommended/trending songs
- **DISC-02**: Homepage "For Every Mood" section with genre/mood browse cards
- **DISC-03**: Search page for finding songs across the platform
- **SOCL-01**: User can share generated songs via link
- **SOCL-02**: User can favorite/like songs in library
- **SOCL-03**: Public profile page showing user's published songs

### Advanced Playback

- **ADVP-01**: Queue management (add to queue, reorder)
- **ADVP-02**: Shuffle and repeat modes
- **ADVP-03**: Volume control in persistent player

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Separate /create route | Decision: same-page transformation, not a new route |
| Mobile apps | Web-first; responsive web works on mobile browsers |
| Song editing/remixing | ACE-Step supports it but requires complex UI; v3+ |
| Stem extraction | Base model only (not turbo), slower, specialist UI |
| LoRA style personalization | Training pipeline + per-user model storage; massive lift |
| Admin dashboard | Manual DB queries sufficient for prototype |
| Real-time streaming | ACE-Step is async poll-based; turbo is fast enough (<10s) |
| Playlist creation | Requires auth + social features, defer to v3+ |
| Cover art generation | Advanced feature, not core to UX overhaul |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| GEN-01 | Phase 2 | Complete |
| GEN-02 | Phase 2 | Complete |
| GEN-03 | Phase 2 | Complete |
| GEN-04 | Phase 2 | Complete |
| GEN-05 | Phase 2 | Complete |
| GEN-06 | Phase 2 | Complete |
| PLAY-01 | Phase 3 | Complete |
| PLAY-02 | Phase 3 | Complete |
| PLAY-03 | Phase 3 | Complete |
| INFRA-01 | Phase 1 | Complete |
| INFRA-02 | Phase 1 | Complete |
| INFRA-03 | Phase 1 | Complete |
| UX-01 | Phase 4 | Complete |
| UX-02 | Phase 4 | Complete |
| UX-03 | Phase 4 | Complete |
| BRAND-01 | Phase 5 | Complete |
| BRAND-02 | Phase 5 | Complete |
| BRAND-03 | Phase 5 | Complete |
| BRAND-04 | Phase 5 | Complete |
| COMP-01 | Phase 6 | Complete |
| COMP-02 | Phase 6 | Complete |
| COMP-03 | Phase 6 | Complete |
| COMP-04 | Phase 6 | Complete |
| COMP-05 | Phase 6 | Complete |
| NEW-01 | Phase 7 | Complete |
| NEW-02 | Phase 8 | Complete |
| NEW-03 | Phase 8 | Complete |
| FIX-01 | Phase 9 | Pending |
| FIX-02 | Phase 9 | Pending |
| FIX-03 | Phase 9 | Pending |
| LIB2-01 | Phase 9 | Pending |
| LIB2-02 | Phase 10 | Pending |
| LIB2-03 | Phase 10 | Pending |
| LIB2-06 | Phase 10 | Pending |
| LIB2-04 | Phase 11 | Pending |
| LIB2-05 | Phase 11 | Pending |
| PERS-01 | Phase 11 | Pending |
| PERS-02 | Phase 11 | Pending |
| PERS-03 | Phase 11 | Pending |
| PERS-04 | Phase 11 | Pending |
| PERS-05 | Phase 11 | Pending |
| HOME-01 | Phase 12 | Pending |
| HOME-02 | Phase 12 | Pending |
| HOME-03 | Phase 12 | Pending |
| HOME-04 | Phase 12 | Pending |
| HOME-05 | Phase 12 | Pending |
| HOME-06 | Phase 12 | Pending |

**Coverage:**
- v1.0 requirements: 15 total (all complete)
- v1.1 requirements: 12 total (all complete)
- v2.0 requirements: 20 total (all pending, mapped to phases 9-12)
- Unmapped: 0

---
*Requirements defined: 2026-03-03*
*Last updated: 2026-03-05 after v2.0 roadmap creation*
