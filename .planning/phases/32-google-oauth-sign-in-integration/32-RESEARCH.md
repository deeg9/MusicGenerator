# Phase 32: Google OAuth Sign-In Integration - Research

**Researched:** 2026-03-08
**Domain:** Supabase OAuth, Google Cloud Console, Next.js App Router server actions
**Confidence:** HIGH

## Summary

Phase 32 adds Google OAuth as a second sign-in method alongside the existing email/password flow. The project already has a complete @supabase/ssr auth infrastructure from Phase 28 — Supabase clients, middleware, callback route (`/auth/confirm`), auth pages (`/login`, `/signup`), and header auth state. Google OAuth slots into this infrastructure cleanly with three additions: (1) a new `/auth/callback` Route Handler that calls `exchangeCodeForSession`, (2) a server action `signInWithGoogle` that calls `signInWithOAuth`, and (3) "Continue with Google" buttons on both the login and signup pages.

The anonymous song claim logic (the `notevra_session` cookie mechanism) must fire in the `/auth/callback` route after OAuth code exchange — the same pattern already used in `signup/actions.ts`. This is the highest-risk integration point because it currently only runs in the email signup path.

**Primary recommendation:** Add a `/auth/callback` Route Handler for OAuth code exchange, a `signInWithGoogle` server action, Google buttons on login/signup pages, and replicate the anonymous song claim logic in the callback. No new packages required — `@supabase/ssr` already handles everything.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @supabase/ssr | ^0.9.0 (already installed) | OAuth initiation + code exchange | Already in use; handles PKCE cookies natively |
| @supabase/supabase-js | ^2.98.0 (already installed) | `signInWithOAuth` + `exchangeCodeForSession` APIs | Core Supabase JS client |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| next/headers | Built into Next.js | `headers()` to read `origin` in server action | Required — `redirectTo` must be dynamic, not hardcoded |
| drizzle-orm | Already installed | Anonymous song claim DB update in callback | Same as in `signup/actions.ts` |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Server action for OAuth initiation | Client-side `signInWithOAuth` in a button handler | Client approach works but loses PKCE server guarantee; server action is consistent with project's existing pattern |
| New `/auth/callback` route | Extend existing `/auth/confirm` route | `confirm` uses `verifyOtp` (OTP type), `callback` uses `exchangeCodeForSession` (code type) — they are separate flows and must be separate routes |

**Installation:** No new packages required.

---

## Architecture Patterns

### What Already Exists (Phase 28)
```
src/
├── lib/supabase/
│   ├── client.ts          # createBrowserClient — already correct
│   ├── server.ts          # createServerClient with cookie handlers — already correct
│   └── middleware.ts      # updateSession — already correct, no changes needed
├── app/
│   ├── auth/
│   │   ├── confirm/route.ts   # OTP/magic-link handler (verifyOtp) — DO NOT CHANGE
│   │   └── error/page.tsx     # Auth error display — already usable
│   ├── login/
│   │   ├── page.tsx           # Email/password login form
│   │   └── actions.ts         # login() + signOut() server actions
│   └── signup/
│       ├── page.tsx           # Email/password signup form
│       └── actions.ts         # signup() + anonymous claim logic
└── middleware.ts              # Calls updateSession — no changes needed
```

### What Phase 32 Adds
```
src/
├── app/
│   ├── auth/
│   │   └── callback/
│   │       └── route.ts       # NEW — OAuth code exchange + anonymous claim
│   ├── login/
│   │   └── actions.ts         # ADD signInWithGoogle() action
│   └── signup/
│       └── actions.ts         # (No change needed — Google users won't hit this)
├── components/
│   └── GoogleSignInButton.tsx # NEW (optional extraction) — or inline on pages
```

### Pattern 1: OAuth Server Action (in `/app/login/actions.ts`)
**What:** A server action that calls `signInWithOAuth` and redirects to Google's consent screen
**When to use:** User clicks "Continue with Google" on login or signup page

