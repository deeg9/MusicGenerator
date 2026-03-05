# Stack Research

**Domain:** Design tokens system, brand kit, component showcase, new UI components (Next.js + Tailwind v4)
**Researched:** 2026-03-05
**Confidence:** HIGH (Tailwind v4 token system verified against official docs; component models verified against official sites; next-themes confirmed compatible)

---

## Context: What Already Exists (Do Not Re-add)

The v1.0 stack is fully operational. This research covers ONLY new additions needed for the v1.1 brand redesign milestone.

| Already In Place | Version | Notes |
|------------------|---------|-------|
| Next.js | 16.1.6 | App Router, no changes needed |
| React | 19.2.3 | No changes needed |
| Tailwind CSS | ^4 | CSS-first config already in globals.css |
| Framer Motion | ^12.35.0 | Already installed — fancycomponents typewriter uses this |
| lucide-react | ^0.577.0 | Already installed — spectrum-ui footer uses this |
| TypeScript | ^5 | No changes needed |

---

## Recommended Stack — New Additions Only

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| next-themes | ^0.4.6 | Light/dark mode toggle with no flash | The project currently uses `prefers-color-scheme` media query only — no user-toggled theme switching. next-themes wraps the app with a ThemeProvider, writes a class or data attribute to `<html>`, and uses a script injection technique to prevent flash-of-unstyled-content (FOUC) on hydration. Works with Next.js App Router via a "use client" wrapper. Required for the `/style-guide` page to demonstrate both modes. |
| clsx | ^2.x | Conditional class name joining | The spectrum-ui footer and any custom components need conditional class logic. clsx handles arrays, objects, and conditionals cleanly. Already expected by shadcn-style component patterns. |
| tailwind-merge | ^3.x | Tailwind class conflict resolution | When passing className overrides to components (e.g., `<Button className="bg-red-500">`), tailwind-merge prevents duplicate/conflicting Tailwind utilities from both sides. Required for the `cn()` utility function that shadcn-style components use. |

### Component Sources (Copy-Paste, Not npm Packages)

These are NOT npm packages. They are copy-paste components. Their dependencies (Framer Motion, lucide-react) are already installed.

| Component | Source | Model | Dependencies Already Present |
|-----------|--------|-------|------------------------------|
| Typewriter | fancycomponents.dev — danielpetho | CLI or manual copy (`pnpm dlx shadcn add @fancy/typewriter`) | framer-motion ^12 (installed) |
| Stacked Circular Footer | ui.spectrumhq.in/docs/footer | Manual copy into `src/components/` | lucide-react (installed), shadcn-style Button/Input/Label |

**Key insight on the footer:** The spectrum-ui footer imports `@/components/ui/button`, `@/components/ui/input`, and `@/components/ui/label`. These are shadcn-style primitives. Since this project does NOT have shadcn installed, these need to be either: (a) manually copied from ui.shadcn.com as standalone files, or (b) written from scratch as simple wrappers. The primitives themselves are trivial — Button is ~50 lines, Input and Label are ~20 lines each. No Radix UI dependency is required for these three basic components.

### Supporting Utilities

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| clsx | ^2.1.x | Class name conditionals | Use in every component that accepts a `className` prop or has conditional state classes |
| tailwind-merge | ^3.x | Merge Tailwind utilities without conflicts | Use in the `cn()` utility function: `twMerge(clsx(inputs))` — this pattern is standard across all shadcn-style components |

---

## Design Token Architecture

The existing `globals.css` already implements the correct Tailwind v4 pattern: CSS custom properties in `:root` (and a dark media query override), mapped into Tailwind via `@theme inline`. This is the right approach and requires no new tooling.

**What the brand redesign changes — not the mechanism, only the values:**

```css
/* Current structure (correct — keep this) */
:root {
  --background: hsl(...);
  --primary: hsl(...);
  /* etc. */
}

@media (prefers-color-scheme: dark) {
  :root { /* dark overrides */ }
}

@theme inline {
  --color-background: var(--background);
  /* maps CSS vars → Tailwind utilities */
}
```

**With next-themes, the dark media query changes to a class selector:**

```css
/* Replace media query with .dark class for next-themes compatibility */
:root { /* light values */ }

.dark {
  --background: hsl(...);
  /* dark overrides */
}

/* In globals.css, tell Tailwind v4 how to detect dark mode */
@custom-variant dark (&:where(.dark, .dark *));
```

