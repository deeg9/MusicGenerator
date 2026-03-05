# Feature Research

**Domain:** Brand & Visual Design — AI Music Generation App (v1.1 Redesign)
**Researched:** 2026-03-05
**Confidence:** MEDIUM-HIGH (competitor analysis from live products, design system patterns from official sources, color values from authoritative references)

---

## Scope Note

This file covers the **visual/brand design feature landscape** for milestone v1.1 (brand redesign). For product features (generation, credits, playback), see the original FEATURES.md committed at v1.0. The question answered here: what design features make a creative music platform feel warm, inviting, and differentiated vs cold and sterile?

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist on any modern creative platform. Missing these = product feels unfinished or untrustworthy.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Light + dark mode support | Every modern app ships both; forcing dark-only excludes light-preference users (studies show dark mode can increase eye strain and reduce reading accuracy) | MEDIUM | Use CSS custom properties (OKLCH or HSL); shadcn/ui theming convention is `.dark` class on `<html>`; `next-themes` handles toggle + persistence |
| Consistent color palette (design tokens) | Without tokens, components drift — buttons look slightly different, cards have inconsistent padding; users feel something is "off" even if they can't name it | MEDIUM | shadcn/ui uses `--background`, `--foreground`, `--primary`, `--accent`, `--muted`, `--card`, `--border`, `--ring` as semantic CSS vars; define once, reuse everywhere |
| Typography hierarchy (display / heading / body) | Flat type hierarchy signals amateur design; users expect clear distinction between hero text, section headers, and body | LOW | Two-font system: expressive display font for headings + neutral readable font for body; single-weight-only is the most common failure |
| Visible interactive states (hover, focus, active) | Missing hover/focus states make the UI feel broken and inaccessible; WCAG 2.1 requires visible focus | LOW | Use `ring` tokens for focus; define `--ring` in design tokens; Tailwind `focus-visible:ring-2` pattern |
| Responsive layout (mobile + desktop) | Over half of web traffic is mobile; a non-responsive landing page signals abandonment | MEDIUM | Tailwind responsive prefixes; existing components (GenerationForm, waveform player) need mobile-first audit |
| Loading states with visual feedback | Generation takes 7-60 seconds; a bare spinner is insufficient — users need to feel progress is happening | MEDIUM | Shimmer skeleton animation (animated gradient sweep) over placeholder cards; branded loading color should use primary accent |
| Consistent spacing scale | Arbitrary spacing (17px here, 23px there) makes layouts feel unstable; users perceive inconsistency as low quality | LOW | Tailwind's 4px base scale (4, 8, 12, 16, 24, 32, 48, 64) covers all needs; define spatial tokens as a subset of these |
| Legible body text contrast | WCAG AA requires 4.5:1 contrast ratio for body text; failing this triggers accessibility flags that erode SEO | LOW | Test all text/background combinations; warm backgrounds (cream/off-white) can fail contrast with light gray text |
| Brand-consistent button styles | Buttons are the most-clicked element; inconsistent button styles (size, radius, color) fragment perceived coherence | LOW | Primary CTA, secondary, ghost, and destructive variants; all derived from design tokens |

### Differentiators (Competitive Advantage)

