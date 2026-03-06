# Phase 13: Foundation and Visual Identity - Research

**Researched:** 2026-03-05
**Domain:** Next.js layout, Tailwind v4 CSS tokens, next/font/google, component deletion
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Baby blue primary hue, mellow yellow secondary — OKLCH values at Claude's discretion
- Background: "soft cloud white" — complement blue/yellow without competing
- Must replace all old cream/amber/sky primitives — no old tokens remain
- Notevra wordmark in header (text-only is fine, icon can come later)
- "Create Your Song" CTA button always visible in header
- Header must render on every page
- All old UI removed: sidebar, workspace mode, library page, generation form, dark mode toggle, bottom audio player
- AppShell removal must be atomic — layout.tsx + providers + old components in one commit
- Footer must show Notevra branding
- DM Sans (body) + Libre Baskerville (headings) — specific choices, not flexible
- Brand is "Notevra" — no references to "Notera" or "MusicGenerator" in user-visible text

### Claude's Discretion
- Exact OKLCH color values for baby blue, mellow yellow, and background
- Shade scale depth (3 vs 5 steps per color)
- Header stickiness, nav links beyond CTA, mobile behavior
- Whether to delete old files or deprecate them
- Whether to keep /style-guide for token verification
- Whether to clean up old dependencies now or defer
- Homepage placeholder content between Phase 13 and Phase 14
- Footer implementation approach

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| FNDN-01 | Old UI is fully removed — sidebar, workspace mode, library page, generation form, dark mode toggle, bottom audio player | Atomic deletion strategy: AppShell.tsx, Sidebar.tsx, SidebarProvider.tsx, BottomAudioPlayer.tsx, AudioPlayerContext.tsx, ThemeProvider, theme-toggle, library route, style-guide route — all identified in codebase audit |
| FNDN-02 | Warm color token system applied — baby blue primary, mellow yellow secondary, soft cloud white background | Reference prototype confirms exact target palette in HSL; converted to OKLCH for project consistency; primitives.css rewrite strategy documented |
| FNDN-03 | DM Sans (body) + Libre Baskerville (headings) loaded via next/font/google | Both fonts available in next/font/google; pattern from layout.tsx carries forward exactly — swap font names only |
| FNDN-04 | Simple header nav with Notevra logo, nav links, and "Create Your Song" CTA button | Reference Layout component (notera-main) provides exact structural blueprint; adapted for Next.js App Router with no auth |
| FNDN-05 | Brand renamed to Notevra throughout (logo, page titles, meta tags, footer) | All "Notera" / "MusicGenerator" occurrences located: layout.tsx metadata, library/page.tsx title, Sidebar.tsx brand text, package.json name field |
</phase_requirements>

---

## Summary

Phase 13 is a clean-slate transformation of the app shell — removing the old v2.0 UI infrastructure (sidebar, workspace, library, audio player, dark mode) and installing the Notevra gift service identity (warm token palette, DM Sans + Libre Baskerville fonts, simple sticky header, Notevra branding throughout). The codebase audit confirms every file to touch and every file to delete.

The reference prototype at `/Users/deeg/Downloads/notera-main.zip` was inspected directly. Its `client/src/index.css` defines the exact target palette in HSL and the exact font assignments (`font-sans: DM Sans`, `font-serif: Libre Baskerville`). Its `layout.tsx` defines the exact header structure: sticky backdrop-blur header, music-note circle + wordmark logo, horizontal nav links (How it Works / Examples / Reviews), "Create Your Song" rounded CTA. This gives us a high-confidence blueprint for Phase 13 — no guesswork.

The critical execution risk is atomicity: AppShell currently wraps every page via layout.tsx, and it pulls in SidebarProvider + AudioPlayerProvider. Removing AppShell without replacing it in the same commit would break every route. The new Header component must be built before the providers are removed, and all three (layout.tsx rewrite, AppShell delete, providers delete) must land in one commit.

