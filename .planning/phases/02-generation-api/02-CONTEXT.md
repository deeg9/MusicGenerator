# Phase 2: Generation API - Context

**Gathered:** 2026-03-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can submit any combination of text prompt, custom lyrics, genre tags, duration, and instrumental mode and receive two song variants back through the full BFF stack. This includes the frontend form, API wiring, and results display. No waveform player (Phase 3) or fancy loading animations (Phase 4).

</domain>

<decisions>
## Implementation Decisions

### Input form design
- Two modes: Simple and Custom, with a visible toggle built in Phase 2
- **Simple mode**: text prompt + genre tag chips + duration preset selector + instrumental toggle
- **Custom mode**: adds a free-form lyrics textarea with [Verse]/[Chorus]/[Bridge] tag hints shown inline
- Genre input: preset chips (mood + genre mix, ~10 chips) that are multi-selectable, plus a custom text field for additional tags
- Preset genre chips: mood + genre mix (e.g., Happy, Sad, Chill, Energetic, Romantic, Pop, Rock, Jazz, Hip-Hop, Electronic)

### Duration presets
- Three presets only, no custom slider
- Short (1 min) = 60s, Standard (2 min) = 120s, Full (4 min) = 240s
- Labels show name + time: "Short (1 min)" / "Standard (2 min)" / "Full (4 min)"
- Default selection: Standard (2 min)

### Genre/style tag handling
- Use ACE-Step's `/format_input` endpoint to LLM-enhance the user's prompt + genre tags into a full caption with BPM, key, time signature
- Show the enhanced caption to the user in a read-only area (transparency)
- Selected genre chips + custom text tags are combined and sent alongside the prompt to format_input

### Polling & results UX
- Frontend polls `/api/status/:jobId` every 2.5 seconds using a custom `useGenerationStatus(jobId)` React hook
- During generation: show "Generating your song..." with elapsed time counter
- Two variants displayed side by side as cards when complete
- Each variant card includes basic HTML `<audio>` element with native controls + download link (Phase 3 replaces with waveform player)
- Form stays visible above results — user can tweak inputs and regenerate immediately

### Claude's Discretion
- Exact layout/spacing of form controls
- Genre chip visual style
- Enhanced caption display styling
- Error state presentation
- Mobile responsive behavior for side-by-side cards (may stack on narrow screens)

</decisions>

<specifics>
## Specific Ideas

- Mode toggle should feel natural — Simple for quick vibes, Custom for songwriter control
- Enhanced caption display builds trust by showing what the AI model actually receives
- Side-by-side variant cards should make it easy to compare and pick a favorite

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/runpod.ts`: `submitGenerationJob()` already accepts prompt, lyrics, audioDuration, batchSize, bpm, keyScale, timeSignature, seed — Phase 2 needs to wire genre tags through format_input first
- `src/lib/r2.ts`: Audio upload/presigned URL generation already working
- `src/lib/errors.ts`: Error classification and response formatting ready
- `src/db/schema.ts`: `generations` table already has promptText, lyrics, genreTags, duration, instrumental columns — no schema changes needed

### Established Patterns
- API routes use Next.js App Router (`src/app/api/`)
- Validation is manual (no Zod on API routes yet, but env.ts uses Zod)
- Error responses follow `{ error: { category, retryable, message, technical } }` shape
- Database operations use Drizzle ORM with relational queries

### Integration Points
- `/api/generate` route needs to call format_input before submitGenerationJob
- New frontend page replaces the placeholder `src/app/page.tsx`
- `useGenerationStatus` hook will call `/api/status/:jobId`
- Genre tags currently stored in DB but not sent to ACE-Step — need to wire through format_input

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 02-generation-api*
*Context gathered: 2026-03-04*
