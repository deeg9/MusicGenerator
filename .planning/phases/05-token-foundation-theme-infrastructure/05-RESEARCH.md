# Phase 5: Token Foundation + Theme Infrastructure - Research

**Researched:** 2026-03-05
**Domain:** CSS design tokens (OKLCH), Tailwind v4 theme system, next-themes dark mode, next/font typography
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **Color Token Structure**: 5 shades per brand color (cream, amber, sky-blue): 50, 200, 400, 600, 800 equivalent. Primitive tokens in a separate CSS file (e.g. tokens/primitives.css) imported into globals.css. Semantic token names follow shadcn convention: --background, --foreground, --card, --muted, --accent, etc. OKLCH color format for all primitive values. Amber used for backgrounds and CTAs only — never as foreground text color (sidesteps WCAG contrast issue). Dark mode variants for all semantic tokens.
- **Dark Mode Behavior**: Default theme: light mode (warm cream palette is the brand signature). Theme toggle placement: top-right header area (sun/moon icon button). Two states only: light and dark (no system option). Instant color swap on toggle — no CSS transition between themes. next-themes ThemeProvider with suppressHydrationWarning, no FOUC.
- **Typography Scale**: Bold and playful vibe — heavier heading weights (700-800), tighter tracking. Hero headline: extra large (6xl-7xl / ~60-72px) with responsive scaling. Body text: 18px base (generous, modern, matches warm brand). Bricolage Grotesque for ALL headings (h1-h6) — consistent display font treatment. Figtree for body copy, labels, form controls. Replace current DM Sans + Libre Baskerville with the new font pair.
- **Style Guide Page**: Single scroll page with sections: Colors, Typography, Spacing/Radius, Shadows. Static labeled swatches (color boxes with name + value, type samples with size/weight). Respects current theme toggle — toggle to see other mode (no side-by-side). Production-gated from Phase 5 (NODE_ENV check, returns 404 in prod).

### Claude's Discretion
- Exact OKLCH values for each shade (verify contrast at accessiblepalette.com)
- Spacing token scale (likely 4px base grid)
- Shadow token definitions (subtle, medium, elevated)
- Border-radius token values (already have sm/md/lg/xl pattern)
- Tailwind v4 border regression fix approach
- Theme toggle icon animation (if any)

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| BRAND-01 | Design tokens define a warm color palette (cream, amber, sky-blue) in OKLCH format with light and dark mode variants | OKLCH primitive/semantic token file split; shadcn naming convention; @theme inline bridge |
| BRAND-02 | Typography uses Bricolage Grotesque for headings and Figtree for body text, loaded via next/font | next/font/google variable font patterns; CSS variable injection; @theme font mapping |
| BRAND-03 | Spacing, border-radius, and shadow tokens are defined in the Tailwind v4 @theme system | Tailwind v4 @theme namespace reference; --shadow-*, --spacing, --radius-* patterns |
| BRAND-04 | User can toggle between light and dark mode, with preference persisted and no FOUC on reload | next-themes ThemeProvider; @custom-variant dark; suppressHydrationWarning; localStorage persistence |
</phase_requirements>

---

## Summary

Phase 5 establishes the complete visual foundation: OKLCH design tokens, dark mode infrastructure, typography, spacing/shadow tokens, and a dev-only style guide page. The existing `globals.css` already has the @theme inline bridge structure — it needs migrating from HSL to OKLCH with new brand colors and the 15 semantic variables updated. The architecture is well-understood: primitives.css (raw OKLCH palette) imported into globals.css (semantic mappings + @theme bridge), with next-themes providing class-based dark mode via a `"use client"` ThemeProvider wrapper.

The three core technologies — Tailwind v4 CSS-first config, next-themes 0.4.6, and next/font — are all stable and well-documented. The key pitfalls are (1) the Tailwind v4 border regression that defaults borders to `currentColor` instead of your configured border token, (2) mounting-state guard required for the theme toggle to avoid hydration mismatches, and (3) the `@custom-variant dark` directive must be added to globals.css to enable class-based dark mode.

