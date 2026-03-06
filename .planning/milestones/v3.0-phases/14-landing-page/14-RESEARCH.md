# Phase 14: Landing Page - Research

**Researched:** 2026-03-05
**Domain:** Next.js App Router landing page — static sections, audio player, YouTube lazy embed, Framer Motion scroll reveal
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Hero Section**
- Emotional stock photo of people in a heartfelt moment (couple, parent-child, friends) — swap with real photo later
- Centered stack layout: headline → subheadline → CTA button → audio card below
- Headline "Turn your feelings into a song" already exists — keep it
- Inline audio player card with song title, simple waveform/progress bar, and play button
- Sample audio: placeholder MP3 file bundled in /public

**How it Works**
- 3-step cards: "Tell us about them", "Choose your style", "Get your song"
- Cards should have icons or illustrations
- Must match the warm baby blue/yellow brand feel

**Testimonials**
- Fictional but realistic placeholder quotes — believable names, real-sounding stories
- Card style: white card with circular avatar placeholder, 5-star rating, quote text, name + relationship
- 3 cards in a row on desktop, stacked on mobile
- Quotes reference diverse relationship types: birthday for mom, anniversary, best friend, etc.

**Video Section**
- Placeholder YouTube video ID (royalty-free emotional/music video — swap with product demo later)
- Section has a heading (e.g., "See the magic happen") above a centered video embed
- YouTube loads on click, not on page load (LAND-04 requirement)
- Lazy-load approach: Claude's discretion

**Bottom CTA & Trust Badges**
- CTA copy: "Ready to make them cry?" with button linking to /quiz
- Feature-based trust badges: "Instant delivery", "100% unique", "No musical skill needed"

**Footer**
- Full nav footer with multiple columns: product links (How it Works, Create Your Song), company links (About, Contact), legal links (Privacy, Terms)
- Notevra branding and copyright
- Legal pages can be placeholder routes for now

**Page Flow & Visual Rhythm**
- Section backgrounds: Claude's discretion (alternating tinted backgrounds vs uniform white)
- Scroll animations: Claude's discretion (subtle fade-in reveals vs static)
- Must feel warm, emotional, high-trust — not corporate or tech-heavy

### Claude's Discretion
- Exact hero photo selection/placeholder
- Sample audio file sourcing (Pixabay royalty-free recommended — see Code Examples)
- How-it-works icon style (Lucide icons, custom SVG, emoji, etc.)
- YouTube placeholder video ID selection
- YouTube lazy-load implementation approach (custom thumbnail+iframe swap recommended — see below)
- Section background alternation pattern
- Whether to add scroll-reveal animations
- Spacing, padding, and section sizing
- Mobile responsive breakpoint details

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| LAND-01 | Hero section with emotional image, headline "Turn your feelings into a song", and sample audio player card | Native `<audio>` element with custom card UI; static MP3 in /public; `'use client'` component for play state |
| LAND-02 | "How it Works" section with 3-step cards (Tell us about them, Choose your style, Get your song) | Lucide icon set already installed; server component; section id="how-it-works" for Header anchor |
| LAND-03 | Testimonials section with star ratings and customer quotes | Pure server component; static data; section id="reviews" for Header anchor |
| LAND-04 | Video section with embedded video player that loads on click, not page load | Custom thumbnail+iframe swap pattern (no extra dependency); `'use client'` component; section id="examples" for Header anchor |
| LAND-05 | Bottom CTA section ("Ready to make them cry?") with trust badges | Server component; links to /quiz route (not yet live — link is fine) |
| LAND-06 | Footer with navigation links and copyright | Replace current minimal Footer.tsx; server component; multi-column layout |
</phase_requirements>

---

## Summary

Phase 14 builds a complete marketing landing page by replacing the current placeholder `page.tsx` and the minimal `Footer.tsx`. All other Phase 13 infrastructure — layout, header, fonts, CSS tokens — remains unchanged. The page is composed of six discrete sections mapped directly to requirements LAND-01 through LAND-06.

The project already has Framer Motion 12, Lucide React 0.577, and Tailwind v4 with the full OKLCH token system ready. No new packages are strictly required. The one discretionary dependency (`react-lite-youtube-embed`) adds convenience but can be replaced with a lean custom component; the custom approach is recommended here because it avoids an external CSS import, requires no additional install, and keeps full visual control over the placeholder thumbnail styling.

