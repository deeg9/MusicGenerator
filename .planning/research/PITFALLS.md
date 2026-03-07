# Pitfalls Research

**Domain:** Adding Supabase Auth + Resend email + song persistence to an existing anonymous Next.js App Router app (Notevra v4.2)
**Researched:** 2026-03-06
**Confidence:** HIGH — pitfalls verified against Supabase official docs, GitHub issue tracker, and multiple community sources; package deprecation confirmed against npm and official migration guides

---

## Critical Pitfalls

### Pitfall 1: Using `@supabase/auth-helpers-nextjs` Instead of `@supabase/ssr`

**What goes wrong:**
Tutorials, blog posts, and AI coding assistants frequently suggest installing `@supabase/auth-helpers-nextjs`. That package is officially deprecated and in maintenance-only mode. Installing it starts the project on a dead-end package that will not receive bug fixes or new features. Mixing both packages in the same codebase (e.g., using auth-helpers for components and @supabase/ssr for middleware) causes authentication session failures that are extremely difficult to debug.

**Why it happens:**
Search results for "Supabase Next.js auth" surface old tutorials first. The package name `auth-helpers-nextjs` sounds like the correct choice. AI assistants trained on pre-2024 data frequently suggest the deprecated package.

**How to avoid:**
Install only `@supabase/ssr` and `@supabase/supabase-js`. Never install `@supabase/auth-helpers-nextjs`. Use these client factories exclusively:
- `createBrowserClient` — client components
- `createServerClient` — server components, route handlers, middleware

Never mix the two packages in a single project.

**Warning signs:**
- `package.json` contains `@supabase/auth-helpers-nextjs`
- Middleware uses `createMiddlewareClient` (auth-helpers API)
- Session appears in browser but server components read it as null

**Phase to address:**
Auth setup phase (Phase 1 of v4.2). Establish the correct package from the very first commit. Do not introduce this package at any point.

---

### Pitfall 2: Using `getSession()` Instead of `getUser()` in Server Code

**What goes wrong:**
`supabase.auth.getSession()` in server components or middleware reads the session from cookies without revalidating against the Supabase Auth server. A malicious user can forge a cookie with a valid-format JWT that passes format checks but is not a real session. Any page protected with `getSession()` can be bypassed. The songs dashboard would be accessible to unauthenticated users who craft a fake session cookie.

**Why it happens:**
`getSession()` is faster (no network round-trip) and is the first method most developers reach for. Old tutorials and AI assistants suggest it. The official Supabase docs are explicit about this distinction but it is easy to overlook.

**How to avoid:**
Use `supabase.auth.getUser()` everywhere in server-side code: middleware, Server Components, and Route Handlers. This method makes a request to the Supabase Auth server on every call to revalidate the token — it is the only method that can be trusted server-side. Accept the small latency cost. `getSession()` is only safe in client-side browser code where the JWT is already trusted because it came from the browser's own storage.

**Warning signs:**
- Middleware or server component uses `supabase.auth.getSession()`
- Dashboard route checks `session?.user` instead of `user` from `getUser()`
- Auth check passes even after manually expiring or revoking the session in Supabase dashboard

**Phase to address:**
Auth setup phase. Write a single shared Supabase server client utility that only exposes `getUser()` — never export a `getSession()` wrapper.

---

### Pitfall 3: Middleware Runs on Static Assets — Causes 400 Errors and Excess Network Calls

**What goes wrong:**
Without a `matcher` configuration in `middleware.ts`, Next.js runs the middleware on every request — including `_next/static`, `_next/image`, favicon, and all image assets. Each of these calls `supabase.auth.getUser()`, triggering network requests to Supabase Auth on every image load. This produces 400 errors in the console, inflates Supabase Auth request quotas, and slows page loads measurably (each static asset request now incurs a Supabase network round-trip).

**Why it happens:**
The default `middleware.ts` file has no matcher. The Supabase Next.js quickstart guide includes the matcher in its example, but developers frequently copy just the middleware logic without the configuration.