Features that make the brand feel distinct from Suno, Udio, and generic dark-mode AI tools.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Warm light-mode-first color palette | Suno is dark/sterile; most AI tools default dark; a warm, cream-and-amber light mode immediately signals "creative playground, not pro studio" — matches the gift/personal-moments use case | MEDIUM | Primary palette: cream/off-white background (`oklch(0.98 0.01 85)`), warm amber accent (`oklch(0.78 0.16 80)`), sky-blue secondary (`oklch(0.72 0.12 220)`); see STACK.md for full token values |
| Expressive display typeface | Generic AI tools use Inter or system-ui; Bricolage Grotesque (free, Google Fonts, variable) is "quirky and organic — confident, creative, and approachable"; immediately signals personality at hero scale | LOW | Bricolage Grotesque for headings/display (weight 400–800, variable font); Figtree or DM Sans for body (both free, Google Fonts); pair validated in typographic research |
| Warm dark mode (not #000 or slate-950) | Dark mode defaults to pure black or cold blue-gray (Suno, Udio); a warm dark mode (dark brown/charcoal with warm undertones) feels premium and cohesive with the light palette | MEDIUM | Dark background: `oklch(0.14 0.02 60)` (warm near-black); surfaces: `oklch(0.18 0.02 60)`; avoid `zinc-950` or `slate-950` which have cold blue undertones |
| Intentional accent color pair (amber + sky blue) | Complementary warm/cool accent pair creates visual interest without clash; amber = energy/creativity; sky blue = calm/trust — both signal "personal and joyful" | LOW | Research confirms the blue+yellow/amber pairing (#8ecae6 / #ffb703 range) is "ideal for brands with youthful vibe"; maps to Notera inspiration (baby blue + sunny yellow) |
| Waveform player as a brand moment | The waveform is the centerpiece of each generated song; competitors treat it as a utility widget; making it visually expressive (colored waveform using accent color, animated progress cursor) turns playback into brand touchpoint | MEDIUM | wavesurfer.js accepts `waveColor` and `progressColor` via options; use primary accent for progress, muted accent for unplayed; match active/idle states to color tokens |
| `/style-guide` dev page | Shows all brand elements live in the browser; signals product maturity to technical early adopters; makes onboarding new contributors instant | MEDIUM | Single Next.js route at `/style-guide`; render all: color swatches from CSS vars, typography scale, button variants, card samples, spacing grid, form states, loading skeletons |
| Playful micro-interactions | Hand-drawn scribble underlines, subtle hover lifts on cards, bounce on CTA — 2025 trend: "playful, imperfect elements add warmth, personality, and authenticity — helping websites feel more human" | MEDIUM | Framer Motion `whileHover` scale transforms; CSS `transition` for box-shadow lift; scribble underlines via SVG path or rough-notation library |
| Stacked circular footer | Distinctive visual element (from spectrum-ui); creates a memorable end-of-page moment instead of a generic dark bar; reinforces playful brand direction | LOW | Component already planned; needs to use design tokens for background/text colors |
| Framer Motion typewriter in hero | danielpetho's typewriter component (already planned) needs to render in the brand accent color with correct font tokens; the animation rhythm should feel musical/rhythmic, not mechanical | LOW | Cursor blink timing aligned to a musical interval (e.g., 500ms = quarter note at 120 BPM) creates subliminal brand-music connection |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Dark-mode-only design | "Feels more professional / premium"; Suno does it; tech aesthetic convention | Excluding light mode alienates users who prefer it (research shows ~55-65% use light mode during daytime); signals "pro tool" not "creative playground"; directly contradicts brand positioning | Ship both; default to light mode; respect `prefers-color-scheme` for auto-detect; toggle in nav |
| Pure black (#000000) backgrounds in dark mode | Maximum contrast; easy to implement | Pure black with white text creates harshest contrast ratio possible, increasing eye strain; no premium brand uses pure black (Apple, Linear, Vercel all use warm near-blacks) | Use warm near-black: `oklch(0.14 0.02 60)` or equivalent `#1a1714` — dark brown undertone keeps palette cohesive |
| Gradient overload | Gradients signal "premium" and "AI-forward" | Competing gradients on hero background + cards + buttons + waveform creates visual noise; users can't find what to focus on; Suno's sterile look is partly a reaction to over-designed AI tool dashboards | One signature gradient (hero section only); flat colors everywhere else; gradient is the exclamation point, not the baseline |
| System font stack (Inter / system-ui) | Zero font-load overhead; pragmatic | Misses the core brand differentiation opportunity; Inter is the default choice for "no brand opinion" products; every generic AI tool uses it; the warmth and personality goal requires a typeface with character | Bricolage Grotesque (variable, 28KB woff2) for headings; Figtree or DM Sans for body — total overhead ~50-70KB, acceptable given brand return |
| Animations on every element | "Feels alive and dynamic" | Page-wide animation creates motion sickness risk (violates `prefers-reduced-motion`); makes the UI feel unstable rather than warm; heavy Framer Motion bundle if applied globally | Animate 3-5 key moments only: hero typewriter, card hover lift, generation loading, waveform playback cursor; all others static |
| Custom icon set | Brand cohesion; "Lucide looks generic" | Building or buying a custom icon set is weeks of work; Lucide (already in stack) has excellent coverage and is visually neutral enough to not conflict with brand; custom icons fail consistency without a system | Use Lucide with size/stroke tokens; add custom brand illustrations (1-3 SVGs) for hero/empty states rather than replacing the full icon set |
| Pixel-perfect Figma-first workflow | "Design before code" | With Next.js + Tailwind + shadcn/ui, designing in Figma then translating to code doubles the work; tokens defined in CSS vars are the single source of truth | Define tokens in CSS first (`:root` variables); use the `/style-guide` page as the living design reference; Figma is for exploration only, not handoff |
| Font sizes in px units | Familiar to designers | px ignores user browser font size preferences, breaking accessibility; WCAG and best practice require rem-based type | All font sizes in `rem`; define scale as: `0.75rem` (xs), `0.875rem` (sm), `1rem` (base), `1.125rem` (lg), `1.25rem` (xl), `1.5rem` (2xl), `2rem` (3xl), `3rem` (4xl), `4.5rem` (5xl) |

---

## Color Palette Specification

Specific values validated through research. Use OKLCH for shadcn/ui v2+ compatibility; hex equivalents provided for reference.

### Light Mode

| Token | OKLCH | Hex Equivalent | Role |
|-------|-------|----------------|------|
| `--background` | `oklch(0.98 0.01 85)` | `#fdf8f0` | Page background — warm cream |
| `--card` | `oklch(0.99 0.005 80)` | `#fefcf7` | Card surface — slightly warmer white |
| `--foreground` | `oklch(0.18 0.02 60)` | `#1e1a14` | Primary text — warm near-black |
| `--muted` | `oklch(0.94 0.01 85)` | `#f0ebe0` | Muted surface — for tags, secondary areas |
| `--muted-foreground` | `oklch(0.50 0.03 60)` | `#6b6255` | Secondary text — warm mid-gray |
| `--primary` | `oklch(0.65 0.18 55)` | `#c27c1a` | Primary brand — warm amber/golden |
| `--primary-foreground` | `oklch(0.99 0.005 80)` | `#fefcf7` | Text on primary |
| `--secondary` | `oklch(0.72 0.10 220)` | `#5ba8d4` | Sky blue — secondary brand color |
| `--secondary-foreground` | `oklch(0.18 0.02 60)` | `#1e1a14` | Text on secondary |
| `--accent` | `oklch(0.78 0.14 75)` | `#e8a848` | Accent — lighter amber for hover states |
| `--accent-foreground` | `oklch(0.18 0.02 60)` | `#1e1a14` | Text on accent |
| `--border` | `oklch(0.88 0.02 80)` | `#ddd0bb` | Borders — warm tan |
| `--ring` | `oklch(0.65 0.18 55)` | `#c27c1a` | Focus ring — matches primary |
| `--destructive` | `oklch(0.55 0.22 25)` | `#c0392b` | Error red |

### Dark Mode

| Token | OKLCH | Hex Equivalent | Role |
|-------|-------|----------------|------|
| `--background` | `oklch(0.14 0.02 60)` | `#1a1714` | Page background — warm near-black |
| `--card` | `oklch(0.18 0.02 58)` | `#231f1a` | Card surface — slightly lighter warm dark |
| `--foreground` | `oklch(0.93 0.01 85)` | `#f0ebe0` | Primary text — warm off-white |
| `--muted` | `oklch(0.22 0.02 58)` | `#2c2820` | Muted surface |
| `--muted-foreground` | `oklch(0.60 0.03 65)` | `#9c9283` | Secondary text |
| `--primary` | `oklch(0.78 0.16 75)` | `#e8a848` | Primary brand — brighter amber for dark bg |
| `--primary-foreground` | `oklch(0.14 0.02 60)` | `#1a1714` | Text on primary |
| `--secondary` | `oklch(0.65 0.12 220)` | `#4a95c8` | Sky blue — slightly muted on dark |
| `--secondary-foreground` | `oklch(0.93 0.01 85)` | `#f0ebe0` | Text on secondary |
| `--accent` | `oklch(0.70 0.14 75)` | `#d4943a` | Accent — amber, slightly darker |
| `--accent-foreground` | `oklch(0.14 0.02 60)` | `#1a1714` | Text on accent |
| `--border` | `oklch(0.28 0.02 58)` | `#3a342c` | Borders — warm dark border |
| `--ring` | `oklch(0.78 0.16 75)` | `#e8a848` | Focus ring |
| `--destructive` | `oklch(0.62 0.20 25)` | `#e05a47` | Error red — brighter on dark |

**Confidence:** MEDIUM. Exact OKLCH values are derived from research patterns (warm near-blacks, amber/sky-blue pairing for youthful brand) and shadcn/ui theming conventions. Values should be verified in browser with contrast checker before shipping. WCAG AA requires 4.5:1 for body text — `--foreground` on `--background` should hit ~12:1 in light mode, ~11:1 in dark mode at these values.

---

## Typography Specification

| Role | Font | Weights | Source | Rationale |
|------|------|---------|--------|-----------|
| Display / Hero headings | Bricolage Grotesque | 400, 600, 800 (variable) | Google Fonts | "Quirky and organic, full of character — confident, creative, and approachable"; variable font with optical-size axis; validated for warm/creative brands |
| Section headings (H2–H4) | Bricolage Grotesque | 600 | Google Fonts | Consistent with display; lighter weight keeps section headers from competing with hero |
| Body / UI copy | Figtree | 400, 500, 600 | Google Fonts | "Minimalist but not stiff, casual but not silly" — inherent warmth; pairs well with Bricolage Grotesque; validated pairing in research |
| Monospace / code | JetBrains Mono | 400 | Google Fonts | For style-guide page and any code/technical display; neutral |

**Pairing rationale:** Both Bricolage Grotesque and Figtree have closed apertures and rational construction — they share design DNA without being identical. Bricolage brings personality at large sizes; Figtree provides clarity at small sizes. Neither requires licensing fees.

**Alternative body font:** DM Sans — more neutral, slightly more corporate than Figtree; use if Figtree feels too casual for form inputs.

**Size scale (rem):**
```
xs:   0.75rem  (12px) — captions, tags, labels
sm:   0.875rem (14px) — secondary UI text, metadata
base: 1rem     (16px) — body copy, inputs
lg:   1.125rem (18px) — lead text, card descriptions
xl:   1.25rem  (20px) — small headings
2xl:  1.5rem   (24px) — section subheadings
3xl:  2rem     (32px) — section headings
4xl:  2.5rem   (40px) — page titles
5xl:  3.5rem   (56px) — hero display (desktop)
6xl:  4.5rem   (72px) — hero display (large screens)
```

---

## Visual Pattern Inventory

### What Makes Warm vs Cold (Research-Backed)

| Dimension | Cold / Sterile (Suno-style) | Warm / Playful (Target) |
|-----------|----------------------------|-------------------------|
| Background | `#0a0a0a` to `#1a1a2e` (cold near-black / dark blue) | `#fdf8f0` cream (light) / `#1a1714` warm near-black (dark) |
| Accent | Electric blue, cyan, neon purple | Amber/golden + sky blue — earthy + optimistic |
| Typography | Inter, system-ui — neutral, invisible | Bricolage Grotesque — personality at scale |
| Border radius | 4–6px (crisp, technical) | 12–16px (cards), 8px (inputs), 999px (pills/tags) |
| Shadows | None or strong drop shadow | Soft, warm-tinted box shadow: `0 4px 16px oklch(0.65 0.18 55 / 0.12)` |
| Spacing | Dense, information-heavy | Generous whitespace; breathing room signals confidence |
| Illustrations | None or 3D render hero | Flat/hand-drawn SVG accents; scribble underlines on key terms |
| Motion | Fade only | Subtle lift on hover (scale 1.02), bounce on CTA, shimmer on loading |
| Loading | Spinner | Shimmer skeleton using warm muted background |

### Component Visual Targets

**Cards (Song Variant Cards):**
- `--card` background with `--border` border
- `border-radius: 16px`
- Hover: `translateY(-2px)` + box-shadow increase (Framer Motion `whileHover`)
- Waveform: `--primary` (amber) for progress, `--muted` for unplayed

**Buttons (Primary CTA):**
- `--primary` background, `--primary-foreground` text
- `border-radius: 10px`
- Hover: `--accent` background (lighter amber), slight scale up
- Focus: `ring-2 ring-[--ring]` pattern

**Form Inputs:**
- `--card` background, `--border` border
- `border-radius: 8px`
- Focus: `--ring` colored border (amber), `--card` background stays
- Placeholder: `--muted-foreground` color

**Tag / Chip Components (Genre Tags):**
- `--muted` background, `--muted-foreground` text, `--border` border
- `border-radius: 999px` (pill)
- Active/selected: `--primary` background, `--primary-foreground` text

**Waveform Player:**
- Container: `--card` background, `border-radius: 12px`
- Waveform: `--primary` for played portion, `--muted` for unplayed
- Cursor: `--primary-foreground` (white in dark, cream in... actually white for contrast)
- Play button: `--primary` colored

---

## Feature Dependencies

```
Design Token System (CSS vars)
    └──required-by──> All Components (buttons, cards, inputs, typography)
                          └──required-by──> Style Guide Page (/style-guide)

Light Mode Palette
    └──required-by──> Dark Mode Palette (dark is a transformation, not separate)

Bricolage Grotesque font load
    └──required-by──> Hero section (typewriter, headline)
    └──required-by──> Style Guide Page (typography showcase)

Waveform color theming
    └──requires──> Design tokens defined (--primary, --muted)
    └──requires──> wavesurfer.js options updated (waveColor, progressColor)

Framer Motion typewriter (hero)
    └──requires──> Bricolage Grotesque loaded
    └──requires──> Design token for text color (--foreground / --primary)

Stacked circular footer
    └──requires──> Design tokens (background, foreground colors)
    └──enhances──> Brand coherence (consistent with rest of palette)
```

### Dependency Notes

- **Tokens must be defined before any component work:** If you restyle buttons before tokens exist, you'll hardcode values that need to change again. Tokens first is the non-negotiable first task.
- **Light mode is the reference:** Design all components in light mode first; derive dark mode from semantic token swaps. The opposite order (dark-first) produces cold dark modes.
- **Font loading before layout:** Next.js `next/font/google` should load both fonts at the `_app`/layout level with `display: swap`; undefined fonts cause layout shift that breaks screenshot testing.
- **Waveform colors depend on tokens:** The wavesurfer.js instance must read CSS variable values at mount time using `getComputedStyle` — not hardcoded hex values, so that waveform color updates automatically on theme toggle.

---

## MVP Definition

### Launch With (v1.1)

Minimum brand redesign needed before showing to users or building on top of.

- [ ] CSS variable design token file — all semantic tokens for light + dark mode defined
- [ ] `next/font/google` setup for Bricolage Grotesque + Figtree
- [ ] Tailwind config extended with token-mapped color utilities
- [ ] Global typography classes applied (display, heading, body, label, caption)
- [ ] Primary button redesign — amber CTA, correct radius, hover/focus states
- [ ] Card component redesign — warm background, shadow, radius, hover lift
- [ ] Generation form redesign — inputs, labels, tag chips, submit button
- [ ] Hero section redesign — Bricolage Grotesque headline, typewriter in brand color
- [ ] Waveform player color theming — primary accent for progress bar
- [ ] Loading skeleton — shimmer animation in warm muted tones
- [ ] Dark mode toggle — respects `prefers-color-scheme` + manual override via `next-themes`
- [ ] `/style-guide` dev page — color swatches, type scale, button variants, form states

### Add After Validation (v1.1.x)

- [ ] Micro-interaction polish — card hover lifts, button bounces, waveform entrance
- [ ] Stacked circular footer — spectrum-ui component with brand colors
- [ ] Scribble/underline accent SVGs for key hero phrases
- [ ] Illustration assets — 1-2 custom SVG spot illustrations for empty states / hero

### Future Consideration (v2+)

- [ ] Custom icon set — only if Lucide becomes limiting; high effort, low initial ROI
- [ ] Design-to-code Figma sync — not worth until team grows beyond solo dev
- [ ] Brand animation system — lottie files for onboarding; significant effort

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Design token CSS vars (light + dark) | HIGH | LOW | P1 |
| Typography setup (fonts + scale) | HIGH | LOW | P1 |
| Warm light-mode-first palette | HIGH | LOW | P1 |
| Warm dark mode (not cold black) | HIGH | LOW | P1 |
| Primary CTA button redesign | HIGH | LOW | P1 |
| Card component redesign | HIGH | LOW | P1 |
| Generation form redesign | HIGH | MEDIUM | P1 |
| Hero section redesign (Bricolage + typewriter) | HIGH | LOW | P1 |
| Waveform player color theming | MEDIUM | LOW | P1 |
| Loading skeleton (warm shimmer) | MEDIUM | LOW | P1 |
| Dark mode toggle + next-themes | HIGH | LOW | P1 |
| `/style-guide` page | MEDIUM | MEDIUM | P1 |
| Micro-interaction polish | MEDIUM | MEDIUM | P2 |
| Stacked circular footer | MEDIUM | LOW | P2 |
| Scribble SVG accents | LOW | LOW | P2 |
| Custom illustrations (empty states) | MEDIUM | MEDIUM | P2 |
| Custom icon set | LOW | HIGH | P3 |
| Figma design file | LOW | HIGH | P3 |

---

## Competitor Brand Analysis

| Design Dimension | Suno | Soundcloud | BandLab | Our Target |
|-----------------|------|------------|---------|------------|
| Background mode | Dark only | Light default, dark option | Light default | Light default, full dark mode |
| Primary palette | Dark gray + electric orange accent | Orange (`#ff5500`) on white | Dark with teal/purple accent | Warm cream + amber + sky blue |
| Typography | Clean modern sans (system-ui-adjacent) | SoundCloud uses proxima-nova-ish | Standard sans | Bricolage Grotesque (expressive) + Figtree (body) |
| Border radius | Low (4-6px — technical feel) | Medium (8px) | Low-medium | High (12-16px — soft, approachable) |
| Whitespace | Dense | Moderate | Dense | Generous — breathing room signals confidence |
| Illustrations | None | Album art dominant | None | Spot illustrations for empty states and hero |
| Motion | Minimal fade | Minimal | Minimal | Purposeful: hover lifts, typewriter, loading shimmer |
| Brand personality | Pro studio / serious | Music community | Music tool | Creative playground / personal moments |
| Target feeling | "I am making music" | "I am discovering music" | "I am in a DAW" | "I am making something special for someone" |

---

## Existing Component Audit

Components already built that need brand token application (not rebuilds — token application + visual adjustments):

| Component | What Needs Updating | Complexity | Notes |
|-----------|---------------------|------------|-------|
| `GenerationForm` | Input colors, button style, tag chips, spacing | MEDIUM | Core interaction surface; amber CTA is key moment |
| Waveform player (wavesurfer.js) | `waveColor`, `progressColor` options must use CSS var values | LOW | Use `getComputedStyle` to read `--primary` at mount |
| Hero section | Typography tokens, typewriter component color, CTA button | MEDIUM | Bricolage Grotesque at 5xl-6xl with amber typewriter |
| Example cards | Card token application, hover states, spacing | LOW | wavesurfer instances inside cards need waveform color update too |
| Loading animations | Replace with warm shimmer skeleton | LOW | Current animation unknown; replace with CSS `@keyframes` shimmer using `--muted` |
| Navigation / header | Color tokens, dark mode toggle placement | LOW | `--background`/`--foreground` application |
| Mode toggle | Style consistent with new tokens | LOW | Already exists; needs visual polish |

---

## Sources

- Suno UI analysis: [Metalab x Suno case study](https://worldbranddesign.com/metalab-shapes-suno-into-an-intuitive-ai-music-experience-built-for-creativity/), [Suno v4.5 interface guide](https://www.0580rc.com/ai-chat/suno-v45-interface-guide-2025/)
- Music color palettes with hex values: [Piktochart music palettes](https://piktochart.com/tips/music-color-palette), [media.io color palette](https://www.media.io/color-palette/music-color-palette.html)
- Warm brand color patterns: [inkbotdesign brand palettes](https://inkbotdesign.com/stunning-colour-palettes/), [Brand Alchemists warm palettes](https://thebrandalchemists.com/blogs/news/holistic-brand-color-palettes-2025)
- Blue + amber pairing research: [Venngage blue palettes](https://venngage.com/blog/blue-color-palettes/) — confirmed #8ecae6 / #ffb703 range as "youthful brand" pairing
- 2025 design trends: [Framer web design trends 2025](https://www.framer.com/blog/web-design-trends/), [2025 color trends Lummi](https://www.lummi.ai/blog/2025-color-trends)
- Typography — Bricolage Grotesque: [Google Fonts](https://fonts.google.com/specimen/Bricolage+Grotesque), [PimpMyType pairing guide](https://pimpmytype.com/bricolage-grotesque-font-pairing/)
- Typography — Figtree + DM Sans: [Untitled UI best free fonts](https://www.untitledui.com/blog/best-free-fonts)
- shadcn/ui color tokens (OKLCH): [shadcn/ui theming docs](https://ui.shadcn.com/docs/theming)
- Design tokens pattern with Tailwind: [Rich Infante dark mode tokens](https://www.richinfante.com/2024/10/21/tailwind-dark-mode-design-tokens-themes-css)
- Dark mode pitfalls: [Halo Lab dark UI tips](https://www.halo-lab.com/blog/dark-ui-design-11-tips-for-dark-mode-design), [influencers-time dark mode design principles](https://www.influencers-time.com/designing-effective-dark-mode-beyond-aesthetics-to-usability/)
- Skeleton loading best practices: [LogRocket skeleton loading](https://blog.logrocket.com/ux-design/skeleton-loading-screen-design/)
- BandLab UI/UX design: [BandLab blog — inside our tech](https://blog.bandlab.com/inside-our-tech-uiux-design/)
- Echo music app case study: [Tubik Studio](https://blog.tubikstudio.com/case-study-echo-designing-uxui/)

---
*Feature research for: Brand & Visual Design — MusicGenerator v1.1 Redesign*
*Researched: 2026-03-05*
