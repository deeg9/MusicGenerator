# Project Research Summary

**Project:** MusicGenerator — v1.1 Brand Redesign
**Domain:** Design system, brand kit, and light/dark theming for an AI music generation web app
**Researched:** 2026-03-05
**Confidence:** HIGH

## Executive Summary

This milestone (v1.1) is a pure visual redesign of a fully functional AI music generation app onto a warm, inviting brand identity. The underlying infrastructure (Next.js 16, Tailwind v4, Framer Motion, wavesurfer.js, RunPod/ACE-Step backend) is already working. The research confirms that the recommended approach is a strict layer-first build order: token foundation before any component work, theme infrastructure before any dark mode work, and a living `/style-guide` page before the component redesign pass. Every component in the existing app needs to be audited for hardcoded Tailwind color classes and updated to semantic token utilities — this is a prerequisite for the redesign to hold.

The core brand direction is validated: a warm cream + amber/golden + sky-blue palette positions the product distinctly against cold-dark competitors like Suno. Bricolage Grotesque (variable, Google Fonts) as the display typeface and Figtree as body copy are the recommended fonts — both free, both warm in character, both ready for `next/font/google` self-hosting. The architecture is a well-established three-tier token system (primitives → semantic → Tailwind bridge) that Tailwind v4 and shadcn/ui v4 fully support via `@theme inline` and `@custom-variant dark`.

The primary risks are well-understood and preventable: the Tailwind v4 border default change (`currentColor` instead of `gray-200`) silently breaks all card and input borders if not addressed first; the CSS variable format mismatch between shadcn v3 patterns and v4 `@theme inline` causes transparent backgrounds if not resolved upfront; and wavesurfer.js colors don't update on theme switch because the Shadow DOM doesn't inherit CSS variables — it requires a JavaScript re-init on `resolvedTheme` change. All three must be resolved in the Token Foundation phase before any visual component work begins.

## Key Findings

### Recommended Stack

The v1.0 stack requires no version changes. Three new npm packages are needed: `next-themes` (^0.4.6) for user-controlled light/dark/system toggle without FOUC, `clsx` (^2.x) for conditional class logic, and `tailwind-merge` (^3.x — required for Tailwind v4 compatibility) for the `cn()` utility. Two UI components (fancycomponents.dev Typewriter and spectrum-ui Stacked Circular Footer) are copy-paste integrations, not npm packages — their dependencies (Framer Motion, lucide-react) are already installed. The `tailwind-merge` v2 → v3 distinction is critical: v2 does not understand Tailwind v4's CSS variable color system and will silently drop or incorrectly merge classes.

**Core technologies:**
- `next-themes ^0.4.6`: User-toggled dark mode with no hydration flash — the only substantive new dependency
- `clsx ^2.x`: Conditional class logic in components — standard shadcn/ui pattern
- `tailwind-merge ^3.x`: Tailwind v4 class conflict resolution — must be v3, not v2
- `Bricolage Grotesque` (Google Fonts, variable): Display/heading typeface — warm personality, free, variable weight
- `Figtree` (Google Fonts): Body/UI copy — minimalist but warm, pairs naturally with Bricolage Grotesque
- Fancycomponents Typewriter (copy-paste): Hero animated text — uses existing Framer Motion install
- Spectrum-UI Stacked Circular Footer (copy-paste): Distinctive footer — uses existing lucide-react install

### Expected Features

**Must have (table stakes) — v1.1:**
- Design token CSS vars (light + dark) — all semantic tokens defined before any component work
- Typography setup — Bricolage Grotesque + Figtree via `next/font/google` in layout.tsx
- Warm light-mode-first palette — cream/amber/sky-blue, OKLCH values
- Warm dark mode — dark brown near-black, not cold slate-950 or pure black
- Dark mode toggle — `next-themes` with system-preference default and user override
- Primary CTA button redesign — amber background, 10px radius, hover/focus states
- Card component redesign — 16px radius, warm shadow, hover lift
- Generation form redesign — inputs, tag chips, submit button
- Hero section redesign — Bricolage Grotesque headline, typewriter in brand color
- Waveform player color theming — amber for progress bar (JS re-init on theme change)
- Loading skeleton — shimmer animation in warm muted tones
- `/style-guide` dev page — color swatches, type scale, all button/form/card variants, contrast audit

