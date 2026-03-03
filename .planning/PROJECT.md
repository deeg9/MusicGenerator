# MusicGenerator

## What This Is

An AI-powered music generation web app where people create personalized songs for loved ones. Users describe a vibe ("happy jazz birthday song for my mom") or write their own lyrics, the ACE-Step 1.5 model generates a full song in seconds, and they preview and download it. Monetized via a freemium credit-based subscription model.

## Core Value

Anyone can create a unique, personal song in seconds — no musical skill required.

## Current Milestone: v1.0 — Core Generation

**Goal:** Ship a working web app where users can generate, preview, and download AI-created songs with account and credit management.

**Target features:**
- Text-to-music generation (describe a vibe or provide custom lyrics)
- Song preview and download
- User accounts and authentication
- Credit-based usage system with free tier
- Payment integration for premium tiers

## Requirements

### Validated

<!-- Shipped and confirmed valuable. -->

(None yet — ship to validate)

### Active

<!-- Current scope. Building toward these. -->

- [ ] Text-to-music generation via ACE-Step 1.5
- [ ] Custom lyrics input with genre/style selection
- [ ] Song preview playback in browser
- [ ] Song download (audio file)
- [ ] User signup/login
- [ ] Credit system (free daily allowance + paid tiers)
- [ ] Payment processing (Stripe)

### Out of Scope

<!-- Explicit boundaries. Includes reasoning to prevent re-adding. -->

- Mobile apps — web-first, mobile later (v2+)
- Song library / saved songs — keep v1 tight, generate-and-download
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
- Prototype target: 5-10 users, GPU hosting service (RunPod)

## Constraints

- **Tech stack**: Next.js + React frontend, ACE-Step REST API backend
- **Infrastructure**: GPU hosting service (RunPod for prototype phase)
- **Model**: ACE-Step 1.5 turbo variant for speed
- **Scale**: Prototype for 5-10 users initially
- **Budget**: Minimize costs — serverless/pay-per-use GPU where possible

## Key Decisions

<!-- Decisions that constrain future work. Add throughout project lifecycle. -->

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| ACE-Step 1.5 as generation model | Open source (MIT), commercial-ready, fast, low VRAM, quality comparable to Suno | — Pending |
| Next.js + React frontend | User preference, strong ecosystem, SSR for SEO | — Pending |
| Freemium credit model | Proven by Suno, low barrier to entry, recurring revenue | — Pending |
| RunPod for prototype hosting | Cheapest GPU hosting for low-volume prototype (~$0.20/hr) | — Pending |

---
*Last updated: 2026-03-03 after project initialization*