**How to avoid:**
Always include a matcher that excludes static assets:

```typescript
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

This runs middleware on all dynamic routes while skipping static file serving entirely.

**Warning signs:**
- Browser network tab shows auth-related requests on every image load
- Console shows 400 errors on `_next/static` asset requests
- Supabase Auth dashboard shows unexpectedly high request volume

**Phase to address:**
Auth setup phase. Add the matcher to `middleware.ts` before any other middleware logic is written.

---

### Pitfall 4: Quiz Funnel Breaks Because Middleware Redirects Anonymous Users

**What goes wrong:**
Adding middleware that redirects unauthenticated users to `/login` will break Notevra's core anonymous quiz funnel. The quiz (`/quiz`), the generation API (`/api/generate`), and the success page (`/success`) must remain accessible without authentication. A blanket redirect-if-unauthenticated middleware destroys the primary user journey.

**Why it happens:**
Boilerplate middleware examples protect everything by default. Developers add auth middleware and assume they will carve out exceptions later — then forget, or misconfigure the exception pattern.

**How to avoid:**
The middleware must only protect the dashboard route (`/dashboard`). All other routes must remain publicly accessible. Write the protected routes list explicitly:

```typescript
const PROTECTED_ROUTES = ['/dashboard']

if (PROTECTED_ROUTES.some(r => request.nextUrl.pathname.startsWith(r))) {
  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
}
```

Do NOT use an "allow-list" pattern (only allow if authenticated) — use a "protect-list" pattern (protect specific named routes, allow everything else). Verify by running the full quiz flow without any session active after middleware is deployed.

**Warning signs:**
- Completing the quiz redirects to `/login` instead of showing the success page
- `/api/generate` returns 401 during anonymous generation
- The landing page renders but clicking "Create a Song" redirects to login

**Phase to address:**
Auth setup phase. The middleware's route protection logic is the highest-risk change to existing functionality.

---

### Pitfall 5: Songs Generated Before Sign-Up Cannot Be Claimed by the New Account

**What goes wrong:**
Notevra's current flow generates songs anonymously. When the auth prompt appears on the success page after generation, users who sign up have no way to claim the song they just created. The song exists in R2 with a `job_id`-based key, but no `user_id` is associated with it in the database. After sign-up, the new user's dashboard is empty even though they just created a song.

**Why it happens:**
The generation flow predates auth. There is no concept of a `user_id` in the generation pipeline yet. Developers add auth without thinking through the "retrospective claim" user journey, which is the primary acquisition path — a user creates a song, loves it, then signs up.

**How to avoid:**
Store the `job_id` in the browser (e.g., `localStorage` key `notevra_last_job_id`) immediately after generation completes. After sign-up, send this `job_id` to a claim API route (`/api/songs/claim`) that associates the song with the new `user_id` in the database. The claim route must verify the job's R2 key exists before linking it. Set a claim window (e.g., 24 hours after generation) to prevent abuse. Design the database songs table to allow `user_id` to be `NULL` for unclaimed songs, then update it to the user's ID upon claim.

**Warning signs:**
- New user signs up from the success page and dashboard shows zero songs
- No claim mechanism exists in the generation or auth flow
- Songs table requires `user_id NOT NULL` — prevents creating the row before the user exists

**Phase to address:**
Song persistence phase. This is the most complex feature integration in v4.2 and must be designed before any database schema is finalized.

---

### Pitfall 6: RLS Disabled by Default — Songs Table Is Wide Open

**What goes wrong:**
Supabase creates new tables with Row Level Security disabled. If the songs table is created and a Supabase client (even the anon client) can reach the database, any user can read, insert, or delete any other user's song records. In January 2025, 170+ apps built on Supabase were found to have exposed databases due to exactly this oversight.

**Why it happens:**
`CREATE TABLE` in Supabase does not enable RLS. Developers test with the service role key (bypasses RLS entirely) and everything appears to work correctly — they never realize RLS is off until it is reported as a security hole.

**How to avoid:**
Immediately after creating any table, run:
```sql
ALTER TABLE songs ENABLE ROW LEVEL SECURITY;
```
Then write explicit policies for each operation. For the songs table:
- SELECT: `auth.uid() = user_id` — users can only read their own songs
- INSERT: policy WITH CHECK that `auth.uid() = user_id` — prevents users from inserting rows with someone else's `user_id`
- UPDATE: not needed for songs (songs are immutable after generation)
- DELETE: `auth.uid() = user_id`

Never test RLS behavior using the Supabase SQL editor — it runs as the `postgres` superuser which bypasses all policies. Test using the anon key in a browser client.

**Warning signs:**
- Songs table exists in Supabase but no RLS policies appear in the dashboard
- Testing via SQL editor shows correct data but client shows wrong data (or vice versa)
- Any user can retrieve any song by guessing or enumerating `job_id`

**Phase to address:**
Song persistence phase. Enable RLS and write policies in the same migration that creates the songs table — never as a separate step.

---

### Pitfall 7: Supabase Email Confirmation Breaks the Auth UX Flow

**What goes wrong:**
By default, Supabase requires new users to verify their email before they can log in. On the Notevra success page, a user has just experienced the emotional high of hearing their personalized song — this is the ideal moment to sign up. Email confirmation interrupts that flow: the user must leave the browser, open their email client, click a confirmation link, return to Notevra, and only then can they log in. In tests, email confirmation at the point of signup reduces conversion by 40-60%.

Additionally, email confirmation links that use the Supabase default template redirect to a URL fragment (`#access_token=...`) which cannot be read server-side, breaking the App Router auth flow unless the email template is customized for PKCE.

