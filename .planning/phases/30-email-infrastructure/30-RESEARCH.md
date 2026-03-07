# Phase 30: Email Infrastructure - Research

**Researched:** 2026-03-07
**Domain:** Resend + React Email + Supabase SMTP + Next.js App Router
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Baby blue primary + mellow yellow secondary color palette
- Libre Baskerville headings, DM Sans body text
- Warm, friendly, emotional personality (not corporate)
- Songs table has: recipientName, relationship, genre, quizData (occasion, qualities, memories, message, voiceGender), r2Mp3Key
- R2 presigned URLs for audio access (presign at read time, not stored)

### Claude's Discretion
All decisions driven by best-practice research:
- Subject lines for song-ready and gift delivery emails
- Body copy structure and wording
- CTA button text and hierarchy
- Template visual layout (logo/header, section hierarchy, footer content)
- From name and from address format, reply-to behavior
- Resend domain verification approach
- Where creator song-ready link points
- Where recipient gift link points
- Whether recipient needs to sign up to listen
- Whether gift delivery email shows quiz context

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| EMAIL-01 | Resend configured as Supabase SMTP provider for auth emails | SMTP credentials: smtp.resend.com:465, user=resend, pass=API key. Configure in Supabase Dashboard → Auth → Email → SMTP Settings |
| EMAIL-02 | Creator receives song-ready email with listen/download link after generation | Resend SDK + React Email template. Route `/api/send-creator-email`. Presign R2 MP3 at 604,800 seconds (7-day max) |
| EMAIL-03 | Recipient receives branded gift delivery email with song context and listen link | Resend SDK + React Email template. Route `/api/send-recipient-email`. Include recipientName, quizData.message from songs table |
| EMAIL-04 | Email templates use Notevra brand styling (baby blue, Libre Baskerville, warm tone) | React Email inline styles — OKLCH not supported in email clients, convert to hex. Baby blue = #6fa3c8 approx. Use <Font> component for Libre Baskerville |
</phase_requirements>

---

## Summary

Phase 30 wires up transactional email delivery for Notevra using the Resend platform and React Email templating library. The stack is well-established: `resend` SDK sends emails, `@react-email/components` provides cross-client-compatible JSX primitives, and Supabase's custom SMTP setting routes auth emails through Resend's infrastructure. All three are in active development and support Next.js 16 + React 19.

The work splits cleanly into three plans matching the outlined structure: (1) Resend domain DNS setup + Supabase SMTP wiring, (2) Two React Email templates with Notevra brand styling, (3) Two API route handlers that query the songs table, generate presigned URLs, and call Resend.

The single highest-risk item is R2 presigned URL expiry: Cloudflare R2's hard maximum is 604,800 seconds (7 days). This was noted as "7 days minimum" in STATE.md, but 7 days is the ceiling, not the floor. Gift delivery emails must use exactly 604,800 seconds — there is no longer expiry option. This constraint must flow into the send-recipient-email route design.

**Primary recommendation:** Install `resend` + `@react-email/components`, add both to `serverExternalPackages` in `next.config.ts`, build templates with inline styles (not OKLCH — convert to hex/rgb), set gift email presigned URLs to 604800 seconds.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| resend | latest (^4.x) | SDK to call Resend API and send emails | Official SDK, maintained by Resend team, first-class Next.js support |
| @react-email/components | latest (^0.0.x) | JSX email primitives (Html, Body, Section, Button, etc.) | Industry standard for React-based email templates, cross-client compatible |
| react-email | latest (devDep) | Local preview server (`npm run email`) | Dev tooling only — not bundled into production |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @react-email/render | (bundled with @react-email/components) | Converts React tree to HTML string | Automatically used by Resend SDK when you pass `react:` prop |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @react-email/components | Handlebars / Mjml | No JSX type safety, no live preview, more complex build step |
| Resend SDK | nodemailer + SMTP | Resend SDK is simpler and rate-limit-aware; SMTP fine for Supabase auth emails only |

### Installation

```bash
npm install resend @react-email/components
npm install -D react-email
```