**Should have — v1.1.x (after validation):**
- Micro-interaction polish — card hover lifts (Framer Motion `whileHover`), button bounce
- Stacked circular footer — spectrum-ui component with brand tokens applied
- Scribble SVG accent underlines — hero section key phrases
- Spot illustrations — 1-2 custom SVGs for empty states

**Defer — v2+:**
- Custom icon set — high effort, Lucide is sufficient for v1
- Figma design file / design-to-code sync — not worth the overhead until team scales
- Brand animation system (Lottie) — significant effort, low current ROI

### Architecture Approach

The design system follows a three-tier CSS architecture: `src/styles/tokens/primitives.css` holds raw brand palette values (OKLCH color scales, type scale, spacing), `src/styles/tokens/semantic.css` maps those primitives to purpose-driven tokens (`:root` for light, `.dark` for dark override), and `src/app/globals.css` bridges semantic tokens to Tailwind utility classes via `@theme inline`. This separation means brand palette changes touch only primitives, semantic meaning changes touch only semantic.css, and the Tailwind bridge remains stable. The `@custom-variant dark (&:where(.dark, .dark *))` directive in globals.css wires Tailwind's `dark:` prefix to next-themes' class-based switching on `<html>`.

**Major components:**
1. `src/styles/tokens/primitives.css` — raw OKLCH color scales, type scale, custom spacing values; never referenced directly in components
2. `src/styles/tokens/semantic.css` — `:root` (light) + `.dark` (dark) semantic token blocks; the single source of truth for all component styling
3. `src/app/globals.css` — `@import` chain + `@custom-variant dark` + `@theme inline` bridge; generates all Tailwind token utilities
4. `src/lib/providers.tsx` — next-themes `ThemeProvider` wrapper (client component); wraps layout.tsx children
5. `src/components/ui/theme-toggle.tsx` — toggle button using `useTheme()`; placed in navigation
6. `src/app/style-guide/page.tsx` — living design reference; validates all tokens and components in both modes; gated from production
7. Existing feature components — audited for hardcoded colors, then updated to consume semantic token utility classes

### Critical Pitfalls

1. **CSS variable format mismatch (transparent components)** — Any existing shadcn v3-style `--background: 0 0% 100%` (bare HSL channels) mixed with Tailwind v4's `@theme inline` (which expects full `hsl(0 0% 100%)` values) causes transparent or invisible component backgrounds. Convert all `:root` variables to full-value format before adding `@theme inline`. Detected via transparent card/button backgrounds in DevTools. Fix in Token Foundation phase.

2. **Tailwind v4 border default breaks all borders** — Tailwind v4 changed `border` default from `gray-200` to `currentColor`. Every bare `border` class renders a dark/black outline matching text color. Audit for bare `border` classes before any globals.css changes; add `border border-border` everywhere or set `*, *::before, *::after { border-color: var(--border) }` globally. Fix in Token Foundation phase.

3. **Dark mode FOUC on hard refresh** — Without `suppressHydrationWarning` on `<html>` and correct next-themes config (`attribute="class"`, `enableSystem`, `disableTransitionOnChange`), dark-mode users see a full-brightness white flash on every page load. Configure ThemeProvider in Token Foundation phase before any color work.

4. **wavesurfer.js waveform colors don't update on theme switch** — The Shadow DOM doesn't inherit outer CSS variables. `waveColor: "var(--primary)"` has no effect. Read computed CSS variable values in JavaScript using `getComputedStyle`, and re-initialize wavesurfer when `resolvedTheme` changes by including it in the `useEffect` dependency array.