**Why it happens:**
Email confirmation is on by default in Supabase because it is secure. Developers do not realize they can disable it for the initial MVP, or they fail to customize the email template for the PKCE flow required by SSR.

**How to avoid:**
For Notevra v4.2, disable email confirmation in Supabase Auth settings (Authentication → Providers → Email → "Confirm email" toggle off). The user signs up and is immediately authenticated — friction eliminated. When email confirmation is later re-enabled (e.g., when payments are added), customize the email template to use:
```
{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email
```
...and implement a `/auth/confirm` route handler that exchanges the token for a session. This avoids the fragment-based redirect problem.

Also: disable "Email Tracking" in any external email provider — link prefetching (Microsoft Defender, some corporate mail scanners) consumes confirmation links instantly, producing "Token expired" errors for users.

**Warning signs:**
- After signup on success page, user is shown "Check your email" and left on an empty page
- Clicking email confirmation link produces "Token has expired or is invalid" for corporate email users
- Supabase Auth dashboard shows users with `email_confirmed: false` who successfully signed up

**Phase to address:**
Auth setup phase. Disable email confirmation before any user-facing auth flow is built. Document the re-enable procedure for the payments milestone.

---

### Pitfall 8: PKCE Code Verifier Cookie Lost After Signout — Second Login Fails

**What goes wrong:**
There is a known bug in the Supabase SSR + Next.js combination: after a user calls `supabase.auth.signOut()`, the PKCE code verifier cookie is not consistently re-set on the next sign-in attempt. The result is that signing in works the first time after server start, but fails with "both auth code and code verifier should be non-empty" on subsequent login attempts after logout. This silently breaks the auth flow in testing.

**Why it happens:**
The `setItemAsync` function in the Supabase SSR package does not always re-set the verifier cookie after `signOut()` clears it. It is a package-level bug with documented workarounds.

**How to avoid:**
After `signOut()`, clear all Supabase-related cookies explicitly and redirect to a clean page before allowing re-login:

```typescript
await supabase.auth.signOut()
// Force a full page reload to reset cookie state
router.push('/login')
router.refresh()
```

