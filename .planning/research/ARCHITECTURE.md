# Architecture Research

**Domain:** Design system, brand kit, and light/dark theming for Next.js + Tailwind v4 + shadcn/ui
**Researched:** 2026-03-05
**Confidence:** HIGH (Tailwind v4 @theme mechanics, next-themes, shadcn/ui v4 integration — all verified against official docs and current sources)

---

## Note on Prior Architecture Document

The original ARCHITECTURE.md (v1.0, researched 2026-03-03) covered backend infrastructure: RunPod, ACE-Step, BFF pattern, credit deduction, Stripe. That content remains valid for Phase 1 concerns. This document replaces it with v1.1 design system architecture. The v1.0 content is preserved in `.planning/phases/01-*/` plan files.

---

## Standard Architecture

### System Overview: Design Token Flow

```
┌──────────────────────────────────────────────────────────────────────┐
│                      DESIGN TOKEN LAYERS                              │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │  LAYER 1: Primitive Tokens  (src/styles/tokens/primitives.css)  │ │
│  │  Raw values — not used directly in components                    │ │
│  │  --color-blue-400: oklch(0.67 0.15 235)                         │ │
│  │  --color-yellow-300: oklch(0.87 0.19 98)                        │ │
│  │  --font-size-xl: 1.25rem                                         │ │
│  │  --spacing-4: 1rem                                               │ │
│  └──────────────────────────────┬──────────────────────────────────┘ │
│                                 │ reference only                      │
│  ┌──────────────────────────────▼──────────────────────────────────┐ │
│  │  LAYER 2: Semantic Tokens   (src/styles/tokens/semantic.css)    │ │
│  │  Purpose-driven — these are what components actually use         │ │
│  │  :root (light) and .dark (dark) CSS variable blocks              │ │
│  │  --background: var(--color-white)          (light)               │ │
│  │  --primary: var(--color-blue-400)          (light)               │ │
│  │  --accent: var(--color-yellow-300)         (light)               │ │
│  └──────────────────────────────┬──────────────────────────────────┘ │
│                                 │ mapped via @theme inline            │
│  ┌──────────────────────────────▼──────────────────────────────────┐ │
│  │  LAYER 3: Tailwind Utilities  (src/app/globals.css @theme inline)│ │
│  │  Bridges semantic tokens to Tailwind utility class generation    │ │
│  │  --color-background: var(--background)                           │ │
│  │  --color-primary: var(--primary)                                 │ │
│  │  → generates: bg-background, text-primary, border-accent, etc.  │ │
│  └──────────────────────────────┬──────────────────────────────────┘ │
│                                 │ consumed by                         │
│  ┌──────────────────────────────▼──────────────────────────────────┐ │
│  │  COMPONENTS                                                       │ │
│  │  shadcn/ui components + feature components                       │ │
│  │  Use utility classes: bg-background, text-primary, etc.         │ │
│  │  Never hardcode raw values; always reference semantic tokens     │ │
│  └─────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────┘
```

### Theme Switching Data Flow

```
User clicks theme toggle
    ↓
ThemeToggle component calls setTheme('dark' | 'light' | 'system')
    ↓
next-themes adds/removes .dark class on <html> element
    ↓
@custom-variant dark (&:where(.dark, .dark *))
activates dark: utility classes throughout the tree
    ↓
CSS variables in :root are OVERRIDDEN by .dark block:
  .dark { --background: oklch(0.12 0.02 235); ... }
    ↓
All components reading var(--background) via bg-background
automatically reflect the new value — zero component changes
```

### Component Responsibilities

| Component | Responsibility | Implementation |
|-----------|----------------|----------------|
| `src/styles/tokens/primitives.css` | Raw color/scale palette — brand's full color vocabulary | CSS custom properties, no utility class generation |
| `src/styles/tokens/semantic.css` | Light/dark semantic token definitions | `:root` block (light) + `.dark` block (dark override) |
| `src/app/globals.css` | Tailwind entry point, `@theme inline` bridge, `@custom-variant dark`, animations | Single import chain + @theme inline block |
| `src/lib/providers.tsx` | Wraps app with `ThemeProvider` from next-themes | Client component, attribute="class" strategy |
| `src/app/layout.tsx` | Applies font CSS variables, wraps with Providers | `suppressHydrationWarning` on `<html>` |
| `src/app/style-guide/page.tsx` | Dev-only page showing all tokens, components, typography | Static route, no auth, excluded from sitemap |
| `src/components/ui/theme-toggle.tsx` | Light/dark/system toggle button | Uses `useTheme()` from next-themes |