---

## Architecture Patterns

### Recommended Project Structure

```
src/
├── emails/                     # React Email templates (server-only)
│   ├── SongReadyEmail.tsx      # Creator receives after generation completes
│   └── GiftDeliveryEmail.tsx   # Recipient receives with listen link
├── app/
│   └── api/
│       ├── send-creator-email/
│       │   └── route.ts        # POST — looks up song, presigns URL, sends email
│       └── send-recipient-email/
│           └── route.ts        # POST — looks up song, presigns URL, sends gift email
└── lib/
    └── resend.ts               # Resend client singleton
```

### Pattern 1: Resend Client Singleton

**What:** Single Resend instance shared across route handlers
**When to use:** Always — avoids recreating the SDK client per request

```typescript
// src/lib/resend.ts
import { Resend } from 'resend';

export const resend = new Resend(process.env.RESEND_API_KEY);
```

### Pattern 2: Route Handler — Query Song, Presign, Send

**What:** Standard pattern for send-* routes matching existing quiz-generate structure
**When to use:** Both send-creator-email and send-recipient-email follow this pattern

```typescript
// Source: established project pattern (quiz-generate/route.ts)
export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = await request.json();
  // 1. Validate input (songId, optional recipientEmail)
  // 2. Query songs table via Drizzle db (bypasses RLS — postgres role)
  // 3. Presign R2 MP3 URL (604800 seconds for gift email, 86400 for creator)
  // 4. Render and send via resend.emails.send()
  // 5. Return { id } from Resend or structured error
}
```

### Pattern 3: React Email Template Structure

**What:** Inline-style JSX email template using @react-email/components primitives
**When to use:** All email templates — never use CSS classes in email, use inline styles

```typescript
// Source: React Email docs + Resend Next.js guide
import {
  Html, Head, Body, Container, Section,
  Heading, Text, Button, Link, Hr, Font, Preview,
} from '@react-email/components';

interface SongReadyEmailProps {
  recipientName: string;
  listenUrl: string;
  downloadUrl: string;
  genre: string;
}

export function SongReadyEmail({ recipientName, listenUrl, downloadUrl, genre }: SongReadyEmailProps) {
  return (
    <Html lang="en">
      <Head>
        <Font
          fontFamily="Libre Baskerville"
          fallbackFontFamily="Georgia"
          webFont={{ url: 'https://fonts.gstatic.com/s/librebaskerville/v14/kmKnZrc3Hgbbcjq75U4uslyuy4kn0pNexA.woff2', format: 'woff2' }}
          fontWeight={400}
          fontStyle="normal"
        />
      </Head>
      <Preview>Your song for {recipientName} is ready to listen</Preview>
      <Body style={{ backgroundColor: '#faf9f7', fontFamily: 'DM Sans, Helvetica, Arial, sans-serif' }}>
        <Container style={{ maxWidth: '520px', margin: '40px auto', padding: '0 20px' }}>
          {/* Baby blue header band */}
          <Section style={{ backgroundColor: '#6ba3c9', borderRadius: '12px 12px 0 0', padding: '24px 32px' }}>
            <Heading style={{ fontFamily: '"Libre Baskerville", Georgia, serif', color: '#ffffff', fontSize: '22px', margin: 0 }}>
              Notevra
            </Heading>
          </Section>
          {/* Content */}
          <Section style={{ backgroundColor: '#ffffff', padding: '32px', borderRadius: '0 0 12px 12px' }}>
            <Text>...</Text>
            <Button href={listenUrl} style={{ backgroundColor: '#6ba3c9', color: '#ffffff', borderRadius: '8px', padding: '12px 24px' }}>
              Listen Now
            </Button>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
```

### Pattern 4: next.config.ts serverExternalPackages

**What:** Prevents Turbopack from bundling Node-only packages that must remain external
**When to use:** Required for `react-email` and `resend` to avoid module resolution issues with Next.js Turbopack