Test the full sign-in → sign-out → sign-in cycle explicitly during auth implementation. Do not consider auth "done" after a single successful login.

**Warning signs:**
- First login works; second login after logout fails with a verifier error
- Console shows "code verifier is missing" on login attempts after logout
- Only reproducible after calling `signOut()` — fresh browser sessions work fine

**Phase to address:**
Auth setup phase. Add a test case: login → logout → login → verify session exists.

---

### Pitfall 9: Resend Requires Custom Domain — Cannot Send from `@notevra.com` on Day One

**What goes wrong:**
Sending a Resend email from `noreply@notevra.com` requires adding DNS records (SPF and DKIM) to the `notevra.com` domain and waiting for DNS propagation (up to 48 hours) and Resend verification. If email is planned for a specific release date, the DNS setup must begin 2-3 days before. Developers who realize this at implementation time are blocked.

Additionally, Resend's free plan limits sending to one custom domain per team. Before domain verification, you can only send from `onresend.com` addresses — which fail spam filters and look unprofessional for gift delivery emails to recipients.

**Why it happens:**
Resend's developer experience is so smooth that DNS setup feels like a footnote. The "just works" developer impression from the dashboard does not make the DNS propagation wait obvious.

**How to avoid:**
Add domain verification to Resend as the very first step of the email phase — before writing any email templates or API routes. Required DNS records:
- SPF TXT record: `v=spf1 include:amazonses.com ~all`
- DKIM CNAME record: provided by Resend dashboard
- DMARC TXT record (optional but improves deliverability)

For Notevra, domain is managed through Cloudflare DNS — propagation is fast (typically <5 minutes), but Resend's verification check polls on its own schedule. Allow 24 hours buffer.

**Warning signs:**
- Resend dashboard shows domain status as "Pending" during implementation
- Test emails land in spam because they come from `onresend.com`
- DNS records were added but Resend verification button shows "Failed"

**Phase to address:**
Email infrastructure phase. Start domain verification before any other email work begins.

---

### Pitfall 10: Resend Does Not Throw on Rate Limit — Silent Email Drops

**What goes wrong:**
Resend enforces a hard limit of 2 requests per second across all endpoints and 100 emails/day on the free plan. When the rate limit is hit, Resend returns an error object — it does NOT throw an exception. Code that sends emails without checking the error response will silently drop emails with no feedback to the user or developer. The song-ready notification email and the recipient gift delivery email could both fail without any indication.

**Why it happens:**
Most HTTP clients throw on non-2xx responses. Resend's SDK returns `{ data, error }` and requires explicit error checking. Developers familiar with throw-based error handling skip the check.

**How to avoid:**
Always destructure and check the error:

```typescript
const { data, error } = await resend.emails.send({ ... })
if (error) {
  console.error('Resend send failed:', error)
  // Return failure response or retry
}
```

Also: never send both the creator notification email and the recipient gift email in the same request handler without checking the rate limit between calls. Add a small delay between multiple sends in the same request, or queue them via Supabase Edge Functions.

**Warning signs:**
- Email send code uses `await resend.emails.send(...)` without destructuring `{ data, error }`
- No error logging for email send failures
- Users report "never got the email" but server logs show no errors

**Phase to address:**
Email integration phase. Every call to `resend.emails.send()` must have explicit error handling — enforce this in code review.

---

### Pitfall 11: Songs Table `user_id` Foreign Key References Wrong Schema

**What goes wrong:**
The Supabase `auth.users` table lives in the `auth` schema, not the `public` schema. A common mistake is writing the foreign key as:
```sql
REFERENCES users(id)  -- wrong: references public.users, which doesn't exist
```
...instead of:
```sql
REFERENCES auth.users(id) ON DELETE CASCADE
```
This causes migrations to fail silently or creates a table with no referential integrity, allowing songs with non-existent `user_id` values.

A secondary mistake: not including `ON DELETE CASCADE`. Without it, deleting a user from Supabase Auth leaves orphaned song records in the database permanently. These orphaned records will accumulate and can be accessed by other users if RLS is misconfigured.

