# Phase 24: Shared Legal Infrastructure - Research

**Researched:** 2026-03-06
**Domain:** Next.js Server Components, Tailwind v4 CSS, prose typography, shared layout patterns
**Confidence:** HIGH

<user_constraints>
## User Constraints (from STATE.md Accumulated Context)

### Locked Decisions
- Legal pages use TSX over MDX — simpler, no new dependencies
- No `@tailwindcss/typography` — write `.prose-legal` manually using existing OKLCH tokens
- Baby blue primary + mellow yellow secondary on light backgrounds (warm, friendly, high-trust)
- DM Sans body + Libre Baskerville headings (fonts already loaded in layout.tsx)

### Claude's Discretion
- None pre-assigned per user preference (all decisions presented to user)

### Deferred Ideas (OUT OF SCOPE)
- MDX for legal content (explicitly out of scope in REQUIREMENTS.md)
- `@tailwindcss/typography` plugin (explicitly rejected — write manually)
- Cookie consent banner
- Contact form (no email infrastructure)
- Social media links
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| INFRA-01 (v4.1) | Shared LegalLayout component for consistent page structure across all three pages (Contact, Privacy, ToS) | Server Component pattern — no interactivity needed; existing font/color tokens ready |
| INFRA-02 (v4.1) | Legal prose typography styles applied via Tailwind (using existing OKLCH tokens) | Manual `.prose-legal` CSS block in `globals.css` using semantic token variables already defined |
</phase_requirements>

---

## Summary

Phase 24 creates the CSS and component foundation that every legal page (Contact, Privacy, Terms) builds on top of. The work is narrowly scoped: one CSS block in `globals.css` and one React Server Component named `LegalLayout`.

The project already has everything needed: OKLCH design tokens in `primitives.css`, semantic variables in `globals.css`, both fonts loaded in `layout.tsx` (`--font-dm-sans` and `--font-libre`), and a Tailwind v4 `@theme inline` bridge mapping those to utility-class names. No new packages are required. The only installation surface is the existing Tailwind v4 custom CSS pattern already used by the project.

The Tailwind v4 `@layer` mechanism is the correct place to add `.prose-legal` — specifically `@layer components` or as a plain block below `@layer base` (the project already uses both patterns). The `LegalLayout` component can be a pure Server Component (`src/components/LegalLayout.tsx`) that accepts `title`, `lastUpdated`, and `children` props.

**Primary recommendation:** Add `.prose-legal` to `globals.css` under a new `@layer components` block using existing semantic tokens, then create `LegalLayout` as a Server Component with no `'use client'` directive.

---

## Standard Stack

### Core (already installed — zero new installs)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 16.1.6 | App Router, Server Components | Already in use |
| Tailwind CSS | v4 | Utility classes + custom CSS layers | Already in use |
| React | 19.2.3 | Component model | Already in use |
| TypeScript | ^5 | Type safety | Already in use |

### No New Packages

The explicit locked decision is **no `@tailwindcss/typography`**. All prose styles are hand-authored CSS using the existing `--foreground`, `--muted-foreground`, `--primary`, `--border`, and OKLCH primitive token variables already defined in `globals.css` and `primitives.css`.

### Alternatives Considered (rejected by user decision)

| Instead of | Could Use | Why Rejected |
|------------|-----------|--------------|
| Manual `.prose-legal` | `@tailwindcss/typography` | Adds dependency; existing tokens are sufficient |
| TSX legal pages | MDX | Adds MDX pipeline; TSX is simpler |

---

## Architecture Patterns

### Recommended File Layout for This Phase

```
src/
├── app/
│   └── globals.css          # ADD: .prose-legal block (modify existing file)
└── components/
    └── LegalLayout.tsx      # NEW: shared Server Component
```

Legal page routes (built in later phases, NOT this phase):

```
src/app/
├── contact/page.tsx         # Phase 25
├── privacy/page.tsx         # Phase 26
└── terms/page.tsx           # Phase 27
```

### Pattern 1: Tailwind v4 Custom Component Block

Tailwind v4 uses a CSS-first config. The `@layer components` directive is the correct place for reusable class blocks like `.prose-legal`.

