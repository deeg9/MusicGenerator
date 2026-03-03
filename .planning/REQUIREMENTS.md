# Requirements: MusicGenerator

**Defined:** 2026-03-03
**Core Value:** Anyone can create a unique, personal song in seconds — no musical skill required.

## v1.0 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Generation

- [ ] **GEN-01**: User can generate a song by describing a vibe in plain text
- [ ] **GEN-02**: User can generate a song by providing custom lyrics with structure tags ([Verse], [Chorus], [Bridge])
- [ ] **GEN-03**: User can specify genre/style via freeform tags (e.g., "jazz", "hip-hop", "cinematic")
- [ ] **GEN-04**: User can choose song duration (Short ~1min, Standard ~2min, Full ~4min)
- [ ] **GEN-05**: User can toggle instrumental mode (no vocals)
- [ ] **GEN-06**: User receives 2 song variants per generation (dual output)

### Playback

- [ ] **PLAY-01**: User can play/pause/seek generated songs in-browser with waveform visualization
- [ ] **PLAY-02**: User can download songs as MP3
- [ ] **PLAY-03**: User can download songs as WAV

### Infrastructure

- [ ] **INFRA-01**: ACE-Step 1.5 turbo model runs on RunPod GPU with restart policy for memory leak mitigation
- [ ] **INFRA-02**: Next.js frontend communicates with ACE-Step via async polling (submit → poll → retrieve)
- [ ] **INFRA-03**: Generation errors display clearly with retry option

### UX

- [ ] **UX-01**: User sees a clear loading state during song generation (animated placeholder, not just a spinner)
- [ ] **UX-02**: User can switch between Simple mode (text prompt) and Custom mode (lyrics + style)
- [ ] **UX-03**: Landing page with examples and clear call-to-action to generate

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
| GEN-01 | — | Pending |
| GEN-02 | — | Pending |
| GEN-03 | — | Pending |
| GEN-04 | — | Pending |
| GEN-05 | — | Pending |
| GEN-06 | — | Pending |
| PLAY-01 | — | Pending |
| PLAY-02 | — | Pending |
| PLAY-03 | — | Pending |
| INFRA-01 | — | Pending |
| INFRA-02 | — | Pending |
| INFRA-03 | — | Pending |
| UX-01 | — | Pending |
| UX-02 | — | Pending |
| UX-03 | — | Pending |

**Coverage:**
- v1.0 requirements: 15 total
- Mapped to phases: 0
- Unmapped: 15 ⚠️

---
*Requirements defined: 2026-03-03*
*Last updated: 2026-03-03 after initial definition*
