# Phase 6: Component Audit + Core Redesign - Context

**Gathered:** 2026-03-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Audit every existing component for hardcoded Tailwind palette classes and restyle using semantic token utilities. The hero, generation form, loading state, waveform player, variant cards, and example cards all reflect the warm brand identity with the theme switch working correctly everywhere. No new components, no animations beyond CSS — those are Phase 7+.

</domain>

<decisions>
## Implementation Decisions

### Accent Color Mapping
- Amber (--accent) for all CTA/action buttons: Download MP3, Submit/Generate, Hero CTA
- Sky-blue (--primary) for interactive/playback elements: play/pause button, waveform progress bar, active card ring + glow
- EQ loading bars use amber gradient (from-accent to-accent/70) — generating is an action
- Secondary/outline buttons use neutral tokens: border-border text-foreground hover:bg-secondary
- Active variant card ring: ring-primary/50 shadow-primary/10 (sky-blue, "this is playing")
- Error text uses --destructive token everywhere (replaces hardcoded text-red-400)

### Hero Section Redesign
- Big and bold: 6xl-7xl headline with Bricolage Grotesque, generous py-24 padding
- Amber radial glow/gradient blob behind the headline — editorial, retro-futuristic feel
- Hero CTA button: bg-accent text-accent-foreground (amber, consistent with amber=action rule)
- Typewriter animated words: text-primary (sky-blue) to differentiate from headline text-foreground
- Keep existing SVG waveform as background texture, combine with amber glow

### Card & Result Styling
- VariantCard base: bg-card border-border shadow-subtle (warm, floating cards)
- Download MP3 button: full amber (bg-accent text-accent-foreground rounded-lg)
- WAV/secondary download: neutral outline (border-border text-foreground hover:bg-secondary)
- All card metadata (variant label, duration, file size): text-muted-foreground
- Hover lift effect deferred to Phase 7 (Framer Motion whileHover)

### Waveform Theme Sync
- Progress bar: sky-blue (--primary) in both modes
- Wave background color: --muted token
- Play/pause button: solid bg-primary text-primary-foreground rounded-full
- Theme change: wavesurfer.setOptions() re-init with new hex from getComputedStyle() — no destroy/recreate, no audio interruption
- Loading placeholder: bg-muted (replaces bg-zinc-800)

### Claude's Discretion
- Exact implementation of amber radial glow (CSS radial-gradient vs pseudo-element)
- EnhancedCaptionDisplay styling (minor component, follow card patterns)
- GenerationPage container styling (bg-zinc-950 → bg-background + layout adjustments)
- ModeToggle and GenreChips token updates (already partially using semantic tokens)
- Grep audit methodology and ordering of component updates
- How to read OKLCH values from CSS vars for wavesurfer JS hex conversion

</decisions>

<specifics>
## Specific Ideas

- Two-color accent system: amber = action (CTAs, download, generate), sky-blue = interactive (playback, selection, focus)
- Hero should feel like a statement piece — editorial/fashion magazine above the fold
- Cards should float with shadows, not feel flat — "warm and inviting creative platform"
- Waveform theme sync must be seamless — no flicker, no audio interruption on toggle

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `globals.css`: Full semantic token system already defined (--primary, --accent, --card, --muted, --destructive, etc.)
- `primitives.css`: OKLCH color primitives (cream, amber, sky, neutral shades)
- `theme-provider.tsx` + `theme-toggle.tsx`: next-themes integration already working
- `ExampleCard.tsx`: Already uses semantic tokens (bg-card, text-foreground) — good reference pattern
- `GenerationForm.tsx`: Already clean with semantic tokens — no changes needed

### Established Patterns
- Tailwind v4 with CSS-based config, @theme inline bridge
- Semantic token usage: bg-card, text-foreground, border-border, text-muted-foreground
- next/font variable injection (--font-bricolage, --font-figtree)
- Shadows defined as --shadow-subtle, --shadow-medium, --shadow-elevated

### Integration Points
- `WaveformPlayer.tsx`: Needs useTheme() hook from next-themes to detect resolvedTheme changes
- `LoadingAnimation.tsx`: EQ bar gradient needs token swap (violet → amber)
- `VariantCard.tsx`: Most hardcoded classes — full rewrite of className strings
- `GenerationPage.tsx`: Container bg-zinc-950 → bg-background
- `EnhancedCaptionDisplay.tsx`: Border/bg/text zinc classes → semantic tokens

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 06-component-audit-core-redesign*
*Context gathered: 2026-03-05*