**Primary recommendation:** Delete old components outright (not deprecate), rewrite primitives.css with OKLCH equivalents of the reference HSL values, rewrite layout.tsx to use DM Sans + Libre Baskerville + new Header, and delete the /library route folder entirely.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next/font/google | Next.js 16.1.6 (built-in) | Load DM Sans + Libre Baskerville with zero layout shift | Built into Next.js; no extra package; automatic font subsetting and CSS variable injection |
| tailwindcss v4 | ^4 (already installed) | Utility classes via `@theme inline` bridge | Already project standard; `@theme inline` pattern established in globals.css |
| lucide-react | ^0.577.0 (already installed) | Header icons (menu hamburger, etc.) | Already in project; used throughout |
| framer-motion | ^12.35.0 (already installed) | Mobile menu animation if needed | Already in project; optional for header animation |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| next/link | built-in | Header logo and nav links | All internal navigation in header |
| next/navigation | built-in | `usePathname()` for active link state | If active link highlighting needed in header |

### Packages to REMOVE after Phase 13
| Package | Why Remove |
|---------|------------|
| next-themes | Dark mode is out of scope; ThemeProvider and theme-toggle are being deleted |
| @wavesurfer/react | BottomAudioPlayer deleted; WaveformPlayer deleted |
| wavesurfer.js | Same — no more waveform rendering in this phase or the next |
| @gsap/react | gsap scramble text was library-only feature (deleted); GSAP not needed in v3.0 funnel |
| gsap | Same |

**Note on removal timing:** The CONTEXT.md lists dependency cleanup as Claude's discretion. Research recommendation: remove `next-themes`, `@wavesurfer/react`, and `wavesurfer.js` in Phase 13 because they are imported by files being deleted and will cause dead-import warnings. Defer `gsap` / `@gsap/react` removal to Phase 13 as well since `gsap-config.ts` and `gsap-config.test.ts` will be deleted alongside `LibrarySongCard`. Package removal is a single `npm uninstall` step that poses no risk.

**Installation (new fonts — zero install, next/font/google is built-in):**
```bash
# No new installs needed. Fonts are loaded from Google via next/font/google.
# Package removals:
npm uninstall next-themes @wavesurfer/react wavesurfer.js @gsap/react gsap
```

---

## Architecture Patterns

### Recommended Project Structure (after Phase 13)

```
src/
├── app/
│   ├── layout.tsx            # REWRITTEN: DM Sans + Libre Baskerville + Header, no AppShell/ThemeProvider
│   ├── page.tsx              # REWRITTEN: simple placeholder page (identity demo)
│   ├── globals.css           # UPDATED: new semantic tokens, dark mode section removed
│   ├── tokens/
│   │   └── primitives.css    # REWRITTEN: baby blue + yellow + cloud white OKLCH palette
│   ├── style-guide/          # KEEP (dev-only, guarded by NODE_ENV check) — or delete (Claude's discretion)
│   └── library/              # DELETE entire folder
├── components/
│   ├── Header.tsx            # NEW: Notevra header nav component
│   ├── Footer.tsx            # NEW: simple Notevra footer component
│   ├── layout/               # DELETE entire folder (AppShell, Sidebar, SidebarProvider, BottomAudioPlayer)
│   ├── theme-provider.tsx    # DELETE
│   ├── theme-toggle.tsx      # DELETE
│   ├── theme-toggle.test.tsx # DELETE
│   ├── HeroSection.tsx       # DELETE (old hero — new landing page in Phase 14)
│   ├── HeroSection.test.tsx  # DELETE
│   ├── GenerationForm.tsx    # DELETE
│   ├── GenerationForm.test.tsx # DELETE
│   ├── GenerationPage.tsx    # DELETE
│   ├── GenerationPage.test.tsx # DELETE
│   ├── GenerationResults.tsx # DELETE
│   ├── GenerationResults.test.tsx # DELETE
│   ├── WaveformPlayer.tsx    # DELETE
│   ├── WaveformPlayer.test.tsx # DELETE
│   ├── VariantCard.tsx       # DELETE
│   ├── VariantCard.test.tsx  # DELETE
│   ├── LibraryList.tsx       # DELETE
│   ├── LibrarySongCard.tsx   # DELETE
│   ├── LibrarySongCard.test.tsx # DELETE
│   ├── LibraryEmpty.tsx      # DELETE
│   ├── LibraryEmpty.test.tsx # DELETE
│   ├── ExampleCard.tsx       # DELETE (old example card)
│   ├── ExampleCard.test.tsx  # DELETE
│   ├── LoadingAnimation.tsx  # DELETE (old loading — new one in Phase 16)
│   ├── LoadingAnimation.test.tsx # DELETE
│   ├── ModeToggle.tsx        # DELETE
│   ├── ModeToggle.test.tsx   # DELETE
│   ├── DurationPreset.tsx    # DELETE
│   ├── LyricsTextarea.tsx    # DELETE
│   ├── GenreChips.tsx        # DELETE
│   ├── EnhancedCaptionDisplay.tsx # DELETE
│   └── ui/                   # KEEP (generic shadcn/ui components reused in future phases)
├── contexts/
│   ├── AudioPlayerContext.tsx     # DELETE
│   └── AudioPlayerContext.test.tsx # DELETE
├── hooks/
│   ├── useGenerationStatus.ts     # DELETE (v2.0 polling hook — replaced in Phase 16)
│   └── useReducedMotion.ts        # KEEP (useful in future phases)
└── lib/
    ├── gsap-config.ts        # DELETE
    ├── gsap-config.test.ts   # DELETE
    ├── colors.ts             # KEEP (getCssColorAsHex may be reused — low risk to keep)
    ├── colors.test.ts        # KEEP
    ├── audio.ts              # KEEP (R2 audio URL helpers, needed Phase 17)
    ├── audio.test.ts         # KEEP
    ├── r2.ts                 # KEEP (R2 access, needed Phase 17)
    ├── r2.test.ts            # KEEP
    ├── heartmula.ts          # KEEP (core generation client, Phase 16)
    ├── display-utils.ts      # KEEP (formatDuration etc., reusable)
    ├── display-utils.test.ts # KEEP
    ├── errors.ts             # KEEP
    └── filename.ts           # KEEP
```

