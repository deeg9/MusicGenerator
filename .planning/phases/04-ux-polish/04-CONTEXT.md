# Phase 4: UX Polish - Context

**Gathered:** 2026-03-05
**Status:** Ready for planning

<domain>
## Phase Boundary

The generation experience is smooth and clear — users know what mode they are in, see meaningful feedback while waiting, and arrive at the app through a landing page that sets expectations. This covers loading states with stage progression, mode switching polish, error/feedback UX improvements, and a landing hero with example generations.

</domain>

<decisions>
## Implementation Decisions

### Loading experience
- Loading state **replaces the form** — form disappears, loading animation takes its place. Clean focus on generation progress
- **3 stages**: Initializing → Generating → Finalizing. Transitions timed based on typical ~7s generation time
- **Waveform bars animation** — animated equalizer-style bars pulsing to suggest music being created. Violet gradient, thematic and on-brand
- Stage name displayed prominently alongside the waveform animation

### Landing page
- **Same page, hero above form** — landing content (hero, examples) sits above the generation form on `/`. Scroll down to create. No separate route
- **Playable example cards** — 3-4 pre-generated example songs as small cards with mini waveform players. Users can listen before creating their own
- **Hero tone: personal & warm** — "Create a song for someone you love" angle. Emphasizes the personal gift use case
- **Animated waveform accent** — subtle animated soundwave graphic behind or beside the headline. CSS/SVG animation, lightweight

### Error & feedback UX
- **Inline banner replaces alert()** — red/amber banner appears where the loading state was, with error message + retry button. No modal interruption
- **Form validation: inline per-field** — red text below each invalid field (e.g., "Prompt is required"). Standard form UX pattern
- **Success feedback: subtle transition** — loading animation smoothly transitions to result cards appearing. Results ARE the success feedback, no extra toast

### Mode toggle polish
- **Segmented control** — iOS-style segmented control with a sliding indicator background that animates between Simple and Custom
- **Smooth slide/fade transition** — lyrics textarea animates in with slide-down + fade when switching to Custom mode
- **Preserve lyrics on mode switch** — switching from Custom to Simple preserves typed lyrics; switching back restores them

### Claude's Discretion
- Elapsed timer visibility during loading (keep or remove based on visual fit with waveform animation)
- Retry behavior per error type (one-click retry for retryable errors, return-to-form for non-retryable)
- Mode description text below toggle (contextual hint or minimal, based on design fit)
- Exact waveform bar count, height, animation timing
- Example song selection and pre-generation workflow
- Stage transition timing (how long each stage shows before advancing)

</decisions>

<specifics>
## Specific Ideas

- Loading waveform bars should feel musical — like an equalizer responding to music being created
- Hero messaging targets the "gift" use case: creating a song for a loved one
- Example cards should demonstrate variety: different genres, moods, durations
- Segmented control should feel native/polished, not custom or janky
- The form-to-loading transition should feel smooth, not jarring (consider brief crossfade)

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `ModeToggle.tsx`: Current pill-button toggle — will be replaced with segmented control
- `GenerationResults.tsx`: Current polling/loading UI with elapsed timer — loading section will be replaced
- `GenerationPage.tsx`: Orchestrates form state, submission, polling — loading state swap lives here
- `WaveformPlayer.tsx`: wavesurfer.js integration — mini version could power example cards
- `globals.css`: Full design token system (violet primary, zinc backgrounds, DM Sans + Libre Baskerville fonts)
- `GenerationForm.tsx`: Mode state already managed here, lyrics conditionally rendered

### Established Patterns
- Components are stateless where possible, state lives in parent (GenerationPage/GenerationForm)
- Design tokens via CSS custom properties (bg-primary, text-muted-foreground, etc.)
- Violet accent throughout (waveform player, buttons, active states)
- Server Component thin shell (page.tsx) → client component (GenerationPage)

### Integration Points
- `GenerationPage.tsx`: Loading state swap (form → loading → results) lives here
- `page.tsx`: Currently wraps GenerationPage — hero/landing content goes above
- `GenerationForm.tsx`: Mode toggle replacement, field transitions, validation errors
- `GenerationResults.tsx`: Error banner replacement, success transition animation

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 04-ux-polish*
*Context gathered: 2026-03-05*