The highest-complexity item is the hero audio player card (LAND-01). It must use a `'use client'` component wrapping the native `<audio>` element, with React state for play/pause. Waveform visualization is NOT required — a simple linear progress bar driven by `timeupdate` events is sufficient and matches the decision to build new, not reuse WaveformPlayer (which is deleted in Phase 13).

**Primary recommendation:** Build the page as a single `page.tsx` server component that composes six section components. Client islands are scoped to `HeroAudioCard` and `VideoSection` only. Every other section is a pure server component, keeping JS bundle minimal.

---

## Standard Stack

### Core (already installed — no new dependencies required)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 16.1.6 | App Router, page.tsx, routing | Already in project |
| React | 19.2.3 | Component model | Already in project |
| Tailwind v4 | ^4 | Utility classes via @theme inline | Already configured |
| Framer Motion | ^12.35.0 | Scroll-reveal animations (optional, already installed) | Already in project |
| Lucide React | ^0.577.0 | How-it-Works icons (Music, Heart, Sparkles, etc.) | Already in project |

### Recommended Optional (discretion — adds value, zero risk)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| react-lite-youtube-embed | 3.5.1 | YouTube facade embed (lazy load on click) | If planner wants zero custom code for the video section |

**Recommendation:** Skip `react-lite-youtube-embed`. Use a custom 15-line `VideoSection` client component instead. Rationale: eliminates external CSS import, maintains visual control, no version-drift risk, and the pattern is trivially simple (see Code Examples).

### Installation (if planner chooses react-lite-youtube-embed)
```bash
npm install react-lite-youtube-embed
```

---

## Architecture Patterns

### Recommended File Structure

```
src/
├── app/
│   └── page.tsx                    # Replace — landing page root (server component)
├── components/
│   ├── Footer.tsx                  # Replace — multi-column nav footer (server component)
│   ├── landing/
│   │   ├── HeroSection.tsx         # Server wrapper; imports HeroAudioCard
│   │   ├── HeroAudioCard.tsx       # 'use client' — audio play state
│   │   ├── HowItWorksSection.tsx   # Server component
│   │   ├── TestimonialsSection.tsx # Server component
│   │   ├── VideoSection.tsx        # 'use client' — iframe swap on click
│   │   ├── BottomCtaSection.tsx    # Server component
│   │   └── data/
│   │       └── landing-data.ts     # Static testimonials, steps, trust badge copy
│   └── ...existing components...
└── public/
    └── sample-song.mp3             # Placeholder royalty-free audio
```

### Pattern 1: Server Component with Client Island

The landing page root is a server component. Only sections requiring interactivity are client components.

```tsx
// src/app/page.tsx — server component, no 'use client'
import { HeroSection } from '@/components/landing/HeroSection';
import { HowItWorksSection } from '@/components/landing/HowItWorksSection';
import { TestimonialsSection } from '@/components/landing/TestimonialsSection';
import { VideoSection } from '@/components/landing/VideoSection';
import { BottomCtaSection } from '@/components/landing/BottomCtaSection';

export default function Home() {
  return (
    <>
      <HeroSection />
      <HowItWorksSection />
      <TestimonialsSection />
      <VideoSection />
      <BottomCtaSection />
    </>
  );
}
```

### Pattern 2: Section IDs Must Match Header Anchor Links

Header.tsx already uses these anchors. Landing sections MUST use matching `id` attributes:

| Header anchor | Section component | id attribute |
|--------------|-------------------|--------------|
| `#how-it-works` | HowItWorksSection | `id="how-it-works"` |
| `#examples` | VideoSection | `id="examples"` |
| `#reviews` | TestimonialsSection | `id="reviews"` |

### Pattern 3: Section Background Alternation

Recommendation: alternate between `bg-background` (cloud-50) and `bg-muted` (cloud-200) for visual rhythm. This uses existing tokens — no new color values needed.

| Section | Background | Rationale |
|---------|------------|-----------|
| Hero | `bg-background` | Lightest — feels open and inviting |
| How it Works | `bg-muted` | Slight contrast to group the steps |
| Testimonials | `bg-background` | Reset — cards provide their own contrast |
| Video | `bg-muted` | Dark-adjacent section, grounds the embed |
| Bottom CTA | `bg-primary` (blue-500) | High contrast — drives conversion |

### Pattern 4: Scroll-Reveal Animation (Claude's Discretion — Recommended: YES)

Use Framer Motion's `whileInView` with `viewport={{ once: true }}`. Framer Motion 12 is already installed. Animations fire once as each section scrolls into view.

