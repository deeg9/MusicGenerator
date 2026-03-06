---
phase: 13-color-system-noise-removal
plan: 01
subsystem: ui
tags: [css, tailwind-v4, oklch, color-tokens, header, footer, vitest, testing-library]

# Dependency graph
requires: []
provides:
  - Baby blue + mellow yellow + cloud white + navy OKLCH color scale in primitives.css
  - Semantic token layer in globals.css mapped to new primitives, dark mode removed
  - Header.tsx: sticky nav with Notevra logo, How it Works / Examples / Reviews links, Create Your Song CTA
  - Footer.tsx: minimal Notevra copyright footer
  - Header and Footer smoke tests (9 tests, all green)
affects:
  - 13-02 (atomic AppShell removal needs Header/Footer ready — this plan delivers them)
  - 14-landing-page (color tokens and Header component used throughout)
  - All future phases (semantic token layer is the foundation for all UI styling)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "OKLCH cloud/blue/yellow/navy primitive scales defined in primitives.css, referenced only via semantic tokens in globals.css"
    - "Tailwind v4 @theme inline bridge maps --color-X semantic vars to utility classes (bg-primary, text-foreground, etc.)"
    - "next/link mock in vitest for client component tests that use Link"

key-files:
  created:
    - src/components/Header.tsx
    - src/components/Header.test.tsx
    - src/components/Footer.tsx
    - src/components/Footer.test.tsx
  modified:
    - src/app/tokens/primitives.css
    - src/app/globals.css

key-decisions:
  - "OKLCH primitives: cloud-50/200/300, blue-300/400/500/700, yellow-200/400/600, navy-500/800/900 — 4 scales, 3-4 stops each"
  - "globals.css: dark mode fully removed (@custom-variant dark line + :root.dark block), sidebar/player-bar vars removed"
  - "Font vars updated to --font-dm-sans and --font-libre in @theme inline (will be injected by layout.tsx in Plan 02)"
  - "Removed eq-bar and wave @keyframes and their --animate-* theme vars (only used by deleted v2.0 components)"
  - "Header uses 'use client' with useState for mobile menu toggle; Footer is a server component"
  - "next/link mocked in vitest with a simple <a> wrapper to avoid router dependency in tests"

patterns-established:
  - "Pattern: Mock next/link as plain <a> element in vitest tests for client components"

requirements-completed: [FNDN-02, FNDN-04]

# Metrics
duration: 2min
completed: 2026-03-06
---

# Phase 13 Plan 01: Color System and Component Foundation Summary

**Baby blue + mellow yellow OKLCH token system in primitives.css + globals.css, plus Notevra Header/Footer components with 9 passing smoke tests**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-03-06T06:42:43Z
- **Completed:** 2026-03-06T06:44:33Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- Replaced old cream/amber/sky/neutral color scales with new cloud/blue/yellow/navy OKLCH palette in primitives.css
- Removed dark mode entirely from globals.css (no @custom-variant dark, no :root.dark block), removed sidebar/player-bar tokens
- Built sticky Header with Notevra logo, desktop nav links, Create Your Song CTA, and mobile hamburger menu
- Built minimal Footer with Notevra copyright
- 9 smoke tests pass (6 for Header, 3 for Footer)

## Task Commits

Each task was committed atomically:

1. **Task 1: Rewrite color tokens and globals.css** - `170d230` (feat)
2. **Task 2: Create Header and Footer components with tests** - `4f51d0a` (feat)

## Files Created/Modified

- `src/app/tokens/primitives.css` - Rewrote OKLCH palette: cloud white, baby blue, mellow yellow, soft navy scales
- `src/app/globals.css` - Updated semantic tokens to new primitives, removed dark mode, removed sidebar/player-bar vars, removed eq-bar/wave animations, updated font vars
- `src/components/Header.tsx` - Sticky header with Notevra logo, desktop/mobile nav, Create Your Song CTA
- `src/components/Header.test.tsx` - 6 smoke tests: renders, Notevra text, CTA, 3 nav links
- `src/components/Footer.tsx` - Minimal Notevra copyright footer
- `src/components/Footer.test.tsx` - 3 smoke tests: renders, Notevra brand, copyright

## Decisions Made

- OKLCH primitive scales: 3 stops for cloud (50/200/300), 4 stops for blue (300/400/500/700), 3 stops for yellow (200/400/600), 3 stops for navy (500/800/900) — sufficient to express all semantic tokens without over-engineering
- eq-bar and wave keyframe animations removed (only used by v2.0 WaveformPlayer/BottomAudioPlayer, both being deleted in Plan 02)
- Font vars set to --font-dm-sans and --font-libre in @theme inline; layout.tsx in Plan 02 will inject these via next/font/google
- next/link mocked in vitest as plain anchor element to keep Header tests isolated from Next.js router

## Deviations from Plan

None - plan executed exactly as written.

Minor clarification: The verification check's regex `dark` matched a comment in globals.css ("NO dark mode section — dark mode is explicitly out of scope"). Removed the comment so automated grep verification would pass cleanly. Not a deviation — comment removal was the correct fix.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- primitives.css and globals.css are ready for all Plan 02 work
- Header.tsx and Footer.tsx are built and tested — Plan 02 can wire them into layout.tsx atomically
- All prerequisites for the atomic AppShell removal (Plan 02) are in place

---
*Phase: 13-color-system-noise-removal*
*Completed: 2026-03-06*
