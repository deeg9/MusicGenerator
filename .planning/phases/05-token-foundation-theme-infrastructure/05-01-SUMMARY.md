---
phase: 05-token-foundation-theme-infrastructure
plan: "01"
subsystem: design-tokens
tags: [css, tokens, oklch, tailwind-v4, dark-mode]
dependency_graph:
  requires: []
  provides: [design-token-primitives, semantic-tokens, tailwind-theme-bridge, dark-mode-css-infrastructure]
  affects: [all-subsequent-phases, component-styling, bg-background-text-foreground-utilities]
tech_stack:
  added: []
  patterns: [oklch-primitive-semantic-split, tailwind-v4-theme-inline-bridge, class-based-dark-mode, border-regression-fix]
key_files:
  created:
    - src/app/tokens/primitives.css
  modified:
    - src/app/globals.css
decisions:
  - "Amber locked to backgrounds/CTAs only — never foreground text (sidesteps WCAG AA contrast failure)"
  - "Class-based dark mode via :root.dark selector, not @media prefers-color-scheme"
  - "Font variables (--font-figtree, --font-bricolage, --font-geist-mono) declared in @theme now; injected by layout.tsx in Plan 03"
  - "h1-h6 all use --font-display (was only h1-h3 previously)"
metrics:
  duration: "~2 minutes"
  completed_date: "2026-03-05"
  tasks_completed: 2
  tasks_total: 2
  files_created: 1
  files_modified: 1
---

# Phase 05 Plan 01: Token Foundation Summary

**One-liner:** OKLCH primitive palette + semantic token mappings + Tailwind v4 @theme inline bridge + class-based dark mode infrastructure.

## What Was Built

### Task 1: Create OKLCH Primitive Token File

Created `src/app/tokens/primitives.css` — a standalone file defining the raw OKLCH palette:

- **Cream scale** (5 shades, H ~80-85): `--cream-50` through `--cream-800` — warm white tones for light mode backgrounds
- **Amber scale** (5 shades, H ~65-95): `--amber-50` through `--amber-800` — golden yellow for backgrounds and CTAs only
- **Sky-blue scale** (5 shades, H ~220-235): `--sky-50` through `--sky-800` — cool blue for primary actions
- **Neutral scale** (8 shades): `--neutral-50` through `--neutral-900` — for dark mode foregrounds and cards

All chroma values kept below 0.18 to stay within sRGB gamut. 23 OKLCH values defined.

### Task 2: Rewrite globals.css

Complete rewrite of `src/app/globals.css` with the following structure:

1. `@import "tailwindcss"` + `@import "./tokens/primitives.css"`
2. `@custom-variant dark (&:where(.dark, .dark *))` — class-based dark mode for Tailwind `dark:` utilities
3. `:root` block — 16 semantic tokens mapping to OKLCH primitives for light mode
4. `:root.dark` block — dark mode overrides (neutral palette for backgrounds, lighter values for foregrounds)
5. `@theme inline` block — full bridge: 16 color tokens, 3 font vars, 4 radius vars, 3 shadow tokens, spacing base, 2 animation vars
6. `@layer base` — Tailwind v4 border regression fix (default to `--color-border` instead of `currentColor`)
7. `body` rule — background, color, font-family, scroll-behavior
8. `h1-h6` rule — `--font-display` (extended from h1-h3 only)
9. `@keyframes eq-bar` and `@keyframes wave` — preserved verbatim

## Verification Results

All automated checks passed:

| Check | Result |
|-------|--------|
| `@custom-variant dark` present | PASS |
| `:root.dark` selector present | PASS |
| `@import ./tokens/primitives.css` present | PASS |
| `border-color: var(--color-border)` present | PASS |
| `shadow-subtle` token defined | PASS |
| No `prefers-color-scheme` media query | PASS |
| `npx vitest run` — 22 tests pass, 0 failures | PASS |

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check

### Files Created/Modified

- `src/app/tokens/primitives.css` — exists
- `src/app/globals.css` — modified

### Commits

- `41ec0f8` — feat(05-01): create OKLCH primitive token file
- `17eb12b` — feat(05-01): rewrite globals.css with OKLCH semantic tokens, dark mode, and Tailwind bridge

## Self-Check: PASSED