5. **Hardcoded color classes survive token refactor** — Existing components use `bg-zinc-900`, `text-slate-400`, etc. These override the token system silently. Run grep audit for palette-specific classes before starting component restyling; replace all with semantic token equivalents (`bg-background`, `text-foreground`, etc.).

6. **Yellow/amber accent fails WCAG AA on light backgrounds** — Bright amber at high lightness (~65% OKLCH L) has ~1.1:1 contrast against white/cream — effectively invisible as text. Never use accent color as foreground text on light backgrounds. Use only as background fill with dark foreground text. Verify all token pairs at accessiblepalette.com before finalizing tokens.

## Implications for Roadmap

Based on research, the wave structure from ARCHITECTURE.md maps cleanly to phases. The hard dependency chain is: tokens → theme infrastructure → style guide stub → component audit → component redesign → animation polish → footer completion. Nothing in the visual redesign can proceed correctly without the token foundation in place.

### Phase 1: Token Foundation + Theme Infrastructure

**Rationale:** Every subsequent phase depends on semantic tokens existing and the dark mode mechanism being correct. Building components before tokens means hardcoding values that must be refactored. Setting up dark mode after components are built means retrofitting instead of testing as you go. This is the non-optional first phase — all three critical infrastructure pitfalls (CSS variable format, border defaults, dark mode FOUC) are addressed here.

**Delivers:** All semantic CSS tokens defined in a split primitives/semantic file structure (light + dark), Tailwind v4 `@theme inline` bridge operational, `@custom-variant dark` wired up, next-themes configured with `suppressHydrationWarning`, theme toggle functional, `/style-guide` page stub with color swatches and contrast audit visible.

**Addresses from FEATURES.md:** Design token CSS vars, typography setup (Bricolage Grotesque + Figtree loaded via next/font), dark mode toggle, warm light-mode palette, warm dark mode.

**Avoids from PITFALLS.md:** CSS variable format mismatch (Pitfall 1), Tailwind v4 border default change (Pitfall 2), dark mode FOUC (Pitfall 3), yellow/amber contrast failures (Pitfall 4).

**Needs phase research:** No — patterns are fully documented at HIGH confidence. The ARCHITECTURE.md build order is the implementation plan.

### Phase 2: Component Audit + Core Component Redesign

**Rationale:** With tokens and theme infrastructure established, run the hardcoded color grep audit first, then systematically restyle each component using semantic token utilities. Audit before restyle prevents discovering hardcoded overrides after the redesign appears "done." Waveform theming integration belongs here because it requires tokens (to read resolved values) and theme switching (to test `resolvedTheme` re-init).

**Delivers:** All existing components using semantic token classes (no hardcoded palette classes remaining), GenerationForm redesigned (amber CTA, warm inputs, pill chips), VariantCard redesigned (16px radius, hover lift, amber waveform), Hero section redesigned (Bricolage Grotesque headline, typewriter placeholder in brand color), waveform color JS re-init on theme switch confirmed working, loading skeleton shimmer in warm muted tones.

**Addresses from FEATURES.md:** All P1 component features — buttons, cards, form, hero, waveform, loading states.

**Avoids from PITFALLS.md:** Hardcoded colors surviving redesign (Pitfall 8), wavesurfer wrong colors on theme switch (Pitfall 7).

**Needs phase research:** No — component patterns are standard; wavesurfer re-init pattern is code-ready in PITFALLS.md.

### Phase 3: Animation + Micro-interactions

**Rationale:** Animations are additive polish on top of a correctly styled base. Adding Framer Motion animations before components are correctly tokenized wastes iteration cycles. The critical constraint from PITFALLS.md is that Framer Motion components must be isolated in leaf `"use client"` components — never added to Server Component parent files. This phase also addresses CLS risks (typewriter container `min-h`, `AnimatePresence` + stable keys for generation flow transitions).