**Why it happens:**
Developers assume all tables are in `public`. The `auth` schema is hidden in the Supabase UI's table editor, making it easy to miss. Foreign key UI tools often default to `public` schema.

**How to avoid:**
Write the songs table migration explicitly:
```sql
CREATE TABLE public.songs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  job_id text NOT NULL,
  audio_url text NOT NULL,
  created_at timestamptz DEFAULT now()
);
```
Note `user_id` is nullable to support unclaimed songs (pre-signup generation). Add an index on `user_id` for RLS policy performance:
```sql
CREATE INDEX songs_user_id_idx ON public.songs(user_id);
```

**Warning signs:**
- Migration runs without error but songs have no foreign key constraint visible in schema
- Deleting a test user in Supabase Auth dashboard does not remove their song records
- `user_id` column accepts any UUID without validation

**Phase to address:**
Song persistence phase. Review the migration SQL carefully before applying to production.

---

### Pitfall 12: R2 Presigned URLs Stored in Database Expire — Dashboard Playback Breaks

**What goes wrong:**
The current generation pipeline creates R2 presigned URLs for audio playback. If these presigned URLs are stored directly in the `songs` table, they expire (R2 presigned URLs expire in hours to days depending on configuration). The dashboard then displays songs the user owns, but clicking play returns 403 because the stored URL has expired. This is confusing and looks like a bug.

**Why it happens:**
Storing the presigned URL is the simplest approach — it works immediately after generation. The expiry problem only surfaces days later when users return to their dashboard.

**How to avoid:**
Store the R2 object key (e.g., `audio/{job_id}/output.wav`) in the `audio_key` column, not the full presigned URL. Generate fresh presigned URLs on-demand when the dashboard fetches songs:

```typescript
// In the dashboard API route
const songs = await supabase.from('songs').select('*').eq('user_id', user.id)
const songsWithUrls = await Promise.all(songs.data.map(async (song) => ({
  ...song,
  playback_url: await getSignedR2Url(song.audio_key, 3600) // 1 hour expiry
})))
```

This adds a small overhead to dashboard load but ensures URLs are always valid.

**Warning signs:**
- `songs` table has an `audio_url` column that contains full `https://...r2.dev/...?X-Amz-Signature=...` URLs
- Dashboard playback works immediately after generation but fails hours later
- No code path that regenerates presigned URLs from stored keys

**Phase to address:**
Song persistence phase AND dashboard phase. Decide on key-vs-URL storage before writing any database schema.

---

### Pitfall 13: Auth Prompt on Success Page Blocks Users Who Won't Sign Up

**What goes wrong:**
If the auth prompt on the success page is implemented as a blocking modal or full-page takeover, users who don't want to sign up cannot download their song, share it, or dismiss the prompt cleanly. The auth prompt must be non-blocking — the song playback and download must always be accessible regardless of whether the user has an account.

**Why it happens:**
Modal auth flows are the easiest to implement and look "complete" in design mockups. Developers implement the blocking version and move on without testing the "skip signup" path.

**How to avoid:**
The auth prompt is a soft nudge, not a gate. Design requirements:
1. Song playback and download work before, during, and after auth prompt display
2. A clear "No thanks, continue without saving" action dismisses the prompt
3. Prompt state (shown/dismissed) is stored in component state, not tied to song availability
4. After dismissal, the user can still see and play their song without re-triggering the prompt

Implement as an inline callout below the song player, not a modal overlay.

**Warning signs:**
- Download button is disabled until the auth prompt is dismissed
- Closing the auth prompt removes the song player from the page
- No "dismiss without signing up" action exists in the UI