### Pattern 1: Atomic AppShell Removal

**What:** AppShell, SidebarProvider, AudioPlayerProvider, and ThemeProvider are all wired together in layout.tsx. They cannot be removed one at a time without breaking the build between commits.

**When to use:** Required for Phase 13. One commit removes all providers and all components they import.

**Execution order within the atomic commit:**
1. Build `Header.tsx` and `Footer.tsx` (new components, no old imports)
2. Rewrite `layout.tsx` — replace font variables, remove ThemeProvider/AppShell imports, add Header/Footer
3. Rewrite `page.tsx` — remove HeroSection/GenerationPage, add placeholder div
4. Delete layout/ folder, contexts/AudioPlayerContext.tsx, theme-provider.tsx, theme-toggle.tsx
5. Delete all old component files (GenerationForm, WaveformPlayer, etc.)
6. Delete /library route folder
7. `npm uninstall next-themes @wavesurfer/react wavesurfer.js @gsap/react gsap`
8. Commit everything atomically

**Example — new layout.tsx structure:**
```typescript
// No ThemeProvider, no AppShell
import type { Metadata } from 'next';
import { DM_Sans, Libre_Baskerville } from 'next/font/google';
import './globals.css';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';

const dmSans = DM_Sans({
  variable: '--font-sans',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
});

const libreBaskerville = Libre_Baskerville({
  variable: '--font-display',
  subsets: ['latin'],
  weight: ['400', '700'],
  style: ['normal', 'italic'],
});

export const metadata: Metadata = {
  title: 'Notevra',
  description: 'Turn your feelings into a song. Personalized AI music gifts in seconds.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${dmSans.variable} ${libreBaskerville.variable} antialiased`}>
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
```

### Pattern 2: Tailwind v4 `@theme inline` Token Bridge

**What:** The existing project uses `@theme inline` in globals.css to map CSS custom properties to Tailwind color utilities. This pattern carries forward unchanged — only the values change.

**When to use:** Every time color tokens change. The pattern ensures `bg-primary`, `text-accent`, etc. work as utility classes.

**Example — globals.css semantic token section (new values):**
```css
/* Light mode semantic tokens — map to OKLCH primitives */
:root {
  --background:            var(--cloud-50);
  --foreground:            var(--navy-900);
  --card:                  oklch(1 0 0);
  --card-foreground:       var(--navy-900);
  --primary:               var(--blue-500);
  --primary-foreground:    oklch(1 0 0);
  --secondary:             var(--yellow-200);
  --secondary-foreground:  var(--navy-800);
  --accent:                var(--yellow-400);
  --accent-foreground:     var(--navy-900);
  --muted:                 var(--cloud-200);
  --muted-foreground:      var(--navy-500);
  --destructive:           oklch(0.55 0.22 25);
  --border:                var(--cloud-300);
  --input:                 var(--cloud-300);
  --ring:                  var(--blue-400);
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-xl: 24px;
}
/* NO dark mode section — dark mode is explicitly out of scope */
```

### Pattern 3: Header Component Structure

**What:** Sticky, backdrop-blur header with logo left + CTA right. Taken directly from the reference prototype (notera-main/client/src/components/layout.tsx) and adapted for Next.js App Router (no wouter, no auth).

**When to use:** Rendered in layout.tsx so it appears on every page.

**Example — Header.tsx:**
```tsx
// Source: adapted from notera-main reference layout.tsx
'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-white/80 backdrop-blur-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md group-hover:scale-105 transition-transform">
            {/* Music note icon or letter N */}
            <span className="font-display font-bold text-sm">N</span>
          </div>
          <span className="font-display font-bold text-xl tracking-tight text-foreground">Notevra</span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-8">
          <nav className="flex items-center gap-8 text-sm font-medium text-muted-foreground">
            <a href="#how-it-works" className="hover:text-foreground transition-colors">How it Works</a>
            <a href="#examples" className="hover:text-foreground transition-colors">Examples</a>
            <a href="#reviews" className="hover:text-foreground transition-colors">Reviews</a>
          </nav>
          <Link
            href="/quiz"
            className="rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground shadow-md hover:bg-primary/90 hover:shadow-lg hover:-translate-y-0.5 transition-all"
          >
            Create Your Song
          </Link>
        </div>

        {/* Mobile: CTA + hamburger */}
        <div className="flex md:hidden items-center gap-3">
          <Link
            href="/quiz"
            className="rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground shadow-md hover:bg-primary/90 transition-all"
          >
            Create Your Song
          </Link>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-muted transition-colors"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border/40 bg-white px-6 py-4">
          <nav className="flex flex-col gap-3 text-sm font-medium text-muted-foreground">
            <a href="#how-it-works" className="hover:text-foreground transition-colors py-1.5" onClick={() => setMobileMenuOpen(false)}>How it Works</a>
            <a href="#examples" className="hover:text-foreground transition-colors py-1.5" onClick={() => setMobileMenuOpen(false)}>Examples</a>
            <a href="#reviews" className="hover:text-foreground transition-colors py-1.5" onClick={() => setMobileMenuOpen(false)}>Reviews</a>
          </nav>
        </div>
      )}
    </header>
  );
}
```

### Anti-Patterns to Avoid

- **Removing ThemeProvider before building Header:** Breaks layout.tsx immediately; build new first, then swap.
- **Leaving `suppressHydrationWarning` on `<html>`:** This was only needed for next-themes dark mode class injection. Remove it once ThemeProvider is gone.
- **Keeping dark mode CSS in globals.css:** The `:root.dark { ... }` block and `@custom-variant dark` declaration must be deleted. Any surviving `dark:` utility classes in remaining components will silently produce dead CSS but won't error — still clean them up.
- **Forgetting `package.json` name field:** `"name": "notera"` is not user-visible but signals brand; update to `"name": "notevra"`.
- **Leaving sidebar-related CSS tokens:** `--sidebar-bg`, `--sidebar-foreground`, `--sidebar-width`, `--sidebar-expanded`, `--player-bar-height` in globals.css must be removed — they are only used by deleted components.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Font loading with zero FOUC | Manual font face + CSS | `next/font/google` | next/font handles preloading, subsetting, size-adjust FOUC prevention automatically |
| Sticky header | Manual scroll listener + JS class | CSS `position: sticky` via Tailwind | Sticky works without JS; simpler and accessible |
| Backdrop blur | Custom filter CSS | `backdrop-blur-md` Tailwind utility | Already in project, no new setup |
| Mobile menu state | useReducer or context | Simple `useState(false)` in Header | Header is a single component; context overhead is unnecessary at this scope |

**Key insight:** The font and color systems in Next.js + Tailwind v4 are purpose-built for exactly this kind of token rewrite. The "hard" work is just finding the right OKLCH values and updating the right files — there is no custom infrastructure to build.

---

## Common Pitfalls

### Pitfall 1: Non-Atomic Layout Rewrite

**What goes wrong:** Developer removes ThemeProvider from layout.tsx in one commit, then discovers AppShell still references SidebarProvider (which is now an orphaned import), causing a TypeScript error that blocks the build.

**Why it happens:** AppShell, SidebarProvider, AudioPlayerProvider, and ThemeProvider form an import dependency chain. Removing any one link without resolving the others causes compile errors.

**How to avoid:** Stage all deletions and the layout.tsx rewrite together. Do not commit partial states. Use `git add -p` or stage all changed files before committing.

**Warning signs:** TypeScript errors referencing deleted module paths mid-refactor.

### Pitfall 2: Broken Tests from Deleted Components

**What goes wrong:** After deleting GenerationForm.tsx, the test file GenerationForm.test.tsx still exists and imports from the deleted file. `vitest` picks it up and reports import errors.

**Why it happens:** Test files import the component under test — if the component is deleted but the test file is not, the test suite breaks.

**How to avoid:** Delete test files alongside their component files. The full delete list is documented in the structure diagram above.

**Warning signs:** `vitest` errors like `Cannot find module '@/components/GenerationForm'`.

### Pitfall 3: HSL vs OKLCH in Reference CSS

**What goes wrong:** Developer copies HSL values from the reference prototype's `index.css` directly into the project's `primitives.css`, which uses OKLCH format throughout. The Tailwind v4 `@theme inline` bridge uses OKLCH; mixing HSL at the primitive level works but creates inconsistency.

**Why it happens:** The reference prototype was built on Tailwind v3/shadcn defaults (HSL). The project uses Tailwind v4 OKLCH conventions.

**How to avoid:** Convert reference HSL values to OKLCH when defining primitives. The semantic token layer in globals.css can reference either format — but primitives.css should remain OKLCH for consistency.

**OKLCH equivalents for reference palette (confirmed conversions):**
```
Reference HSL → OKLCH equivalent
Baby Blue: hsl(200 80% 65%)   → oklch(0.72 0.12 220)
Yellow:    hsl(45 90% 85%)    → oklch(0.91 0.10 95)
Accent:    hsl(48 95% 60%)    → oklch(0.82 0.17 88)
Bg white:  hsl(210 30% 98%)   → oklch(0.99 0.008 240)
Foreground:hsl(220 20% 20%)   → oklch(0.25 0.02 250)
Muted:     hsl(210 20% 94%)   → oklch(0.96 0.01 240)
Border:    hsl(210 20% 90%)   → oklch(0.92 0.01 240)
```

**Confidence:** MEDIUM — OKLCH conversions are approximate; exact perceptual match requires browser-side comparison. The values above are close enough to serve as starting point.

### Pitfall 4: `suppressHydrationWarning` Orphan

**What goes wrong:** `suppressHydrationWarning` on `<html>` is left in layout.tsx after ThemeProvider is removed. It's harmless but unnecessary and signals unfinished cleanup.

**Why it happens:** Developers remove the ThemeProvider import but forget the attribute it required.

**How to avoid:** When rewriting layout.tsx, write the `<html>` tag fresh without this attribute.

### Pitfall 5: Nav Links Pointing to Non-Existent Routes

**What goes wrong:** Header uses anchor `href="#how-it-works"` for scroll links that won't exist until Phase 14 builds the landing page. On the placeholder homepage, these links do nothing.

**Why it happens:** Header is built in Phase 13 but landing page sections don't exist until Phase 14.

**How to avoid:** This is acceptable during Phase 13. The nav links will work correctly once Phase 14 adds the landing page with matching section IDs. No fix needed — just expected behavior documented.

---

## Code Examples

Verified patterns from codebase inspection and reference prototype:

### Color Primitives (primitives.css rewrite)
```css
/* Source: derived from notera-main/client/src/index.css reference palette, converted to OKLCH */

