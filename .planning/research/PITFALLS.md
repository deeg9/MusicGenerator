# Pitfalls Research

**Domain:** Visual Redesign & Design System — Adding brand kit to existing Next.js + Tailwind v4 + shadcn/ui app
**Researched:** 2026-03-05
**Confidence:** HIGH (shadcn/ui + Tailwind v4 specifics from official docs; Framer Motion from official performance guide; accessibility from WCAG + WebAIM; dark mode hydration from confirmed GitHub issues)

---

## Critical Pitfalls

### Pitfall 1: shadcn/ui CSS Variable Format Mismatch After Tailwind v4 Migration

**What goes wrong:**
shadcn/ui v3-style globals.css defines CSS variables as bare HSL channel values: `--background: 0 0% 100%`. Tailwind v4 with `@theme inline` expects variables to be full color values with the `hsl()` wrapper: `--background: hsl(0 0% 100%)`. When both formats exist in the same globals.css (which happens when shadcn components are already installed and you add `@theme inline` to adopt v4 patterns), the `hsl(--background)` references in component classes render as transparent or invalid — cards go transparent, inputs disappear, buttons lose their fill. This is a confirmed shadcn/ui GitHub issue (#4845).

**Why it happens:**
The shadcn/ui CLI `init` command generates the v3-format variables (bare channels). Tailwind v4's `@theme inline` directive assumes variables are already wrapped. Mixing old and new format in one file causes the CSS to evaluate `hsl(0 0% 100%)` correctly in some places and `hsl(220 20% 8%)` (a raw value inserted into hsl()) correctly in others, with the mismatch only visible in the final rendered output — not at build time.

**How to avoid:**
Pick one format for the entire globals.css and be consistent. For Tailwind v4, the correct approach is:

```css
/* Step 1: Define raw semantic tokens at :root */
:root {
  --background: hsl(210 30% 98%);
  --foreground: hsl(220 20% 20%);
  --primary: hsl(200 80% 50%);
}

.dark {
  --background: hsl(220 20% 8%);
  --foreground: hsl(210 20% 95%);
}

/* Step 2: Register as Tailwind theme tokens */
@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-primary: var(--primary);
}
```

Do NOT mix `hsl(var(--background))` (v3 pattern) with direct variable references in the same codebase. When adding new brand tokens alongside existing shadcn tokens, convert all existing variables to the full-value format before adding new ones.

**Warning signs:**
- Components have invisible/transparent backgrounds after globals.css edits
- Cards or buttons render with correct text but no fill
- Browser DevTools shows `hsl(...)` with a raw HSL string inside (invalid CSS)
- Dark mode background renders correctly but light mode goes white/transparent or vice versa
- `background-color: hsl(var(--card))` in computed styles (indicates v3 format still active while v4 pattern was added)

**Phase to address:** Token Foundation phase (first wave) — establish the correct variable format before any component restyling.

---

### Pitfall 2: Tailwind v4 `border` Default Change Breaks All Card/Input Borders

**What goes wrong:**
In Tailwind v3, `border` utilities default to `gray-200`. In Tailwind v4, `border` defaults to `currentColor`. Existing components that use `border` (without an explicit color class like `border-border`) suddenly render with dark/black borders that match the text color. Every card, input, dialog, and button that relied on the v3 default border color appears broken — thick dark outlines appear everywhere, the layout looks broken, and the light/dark mode border scheme stops working.

**Why it happens:**
This is a documented breaking change in Tailwind v4. Developers who scaffolded with v3 (or early v4 with shadcn CLI defaults) relied on the implicit gray border default. The change affects every utility that adds a border without explicitly specifying color — a very common pattern in shadcn components.

**How to avoid:**
Audit the codebase for bare `border`, `border-t`, `border-b`, `border-l`, `border-r` classes before starting redesign work. Replace them with `border border-border` (using the shadcn semantic token). Set a global CSS baseline in globals.css if needed:

```css
*, *::before, *::after {
  border-color: var(--border);
}
```

Run a search for bare border classes before adding any Tailwind v4 `@theme` directives:

```
grep -r "className.*\bborder\b" src/ --include="*.tsx"
```

**Warning signs:**
- Black outlines appear on all inputs, cards, dialogs, modals after any globals.css change
- The outline matches text `foreground` color (proof it's using `currentColor`)
- Border issue appears in light mode but not dark mode (or vice versa), because `currentColor` differs between modes
- Build succeeds with no errors — this is a silent visual regression

**Phase to address:** Token Foundation phase (first wave) — fix border defaults before any visual redesign work.

---

### Pitfall 3: Dark Mode Flash of Unstyled Content (FOUC) from Mismatched SSR/Client Theme State

**What goes wrong:**
The app renders in light mode on the server (SSR default), then on the client detects `prefers-color-scheme: dark` and switches — causing a visible flash from light to dark. This is especially jarring with a warm color palette (light mode is cream/white, dark mode is deep navy) because the color distance is large. Users who prefer dark mode see a full-brightness white flash on every page load. With Next.js App Router, this happens even with `next-themes` if the ThemeProvider is not set up with `suppressHydrationWarning` and an inline script that reads system preference before React hydrates.

**Why it happens:**
SSR cannot read `localStorage` or `prefers-color-scheme` — the server renders without knowing the user's theme preference. React hydrates and detects the mismatch, triggering a re-render. Without a blocking script in `<head>` that applies the theme class before paint, the browser shows the default (usually light) state briefly.

**How to avoid:**
Use `next-themes` with the correct configuration for App Router:

```tsx
// app/layout.tsx
import { ThemeProvider } from 'next-themes';

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
```

The `suppressHydrationWarning` on `<html>` prevents React from throwing a hydration error when `next-themes` adds the `dark` class server vs. client. The `disableTransitionOnChange` option prevents the CSS transition from animating the flash. For Tailwind v4 class-based dark mode, ensure `darkMode: 'class'` behavior is replicated in the CSS: `.dark { ... }` selectors match the `class="dark"` applied by `next-themes`.

**Warning signs:**
- Visible white flash on page load when system is set to dark mode
- React hydration warnings about `className` mismatch on `<html>` element
- Dark mode works correctly after load but the initial render is wrong
- Flash only appears on hard refresh, not on client-side navigation

**Phase to address:** Token Foundation phase — configure theme provider before any color work; a correct foundation prevents this from affecting any later component work.

---

### Pitfall 4: Yellow Accent Color Fails WCAG AA Contrast on White/Cream Backgrounds

**What goes wrong:**
The brand accent (`hsl(48 95% 55%)` — a sunny yellow) fails WCAG AA contrast (4.5:1 for normal text, 3:1 for large text) when used as text on white or cream backgrounds, and also when white text is placed on the yellow accent. Yellow at this brightness has a contrast ratio of approximately 1.1:1 against white — essentially invisible. This means: yellow button labels on white backgrounds are unreadable, yellow highlighted text in form inputs is unreadable, and accent-colored icon labels disappear for users with color vision deficiencies. The WebAIM Million study identifies color contrast as the #1 accessibility violation (83.6% of sites fail it).

**Why it happens:**
Designers choose warm yellows for aesthetic reasons, test them visually against the dark mode (where yellow on dark navy reads well), and miss the light mode contrast failures. The same yellow that looks vibrant on `hsl(220 20% 8%)` (dark background, passes at ~7:1) is invisible on `hsl(210 30% 98%)` (light cream background, fails at ~1.1:1).

**How to avoid:**
Never use the accent yellow as a text color on light backgrounds. Use it only as a background fill, border, or decorative element — never as foreground text. For button labels on a yellow background, use dark foreground text (`hsl(220 20% 20%)` at approximately 8:1 contrast against the yellow).

The brand kit already specifies `accent-foreground: hsl(220 20% 20%)` — enforce this rigorously. Add a contrast check to the `/style-guide` page that shows pass/fail ratios for all token combinations. Use [accessiblepalette.com](https://accessiblepalette.com) to verify every token combination before finalizing.

Critical pairs to verify:
- `accent` background + `accent-foreground` text: target ≥ 4.5:1
- `muted-foreground` text on `background`: target ≥ 4.5:1 (muted text often fails)
- `primary` text on `background`: target ≥ 4.5:1
- Placeholder text in inputs: minimum 4.5:1 against input background

**Warning signs:**
- Yellow elements with white text look fine in dark mode but disappear in light mode
- Placeholder text in form inputs appears invisible or very faint
- "Muted" text tokens that look appropriate in dark mode fail contrast in light mode
- Accessibility scanner (axe DevTools, WAVE) flags contrast errors after redesign

**Phase to address:** Token Foundation phase — verify all token contrast pairs before building any components. Build the `/style-guide` contrast audit into Phase 1.

---

### Pitfall 5: Framer Motion Typewriter Component Forces Entire Page Section to Client Component

**What goes wrong:**
The danielpetho typewriter component uses Framer Motion's `motion` primitives and requires `"use client"`. When this component is placed in a section that was previously a Server Component (like the hero section of a landing page), the entire parent component subtree becomes a client component — all its children lose server-rendering benefits, fetch calls inside them move to client-side data fetching, and the JavaScript bundle grows. If the hero section fetches recent examples or featured content, those fetches now happen on the client, adding a loading state that wasn't there before.

**Why it happens:**
In Next.js App Router, the `"use client"` boundary is contagious upward through props, but more importantly, any component that imports a client component can only itself be a client component if it directly uses client-only APIs. The real problem is when developers put the typewriter in a large component file alongside server-only data fetching, not realizing the boundary rules.

**How to avoid:**
Isolate the typewriter into the smallest possible leaf component:

```tsx
// src/components/HeroTypewriter.tsx
"use client";
import { TypewriterComponent } from 'danielpetho-typewriter'; // or similar

export function HeroTypewriter({ phrases }: { phrases: string[] }) {
  return <TypewriterComponent phrases={phrases} />;
}
```

Keep the parent hero section as a Server Component that fetches data and passes strings down as props. The `"use client"` boundary stops at the leaf. Use `LazyMotion` from Framer Motion to reduce the initial bundle:

```tsx
import { LazyMotion, domAnimation } from 'motion/react';
// Reduces Framer Motion bundle from 34kb to ~4.6kb for the initial render
```

**Warning signs:**
- Hero section that previously rendered instantly now shows a loading state
- Network tab shows hero content fetched via client-side XHR rather than in the HTML
- Bundle analyzer shows Framer Motion added to a large chunk that covers most of the page
- `"use client"` in a component file that also contains `async` data fetching or imports from server-only modules

**Phase to address:** Animation Components phase — establish the client boundary pattern before building any animated components.

---

### Pitfall 6: Framer Motion Layout Animations Cause Cumulative Layout Shift (CLS) on Generation Page

**What goes wrong:**
Adding `layout` prop to elements on the generation page (the form that hides when generation starts, the results that appear) causes Framer Motion to use FLIP animations to smooth the layout change. If the elements don't have stable keys or if `AnimatePresence` is not wrapping the conditional renders properly, elements "jump" to their final position before the animation starts — causing a visible CLS that looks worse than no animation at all. This is particularly noticeable on the existing generation flow where the form unmounts and results mount.

**Why it happens:**
`layout` animation requires Framer Motion to measure element positions before and after the DOM change. If the DOM change happens synchronously (React's default), the measurement is missed. Developers add `layout` to individual elements without wrapping their conditional rendering in `AnimatePresence`, which is required for exit animations and stable measurement.

**How to avoid:**
Always pair `AnimatePresence` with conditional renders, and always provide stable `key` props:

```tsx
<AnimatePresence mode="wait">
  {phase === 'idle' && (
    <motion.div key="form" exit={{ opacity: 0 }} layout>
      <GenerationForm />
    </motion.div>
  )}
  {phase === 'done' && (
    <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} layout>
      <GenerationResults />
    </motion.div>
  )}
</AnimatePresence>
```

Use only `opacity` and `transform` for animations — avoid animating `height`, `width`, or `padding` directly, as these trigger layout recalculations and are not GPU-accelerated.

**Warning signs:**
- Elements visually "snap" to new positions before smoothly animating (measurement missed)
- Chrome DevTools Performance panel shows layout events during animations
- CLS score in Lighthouse degrades after adding animations
- Animations that work in development jank in production (React StrictMode double-renders can mask timing issues)

**Phase to address:** Animation Components phase — establish AnimatePresence patterns in the component that already has the phase state machine (GenerationPage.tsx).

---

### Pitfall 7: wavesurfer.js Waveform Colors Don't Update on Theme Switch

**What goes wrong:**
wavesurfer.js renders into a Shadow DOM. Its waveform bar colors are set via JavaScript options (`waveColor`, `progressColor`, `cursorColor`) at initialization time. When the user switches from light to dark mode, or when the `dark` class is toggled on `<html>`, wavesurfer does not reactively update these colors — the waveform stays in the initialization-time color until the component re-mounts. This means in light mode the waveform looks correct, but after toggling dark mode the waveform remains using the light-mode colors (or vice versa).

**Why it happens:**
CSS variables work in regular DOM elements but do not penetrate the Shadow DOM boundary in wavesurfer.js. Setting `waveColor: "var(--primary)"` in the options does not work — the Shadow DOM does not inherit the CSS variables from the outer document, and even if it did, wavesurfer would not react to their changes. The `::part()` selector only applies to structural parts, not canvas colors.

**How to avoid:**
Read the resolved CSS variable values in JavaScript at initialization time, and re-initialize (or use the wavesurfer `setOptions` API if available) when the theme changes:

```tsx
"use client";
import { useTheme } from 'next-themes';
import { useEffect, useRef } from 'react';

function WaveformPlayer({ audioUrl }) {
  const { resolvedTheme } = useTheme();
  const wsRef = useRef(null);

  useEffect(() => {
    const style = getComputedStyle(document.documentElement);
    const waveColor = style.getPropertyValue('--primary').trim();
    const progressColor = style.getPropertyValue('--accent').trim();

    if (wsRef.current) wsRef.current.destroy();
    wsRef.current = WaveSurfer.create({
      container: '#waveform',
      waveColor: `hsl(${waveColor})`,
      progressColor: `hsl(${progressColor})`,
      // ...
    });
    return () => wsRef.current?.destroy();
  }, [resolvedTheme, audioUrl]); // Re-init when theme changes
}
```

**Warning signs:**
- Waveform colors don't change when toggling dark/light mode
- Setting `waveColor: "var(--primary)"` in wavesurfer options has no effect
- `::part(wave)` CSS selector doesn't change canvas colors (expected — canvas is not a CSS-styleable element)
- Waveform appears in wrong color scheme after SSR hydration

**Phase to address:** Theming Integration phase — after design tokens are established, explicitly test waveform theming under light/dark toggle before shipping.

---

### Pitfall 8: Hardcoded Colors in Existing Components Survive Token Refactor

**What goes wrong:**
The existing app has components written with specific Tailwind utility classes like `bg-zinc-900`, `text-slate-400`, `border-gray-700`, `text-white`. When the new brand tokens are defined and applied globally, these hardcoded classes do not update — they override the semantic token system. Components look visually inconsistent: the new design system applies warm cream in light mode, but hardcoded `bg-zinc-900` stays dark regardless of theme. This is the most common failure mode in visual redesigns: the new tokens work, but dozens of existing hardcoded color classes are still in the codebase.

**Why it happens:**
When building fast, developers use specific Tailwind color utilities because they're easy to autocomplete. There is no build-time enforcement that prevents using `bg-zinc-900` vs `bg-background`. After a redesign, these become invisible landmines — they don't cause errors, they just render wrong.

**How to avoid:**
Before starting component restyling, run an audit to catalog all hardcoded color classes:

```bash
grep -rE "bg-(zinc|slate|gray|neutral|stone|white|black|red|blue|green|yellow|orange|purple|pink|rose|indigo|sky|teal|emerald|violet|fuchsia|lime|amber|cyan)-[0-9]" src/ --include="*.tsx" -l
grep -rE "text-(zinc|slate|gray|neutral|stone|white|black)-[0-9]" src/ --include="*.tsx" -l
grep -rE "border-(zinc|slate|gray|neutral|stone)-[0-9]" src/ --include="*.tsx" -l
```

Map each hardcoded value to its semantic token equivalent. Establish a lint rule (or coding convention) that disallows hardcoded palette colors in favor of semantic tokens. Add a check in the `/style-guide` page that renders all components against both light and dark backgrounds to catch theme mismatches.

**Warning signs:**
- Some components look correct in dark mode but have wrong background in light mode
- Components using old `zinc`/`slate`/`gray` color scale appear alongside new brand-colored components
- Light/dark toggle only partially updates the page (some elements switch, others don't)
- Browser DevTools shows `background-color: rgb(24, 24, 27)` (zinc-900) hardcoded inline

**Phase to address:** Component Restyling phase — audit first, then restyle. Never restyle components without the audit completed.

---

### Pitfall 9: Stacked Circular Footer Breaks Layout on Mobile When Viewport is Narrow

**What goes wrong:**
The spectrum-ui stacked circular footer uses absolutely positioned circular elements with fixed pixel sizes. On mobile viewports (< 375px wide), the circles overflow the viewport horizontally, creating horizontal scroll on the page. This may also interact badly with `overflow-hidden` on parent containers. The footer appears correct on desktop and in browser dev tools at simulated mobile sizes (which don't account for browser chrome), then breaks on actual devices.

**Why it happens:**
Circular decorative elements sized in `vw` units or fixed pixels without responsive breakpoints overflow on narrow screens. When `overflow-hidden` is not set on the `<body>` or the footer container, horizontal scroll appears on the entire page — not just the footer section.

**How to avoid:**
Wrap the footer in `overflow-hidden` at the section level:

```tsx
<footer className="relative overflow-hidden">
  <StackedCircularFooter />
</footer>
```

Test on actual mobile devices (not just Chrome DevTools) at 375px and 320px widths. If the spectrum-ui component uses fixed pixel sizes, override them with responsive classes or add a `max-w-[100vw] overflow-hidden` wrapper. Confirm that `html, body { overflow-x: hidden }` is set in globals.css.

**Warning signs:**
- Horizontal scrollbar appears on the page after footer is added
- Footer elements visible outside the page boundary in mobile view
- `body` has `overflow-x: scroll` in computed styles
- Footer looks correct in browser dev tools but breaks on real device

**Phase to address:** Footer Component phase — test mobile overflow immediately after implementing the footer, before integrating with other page sections.

---

### Pitfall 10: Typewriter Text Animation Causes Cumulative Layout Shift Before Stable String Length

**What goes wrong:**
The danielpetho typewriter component animates through phrases of different lengths. As text types in and out, the heading element resizes — its width and height change on every character. If the heading does not have a fixed height (or `min-h`), the content below it jumps up and down as the text length changes. This is particularly damaging on the hero section where CTA buttons are directly below the heading — users click a button only to have it shift as the typewriter completes.

**Why it happens:**
Animated text that changes length causes layout reflow if the container doesn't have a fixed or minimum size. The browser recalculates the layout for every character change. No `height` or `min-height` on the container means the rest of the page responds to the resizing.

**How to avoid:**
Set a fixed height on the typewriter container based on the tallest phrase it will display:

```tsx
<div className="min-h-[3.5rem] md:min-h-[4.5rem]">
  <HeroTypewriter phrases={phrases} />
</div>
```

Test all phrases at all breakpoints to ensure the `min-h` is sufficient for the longest string at the smallest font size. Place CTA buttons below a spacer, not directly below the animated element.

**Warning signs:**
- CTA buttons move vertically as the typewriter animates
- Lighthouse CLS score above 0.1 on the landing page
- Hero section height changes visibly during animation
- Content below the hero animates unintentionally in sync with the typewriter

**Phase to address:** Animation Components phase — set container dimensions before testing typewriter phrases.

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Hardcoding colors in components instead of using semantic tokens | Faster initial implementation, no token lookup required | Theme switching breaks individual components; redesigns require touching every file | Never — tokens are trivially easy to use |
| Using `animate` on `height` property for accordions/collapsibles | Smooth open/close animation with minimal code | Triggers layout recalculation on every frame; causes jank on low-end devices | Never — use `scaleY` + `overflow-hidden`, or CSS `grid-template-rows` trick instead |
| Storing theme preference in a React state variable | Simple implementation | State is lost on page refresh; causes FOUC on every navigation | Never — use `next-themes` or a cookie-backed solution |
| Adding `"use client"` to large layout components to enable animations | Quick fix for "Framer Motion must be client component" error | Converts large portions of the page to client components, bloating JS bundle | Acceptable only for leaf components; never for layout or page components |
| Setting wavesurfer colors as hardcoded hex values | Consistent colors that don't depend on CSS variable resolution | Waveform stays wrong color after theme switch | Acceptable only as temporary during development; replace with JS-resolved CSS variables before shipping |
| Skipping `/style-guide` contrast audit | Saves time during development | Ships with contrast failures; fails accessibility and EAA (European Accessibility Act, in force June 2025) | Never — the audit is the prevention mechanism |
| Defining font imports directly in component files | Works | Fonts load multiple times; layout shift from FOIT/FOUT on each component mount | Never — define fonts once in layout.tsx via `next/font` |

---

## Integration Gotchas

Common mistakes when connecting to external services.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| shadcn/ui + Tailwind v4 | Mixing v3 HSL channel format (`--background: 0 0% 100%`) with v4 full-value format (`hsl(0 0% 100%)`) in globals.css | Pick one format for the entire file; v4 approach: full `hsl()` values in `:root`, referenced via `@theme inline` |
| next-themes + App Router | Forgetting `suppressHydrationWarning` on `<html>` tag | Add `suppressHydrationWarning` to prevent React hydration errors on theme class mismatch |
| next-themes + Tailwind v4 | Using `attribute="data-theme"` when Tailwind v4 dark mode is configured for `class` | Use `attribute="class"` to match Tailwind's `.dark { }` selectors |
| wavesurfer.js + CSS variables | Passing `waveColor: "var(--primary)"` — Shadow DOM doesn't inherit outer CSS variables | Read computed value in JavaScript: `getComputedStyle(document.documentElement).getPropertyValue('--primary')` |
| Framer Motion + Next.js App Router | Importing motion components in Server Components | Create a dedicated `"use client"` leaf component for each animated element; never add animation to Server Component files |
| danielpetho typewriter | Not providing stable phrase array reference | Memoize the phrases array with `useMemo` or define it outside the component; unstable reference causes re-initialization on every render |
| spectrum-ui footer | No `overflow-hidden` on footer container | Wrap in `<footer className="relative overflow-hidden">` to prevent circle elements from creating horizontal scroll |
| Google Fonts / next/font | Importing fonts in component files with `@next/font/google` | Import once in `layout.tsx`, pass className down; never import in individual components |

---

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Importing full Framer Motion (`import { motion } from 'framer-motion'`) everywhere | 34kb+ added to every client bundle that includes any animation | Use `LazyMotion` + `domAnimation` feature set; use `m` instead of `motion` for lazy-loaded components | Immediately — measurable on first load |
| Animating `layout` on every section element | Page feels sluggish during scroll; Lighthouse performance score drops | Only add `layout` prop to elements that actually need FLIP animations (form/results swap) | On low-end mobile devices or complex pages |
| Using `initial={{ opacity: 0 }}` without `viewport` prop on below-fold sections | Elements invisible until JavaScript hydrates; blank sections flash in | Add `viewport={{ once: true }}` to trigger animation when element enters viewport, or skip `initial` for content below fold | On slow connections where JS is delayed |
| Loading all custom fonts as `display: block` (no FOIT mitigation) | Blank text until font loads; layout shift when font loads | Use `display: 'swap'` in `next/font` options; preload font in `<head>` | On first visit from any user |
| Framer Motion `AnimatePresence` at a high component level (e.g., layout.tsx) | Every page transition triggers expensive remount/animation for all children | Keep `AnimatePresence` scoped to the specific UI section that transitions | Page transitions on complex pages |

---

## Security Mistakes

Domain-specific security issues beyond general web security.

| Mistake | Risk | Prevention |
|---------|------|------------|
| Embedding third-party animation component JS inline without CSP update | Content Security Policy violation breaks the animation in production | Update CSP headers in `next.config.ts` to allow inline scripts if required by third-party component |
| Adding Google Fonts via `<link>` tag in HTML instead of `next/font` | Fonts bypass the Content Security Policy and connect to Google's servers directly; violates GDPR for EU users | Use `next/font/google` which self-hosts font files at build time — no Google CDN connection at runtime |
| Using external CDN for animation assets (Lottie files, video backgrounds) | CDN outage breaks visual components; CDN JS can be compromised | Self-host all animation assets in `/public`; never load JS from external CDNs |

---

## UX Pitfalls

Common user experience mistakes in this domain.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Animations play on every page visit, not just first | Returning users find the typewriter and entrance animations annoying after the first view | Use `sessionStorage` to track first visit; skip animations on return visits, or use subtle variants instead of full entrance sequences |
| Dark mode defaults to system preference without a toggle UI | Users on light mode devices cannot switch to the brand's warm light aesthetic; users on dark mode cannot switch to light | Add a visible theme toggle even if simple; defer to Phase 2 but don't lock users into system preference only |
| Form inputs in light mode have very low contrast placeholders | Users with low vision cannot see placeholder text; particularly bad with warm cream backgrounds | Ensure placeholder color has at least 4.5:1 contrast against input background; use `--muted-foreground` only if it passes |
| Page transition animations cause motion sickness for `prefers-reduced-motion` users | Vestibular disorder users experience nausea from page-level animations | Wrap all animations with `useReducedMotion` from Framer Motion or CSS `@media (prefers-reduced-motion: reduce)` |
| Typewriter stops after one cycle on single-phrase configurations | User who loads the page between cycles sees a blank heading | Test the typewriter with a single phrase; ensure it loops or leaves text visible when the cycle ends |
| `/style-guide` page exposed in production | Competitors can see the full design system and tokens | Gate the style-guide behind `NODE_ENV === 'development'` check or behind an auth check in production |

---

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **Brand tokens:** Token file exists in globals.css — verify each token passes contrast checks as text-on-background AND background-with-text combinations at [accessiblepalette.com](https://accessiblepalette.com)
- [ ] **Dark mode:** Theme toggle works in browser — verify no FOUC on hard refresh when system is set to dark mode, test with `next-themes` and `suppressHydrationWarning`
- [ ] **wavesurfer theming:** Waveform renders in brand colors — verify colors update when toggling dark/light mode (requires JS re-init, not CSS)
- [ ] **Framer Motion typewriter:** Animation plays on load — verify `min-h` container prevents CLS, test all phrases at all breakpoints, verify `LazyMotion` reduces bundle size
- [ ] **Component restyling:** Components look correct — verify no hardcoded `zinc`/`slate`/`gray` color classes remain by running the grep audit
- [ ] **Footer:** Footer renders correctly on desktop — verify no horizontal scroll on 375px mobile viewport (test on real device, not only DevTools)
- [ ] **Border defaults:** Cards and inputs have correct borders — verify no `currentColor` (black) borders appeared after globals.css changes
- [ ] **`/style-guide` page:** Page renders all components — verify page is gated from production (only visible in development or behind auth)
- [ ] **Reduced motion:** Animations play as expected — verify `prefers-reduced-motion` users see static or minimal-motion fallbacks
- [ ] **Font loading:** Correct fonts render on first load — verify no FOUT (flash of unstyled text) by checking network tab for font files loaded via `next/font` (self-hosted)

---

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| CSS variable format mismatch (transparent backgrounds) | MEDIUM | Convert all `:root` variables to full `hsl()` values; update `@theme inline` references; test both light and dark modes |
| Border default change (black borders everywhere) | LOW | Add `border-border` class to all bare `border` utilities; or set global `border-color: var(--border)` in globals.css |
| Dark mode FOUC shipped to production | LOW | Add `next-themes` with correct `suppressHydrationWarning` config; deploy; FOUC disappears without data migration |
| Yellow accent contrast failure identified post-launch | MEDIUM | Darken the accent token (reduce lightness from 55% to 40% for text use); audit all usages; update and redeploy |
| Hardcoded colors found after "done" | MEDIUM | Run grep audit; systematically replace with semantic tokens; requires visual QA for each changed component |
| Framer Motion bundle size bloat | LOW | Replace direct `motion` imports with `LazyMotion` + `m` component API; no visual change, just bundle reduction |
| wavesurfer wrong colors in one mode | LOW | Add `resolvedTheme` to the wavesurfer `useEffect` dependency array; trigger re-initialization on theme change |
| Footer horizontal scroll on mobile | LOW | Wrap footer in `overflow-hidden`; confirm `html/body` overflow is controlled |

---

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| CSS variable format mismatch (transparent components) | Token Foundation (Phase 1, Wave 1) | Render all shadcn/ui base components in both light and dark modes; verify no transparent backgrounds |
| Tailwind v4 border default (black borders) | Token Foundation (Phase 1, Wave 1) | Render inputs and cards; verify border color is `var(--border)` not `currentColor` |
| Dark mode FOUC on hard refresh | Token Foundation (Phase 1, Wave 1) | Hard refresh in dark mode system preference; verify no white flash before first paint |
| Yellow accent contrast failures | Token Foundation (Phase 1, Wave 1) | Run all token pairs through contrast checker; add to `/style-guide` audit section |
| Hardcoded color classes surviving redesign | Component Restyling (Phase 2) | Run grep audit before starting; verify no palette-specific classes remain after restyling |
| Framer Motion `"use client"` boundary pollution | Animation Components (Phase 3) | Verify hero section parent remains a Server Component; check React DevTools "client" boundary boundaries |
| Typewriter CLS | Animation Components (Phase 3) | Run Lighthouse on landing page with typewriter active; CLS score must be < 0.1 |
| Framer Motion layout CLS on generation page | Animation Components (Phase 3) | Run generation flow; verify form→results transition has no position snapping; check AnimatePresence wraps all conditional renders |
| wavesurfer waveform wrong color on theme switch | Theming Integration (Phase 2) | Toggle light/dark mode while audio is loaded; verify waveform bar colors update |
| Footer horizontal scroll on mobile | Footer Component (Phase 4) | Test on real 375px mobile device or BrowserStack; verify no horizontal scroll |
| Reduced motion not respected | Animation Components (Phase 3) | Enable OS reduced motion setting; verify all animations stop or use opacity-only fallbacks |
| `/style-guide` exposed in production | Style Guide (Phase 1) | Verify page returns 404 or redirects in `NODE_ENV=production` build |

---

## Sources

- shadcn/ui Tailwind v4 Migration Guide (official) — CSS variable format changes, component updates required: https://ui.shadcn.com/docs/tailwind-v4
- shadcn/ui GitHub Issue #4845 — Default Next.js CSS variables conflict with shadcn theme, transparency bug: https://github.com/shadcn-ui/ui/issues/4845
- Tailwind CSS v4.0 Release Notes — border default change (`currentColor`), `@theme` directive, OKLCH color space: https://tailwindcss.com/blog/tailwindcss-v4
- Tailwind CSS v4 Migration Guide (DEV Community, Umesh Malik) — `@apply` deprecation, color variable migration: https://dev.to/umesh_malik/tailwindcss-v4-migration-guide-what-changed-and-how-to-upgrade-525g
- next-themes GitHub — `suppressHydrationWarning`, App Router setup, FOUC prevention: https://github.com/pacocoursey/next-themes
- shadcn/ui GitHub Issue #5552 — ThemeProvider hydration error in Next.js 15: https://github.com/shadcn-ui/ui/issues/5552
- Fixing Dark Mode FOUC in React and Next.js (Not A Number blog): https://notanumber.in/blog/fixing-react-dark-mode-flickering
- WCAG 2.1 Contrast Minimum (1.4.3) — 4.5:1 for normal text, 3:1 for large text: https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html
- WebAIM Million 2024 — Color contrast is #1 accessibility violation (83.6% of sites): https://webaim.org/articles/contrast/
- Yellow, Purple, and the Myth "Accessibility Limits Color Palettes" (Stéphanie Walter) — yellow on white contrast failures: https://stephaniewalter.design/blog/yellow-purple-and-the-myth-of-accessibility-limits-color-palettes/
- Motion (Framer Motion) Performance Guide — transform/opacity are GPU-accelerated; layout property usage: https://motion.dev/docs/performance
- Framer Motion Bundle Size Reduction — `LazyMotion` + `domAnimation` reduces 34kb to ~4.6kb: https://motion.dev/docs/react-reduce-bundle-size
- Framer Motion + Next.js App Router ("use client" requirements) — StaticMania guide: https://staticmania.com/blog/how-to-use-framer-motion-animations-in-next-js
- Framer Motion vs Motion One Mobile Performance 2025 — JavaScript-driven animations on low-end devices: https://reactlibraries.com/blog/framer-motion-vs-motion-one-mobile-animation-performance-in-2025
- wavesurfer.js Shadow DOM CSS targeting — `::part()` selector, Shadow DOM CSS limitations: https://github.com/katspaugh/wavesurfer.js/discussions/3330
- Customizing shadcn/ui Themes Without Breaking Updates (Medium, Suresh Kumar): https://medium.com/@sureshdotariya/customizing-shadcn-ui-themes-without-breaking-updates-a3140726ca1e
- Theming shadcn/ui with Tailwind v4 and CSS Variables (Medium, Joseph Goins): https://medium.com/@joseph.goins/theming-shadcn-with-tailwind-v4-and-css-variables-d602f6b3c258
- Accessible Palette tool — contrast verification for design tokens: https://accessiblepalette.com/

---
*Pitfalls research for: Visual Redesign & Design System — Next.js + Tailwind v4 + shadcn/ui brand kit migration*
*Researched: 2026-03-05*
