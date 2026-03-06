# Phase 14: Landing Page - Context

**Gathered:** 2026-03-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Build a complete, emotionally compelling marketing landing page at the root URL. Visitors see a hero section, how-it-works steps, testimonials, video embed, bottom CTA with trust badges, and a full footer with navigation links. This replaces the current placeholder page.tsx from Phase 13. The quiz funnel (/quiz route) is Phase 15 — this page drives users toward it.

</domain>

<decisions>
## Implementation Decisions

### Hero Section
- Emotional stock photo of people in a heartfelt moment (couple, parent-child, friends) — swap with real photo later
- Centered stack layout: headline → subheadline → CTA button → audio card below
- Headline "Turn your feelings into a song" already exists — keep it
- Inline audio player card with song title, simple waveform/progress bar, and play button
- Sample audio: placeholder MP3 file bundled in /public (Claude's discretion on sourcing)

### How it Works
- 3-step cards: "Tell us about them", "Choose your style", "Get your song"
- Cards should have icons or illustrations (Claude's discretion on icon approach)
- Must match the warm baby blue/yellow brand feel

### Testimonials
- Fictional but realistic placeholder quotes — believable names, real-sounding stories
- Card style: white card with circular avatar placeholder, 5-star rating, quote text, name + relationship
- 3 cards in a row on desktop, stacked on mobile
- Quotes reference diverse relationship types: birthday for mom, anniversary, best friend, etc.

### Video Section
- Placeholder YouTube video ID (royalty-free emotional/music video — swap with product demo later)
- Section has a heading (e.g., "See the magic happen") above a centered video embed
- YouTube loads on click, not on page load (LAND-04 requirement)
- Lazy-load approach: Claude's discretion (lite-youtube-embed vs custom thumbnail+iframe swap)

### Bottom CTA & Trust Badges
- CTA copy: "Ready to make them cry?" with button linking to /quiz
- Feature-based trust badges: "Instant delivery", "100% unique", "No musical skill needed"

### Footer
- Full nav footer with multiple columns: product links (How it Works, Create Your Song), company links (About, Contact), legal links (Privacy, Terms)
- Notevra branding and copyright
- Legal pages can be placeholder routes for now

### Page Flow & Visual Rhythm
- Section backgrounds: Claude's discretion (alternating tinted backgrounds vs uniform white)
- Scroll animations: Claude's discretion (subtle fade-in reveals vs static)
- Must feel warm, emotional, high-trust — not corporate or tech-heavy

### Claude's Discretion
- Exact hero photo selection/placeholder
- Sample audio file sourcing
- How-it-works icon style (Lucide icons, custom SVG, emoji, etc.)
- YouTube placeholder video ID selection
- YouTube lazy-load implementation approach
- Section background alternation pattern
- Whether to add scroll-reveal animations
- Spacing, padding, and section sizing
- Mobile responsive breakpoint details

</decisions>

<specifics>
## Specific Ideas

- Testimonial quotes should mention specific occasions/relationships to reinforce the gift-giving angle — not generic product praise
- Trust badges reinforce product benefits (instant, unique, no skill needed) rather than social proof numbers
- Footer should be a full multi-column nav footer — upgrade from the current single-line placeholder
- The hero audio player card should feel like a real product preview — embedded in the hero, not a separate section
- Header anchor links (#how-it-works, #examples, #reviews) from Phase 13 should link to actual sections on this page

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `Header.tsx`: Already has anchor links (#how-it-works, #examples, #reviews) — landing page sections should use matching IDs
- `Footer.tsx`: Minimal placeholder — will be replaced with full nav footer
- `page.tsx`: Has headline + CTA — will be replaced with full landing page
- `primitives.css`: OKLCH baby blue/yellow/cloud/navy tokens ready to use
- `globals.css`: Semantic token layer (--primary, --secondary, --accent, etc.) maps to Tailwind utilities
- `ui/typewriter.tsx` and `ui/text-shimmer.tsx`: Available animation components if needed

### Established Patterns
- Tailwind v4 with `@theme inline` bridge — use utility classes mapped to semantic tokens
- `font-display` class for Libre Baskerville headings, default sans for DM Sans body
- OKLCH color format throughout — continue for any new color values
- Server components by default, `'use client'` only when needed (Header uses it for mobile menu state)

### Integration Points
- `page.tsx` is the main entry — replace placeholder with full landing page
- `Footer.tsx` — replace minimal footer with full nav footer
- Header anchor links must match section IDs: `how-it-works`, `examples`, `reviews`
- `/quiz` route doesn't exist yet (Phase 15) — CTA buttons link to it as future route
- Audio player card needs a static MP3 in `/public/` directory

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 14-landing-page*
*Context gathered: 2026-03-05*
