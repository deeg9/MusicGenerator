# Notevra

## What This Is

Notevra — a personalized song gift service where people answer a guided quiz about their loved ones, and instantly receive a unique AI-generated song. Users describe the relationship, pick a genre, share qualities, memories, and a heartfelt message — then get a downloadable song in seconds. The emotional gift they'll never forget.

## Core Value

Anyone can create a deeply personal, one-of-a-kind song for someone they love — in seconds, no musical skill required.

## Requirements

### Validated

- ✓ Text-to-music generation via ACE-Step 1.5 (text prompt + custom lyrics) — v1.0
- ✓ Genre/style tags, duration presets, instrumental toggle — v1.0
- ✓ Dual variant generation (batch_size=2) — v1.0
- ✓ Waveform playback (wavesurfer.js) + MP3/WAV download — v1.0
- ✓ Async polling infrastructure (RunPod + ACE-Step API) — v1.0
- ✓ Emotional landing page (hero, video, testimonials, social proof, CTAs) — v3.0
- ✓ 6-step quiz funnel with Zod validation and animated transitions — v3.0
- ✓ Quiz-to-prompt conversion (quiz answers → HeartMuLa generation prompt) — v3.0
- ✓ Instant generation after quiz completion (batch_size=1) — v3.0
- ✓ Success page with confetti, song playback, download, and sharing prompt — v3.0
- ✓ Warm baby blue/yellow OKLCH visual identity (DM Sans + Libre Baskerville) — v3.0
- ✓ Brand rename to Notevra throughout — v3.0

### Active

- [ ] Supabase Auth (sign up, login, password reset, session management)
- [ ] Auth prompt on success page (sign up to save song)
- [ ] Song-to-user association (link generated songs to user accounts)
- [ ] Resend email: song-ready notification to creator
- [ ] Resend email: gift delivery to recipient
- [ ] Recipient email capture on success page
- [ ] Song dashboard (list past songs, playback, re-download)

#### Deferred to future milestone
- Payment/checkout via Stripe
- Analytics/conversion tracking
- Admin dashboard for order management
- Legal pages (Contact, Privacy Policy, Terms of Service) — v4.1 deferred

### Out of Scope

- Dark mode — warm light aesthetic is the brand direction
- Song library / saved songs — songs are one-time gift deliveries
- Sidebar layout — replaced by simple header nav for gift funnel
- Two song variants — single song for cleaner gift experience
- Mobile app — web-first, PWA later
- Remixing / editing tools — adds complexity, not core to gift service
- Social features — not core to gift value

## Current Milestone: v4.2 Auth & Email Delivery

**Goal:** Add Supabase Auth for user accounts and Resend email delivery so creators can save songs and send them as gifts to recipients.

**Target features:**
- Full Supabase Auth (email+password sign up, login, password reset)
- Auth prompt on success page after generation (quiz stays public)
- Resend email: song-ready link to creator
- Resend email: gift delivery to recipient (email entered on success page)
- Song dashboard for signed-in users (past songs with playback + re-download)

## Context

- **Shipped v3.0:** Complete pivot from self-service AI tool to Notevra gift funnel
- **Tech stack:** Next.js App Router, ACE-Step 1.5 on RunPod, Cloudflare R2
- **Codebase:** 4,526 LOC TypeScript across 17 phases (v1.0–v3.0)
- **Generation time:** ~7 seconds for 30s tracks — instant delivery vs human-made services
- **Visual identity:** Baby blue primary + mellow yellow secondary on cloud white. DM Sans body + Libre Baskerville headings.
- **Current flow:** Landing page → 6-step quiz → instant generation → success page with confetti + playback + download
- **Pod migration:** Moved from RTX 4090 (zwysa4aou3a8it) to A40 (96y089egxk3xm5)

## Constraints

- **Tech stack**: Next.js App Router, ACE-Step 1.5 REST API on RunPod, Cloudflare R2
- **Infrastructure**: RunPod A40 Pod (96y089egxk3xm5), existing R2 bucket
- **No payments yet**: Free generation — monetize after UX validation

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| ACE-Step 1.5 as generation model | Open source (MIT), commercial-ready, fast, low VRAM, quality comparable to Suno | ✓ Good |
| Next.js + React frontend | User preference, strong ecosystem, SSR for SEO | ✓ Good |
| RunPod Persistent Pod | Zero cold start for instant generation UX | ✓ Good |
| Cloudflare R2 for audio storage | Zero egress fees, S3-compatible, presigned URLs | ✓ Good |
| Product pivot to gift funnel | Self-service → personalized gift service. Clearer value proposition. | ✓ Good — full funnel shipped |
| Instant AI delivery | Generate in seconds, not days. Speed differentiator. | ✓ Good — ~7s end-to-end |
| Warm light visual identity | Baby blue + yellow, friendly/emotional. Fits gift positioning. | ✓ Good — cohesive brand |
| Brand rename to Notevra | Distinctive name for the gift service brand | ✓ Good |
| Free generation first | Validate funnel UX before adding monetization complexity | ✓ Good — funnel complete |
| Single song (batch_size=1) | Cleaner gift experience, no decision paralysis | ✓ Good |
| OKLCH color tokens | Future-proof, wide gamut, perceptually uniform | ✓ Good |
| Zod co-located schemas | Per-step validation co-located with step components | ✓ Good |
| localStorage quiz persistence | Versioned key (notevra_quiz_v1), SSR-safe try/catch | ✓ Good |
| Native audio over wavesurfer | Simpler, lighter for single-song success page playback | ✓ Good |
| canvas-confetti | Appends own canvas to body, zero-config celebration effect | ✓ Good |
| A40 pod migration | Migrated from RTX 4090 to A40 for v4.0 testing | — Pending |

---
*Last updated: 2026-03-06 after v4.2 milestone start*