```typescript
// Source: https://dev.to/mohamed3on/how-to-add-google-oauth-to-nextjs-app-router-with-supabase-auth-f0e
'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function signInWithGoogle(next?: string) {
  const supabase = await createClient()
  const requestHeaders = await headers()
  const origin = requestHeaders.get('origin')

  if (!origin) {
    return redirect('/auth/error?error=Missing+origin')
  }

  const callbackUrl = new URL('/auth/callback', origin)
  if (next) callbackUrl.searchParams.set('next', next)

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: callbackUrl.toString(),
    },
  })

  if (error) {
    return redirect(
      `/auth/error?error=${encodeURIComponent(error.message)}`
    )
  }

  if (data.url) {
    redirect(data.url)
  }
}
```

**Key detail:** The `next` param is threaded through `callbackUrl` as a search param so the callback can redirect the user back to the right page (e.g., `/dashboard`, or the success page URL from `AuthPrompt`).

### Pattern 2: OAuth Callback Route Handler
**What:** Exchanges the OAuth `code` for a session, then runs anonymous song claim logic
**When to use:** Google redirects back to `/auth/callback?code=...`

```typescript
// Source: https://supabase.com/docs/guides/auth/social-login/auth-google
// app/auth/callback/route.ts
import { NextResponse, type NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/db'
import { songs } from '@/db/schema'
import { eq, and, isNull } from 'drizzle-orm'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'
  const safeNext = next.startsWith('/') ? next : '/dashboard'

  if (!code) {
    return NextResponse.redirect(
      new URL('/auth/error?error=Missing+OAuth+code', request.url)
    )
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    return NextResponse.redirect(
      new URL(`/auth/error?error=${encodeURIComponent(error.message)}`, request.url)
    )
  }

  // Claim anonymous songs — same logic as signup/actions.ts
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const cookieStore = await cookies()
      const sessionToken = cookieStore.get('notevra_session')?.value
      if (sessionToken) {
        await db
          .update(songs)
          .set({ userId: user.id, sessionToken: null })
          .where(and(eq(songs.sessionToken, sessionToken), isNull(songs.userId)))
      }
    }
  } catch (claimErr) {
    // Non-fatal — OAuth succeeded, don't block redirect
    console.error('[auth/callback] Anonymous claim failed (non-fatal):', claimErr)
  }

  return NextResponse.redirect(new URL(safeNext, origin))
}
```

### Pattern 3: Google Button on Login/Signup Pages
**What:** A form with an action bound to the `signInWithGoogle` server action
**When to use:** Added to both `/login/page.tsx` and `/signup/page.tsx` with a divider

```tsx
// Inline in login/page.tsx and signup/page.tsx
<form action={signInWithGoogle}>
  <input type="hidden" name="next" value={next} />
  <button
    type="submit"
    className="w-full flex items-center justify-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium hover:bg-muted transition-colors"
  >
    <GoogleIcon />
    Continue with Google
  </button>
</form>

<div className="relative my-4">
  <div className="absolute inset-0 flex items-center">
    <div className="w-full border-t border-border" />
  </div>
  <div className="relative flex justify-center text-xs text-muted-foreground">
    <span className="bg-card px-2">or</span>
  </div>
</div>
```

**Note:** Since login/page.tsx is `'use client'`, the Google button must use `startTransition(() => signInWithGoogle(next))` — same pattern as the email form.