```typescript
// next.config.ts — add to existing config
const nextConfig: NextConfig = {
  serverExternalPackages: ['ffmpeg-static', 'react-email', '@react-email/render'],
};
```

Source: GitHub discussion resend/react-email#1816 — `react-email` and `@react-email/render` must be external to avoid Prettier version conflicts with Turbopack.

### Anti-Patterns to Avoid

- **OKLCH in email styles:** Email clients (Gmail, Outlook) do not support OKLCH color functions. Convert all tokens to hex/rgb before use in templates. Baby blue `oklch(0.72 0.12 220)` ≈ `#6ba3c9`.
- **CSS classes in email templates:** Use only inline `style={{}}` objects. CSS class-based styling is stripped by most email clients.
- **Tailwind in email without `<Tailwind>` wrapper:** If using the Tailwind component from React Email, it must wrap all content. For this project, inline styles are simpler and more predictable.
- **Storing presigned URLs:** Per existing project decision — presign at send time, never store the URL.
- **Long-lived presigned URLs:** R2 hard maximum is 604,800 seconds (7 days). Do not attempt longer expiry.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Email HTML rendering | Custom HTML string builder | `@react-email/components` | Cross-client compatibility is deeply non-trivial (MSO conditionals, table layouts, Outlook quirks) |
| SMTP deliverability | Raw nodemailer + own SMTP | Resend | SPF/DKIM reputation, bounce handling, rate limiting built in |
| Email previewing | Custom preview server | `react-email` dev server (`npm run email`) | Live preview with hot reload, multi-client simulation |
| Supabase auth email routing | Custom webhook to intercept auth emails | Supabase custom SMTP setting | Native integration, no code required |

**Key insight:** Email rendering is the classic hand-roll trap — it looks simple but Outlook, Gmail, and Apple Mail each parse HTML differently. `@react-email/components` encapsulates years of workarounds.

---

## Common Pitfalls

### Pitfall 1: OKLCH Colors Fail in Email Clients

**What goes wrong:** Template renders fine in browser preview but colors are missing or wrong in Gmail/Outlook.
**Why it happens:** Email clients use old WebKit or Word rendering engines that don't support modern CSS color functions.
**How to avoid:** Convert all OKLCH tokens to hex before use in email inline styles. Reference conversion table in Code Examples section.
**Warning signs:** Template looks correct in `react-email` preview server but broken in Litmus/Email on Acid test.

### Pitfall 2: R2 Presigned URL 7-Day Maximum

**What goes wrong:** Code sets `expiresIn: 60 * 60 * 24 * 30` (30 days) expecting a month-long link — Cloudflare silently caps it or returns an error.
**Why it happens:** Cloudflare R2 hard maximum is 604,800 seconds (7 days) per official docs. This is shorter than S3's 7-day maximum as well.
**How to avoid:** Set `expiresIn: 604800` in both email routes. Document in code comments that this is the maximum, not a choice.
**Warning signs:** Links in emails expire before recipient opens them (if opened >7 days late).

### Pitfall 3: Supabase SMTP "From" Address Must Match Verified Domain

**What goes wrong:** Supabase auth emails go to spam or bounce after SMTP switch.
**Why it happens:** If the "Sender Email" in Supabase SMTP settings uses a different domain than the verified Resend domain, DKIM fails.
**How to avoid:** Sender email in Supabase SMTP settings must be `noreply@notevra.com` (or `hello@notevra.com`) — must match the verified domain.
**Warning signs:** Auth emails deliver from Supabase sandbox (`noreply@mail.supabase.io`) instead of custom domain.

### Pitfall 4: react-email / Turbopack Module Resolution

**What goes wrong:** `Module not found: @react-email/render` or Prettier version conflict warnings in Next.js dev server.
**Why it happens:** Turbopack resolves the optional `@react-email/render` import inside the resend package differently than webpack.
**How to avoid:** Add `'react-email'` and `'@react-email/render'` to `serverExternalPackages` in `next.config.ts`. This keeps them as Node.js externals instead of bundled.
**Warning signs:** Console warning about `prettier` version mismatch between locations.