```tsx
// 'use client' required for whileInView
import { motion } from 'framer-motion';

<motion.div
  initial={{ opacity: 0, y: 20 }}
  whileInView={{ opacity: 1, y: 0 }}
  viewport={{ once: true, margin: '-80px' }}
  transition={{ duration: 0.5, ease: 'easeOut' }}
>
  {/* section content */}
</motion.div>
```

**Recommendation:** Apply to HowItWorksSection cards and TestimonialsSection cards only. Keep hero static (above the fold, no scroll needed). Keep video/CTA static (interaction-driven). This scopes `'use client'` usage appropriately.

### Anti-Patterns to Avoid

- **Making every section a client component:** `'use client'` should be limited to HeroAudioCard and VideoSection. Adding `whileInView` to server components requires wrapping only the animated element, not the whole section.
- **Recreating WaveformPlayer:** The old WaveformPlayer (deleted in Phase 13) used wavesurfer.js. Do not reinstall it. Use native `<audio>` with a CSS progress bar.
- **Loading YouTube iframe on page mount:** LAND-04 explicitly requires click-to-load. Never render `<iframe src="...">` unconditionally in JSX — always gate it behind state.
- **Importing react-lite-youtube-embed CSS globally:** If the package is used, its CSS must be imported inside the component file, not globals.css, to avoid polluting the global stylesheet.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Icon set for How it Works | Custom SVG sprites | `lucide-react` (already installed) | 600+ icons, consistent stroke weight, tree-shakeable |
| Play/pause audio logic | Custom audio state manager | Native `<audio>` ref + React useState | Sufficient for a single static clip; no library needed |
| YouTube lazy loading | Complex intersection observer setup | 15-line state-swap component (see Code Examples) | The pattern is trivial; no library justified |
| Responsive grid | Custom CSS grid system | Tailwind `grid-cols-1 md:grid-cols-3` | Already in project; no new setup |

**Key insight:** This page is 100% static content with two small interactive islands. The project's existing toolkit covers every requirement. Resist the urge to add libraries for any section beyond what's listed above.

---

## Common Pitfalls

### Pitfall 1: Section IDs Don't Match Header Anchors
**What goes wrong:** Clicking "How it Works" in the header scrolls to... nowhere. The anchor `#how-it-works` in `Header.tsx` has no matching element on the page.
**Why it happens:** Section components are built independently and IDs are forgotten.
**How to avoid:** Add `id` props first, verify with `globals.css` `scroll-behavior: smooth` already set.
**Warning signs:** Header nav links don't scroll the page during dev testing.

### Pitfall 2: Audio Autoplay Blocked by Browser
**What goes wrong:** Audio plays automatically when the page loads, triggering browser autoplay policy blocks and a silent failure.
**Why it happens:** Setting `audio.play()` on mount without user gesture.
**How to avoid:** Only call `audio.play()` inside a click handler. Never autoplay on mount. The play button IS the user gesture.

### Pitfall 3: next/image Requires Domain Config for External Images
**What goes wrong:** Using `<Image src="https://external.com/photo.jpg" />` throws a config error requiring domain allowlist in `next.config.ts`.
**Why it happens:** Next.js Image optimization blocks unregistered external domains.
**How to avoid:** For Phase 14, use a local placeholder image in `/public/` (e.g., `/hero-placeholder.jpg`). No external image domains needed. Real photo swap is explicitly deferred.

### Pitfall 4: react-lite-youtube-embed CSS Import Breaks Tailwind v4
**What goes wrong:** Importing the package's CSS file alongside Tailwind v4 can introduce specificity conflicts or reset styles unexpectedly.
**Why it happens:** External CSS imports interact with Tailwind's cascade.
**How to avoid:** Skip the package entirely. Use the custom VideoSection pattern (see Code Examples).

### Pitfall 5: Footer Test Breaks After Replacing Footer.tsx
**What goes wrong:** Existing `Footer.test.tsx` passes text matchers against the current minimal footer. After replacing Footer.tsx with the multi-column nav footer, tests may fail if they rely on exact text matches.
**Why it happens:** `Footer.test.tsx` checks for "Notevra" and "All rights reserved" — both will still exist in the new footer, so tests should pass. But if new tests are added expecting specific nav links, they need mocking for `next/link` (already established pattern in `Header.test.tsx`).
**How to avoid:** Check existing Footer tests pass after replacement. Follow the `vi.mock('next/link', ...)` pattern from Header.test.tsx for any new footer tests.