**Delivers:** Fancycomponents Typewriter integrated in hero with correct brand font and color, `min-h` container preventing CLS, card hover lift (`whileHover: { y: -2 }`), generation form → results `AnimatePresence` transition with stable keys, `LazyMotion` wrapping to reduce Framer bundle from 34KB to ~4.6KB, `prefers-reduced-motion` fallbacks on all animations.

**Addresses from FEATURES.md:** Micro-interaction polish, typewriter in hero, playful motion differentiator.

**Avoids from PITFALLS.md:** Framer Motion `"use client"` boundary pollution (Pitfall 5), typewriter CLS (Pitfall 10), layout animation CLS on generation page (Pitfall 6), full Framer Motion bundle import (Performance Traps).

**Needs phase research:** No — patterns fully documented in PITFALLS.md with implementation-ready code examples.

### Phase 4: Footer + Style Guide Completion

**Rationale:** The spectrum-ui Stacked Circular Footer is low-risk but has a confirmed mobile overflow pitfall that requires real-device testing at 375px. Addressing it in its own phase ensures the rest of the app is stable before adding the footer's overflow concerns. The `/style-guide` page also needs its final completion pass to include all redesigned components — this is the verification step confirming the entire design system is coherent and production-ready.

**Delivers:** Spectrum-ui footer adapted with brand tokens, `overflow-hidden` wrapper preventing horizontal scroll on mobile, tested at 375px on a real device. `/style-guide` page complete with all token sections, all component variants, all animated demos, contrast ratios shown, gated from production via `NODE_ENV` check.

**Addresses from FEATURES.md:** Stacked circular footer (P2), `/style-guide` page completion, production gating.

**Avoids from PITFALLS.md:** Footer mobile horizontal scroll (Pitfall 9), `/style-guide` exposed in production (UX Pitfalls).

**Needs phase research:** No — standard patterns. Mobile overflow fix is documented.

### Phase Ordering Rationale

- **Tokens first is non-negotiable:** ARCHITECTURE.md is explicit — "Wave 0 must ship before any component work." FEATURES.md confirms "tokens must be defined before any component work." PITFALLS.md documents exactly how wrong this goes (transparent backgrounds, wrong border colors, permanent FOUC).
- **Theme infrastructure in Phase 1, not its own phase:** The ThemeProvider wrapper and `suppressHydrationWarning` setup is a ~30-line change. Deferring it means every screenshot, every review, every test potentially shows the wrong theme or a flash.
- **Style guide stub in Phase 1, completion in Phase 4:** Building the stub early gives a visual reference frame during component redesign. Completing it last verifies the whole system is coherent.
- **Audit before restyle in Phase 2:** Running the grep audit for hardcoded colors before any component work reveals the full scope. Discovering them after "done" is expensive rework.
- **Animation last (Phase 3):** Animations are purely additive. They layer on correctly styled components. Doing them earlier means animating incorrectly styled components.

### Research Flags

Phases with standard patterns (skip `/gsd:research-phase`):
- **Phase 1 (Token Foundation):** Fully documented by official Tailwind v4 and shadcn/ui v4 docs. ARCHITECTURE.md contains implementation-ready code examples. No unknowns.
- **Phase 2 (Component Redesign):** Standard token application patterns. wavesurfer re-init code pattern is ready in PITFALLS.md.
- **Phase 3 (Animations):** Framer Motion patterns documented at official-docs level. Specific `LazyMotion`, `AnimatePresence`, and `"use client"` boundary patterns are code-ready in PITFALLS.md.
- **Phase 4 (Footer + Style Guide):** Copy-paste component. Mobile overflow fix is documented. Production gating is a standard `NODE_ENV` check.

