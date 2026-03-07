# Phase 30: Email Infrastructure - Context

**Gathered:** 2026-03-07
**Status:** Ready for planning

<domain>
## Phase Boundary

Resend is the verified sending domain for Notevra, all Supabase auth emails route through Resend SMTP, and two branded React Email templates exist (song-ready for creator, gift delivery for recipient) with working API routes. No payment, no dashboard integration — just the email infrastructure and templates.

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion (research-informed)

The user wants all decisions driven by best-practice research from enterprise transactional email patterns. The researcher should investigate and the planner should decide based on findings for:

**Email content & tone:**
- Subject lines for song-ready and gift delivery emails
- Body copy structure and wording
- CTA button text and hierarchy
- Tone: warm and friendly, consistent with Notevra's gift service personality (established in Phase 28)

**Template visual layout:**
- Logo/header placement and styling
- Section hierarchy and spacing
- Button prominence and design
- Whether gift delivery email shows quiz context (recipient name, message from creator)
- Footer content (unsubscribe, company info)

**Sender identity & domain:**
- From name and from address format
- Reply-to behavior
- Resend domain verification approach

**Link destinations & auth flow:**
- Where creator song-ready link points (success page vs dashboard)
- Where recipient gift link points (standalone listen page vs full site)
- Whether recipient needs to sign up to listen

### Locked constraints (from prior phases)
- Baby blue primary + mellow yellow secondary color palette
- Libre Baskerville headings, DM Sans body text
- Warm, friendly, emotional personality (not corporate)
- Songs table has: recipientName, relationship, genre, quizData (occasion, qualities, memories, message, voiceGender), r2Mp3Key
- R2 presigned URLs for audio access (presign at read time, not stored)

</decisions>

<specifics>
## Specific Ideas

- Research what enterprise companies do for transactional emails (Spotify wrapped emails, gift card delivery emails, music service notifications) and model after best practices
- The gift delivery email is the higher-stakes template — it's the first impression for the recipient

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `r2.ts`: `getAudioPresignedUrl(key)` — generates time-limited URLs for audio playback
- `src/db/schema.ts`: `songs` table with all quiz context fields
- `src/db/index.ts`: Drizzle `db` export for querying songs
- Design tokens in `globals.css` using OKLCH — email templates should reference the same palette values
- `src/lib/supabase/server.ts`: Server-side Supabase client factory

### Established Patterns
- API routes in `src/app/api/` with Next.js Route Handlers
- Server-side DB access via Drizzle (bypasses RLS with postgres role)
- Supabase auth via `@supabase/ssr` — auth emails currently use Supabase's default SMTP

### Integration Points
- Supabase Dashboard: SMTP settings need Resend credentials
- `next.config.ts`: May need `serverExternalPackages` for React Email
- New routes: `/api/send-creator-email`, `/api/send-recipient-email`
- Email templates: likely `src/emails/` or `src/lib/emails/` directory
- Success page (future Phase 32): will call send-recipient-email route
- Poll-job or quiz-generate (future wiring): will trigger send-creator-email

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 30-email-infrastructure*
*Context gathered: 2026-03-07*
