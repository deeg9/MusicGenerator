# Feature Research

**Domain:** AI Music Generation SaaS (text-to-music, freemium, consumer web app)
**Researched:** 2026-03-03
**Confidence:** HIGH (competitor analysis from live products) / MEDIUM (ACE-Step-specific behavior from docs)

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Text prompt input (free-form description) | Established by Suno, Udio — users expect to type a vibe and get music | LOW | Single textarea; ACE-Step `caption` field maps directly |
| Custom lyrics input | Core differentiator users cite; Udio and Suno both support it; target users ("birthday song") want custom lyrics | LOW | ACE-Step accepts `lyrics` param with `[Verse]`/`[Chorus]` structural tags |
| Genre/style tags | Users expect to type or select "jazz", "hip-hop", "cinematic" — ACE-Step caption includes style | LOW | Implement as freeform tag chips or prepopulated suggestions, not a locked dropdown |
| In-browser audio playback | Without this the product is broken — users need to hear before downloading | MEDIUM | Use wavesurfer.js + `@wavesurfer/react`; renders waveform + seekable playback; handles ACE-Step MP3/WAV/FLAC output |
| Waveform visualization | Suno, Udio both show visual waveform during playback; users expect it — plain HTML audio element feels low-quality | MEDIUM | wavesurfer.js supports pre-decoded peaks for large files; compute peaks server-side for performance |
| Play / Pause / Seek controls | Minimum viable player controls; anything less is broken | LOW | Included in wavesurfer.js out of the box |
| Song download (MP3) | Core value delivery — if users can't keep the song, the app has no lasting value | LOW | ACE-Step outputs MP3/WAV/FLAC; expose as signed URL download; MP3 is default expectation, WAV for paid tiers |
| User signup / login | Required for credits, saved songs, and commercial licensing attribution | MEDIUM | Auth is table stakes even at prototype scale; use NextAuth or Clerk with email + social (Google) |
| Credit balance display | Users need to know how many generations they have left; missing this causes confusion and abandonment | LOW | Show in nav/header; update optimistically on generation |
| Generation loading state | 30–60 second generation times require clear feedback; spinner alone is not sufficient | MEDIUM | Show animated placeholder waveform or progress indicator; ACE-Step API is async poll-based (submit → poll `/query_result`) |
| Error state / retry | Generation can fail (GPU timeout, bad prompt); users need a clear error and retry path | LOW | Show error inline; do NOT silently deduct credits on failure |
| Free tier (no credit card required) | Without a free tier, Suno/Udio alternatives win by default; users try before buying | LOW | Daily refresh model (Suno: 50 credits/day ≈ 10 songs) is proven; implement as a DB reset via cron |

### Differentiators (Competitive Advantage)

Features that set the product apart. Not required, but valuable.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Dual variant generation | Suno generates 2 versions per prompt; users pick the better one; reduces re-generation frustration | MEDIUM | ACE-Step supports `batch_size` up to 8; ship 2 variants; costs 2x credits but dramatically improves perceived quality; show as side-by-side cards |
| Instrumental toggle | Many users want background music without vocals; quick toggle distinguishes you from "song only" tools | LOW | ACE-Step: pass empty `lyrics` field or include `[instrumental]` tag in lyrics; confirm via testing |
| Song section structure tags | Letting users write `[Verse]`, `[Chorus]`, `[Bridge]` in lyrics gives power users control competitors require expertise to unlock | LOW | Map directly to ACE-Step lyrics field; surface as in-UI guide/tooltip explaining the syntax |
| Duration control (short vs full song) | Different use cases: 30-second ringtone, 2-minute birthday clip, full 4-minute song | LOW | ACE-Step accepts duration in seconds (10–600s); expose as slider or preset buttons (Short / Standard / Full) |
| Language selection for lyrics | ACE-Step supports 50+ languages; niche but powerful for non-English markets | LOW | Pass language hint in caption; surface as optional dropdown; default to "Auto-detect" |
| WAV download for paid tiers | Free users get MP3; paid users get WAV (higher quality, expected by creators) | LOW | ACE-Step outputs WAV natively; gate format behind subscription check |
| Commercial license with paid tier | Without this, users can't monetize songs — kills use for content creators, musicians | LOW | Implement via terms of service; no technical complexity; follow Suno model exactly: free = non-commercial, paid = commercial rights |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Song library / saved songs (v1) | Users want to revisit songs | Requires storage (S3/R2), CDN, expiry policies, and a library UI — doubles scope of v1; Suno confirmed users re-download rather than revisit frequently in early stages | Serve songs as direct download URLs from RunPod with 24-48 hour expiry; store generation metadata (prompt, timestamp) in DB without the audio; tell users to download immediately |
| Social features (explore, share, likes) | Users see Suno's public feed and want the same | Content moderation requirement, infrastructure cost, legal exposure around AI-generated music; Suno spent months on this; wrong for 5-10 user prototype | Add a "Copy link" button that generates a short-lived share URL for a single song; zero moderation burden |
| Real-time streaming playback (like Udio SSE) | Feels faster; progressive audio feels premium | ACE-Step's REST API is async poll-based, not streaming; implementing streaming requires architectural changes to the inference pipeline | Show a convincing loading animation during poll; generation is <10 seconds on RTX 3090 turbo — fast enough that streaming isn't necessary |
| Song editing / remixing tools | Users want to adjust parts of a song | ACE-Step supports `repaint` and `lego` tasks but these are advanced modes requiring audio segmentation UI; doubles product complexity | Defer to v2; for v1, implement "regenerate with modified prompt" as the editing primitive |
| STEM export (vocals, drums, bass) | Musicians want isolated tracks | ACE-Step `extract` task supports this, but it's base-model-only (not turbo), slower, and requires specialized UI | v2 feature; mention on roadmap as premium tier feature |
| LoRA / style personalization | Power users want to train the model on their style | Requires a training pipeline, GPU job queue, model storage per user — massive infrastructure lift | Not for prototype; mention as eventual "Pro Studio" feature |
| Admin dashboard | Useful at scale | Manual DB queries + Stripe dashboard sufficient for 5-10 users; building an admin UI is pure scope creep | Use Stripe dashboard for billing, direct DB access for user management |
| Mobile app | Users will want it | Web-first is correct for prototype; React + Next.js in a browser works on mobile already | Make the web app responsive so it works on mobile browsers; native app is v2+ |
| Song versioning / history | Users want to see all their generations | Requires persistent storage with audio files; complex expiry/cost model; song history implies a library | Store prompt metadata in DB; don't store audio files long-term; direct-download flow is sufficient for v1 |