**Phase to address:**
Auth UX phase (success page integration). Verify the "don't sign up" path explicitly before shipping.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Storing presigned R2 URLs instead of R2 object keys | Works immediately, no URL generation code needed | Dashboard playback breaks hours/days later as URLs expire | Never — always store keys, generate URLs on-demand |
| Using `getSession()` instead of `getUser()` in server code | One fewer network round-trip | Security hole — session cookie can be forged | Never — always use `getUser()` server-side |
| Skipping RLS on songs table | Faster development | Any user can access any other user's songs; catastrophic privacy violation | Never — enable RLS the moment the table is created |
| Disabling email confirmation permanently | Zero signup friction | No email validation; harder to fight spam accounts when payments are added | Acceptable for v4.2 pre-payments; re-enable when Stripe is added |
| Sending emails in the same API handler as generation | Simpler code path | Resend rate limit (2 req/s) causes email drops; generation response delayed by email latency | Acceptable for MVP if emails are sent after the generation response has returned |
| No middleware matcher (runs on all routes) | Simpler middleware config | Auth runs on every static asset request; 400 errors; Supabase quota consumption | Never — always add the matcher |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Supabase Auth + @supabase/ssr | Installing deprecated `@supabase/auth-helpers-nextjs` | Install only `@supabase/ssr` and `@supabase/supabase-js`; use `createBrowserClient` / `createServerClient` |
| Supabase Auth middleware | No `config.matcher` — runs on static assets | Add matcher that excludes `_next/static`, `_next/image`, and image file extensions |
| Supabase Auth email templates | Using default template with fragment-based redirect | Customize template to use `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email` |
| Supabase RLS | Testing with SQL editor (postgres superuser bypasses RLS) | Test all RLS policies using a browser client with the anon key |
| Resend email sends | Not checking `error` from `resend.emails.send()` — silent drops | Always destructure `{ data, error }` and handle error explicitly |
| Resend domain setup | Starting development before DNS is verified | Verify domain in Resend dashboard on Day 1 of email phase, before writing any email code |
| Cloudflare R2 audio | Storing presigned URLs (expire) instead of object keys | Store `audio_key` (object path); generate presigned URLs on-demand in API routes |
| Supabase songs table | Foreign key to `users` instead of `auth.users` | Explicitly reference `auth.users(id) ON DELETE CASCADE` |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| `getUser()` called in every server component independently | Each page component makes a separate Supabase Auth network request | Create user in middleware, pass via `request.headers` or fetch once in root layout | At any scale — multiple network calls per page render |
| Dashboard fetches all songs with full audio metadata including URL generation | Dashboard loads slowly as song count grows | Paginate song list; generate presigned URLs lazily on expand/play, not on initial list load | Noticeable at 20+ songs; painful at 100+ |
| No index on `songs.user_id` | RLS policy scans entire table for every authenticated request | Add `CREATE INDEX songs_user_id_idx ON public.songs(user_id)` at table creation | Slow at 1,000+ rows; times out at 100,000+ rows |
| Sending both creator + recipient emails synchronously in generation API | Generation API response delayed by 2 email sends (each ~200-500ms) | Send emails after returning the generation response, or via a queued background task | Any volume — adds 400-1000ms latency to generation response |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Using `getSession()` server-side to protect routes | Session cookie can be forged; auth bypass | Use `getUser()` exclusively in all server-side auth checks |
| RLS not enabled on songs table | Any user can read/write any song record | Enable RLS immediately on table creation; add SELECT/INSERT/DELETE policies |
| INSERT policy without `WITH CHECK` on `user_id` | Users can insert songs with another user's `user_id`, stealing their dashboard | Every INSERT policy must include `WITH CHECK (auth.uid() = user_id)` |
| Exposing R2 presigned URL generation in a public API without auth check | Anyone can generate signed URLs for any object in the bucket | Song claim and URL generation routes must verify `auth.uid()` before returning URLs |
| Supabase service role key used in client-side code | Full database access exposed to browser — complete data breach | Service role key only in server-side environment variables; anon key for browser clients |
| Resend API key hardcoded or committed to git | Email sending hijacked; spam sent from Notevra's domain | Store in `.env.local` only; verify `.gitignore` excludes `.env.local` |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Auth prompt is a blocking modal over the song player | Users cannot hear or download their song until they interact with the prompt | Soft inline nudge below the player; song is always accessible |
| "Sign up to save your song" shown before generation is complete | Prompt appears while song is still generating — jarring timing | Show auth prompt only after song is successfully playing |
| Email confirmation required before user can see their dashboard | High signup drop-off at the emotional peak moment | Disable email confirmation for v4.2; restore when payments are added |
| Dashboard redirects to login with no explanation | User who follows a bookmark to dashboard gets redirected silently | Redirect includes `?next=/dashboard` so login sends them back; show a clear "sign in to view your songs" message |
| Recipient gift email sends immediately after generation | Recipient receives email before creator can review or decide | Let creator preview and explicitly trigger gift send; do not auto-send |
| Password reset email links to production URL in local dev | Password reset broken in development | Supabase Site URL must be `http://localhost:3000` in dev; use env-based Site URL configuration |