```css
/* In globals.css — add after @layer base block */
@layer components {
  .prose-legal {
    /* Layout */
    max-width: 65ch;
    margin-inline: auto;

    /* Headings — Libre Baskerville via CSS var */
    & h1, & h2, & h3, & h4 {
      font-family: var(--font-libre), ui-serif, serif;
      color: var(--foreground);
      font-weight: 700;
      line-height: 1.3;
      margin-top: 2em;
      margin-bottom: 0.5em;
    }
    & h1 { font-size: 2rem; }
    & h2 { font-size: 1.375rem; }
    & h3 { font-size: 1.125rem; }

    /* Body text */
    & p {
      color: var(--foreground);
      line-height: 1.75;
      margin-bottom: 1.25em;
    }

    /* Links — primary color */
    & a {
      color: var(--primary);
      text-decoration: underline;
      text-underline-offset: 3px;
    }
    & a:hover {
      color: var(--blue-700);
    }

    /* Lists */
    & ul, & ol {
      padding-left: 1.5em;
      margin-bottom: 1.25em;
    }
    & li {
      line-height: 1.7;
      margin-bottom: 0.4em;
    }
    & ul { list-style-type: disc; }
    & ol { list-style-type: decimal; }

    /* Horizontal rule */
    & hr {
      border-color: var(--border);
      margin-block: 2em;
    }

    /* Strong */
    & strong {
      font-weight: 600;
      color: var(--foreground);
    }
  }
}
```

**Confidence:** HIGH — this mirrors the exact Tailwind v4 `@layer components` pattern. CSS nesting with `&` is valid in Tailwind v4 (which uses Lightning CSS for nesting support).

### Pattern 2: LegalLayout Server Component

```typescript
// src/components/LegalLayout.tsx
// No 'use client' — pure Server Component

interface LegalLayoutProps {
  title: string;
  lastUpdated: string;   // e.g. "March 6, 2026"
  children: React.ReactNode;
}

export function LegalLayout({ title, lastUpdated, children }: LegalLayoutProps) {
  return (
    <section className="py-16 px-4">
      <div className="container mx-auto prose-legal">
        <header className="mb-10">
          <h1 className="font-display text-4xl font-bold text-foreground">
            {title}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Last Updated: {lastUpdated}
          </p>
        </header>
        <div>{children}</div>
      </div>
    </section>
  );
}
```

**Note on `font-display`:** The project maps `--font-display` to `--font-libre` (Libre Baskerville) in the `@theme inline` block, so `font-display` utility applies the correct serif font to `h1`. The `.prose-legal` block then applies it to nested headings via CSS nesting.

**Confidence:** HIGH — matches existing component patterns (Footer.tsx, HeroSection.tsx use same structure: no client directive, semantic token classes, `container mx-auto` wrapper).

### Pattern 3: Consumer Usage (downstream phases)

```typescript
// Example: src/app/privacy/page.tsx (Phase 26)
import { LegalLayout } from '@/components/LegalLayout';

export const metadata = { title: 'Privacy Policy | Notevra' };

export default function PrivacyPage() {
  return (
    <LegalLayout title="Privacy Policy" lastUpdated="March 6, 2026">
      <p>...</p>
      <h2>Data We Collect</h2>
      <ul>
        <li>Quiz answers</li>
      </ul>
    </LegalLayout>
  );
}
```

### Anti-Patterns to Avoid

- **Adding `'use client'`** to LegalLayout: The component has zero interactivity. Marking it as a Client Component wastes the Server Component optimization and adds unnecessary JS bundle weight.
- **Scoping `.prose-legal` with `!important` overrides:** Unnecessary — specificity is naturally handled by `@layer components`.
- **Duplicating font-family declarations per-page:** The CSS block handles it once; consumers just apply `.prose-legal` to the wrapper.
- **Using inline styles for token values:** Always reference via `var(--token)` so future theme changes propagate automatically.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Prose typography reset | Custom per-page CSS | `.prose-legal` CSS class (this phase) | One source of truth, inherited by all three legal pages |
| Font family switching | Inline style props | `font-family: var(--font-libre)` in CSS / `font-display` Tailwind utility | Already mapped in `@theme inline` |
| Container width limiting | Per-component max-width styles | `max-width: 65ch` inside `.prose-legal` | Readable line length for legal prose (~65 chars is typographic standard) |

**Key insight:** The point of this phase is precisely to avoid hand-rolling — every subsequent legal page phase is cheaper because the CSS and layout shell exist once.

---

## Common Pitfalls

