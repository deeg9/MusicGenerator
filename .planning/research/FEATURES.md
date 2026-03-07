# Feature Research

**Domain:** Auth, email delivery, and song dashboard for an AI-generated song gift service (Next.js App Router)
**Researched:** 2026-03-06
**Confidence:** HIGH (Supabase Auth patterns verified against official docs and Supabase UI docs. Resend SMTP integration confirmed via official Resend documentation. RLS patterns confirmed against Supabase official docs. UX patterns informed by multiple SaaS auth conversion studies and gift/delivery service analysis.)

---

## Context: What Already Exists

Notevra v3.0 ships: landing page, 6-step quiz funnel with Zod validation, quiz-to-prompt conversion, HeartBula generation on RunPod A40, Cloudflare R2 audio storage, and a success page with confetti + native audio playback + MP3 download. No auth, no email, no server-side user data. v4.1 shipped legal pages (Contact, Privacy Policy, ToS).

**This milestone (v4.2)** adds: Supabase Auth (email+password), auth upsell on success page, song-to-user association, Resend transactional emails (creator + recipient), and a user song dashboard.

**Existing flow:** Landing page → 6-step quiz → HeartBula generation (~7s) → Success page (confetti + playback + download)

**New flow additions:**
- Success page gains auth upsell ("Sign up to save your song + send it as a gift")
- Auth upsell triggers sign-up modal or redirect → email confirmation → song saved to account
- Success page also gains recipient email capture → triggers gift delivery email via Resend
- Authenticated users can access `/dashboard` to see past songs with playback + re-download

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist in any authenticated gift service. Missing these makes the product feel broken or untrustworthy.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Email + password sign up | Standard credential type; users do not want OAuth-only for a personal gift service with emotional content | LOW | `supabase.auth.signUp()` with email+password. Email confirmation required (Supabase default). Configure Resend as SMTP provider so confirmation emails arrive reliably — Supabase's built-in SMTP is rate-limited to 2/hour and unsuitable for production. |
| Email + password login | Required pair to sign up | LOW | `supabase.auth.signInWithPassword()`. Standard login page at `/auth/login`. |
| Email confirmation flow | Supabase requires it by default; confirms email ownership before granting account access. Skipping increases abuse surface and invalidates email delivery for later features. | LOW | Route handler at `/auth/confirm` exchanges token from email link for a session cookie. Must configure Supabase email template to point to this callback. |
| Password reset / forgot password | Users forget passwords; no recovery = lost account + lost songs | LOW | Three-step flow: (1) `/auth/forgot-password` collects email, calls `supabase.auth.resetPasswordForEmail()`. (2) Supabase sends reset email (via Resend SMTP). (3) `/auth/update-password` page verifies token via `/auth/confirm` callback, then shows new password form. PKCE flow required — token must be verified in the same browser session. |
| Session persistence via cookies | Next.js App Router requires cookies for server-side session access. localStorage-only sessions break SSR. | LOW | `@supabase/ssr` package handles this. Middleware proxy required to refresh tokens and write cookies between Server Component renders. Use `supabase.auth.getUser()` (not `getSession()`) in server code — `getUser()` validates against Supabase auth server on every call; `getSession()` trusts the cookie blindly and is a security risk. |
| Auth callback route handler | Email link clicks (confirmation, password reset) return a token that must be exchanged server-side | LOW | `app/auth/confirm/route.ts` (GET handler). Calls `supabase.auth.verifyOtp({ token_hash, type })`, redirects to appropriate page on success or `/auth/error` on failure. Required for both signup confirmation and password reset. |
| Auth error page | Email links that fail (expired token, wrong device for PKCE) need a graceful landing | LOW | `/auth/error` — simple page with "Link expired or invalid" message and CTA to retry action. |
| Protected dashboard route | `/dashboard` must redirect unauthenticated users to login | LOW | Next.js middleware checks session cookie. Redirect to `/auth/login?redirect=/dashboard` so user lands on dashboard after login. |
| Song-to-user association | Generated songs must be linked to the authenticated user who created them | MEDIUM | Supabase `songs` table with `user_id UUID REFERENCES auth.users(id)`. RLS policy: `auth.uid() = user_id` for SELECT, INSERT, UPDATE. Songs are written at the moment of successful HeartBula generation — either anonymously (no user_id) or with user_id if the user is signed in. Songs generated before sign-up can be claimed via a session token match (see differentiators). |
| Song dashboard — list past songs | Users with accounts expect to see their song history | MEDIUM | `/dashboard` page (Server Component) fetches songs for `auth.uid()` from Supabase. Renders song cards: recipient name, relationship, date created, playback status. |
| Song playback in dashboard | Users want to re-listen without re-downloading | MEDIUM | Reuse native `<audio>` element from success page. Audio served from Cloudflare R2 presigned GET URLs (HEAD returns 403 — known R2 quirk; use GET presigned). Generate presigned URL server-side at dashboard render time. |
| Re-download from dashboard | Users want access to their song file again | LOW | "Download" button generates a presigned GET URL and triggers browser download. Same R2 presign logic as success page. |
| Sign out | Standard auth expectation | LOW | Server Action calls `supabase.auth.signOut()`, clears cookies, redirects to home. |
| Auth state in header nav | Header must reflect signed-in state (show "My Songs" link, hide "Sign Up") | LOW | Header already exists (v3.0). Extend to check auth state server-side. Show "My Songs" → `/dashboard` when authenticated. Show "Sign up / Log in" when anonymous. |
| Creator song-ready email | After generation completes, creator should receive a confirmation email with a link to their song | LOW | Resend API call in `/api/quiz-generate` route (or a dedicated route handler) after HeartBula job completes. Only sends if user provides email (either signed-in or entered on success page). Template: song title, "Your song is ready — listen and download", link to success page or dashboard. |
| Recipient gift delivery email | The gift giver wants to send the song to the person it was made for | MEDIUM | Recipient email capture field on success page. On submit, server action calls Resend with a gift email template: "Someone made you a song — listen here", embedded audio player link, download CTA. Requires R2 presigned URL in the email (shareable link) or a redirect through Notevra's domain. |