**Primary recommendation:** Split tokens into `src/app/tokens/primitives.css` (raw OKLCH palette) and keep semantic mappings in `globals.css`. Use `next-themes` with `attribute="class"`, `defaultTheme="light"`, `enableSystem={false}`, and `disableTransitionOnChange`. Add `@custom-variant dark (&:where(.dark, .dark *))` in globals.css immediately after `@import "tailwindcss"`.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next-themes | ^0.4.6 | Dark mode ThemeProvider, localStorage persistence, no-FOUC script | Industry standard for Next.js App Router dark mode; shadcn/ui recommended |
| tailwindcss | ^4 (already installed) | CSS-first config, @theme system for token exposure | Already in project; v4 removes tailwind.config.js in favor of CSS |
| next/font | built into Next.js | Google Font loading, self-hosting, CSS variable injection | Zero layout shift, no external requests, already used in project |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| lucide-react | ^0.577.0 (already installed) | Sun/Moon icons for theme toggle | Already installed — use `Sun` and `Moon` icons |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| next-themes | Manual script injection | next-themes handles FOUC prevention automatically; manual approach requires inline script in `<head>` |
| CSS @import primitives | Single globals.css | Separate file keeps primitives distinct and reusable; worth the extra file |
| OKLCH | HSL | OKLCH is perceptually uniform — shades look visually consistent; HSL hue drifts |

**Installation:**
```bash
npm install next-themes
```

---

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/
│   ├── tokens/
│   │   └── primitives.css       # Raw OKLCH palette (cream-50 through cream-800, etc.)
│   ├── globals.css              # @import tailwindcss, @import ./tokens/primitives.css,
│   │                            # @custom-variant dark, semantic :root/:root.dark vars, @theme inline
│   ├── layout.tsx               # next/font imports, ThemeProvider, suppressHydrationWarning
│   └── style-guide/
│       └── page.tsx             # Dev-only page (NODE_ENV guard)
├── components/
│   ├── theme-provider.tsx       # "use client" wrapper around NextThemesProvider
│   └── theme-toggle.tsx        # "use client" Sun/Moon toggle using useTheme
```

### Pattern 1: OKLCH Token File Split

**What:** Separate primitive tokens (raw palette values) from semantic tokens (purpose-driven aliases).
**When to use:** Always — this is the shadcn/ui convention and keeps the system legible.

```css
/* src/app/tokens/primitives.css */
/* Raw palette — never reference these directly in components */
:root {
  /* Cream scale (warm white) */
  --cream-50:  oklch(0.99 0.01 85);
  --cream-200: oklch(0.95 0.03 80);
  --cream-400: oklch(0.88 0.05 75);
  --cream-600: oklch(0.78 0.06 72);
  --cream-800: oklch(0.65 0.07 70);

  /* Amber scale (golden yellow — backgrounds/CTAs only) */
  --amber-50:  oklch(0.98 0.04 95);
  --amber-200: oklch(0.92 0.10 85);
  --amber-400: oklch(0.82 0.17 80);
  --amber-600: oklch(0.70 0.18 65);
  --amber-800: oklch(0.55 0.15 55);

  /* Sky-blue scale */
  --sky-50:  oklch(0.97 0.03 220);
  --sky-200: oklch(0.90 0.08 220);
  --sky-400: oklch(0.75 0.15 225);
  --sky-600: oklch(0.58 0.18 230);
  --sky-800: oklch(0.42 0.15 235);

  /* Neutrals for foreground/muted/card in dark mode */
  --neutral-900: oklch(0.18 0.01 240);
  --neutral-800: oklch(0.22 0.01 240);
  --neutral-700: oklch(0.30 0.01 240);
  --neutral-600: oklch(0.40 0.01 240);
  --neutral-400: oklch(0.58 0.01 240);
  --neutral-200: oklch(0.85 0.01 240);
  --neutral-100: oklch(0.94 0.01 240);
  --neutral-50:  oklch(0.97 0.005 240);
}
```

NOTE: These OKLCH values are **starting point estimates** (confidence: LOW). The planner should note that exact values MUST be contrast-verified at accessiblepalette.com or oklch.com before committing the primitives file. The CONTEXT.md explicitly flags this as a blocker.

### Pattern 2: Semantic Token Mapping with Dark Mode

**What:** Map primitives to purpose-named semantic tokens. Use `.dark` class selector for dark overrides.

```css
/* In globals.css — semantic layer */
@import "tailwindcss";
@import "./tokens/primitives.css";

