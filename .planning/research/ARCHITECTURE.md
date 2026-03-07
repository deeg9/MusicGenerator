# Architecture Research

**Domain:** Legal and informational pages — Next.js App Router integration
**Researched:** 2026-03-06
**Confidence:** HIGH (direct codebase inspection + official Next.js App Router docs)

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      Root Layout (layout.tsx)                            │
│              Header | <main>{children}</main> | Footer                  │
│                   (no changes — auto-wraps all routes)                   │
├─────────────────────────────────────────────────────────────────────────┤
│                          Page Routes (src/app/)                          │
│                                                                          │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐  ┌─────────┐  ┌─────────┐  │
│  │  /       │  │  /quiz   │  │  /contact │  │/privacy │  │ /terms  │  │
│  │ Landing  │  │  Funnel  │  │  (NEW)    │  │  (NEW)  │  │  (NEW)  │  │
│  │ (static) │  │ (client) │  │ (static)  │  │(static) │  │(static) │  │
│  └──────────┘  └──────────┘  └─────┬─────┘  └────┬────┘  └────┬────┘  │
│                                    └──────────────┴────────────┘        │
│                                              │                           │
│                               ┌─────────────▼──────────────────┐        │
│                               │  LegalLayout (NEW)              │        │
│                               │  src/components/LegalLayout.tsx │        │
│                               │  Server Component, no state     │        │
│                               └────────────────────────────────┘        │
└─────────────────────────────────────────────────────────────────────────┘
```

The three new pages slot into the existing root layout automatically — Header and Footer
are already present and already link to `/contact`, `/privacy`, `/terms`. The only new
shared component is `LegalLayout`, a prose wrapper imported directly in each page file.

### Component Responsibilities

| Component | Responsibility | Status |
|-----------|----------------|--------|
| Root Layout (`layout.tsx`) | Wraps Header + Footer around all pages | UNCHANGED — no edits needed |
| `Header.tsx` | Site navigation | UNCHANGED |
| `Footer.tsx` | Already has correct `<Link>` refs to all three pages | UNCHANGED |
| `globals.css` | Design tokens + base styles | MODIFY — add `.prose-legal` block only |
| `LegalLayout` | Max-width prose container, page title, last-updated, typography wrapper | NEW — `src/components/LegalLayout.tsx` |
| `/contact/page.tsx` | Contact page — email and social links display | NEW |
| `/privacy/page.tsx` | Privacy Policy document | NEW |
| `/terms/page.tsx` | Terms of Service document | NEW |

## Recommended Project Structure

```
src/
├── app/
│   ├── layout.tsx              # UNCHANGED — already wraps Header + Footer
│   ├── globals.css             # MODIFY — add .prose-legal CSS block
│   ├── page.tsx                # UNCHANGED — landing page
│   ├── quiz/                   # UNCHANGED — quiz funnel
│   ├── contact/
│   │   └── page.tsx            # NEW — Contact page (Server Component, static)
│   ├── privacy/
│   │   └── page.tsx            # NEW — Privacy Policy (Server Component, static)
│   └── terms/
│       └── page.tsx            # NEW — Terms of Service (Server Component, static)
└── components/
    ├── Header.tsx              # UNCHANGED
    ├── Footer.tsx              # UNCHANGED — links already wired
    ├── LegalLayout.tsx         # NEW — shared prose wrapper for all 3 pages
    └── landing/                # UNCHANGED
```

### Structure Rationale

- **Flat routes, no route groups:** Three flat routes under `src/app/` — no need for a `(legal)/` route group. Route groups add indirection for no gain at this scale.
- **`LegalLayout` in `src/components/`, not `src/app/`:** It is a reusable component, not a route segment. Consistent with `Header` and `Footer` placement.
- **No `_components/` subdirectory per page:** Each new page is a single file. Co-located component folders are justified only when a page has multiple private components.
- **No `layout.tsx` per route segment:** Importing `<LegalLayout>` directly in each page is more explicit, easier to vary per page, and avoids the persistence behavior of nested route layouts.

## Architectural Patterns

### Pattern 1: Static Server Component Page with `metadata` Export

**What:** Each new page is a Server Component that exports a static `metadata` object (not `generateMetadata`) and a default function returning JSX. No `'use client'` directive, no hooks, no state.

**When to use:** Any page with content that is known at build time — legal pages are the canonical case.

**Trade-offs:** Next.js renders the page to static HTML at build time (or on first request as static). No client JavaScript for page content. Maximum SEO: title and description appear in `<head>` per page.

**Example:**
```typescript
// src/app/privacy/page.tsx
import type { Metadata } from 'next';
import { LegalLayout } from '@/components/LegalLayout';