### Differentiators (Competitive Advantage)

Features that exceed the baseline and reinforce Notevra's gift service positioning.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Auth upsell on success page (not a gate) | Quiz stays public — no auth wall before generation. Upsell appears *after* the song is created, when the user's emotional investment is highest ("post-purchase euphoria" window). Asking for auth before generation adds friction and kills conversion. | LOW | Render a soft CTA below the audio player: "Love your song? Sign up to save it, access it anytime, and send it as a gift." No blocking modal — an inline section with sign-up form or "I'll skip for now" option. This pattern is established in e-commerce (guest checkout → account upsell post-conversion). |
| Song claim on sign-up | If a user generates a song anonymously, then signs up immediately after, the song should be linked to their new account | MEDIUM | Store a session token in localStorage at generation time (`notevra_session_token`). On sign-up, pass this token to a server action that claims all songs with matching session token, setting `user_id = auth.uid()`. Requires `session_token` column on `songs` table. Adds ~1 plan of work but dramatically improves onboarding quality — user doesn't lose the song they just made. |
| Warm, brand-consistent email templates | Transactional emails from most AI services are cold and generic. A warm Notevra email — baby blue header, Libre Baskerville headline, clear gift framing — reinforces the brand at the moment of maximum emotional impact. | LOW-MEDIUM | React Email components reusing Notevra brand tokens (OKLCH color values, font stack). Two templates: (1) Creator song-ready, (2) Recipient gift delivery. Both render in plain HTML with inline CSS (React Email handles this for email client compatibility). |
| Gift email with embedded song preview | Instead of just a link, the gift email includes the song title, what the creator wrote (the Step 5 message), and a prominent "Listen to your song" CTA. The recipient knows who sent it and why before they click. | LOW | Include `quiz_data.message` (Step 5) in the email body. Requires storing relevant quiz fields on the `songs` table (recipient name, relationship, message, genre). Do not embed the audio file itself — attach a presigned URL or Notevra redirect URL. Audio embedding in email has near-zero client support. |
| Dashboard with song context (not just audio files) | Rather than showing a bare list of audio files, show who each song was made for: "Birthday song for Mom — Created March 5, 2026". This turns the dashboard into a meaningful archive of gifts. | LOW | Store `recipient_name`, `relationship`, `genre`, `created_at` on `songs` table. Dashboard renders these as context below each audio player. |
| Recipient email field with privacy framing | The recipient email capture is a sensitive moment — users are sharing someone else's contact info. Framing this clearly ("We'll send them a private link — no marketing, ever.") builds trust. | LOW | One sentence of microcopy below the recipient email input. No technical work — copy only. But critical for conversion. |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Social login (Google/GitHub OAuth) | "Users prefer one-click sign-in" | Adds OAuth provider configuration, callback URL management, and account-linking complexity when a user who signed up with email later tries Google. For a personal gift service with sensitive content (memories, loved ones), social login also reduces user trust that their data stays private. No competitor in the gift space requires or benefits from OAuth at this stage. | Email+password only for v4.2. Add OAuth after email flow is validated and user demand exists. |
| Mandatory auth before generation | "We need an account to save songs" | Forces auth wall before the user has experienced value — kills the quiz funnel's conversion rate. The gift service emotional hook is "generate first, feel the magic, then commit." Auth before generation is the most common mistake in quiz funnel apps. | Auth prompt *after* successful generation, on the success page. Quiz stays public. |
| Email verification as a hard gate | "Users should verify before doing anything" | Even with an unconfirmed email, a user should be able to see their generated song and dashboard in a limited state. Hard-gating on email verification before showing the dashboard adds friction at the worst moment (right after sign-up excitement). | Allow signed-in but unconfirmed users to see a banner: "Check your email to confirm your account." Dashboard accessible but song claiming finalizes on confirmation. |
| Passwordless / magic link only | "Passwordless is more modern UX" | Magic link auth requires email to arrive before the user can log in — introduces a wait and inbox-checking step that breaks the immediate "I just made a song, let me save it" momentum. Also, Supabase's built-in magic link rate limits apply. | Email+password as primary. Magic link can be added later as an additional option. |
| Song sharing feature (public URLs) | "Let me share my song publicly" | Public audio URLs require permanent R2 storage or a CDN layer, URL management, social preview metadata, and expiration logic. Songs are currently deleted from R2 after 30 days. Scope exceeds v4.2. | Gift delivery email IS the sharing mechanism. Recipient gets a private link. Public sharing deferred to v5+. |
| In-dashboard song regeneration | "I want to try again with the same quiz" | Regeneration re-runs HeartBula on RunPod, adds API costs, and requires re-testing the full generation pipeline from a new entry point. Scope creep for v4.2. | Quiz funnel is public — user can simply start a new quiz. Link to quiz from dashboard ("Make another song?"). |
| Batch email sending to multiple recipients | "I want to send to several people" | Multiple recipients = multiple song variants (each gift is personal), or a bulk-send UX that doesn't match the "one emotional gift" positioning. Delivery quality degrades with bulk. | Single recipient per generation — one song, one gift, one email. The emotional positioning of Notevra depends on singularity. |