### Pitfall 5: Route Queries Must Use Drizzle `db` (Postgres Role, Bypasses RLS)

**What goes wrong:** `send-creator-email` route cannot read the song record because Supabase RLS blocks the anon/authenticated role.
**Why it happens:** The route runs server-side but may not have the user's session. RLS `songs-authenticated-select` requires `user_id = auth.uid()`.
**How to avoid:** Use the Drizzle `db` import (postgres role connection) as established in all existing routes — never the Supabase client for song lookups. The postgres role bypasses RLS.
**Warning signs:** `db.select().from(songs).where(eq(songs.id, songId))` returns empty array even though record exists.

---

## Code Examples

### Resend Send Call with React Email

```typescript
// Source: https://resend.com/docs/send-with-nextjs
import { resend } from '@/lib/resend';
import { SongReadyEmail } from '@/emails/SongReadyEmail';

const { data, error } = await resend.emails.send({
  from: 'Notevra <hello@notevra.com>',
  to: [creatorEmail],
  subject: `Your song for ${recipientName} is ready`,
  react: SongReadyEmail({ recipientName, listenUrl, downloadUrl, genre }),
});

if (error) {
  console.error('[send-creator-email] Resend error:', error);
  return NextResponse.json({ error }, { status: 500 });
}
```

### Supabase SMTP Configuration (Dashboard)

```
Host:     smtp.resend.com
Port:     465
Username: resend
Password: re_xxxxxxxxxxxxxxxxxxxxxxxxxx  (Resend API key)
Sender name:  Notevra
Sender email: noreply@notevra.com
```

Source: https://resend.com/docs/send-with-supabase-smtp

### Resend Domain DNS Records

Resend provides exact values in its dashboard after adding a domain. The required record types are:

| Record Type | Purpose | Generated By |
|-------------|---------|--------------|
| TXT (SPF) | Authorizes Resend servers to send mail for your domain | Resend dashboard |
| TXT (DKIM) | Cryptographic signing key for email authenticity | Resend dashboard |
| MX (optional) | Bounce and complaint feedback loop | Resend dashboard |

Propagation time: up to 72 hours; typically 15–60 minutes. Domain status moves from `pending` → `verified` automatically once DNS resolves.

### OKLCH → Hex Color Conversion for Email Templates

| Token | OKLCH | Hex (email-safe) | Use |
|-------|-------|-----------------|-----|
| `--blue-500` (primary) | `oklch(0.72 0.12 220)` | `#6ba3c9` | Header background, CTA button |
| `--blue-300` | `oklch(0.85 0.08 220)` | `#a8c8e0` | Subtle accents |
| `--yellow-400` (accent) | `oklch(0.82 0.17 88)` | `#d4b94a` | Secondary highlight |
| `--cloud-50` (background) | `oklch(0.99 0.008 240)` | `#f7f8fa` | Body background |
| `--navy-900` (text) | `oklch(0.25 0.02 250)` | `#2d2e38` | Body text |
| `--navy-500` (muted) | `oklch(0.52 0.02 250)` | `#7a7c8a` | Footer, muted copy |

Note: Hex values are approximations computed from the OKLCH values. Validate visually in preview.

### R2 Presigned URL for Email (7-Day Maximum)

```typescript
// Source: Cloudflare R2 docs — 604800 seconds is the hard maximum
const listenUrl = await getAudioPresignedUrl(song.r2Mp3Key, 604800);
// DO NOT attempt values > 604800 — R2 will reject or cap them
```

### next.config.ts with React Email External Packages

```typescript
// next.config.ts
const nextConfig: NextConfig = {
  serverExternalPackages: ['ffmpeg-static', 'react-email', '@react-email/render'],
};
```

---

## Email Content Recommendations (Claude's Discretion)

Research into enterprise transactional email patterns (Spotify, Artifact, gift card services) and Postmark's 2026 best practices guide informs these recommendations.

### SongReadyEmail (Creator)

**Subject:** `Your song for {recipientName} is ready`
- Clear, specific, tells the creator exactly what happened
- Under 50 characters, no clever phrasing needed