---

## "Looks Done But Isn't" Checklist

- [ ] **Auth middleware:** Middleware runs only on routes in the protect-list; quiz, generation API, and success page are all accessible without a session.
- [ ] **Package selection:** `@supabase/auth-helpers-nextjs` is NOT in `package.json`; only `@supabase/ssr` is installed.
- [ ] **Server-side auth checks:** Every server component and route handler that checks auth uses `getUser()`, never `getSession()`.
- [ ] **RLS enabled:** Every table created in v4.2 has RLS enabled and explicit policies before any data is written to it.
- [ ] **Song claim flow:** A user who generates a song anonymously, then signs up, can see that song in their dashboard.
- [ ] **Presigned URLs:** Songs table stores R2 object keys, not presigned URLs. Dashboard generates fresh URLs at load time.
- [ ] **Foreign key correct:** Songs table foreign key references `auth.users(id) ON DELETE CASCADE`, not `public.users`.
- [ ] **User_id index:** `songs.user_id` column has a database index.
- [ ] **Resend domain verified:** Resend dashboard shows domain status as "Verified" before any email code is merged.
- [ ] **Resend error handled:** Every call to `resend.emails.send()` destructures `{ data, error }` and logs errors.
- [ ] **PKCE second-login tested:** Login → logout → login cycle completes successfully without a code verifier error.
- [ ] **Recipient email is opt-in:** Gift delivery email is explicitly triggered by the creator, not auto-sent after generation.
- [ ] **Auth prompt is non-blocking:** Download and playback work whether the user dismisses the auth prompt or signs up.
- [ ] **Password reset tested in production URL config:** Supabase Site URL is set to the production domain, not localhost, in the production project settings.

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Wrong Supabase package installed (`auth-helpers-nextjs`) | MEDIUM | Remove package; install `@supabase/ssr`; refactor client factories — typically 2-4 hours depending on surface area |
| RLS not enabled on songs table | HIGH | Enable RLS immediately; audit all data accessed since table was created; assume all records are compromised; notify users if any data was exposed |
| Presigned URLs stored instead of keys | MEDIUM | Add `audio_key` column; backfill keys from existing URLs where possible; update generation flow to store keys going forward; update dashboard to generate URLs on-demand |
| Songs not claiming after signup | MEDIUM | Add `localStorage` storage for `job_id` at generation completion; implement claim API route; test the full anonymous→signup→claim flow |
| Resend domain not verified before launch | LOW | Domain verification can be done after launch with emails coming from `onresend.com` temporarily; swap sender address once domain is verified |
| Users locked out by email confirmation | LOW | Disable "Confirm email" in Supabase dashboard; existing unconfirmed users may need manual confirmation |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Wrong Supabase package (`auth-helpers`) | Auth infrastructure setup | `package.json` contains `@supabase/ssr`, no `auth-helpers` |
| `getSession()` used server-side | Auth infrastructure setup | Code review: no server-side `getSession()` calls anywhere in codebase |
| Middleware runs on static assets | Auth infrastructure setup | Browser network tab shows no auth requests on `_next/static` asset loads |
| Quiz funnel broken by middleware redirect | Auth middleware integration | Full quiz flow completes without auth prompt until success page |
| Songs cannot be claimed after signup | Song persistence phase | Manual test: complete quiz anonymously → sign up → confirm song appears in dashboard |
| RLS not enabled | Song persistence phase | Supabase dashboard: songs table shows RLS as Enabled with active policies |
| Email confirmation blocks UX | Auth UX phase | New user signing up on success page is immediately logged in, no "check your email" screen |
| PKCE verifier lost after signout | Auth UX phase | Test: login → logout → login completes successfully |
| Resend domain not verified | Email infrastructure phase | Resend dashboard shows domain "Verified" before first email send |
| Resend silent error drops | Email integration phase | All `resend.emails.send()` calls have `{ data, error }` destructuring with error logging |
| R2 presigned URL expiry in dashboard | Song persistence phase | Dashboard tested 48 hours after generation — playback still works |
| Foreign key references wrong schema | Song persistence phase | Migration SQL reviewed; FK is `REFERENCES auth.users(id) ON DELETE CASCADE` |
| Auth prompt blocks download | Auth UX phase | Manual test: decline sign-up prompt → download button works; playback works |

