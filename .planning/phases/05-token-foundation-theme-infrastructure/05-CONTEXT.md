# Phase 5: Token Foundation + Theme Infrastructure - Context

**Gathered:** 2026-03-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Brand token system and dark mode infrastructure. Define all semantic CSS variables (OKLCH), bridge to Tailwind v4, implement theme toggle with no FOUC, and create a /style-guide stub as a visual test harness. No component restyling — that's Phase 6.

</domain>

<decisions>
## Implementation Decisions

### Color Token Structure
- 5 shades per brand color (cream, amber, sky-blue): 50, 200, 400, 600, 800 equivalent
- Primitive tokens in a separate CSS file (e.g. tokens/primitives.css) imported into globals.css
- Semantic token names follow shadcn convention: --background, --foreground, --card, --muted, --accent, etc.
- OKLCH color format for all primitive values
- Amber used for backgrounds and CTAs only — never as foreground text color (sidesteps WCAG contrast issue)
- Dark mode variants for all semantic tokens

### Dark Mode Behavior
- Default theme: light mode (warm cream palette is the brand signature)
- Theme toggle placement: top-right header area (sun/moon icon button)
- Two states only: light and dark (no system option)
- Instant color swap on toggle — no CSS transition between themes
- next-themes ThemeProvider with suppressHydrationWarning, no FOUC

### Typography Scale
- Bold and playful vibe — heavier heading weights (700-800), tighter tracking
- Hero headline: extra large (6xl-7xl / ~60-72px) with responsive scaling
- Body text: 18px base (generous, modern, matches warm brand)
- Bricolage Grotesque for ALL headings (h1-h6) — consistent display font treatment
- Figtree for body copy, labels, form controls
- Replace current DM Sans + Libre Baskerville with the new font pair

### Style Guide Page
- Single scroll page with sections: Colors, Typography, Spacing/Radius, Shadows
- Static labeled swatches (color boxes with name + value, type samples with size/weight)
- Respects current theme toggle — toggle to see other mode (no side-by-side)
- Production-gated from Phase 5 (NODE_ENV check, returns 404 in prod)

### Claude's Discretion
- Exact OKLCH values for each shade (verify contrast at accessiblepalette.com)
- Spacing token scale (likely 4px base grid)
- Shadow token definitions (subtle, medium, elevated)
- Border-radius token values (already have sm/md/lg/xl pattern)
- Tailwind v4 border regression fix approach
- Theme toggle icon animation (if any)

</decisions>

<specifics>
## Specific Ideas

- Brand inspired by Notera's warm palette (baby blue, sunny yellow, soft whites) adapted for music context
- Creative playground feel, not pro studio — deliberately different from Suno's sterile dark look
- Bricolage Grotesque has great bold weights — lean into them for personality

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `globals.css` already has @theme inline bridge for Tailwind v4 — needs updating from HSL to OKLCH with new palette
- 15 semantic CSS variables already defined (background, foreground, primary, accent, secondary, muted, destructive, card, border, ring, input + foreground variants)
- Radius tokens already exist (sm: 8px, md: 12px, lg: 16px, xl: 24px)
- Custom keyframe animations (eq-bar, wave) to preserve

### Established Patterns
- Tailwind v4 with @tailwindcss/postcss — no tailwind.config file, uses CSS-based config
- next/font for Google Fonts loading with CSS variable injection
- Layout applies font variables to <body> className

### Integration Points
- `layout.tsx` needs: ThemeProvider wrapper, suppressHydrationWarning on <html>, font variable swap (DM Sans → Figtree, Libre Baskerville → Bricolage Grotesque)
- `globals.css` needs: @import primitives file, update @theme inline block, add @custom-variant dark
- New route: `src/app/style-guide/page.tsx`
- 13 hardcoded Tailwind palette classes in 4 components (VariantCard, GenerationPage, WaveformPlayer, EnhancedCaptionDisplay) — Phase 6 will address these

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 05-token-foundation-theme-infrastructure*
*Context gathered: 2026-03-05*