export const metadata: Metadata = {
  title: 'Privacy Policy — Notevra',
  description:
    'How Notevra collects, uses, and protects your information when you use our AI music gift service.',
};

export default function PrivacyPage() {
  return (
    <LegalLayout title="Privacy Policy" lastUpdated="March 2026">
      <section aria-labelledby="s-collect">
        <h2 id="s-collect">Information We Collect</h2>
        <p>When you create a song through Notevra...</p>
      </section>
      {/* ... */}
    </LegalLayout>
  );
}
```

### Pattern 2: Shared `LegalLayout` Prose Wrapper

**What:** A single Server Component that owns max-width constraint, top/bottom padding, page `<h1>` and last-updated line, and applies the `.prose-legal` CSS class to its `children` slot. Pages pass their section content as children.

**When to use:** Any page with structured long-form text. The three legal pages share nearly identical layout needs — one component covers all of them.

**Trade-offs:** All three pages share the same container constraints, which is the desired outcome. If one page needs a notably different layout in the future, replace the `LegalLayout` import on that page only — the other two are unaffected.

**Example:**
```typescript
// src/components/LegalLayout.tsx
interface LegalLayoutProps {
  title: string;
  lastUpdated?: string;
  children: React.ReactNode;
}

export function LegalLayout({ title, lastUpdated, children }: LegalLayoutProps) {
  return (
    <article className="container mx-auto px-6 py-16 max-w-3xl">
      <header className="mb-10">
        <h1 className="font-display text-4xl text-foreground">{title}</h1>
        {lastUpdated && (
          <p className="mt-2 text-sm text-muted-foreground">
            Last updated: {lastUpdated}
          </p>
        )}
      </header>
      <div className="prose-legal">{children}</div>
    </article>
  );
}
```

### Pattern 3: `.prose-legal` Tailwind Utility Block (No Plugin)

**What:** A `.prose-legal` CSS block defined in `globals.css` using the existing OKLCH design tokens. Styles `h2`, `h3`, `p`, `ul`, `ol`, `a`, and `li` inside legal content sections.

**When to use:** When the project already has a design token system and three static pages need long-form text styling. Avoids adding `@tailwindcss/typography` which would need extensive overrides to match OKLCH tokens.

**Trade-offs:** Small amount of CSS to write once. Full control — colors and sizing reference existing variables. No new dependency. If more content pages are added, this block scales to them at zero marginal cost.

**Example (add to `globals.css` inside `@layer components`):**
```css
@layer components {
  .prose-legal h2 {
    font-family: var(--font-libre), ui-serif, serif;
    font-size: 1.375rem;
    font-weight: 700;
    color: var(--foreground);
    margin-top: 2.5rem;
    margin-bottom: 0.75rem;
  }

  .prose-legal h3 {
    font-family: var(--font-dm-sans), ui-sans-serif, sans-serif;
    font-size: 1rem;
    font-weight: 600;
    color: var(--foreground);
    margin-top: 1.75rem;
    margin-bottom: 0.5rem;
  }

  .prose-legal p,
  .prose-legal li {
    font-size: 0.9375rem;
    line-height: 1.75;
    color: var(--navy-800);
    margin-bottom: 0.875rem;
  }

  .prose-legal ul,
  .prose-legal ol {
    padding-left: 1.5rem;
    margin-bottom: 1rem;
  }

  .prose-legal ul {
    list-style-type: disc;
  }

  .prose-legal ol {
    list-style-type: decimal;
  }

  .prose-legal a {
    color: var(--blue-500);
    text-decoration: underline;
    text-underline-offset: 3px;
  }

  .prose-legal a:hover {
    color: var(--blue-700);
  }
}
```

### Pattern 4: Contact Page as Display-Only Server Component

**What:** The Contact page renders email addresses and social links statically. No form, no server action, no client-side state, no `'use client'`. A mailto link handles email contact.

**When to use:** Initial MVP contact page before a form is needed. Zero risk, zero complexity.

**Trade-offs:** Users click a `mailto:` link rather than submit a form in-browser. Acceptable for launch. If a contact form is added later, only `src/app/contact/page.tsx` changes — `LegalLayout` and route structure stay the same.

**Example:**
```typescript
// src/app/contact/page.tsx
import type { Metadata } from 'next';
import { LegalLayout } from '@/components/LegalLayout';

export const metadata: Metadata = {
  title: 'Contact — Notevra',
  description: 'Get in touch with the Notevra team.',
};

export default function ContactPage() {
  return (
    <LegalLayout title="Contact Us">
      <p>
        Have a question or need help with your song?
        Email us at{' '}
        <a href="mailto:hello@notevra.com">hello@notevra.com</a>
        {' '}and we'll get back to you within one business day.
      </p>
    </LegalLayout>
  );
}
```

## Data Flow

### Request Flow — Static Page Rendering

```
Browser requests /privacy
      ↓