:root {
  /* Cloud White scale (warm light background, H ~240) */
  --cloud-50:  oklch(0.99 0.008 240);
  --cloud-200: oklch(0.96 0.010 240);
  --cloud-300: oklch(0.92 0.012 240);

  /* Baby Blue scale (primary — H ~220) */
  --blue-300: oklch(0.85 0.08 220);
  --blue-400: oklch(0.78 0.10 220);
  --blue-500: oklch(0.72 0.12 220);
  --blue-700: oklch(0.55 0.14 225);

  /* Mellow Yellow scale (secondary/accent — H ~90-95) */
  --yellow-200: oklch(0.91 0.10 95);
  --yellow-400: oklch(0.82 0.17 88);
  --yellow-600: oklch(0.70 0.18 82);

  /* Soft Navy scale (foreground text — H ~250) */
  --navy-500: oklch(0.52 0.02 250);
  --navy-800: oklch(0.30 0.02 250);
  --navy-900: oklch(0.25 0.02 250);
}
```

### globals.css — Dark Mode Removal
```css
/* REMOVE these sections entirely: */

/* @custom-variant dark (&:where(.dark, .dark *));  ← DELETE */

/* :root.dark { ... }  ← DELETE entire block */

/* Also remove from :root: */
/* --sidebar-bg, --sidebar-foreground, --sidebar-width, --sidebar-expanded, --player-bar-height */

