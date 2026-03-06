---
phase: 13-color-system-noise-removal
plan: 02
subsystem: ui
tags: [next.js, fonts, tailwind, atomic-swap, branding]

# Dependency graph
requires:
  - phase: 13-color-system-noise-removal/plan-01
    provides: Header.tsx, Footer.tsx, OKLCH color tokens, globals.css with font variables
provides:
  - Clean Notevra app shell (layout.tsx + page.tsx) with DM Sans + Libre Baskerville fonts
  - All v2.0 UI artifacts removed (45 files deleted)
  - Dead dependencies uninstalled (next-themes, wavesurfer.js, gsap)
  - Brand rename complete — package.json and all user-visible text say "Notevra"
affects:
  - phases 14-17 (quiz funnel, generation, player — all build on this clean shell)

# Tech tracking
tech-stack:
  added: [DM_Sans (next/font/google), Libre_Baskerville (next/font/google)]
  patterns:
    - "next/font/google variables injected on <body> via className; referenced in globals.css with direct var() calls (not @theme indirection)"
    - "Atomic commit strategy: layout + page + deletion + uninstall in one git commit to avoid broken intermediate state"

key-files:
  created: []
  modified:
    - src/app/layout.tsx
    - src/app/page.tsx
    - src/app/globals.css
    - package.json

key-decisions:
  - "Reference next/font CSS vars directly in globals.css body/heading rules — @theme indirection caused font-family not to render in computed styles"
  - "All old UI deletion, dependency uninstall, and brand rename committed atomically with new layout to prevent broken intermediate build"
  - "Geist Mono retained in layout for potential future code snippet use"

patterns-established:
  - "Font pattern: declare next/font/google vars on <body> className, consume with var(--font-dm-sans) / var(--font-libre) in CSS rules"
  - "Placeholder page is a pure server component — no 'use client' needed"

requirements-completed: [FNDN-01, FNDN-03, FNDN-05]

# Metrics
duration: ~30min (including human verification round-trip)
completed: 2026-03-06
---

# Phase 13 Plan 02: Atomic AppShell Removal and Notevra Brand Swap Summary

**v2.0 UI completely excised — 45 files deleted, dead deps removed, DM Sans + Libre Baskerville rendering, Notevra identity live at localhost:3000**

## Performance

- **Duration:** ~30 min (including human visual verification round-trip)
- **Started:** 2026-03-06 (session)
- **Completed:** 2026-03-06
- **Tasks:** 2 (1 auto + 1 checkpoint:human-verify)
- **Files modified:** 4 (layout.tsx, page.tsx, globals.css, package.json) + 45 deleted

## Accomplishments
- Atomically removed entire v2.0 UI: AppShell, Sidebar, BottomAudioPlayer, WaveformPlayer, GenerationPage, HeroSection, Library, AudioPlayerContext, and all associated tests
- Rewrote layout.tsx with DM Sans + Libre Baskerville via next/font/google, new Notevra metadata, Header + Footer
- Rewrote page.tsx as a clean server component placeholder with brand headline and quiz CTA
- Uninstalled next-themes, wavesurfer.js, @wavesurfer/react, gsap, @gsap/react
- Renamed package.json "name" field to "notevra"; zero remaining "Notera" or "MusicGenerator" in user-visible text
- User approved visual identity in browser: serif headings, sans-serif body, baby blue header CTA, sticky footer

## Task Commits

Each task was committed atomically:

1. **Task 1: Atomic swap — layout, page, delete old UI, uninstall packages, rename brand** - `735da8c` (feat)
2. **Task 1 deviation fix: font CSS var reference** - `93fddf2` (fix — applied during Task 2 human verification)

**Plan metadata:** (this commit)

## Files Created/Modified
- `src/app/layout.tsx` - Root layout with DM Sans + Libre Baskerville font vars, Header/Footer, Notevra metadata
- `src/app/page.tsx` - Server component placeholder with "Turn your feelings into a song." hero and /quiz CTA
- `src/app/globals.css` - Fixed font-family rules to reference var(--font-dm-sans) and var(--font-libre) directly
- `package.json` - name changed to "notevra", next-themes/wavesurfer/gsap removed from dependencies

## Decisions Made
- **Direct CSS var references in globals.css:** After human verification revealed fonts were not rendering correctly, the bug was traced to globals.css using `@theme` indirection to map font vars. Fixed by referencing `var(--font-dm-sans)` and `var(--font-libre)` directly in `body` and heading CSS rules. This pattern must be followed in all future font usage.
- **Single atomic commit for deletion + rewrite:** Kept everything in one commit to avoid a build-broken intermediate state where old providers were removed but new layout not yet functional.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] globals.css font vars referenced through @theme indirection instead of directly**
- **Found during:** Task 2 (Visual verification of Notevra identity)
- **Issue:** Computed styles showed generic system font instead of DM Sans / Libre Baskerville. globals.css was routing font-family through a `@theme` mapping rather than referencing the CSS variables directly from next/font output.
- **Fix:** Rewrote body and heading rules in globals.css to use `var(--font-dm-sans)` and `var(--font-libre)` directly.
- **Files modified:** `src/app/globals.css`
- **Verification:** DevTools Computed font-family confirmed DM Sans on body text, Libre Baskerville on headings after fix.
- **Committed in:** `93fddf2` (fix commit during Task 2 verification)

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug)
**Impact on plan:** Fix was essential for correctness — fonts were the primary visual identity requirement. No scope creep.

## Issues Encountered
- Font rendering bug discovered during human visual verification checkpoint. Root cause: globals.css pattern mismatch with how next/font injects CSS custom properties. Resolved immediately via Rule 1 auto-fix.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Clean app shell ready for Phase 13 Plan 03+ (quiz funnel scaffold, route structure)
- Fonts, color tokens, Header, Footer all confirmed working in browser
- No old UI artifacts remain — zero risk of accidental import of deleted components
- next build passes cleanly

---
*Phase: 13-color-system-noise-removal*
*Completed: 2026-03-06*