---

## Feature Dependencies

```
Supabase Auth (email + password)
    └──requires──> @supabase/ssr package installed
    └──requires──> Middleware proxy for cookie-based session refresh
    └──requires──> /auth/confirm route handler (email link exchange)
    └──requires──> Resend SMTP configured as Supabase email provider
                       └──requires──> Notevra domain verified in Resend
                       └──requires──> SMTP credentials set in Supabase Auth settings

Song-to-User Association
    └──requires──> Supabase Auth (auth.uid() exists)
    └──requires──> songs table with user_id + session_token columns
    └──requires──> RLS policies (user can read/write own songs)
    └──enhances──> Song Claim on Sign-up (session_token column)

Song Dashboard
    └──requires──> Supabase Auth (protected route)
    └──requires──> Song-to-User Association (songs must have user_id)
    └──requires──> R2 presigned URL generation (audio playback + download)
    └──depends-on──> Existing HeartBula/R2 integration (audio already in R2)

Creator Song-Ready Email
    └──requires──> Resend API key configured
    └──requires──> Notevra domain verified in Resend
    └──requires──> Generation pipeline completes successfully
    └──optional-dependency──> Supabase Auth (email known if signed in; fallback to input on success page)

Recipient Gift Delivery Email
    └──requires──> Resend API key configured
    └──requires──> Recipient email capture on success page (new field)
    └──requires──> R2 presigned URL (shareable song link in email)
    └──enhances──> Creator Song-Ready Email (both use same Resend setup)

Auth Upsell on Success Page
    └──requires──> Supabase Auth (sign-up form must exist)
    └──enhances──> Song Claim on Sign-up (song is claimable if session_token stored)
    └──depends-on──> Existing success page (add new section below audio player)

Protected Dashboard Route
    └──requires──> Middleware (session check + redirect)
    └──requires──> Song Dashboard feature
    └──depends-on──> Existing Header component (add "My Songs" nav link)

Password Reset Flow
    └──requires──> Supabase Auth (core auth active)
    └──requires──> /auth/confirm route handler (token exchange)
    └──requires──> /auth/update-password page
    └──requires──> Resend SMTP (reset email must be deliverable)
```