### Anti-Patterns to Avoid
- **Using `supabase.auth.getSession()` in the callback:** Use `getUser()` after `exchangeCodeForSession` — consistent with project decision from Phase 28.
- **Hardcoding `redirectTo` URL:** Always derive from `headers().get('origin')` — breaks in staging/production if hardcoded to localhost.
- **Extending `/auth/confirm` for OAuth:** The `confirm` route calls `verifyOtp` (for email OTP/magic link), not `exchangeCodeForSession` (for OAuth code). They must be separate routes.
- **Blocking on claim failure:** Song claim errors in callback must be non-fatal, consistent with `signup/actions.ts` pattern.
- **Putting Google button in a Server Component form that redirects on the server:** The server action redirects, but the form must still handle the pending state in the client to prevent double-clicks. The `useTransition` pattern from the existing login page is the right approach.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| OAuth PKCE code verifier | Custom crypto exchange | `exchangeCodeForSession(code)` | Supabase handles code_verifier storage in cookies automatically |
| Google button icon | Inline SVG in every file | Extract `GoogleIcon` component or use a small SVG | Consistent across login and signup |
| Origin detection | Parse `request.url` or use env var | `headers().get('origin')` | Headers-based approach works correctly across all environments |

---

## Common Pitfalls

### Pitfall 1: Supabase Callback URL vs Google Authorized Redirect URI Mismatch
**What goes wrong:** OAuth flow fails with "redirect_uri_mismatch" from Google.
**Why it happens:** Two separate whitelists must match:
  1. Google Cloud Console "Authorized redirect URIs" — must include `https://[SUPABASE_PROJECT_ID].supabase.co/auth/v1/callback`
  2. Supabase Dashboard "Redirect URLs" — must include `http://localhost:3000/**` and `https://notevra.net/**` (or `https://notevra.com/**`)
**How to avoid:** During Supabase Google provider setup, the dashboard shows the exact Supabase callback URL to paste into Google Cloud Console. Use the wildcard `/**` pattern in Supabase Redirect URLs to cover all paths.
**Warning signs:** Google returns "Error 400: redirect_uri_mismatch" on the consent screen.

### Pitfall 2: Missing `next` Param Threading
**What goes wrong:** User who clicked "Continue with Google" from the success page `AuthPrompt` ends up at `/dashboard` instead of back at their song.
**Why it happens:** `next` param is lost when it's not encoded into the `redirectTo` URL on the callback.
**How to avoid:** In `signInWithGoogle(next?)`, append `?next=...` to the `callbackUrl` before passing to `redirectTo`. The callback route then reads `next` from its own `searchParams`.
**Warning signs:** OAuth login from success page doesn't return to the song.

### Pitfall 3: Anonymous Claim Not Running for OAuth Users
**What goes wrong:** A user who generated a song anonymously then signed in via Google doesn't see their song in `/dashboard`.
**Why it happens:** Claim logic only exists in `signup/actions.ts` (email path). OAuth users never hit that code.
**How to avoid:** Replicate claim logic in `/auth/callback/route.ts` after `exchangeCodeForSession` succeeds — non-fatal, same pattern.
**Warning signs:** Song exists in DB with `session_token` and `user_id = null` after OAuth sign-in.

### Pitfall 4: Google Button Causes Full Page Reload Without Pending State
**What goes wrong:** User clicks "Continue with Google" twice, or the button stays active after click, causing two concurrent OAuth flows.
**Why it happens:** Without `useTransition`, server action calls don't expose a loading/pending state.
**How to avoid:** Wrap `signInWithGoogle` call in `startTransition` (already used throughout the login page), disable button during `isPending`.
**Warning signs:** Double console logs of OAuth initiation, or user lands on a blank callback page.

### Pitfall 5: `origin` Header Missing in Production
**What goes wrong:** `headers().get('origin')` returns `null` and the action falls into the error branch.
**Why it happens:** Some reverse proxies strip the `Origin` header; alternatively the form uses a GET not POST.
**How to avoid:** Fall back to constructing origin from `NEXT_PUBLIC_SUPABASE_URL` env var, or ensure the form always POSTs. Log a clear error with context.
**Warning signs:** `/auth/error?error=Missing+origin` in production but not locally.

---

## Code Examples