---

## Recommended Project Structure

```
src/
├── app/
│   ├── globals.css              # MODIFIED — import chain + @custom-variant dark + @theme inline
│   ├── layout.tsx               # MODIFIED — add <Providers>, suppressHydrationWarning
│   ├── style-guide/
│   │   └── page.tsx             # NEW — dev-only design system showcase
│   └── page.tsx                 # MODIFIED — visual redesign
│
├── styles/                      # NEW directory
│   └── tokens/
│       ├── primitives.css       # NEW — raw color/scale values
│       └── semantic.css         # NEW — :root + .dark semantic variable blocks
│
├── lib/
│   └── providers.tsx            # NEW — next-themes ThemeProvider wrapper
│
└── components/
    ├── ui/
    │   ├── theme-toggle.tsx     # NEW — light/dark/system switcher
    │   └── [existing shadcn]    # UNCHANGED — consume tokens via utility classes
    ├── brand/                   # NEW directory
    │   ├── Logo.tsx             # NEW — SVG logo component
    │   └── LogoMark.tsx         # NEW — icon-only variant
    └── [existing feature components]  # MODIFIED — updated to use semantic token classes
```

### New vs Modified Files

| File | Status | What Changes |
|------|--------|-------------|
| `src/app/globals.css` | MODIFIED | Add `@import` for token files, add `@custom-variant dark`, replace inline vars with `@import` reference |
| `src/app/layout.tsx` | MODIFIED | Wrap `{children}` in `<Providers>`, add `suppressHydrationWarning` to `<html>` |
| `src/styles/tokens/primitives.css` | NEW | Full color scale palette (primitives only) |
| `src/styles/tokens/semantic.css` | NEW | `:root` + `.dark` semantic token blocks (migrated from globals.css, expanded) |
| `src/lib/providers.tsx` | NEW | Client component wrapping next-themes `ThemeProvider` |
| `src/components/ui/theme-toggle.tsx` | NEW | Toggle button using `useTheme()` |
| `src/app/style-guide/page.tsx` | NEW | Dev showcase page |
| `src/components/brand/Logo.tsx` | NEW | Brand logo SVG component |
| All feature components | MODIFIED | Update class names to use semantic token utilities |

---

## Architectural Patterns

### Pattern 1: Two-File Token Split (Primitives → Semantic)

**What:** Raw color values live in `primitives.css` and are never used in components. Semantic tokens in `semantic.css` reference primitives and define how colors are used (background, primary, muted, etc.). Both are imported into `globals.css`.

**When to use:** Always. This is the standard design system approach. It enables brand color changes (update primitives) without touching semantic meaning, and semantic meaning changes (e.g. swap what "primary" points to) without touching raw values.

**Trade-offs:** Adds one layer of indirection. Worth it for any project expecting visual redesign iterations. Overkill for a one-page micro-site; right-sized for this app.

**Example:**

```css
/* src/styles/tokens/primitives.css */
:root {
  /* Brand palette — raw values only */
  --color-sky-300: oklch(0.78 0.13 220);
  --color-sky-400: oklch(0.67 0.15 222);
  --color-sky-500: oklch(0.55 0.17 224);
  --color-yellow-200: oklch(0.93 0.17 100);
  --color-yellow-300: oklch(0.87 0.19 98);
  --color-yellow-400: oklch(0.79 0.19 96);
  --color-cream-50:  oklch(0.98 0.02 90);
  --color-cream-100: oklch(0.95 0.03 88);
  --color-slate-800: oklch(0.22 0.02 250);
  --color-slate-900: oklch(0.16 0.02 252);
  --color-slate-950: oklch(0.12 0.02 252);

  /* Typography scale */
  --font-size-xs:   0.75rem;
  --font-size-sm:   0.875rem;
  --font-size-base: 1rem;
  --font-size-lg:   1.125rem;
  --font-size-xl:   1.25rem;
  --font-size-2xl:  1.5rem;
  --font-size-3xl:  1.875rem;
  --font-size-4xl:  2.25rem;
  --font-size-5xl:  3rem;

  /* Spacing scale (extends Tailwind defaults) */
  --space-18: 4.5rem;
  --space-22: 5.5rem;
}
```