@custom-variant dark (&:where(.dark, .dark *));

/* Light mode (default) */
:root {
  --background:          var(--cream-50);
  --foreground:          var(--neutral-900);
  --card:                oklch(1 0 0);            /* pure white cards on cream bg */
  --card-foreground:     var(--neutral-900);
  --primary:             var(--sky-600);
  --primary-foreground:  oklch(1 0 0);
  --accent:              var(--amber-400);
  --accent-foreground:   var(--neutral-900);       /* amber never on light text */
  --secondary:           var(--cream-200);
  --secondary-foreground: var(--neutral-800);
  --muted:               var(--cream-400);
  --muted-foreground:    var(--neutral-600);
  --destructive:         oklch(0.55 0.22 25);      /* warm red */
  --border:              var(--cream-400);
  --input:               var(--cream-400);
  --ring:                var(--sky-400);
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-xl: 24px;
}

/* Dark mode overrides via .dark class */
:root.dark {
  --background:          var(--neutral-900);
  --foreground:          var(--neutral-100);
  --card:                var(--neutral-800);
  --card-foreground:     var(--neutral-100);
  --primary:             var(--sky-400);
  --primary-foreground:  var(--neutral-900);
  --accent:              var(--amber-400);
  --accent-foreground:   var(--neutral-900);
  --secondary:           var(--neutral-700);
  --secondary-foreground: var(--neutral-100);
  --muted:               var(--neutral-700);
  --muted-foreground:    var(--neutral-400);
  --destructive:         oklch(0.65 0.20 25);
  --border:              var(--neutral-700);
  --input:               var(--neutral-700);
  --ring:                var(--sky-400);
}
```

### Pattern 3: Tailwind v4 @theme Inline Bridge

**What:** Map CSS variables to Tailwind utility class names. The `@theme inline` block tells Tailwind to generate color utilities that resolve via CSS variable at runtime (not at build time).

```css
/* In globals.css — after :root definitions */
@theme inline {
  /* Colors */
  --color-background:          var(--background);
  --color-foreground:          var(--foreground);
  --color-card:                var(--card);
  --color-card-foreground:     var(--card-foreground);
  --color-primary:             var(--primary);
  --color-primary-foreground:  var(--primary-foreground);
  --color-accent:              var(--accent);
  --color-accent-foreground:   var(--accent-foreground);
  --color-secondary:           var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted:               var(--muted);
  --color-muted-foreground:    var(--muted-foreground);
  --color-destructive:         var(--destructive);
  --color-border:              var(--border);
  --color-input:               var(--input);
  --color-ring:                var(--ring);

  /* Typography */
  --font-sans:    var(--font-figtree);
  --font-display: var(--font-bricolage);
  --font-mono:    var(--font-geist-mono);

  /* Radius */
  --radius-sm: var(--radius-sm);
  --radius-md: var(--radius-md);
  --radius-lg: var(--radius-lg);
  --radius-xl: var(--radius-xl);

  /* Shadows */
  --shadow-subtle:   0 1px 3px 0 oklch(0 0 0 / 0.06), 0 1px 2px -1px oklch(0 0 0 / 0.06);
  --shadow-medium:   0 4px 6px -1px oklch(0 0 0 / 0.08), 0 2px 4px -2px oklch(0 0 0 / 0.08);
  --shadow-elevated: 0 10px 15px -3px oklch(0 0 0 / 0.10), 0 4px 6px -4px oklch(0 0 0 / 0.10);

  /* Animations — preserve existing */
  --animate-eq-bar: eq-bar 0.9s ease-in-out infinite alternate;
  --animate-wave: wave 4s ease-in-out infinite;
}
```

### Pattern 4: next-themes ThemeProvider Setup

**What:** Wrap app in a "use client" provider that injects a no-FOUC script into `<head>` before first paint.

```typescript
// src/components/theme-provider.tsx
"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"