This is the only structural change to `globals.css` needed. The `@theme inline` block stays exactly as-is. All existing `bg-background`, `text-foreground` etc. utility classes continue working unchanged.

**Token categories to update with new brand values (no new tooling):**

| Category | Current State | What Changes |
|----------|--------------|--------------|
| Colors | Generic blue/yellow placeholders | Warm brand palette (baby blue, sunny yellow, soft whites, coral) |
| Typography | DM Sans + Libre Baskerville (already in layout.tsx fonts) | Font weights, sizes — possibly add display variant |
| Spacing | Not yet tokenized | Add `--spacing-*` tokens if needed for component-specific padding |
| Radii | `--radius-sm/md/lg/xl` already exist | Values may need adjustment for warm/rounded aesthetic |
| Shadows | Not yet in tokens | Add `--shadow-card`, `--shadow-button` for the warm aesthetic |
| Animations | `eq-bar` and `wave` exist | Add typewriter cursor animation token if needed |

---

## Installation

```bash
# New npm dependencies (3 packages)
npm install next-themes clsx tailwind-merge

# No new dev dependencies needed
# fancycomponents typewriter and spectrum-ui footer are copy-paste — no npm install
```

---

## File Structure for New Brand Additions

```
src/
  app/
    globals.css              # Update: replace media query with .dark, add @custom-variant
    layout.tsx               # Update: wrap with ThemeProvider from next-themes
    style-guide/
      page.tsx               # New: dev page showing all tokens and components
  components/
    ui/
      button.tsx             # New: minimal shadcn-style Button (for footer compatibility)
      input.tsx              # New: minimal shadcn-style Input (for footer compatibility)
      label.tsx              # New: minimal shadcn-style Label (for footer compatibility)
    brand/
      typewriter.tsx         # New: fancycomponents typewriter (copy from fancycomponents.dev)
      footer.tsx             # New: spectrum-ui stacked circular footer (adapted)
    theme-provider.tsx       # New: next-themes ThemeProvider wrapper ("use client")
  lib/
    utils.ts                 # New: cn() utility function (clsx + tailwind-merge)
```

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| next-themes | Manual cookie-based theme toggle | When you need SSR-rendered theme without any client-side flash AND want zero dependencies. Significantly more implementation work — not worth it here. |
| next-themes | `prefers-color-scheme` only (current approach) | When you never want a user toggle. The PROJECT.md specifies light + dark mode support with user control, so media-query-only is insufficient. |
| CSS custom properties in globals.css (current approach) | Style Dictionary / Token Studio | When you have a dedicated design team managing tokens in Figma and need a build pipeline from design tool → code. Overkill for a solo/small team project — the CSS approach is the correct Tailwind v4 native pattern. |
| clsx + tailwind-merge (`cn()`) | `classnames` package | classnames is older (lacks TypeScript-first DX), doesn't resolve Tailwind conflicts. tailwind-merge is the correct choice for Tailwind projects. |
| Copy-paste from fancycomponents.dev | `fancy-components` npm package (v0.0.23) | The npm package is 3 years old and unmaintained. The fancycomponents.dev site (danielpetho's current work) uses a shadcn CLI pattern — copy the source code, own it in your repo. |
| Minimal hand-rolled shadcn primitives (Button/Input/Label) | Full shadcn/ui init | Full shadcn init would add `components.json`, Radix UI dependencies, and rebuild the entire component system. The spectrum-ui footer only needs 3 trivial components — writing them directly is simpler and keeps the codebase lean. |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `fancy-components` npm package (npm.js) | Last published 3 years ago (v0.0.23), abandoned. Different from fancycomponents.dev. | Copy from fancycomponents.dev via `pnpm dlx shadcn add @fancy/typewriter` or manual copy |
| Full `shadcn init` / `components.json` | This project doesn't need the full shadcn system — adds Radix UI, a components.json config, and rebuilds things already working. The only shadcn-style things needed are 3 tiny primitives for the footer. | Hand-roll Button, Input, Label as minimal wrappers using `cn()` |
| `@apply` for design token classes | Tailwind v4 docs explicitly recommend against `@apply`. It makes CSS harder to debug and doesn't get IDE support. | Use `var(--token-name)` in custom CSS, or Tailwind utility classes directly in JSX |
| Storybook | Full Storybook setup is ~5 MB of dev dependencies and requires separate server. The `/style-guide` page is a Next.js page — faster to build and zero overhead. | `/style-guide` page in the app itself |
| CSS Modules for design tokens | Tokens defined in CSS Modules are scoped and can't be reused globally or accessed via `var()` in Tailwind. | CSS custom properties in `globals.css` (current approach — correct) |

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| next-themes ^0.4.6 | Next.js 16, App Router, React 19 | Wrap in a "use client" ThemeProvider component — server components cannot use context. FOUC prevention script works in App Router via `suppressHydrationWarning` on `<html>`. |
| tailwind-merge ^3.x | Tailwind CSS v4 | tailwind-merge v3 adds Tailwind v4 support. Do NOT use tailwind-merge v2 with Tailwind v4 — it doesn't understand v4's CSS variable-based color system and will incorrectly merge/drop classes. |
| clsx ^2.x | React 19, TypeScript 5 | No compatibility concerns. Pure utility. |
| fancycomponents typewriter | framer-motion ^12.35.0 (installed) | Framer Motion is already v12.35.0 in this project — no version conflict. Component uses standard motion APIs. |
| spectrum-ui footer | lucide-react ^0.577.0 (installed) | lucide-react is already installed. Footer imports Facebook, Instagram, Linkedin, Twitter icons — all present in v0.577.0. |

---

## Integration Pattern: next-themes with Tailwind v4

The current `globals.css` uses `@media (prefers-color-scheme: dark)` for dark mode. next-themes needs a class-based toggle instead. The migration is three steps:

**Step 1 — globals.css:** Replace the media query with a `.dark` class selector, add the Tailwind v4 custom variant.

```css
@import "tailwindcss";
@custom-variant dark (&:where(.dark, .dark *));

:root {
  /* light tokens */
}

.dark {
  /* dark tokens — same variables, different values */
}

@theme inline {
  /* unchanged — this block stays exactly as-is */
}
```

**Step 2 — ThemeProvider wrapper:**

```tsx
// src/components/theme-provider.tsx
"use client";
import { ThemeProvider as NextThemesProvider } from "next-themes";
export function ThemeProvider({ children, ...props }: React.ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
```

**Step 3 — layout.tsx:**

```tsx
// Wrap children in ThemeProvider
<html lang="en" suppressHydrationWarning>
  <body>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      {children}
    </ThemeProvider>
  </body>
</html>
```

`suppressHydrationWarning` on `<html>` is required — next-themes modifies the class attribute server-side vs client-side, which causes a React hydration warning without it.

---

## Sources

- Tailwind CSS v4 official docs — `@theme`, `@custom-variant`, dark mode: https://tailwindcss.com/docs/dark-mode (HIGH confidence)
- Tailwind CSS v4 theme variables — CSS-first token system: https://tailwindcss.com/docs/theme (HIGH confidence)
- fancycomponents.dev installation guide — CLI method, Motion dependency confirmed: https://www.fancycomponents.dev/docs/installation (HIGH confidence, visited 2026-03-05)
- fancycomponents.dev typewriter docs — props, usage, copy-paste model: https://www.fancycomponents.dev/docs/components/text/typewriter (HIGH confidence, visited 2026-03-05)
- spectrum-ui footer docs — source code, lucide-react + shadcn primitives dependencies: https://ui.spectrumhq.in/docs/footer (HIGH confidence, visited 2026-03-05)
- next-themes npm — v0.4.6 current, App Router compatible: https://www.npmjs.com/package/next-themes (HIGH confidence)
- next-themes GitHub — suppressHydrationWarning pattern, data attribute vs class: https://github.com/pacocoursey/next-themes (HIGH confidence)
- tailwind-merge npm — v3 adds Tailwind v4 support: https://www.npmjs.com/package/tailwind-merge (MEDIUM confidence — v3/v4 compatibility confirmed via community sources, not official changelog)
- shadcn manual installation — cn() utility pattern, clsx + tailwind-merge: https://ui.shadcn.com/docs/installation/manual (HIGH confidence)
- Tailwind CSS v4 dark mode with next-themes — @custom-variant pattern: https://iifx.dev/en/articles/456423217/solved-enabling-class-based-dark-mode-with-next-15-next-themes-and-tailwind-4 (MEDIUM confidence — community verified)

---

*Stack research for: Brand kit, design tokens, new UI components (v1.1 milestone)*
*Researched: 2026-03-05*