Next.js App Router matches src/app/privacy/page.tsx
      ↓
metadata export → merged with root layout metadata defaults
  → <title>Privacy Policy — Notevra</title> injected into <head>
      ↓
Server Component renders: LegalLayout → prose content
      ↓
Root layout wraps output: Header + <main> + Footer
      ↓
Static HTML delivered — zero client JavaScript for page content
```

### Metadata Flow

```
page.tsx: export const metadata = { title, description }
      ↓
Next.js merges with root layout metadata
      ↓
<title> and <meta name="description"> injected per page
      ↓
Search crawlers + social card unfurlers receive per-page metadata
```

### Key Data Flows

1. **Footer to new pages (already wired):** `Footer.tsx` contains `<Link href="/contact">`, `<Link href="/privacy">`, and `<Link href="/terms">`. These links resolve as soon as the route files exist — zero Footer changes needed.
2. **No API routes required:** All three pages are static displays. No server actions, no fetch calls, no database reads. No API surface added by this milestone.

## Semantic HTML Guidelines

Legal documents require correct heading hierarchy and landmark semantics for accessibility and search engine understanding.

```
<article>                               ← Self-contained legal document
  <header>
    <h1>Privacy Policy</h1>            ← One h1 per page — the document title
    <p>Last updated: March 2026</p>
  </header>

  <section aria-labelledby="s-collect">
    <h2 id="s-collect">Information We Collect</h2>  ← Major section
    <p>…</p>

    <h3>Information you provide directly</h3>        ← Subsection
    <ul>
      <li>Your quiz answers about the recipient</li>
      <li>Recipient's name and relationship</li>
    </ul>
  </section>

  <section aria-labelledby="s-use">
    <h2 id="s-use">How We Use Your Information</h2>
    <p>…</p>
  </section>
