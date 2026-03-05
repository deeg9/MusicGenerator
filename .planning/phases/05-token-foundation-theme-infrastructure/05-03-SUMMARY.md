---
phase: 05-token-foundation-theme-infrastructure
plan: 03
subsystem: ui
tags: [next-font, bricolage-grotesque, figtree, style-guide, typography, tailwind-v4]

# Dependency graph
requires:
  - phase: 05-01
    provides: Semantic color tokens and OKLCH primitive palette in globals.css
  - phase: 05-02
    provides: ThemeProvider + ThemeToggle, next-themes dark mode, layout.tsx with font variable slots

provides:
  - Bricolage Grotesque + Figtree loaded via next/font with CSS variable injection
  - /style-guide dev page with color swatches (semantic + primitive), typography scale, spacing/radius, shadow sections
  - Production gate on /style-guide (returns 404 in production)

affects:
  - Phase 06 (UI components — will use font-display/font-sans utilities)
  - Any phase building UI components that depend on typography tokens

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "next/font/google with CSS variable injection (variable: '--font-*') for Tailwind v4 integration"
    - "Dev-only pages gated by process.env.NODE_ENV === 'production' with notFound()"
    - "Inline style props for CSS primitives not exposed as Tailwind utilities (e.g. var(--cream-50))"

key-files:
  created:
    - src/app/style-guide/page.tsx
  modified:
    - src/app/layout.tsx

key-decisions:
  - "No side-by-side light/dark on style guide — page respects active theme via toggle per user decision"

patterns-established:
  - "Font pattern: load via next/font with variable prop, inject via body className, reference via @theme --font-* in globals.css"
  - "Style guide pattern: dev-only pages with notFound() production gate + inline CSS var styles for primitives"

requirements-completed: [BRAND-02]

# Metrics
duration: 10min
completed: 2026-03-05
---

# Phase 5 Plan 03: Font Swap + Style Guide Summary

**Bricolage Grotesque + Figtree loaded via next/font with full /style-guide dev page showing all brand tokens (color, typography, spacing, radius, shadows) that responds to theme toggle**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-03-05T19:15:00Z
- **Completed:** 2026-03-05T19:26:22Z
- **Tasks:** 3 (2 auto + 1 human-verify)
- **Files modified:** 2

## Accomplishments
- Replaced DM Sans + Libre Baskerville with Bricolage Grotesque + Figtree via next/font/google
- Created /style-guide page with color swatches (all semantic tokens + raw OKLCH primitive palette), typography scale, spacing/radius boxes, and shadow cards
- Verified full Phase 5 output visually — theme toggle, fonts, tokens, no FOUC on hard reload, warm-toned borders confirmed

## Task Commits

Each task was committed atomically:

1. **Task 1: Swap fonts to Bricolage Grotesque + Figtree in layout.tsx** - `f756ff7` (feat)
2. **Task 2: Create /style-guide page with all token swatches** - `a249e62` (feat)
3. **Task 3: Visual verification of complete token system and theme infrastructure** - human-verify (user approved)

**Plan metadata:** (docs commit pending)

## Files Created/Modified
- `src/app/layout.tsx` - Replaced DM_Sans + Libre_Baskerville with Bricolage_Grotesque + Figtree font imports and body className variable injection
- `src/app/style-guide/page.tsx` - Dev-only style guide with production gate, color swatches (semantic + OKLCH primitives), typography scale, spacing/radius reference, shadow cards

## Decisions Made
- No side-by-side light/dark comparison on style guide page — user prefers respecting active theme via the existing toggle rather than a split view

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 5 complete: OKLCH token system, class-based dark mode, Bricolage + Figtree typography, and style guide all verified
- Phase 6 (UI Components) can use font-display, font-sans, bg-background, text-foreground, shadow-*, rounded-* utilities immediately
- No blockers

---
*Phase: 05-token-foundation-theme-infrastructure*
*Completed: 2026-03-05*