/* Also remove from @theme inline: */
/* --color-sidebar-bg, --color-sidebar-foreground */
/* --animate-eq-bar, --animate-wave (if not used elsewhere) */
```

### next/font — DM Sans + Libre Baskerville
```typescript
// Source: next/font/google documentation; DM_Sans and Libre_Baskerville are confirmed available
import { DM_Sans, Libre_Baskerville } from 'next/font/google';

const dmSans = DM_Sans({
  variable: '--font-sans',       // maps to --font-sans in @theme inline
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

const libreBaskerville = Libre_Baskerville({
  variable: '--font-display',    // maps to --font-display in @theme inline
  subsets: ['latin'],
  weight: ['400', '700'],
  style: ['normal', 'italic'],
  display: 'swap',
});
// Apply: className={`${dmSans.variable} ${libreBaskerville.variable} antialiased`}
```

### Placeholder Homepage (page.tsx between Phase 13 and 14)
```tsx
// Simple placeholder that demonstrates the visual identity before Phase 14 builds the real landing page
export default function Home() {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center px-4 text-center">
      <h1 className="font-display text-5xl font-bold text-foreground mb-4">
        Turn your feelings into a song.
      </h1>
      <p className="text-lg text-muted-foreground max-w-md mb-8">
        Personalized AI music gifts, delivered in seconds.
      </p>
      <a
        href="/quiz"
        className="rounded-full bg-primary px-8 py-3 text-base font-bold text-primary-foreground shadow-md hover:bg-primary/90 hover:-translate-y-0.5 transition-all"
      >
        Create Your Song
      </a>
    </div>
  );
}
```

### Footer Component (minimal Notevra branding)
```tsx
// Source: adapted from notera-main reference layout.tsx footer
export function Footer() {
  return (
    <footer className="border-t border-border/40 bg-white/50 py-8 mt-12">
      <div className="container mx-auto px-6 text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} Notevra. All rights reserved.</p>
      </div>
    </footer>
  );
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Bricolage Grotesque + Figtree fonts | DM Sans + Libre Baskerville | Phase 13 | Different personality: Libre Baskerville adds serif warmth to headings; DM Sans is clean and geometric |
| Sky-blue + Amber + Cream palette | Baby Blue + Mellow Yellow + Cloud White | Phase 13 | Warmer, friendlier; baby blue is lighter/friendlier than the previous sky-600 primary |
| Sidebar + workspace layout | Simple sticky header nav | Phase 13 | Removes spatial complexity; gift funnel is linear, not exploratory |
| next-themes dark mode | Light-only | Phase 13 | Simplification; gift service brand is warm/light |
| ThemeProvider wrapping layout | No provider in layout | Phase 13 | Layout.tsx becomes a simple server component with no client context |

**Deprecated/outdated after Phase 13:**
- `ThemeProvider` / `next-themes`: removed entirely
- `AppShell` / `SidebarProvider` / `AudioPlayerProvider`: removed entirely
- All GSAP scramble text animations: deleted with LibrarySongCard
- WaveformPlayer: deleted (Phase 17 will use native `<audio>` instead)
- `--font-bricolage` / `--font-figtree` CSS variables: removed from globals.css

---

## Open Questions

1. **Style-guide route: keep or delete?**
   - What we know: `src/app/style-guide/page.tsx` has a `NODE_ENV === 'production'` guard that returns 404 in prod. It's dev-only. It references old cream/amber color names.
   - What's unclear: Whether a dev tool for verifying new tokens is valuable enough to update vs delete.
   - Recommendation: Delete in Phase 13. The new token palette is simple (3 colors, 3-4 shades each) and doesn't need a dedicated dev page. It can be verified visually in the browser with the placeholder homepage.

2. **`src/app/tokens/` folder structure**
   - What we know: Currently `src/app/tokens/primitives.css` is imported by `globals.css` via `@import "./tokens/primitives.css"`. The tokens folder only contains this one file.
   - What's unclear: Whether the tokens folder is worth keeping vs inlining primitives into globals.css.
   - Recommendation: Keep the primitives.css file in its current location. The two-file separation (primitives → globals) is a clean architectural pattern worth preserving.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.0.18 + @testing-library/react 16.3.2 |
| Config file | `vitest.config.ts` (project root) |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FNDN-01 | Old UI files are deleted and do not appear in the build | manual-only | N/A — deletion verified by `ls` and `next build` success | N/A |
| FNDN-02 | Color tokens are applied — background is cloud white, primary is baby blue | manual-only | N/A — visual verification in browser; CSS token values verified by reading primitives.css | N/A |
| FNDN-03 | DM Sans body + Libre Baskerville headings render | manual-only | N/A — font rendering is visual; verified by browser DevTools font inspector | N/A |
| FNDN-04 | Header renders on every page with Notevra logo and "Create Your Song" button | smoke | `npx vitest run src/components/Header.test.tsx` | ❌ Wave 0 |
| FNDN-05 | No "Notera" or "MusicGenerator" in user-visible text | manual-only + grep | `grep -r "Notera\|MusicGenerator" src/ --include="*.tsx" --include="*.ts"` — should return zero results | N/A |

### Sampling Rate
- **Per task commit:** `npx vitest run --reporter=verbose`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green + `next build` succeeds before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/components/Header.test.tsx` — covers FNDN-04; renders header, checks for "Notevra" wordmark and "Create Your Song" button text
- [ ] `src/components/Footer.test.tsx` — covers FNDN-05 (footer says "Notevra"); simple render check

*(All other new test infrastructure is covered by existing vitest setup; no new config needed.)*

**Note on deleted tests:** The following test files must be DELETED alongside their components — they will break the test suite if left in place after their source files are gone: `GenerationForm.test.tsx`, `GenerationPage.test.tsx`, `GenerationResults.test.tsx`, `HeroSection.test.tsx`, `WaveformPlayer.test.tsx`, `VariantCard.test.tsx`, `LibrarySongCard.test.tsx`, `LibraryEmpty.test.tsx`, `ExampleCard.test.tsx`, `LoadingAnimation.test.tsx`, `ModeToggle.test.tsx`, `theme-toggle.test.tsx`, `BottomAudioPlayer.test.tsx`, `AudioPlayerContext.test.tsx`, `library/page.test.tsx`, `gsap-config.test.ts`.

---

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection — `src/app/layout.tsx`, `src/app/globals.css`, `src/app/tokens/primitives.css`, `src/components/layout/*`, all component files
- Reference prototype `/Users/deeg/Downloads/notera-main.zip` — `client/src/index.css` (exact palette), `client/src/components/layout.tsx` (exact header structure)
- `package.json` — confirmed installed packages and versions

### Secondary (MEDIUM confidence)
- next/font/google font name verification (`DM_Sans`, `Libre_Baskerville`) — consistent with project memory notes; next/font/google supports both (MEDIUM because not directly queried via Context7 in this session, but confirmed in prior project research per MEMORY.md)
- OKLCH color conversions from reference HSL — approximate; perceptual accuracy should be browser-verified

### Tertiary (LOW confidence)
- None — all findings are from direct file inspection or reference prototype

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already in project; no new dependencies except font swap
- Architecture: HIGH — complete file inventory from direct inspection; reference prototype confirms target structure
- Pitfalls: HIGH — identified from direct code reading (non-atomic removal trap, test file orphan trap)
- Color values: MEDIUM — OKLCH conversions from HSL are approximate; require browser verification

**Research date:** 2026-03-05
**Valid until:** 2026-04-05 (stable — Next.js/Tailwind APIs are not changing in this window)