---

## User Flow (Expected by Users in 2026)

Based on Suno and Udio analysis, the expected user flow for a music generation SaaS is:

```
Landing page (hear examples, see pricing)
    └──> Sign up / Log in (email or Google)
             └──> Dashboard / Create page
                      └──> Enter prompt (describe vibe or choose mode)
                               ├──> Simple mode: just a text description
                               └──> Custom mode: lyrics + style tags
                      └──> Click "Generate"
                               └──> Loading state (10-60 seconds)
                                        └──> 2 song variants appear
                                                 ├──> Play / Pause / Seek (with waveform)
                                                 ├──> Download (MP3 free / WAV paid)
                                                 └──> Regenerate (with same or new prompt)
             └──> Credit balance shown throughout
             └──> "Upgrade" CTA when credits run low
```

---

## Feature Dependencies

```
User Authentication
    └──requires──> Credit System
                       └──requires──> Generation Endpoint (ACE-Step API)
                                          └──requires──> Audio Playback UI
                                                             └──requires──> Download

Credit System
    └──requires──> Stripe Integration (for paid tiers)

Dual Variant Generation
    └──requires──> Generation Endpoint (batch_size=2)

WAV Download
    └──requires──> Paid Tier Gate (Stripe subscription check)

Commercial License
    └──requires──> Paid Tier Gate (Stripe subscription check)
```

### Dependency Notes

- **Auth requires Credit System:** Credits are per-user; anonymous generation is possible but creates abuse vectors; implement auth first.
- **Credit System requires Stripe:** Free-tier credits are DB-only (daily cron reset); paid tiers add Stripe subscription + webhook to update credit pool.
- **Generation requires ACE-Step API:** The entire product depends on the RunPod-hosted ACE-Step REST API being available; this is the highest infrastructure risk.
- **Audio Playback requires Generation:** Obvious, but playback (waveform render, seek) must work against ACE-Step's actual audio output format (MP3/WAV/FLAC at 48kHz stereo).
- **Dual Variants conflict with minimal-credit free tier:** 2 variants costs 2 credits; on a 10-credit/day free limit this means 5 generations/day. Acceptable — mirrors Suno's free tier feel.

---

## ACE-Step 1.5 Capability Mapping

This section maps v1 features to confirmed ACE-Step capabilities to identify what's feasible on launch.

| v1 Feature | ACE-Step Support | Task Type | Notes |
|------------|------------------|-----------|-------|
| Text-to-music (vibe prompt) | YES | `text2music` | `caption` field; all model variants |
| Custom lyrics | YES | `text2music` | `lyrics` field with `[Verse]`/`[Chorus]` tags; 50+ languages |
| Duration control | YES | `text2music` | `duration` in seconds, 10–600s range |
| Instrumental (no vocals) | LIKELY | `text2music` | Empty lyrics or `[instrumental]` tag — confirm via testing |
| Dual variant generation | YES | `text2music` | `batch_size` parameter, up to 8 |
| MP3 output | YES | — | Confirmed format output |
| WAV output | YES | — | Native 48kHz stereo |
| FLAC output | YES | — | Available; not needed for v1 |
| Genre/style control | YES | `text2music` | Embedded in `caption`; BPM, key, time signature as metadata params |
| Waveform + playback | YES (client-side) | — | ACE-Step outputs audio; wavesurfer.js renders client-side |
| Cover / remixing | YES (base model only) | `cover`, `repaint` | NOT turbo model; defer to v2 |
| Stem extraction | YES (base model only) | `extract` | NOT turbo model; defer to v2 |