```css
/* src/styles/tokens/semantic.css */

/* Light mode (default) */
:root {
  --background:           var(--color-cream-50);
  --foreground:           var(--color-slate-800);
  --card:                 oklch(1 0 0);
  --card-foreground:      var(--color-slate-800);
  --primary:              var(--color-sky-400);
  --primary-foreground:   oklch(1 0 0);
  --secondary:            var(--color-yellow-200);
  --secondary-foreground: var(--color-slate-800);
  --accent:               var(--color-yellow-300);
  --accent-foreground:    var(--color-slate-800);
  --muted:                var(--color-cream-100);
  --muted-foreground:     oklch(0.55 0.02 248);
  --border:               oklch(0.88 0.02 88);
  --input:                oklch(0.88 0.02 88);
  --ring:                 var(--color-sky-400);
  --destructive:          oklch(0.59 0.22 29);
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-xl: 24px;
}

/* Dark mode override */
.dark {
  --background:           var(--color-slate-950);
  --foreground:           var(--color-cream-50);
  --card:                 var(--color-slate-900);
  --card-foreground:      var(--color-cream-50);
  --primary:              var(--color-sky-300);
  --primary-foreground:   var(--color-slate-950);
  --secondary:            oklch(0.22 0.03 252);
  --secondary-foreground: var(--color-cream-50);
  --accent:               var(--color-yellow-400);
  --accent-foreground:    var(--color-slate-950);
  --muted:                oklch(0.20 0.02 252);
  --muted-foreground:     oklch(0.65 0.02 248);
  --border:               oklch(0.24 0.02 252);
  --input:                oklch(0.24 0.02 252);
  --ring:                 var(--color-sky-300);
  --destructive:          oklch(0.65 0.22 29);
}
```

### Pattern 2: @theme inline as Bridge (Tailwind v4 Specific)

**What:** `@theme inline` in `globals.css` maps semantic CSS variables to Tailwind's utility class system. Without this bridge, `bg-background` doesn't exist — Tailwind doesn't know about your custom variables. `@theme inline` (not bare `@theme`) is critical because it tells Tailwind to generate utilities that resolve the variable at use site, not at definition site.

**When to use:** Every semantic token that needs a Tailwind utility class. All tokens in `semantic.css` should have a corresponding entry in `@theme inline`.

**Trade-offs:** None. This is the canonical Tailwind v4 + shadcn/ui pattern. The `inline` keyword is required for correct CSS variable resolution across component trees.

**Example:**

```css
/* src/app/globals.css */
@import "tailwindcss";
@import "../styles/tokens/primitives.css";
@import "../styles/tokens/semantic.css";

/* Enable class-based dark mode (next-themes adds .dark to <html>) */
@custom-variant dark (&:where(.dark, .dark *));

/* Bridge semantic tokens → Tailwind utility classes */
@theme inline {
  --color-background:          var(--background);
  --color-foreground:          var(--foreground);
  --color-card:                var(--card);
  --color-card-foreground:     var(--card-foreground);
  --color-primary:             var(--primary);
  --color-primary-foreground:  var(--primary-foreground);
  --color-secondary:           var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-accent:              var(--accent);
  --color-accent-foreground:   var(--accent-foreground);
  --color-muted:               var(--muted);
  --color-muted-foreground:    var(--muted-foreground);
  --color-border:              var(--border);
  --color-input:               var(--input);
  --color-ring:                var(--ring);
  --color-destructive:         var(--destructive);

  /* Typography */
  --font-sans:   var(--font-dm-sans);
  --font-serif:  var(--font-libre-baskerville);
  --font-mono:   var(--font-geist-mono);

  /* Radii */
  --radius-sm:   var(--radius-sm);
  --radius-md:   var(--radius-md);
  --radius-lg:   var(--radius-lg);
  --radius-xl:   var(--radius-xl);

  /* Animations */
  --animate-eq-bar: eq-bar 0.9s ease-in-out infinite alternate;
  --animate-wave:   wave 4s ease-in-out infinite;
}

/* Base styles */
body {
  background: var(--background);
  color: var(--foreground);
  font-family: var(--font-sans), ui-sans-serif, system-ui, sans-serif;
}

h1, h2, h3 {
  font-family: var(--font-serif), ui-serif, Georgia, serif;
}

@keyframes eq-bar {
  0%   { transform: scaleY(0.15); }
  100% { transform: scaleY(1); }
}

@keyframes wave {
  0%, 100% { transform: translateX(0); }
  50%       { transform: translateX(-5%); }
}
```

### Pattern 3: next-themes with Class Strategy

**What:** `next-themes` manages theme state, persists to `localStorage`, syncs with system preference, and applies the active theme by toggling the `.dark` class on `<html>`. This is the canonical approach for Next.js App Router — zero flicker on load because the class is set before hydration.