### Pitfall 1: CSS Nesting Scope in Tailwind v4
**What goes wrong:** Writing `.prose-legal h2 { ... }` as flat descendant selectors (old syntax) works, but CSS nesting with `&` is cleaner and already supported by Tailwind v4's Lightning CSS pipeline. However, if using plain `@layer components` outside of Tailwind's PostCSS processing path (e.g., a separate CSS file not imported through the Tailwind entry), nesting may not transpile.
**Why it happens:** Confusion between browser-native CSS nesting (widely supported as of 2024) and PostCSS-processed nesting.
**How to avoid:** Place `.prose-legal` directly in `globals.css` (already processed by Tailwind's PostCSS pipeline). This is the correct location.
**Warning signs:** If you see `.prose-legal & h2 { }` syntax failing in dev, switch to flat descendant selectors `.prose-legal h2 { }` — both work, the flat form is universally safe.

### Pitfall 2: `font-display` Utility vs. `font-family` in CSS Block
**What goes wrong:** The LegalLayout `h1` uses both `font-display` (Tailwind utility → `--font-libre`) AND the `.prose-legal` CSS block styles `h1` with `font-family: var(--font-libre)`. This is intentional duplication, not a conflict — but a developer might remove one thinking it's redundant.
**Why it happens:** Two separate mechanisms doing the same thing looks like a bug.
**How to avoid:** The `h1` in LegalLayout's header JSX uses `font-display` utility class directly (explicit, readable). The `.prose-legal` CSS block styles `h2`, `h3`, `h4` headings inside the content — those come from consumer pages, not from LegalLayout's own JSX.
**Warning signs:** Legal page `h2` headings rendered in body content without Libre Baskerville font → `.prose-legal` CSS nesting not applying.

### Pitfall 3: `container` Class Width on Legal Pages
**What goes wrong:** The project uses `container mx-auto` across all pages. Without `max-width: 65ch` on the prose content itself, legal text will stretch too wide on large screens, severely hurting readability.
**Why it happens:** `container` sets a responsive max-width (e.g., 1280px at xl), which is appropriate for the landing page but far too wide for reading prose.
**How to avoid:** The `.prose-legal` block includes `max-width: 65ch; margin-inline: auto;` to constrain the reading column inside the container.

### Pitfall 4: Last Updated Date as Hardcoded String
**What goes wrong:** If `lastUpdated` prop is a `Date` object, Server Component rendering is deterministic but timezone can affect string output (server timezone vs. display timezone).
**Why it happens:** JavaScript `Date.toLocaleDateString()` uses the server's locale.
**How to avoid:** Pass `lastUpdated` as a pre-formatted string (`"March 6, 2026"`) from the page file, not a `Date` object. The prop type is `string`, not `Date`. This keeps output predictable.

---

## Code Examples

Verified patterns from existing codebase:

### Existing: Tailwind v4 @layer base (globals.css lines 69-77)
```css
/* Source: globals.css */
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
The `.prose-legal` block goes in `@layer components` immediately after this.

### Existing: Font family application pattern (globals.css lines 86-88)
```css
/* Source: globals.css */
h1, h2, h3, h4, h5, h6 {
  font-family: var(--font-libre), ui-sans-serif, system-ui, sans-serif;
}
```
Note: The `.prose-legal` block will use the same `var(--font-libre)` reference.

### Existing: Server Component pattern (Footer.tsx)
```typescript
// Source: src/components/Footer.tsx
import Link from 'next/link';

export function Footer() {
  return (
    <footer className="bg-white border-t border-border/40">
      <div className="container mx-auto px-6 py-12">
        {/* ... */}
      </div>
    </footer>
  );
}
```
`LegalLayout` follows the exact same pattern: named export, no `'use client'`, `container mx-auto` wrapper.

### Existing: `font-display` utility in JSX (HeroSection.tsx)
```typescript
// Source: src/components/landing/HeroSection.tsx
<h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight">
  Turn your feelings into a song
</h1>
```
`LegalLayout`'s `h1` uses the same `font-display` class.

### Available OKLCH Tokens for `.prose-legal`
```css
/* Source: primitives.css + globals.css */
/* Text */
var(--foreground)        /* navy-900 — oklch(0.25 0.02 250) — main body text */
var(--muted-foreground)  /* navy-500 — oklch(0.52 0.02 250) — "Last Updated" label */

/* Links */
var(--primary)           /* blue-500 — oklch(0.72 0.12 220) — link color */
var(--blue-700)          /* oklch(0.55 0.14 225) — link hover */

/* Borders / Rules */
var(--border)            /* cloud-300 — oklch(0.92 0.012 240) — hr, dividers */

/* Fonts */
var(--font-libre)        /* Libre Baskerville — headings */
var(--font-dm-sans)      /* DM Sans — body (inherited from body element) */
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `@tailwindcss/typography` plugin | Manual `@layer components` prose block | Tailwind v4 + project decision | No plugin dependency; full control over token references |
| Tailwind v3 `tailwind.config.js` | Tailwind v4 `@theme inline` in CSS | Tailwind v4 release | Config changes happen in `globals.css`, not a JS config file |
| `next/mdx` for legal content | TSX pages with inline content | Project decision (v4.1) | No MDX build pipeline; legal content is static text in JSX |

**Deprecated/outdated in this project:**
- `tailwind.config.js` — project uses Tailwind v4 CSS-first approach; no JS config file exists
- `@tailwindcss/typography` — explicitly rejected; `@apply prose` patterns do not apply here

---

## Open Questions

1. **`h1` font rendering in LegalLayout header vs. `.prose-legal` content area**
   - What we know: The LegalLayout JSX applies `font-display` directly to the `h1`. Consumer page content applies `.prose-legal` CSS nesting for `h2`-`h4`.
   - What's unclear: Whether a consumer page that puts an `h1` inside the content `<div>` (not the header) gets the right styling. Recommendation: document that `h1` belongs in the LegalLayout header prop, not in children content.

2. **`max-width: 65ch` vs. specific px value**
   - What we know: `65ch` is standard for prose readability (roughly 65 characters per line). It adapts to font size.
   - What's unclear: Whether this feels too narrow on tablet at the Notevra font sizes.
   - Recommendation: Use `65ch` — it is self-adjusting and typographically correct. If the planner disagrees, `prose-legal` can set `max-width: 680px` as an alternative.

---

## Validation Architecture

The planning config does not explicitly set `workflow.nyquist_validation: false`, so validation is enabled.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.0.x + @testing-library/react 16.x |
| Config file | `vitest.config.ts` (project root) |
| Quick run command | `npx vitest run src/components/LegalLayout.test.tsx` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| INFRA-01 | LegalLayout renders title in Libre Baskerville heading, "Last Updated" date, and children slot | unit | `npx vitest run src/components/LegalLayout.test.tsx` | No — Wave 0 gap |
| INFRA-02 | `.prose-legal` CSS class exists in globals.css; applies heading/body/list/link styles | unit (DOM assertion) | `npx vitest run src/components/LegalLayout.test.tsx` | No — Wave 0 gap |

### Sampling Rate

- **Per task commit:** `npx vitest run src/components/LegalLayout.test.tsx`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full vitest suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `src/components/LegalLayout.test.tsx` — covers INFRA-01 and INFRA-02 (render assertions)

*(The vitest config, jsdom environment, and `@testing-library/react` are all already set up. Only the test file is missing.)*

---

## Sources

### Primary (HIGH confidence)

- Existing codebase: `src/app/globals.css` — confirms Tailwind v4 `@layer base` pattern, all OKLCH token names, `@theme inline` block
- Existing codebase: `src/app/tokens/primitives.css` — all primitive OKLCH values, exact variable names
- Existing codebase: `src/app/layout.tsx` — confirms `--font-dm-sans` and `--font-libre` CSS variable names, font weights loaded
- Existing codebase: `src/components/Footer.tsx`, `HeroSection.tsx` — confirms Server Component pattern (no `'use client'`), `container mx-auto` pattern, `font-display` utility usage
- Existing codebase: `src/components/Footer.test.tsx` — confirms vitest + @testing-library test pattern (`vi.mock('next/link')`, `render`, `screen.getByText`)
- Existing codebase: `vitest.config.ts` — confirms jsdom environment, `@` alias for `src/`
- `package.json` — confirms Next.js 16.1.6, Tailwind v4, React 19, Vitest v4, no `@tailwindcss/typography`
- `.planning/STATE.md` — locked decisions: no `@tailwindcss/typography`, TSX over MDX
- `.planning/REQUIREMENTS.md` — INFRA-01 and INFRA-02 definitions, "Out of Scope" list

### Secondary (MEDIUM confidence)

- Typographic standard: 65ch line length for prose readability — established convention in web typography
- Tailwind v4 `@layer components` for custom class blocks — consistent with Tailwind v4 CSS-first documentation pattern

### Tertiary (LOW confidence)

- None — all findings verified against codebase or locked decisions.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — zero new packages; all tokens, fonts, and patterns already present
- Architecture: HIGH — LegalLayout and `.prose-legal` patterns verified against existing codebase conventions
- Pitfalls: HIGH — identified from direct inspection of existing code; no speculative claims

**Research date:** 2026-03-06
**Valid until:** 2026-06-06 (stable — no fast-moving dependencies)