### Dependency Notes

- **Resend SMTP must be configured before any auth email works.** Supabase's built-in email provider is rate-limited to 2 emails per hour and unsuitable for production. Set up Resend SMTP integration first (before any auth-dependent testing). Steps: verify domain in Resend → copy SMTP credentials → paste into Supabase Auth → Authentication → SMTP Settings. Host: `smtp.resend.com`, Port: `465`, User: `resend`, Password: API key.

- **Middleware is non-optional for App Router.** Next.js Server Components cannot write cookies. Without the `@supabase/ssr` middleware proxy, auth tokens go stale during navigation and users get logged out unexpectedly. The middleware must run on every request that accesses protected state.

- **`getUser()` not `getSession()` in server code.** `getSession()` reads the cookie blindly without revalidating the JWT. `getUser()` hits the Supabase auth server to verify the token. Use `getUser()` for any server-side auth check that gates access to user data.

- **Song claim requires session_token column.** The claim mechanism (anonymous generation → sign-up → song linked to account) needs a `session_token` stored on the songs row at generation time. This must be planned in the database schema alongside `user_id`.

- **R2 presigned URLs in emails require careful expiration.** Gift emails are forwarded, opened days later, etc. Set presigned URL expiration long enough to be useful (7-30 days). But R2 objects themselves expire after 30 days (current Notevra policy) — URL expiration must not exceed object lifetime.

- **PKCE password reset must happen in the same browser.** The PKCE flow for password reset links the token to the browser session. If the user clicks the reset link in a different browser (e.g., desktop vs mobile), `verifyOtp()` will fail. This is a known Supabase PKCE limitation — document it in the UI ("Click this link on the same device where you requested the reset") and add a graceful `/auth/error` fallback.

---

## MVP Definition

### Launch With (v4.2)

Minimum to validate authenticated gift delivery with song persistence.

- [ ] Supabase SMTP via Resend configured — all auth emails delivered reliably
- [ ] Sign up page (`/auth/sign-up`) — email + password
- [ ] Login page (`/auth/login`) — email + password
- [ ] Auth callback route handler (`/auth/confirm`) — token exchange for signup confirmation and password reset
- [ ] Forgot password page (`/auth/forgot-password`) — email input, triggers Supabase reset email
- [ ] Update password page (`/auth/update-password`) — post-reset new password form
- [ ] Auth error page (`/auth/error`) — graceful fallback for expired/invalid links
- [ ] Middleware — session cookie refresh on every request, redirect unauthenticated users from `/dashboard` to `/auth/login`
- [ ] `songs` table in Supabase — with `user_id`, `session_token`, `recipient_name`, `relationship`, `genre`, `message_preview`, `audio_r2_key`, `created_at`
- [ ] RLS policies — users can SELECT/INSERT/UPDATE their own songs (auth.uid() = user_id)
- [ ] Song-to-user association — write user_id to songs row at generation if signed in
- [ ] Auth upsell section on success page — inline CTA below audio player ("Save your song + send as gift")
- [ ] Song claim on sign-up — session_token in localStorage claimed on account creation
- [ ] Creator song-ready email via Resend — fires after generation completes, if email known
- [ ] Recipient email capture on success page — new input field with privacy microcopy
- [ ] Recipient gift delivery email via Resend — branded React Email template with song link
- [ ] Song dashboard (`/dashboard`) — list past songs with context (recipient, relationship, date)
- [ ] Song playback in dashboard — native `<audio>` with R2 presigned GET URL
- [ ] Re-download from dashboard — presigned GET URL for browser download
- [ ] Header updated — "My Songs" link when authenticated, "Sign up / Log in" when anonymous
- [ ] Sign out — server action, cookie clear, redirect to home

### Add After Validation (v4.x)