**When to use:** Whenever you need a user-controlled light/dark/system toggle. Using `@custom-variant dark (&:where(.dark, .dark *))` in CSS wires up Tailwind's `dark:` prefix to respond to this class.

**Trade-offs:** Requires a thin client component wrapper (`providers.tsx`) because `ThemeProvider` uses React context. `suppressHydrationWarning` on `<html>` is required to suppress the SSR/client mismatch warning when next-themes sets the class before hydration.

**Example:**

```tsx
// src/lib/providers.tsx
'use client';

import { ThemeProvider } from 'next-themes';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </ThemeProvider>
  );
}
```

```tsx
// src/app/layout.tsx
import { Providers } from '@/lib/providers';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${dmSans.variable} ${libreBaskerville.variable} ${geistMono.variable} antialiased`}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
```

```tsx
// src/components/ui/theme-toggle.tsx
'use client';

import { useTheme } from 'next-themes';
import { Sun, Moon, Monitor } from 'lucide-react';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
      {theme === 'dark' ? <Sun /> : <Moon />}
    </button>
  );
}
```

### Pattern 4: /style-guide Page Structure

**What:** A static Next.js page at `/style-guide` that renders every design token, typography style, and component variant in one scrollable view. Divided into named sections by anchor links. No auth required (dev-only page, can be gated in production via middleware if needed).

**When to use:** Throughout active development. Acts as a living contract between design intentions and implementation. Catches regressions immediately when tokens change.

**Trade-offs:** Requires maintenance discipline — add new components to the style guide when building them. Small overhead but high value for visual consistency.

**Suggested section structure:**

```
/style-guide
├── #colors         — Color swatches for all semantic + primitive tokens
│   ├── Light mode swatches (bg-background, bg-card, bg-primary, etc.)
│   └── Dark mode swatches (same tokens, different values)
├── #typography     — Font families, sizes, weights, line-heights
│   ├── Heading scale (h1–h6 with font-serif)
│   ├── Body scale (xs, sm, base, lg, xl with font-sans)
│   └── Mono scale (font-mono)
├── #spacing        — Spacing scale demonstration (padding/margin examples)
├── #radii          — Border radius examples (sm, md, lg, xl)
├── #shadows        — Box shadow examples
├── #animations     — Animated elements (eq-bar, wave, etc.)
├── #components     — Component showcase
│   ├── Buttons (primary, secondary, outline, ghost, destructive)
│   ├── Cards
│   ├── Inputs (text, textarea, select)
│   ├── Badges / chips
│   ├── Loading states
│   └── Audio player (waveform)
├── #brand          — Logo, logotype, brand assets
│   ├── Logo on light background
│   ├── Logo on dark background
│   └── Logo variants (full, mark, text-only)
└── #text-effects   — Special text effects
    ├── TextShimmer component demo
    └── Typewriter component demo
```

---

## Data Flow

### Theme Initialization (No Flicker)

```
Browser requests page
    ↓
Next.js SSR renders <html> (no .dark class yet)
    ↓
next-themes injects inline script in <head> BEFORE content paints:
  reads localStorage("theme") or prefers-color-scheme
  immediately sets <html class="dark"> or <html class="light">
    ↓
CSS variables in .dark block activate instantly
    ↓
React hydrates — suppressHydrationWarning suppresses class mismatch warning
    ↓
User sees correct theme with zero flash
```

### Token Consumption Flow (Component Rendering)

```
Tailwind processes globals.css at build time:
  @theme inline { --color-background: var(--background) }
    ↓
Generates: .bg-background { background-color: var(--background) }
           .text-foreground { color: var(--foreground) }
    ↓
Component renders: <div className="bg-background text-foreground">
    ↓
Browser resolves var(--background) from closest ancestor:
  - In light mode: :root sets --background → cream-50 value
  - In dark mode:  .dark sets --background → slate-950 value
    ↓
Correct color applied — no JavaScript needed for color switching
```

### Style Guide Page Data Flow

```
Developer visits /style-guide
    ↓
Page.tsx renders all design system sections (RSC — no client JS needed)
    ↓
Each color swatch reads bg-[token-name] utility class
    ↓
ThemeToggle in style guide header lets dev verify light/dark
    ↓
