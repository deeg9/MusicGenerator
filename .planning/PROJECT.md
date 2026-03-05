# MusicGenerator

## What This Is

An AI-powered music generation web app where people create personalized songs for loved ones. Users describe a vibe ("happy jazz birthday song for my mom") or write their own lyrics, the ACE-Step 1.5 model generates a full song in seconds, and they preview and download it. Monetized via a freemium credit-based subscription model.

## Core Value

Anyone can create a unique, personal song in seconds — no musical skill required.

## Current Milestone: v2.0 — Suno-Style UX Overhaul

**Goal:** Redesign the app to match Suno's proven UX layout — clean homepage with centered headline + prompt box, same-page transformation to two-panel create workspace, separate library page for browsing generated songs, and a persistent bottom audio player.

**Target features:**
- Homepage: centered headline + prompt input + Create CTA (clean, Suno-inspired)
- Same-page create workspace: form panel left, results/workspace panel right
- Separate /library page with GSAP portfolio list + music player cards
- Persistent bottom audio player bar (Suno/Spotify-style, persists across pages)
- Sidebar navigation linking Home / Create / Library
- Music player card component for library browsing

**Design reference:** Suno.com layout as primary inspiration. Keep our warm brand tokens (amber/sky-blue) but adopt Suno's proven UX patterns: centered prompt → workspace → library.

## Requirements

### Validated

<!-- Shipped and confirmed valuable. -->

- ✓ Text-to-music generation via ACE-Step 1.5 (text prompt + custom lyrics) — v1.0
- ✓ Genre/style tags, duration presets, instrumental toggle — v1.0
- ✓ Dual variant generation (batch_size=2) — v1.0
- ✓ Waveform playback (wavesurfer.js) + MP3/WAV download — v1.0
- ✓ Async polling infrastructure (RunPod + ACE-Step API) — v1.0
- ✓ Landing page with examples and CTA — v1.0

### Active

<!-- Current scope. Building toward these. -->

- [ ] Suno-style homepage: centered headline + prompt box + Create button
- [ ] Same-page create workspace: two-panel layout (form left, results right)
- [ ] Separate /library page with generated songs browsing
- [ ] Persistent bottom audio player bar across all pages
- [ ] Music player card component for library items
- [ ] GSAP portfolio list with scramble text for library browsing

### Out of Scope

<!-- Explicit boundaries. Includes reasoning to prevent re-adding. -->

- Mobile apps — web-first, mobile later (v2+)
- ~~Song library / saved songs~~ — now in scope for v2.0
- Social features (sharing, profiles, explore page) — not core to v1 value
- Remixing / editing tools — adds complexity, defer to v2
- Cover generation / style transfer — advanced features for later
- Admin dashboard — manual management sufficient for 5-10 users

## Context

- **ACE-Step 1.5** is an open-source (MIT) music generation model with hybrid LM-DiT architecture
- Generates full songs (up to 10 min) in <10 seconds on RTX 3090, <4GB VRAM
- Ships with built-in REST API (`uv run acestep-api`) and Gradio UI
- Supports 50+ languages, text-to-music, custom lyrics
- Model variants: base, sft, turbo (8-step), turbo-rl — turbo recommended for speed
- LM planner sizes: 0.6B, 1.7B, 4B params (Qwen3-based)
- Comparable quality to Suno v4.5-v5 per community feedback
- Business model inspired by Suno: freemium credits, $8-24/mo tiers
- Prototype target: 5-10 users, RunPod Persistent Pod for GPU
- Audio storage via Cloudflare R2 (zero egress fees, S3-compatible, presigned URLs for downloads)
- ACE-Step has a confirmed memory leak (GitHub #142) — workers crash after 2-3 jobs, need restart policy

## Constraints

- **Tech stack**: Next.js + React frontend, ACE-Step REST API backend
- **Infrastructure**: RunPod Persistent Pod for GPU, Cloudflare R2 for audio storage
- **Model**: ACE-Step 1.5 turbo variant for speed
- **Scale**: Prototype for 5-10 users initially
- **Budget**: Minimize costs — serverless/pay-per-use GPU where possible

## Key Decisions

<!-- Decisions that constrain future work. Add throughout project lifecycle. -->

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| ACE-Step 1.5 as generation model | Open source (MIT), commercial-ready, fast, low VRAM, quality comparable to Suno | ✓ Good |
| Next.js + React frontend | User preference, strong ecosystem, SSR for SEO | ✓ Good |
| Freemium credit model | Proven by Suno, low barrier to entry, recurring revenue | — Pending |
| RunPod Persistent Pod (not Serverless) | Serverless cold starts 20-60s break UX; Persistent Pod has zero cold start, stop when not in use | ✓ Good |
| Cloudflare R2 for audio storage | Zero egress fees on audio files; S3-compatible API; 10GB free tier sufficient for prototype | ✓ Good |
| Warmer brand vs Suno dark aesthetic | Differentiate as creative playground, not pro studio. Suno = dark/sterile, MusicGenerator = warm/inviting | — Pending |
| Adopt Suno UX layout patterns | Suno's layout is proven: centered prompt → workspace → library. Use their UX structure with our brand tokens. | — Pending |
| Same-page create transformation | User stays on homepage, page transforms to workspace on Create click. No separate /create route. | — Pending |
| Persistent bottom audio player | Like Suno/Spotify — audio plays across page navigation. Needed for library browsing. | — Pending |

---
*Last updated: 2026-03-05 after v1.1 completion, starting v2.0 Suno-style UX overhaul*