- [ ] Email confirmation as soft gate — "Confirm your email to finalize saving" banner, not a hard block on dashboard access
- [ ] Resend SMTP → Supabase Auth hook for fully custom auth email templates — when brand consistency of auth emails becomes a priority
- [ ] Song title / name field — let users name their song at generation or from dashboard
- [ ] Dashboard "Make another song" CTA — link back to quiz with context ("You've made 3 songs — make another one")
- [ ] Song deletion from dashboard — users can delete songs they no longer want stored

### Future Consideration (v5+)

- [ ] Google/GitHub OAuth — after email+password flow is validated and users request social login
- [ ] Public song sharing — permanent public URL, social preview (og:image, og:audio), requires CDN and storage policy changes
- [ ] In-email audio player — HTML5 audio in email (very low email client support today; revisit when standards improve)
- [ ] Dashboard analytics view — generation count, most-used genres, gift recipient history
- [ ] Gift scheduling — "Send this song on March 15 (her birthday)" — requires queued email job infrastructure

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Resend SMTP → Supabase SMTP config | HIGH — all auth emails depend on it | LOW (config only) | P1 — must be first |
| Sign up + login + session | HIGH — foundation for all auth features | LOW | P1 |
| Auth callback + error route | HIGH — without this, email confirmation breaks silently | LOW | P1 |
| Password reset flow | HIGH — no recovery = lost songs | LOW | P1 |
| Middleware (session + redirect) | HIGH — without this, SSR session handling is broken | LOW | P1 |
| songs table + RLS policies | HIGH — song persistence requires this | LOW (schema work) | P1 |
| Song-to-user association at generation | HIGH — this is the core "save my song" feature | LOW | P1 |
| Auth upsell on success page | HIGH — primary conversion point for sign-ups | LOW | P1 |
| Session token claim on sign-up | HIGH — prevents "I just made a song and now I lost it" | MEDIUM | P1 |
| Creator song-ready email | HIGH — confirms generation, gives creator a persistent link | LOW | P1 |
| Recipient email capture + gift email | HIGH — gift delivery is the core emotional feature | MEDIUM | P1 |
| Song dashboard (list + playback + download) | HIGH — payoff for creating an account | MEDIUM | P1 |
| Header auth state | MEDIUM — UX polish, navigation clarity | LOW | P1 (trivial) |
| Sign out | MEDIUM — expected, but low-stakes | LOW | P1 (trivial) |
| Warm React Email templates | MEDIUM — brand differentiation in email | LOW-MEDIUM | P2 |
| Gift email with quiz message included | MEDIUM — emotional resonance in delivery | LOW | P2 |
| Dashboard song context (recipient/relationship) | MEDIUM — makes dashboard meaningful, not just a file list | LOW | P2 (schema planning only) |
| Email confirmation soft gate (banner) | LOW (v4.2) — full email confirmation UX polish | LOW | P3 |
| Song deletion | LOW | LOW | P3 |
| Social login (OAuth) | LOW now | MEDIUM | Defer |
| Public sharing URLs | LOW now | HIGH | Defer |

**Priority key:**
- P1: Must have for v4.2 launch
- P2: Include if time allows; adds meaningful value at low cost
- P3: Defer to v4.x post-validation

---

## Competitor Feature Analysis

| Feature | Suno | Soundful | Boomy | Notevra Approach |
|---------|------|----------|-------|-----------------|
| Auth gate on creation | No — listen/share free, sign up to publish | Yes — sign up before generating | No — generate first, save with account | No gate — generate first, upsell auth after success page. Emotional investment highest after generation. |
| Email + password auth | Yes | Yes | Yes | Yes — primary and only auth method for v4.2 |
| Social auth | Google, Apple | Google | Google, Facebook | Defer to v4.x — email only first |
| Email confirmation required | Yes (Supabase default behavior) | Yes | Yes | Yes — configure Resend SMTP so confirmation emails are reliable |
| Song history/library | Yes — "Your Library" | Yes | Yes | Yes — `/dashboard` with gift context (not just files) |
| Transactional email on generation | Notification email for longer jobs | None (instant) | None | Creator song-ready email via Resend (even for ~7s jobs — confirms delivery, provides persistent link) |
| Gift/recipient delivery | No | No | No | Yes — differentiated feature. Recipient email field on success page + branded gift email. No competitor does this in the AI music space. |
| Dashboard song context | Title, genre, duration | Title, style | Title | Recipient name + relationship + date — turns archive into meaningful gift history |

---