### Pitfall 6: /quiz Route Doesn't Exist Yet
**What goes wrong:** CTA buttons linking to `/quiz` cause 404 in the running app.
**Why it happens:** /quiz is Phase 15. Phase 14 builds the landing page before the quiz exists.
**How to avoid:** This is expected and acceptable. Use `<Link href="/quiz">` — the link is valid, it just returns 404 until Phase 15. Do not block Phase 14 on this.

---

## Code Examples

Verified patterns from the existing codebase and official sources.

### Hero Audio Card (Client Component)
```tsx
// src/components/landing/HeroAudioCard.tsx
'use client';

import { useRef, useState } from 'react';
import { Play, Pause } from 'lucide-react';

export function HeroAudioCard() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  function togglePlay() {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
    } else {
      audio.play();
    }
    setPlaying(!playing);
  }

  function handleTimeUpdate() {
    const audio = audioRef.current;
    if (!audio) return;
    setProgress((audio.currentTime / audio.duration) * 100);
  }

  return (
    <div className="flex items-center gap-4 bg-card rounded-xl px-5 py-4 shadow-medium max-w-sm w-full">
      <button
        onClick={togglePlay}
        aria-label={playing ? 'Pause' : 'Play'}
        className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shrink-0"
      >
        {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
      </button>
      <div className="flex flex-col gap-1 flex-1 min-w-0">
        <span className="text-sm font-semibold text-foreground truncate">Happy Birthday, Mom</span>
        <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
      <audio
        ref={audioRef}
        src="/sample-song.mp3"
        onTimeUpdate={handleTimeUpdate}
        onEnded={() => { setPlaying(false); setProgress(0); }}
      />
    </div>
  );
}
```