</article>
```

Rules to follow:
- One `h1` per page — rendered by `LegalLayout` from the `title` prop.
- `h2` for major sections, `h3` for subsections. Never skip levels.
- `<section aria-labelledby>` groups related content — screen reader navigation landmark.
- `<article>` wraps the full document — signals self-contained content to search crawlers.
- `<a href="mailto:…">` for email links — native browser behavior, no JS needed.

## Integration Points

### Existing Components — No Changes Required

| Component | Current State | Integration |
|-----------|---------------|-------------|
| `layout.tsx` | Wraps Header + `<main>` + Footer around `{children}` | Auto-wraps new routes by convention — zero edits |
| `Footer.tsx` | Has `<Link href="/contact">`, `<Link href="/privacy">`, `<Link href="/terms">` | Links resolve once route files exist — zero edits |
| `Header.tsx` | No links to legal pages — correct | No legal links in header nav — zero edits |
| `globals.css` | Has full OKLCH token system and `@layer base` | Add `.prose-legal` block inside new `@layer components` — additive only |

### New Components and Files

| File | Type | Dependencies |
|------|------|--------------|
| `src/components/LegalLayout.tsx` | Server Component | `globals.css` `.prose-legal` class must exist |
| `src/app/contact/page.tsx` | Server Component | `LegalLayout` |
| `src/app/privacy/page.tsx` | Server Component | `LegalLayout` |
| `src/app/terms/page.tsx` | Server Component | `LegalLayout` |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Page files → `LegalLayout` | Direct import, props passed inline | No context, no hooks, no state — Server Components throughout |
| `LegalLayout` → `globals.css` | Applies `.prose-legal` CSS class | CSS class must be defined before component is used |
| Footer → new routes | `<Link href>` already present | Routes must exist for links to be navigable (they are broken stubs today) |

## Build Order

This order respects dependencies and minimizes rework:

1. **Add `.prose-legal` to `globals.css`** — No dependencies. Additive CSS block. Existing styles unaffected. Validates visual typography before any page is built.

2. **Create `src/components/LegalLayout.tsx`** — Depends on `.prose-legal` class. No page dependencies. Validates the prose wrapper renders correctly in isolation (can be tested at any route once created).

3. **Create `src/app/contact/page.tsx`** — Depends on `LegalLayout`. Shortest content, fastest to validate that the route + layout + Footer link all work end-to-end.

4. **Create `src/app/privacy/page.tsx`** — Depends on `LegalLayout`. Longest and most complex content — validates prose typography at scale.

5. **Create `src/app/terms/page.tsx`** — Depends on `LegalLayout`. Validates consistent rendering across all three pages.

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0–1k users | Static HTML — serves any traffic level, no adjustment needed |
| 1k–100k users | No changes for legal pages specifically |
| 100k+ users | Legal pages will never be the bottleneck — focus scaling effort on the generation pipeline |

### Scaling Priorities

1. **These pages never scale-limit the product.** Static HTML with zero API calls. Any CDN edge will cache them. No action needed.
2. **Contact form addition (future):** If a contact form is added to `/contact`, the form submission handler becomes an API route. Apply rate limiting at the Next.js middleware layer or via Vercel's built-in rate limiting.

## Anti-Patterns

### Anti-Pattern 1: `'use client'` on Legal Pages

**What people do:** Add `'use client'` to a legal page because it feels like "the right thing to do" for React components.

**Why it's wrong:** Legal pages have no client-side interactivity. `'use client'` forces the entire page content into the JavaScript bundle, eliminates static rendering, and breaks the `metadata` export (which only works in Server Components).

**Do this instead:** Keep all three new pages as Server Components. If a specific interactive element is needed later (e.g., a copy-email button), extract only that element into a small named `'use client'` child component and import it into the otherwise-Server-Component page.

### Anti-Pattern 2: Per-Route `layout.tsx` to Share the Prose Wrapper

**What people do:** Create `src/app/(legal)/layout.tsx` to automatically apply `LegalLayout` to all three pages through the route group convention.

**Why it's wrong:** Introduces a route group and a layout segment for three static pages. Route segments persist in React's component tree and cannot be easily varied per page without additional workarounds. The fix (importing `LegalLayout` directly in each page) is simpler, explicit, and more readable.

**Do this instead:** Import `<LegalLayout>` directly in each of the three page files. Three import lines across three files — fully explicit, zero routing complexity.

### Anti-Pattern 3: Adding `@tailwindcss/typography` for Three Static Pages

**What people do:** Install `@tailwindcss/typography` to get the `prose` utility class, then spend time overriding its opinionated defaults to match OKLCH tokens and brand fonts.

**Why it's wrong:** Adds a plugin dependency, requires override configuration, and fights against the existing design token system. The codebase already has complete OKLCH semantic tokens — a custom `.prose-legal` block is 20 lines and references those tokens directly.

**Do this instead:** Define `.prose-legal` in `globals.css` under `@layer components`. Uses `var(--font-libre)`, `var(--foreground)`, `var(--navy-800)`, `var(--blue-500)` — all already defined. Zero new dependencies.

### Anti-Pattern 4: Hardcoding Last-Updated Dates Inside Body Text

**What people do:** Write `<p>This policy was last updated on March 6, 2026.</p>` as a paragraph inside the legal document prose.

**Why it's wrong:** The date appears only in body text, easy to miss when updating. Creates inconsistency if it needs to appear in multiple places.

**Do this instead:** Pass `lastUpdated="March 2026"` as a prop to `LegalLayout`. The date is rendered in the page header under the `<h1>` where it is always visible. When the policy is updated, change the prop value in the page file — one place, always visible, never buried in body text.

### Anti-Pattern 5: Using `<div>` for the Document Container

**What people do:** Wrap all legal page content in `<div>` elements throughout.

**Why it's wrong:** Legal pages are self-contained documents. `<article>` is the correct semantic wrapper — it signals to screen readers and search engines that the content is a standalone, distributable document. `<section>` with `aria-labelledby` creates navigable landmarks inside the document.

**Do this instead:** Use `<article>` as the outer wrapper (inside `LegalLayout`), `<section aria-labelledby="...">` for major document sections, and `<header>` for the page title block. Reserve `<div>` for purely presentational containers with no semantic meaning.

## Sources

- Next.js App Router documentation — Server Components, static rendering, metadata export: https://nextjs.org/docs/app
- Next.js metadata API reference (`export const metadata`): https://nextjs.org/docs/app/api-reference/functions/generate-metadata
- Tailwind CSS v4 `@layer components` documentation: https://tailwindcss.com/docs/adding-custom-styles
- Codebase: `src/app/layout.tsx` — confirmed font variables, Header/Footer inclusion, metadata defaults
- Codebase: `src/components/Footer.tsx` — confirmed existing Link refs to `/contact`, `/privacy`, `/terms`
- Codebase: `src/app/globals.css` — confirmed `@layer base` pattern, OKLCH token usage, Tailwind v4 `@theme inline`
- Codebase: `src/app/tokens/primitives.css` — confirmed available OKLCH tokens for `.prose-legal`
- Codebase: `src/app/page.tsx` — confirmed Server Component pattern, no `'use client'`, dynamic imports for below-fold sections

---
*Architecture research for: Notevra v4.1 — Legal and Informational Pages*
*Researched: 2026-03-06*