---

## Sources

- [Supabase: Setting up Server-Side Auth for Next.js](https://supabase.com/docs/guides/auth/server-side/nextjs) — Official guide for `@supabase/ssr` setup, middleware, and cookie handling
- [Supabase: auth-helpers deprecation and migration to @supabase/ssr](https://supabase.com/docs/guides/auth/server-side/migrating-to-ssr-from-auth-helpers) — Official migration guide
- [Supabase: Troubleshoot Next.js Auth issues](https://supabase.com/docs/guides/troubleshooting/how-do-you-troubleshoot-nextjs---supabase-auth-issues-riMCZV) — Official troubleshooting guide
- [Supabase GitHub issue #898: getUser vs getSession security difference](https://github.com/supabase/auth-js/issues/898) — Security analysis of `getSession()` vs `getUser()`
- [Supabase SSR issue #55: PKCE code verifier cookie lost after signout](https://github.com/supabase/ssr/issues/55) — Known PKCE bug documentation
- [Supabase: Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security) — RLS policies, WITH CHECK requirement, testing methodology
- [Supabase: RLS Performance and Best Practices](https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices-Z5Jjwv) — Index requirements for RLS policies
- [Supabase: Managing User Data](https://supabase.com/docs/guides/auth/managing-user-data) — Foreign key to `auth.users`, ON DELETE CASCADE pattern
- [Supabase: Email Templates](https://supabase.com/docs/guides/auth/auth-email-templates) — PKCE-compatible template, Safe Links / spam detection issue
- [Supabase: Redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls) — Site URL configuration, callback handling
- [Resend: Account quotas and limits](https://resend.com/docs/knowledge-base/account-quotas-and-limits) — Rate limits (2 req/s), daily quota (100/day), monthly quota (3,000/month)
- [Resend: Managing Domains](https://resend.com/docs/dashboard/domains/introduction) — Domain verification, SPF/DKIM requirements
- [Resend: Email authentication guide](https://resend.com/blog/email-authentication-a-developers-guide) — SPF, DKIM, DMARC setup
- [Supabase: Anonymous Sign-Ins](https://supabase.com/docs/guides/auth/auth-anonymous) — Anonymous user patterns, data conflict on account conversion
- [Supabase Discussion #22377: Syncing anonymous user to existing user](https://github.com/orgs/supabase/discussions/22377) — Anonymous-to-authenticated data linking patterns

---
*Pitfalls research for: Notevra v4.2 — Supabase Auth + Resend email + song persistence added to existing anonymous Next.js app*
*Researched: 2026-03-06*