### YouTube Lazy Load (Custom — No Package Needed)
```tsx
// src/components/landing/VideoSection.tsx
'use client';

import { useState } from 'react';

const VIDEO_ID = 'aJOTlE1K90k'; // "Beautiful Piano Music" — Peder B. Helland, royalty-free on YouTube

export function VideoSection() {
  const [loaded, setLoaded] = useState(false);

  return (
    <section id="examples" className="py-20 px-4 bg-muted">
      <div className="container mx-auto max-w-4xl">
        <h2 className="font-display text-3xl md:text-4xl font-bold text-center text-foreground mb-10">
          See the magic happen
        </h2>
        <div className="relative aspect-video rounded-xl overflow-hidden shadow-elevated bg-navy-900">
          {loaded ? (
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${VIDEO_ID}?autoplay=1`}
              className="w-full h-full"
              allow="autoplay; encrypted-media"
              allowFullScreen
              title="Notevra product demo"
            />
          ) : (
            <button
              onClick={() => setLoaded(true)}
              className="absolute inset-0 w-full h-full flex items-center justify-center group"
              aria-label="Play video"
            >
              <img
                src={`https://img.youtube.com/vi/${VIDEO_ID}/maxresdefault.jpg`}
                alt="Video thumbnail"
                className="absolute inset-0 w-full h-full object-cover"
              />
              <span className="relative z-10 flex h-16 w-16 items-center justify-center rounded-full bg-white/90 shadow-elevated group-hover:scale-110 transition-transform">
                <svg className="h-6 w-6 text-primary ml-1" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </span>
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
```

Note: `img.youtube.com` thumbnails do NOT require next.config.ts domain allowlisting when using a plain `<img>` tag (not `next/image`). Use plain `<img>` here to keep it simple.

### Scroll-Reveal Section Wrapper (optional but recommended)
```tsx
// Wrap a card or section div — needs 'use client' in the containing component
import { motion } from 'framer-motion';

<motion.div
  initial={{ opacity: 0, y: 24 }}
  whileInView={{ opacity: 1, y: 0 }}
  viewport={{ once: true, margin: '-60px' }}
  transition={{ duration: 0.45, ease: 'easeOut', delay: index * 0.1 }}
>
  {/* card content */}
</motion.div>
```

### How it Works Card (Server Component Pattern)
```tsx
// src/components/landing/HowItWorksSection.tsx
import { Heart, Music, Sparkles } from 'lucide-react';

const STEPS = [
  { icon: Heart, title: 'Tell us about them', description: 'Share what makes them special — their personality, your memories, and the occasion.' },
  { icon: Music, title: 'Choose your style', description: 'Pick a music genre and voice that fits the mood, from folk ballads to upbeat pop.' },
  { icon: Sparkles, title: 'Get your song', description: 'Our AI composes a one-of-a-kind song in seconds, ready to share instantly.' },
];

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-20 px-4 bg-muted">
      <div className="container mx-auto max-w-5xl">
        <h2 className="font-display text-3xl md:text-4xl font-bold text-center text-foreground mb-4">
          How it works
        </h2>
        <p className="text-center text-muted-foreground mb-12 max-w-xl mx-auto">
          Three simple steps from idea to tears (the happy kind).
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {STEPS.map((step, index) => (
            <div key={step.title} className="flex flex-col items-center text-center gap-4 bg-card rounded-xl p-6 shadow-subtle">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
                <step.icon className="h-7 w-7" />
              </div>
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Step {index + 1}</span>
              <h3 className="font-display text-xl font-bold text-foreground">{step.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
```

### Footer (Multi-Column — Replaces current Footer.tsx)
```tsx
// src/components/Footer.tsx
import Link from 'next/link';

const NAV = {
  Product: [
    { label: 'How it Works', href: '/#how-it-works' },
    { label: 'Create Your Song', href: '/quiz' },
  ],
  Company: [
    { label: 'About', href: '/about' },
    { label: 'Contact', href: '/contact' },
  ],
  Legal: [
    { label: 'Privacy Policy', href: '/privacy' },
    { label: 'Terms of Service', href: '/terms' },
  ],
};

export function Footer() {
  return (
    <footer className="border-t border-border/40 bg-white py-12 mt-0">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
          <div className="col-span-2 md:col-span-1">
            <span className="font-display font-bold text-xl text-foreground">Notevra</span>
            <p className="mt-2 text-sm text-muted-foreground max-w-xs">
              Turn your feelings into a song. Personalized AI music gifts in seconds.
            </p>
          </div>
          {Object.entries(NAV).map(([group, links]) => (
            <div key={group}>
              <h4 className="text-sm font-semibold text-foreground mb-3">{group}</h4>
              <ul className="space-y-2">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link href={link.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-t border-border/40 pt-6 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Notevra. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
```

### Sample Audio File
Recommended source: **Pixabay** (https://pixabay.com/music/search/emotional%20piano/) — royalty-free, no attribution required, direct MP3 download available. Download any 30-60 second emotional piano track. Rename to `sample-song.mp3` and place in `/public/`.

Suggested placeholder YouTube video ID for the video section: `aJOTlE1K90k` ("Beautiful Piano Music" — Peder B. Helland, legitimately royalty-free on YouTube). Alternatively, any short royalty-free YouTube video works — this is explicitly a placeholder.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| WaveformPlayer (wavesurfer.js) | Native `<audio>` + CSS progress | Phase 13 (deleted) | Simpler, no wasm dependency |
| Framer Motion `useAnimation` + `useInView` hook | `whileInView` prop | Framer Motion v7+ | Cleaner, fewer lines |
| `motion/react` with server-side restrictions | `framer-motion` works fine with `'use client'` boundary | Current | No change to approach needed |
| next-themes dark mode | Dark mode fully removed | Phase 13 | No ThemeProvider, no color-scheme toggling |

**Deprecated/outdated:**
- `next-themes`: Removed in Phase 13. Do not reference it anywhere.
- `WaveformPlayer.tsx`: Deleted in Phase 13. Do not attempt to import or reuse.
- `DM_Sans` / `Libre_Baskerville` theme indirection via `@theme`: Resolved in Phase 13-02 — use `var(--font-dm-sans)` directly in CSS, `font-display` class for headings via `--font-display: var(--font-libre)` in `@theme inline`.

---

## Open Questions

1. **Hero placeholder image format**
   - What we know: Must go in `/public/`. Can be a simple solid-color or gradient SVG as a placeholder.
   - What's unclear: Whether a downloaded stock photo (Unsplash, Pexels) or a generated solid/gradient is preferred for the placeholder.
   - Recommendation: Use a CSS gradient background in the hero section `div` rather than an actual image file — avoids download steps, looks intentional, no licensing concern. Replace with a real photo when available.

2. **Testimonial avatar placeholders**
   - What we know: Card style specifies "circular avatar placeholder."
   - What's unclear: Whether to use a colored initials circle, a generic silhouette SVG, or a service like ui-avatars.com.
   - Recommendation: Use a colored initials circle rendered with Tailwind classes (`rounded-full bg-secondary flex items-center justify-center font-bold`). No external image dependency, consistent with brand colors.

3. **Legal placeholder routes (About, Contact, Privacy, Terms)**
   - What we know: Footer links to these routes. They don't exist yet.
   - What's unclear: Whether to create stub pages now or leave as dead links.
   - Recommendation: Create minimal stub pages (`src/app/about/page.tsx` etc.) with a single line of placeholder copy — prevents 404s, trivial effort.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.0.18 + @testing-library/react 16.3.2 |
| Config file | `vitest.config.ts` (exists) |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| LAND-01 | HeroAudioCard renders play button and audio element | unit | `npx vitest run src/components/landing/HeroAudioCard.test.tsx` | Wave 0 |
| LAND-02 | HowItWorksSection renders 3 step cards with section id="how-it-works" | unit | `npx vitest run src/components/landing/HowItWorksSection.test.tsx` | Wave 0 |
| LAND-03 | TestimonialsSection renders ≥3 testimonial cards with section id="reviews" | unit | `npx vitest run src/components/landing/TestimonialsSection.test.tsx` | Wave 0 |
| LAND-04 | VideoSection renders thumbnail initially, renders iframe after click | unit | `npx vitest run src/components/landing/VideoSection.test.tsx` | Wave 0 |
| LAND-05 | BottomCtaSection renders CTA copy and /quiz link | unit | `npx vitest run src/components/landing/BottomCtaSection.test.tsx` | Wave 0 |
| LAND-06 | Footer renders multi-column nav with Product/Company/Legal columns | unit | `npx vitest run src/components/Footer.test.tsx` | Exists (update needed) |

### Sampling Rate
- **Per task commit:** `npx vitest run src/components/landing/`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/components/landing/HeroAudioCard.test.tsx` — covers LAND-01
- [ ] `src/components/landing/HowItWorksSection.test.tsx` — covers LAND-02
- [ ] `src/components/landing/TestimonialsSection.test.tsx` — covers LAND-03
- [ ] `src/components/landing/VideoSection.test.tsx` — covers LAND-04 (click-to-load behavior testable via fireEvent)
- [ ] `src/components/landing/BottomCtaSection.test.tsx` — covers LAND-05
- [ ] `src/components/Footer.test.tsx` — EXISTS, update after Footer.tsx replacement to add column heading assertions
- [ ] `vi.mock('next/link', ...)` pattern required in all new landing test files (established in Header.test.tsx)

---

## Sources

### Primary (HIGH confidence)
- Codebase inspection — `/src/app/globals.css`, `/src/app/tokens/primitives.css`, `/src/components/Header.tsx`, `/src/components/Footer.tsx`, `/src/app/layout.tsx`, `/src/app/page.tsx`, `/src/components/ui/typewriter.tsx`, `package.json`, `vitest.config.ts`
- `npm info react-lite-youtube-embed` — version 3.5.1, published 2026-02-24, peer deps React >=18.2.0
- GitHub: ibrahimcesar/react-lite-youtube-embed — basic usage confirmed
- Framer Motion official docs — `whileInView` with `viewport={{ once: true }}` pattern confirmed

### Secondary (MEDIUM confidence)
- WebSearch: Framer Motion whileInView patterns — cross-verified with official framer.com/motion docs
- WebSearch: YouTube lazy-load facade pattern — cross-verified with web.dev learn/performance
- Pixabay music search — royalty-free emotional piano tracks confirmed available

### Tertiary (LOW confidence)
- Specific YouTube placeholder video ID (`aJOTlE1K90k`) — selected by research, not verified as permanently available; planner should treat as illustrative and verify before use

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all core libraries inspected directly from package.json and source files
- Architecture: HIGH — patterns derived from existing codebase conventions (Header.tsx, layout.tsx, globals.css)
- YouTube lazy load: HIGH — trivial state-swap pattern; custom implementation preferred over package
- Audio player: HIGH — native `<audio>` + React state is the documented replacement for deleted WaveformPlayer
- Scroll animations: HIGH — Framer Motion `whileInView` is the current API; library already installed
- Sample audio sourcing: MEDIUM — Pixabay confirmed as royalty-free, specific track selection is LOW (planner discretion)

**Research date:** 2026-03-05
**Valid until:** 2026-04-05 (stable domain — Next.js and Framer Motion APIs are stable)