### Google SVG Icon (no package needed)
```tsx
// Source: Standard Google brand SVG
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18"/>
      <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 0 1-7.18-2.54H1.83v2.07A8 8 0 0 0 8.98 17"/>
      <path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 0 1 0-3.04V5.41H1.83a8 8 0 0 0 0 7.18z"/>
      <path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.83 5.4L4.5 7.49a4.77 4.77 0 0 1 4.48-3.3"/>
    </svg>
  )
}
```

### Supabase Dashboard Steps (Human action — must document in plan)
1. Authentication > Providers > Google — toggle on, paste Client ID + Client Secret
2. Authentication > URL Configuration > Redirect URLs — add `http://localhost:3000/**` (for dev) and `https://notevra.net/**` (for prod)
3. Note the "Callback URL (for OAuth)" shown in the Google provider settings — this is what goes into Google Cloud Console

### Google Cloud Console Steps (Human action — must document in plan)
1. APIs & Services > Credentials > Create OAuth 2.0 Client ID (Web application)
2. Authorized JavaScript origins: `http://localhost:3000`, `https://notevra.net`
3. Authorized redirect URIs: the Supabase callback URL from step 3 above (`https://[project].supabase.co/auth/v1/callback`)
4. Copy Client ID and Client Secret to Supabase dashboard

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `@supabase/auth-helpers-nextjs` | `@supabase/ssr` | 2023 | Project already uses correct package — no migration needed |
| Implicit OAuth flow (hash fragment) | PKCE flow | 2022-2023 | `@supabase/ssr` defaults to PKCE — no extra config needed |
| Separate OAuth callback + email confirm handlers | Still recommended as separate routes | Always | `confirm` = OTP; `callback` = code exchange |

---

## Open Questions

1. **Does Notevra have a production domain configured?**
   - What we know: `notevra.net` is mentioned in Phase 30 (Resend domain). Supabase project is `aiypybffzqgmerkjehfn`.
   - What's unclear: Whether `notevra.net` or another domain is the production Next.js URL, vs just email sending domain.
   - Recommendation: Planner should document redirect URL configuration for both `localhost` (dev) and the production domain — the human executing Phase 32 must add both to Supabase and Google Cloud Console.

2. **Should "Continue with Google" also appear on the `AuthPrompt` component on the success page?**
   - What we know: `AuthPrompt` currently shows "Sign up free" (→ `/signup`) and "Log in" (→ `/login`) links. Adding a Google button inline would require converting it to a form with a server action call.
   - What's unclear: User preference. The simplest path is "Google button on `/login` and `/signup` only; `AuthPrompt` stays as-is since it links to those pages."
   - Recommendation: Keep `AuthPrompt` unchanged — users who click "Sign up free" will see the Google option on the signup page. Reduces scope without losing UX value.

3. **What Google OAuth scopes are needed?**
   - What we know: Default scopes (`openid`, `email`, `profile`) are sufficient for account creation. No Google Sheets, Drive, or Calendar access needed.
   - What's unclear: Nothing — default scopes are correct.
   - Recommendation: No custom `scopes` option in `signInWithOAuth` — use Supabase/Google defaults.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 2.x |
| Config file | `vitest.config.ts` (project root) |
| Quick run command | `npm run test:unit -- --reporter=verbose` |
| Full suite command | `npm run test:unit` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| OAUTH-01 | `signInWithGoogle` action calls `signInWithOAuth` with correct provider and `redirectTo` containing `/auth/callback` | unit | `npm run test:unit -- src/app/login/actions.test.ts` | Wave 0 |
| OAUTH-02 | `/auth/callback` route calls `exchangeCodeForSession(code)` and redirects to `next` param | unit | `npm run test:unit -- src/app/auth/callback/route.test.ts` | Wave 0 |
| OAUTH-03 | `/auth/callback` claim logic runs when `notevra_session` cookie is present after OAuth | unit | `npm run test:unit -- src/app/auth/callback/route.test.ts` | Wave 0 |
| OAUTH-04 | `/auth/callback` with no `code` redirects to `/auth/error` | unit | `npm run test:unit -- src/app/auth/callback/route.test.ts` | Wave 0 |
| OAUTH-05 | Login page renders "Continue with Google" button | unit | `npm run test:unit -- src/app/login/page.test.tsx` | Wave 0 |
| OAUTH-06 | Signup page renders "Continue with Google" button | unit | `npm run test:unit -- src/app/signup/page.test.tsx` | Wave 0 |
| OAUTH-07 | Full Google OAuth sign-in flow from login page to dashboard | manual/E2E | Human UAT — OAuth cannot be reliably mocked in E2E without a live Google account | manual-only |