Both modes verifiable without leaving the page
```

---

## Build Order (This Milestone)

Dependencies must be built in this order — each step unlocks the next.

```
WAVE 0: Token Foundation (no visual output yet)
  1. Create src/styles/tokens/primitives.css  ← brand palette raw values
  2. Create src/styles/tokens/semantic.css    ← :root + .dark semantic blocks
  3. Modify src/app/globals.css              ← @import chain, @custom-variant dark, @theme inline
  Result: All utility classes available, dark mode wired up

WAVE 1: Theme Infrastructure
  4. npm install next-themes
  5. Create src/lib/providers.tsx            ← ThemeProvider wrapper
  6. Modify src/app/layout.tsx              ← add Providers, suppressHydrationWarning
  7. Create src/components/ui/theme-toggle.tsx
  Result: Theme switching works end-to-end

WAVE 2: Style Guide Page (reference implementation)
  8. Create src/app/style-guide/page.tsx    ← all sections, all tokens documented
  Result: Living design system reference in browser — validates Wave 0+1

WAVE 3: Brand Assets
  9. Create src/components/brand/Logo.tsx
  10. Create src/components/brand/LogoMark.tsx
  Result: Brand identity buildable into pages

WAVE 4: Component Redesign
  11. Update shadcn/ui component classes     ← leverage semantic token utilities
  12. Redesign HeroSection.tsx
  13. Redesign GenerationForm.tsx
  14. Redesign GenerationResults.tsx / VariantCard.tsx
  15. Redesign footer (stacked circular from spectrum-ui)
  Result: Full visual redesign applied

WAVE 5: Style Guide Completion
  16. Add all redesigned components to /style-guide
  Result: Style guide reflects final state
