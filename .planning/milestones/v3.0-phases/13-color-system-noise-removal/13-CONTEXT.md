# Phase 13: Foundation and Visual Identity - Context

**Gathered:** 2026-03-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Remove all old UI (sidebar, workspace, library, generation form, dark mode, bottom player) and establish the Notevra gift service foundation — new warm color tokens (baby blue + mellow yellow), new typography (DM Sans + Libre Baskerville), simple header nav with brand, and rename to Notevra throughout. The homepage shows a clean placeholder; full landing page content is Phase 14.

</domain>

<decisions>
## Implementation Decisions

### Color Token Values
- Baby blue primary hue, mellow yellow secondary — exact OKLCH values at Claude's discretion
- Direction: warm, friendly, gift-service feel — not corporate
- Background: "soft cloud white" — complement blue/yellow without competing
- Number of shade steps per color: Claude's discretion based on actual usage needs
- Must replace all old cream/amber/sky primitives — no old tokens should remain

### Header Nav Design
- Notevra wordmark in header (text-only is fine, icon can come later)
- "Create Your Song" CTA button always visible
- Additional nav links, sticky behavior, and mobile approach: Claude's discretion
- Must render on every page

### Removal Strategy
- All old UI removed: sidebar, workspace mode, library page, generation form, dark mode toggle, bottom audio player
- Homepage content after removal: Claude's discretion (placeholder that demonstrates new visual identity)
- Old component files (GenerationForm, WaveformPlayer, LibrarySongCard, Sidebar, BottomAudioPlayer, etc.): Claude's discretion on delete vs deprecate
- Route handling (/library, /style-guide): Claude's discretion
- Dependency cleanup (gsap, wavesurfer.js, next-themes, etc.): Claude's discretion
- AppShell removal must be atomic — layout.tsx + providers + old components together (from research)

### Footer
- Must show Notevra branding
- Approach (placeholder vs adapted vs rebuilt): Claude's discretion
- Link content: Claude's discretion
- Full footer design deferred to Phase 14 (LAND-06)

### Claude's Discretion
All four areas were delegated to Claude's judgment with the constraints noted above. Key freedom areas:
- Exact OKLCH color values for baby blue, mellow yellow, and background
- Shade scale depth (3 vs 5 steps per color)
- Header stickiness, nav links beyond CTA, mobile behavior
- Whether to delete old files or deprecate them
- Whether to keep /style-guide for token verification
- Whether to clean up old dependencies now or defer
- Homepage placeholder content between Phase 13 and Phase 14
- Footer implementation approach

</decisions>

<specifics>
## Specific Ideas

- Reference UI exists at `/Users/deeg/Downloads/notera-main.zip` — adapt the warm visual feel from this prototype
- "Warm baby blue + mellow yellow" is the stated brand direction — not dark, not corporate
- DM Sans body + Libre Baskerville headings — these are specific font choices, not flexible
- Brand is "Notevra" — no references to "Notera" or "MusicGenerator" should remain in user-visible text

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `primitives.css`: OKLCH token structure can be rewritten in-place with new baby blue/yellow values
- `globals.css`: Semantic token mapping pattern (`:root` vars + `@theme inline` bridge) carries forward — just new values
- `layout.tsx`: Font loading pattern via `next/font/google` carries forward — just swap font families

### Established Patterns
- Tailwind v4 `@theme inline` bridge maps CSS vars to utility classes — keep this pattern
- OKLCH color format throughout — continue using OKLCH for new palette
- Semantic token layer (--primary, --accent, etc.) → Tailwind utility classes — keep this indirection

### Integration Points
- `layout.tsx` is the entry point: currently imports ThemeProvider + AppShell — will be rewritten to import new header component
- `globals.css` imports `primitives.css` — token chain stays, values change
- `page.tsx` (homepage) currently renders HeroSection + workspace — will be gutted for placeholder

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 13-color-system-noise-removal*
*Context gathered: 2026-03-05*