### Sampling Rate
- **Per task commit:** `npm run test:unit`
- **Per wave merge:** `npm run test:unit`
- **Phase gate:** Full unit suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/app/auth/callback/route.test.ts` — covers OAUTH-02, OAUTH-03, OAUTH-04
- [ ] `src/app/login/actions.test.ts` — covers OAUTH-01 (extend existing if present, else create)
- [ ] `src/app/login/page.test.tsx` — covers OAUTH-05 (extend existing if present, else create)
- [ ] `src/app/signup/page.test.tsx` — covers OAUTH-06 (extend existing if present, else create)

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| OAUTH-01 | `signInWithGoogle` server action initiates OAuth with correct `redirectTo` | Pattern 1 code example; `signInWithOAuth` API documented |
| OAUTH-02 | `/auth/callback` route exchanges OAuth code for session via `exchangeCodeForSession` | Pattern 2 code example; distinct from existing `/auth/confirm` |
| OAUTH-03 | Anonymous song claim fires in callback after OAuth (non-fatal) | Pitfall 3; claim code example in Pattern 2 |
| OAUTH-04 | "Continue with Google" button appears on `/login` and `/signup` pages | Pattern 3; Google icon example |
| OAUTH-05 | Supabase Dashboard and Google Cloud Console manually configured | Documented in human-action steps; Pitfall 1 |
| OAUTH-06 | `next` param flows correctly from button click through OAuth round-trip | Pitfall 2; Pattern 1 + Pattern 2 |
</phase_requirements>

---

## Sources

### Primary (HIGH confidence)
- [Supabase Auth - Login with Google](https://supabase.com/docs/guides/auth/social-login/auth-google) — Google provider setup, callback URL format, redirect URI configuration
- [Supabase JS Reference - signInWithOAuth](https://supabase.com/docs/reference/javascript/auth-signinwithoauth) — API signature, `redirectTo`, `scopes` options
- [Supabase Auth Server-Side Next.js Guide](https://supabase.com/docs/guides/auth/server-side/nextjs) — SSR pattern with @supabase/ssr
- Project source (`src/lib/supabase/`, `src/app/auth/confirm/route.ts`, `src/app/signup/actions.ts`) — existing auth patterns to replicate and extend

### Secondary (MEDIUM confidence)
- [DEV: Google OAuth to Next.js App Router with Supabase](https://dev.to/mohamed3on/how-to-add-google-oauth-to-nextjs-app-router-with-supabase-auth-f0e) — server action pattern with `headers().get('origin')` — cross-verified with official Supabase docs

### Tertiary (LOW confidence)
- None — all critical claims verified with official sources or existing project code

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — @supabase/ssr already installed, `signInWithOAuth` is documented API
- Architecture: HIGH — callback route pattern is official Supabase guidance; claim logic reuses verified project pattern
- Pitfalls: HIGH — redirect URI mismatch and anonymous claim gap are explicitly documentable from codebase inspection
- Human steps: MEDIUM — Google Cloud Console UI steps can change; verified via official Supabase docs but UI screenshots may drift

**Research date:** 2026-03-08
**Valid until:** 2026-06-08 (stable APIs — @supabase/ssr + Google OAuth are mature)