No phases in this milestone require `/gsd:research-phase` — all patterns are covered at HIGH confidence with implementation-ready examples.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Official npm and framework docs verified for all 3 new packages; version compatibility confirmed; tailwind-merge v3/v4 is MEDIUM (community-confirmed, not official changelog) |
| Features | MEDIUM-HIGH | Color values (OKLCH) are derived from research patterns, need browser contrast verification before finalizing; all other feature decisions are HIGH |
| Architecture | HIGH | Three-tier token pattern from official Tailwind v4 + shadcn/ui v4 docs; next-themes from GitHub source; `@theme inline` behavior from GitHub official discussion |
| Pitfalls | HIGH | shadcn/ui GitHub issues cited by number; Tailwind v4 release notes; WCAG official source; wavesurfer Shadow DOM behavior confirmed in wavesurfer GitHub discussion |

**Overall confidence:** HIGH

### Gaps to Address

- **Exact OKLCH color values need contrast verification:** FEATURES.md notes MEDIUM confidence on the specific color values. All token pairs (especially `--muted-foreground` on `--background` and `--accent` as text) must be verified through [accessiblepalette.com](https://accessiblepalette.com) before the Phase 1 token file is finalized. Build the contrast audit into the `/style-guide` page as a first-class feature, not an afterthought.
- **tailwind-merge v3/v4 compatibility edge cases:** Confirmed via community sources rather than an official changelog entry. If unexpected class conflicts appear during Phase 2 component work, check the tailwind-merge GitHub issues for v4-specific reports before debugging the token system.
- **Bricolage Grotesque + Figtree on target mobile devices:** Font pairing is research-validated but should be visually QA'd on iOS Safari and Android Chrome, where variable font rendering can differ from desktop Chrome. Flag for QA during Phase 2 hero section work.

## Sources

### Primary (HIGH confidence)
- Tailwind CSS v4 official docs (`@theme`, `@custom-variant`, dark mode) — https://tailwindcss.com/docs/dark-mode
- Tailwind CSS v4 theme variables — https://tailwindcss.com/docs/theme
- shadcn/ui Tailwind v4 integration — https://ui.shadcn.com/docs/tailwind-v4
- shadcn/ui theming with CSS variables — https://ui.shadcn.com/docs/theming
- next-themes GitHub (pacocoursey/next-themes) — suppressHydrationWarning, App Router, FOUC prevention — https://github.com/pacocoursey/next-themes
- fancycomponents.dev installation + typewriter docs — https://www.fancycomponents.dev/docs/components/text/typewriter
- spectrum-ui footer docs — https://ui.spectrumhq.in/docs/footer
- WCAG 2.1 contrast minimum (1.4.3) — https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html
- shadcn/ui GitHub Issue #4845 — CSS variable format mismatch (transparent backgrounds)
- Tailwind CSS v4.0 release notes — border default change to `currentColor` — https://tailwindcss.com/blog/tailwindcss-v4
- Motion (Framer Motion) performance guide — https://motion.dev/docs/performance
- Martin Fowler — Design Token-Based UI Architecture (three-tier pattern)
- Tailwind v4 `@theme inline` GitHub discussion — https://github.com/tailwindlabs/tailwindcss/discussions/15600

### Secondary (MEDIUM confidence)
- tailwind-merge npm — v3 adds Tailwind v4 support (community-confirmed) — https://www.npmjs.com/package/tailwind-merge
- Tailwind v4 dark mode with next-themes `@custom-variant` pattern — https://iifx.dev/en/articles/456423217
- Dark mode in Next.js 15 + Tailwind v4 (community) — https://www.sujalvanjare.com/blog/dark-mode-nextjs15-tailwind-v4
- Blue + amber pairing for youthful brands — Venngage color research (confirmed range #8ecae6 / #ffb703)
- 2025 design trends (playful warmth, imperfect elements) — Framer blog, Lummi blog
- shadcn/ui GitHub Issue #5552 — ThemeProvider hydration error in Next.js 15
- WebAIM Million 2024 — color contrast #1 accessibility violation (83.6% of sites) — https://webaim.org/articles/contrast/

### Tertiary (LOW confidence / needs validation)
- Exact OKLCH color values in FEATURES.md — derived from warm brand research patterns, need browser contrast verification before shipping to production

---
*Research completed: 2026-03-05*
*Ready for roadmap: yes*