```

**Wave 0 must ship before any component work.** Trying to redesign components before tokens exist leads to hardcoded values that must be refactored later.

**Wave 2 (style guide) before Wave 4 (redesign)** gives you a reference frame during redesign — you see exactly what the tokens produce before applying them to production pages.

---

## Anti-Patterns

### Anti-Pattern 1: Mixing @theme and @theme inline

**What people do:** Put some tokens in bare `@theme {}` and others in `@theme inline {}` in the same file, inconsistently.

**Why it's wrong:** Bare `@theme` creates theme variables that resolve at definition time, not use time. When you use bare `@theme { --color-primary: var(--primary) }`, the utility class `.text-primary` outputs `color: var(--color-primary)`, which references the Tailwind theme variable, not your runtime CSS variable. This breaks dark mode because `.dark { --primary: ... }` changes the runtime variable but the utility class is pointing at the static theme variable.

**Do this instead:** Use `@theme inline` for all tokens that reference other CSS variables. The `inline` keyword makes generated utilities reference the *source* variable directly, enabling runtime CSS cascade (dark mode) to work correctly.

### Anti-Pattern 2: Putting :root and .dark Inside @layer base

**What people do:** Follow old shadcn/ui v3 patterns that wrap `:root` and `.dark` inside `@layer base {}`.

**Why it's wrong:** In Tailwind v4, `@layer base` has lower specificity than component styles. CSS variables defined in `@layer base` can be overridden unexpectedly. The shadcn/ui v4 migration guide explicitly says to move these out of `@layer base`.

**Do this instead:** Define `:root` and `.dark` as top-level CSS rules in your token file, outside any layer. Specificity is predictable and the variables cascade correctly.

### Anti-Pattern 3: Using prefers-color-scheme Media Query as Primary Dark Mode Mechanism

**What people do:** Rely solely on `@media (prefers-color-scheme: dark)` without implementing class-based switching (as the existing `globals.css` does).

**Why it's wrong:** Users cannot toggle the theme. The preference is OS-level only. Also conflicts with next-themes' class-based approach — both mechanisms fire simultaneously, causing specificity battles.

**Do this instead:** Use `@custom-variant dark (&:where(.dark, .dark *))` for class-based switching. Optionally add `defaultTheme="system"` in ThemeProvider to respect OS preference as the default, but let users override it.

### Anti-Pattern 4: Hardcoding Colors in Components

**What people do:** During rapid development, write `className="bg-slate-900 text-white"` directly in components instead of `className="bg-background text-foreground"`.

**Why it's wrong:** Dark mode breaks immediately. When the theme switches, `bg-slate-900` stays `bg-slate-900` — it doesn't know about semantic context. You end up with dark text on dark backgrounds or vice versa.

**Do this instead:** Always use semantic token utility classes (`bg-background`, `text-foreground`, `bg-primary`, `text-muted-foreground`, etc.). Only reach for raw Tailwind color classes inside `primitives.css` definitions or in the style guide swatches where you're intentionally showing raw values.

### Anti-Pattern 5: Defining All Tokens in globals.css

**What people do:** Keep everything in `globals.css` as a monolithic file (as the existing implementation does for primitives and semantics).

**Why it's wrong:** At scale, globals.css becomes a 300+ line file that's hard to navigate. It mixes concerns: import declarations, custom variants, theme bridge, primitives, semantics, base styles, and keyframes. Finding and updating a specific token requires scrolling through unrelated rules.

**Do this instead:** Split into `primitives.css`, `semantic.css`, imported by `globals.css`. Each file has a single concern. Primitives change when brand colors change; semantics change when token meaning changes; globals.css changes only when you're adding new Tailwind variants or animations.

---

## Integration Points

### Existing Code Integration

| Integration Point | Current State | What Changes |
|-------------------|---------------|--------------|
| `src/app/globals.css` | Inline `:root`, dark media query, `@theme inline` | Split tokens to separate files; replace media query with `.dark` class; keep `@theme inline` block (expanded) |
| `src/app/layout.tsx` | Bare fonts + `<html>` | Add `suppressHydrationWarning`, wrap `{children}` with `<Providers>` |
| `src/components/ui/` | Currently only text-shimmer, typewriter (unusual — no standard shadcn components installed yet) | Add theme-toggle; any new shadcn components install here |
| Feature components | Use inline color assumptions | Update class names to semantic token utilities; audit each component |
| `next-themes` | Not installed | Add to dependencies |

### Tailwind v4 Specific Behaviors

| Concern | Behavior | Action Required |
|---------|----------|-----------------|
| No `tailwind.config.js` | Tailwind v4 is CSS-first — all config in CSS | No action; already the case in this project |
| `darkMode: 'class'` config | This v3 config key does not exist in v4 | Use `@custom-variant dark` in CSS instead |
| `@theme` vs `@theme inline` | `inline` required for variable-referencing tokens | Use `@theme inline` for all CSS-variable-bridging tokens |
| OKLCH color format | Tailwind v4 and shadcn/ui v4 default to OKLCH | New tokens should use OKLCH; existing HSL tokens work but migrate gradually |
| Utility class generation | `@theme inline { --color-X: var(--X) }` generates `bg-X`, `text-X`, `border-X` | Every semantic token needs a `--color-*` entry to get utility classes |

---

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| Current (prototype, 5-10 users) | Single CSS token file split is sufficient. All tokens in one semantic.css file. |
| Multi-theme future (e.g., seasonal themes, per-user themes) | Add `src/styles/tokens/themes/` directory with per-theme overrides. next-themes supports custom theme names. |
| Design token sync with Figma | Consider Style Dictionary or Tokens Studio for Figma-to-code pipeline. Not needed for v1.1. |
| White-labeling | The three-tier token architecture supports it: swap semantic.css per tenant, primitives.css holds their brand palette. Far future concern. |

---

## Sources

- [Tailwind CSS v4 — Theme Variables (official docs)](https://tailwindcss.com/docs/theme) — HIGH confidence
- [Tailwind CSS v4 — Dark Mode with @custom-variant (official docs)](https://tailwindcss.com/docs/dark-mode) — HIGH confidence
- [shadcn/ui — Tailwind v4 Integration (official docs)](https://ui.shadcn.com/docs/tailwind-v4) — HIGH confidence
- [shadcn/ui — Theming with CSS Variables (official docs)](https://ui.shadcn.com/docs/theming) — HIGH confidence
- [next-themes — GitHub (pacocoursey/next-themes)](https://github.com/pacocoursey/next-themes) — HIGH confidence
- [Dark Mode in Next.js 15 + Tailwind v4 (sujalvanjare.com, 2025)](https://www.sujalvanjare.com/blog/dark-mode-nextjs15-tailwind-v4) — MEDIUM confidence
- [Tailwind v4 @theme inline discussion (GitHub tailwindlabs/tailwindcss #15600)](https://github.com/tailwindlabs/tailwindcss/discussions/15600) — HIGH confidence
- [Design Token-Based UI Architecture (Martin Fowler)](https://martinfowler.com/articles/design-token-based-ui-architecture.html) — HIGH confidence for three-tier pattern
- [Dark mode with Tailwind v4 and Next.js (thingsaboutweb.dev)](https://www.thingsaboutweb.dev/en/posts/dark-mode-with-tailwind-v4-nextjs) — MEDIUM confidence

---
*Architecture research for: Design system + brand kit + light/dark theming — Next.js 16 + Tailwind v4 + shadcn/ui*
*Researched: 2026-03-05*