**Preheader:** `Listen, download, and share — it's yours to keep.`

**Body structure:**
1. Baby blue header band — "Notevra" wordmark in Libre Baskerville
2. Headline (Libre Baskerville): "A song for {recipientName} is ready"
3. Short paragraph (DM Sans): Warm 1–2 sentences acknowledging the creation
4. Primary CTA button: "Listen Now" (baby blue, links to presigned MP3)
5. Secondary text link: "Download MP3" (plain link below button)
6. Footer: `noreply@notevra.com · notevra.com · No marketing, ever`

**From:** `Notevra <hello@notevra.com>`
**Reply-to:** none (no-reply pattern appropriate — creator expects no human response)

### GiftDeliveryEmail (Recipient)

**Subject:** `{creatorFirstName} made something just for you`
- Highest-stakes email — this is the first impression for the recipient
- Personal, intriguing, does not reveal "song" in subject (curiosity gap)
- Alternative if open rates matter more: `You have a personal song from {creatorFirstName}`

**Preheader:** `A one-of-a-kind song, made just for {recipientName}.`

**Body structure:**
1. Baby blue header band — "Notevra" wordmark in Libre Baskerville
2. Headline (Libre Baskerville): "Someone made a song just for you"
3. Warm context block: Show the message from the creator (`quizData.message`) inside a lightly bordered quote block — this is the emotional hook
4. Song details (subtle): Genre pill, relationship ("from your {relationship}")
5. Primary CTA button: "Listen to Your Song" (baby blue, full-width on mobile)
6. Privacy note (small text below button): "No account required · Private link · No marketing"
7. Footer: same as above

**Does the gift email show quiz context?** Yes — the creator's personal message (`quizData.message`) should appear as a quote. This dramatically increases emotional impact and is the key differentiator of a "personalized gift." The recipient name (`recipientName`) and relationship add context without overloading.

**From:** `Notevra <hello@notevra.com>`
**Reply-to:** none

### Link Destinations

**Creator song-ready link:** Points to a deep-link presigned R2 URL (direct MP3). Since Phase 31 will add a success/dashboard page, the creator email can link directly to the presigned audio URL for now — simple, fast. Update to dashboard URL in Phase 31.

**Recipient gift link:** Points to the presigned R2 URL directly. Recipients must NOT be required to sign up to listen — this would kill the gifting moment. The link is the gift. Phase 31 may add a standalone listen page — wire to that when available.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Nodemailer + raw SMTP | Resend SDK | 2022–2023 | DX improvement, deliverability built-in |
| Handlebars HTML templates | React Email components | 2022 | Type safety, JSX reuse, live preview |
| Supabase default SMTP (rate-limited to 4/hr) | Custom SMTP via Resend | 2023 | Production-grade volume, custom domain branding |
| Stored presigned URLs | Presign at read time | Project Phase 29 decision | Security — URLs don't persist in DB |

**Deprecated/outdated:**
- `@supabase/auth-helpers-nextjs`: Replaced by `@supabase/ssr` (already decided, Phase 28)
- Supabase's built-in SMTP: Rate-limited (4 emails/hour), shares `mail.supabase.io` domain reputation

---

## Open Questions

1. **Domain already verified or still pending?**
   - What we know: STATE.md notes "DNS propagation takes 24-48 hours — start before Phase 30 email code" as a pre-milestone blocker
   - What's unclear: Whether notevra.com has been added to Resend's domain dashboard yet
   - Recommendation: Plan 30-01 must check DNS status as first step. If not yet added, the developer adds it during Plan 30-01 and DNS propagates while Plans 30-02/30-03 are coded. No blocking dependency — route code can be written before DNS resolves.

2. **Creator email address source**
   - What we know: The songs table has `userId` (links to auth.users) but no denormalized `email` column
   - What's unclear: How send-creator-email route retrieves the creator's email
   - Recommendation: Use Supabase admin client (`createClient()` + `supabase.auth.admin.getUserById(userId)`) to look up the email from auth.users. This is the established pattern for server-side auth user lookups. Only applies when `userId` is non-null (authenticated creators). For anonymous songs, send-creator-email is not called (no email available).