export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}
```

```typescript
// src/app/layout.tsx
import { Bricolage_Grotesque, Figtree, Geist_Mono } from 'next/font/google'
import { ThemeProvider } from '@/components/theme-provider'
import './globals.css'

const bricolage = Bricolage_Grotesque({
  variable: '--font-bricolage',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
})

const figtree = Figtree({
  variable: '--font-figtree',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
    >
      <body className={`${bricolage.variable} ${figtree.variable} ${geistMono.variable} antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
```

### Pattern 5: Theme Toggle Component

**What:** Client component using `useTheme` hook. Must guard against server render (undefined theme on server).

```typescript
// src/components/theme-toggle.tsx
"use client"

import { useTheme } from "next-themes"
import { Sun, Moon } from "lucide-react"
import { useEffect, useState } from "react"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Avoid hydration mismatch — only render after mount
  useEffect(() => setMounted(true), [])
  if (!mounted) return null

  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      aria-label="Toggle theme"
      className="p-2 rounded-md hover:bg-muted transition-colors"
    >
      {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
    </button>
  )
}
```

### Pattern 6: Style Guide Page (Dev-Only)

**What:** Production-gate via NODE_ENV. Returns 404 in production. Uses semantic tokens directly.

```typescript
// src/app/style-guide/page.tsx
import { notFound } from 'next/navigation'

export default function StyleGuidePage() {
  if (process.env.NODE_ENV === 'production') {
    notFound()
  }

  return (
    <main className="max-w-4xl mx-auto p-8 space-y-16">
      <h1 className="font-display text-4xl font-bold">Style Guide</h1>

      {/* Colors section */}
      <section>
        <h2 className="font-display text-2xl font-semibold mb-6">Colors</h2>
        {/* Color swatches — see Architecture Patterns for full swatch implementation */}
      </section>

      {/* Typography section */}
      <section>
        <h2 className="font-display text-2xl font-semibold mb-6">Typography</h2>
      </section>

      {/* Spacing / Radius section */}
      <section>
        <h2 className="font-display text-2xl font-semibold mb-6">Spacing & Radius</h2>
      </section>

      {/* Shadows section */}
      <section>
        <h2 className="font-display text-2xl font-semibold mb-6">Shadows</h2>
      </section>
    </main>
  )
}
```

NOTE: `process.env.NODE_ENV` is evaluated at build time in Next.js — `notFound()` in production means the route compiles away cleanly.

### Anti-Patterns to Avoid

- **Referencing primitive tokens in components:** Never use `var(--cream-400)` directly in JSX — always use semantic tokens (`var(--border)`). Primitives are only referenced inside `globals.css` semantic mappings.
- **Using `@media (prefers-color-scheme: dark)` with next-themes:** next-themes with `attribute="class"` uses the `.dark` class, not media query. Replace the existing `@media` block in globals.css with `:root.dark` selector.
- **Forgetting the mounted guard:** Rendering the theme toggle without checking `mounted` causes hydration mismatch warnings because `theme` is `undefined` on the server.
- **Adding CSS transitions to theme switch:** `disableTransitionOnChange` on ThemeProvider prevents the momentary color blend that causes perceived flicker during theme switch.
- **Putting ThemeProvider inside `<body>` vs wrapping `<body>` content:** ThemeProvider wraps children inside `<body>` — it cannot wrap `<html>` because it's a client component and `<html suppressHydrationWarning>` must remain in the server component layout.
- **Using `--font-serif` for Bricolage:** Map it to `--font-display` in @theme to avoid confusion — it's not a serif, it's a display/grotesque. Use a new key.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| FOUC prevention on dark mode | Inline `<script>` in `<head>` reading localStorage | next-themes | next-themes injects exactly this script automatically, handling all edge cases |
| Font self-hosting | Download + serve font files manually | next/font/google | next/font auto-downloads, subsets, and serves fonts with optimal caching headers |
| Theme persistence | Manual localStorage read/write | next-themes | Handles localStorage, cookies (for SSR), and system preference fallback |
| CSS variable dark mode toggle | JavaScript that swaps classes manually | next-themes + @custom-variant | next-themes handles class toggle + persistence; @custom-variant handles CSS selector |

**Key insight:** The "no FOUC" problem for dark mode is deceptively complex — it requires a blocking inline script before the React bundle loads. next-themes injects this automatically; hand-rolling it introduces race conditions.

---

## Common Pitfalls

### Pitfall 1: Tailwind v4 Border Regression (currentColor Default)

**What goes wrong:** All `border` utility classes render black borders instead of the configured `--border` token color. Any element using `class="border"` without an explicit color class gets black borders.

**Why it happens:** Tailwind v4 changed the default border color from `gray-200` to `currentColor` to match browser defaults. The project already uses `border` without color classes extensively.

**How to avoid:** Add to `globals.css` in `@layer base`:

```css
@layer base {
  *,
  ::after,
  ::before,
  ::backdrop,
  ::file-selector-button {
    border-color: var(--color-border, currentColor);
  }
}
```

This uses your semantic `--border` token (exposed as `--color-border` via `@theme inline`) as the default, falling back to `currentColor` if the variable is unavailable.

**Warning signs:** Black borders on cards, inputs, or dividers that should be gray.

### Pitfall 2: next-themes Hydration Mismatch Warning

**What goes wrong:** React console warning: "Warning: Prop `class` did not match." or theme toggle shows wrong icon on first render.

**Why it happens:** Server renders `<html>` without a theme class (server doesn't know the user's localStorage preference). Client rehydrates and next-themes adds `class="dark"` — this is a mismatch React warns about.

**How to avoid:**
1. Add `suppressHydrationWarning` to the `<html>` element (tells React this specific element's attributes may differ)
2. Add `mounted` guard to any component reading `useTheme()` before rendering theme-dependent UI

**Warning signs:** Hydration warnings in console; theme icon shows wrong state on first render.

### Pitfall 3: @custom-variant Dark Not Working

**What goes wrong:** `dark:` utility classes have no effect. Theme toggle adds `class="dark"` to `<html>` but no styles change.

**Why it happens:** Tailwind v4 defaults to `prefers-color-scheme` media query for `dark:`. Without `@custom-variant dark`, the `.dark` class does nothing to Tailwind utilities.

**How to avoid:** Place `@custom-variant dark (&:where(.dark, .dark *))` in `globals.css` immediately after `@import "tailwindcss"` — before any other rules.

**Warning signs:** Dark mode styles never apply despite `.dark` class being present on `<html>`.

### Pitfall 4: Bricolage Grotesque Import Name

**What goes wrong:** TypeScript error `Module '"next/font/google"' has no exported member 'Bricolage_Grotesque'`.

**Why it happens:** next/font uses underscores for spaces in font names. The correct import is `Bricolage_Grotesque` (not `BricolageGrotesque`).

**How to avoid:** Use exact name: `import { Bricolage_Grotesque, Figtree } from 'next/font/google'`. Bricolage Grotesque IS available on Google Fonts as a variable font with weights 200-800.

**Warning signs:** Import error at startup.

### Pitfall 5: OKLCH Values Failing Contrast

**What goes wrong:** Amber as text on cream background fails WCAG AA (4.5:1 minimum for normal text).

**Why it happens:** Amber at mid-lightness on a warm light background has insufficient contrast ratio. This is a known issue called out in CONTEXT.md.

**How to avoid:** The user decision already addresses this — amber is locked to backgrounds/CTAs only, never foreground text. OKLCH values for amber should stay at 400-600 range for accents; use `--foreground` (neutral dark) for any text on amber backgrounds.

**Warning signs:** Contrast checker failures for amber text on light backgrounds.

### Pitfall 6: OKLCH Browser Support for gamut values

**What goes wrong:** Colors look oversaturated or don't render in older browsers.

**Why it happens:** OKLCH can specify colors outside the sRGB gamut (P3 and beyond). These display as-is in P3-capable displays but may clip differently in sRGB-only contexts.

**How to avoid:** Keep chroma (C) values below ~0.18 for most colors to stay in sRGB gamut. Tailwind v4's built-in color palette uses OKLCH with chroma ≤ 0.37 for vivid colors, but for backgrounds and UI tokens, lower chroma (0.01-0.12) is appropriate. As of 2026, OKLCH enjoys 92%+ browser support including all evergreen browsers — this is a minor concern.

---

## Code Examples

### Existing Code to Preserve

```css
/* Keyframes in globals.css — must be preserved verbatim */
@keyframes eq-bar {
  0%   { transform: scaleY(0.15); }
  100% { transform: scaleY(1); }
}

@keyframes wave {
  0%, 100% { transform: translateX(0); }
  50%      { transform: translateX(-5%); }
}
```

### Tailwind v4 Border Fix (Complete)
```css
/* Source: tailwindcss.com/docs/upgrade-guide */
@layer base {
  *,
  ::after,
  ::before,
  ::backdrop,
  ::file-selector-button {
    border-color: var(--color-border, currentColor);
  }
}
```

### Dark Mode CSS Selector (not media query)
```css
/* Source: tailwindcss.com/docs/dark-mode */
/* CORRECT for next-themes class-based dark mode */
:root.dark {
  --background: var(--neutral-900);
  /* ... */
}

/* WRONG — media query does not respond to .dark class */
/* @media (prefers-color-scheme: dark) { ... } */
```

### Font Variable Pattern for Multiple Fonts
```typescript
// Source: nextjs.org/docs/app/getting-started/fonts
// Both fonts load as CSS variables; applied via body className

const bricolage = Bricolage_Grotesque({
  variable: '--font-bricolage',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
})

const figtree = Figtree({
  variable: '--font-figtree',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
})

// In layout: className={`${bricolage.variable} ${figtree.variable} ...`}
// In globals.css @theme: --font-display: var(--font-bricolage), --font-sans: var(--font-figtree)
// In globals.css body: font-family: var(--font-sans), ui-sans-serif, system-ui, sans-serif
// In globals.css h1-h6: font-family: var(--font-display), ui-sans-serif, system-ui, sans-serif
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `tailwind.config.js` darkMode: 'class' | `@custom-variant dark` in CSS | Tailwind v4 (2025) | No JS config file needed |
| HSL color values | OKLCH color values | CSS Color Level 4, widely supported 2025 | Perceptually uniform palettes, P3 gamut support |
| `@media prefers-color-scheme` dark mode | next-themes with class attribute | next-themes standard pattern | User preference persisted, no system-only lock |
| `darkMode: "class"` in tailwind.config | `@custom-variant dark (&:where(.dark, .dark *))` | Tailwind v4 | CSS-first configuration |

**Deprecated/outdated:**
- `tailwind.config.js`: Not used in Tailwind v4; this project already has no config file
- `@media (prefers-color-scheme: dark)` in globals.css: The existing block must be **replaced** with `:root.dark` selector
- `DM_Sans` and `Libre_Baskerville` imports in layout.tsx: Will be removed and replaced with `Bricolage_Grotesque` and `Figtree`
- `--font-dm-sans` and `--font-libre-baskerville` CSS variables in @theme: Will be replaced with `--font-bricolage` and `--font-figtree`

---

## Open Questions

1. **Exact OKLCH primitive values**
   - What we know: Cream = warm light tones (L ~0.95-0.99, C ~0.01-0.05, H ~75-90), Amber = golden (L ~0.7-0.95, C ~0.10-0.18, H ~65-95), Sky = cool blue (L ~0.55-0.97, C ~0.05-0.18, H ~215-235)
   - What's unclear: Whether the specific shade choices pass WCAG AA contrast in all required pairings
   - Recommendation: Start with estimates provided in Pattern 1, then verify at https://accessiblepalette.com before finalizing. This is a Claude's Discretion item — the planner should include a verification step in the plan.

2. **Bricolage Grotesque weights as variable font**
   - What we know: Available on Google Fonts, weights 200-800, confirmed variable font with weight/width/optical-size axes
   - What's unclear: Whether next/font supports the variable font axes (opsz, wdth) or only the weight axis
   - Recommendation: Load with explicit weights `['400', '500', '600', '700', '800']` — this is safe and doesn't require variable font axis configuration.

3. **Spacing token base scale**
   - What we know: Tailwind v4 uses `--spacing: 4px` as the base unit by default, generating a 4px grid
   - What's unclear: Whether the project needs custom spacing overrides beyond Tailwind's defaults
   - Recommendation: Do not override `--spacing` unless specific spacing tokens (e.g., section padding) are needed beyond the 4px grid. BRAND-03 can be satisfied by documenting the default scale plus custom values for spacing-specific tokens.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.0 + jsdom |
| Config file | `/Users/deeg/Documents/GitHub/MusicGenerator/vitest.config.ts` |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| BRAND-01 | CSS token file exports expected variable names | manual-only (CSS variables, no JS surface) | Visual inspection on /style-guide | N/A |
| BRAND-02 | Bricolage + Figtree load as CSS variables on body | manual-only (font loading, visual) | Visual inspection on /style-guide | N/A |
| BRAND-03 | Shadow, radius, spacing tokens render as swatches | manual-only | Visual inspection on /style-guide | N/A |
| BRAND-04 | ThemeProvider renders, theme toggles, no FOUC | smoke/manual | `npx vitest run src/components/theme-toggle.test.tsx` | ❌ Wave 0 |

**Manual-only justification:** CSS variable existence and visual font rendering cannot be tested in jsdom — jsdom does not process CSS files or render fonts. The /style-guide page IS the automated visual verification tool for BRAND-01 through BRAND-03.

### Sampling Rate
- **Per task commit:** `npx vitest run --reporter=verbose`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/components/theme-toggle.test.tsx` — covers BRAND-04 (ThemeProvider renders, toggle works, mounted guard present)

---

## Sources

### Primary (HIGH confidence)
- https://tailwindcss.com/docs/dark-mode — @custom-variant dark syntax, class-based dark mode
- https://tailwindcss.com/docs/theme — @theme namespace reference (--shadow-*, --spacing, --radius-*)
- https://tailwindcss.com/docs/upgrade-guide — Tailwind v4 border regression and fix
- https://nextjs.org/docs/app/getting-started/fonts — next/font/google variable font patterns
- https://ui.shadcn.com/docs/dark-mode/next — ThemeProvider setup, suppressHydrationWarning, layout.tsx wiring
- https://github.com/pacocoursey/next-themes — ThemeProvider props reference (defaultTheme, enableSystem, attribute, disableTransitionOnChange)

### Secondary (MEDIUM confidence)
- https://www.sujalvanjare.com/blog/dark-mode-nextjs15-tailwind-v4 — Complete Tailwind v4 + next-themes integration walkthrough
- https://fonts.google.com/specimen/Bricolage+Grotesque — Variable font availability and weight range confirmation
- https://github.com/tailwindlabs/tailwindcss/discussions/14508 — Community-confirmed border regression fix

### Tertiary (LOW confidence)
- OKLCH primitive values in Pattern 1 code example — estimates only, require contrast verification at accessiblepalette.com before use

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries verified via official docs and npm
- Architecture: HIGH — patterns confirmed via official Tailwind v4 docs, Next.js docs, and shadcn/ui docs
- OKLCH primitives: LOW — estimated starting values; require contrast verification before finalizing
- Pitfalls: HIGH — border regression and hydration issues confirmed via official Tailwind upgrade guide and next-themes README

**Research date:** 2026-03-05
**Valid until:** 2026-06-05 (90 days — Tailwind v4 and next-themes are stable; next/font is built into Next.js)