**Critical constraint:** The turbo model (recommended for speed, <10s on RTX 3090) supports only `text2music`, `cover`, and `repaint`. Advanced tasks (`extract`, `lego`, `complete`) require the base model and are slower. Build v1 exclusively on turbo.

---

## MVP Definition

### Launch With (v1)

Minimum viable product — what's needed to validate the concept.

- [ ] Text prompt input (simple mode) — core value delivery
- [ ] Custom lyrics input (custom mode) — core differentiator for "personalized song" use case
- [ ] Genre/style tag input — improves output quality dramatically; free-form text acceptable
- [ ] Duration preset (Short ~1min / Standard ~2min / Full ~4min) — low effort, high perceived control
- [ ] Instrumental toggle — low effort, catches use case of birthday background music
- [ ] "Generate" button with async loading state — ACE-Step poll loop; show animated placeholder
- [ ] Dual song variant output — 2 cards; reduces frustration; ACE-Step batch_size=2
- [ ] In-browser audio playback with waveform — wavesurfer.js + @wavesurfer/react
- [ ] MP3 download (all users) — core value; direct link to ACE-Step output
- [ ] WAV download (paid tiers only) — marginal technical effort, meaningful tier differentiation
- [ ] User signup / login — email + Google via NextAuth or Clerk
- [ ] Credit balance display in header
- [ ] Daily credit refresh for free tier (DB cron job)
- [ ] Monthly credit pool for paid tiers (Stripe subscription webhooks)
- [ ] "Upgrade" CTA when credits reach 0 or low threshold
- [ ] Stripe checkout for paid tier subscription
- [ ] Commercial license for paid tier users (terms of service + UI acknowledgment)
- [ ] Error state with credit refund on generation failure

### Add After Validation (v1.x)

Features to add once core is working and users are engaged.

- [ ] Generation history (prompt + timestamp metadata only, not audio files) — add when users request "what prompt did I use?"
- [ ] Short-lived shareable link per song — when organic sharing occurs; 48-hour URL expiry
- [ ] Song section structure guide tooltip — in-UI explanation of `[Verse]`/`[Chorus]` tags; add when user confusion is observed
- [ ] Language selector — when non-English user sign-ups appear
- [ ] Credit top-up (one-time purchase) — when users hit monthly limit but don't want full upgrade

### Future Consideration (v2+)

Features to defer until product-market fit is established.

- [ ] Song library with persistent audio storage — requires S3/R2, CDN, significant storage cost
- [ ] Remixing / repaint tools — ACE-Step supports it, but requires audio segmentation UI
- [ ] Stem export (vocals, drums, bass) — base model only, slower; meaningful for musicians
- [ ] LoRA style personalization — training pipeline, per-user model storage
- [ ] Explore / public feed — content moderation, legal exposure, major infrastructure
- [ ] Social features (likes, follows, comments)
- [ ] Native mobile apps (iOS/Android)
- [ ] Admin dashboard UI

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Text prompt + Generate | HIGH | LOW | P1 |
| Custom lyrics input | HIGH | LOW | P1 |
| In-browser audio playback (waveform) | HIGH | MEDIUM | P1 |
| MP3 download | HIGH | LOW | P1 |
| Async loading state (poll loop) | HIGH | MEDIUM | P1 |
| User auth | HIGH | MEDIUM | P1 |
| Credit system (free daily) | HIGH | MEDIUM | P1 |
| Stripe paid tier | HIGH | MEDIUM | P1 |
| Dual variant generation | MEDIUM | LOW | P1 |
| Duration presets | MEDIUM | LOW | P1 |
| Instrumental toggle | MEDIUM | LOW | P1 |
| Credit balance display | MEDIUM | LOW | P1 |
| Upgrade CTA / gate | MEDIUM | LOW | P1 |
| WAV download (paid) | MEDIUM | LOW | P1 |
| Error + credit refund | MEDIUM | LOW | P1 |
| Genre/style tag UI | MEDIUM | LOW | P1 |
| Commercial license (terms) | MEDIUM | LOW | P1 |
| Generation history (metadata) | LOW | LOW | P2 |
| Shareable link | LOW | LOW | P2 |
| Language selector | LOW | LOW | P2 |
| Credit top-up | MEDIUM | LOW | P2 |
| Song library (audio storage) | MEDIUM | HIGH | P3 |
| Remix / repaint tools | MEDIUM | HIGH | P3 |
| Stem export | LOW | HIGH | P3 |
| Admin dashboard | LOW | MEDIUM | P3 |
| Social / explore feed | LOW | HIGH | P3 |