## Routes Required for v4.2

| Route | Type | Auth State | Purpose |
|-------|------|------------|---------|
| `/auth/sign-up` | Page | Anonymous | Sign up form (email + password) |
| `/auth/login` | Page | Anonymous | Login form |
| `/auth/forgot-password` | Page | Anonymous | Request password reset email |
| `/auth/update-password` | Page | Signed in (via reset token) | New password form after reset |
| `/auth/confirm` | Route Handler (GET) | Any | Token exchange for confirmation + password reset |
| `/auth/error` | Page | Any | Graceful fallback for invalid/expired auth links |
| `/dashboard` | Page | Protected | Song history with playback + download |
| `/api/send-gift-email` | Route Handler (POST) | Any | Trigger recipient gift delivery email via Resend |

---

## Database Schema for songs Table

```sql
CREATE TABLE songs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_token TEXT,                        -- links anonymous sessions to songs
  recipient_name TEXT NOT NULL,              -- from quiz Step 1
  relationship  TEXT NOT NULL,              -- "mom", "partner", etc.
  genre         TEXT NOT NULL,              -- from quiz Step 2
  message_preview TEXT,                     -- first 100 chars of Step 5 message
  audio_r2_key  TEXT NOT NULL,              -- R2 object key (not full URL — presign at read time)
  job_id        TEXT,                       -- HeartBula task_id for debugging
  created_at    TIMESTAMPTZ DEFAULT now(),
  expires_at    TIMESTAMPTZ DEFAULT now() + INTERVAL '30 days'  -- matches R2 retention
);

-- Enable Row Level Security
ALTER TABLE songs ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read their own songs
CREATE POLICY "Users can view own songs" ON songs
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- Authenticated users can insert songs (user_id must match their uid)
CREATE POLICY "Users can insert own songs" ON songs
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- Anonymous insert allowed (for session_token claim flow)
CREATE POLICY "Anonymous can insert songs" ON songs
  FOR INSERT TO anon
  WITH CHECK (user_id IS NULL);
```

---

## Sources

- [Supabase Auth — Server-Side Next.js](https://supabase.com/docs/guides/auth/server-side/nextjs) — HIGH confidence. Official. Middleware proxy pattern, `getUser()` vs `getSession()` security note, cookie architecture.
- [Supabase Auth — Password-Based Auth UI Docs](https://supabase.com/ui/docs/nextjs/password-based-auth) — HIGH confidence. Official. Complete route list: sign-up, login, forgot-password, update-password, confirm handler, error page.
- [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security) — HIGH confidence. Official. `auth.uid()` policy patterns.
- [Resend — Send emails with Supabase SMTP](https://resend.com/docs/send-with-supabase-smtp) — HIGH confidence. Official. SMTP host `smtp.resend.com`, port 465, user `resend`, password = API key.
- [Resend — Supabase partner integration](https://supabase.com/partners/integrations/resend) — HIGH confidence. Official.
- [Custom Auth Emails with React Email and Resend — Supabase Docs](https://supabase.com/docs/guides/functions/examples/auth-send-email-hook-react-email-resend) — HIGH confidence. Official.
- [Supabase Auth SMTP changes — Discussion #29370](https://github.com/orgs/supabase/discussions/29370) — HIGH confidence. Confirms production SMTP requirement.
- [PKCE password reset issue — Discussion #28655](https://github.com/orgs/supabase/discussions/28655) — MEDIUM confidence. Known same-browser PKCE limitation confirmed by community + Supabase team response.
- [Auth signup UX — Authgear 2025 guide](https://www.authgear.com/post/login-signup-ux-guide) — MEDIUM confidence. Email confirmation conversion tradeoff analysis.
- [Post-purchase upsell conversion — Passionates 2026](https://passionates.com/one-click-post-purchase-upsell-landing-page/) — MEDIUM confidence. Post-conversion timing research ("post-purchase euphoria" window).
- [React Email + Resend integration](https://react.email/docs/integrations/resend) — HIGH confidence. Official React Email docs.
- [How to Send Emails in Next.js — Sequenzy 2026](https://www.sequenzy.com/blog/send-emails-nextjs) — MEDIUM confidence. Current-year patterns for server-side Resend in App Router.

---

*Feature research for: Notevra v4.2 — Supabase Auth, Resend email delivery, song dashboard*
*Researched: 2026-03-06*