3. **Resend API key scope**
   - What we know: A new env var `RESEND_API_KEY` is needed
   - What's unclear: Whether the same key should be used for both SMTP (Supabase auth emails) and SDK (transactional emails)
   - Recommendation: Use the same API key for both — this is Resend's standard guidance. Create a single "Full Access" key with send permission.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.x with jsdom |
| Config file | `vitest.config.ts` |
| Quick run command | `npm run test:unit` |
| Full suite command | `npm run test:unit` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| EMAIL-01 | Supabase SMTP config routes auth emails via Resend | manual-only (dashboard config) | n/a | n/a |
| EMAIL-02 | send-creator-email route queries song, presigns URL, calls Resend | unit | `npm run test:unit -- src/app/api/send-creator-email/route.test.ts` | ❌ Wave 0 |
| EMAIL-03 | send-recipient-email route queries song, presigns URL, calls Resend | unit | `npm run test:unit -- src/app/api/send-recipient-email/route.test.ts` | ❌ Wave 0 |
| EMAIL-04 | Templates render without throwing, include brand colors/fonts | unit (render smoke) | `npm run test:unit -- src/emails/` | ❌ Wave 0 |

Note: EMAIL-01 (Supabase SMTP) is manual-only — it requires clicking through a browser dashboard; no automated test can verify DNS resolution or SMTP credentials.

### Sampling Rate

- **Per task commit:** `npm run test:unit`
- **Per wave merge:** `npm run test:unit`
- **Phase gate:** Full unit suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `src/app/api/send-creator-email/route.test.ts` — covers EMAIL-02 (mock Resend + Drizzle + R2)
- [ ] `src/app/api/send-recipient-email/route.test.ts` — covers EMAIL-03 (mock Resend + Drizzle + R2)
- [ ] `src/emails/SongReadyEmail.test.tsx` — covers EMAIL-04 smoke render
- [ ] `src/emails/GiftDeliveryEmail.test.tsx` — covers EMAIL-04 smoke render

---

## Sources

### Primary (HIGH confidence)
- https://resend.com/docs/send-with-nextjs — Resend Next.js setup, route handler pattern, API key setup
- https://resend.com/docs/send-with-supabase-smtp — Exact SMTP credentials (host, port, username, password format)
- https://developers.cloudflare.com/r2/api/s3/presigned-urls/ — R2 presigned URL maximum: 604,800 seconds (7 days) confirmed
- Project source: `src/lib/r2.ts` — `getAudioPresignedUrl()` signature and existing defaults
- Project source: `src/db/schema.ts` — Songs table fields available for email content
- Project source: `src/app/api/quiz-generate/route.ts` — Established route handler pattern to follow
- Project source: `src/app/tokens/primitives.css` — OKLCH primitive values to convert to email-safe hex

### Secondary (MEDIUM confidence)
- https://resend.com/blog/react-email-5 — React Email v5 features, React 19 + Next.js 16 compatibility confirmed
- GitHub discussion resend/react-email#1816 — `serverExternalPackages` requirement for `react-email` + `@react-email/render` with Turbopack
- https://postmarkapp.com/guides/transactional-email-best-practices — Subject line guidelines, copy structure best practices

### Tertiary (LOW confidence)
- Approximate OKLCH → hex conversions in Color Conversion table (computed manually — validate visually)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — Resend + React Email are the de-facto standard, verified via official docs
- Architecture: HIGH — follows established project patterns (quiz-generate route shape)
- Pitfalls: HIGH — R2 7-day maximum verified via Cloudflare official docs; OKLCH email incompatibility is well-documented
- Email content recommendations: MEDIUM — based on transactional email best practices research, not A/B tested for Notevra specifically

**Research date:** 2026-03-07
**Valid until:** 2026-04-07 (Resend and React Email update frequently; re-verify `serverExternalPackages` needs if Next.js version changes)
