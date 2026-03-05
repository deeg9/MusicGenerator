---
gsd_state_version: 1.0
milestone: v2.0
milestone_name: Suno-Style UX Overhaul
status: defining_requirements
stopped_at: null
last_updated: "2026-03-05"
last_activity: 2026-03-05 — Milestone v2.0 started
progress:
  total_phases: 0
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-05)

**Core value:** Anyone can create a unique, personal song in seconds — no musical skill required.
**Current focus:** Defining requirements for v2.0

## Current Position

Phase: Not started (defining requirements)
Plan: —
Status: Defining requirements
Last activity: 2026-03-05 — Milestone v2.0 started

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [v2.0]: Adopt Suno UX layout patterns (centered prompt → workspace → library)
- [v2.0]: Same-page create transformation (no separate /create route)
- [v2.0]: Persistent bottom audio player (Suno/Spotify-style)
- [v1.1]: Amber locked to backgrounds/CTAs only, never foreground text (WCAG AA)
- [v1.1]: Class-based dark mode via :root.dark
- [v1.1]: CTA uses bg-accent (amber) not bg-primary (sky-blue)
- [v1.1]: font-display (Bricolage Grotesque) for editorial brand typography
- [v1.1]: setOptions() imperative wavesurfer theme sync avoids destroy/recreate cycle

### Pending Todos

None yet.

### Blockers/Concerns

- GSAP ScrambleTextPlugin is a paid Club GreenSock plugin — need to verify licensing or find alternative
- Persistent audio player needs global state management (context or store) for cross-page playback