**Priority key:**
- P1: Must have for launch
- P2: Should have, add when possible
- P3: Nice to have, future consideration

---

## Competitor Feature Analysis

| Feature | Suno | Udio | Our Approach (v1) |
|---------|------|------|-------------------|
| Generation mode | Simple prompt + Custom (lyrics + style) | Prompt + Lyrics auto/manual/instrumental | Mirror: Simple + Custom modes |
| Variants per generation | 2 variants per click | 1 clip, extend-based iteration | 2 variants; ACE-Step batch_size=2 |
| Loading / progress | 30-60s, spinner + placeholder | SSE streaming (progressive audio) | Async poll; animated placeholder; ACE-Step turbo <10s on RTX 3090 |
| Playback | Waveform player, seekable | Waveform player, seekable | wavesurfer.js with waveform |
| Download formats | MP3 (free), WAV (Pro) | MP3 (all tiers) | MP3 (free), WAV (paid) |
| Free tier | 50 credits/day ≈ 10 songs, non-commercial | 400 credits/month ≈ limited songs | 10 credits/day ≈ 5 dual-variant generations (10 songs); daily reset |
| Paid tiers | Pro $8-10/mo, Premier $24-30/mo | Standard $10/mo, Pro $30/mo | Pro ~$8/mo, Premier ~$24/mo (Suno-inspired) |
| Commercial license | Paid tiers only | Paid tiers only | Paid tiers only (free = non-commercial) |
| Song library | Yes — persistent across sessions | Yes — clips saved in account | No persistent library in v1; direct download only |
| Social features | Public explore feed, likes, comments | Limited sharing | None in v1 |
| Editing tools | Extend, Remix, Cover | Extend, Remix | None in v1; "Regenerate with new prompt" only |
| Credits rollover | No rollover (daily/monthly reset) | No rollover (monthly reset) | No rollover; purchased top-ups persist (Stripe) |
| Mobile app | Yes (iOS/Android) | Yes (iOS/Android) | No; responsive web only |

---

## Credit System Design

Based on Suno and Udio patterns, the recommended credit model for v1:

**Free Tier (no credit card):**
- 10 credits/day, refreshed daily via cron at midnight UTC
- No rollover; encourages daily engagement and natural upgrade pressure
- 1 generation = 2 credits (dual variant = 2 songs)
- Equivalent to 5 generations/day or 10 songs
- Non-commercial use only (ToS)

**Pro Tier (~$8-10/mo):**
- 500 credits/month (monthly pool)
- No rollover; pool resets on billing anniversary
- Commercial license for songs generated while subscribed
- WAV download enabled
- Equivalent to ~250 generations/month

**Premier Tier (~$24-30/mo):**
- 2000 credits/month
- Same no-rollover policy
- All Pro features
- Priority queue on GPU (if queue becomes a factor at scale)

**Credit top-up (v1.x):**
- One-time purchase packs (100 credits, 500 credits) via Stripe Payment Intent
- No expiry on purchased credits (requires active subscription to use — follow Suno model)

**Implementation:**
- Credits stored in Postgres `user_credits` table
- Free tier: daily cron job resets `daily_credits` column; separate `purchased_credits` column
- Stripe webhooks update `subscription_credits` on successful payment
- Deduct credits atomically at job submission (not on completion) to prevent race conditions
- Refund credits on generation failure (ACE-Step error or timeout)

---

## Sources

- Suno pricing and feature analysis: suno.com (live product), AIML API Suno guide
- Suno user flow: suno.com/hub/how-to-make-a-song, learnprompting.org Suno guide
- Udio pricing: eesel.ai/blog/udio-pricing, margabagus.com Udio pricing review
- ACE-Step 1.5 capabilities: ace-step.github.io/ace-step-v1.5.github.io, deepwiki.com/ace-step/ACE-Step-1.5
- ACE-Step API: deepwiki.com/ace-step/ACE-Step-1.5/2.3-quick-start-guide, deepwiki.com/ace-step/ACE-Step-1.5/5-generation-features
- wavesurfer.js: wavesurfer.xyz, npmjs.com/@wavesurfer/react
- Credit model patterns: newsletter.pricingsaas.com, colorwhistle.com/saas-credits-system-guide
- Suno commercial licensing: suno.com/terms-of-service, help.suno.com

---
*Feature research for: AI Music Generation SaaS (ACE-Step 1.5 / MusicGenerator)*
*Researched: 2026-03-03*
