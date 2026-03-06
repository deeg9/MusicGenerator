# Phase 10: Library Data Layer - Context

**Gathered:** 2026-03-05
**Status:** Ready for planning

<domain>
## Phase Boundary

The /library route renders real song data from Supabase. All previously generated songs are fetched server-side via Drizzle, presigned URLs are generated server-side, and an empty state is shown when no songs exist. No client-side loading spinner — data is present on first paint (SSR). Playback functionality, GSAP animations, and persistent player are Phase 11.

</domain>

<decisions>
## Implementation Decisions

### Song title derivation
- Display title derived from promptText — truncate to first ~40 characters with ellipsis if longer
- Fallback title: "Untitled Song" when promptText is empty or missing
- One entry per generation (not per variant) — variants are an internal detail, user picks which to play in Phase 11
- Only show completed generations (status='completed') — no failed/pending songs in library

### List layout style
- Vertical card list — full-width cards stacked vertically (Suno library pattern)
- Each card is a horizontal row: title, genre tags, duration, generation date
- Simple header: "Library" title + song count (e.g. "12 songs"), no sort controls (always newest-first per SC)
- Fetch 50 songs max server-side (50-item LIMIT in Drizzle query) — sufficient for prototype scale
- Generate MP3 presigned URLs now — include them in server data so Phase 11 can wire play buttons without additional API calls

### Tag & metadata display
- Genre tags displayed as colored pills/chips — split genreTags on comma, use brand accent colors (amber/muted variants)
- Duration format: mm:ss (e.g. "2:00") — standard music player convention
- Date format: relative time ("2 hours ago", "yesterday", "Mar 3") — feels dynamic and current
- Instrumental songs get a small "Instrumental" badge alongside genre tags

### Empty state
- Keep Phase 9's existing empty state design (Library icon in circle + "Your library is empty" + CTA)
- Extract to separate LibraryEmpty component (src/components/LibraryEmpty.tsx) for clean separation and reuse
- CTA navigates to home (/) — will be updated to /?mode=create when Phase 12 workspace exists
- Add app/library/error.tsx boundary for friendly "Something went wrong" fallback if DB query fails
- Pure SSR for happy path — no loading.tsx, no client-side spinner

</decisions>

<specifics>
## Specific Ideas

- Suno's library is the visual reference — clean vertical list, not a grid or table
- Cards should feel scannable — users are looking for a specific song to replay
- Presigned URLs included now to avoid Phase 11 having to add a separate API call for playback

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/r2.ts`: `getAudioPresignedUrl()` — generates time-limited presigned URLs for R2 objects, already handles MP3 keys
- `src/lib/r2.ts`: `buildR2Mp3Key()` — builds deterministic MP3 key from generationId + variantIndex
- `src/db/schema.ts`: `generations` table with promptText, genreTags, duration (integer seconds), instrumental (boolean), startedAt, status
- `src/db/schema.ts`: `outputs` table with r2Key, mp3R2Key, variantIndex — linked via generationId foreign key
- `src/db/schema.ts`: `generationsRelations` and `outputsRelations` — Drizzle relations for join queries
- `src/db/index.ts`: `db` singleton with schema loaded — ready for `db.query.generations.findMany()`

### Established Patterns
- Drizzle ORM with postgres.js client (prepare: false for Supabase pooler)
- R2 presigned URLs with 24-hour expiry (default in getAudioPresignedUrl)
- Next.js App Router: metadata export pattern established in existing library stub
- Brand tokens: `text-foreground`, `text-muted-foreground`, `bg-accent/10`, `text-primary` used throughout

### Integration Points
- `src/app/library/page.tsx` — existing stub page to be replaced with RSC data fetching
- `src/components/` — LibraryEmpty component will live here alongside existing components
- `src/app/library/error.tsx` — new error boundary for the library route
- Sidebar Library link already wired (Phase 9) — navigates to /library with active state

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 10-library-data-layer*
*Context gathered: 2026-03-05*
