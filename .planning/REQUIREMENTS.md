# Requirements: MusicGenerator

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
- [ ] **BRAND-02**: Typography uses Bricolage Grotesque for headings and Figtree for body text, loaded via next/font
- [x] **BRAND-03**: Spacing, border-radius, and shadow tokens are defined in the Tailwind v4 @theme system
- [x] **BRAND-04**: User can toggle between light and dark mode, with preference persisted and no FOUC on reload

### Component Redesign

- [ ] **COMP-01**: Hero section reflects the warm brand with updated colors, typography, and layout
- [ ] **COMP-02**: Generation form (inputs, buttons, mode toggle, tags) uses brand tokens throughout
- [ ] **COMP-03**: Loading animation and error banners use brand colors and feel cohesive with the new design
- [ ] **COMP-04**: Waveform player and result cards use brand accent colors, updating dynamically on theme switch
- [ ] **COMP-05**: Example cards use brand styling with warm card backgrounds and updated typography

### New Components

- [ ] **NEW-01**: Typewriter component replaced with danielpetho's Framer Motion typewriter (configurable speed, cursor animation)
- [ ] **NEW-02**: Stacked circular footer with navigation links, social icons, and email subscription form
- [ ] **NEW-03**: A /style-guide dev page displays all brand colors, typography, spacing, and component variants

## v2 Requirements

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

### Social & Library

- **LIB-01**: User can view generation history (prompt metadata, not audio files)
- **LIB-02**: User can share a song via short-lived link (48h expiry)
- **SOCL-01**: User can explore publicly shared songs

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Mobile apps | Web-first; responsive web works on mobile browsers |
| Song library with audio storage | Requires S3/CDN infrastructure; doubles scope |
| Remixing / repaint tools | ACE-Step supports it but requires complex UI; v2+ |
| Stem extraction (vocals, drums, bass) | Base model only (not turbo), slower, specialist UI |
| LoRA style personalization | Training pipeline + per-user model storage; massive lift |
| Admin dashboard | Manual DB queries + direct access sufficient for prototype |
| Real-time streaming playback | ACE-Step is async poll-based; turbo is fast enough (<10s) |
| Song versioning / history with audio | Storage costs; direct-download flow sufficient |

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
| BRAND-02 | Phase 5 | Pending |
| BRAND-03 | Phase 5 | Complete |
| BRAND-04 | Phase 5 | Complete |
| COMP-01 | Phase 6 | Pending |
| COMP-02 | Phase 6 | Pending |
| COMP-03 | Phase 6 | Pending |
| COMP-04 | Phase 6 | Pending |
| COMP-05 | Phase 6 | Pending |
| NEW-01 | Phase 7 | Pending |
| NEW-02 | Phase 8 | Pending |
| NEW-03 | Phase 8 | Pending |

**Coverage:**
- v1.0 requirements: 15 total (all complete)
- v1.1 requirements: 12 total (all mapped)
- Mapped to phases: 15 (v1.0) + 12 (v1.1)
- Unmapped: 0

---
*Requirements defined: 2026-03-03*
*Last updated: 2026-03-05 after v1.1 roadmap creation*
