# Milestones

## v1.0 — Core Generation (Complete)

**Goal:** Ship a working web app where users can generate, preview, and download AI-created songs — validate the core generation experience.

**Started:** 2026-03-03
**Completed:** 2026-03-05
**Phases:** 1–4 (4 phases, 12 plans)

**What shipped:**
- Full text-to-music generation pipeline (ACE-Step 1.5 on RunPod)
- Generation form with Simple/Custom modes, genre tags, duration presets, instrumental toggle
- Dual variant generation (2 songs per submission)
- Waveform playback (wavesurfer.js) + MP3/WAV download
- Async polling infrastructure (Supabase + RunPod + R2)
- Landing hero with typewriter headline, example cards, animated waveform
- Loading animation with stage progression, inline error handling

## v1.1 — Brand & Visual Redesign (Complete)

**Goal:** Transform the UI from a generic dark interface into a warm, inviting creative platform that stands apart from Suno — establish a brand identity that feels like a creative playground.

**Started:** 2026-03-05
**Completed:** 2026-03-05
**Phases:** 5–7 (8 phases total, 18 plans)

**What shipped:**
- Design token foundation (OKLCH color palette, typography scale, spacing, shadows)
- Light + dark mode with next-themes (class-based, no FOUC)
- Theme toggle component
- Sidebar layout with hover expand/collapse + mobile drawer
- Style guide dev page (/style-guide)
- Component audit + redesign (HeroSection, GenerationForm, VariantCard, WaveformPlayer)
- Semantic token usage across all components (amber CTA, sky-blue info)
- Framer Motion typewriter component

## v2.0 — Suno-Style UX Overhaul (In Progress)

**Goal:** Redesign to match Suno's proven UX — clean homepage with centered prompt, same-page two-panel create workspace, separate library page, persistent bottom audio player.

**Started:** 2026-03-05
**Status:** Defining requirements
**Last phase from v1.1:** Phase 7
