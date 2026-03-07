# Phase 28: Auth Infrastructure - Research

**Researched:** 2026-03-06
**Domain:** Supabase SSR + Next.js App Router authentication
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Auth page structure**
- Dedicated full pages: /login, /signup, /forgot-password, /update-password as separate routes
- Not modals, not tabbed — each flow gets its own page and URL
- Pages include standard Header and Footer (full page chrome)
- Centered card form layout on cloud white background — form is the focus
- Full Notevra brand styling: baby blue primary buttons, Libre Baskerville headings, warm mellow yellow accents

**Auth flow behavior**
- Context-dependent redirects using `next` query parameter: from success page → back to success page; from header → to /dashboard
- Error display: field-level inline validation (red text below field) for client-side, banner above form for server-side errors ("email taken", "invalid credentials")
- Sign-up and login pages cross-link with contextual text: "Don't have an account? Sign up" / "Already have an account? Log in"

**Password reset flow**
- Subtle hint text on the confirmation screen: "Open the link on this device for it to work" (PKCE constraint)
- Update-password page at /update-password handles the token from the reset email

**Header auth integration**
- Anonymous visitors: add "Sign Up" and "Log In" as separate text links in the header nav area
- Authenticated users: user initial in a circle (avatar-style, matching the Notevra "N" logo pattern) with dropdown containing "My Songs" and "Sign Out"
- "Create Your Song" CTA stays visible for ALL users — auth links are separate
- Mobile: auth links appear inside the hamburger menu drawer below existing nav items

**Password & validation UX**
- Minimum 8 characters, no complexity requirements (no uppercase/number rules)
- No password strength indicator — keep the form simple
- Single email field on sign-up (no "confirm email" second field)
- Warm, friendly error messages: "Hmm, that email's already taken. Try logging in instead?" — matches the gift service personality

**Carried from prior research**
- Use @supabase/ssr only — auth-helpers-nextjs is deprecated
- Use getUser() in all server code — getSession() can be spoofed
- Middleware matcher excludes static assets to avoid 400 errors
- Only protect /dashboard in middleware — quiz funnel stays public
- Email confirmation disabled for v4.2 — document re-enable procedure

### Claude's Discretion

- Whether to show forgot-password success on same page or redirect to /forgot-password/sent

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| AUTH-01 | User can sign up with email and password | `signUp()` from createServerClient via server action |
| AUTH-02 | User receives email confirmation after sign-up (via Resend SMTP) | Disabled for v4.2; Supabase dashboard "Confirm email" toggle under Email provider settings |
| AUTH-03 | User can log in with email and password | `signInWithPassword()` via server action |
| AUTH-04 | User can reset password via email link | `resetPasswordForEmail()` → PKCE callback → `updateUser()` |
| AUTH-05 | User session persists across browser refresh (cookie-based via @supabase/ssr) | Middleware updateSession + cookie-based token storage |
| AUTH-06 | User can sign out | `supabase.auth.signOut()` server action + redirect |
| AUTH-07 | Auth callback route handles email confirmation and password reset tokens | `/auth/confirm` route using `verifyOtp({ token_hash, type })` |
| AUTH-08 | Auth error page shows graceful message for expired/invalid links | `/auth/error` page reads `?error=` search param |
| AUTH-09 | Header nav shows auth state (Sign up/Login when anonymous, My Songs when authenticated) | layout.tsx passes `user` prop to Header; Header becomes split server/client |
</phase_requirements>

---

## Summary

Phase 28 implements cookie-based authentication for Notevra using `@supabase/ssr` and Next.js App Router. The pattern is well-established and officially documented: two client factory functions (browser + server), a middleware that refreshes tokens on every request, server actions for all auth mutations, and a single `/auth/confirm` callback route that handles both email confirmation and password reset via PKCE token exchange.

The biggest architectural decision is how to thread auth state from Server Components to the existing client component `Header.tsx`. The correct pattern is to fetch `user` in `layout.tsx` (which is already async-compatible as an RSC) and pass it as a prop to Header. Header must be refactored into a server shell that passes the `user` prop down to a client sub-component that handles the interactive dropdown and mobile drawer.

The PKCE flow for password reset is browser-session-bound by design — the code verifier is stored in the browser where the reset was initiated, so clicking the link in a different browser silently fails. This is not a bug; it is a security feature. The UI must warn users with the PKCE hint copy already decided in CONTEXT.md.

**Primary recommendation:** Install `@supabase/ssr` + `@supabase/supabase-js`, create `src/lib/supabase/client.ts` and `src/lib/supabase/server.ts`, write `middleware.ts` at project root with the standard `updateSession` pattern and a matcher that excludes static assets, then build auth pages as Server Components with server actions — no client-side fetch calls for auth mutations.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @supabase/ssr | latest (^0.6) | Cookie-based Supabase client for Next.js SSR | Official Supabase SSR package; auth-helpers-nextjs is deprecated |
| @supabase/supabase-js | latest (^2.x) | Supabase JS client (peer dependency of @supabase/ssr) | Required peer dep, already likely installed via ssr |
| zod | ^4.3.6 (already installed) | Form validation schemas for auth inputs | Already in project, used for quiz |
| react-hook-form | not needed — use server actions | Form state management | Server actions with native FormData eliminate need for RHF on auth forms |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| lucide-react | already installed | Eye icon for password toggle, Mail icon | Client component password fields |
| framer-motion | already installed | Subtle form entrance animation | Optional — use sparingly if at all |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @supabase/ssr | @supabase/auth-helpers-nextjs | auth-helpers-nextjs is deprecated and causes silent session failures — never use |
| Server actions for auth | Client-side fetch to /api/auth | Server actions are simpler, no API route needed, catch errors via try/catch + redirect |
| getUser() in server code | getSession() | getSession() reads cookie without JWT revalidation — can be spoofed; always use getUser() |
| getUser() in server code | getClaims() | getClaims() validates JWT signature locally but doesn't verify server-side logout — use getUser() for route protection |

**Installation:**
```bash
npm install @supabase/supabase-js @supabase/ssr
```

Note: Check if `@supabase/supabase-js` is already installed (it may have been added as a dep of other Supabase packages). If already present, only `@supabase/ssr` needs installing.

---

## Architecture Patterns

### Recommended File Structure

```
src/
├── lib/
│   └── supabase/
│       ├── client.ts          # createBrowserClient — Client Components only
│       ├── server.ts          # createServerClient with cookies() — Server Components, Actions, Route Handlers
│       └── middleware.ts      # updateSession utility — called from root middleware.ts
├── app/
│   ├── auth/
│   │   ├── confirm/
│   │   │   └── route.ts       # PKCE callback: email confirm + password reset tokens
│   │   └── error/
│   │       └── page.tsx       # Graceful error for expired/invalid auth links
│   ├── login/
│   │   ├── page.tsx           # Server Component form with server action
│   │   └── actions.ts         # login(), signOut() server actions
│   ├── signup/
│   │   ├── page.tsx           # Server Component form with server action
│   │   └── actions.ts         # signup() server action
│   ├── forgot-password/
│   │   └── page.tsx           # resetPasswordForEmail() server action inline or in actions.ts
│   └── update-password/
│       └── page.tsx           # updateUser() server action — only reachable after PKCE exchange
├── components/
│   └── Header.tsx             # Refactored: server wrapper passes user prop; client sub-component handles interactivity
middleware.ts                   # Project root — calls updateSession, matcher excludes static assets
.env.local                     # Add NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
```

### Pattern 1: Supabase Client Factories

**What:** Two factory functions — one for browser (client components), one for server (RSC, server actions, route handlers).

**When to use:** Import `createClient` from `@/lib/supabase/server` in any server context; from `@/lib/supabase/client` in any `'use client'` component.

```typescript
// src/lib/supabase/client.ts
// Source: https://supabase.com/docs/guides/auth/server-side/creating-a-client
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  )
}
```

```typescript
// src/lib/supabase/server.ts
// Source: https://www.ryankatayi.com/blog/server-side-auth-in-next-js-with-supabase-my-setup
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Called from a Server Component — ignore writes, middleware handles persistence
          }
        },
      },
    }
  )
}
```

### Pattern 2: Middleware updateSession

**What:** The middleware refreshes the Supabase auth token on every request and syncs it to both the request (for Server Components) and response (for the browser). Must run on every route that could need auth.

**When to use:** Project root `middleware.ts` delegates to this utility.

```typescript
// src/lib/supabase/middleware.ts
// Source: https://supabase.com/docs/guides/auth/server-side/nextjs
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: call getUser() — this is what refreshes the token
  // Do NOT use getSession() here
  await supabase.auth.getUser()

  return supabaseResponse
}
```

```typescript
// middleware.ts (project root — next to package.json)
// Source: https://supabase.com/docs/guides/auth/server-side/nextjs
import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  return updateSession(request)
}

export const config = {
  matcher: [
    // Exclude static files, image optimization, favicon, and common image formats
    // This prevents 400 errors and Supabase quota inflation
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

### Pattern 3: Auth Callback Route (PKCE)

**What:** The single route that handles both email confirmation and password reset links. Supabase sends users here with `token_hash` and `type` query parameters. The route exchanges them for a session using `verifyOtp`.

**When to use:** Email confirmation links and password reset links both land here.

```typescript
// src/app/auth/confirm/route.ts
// Source: https://supabase.com/ui/docs/nextjs/password-based-auth
import { type EmailOtpType } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import { type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const next = searchParams.get('next')
  const redirectTo = next?.startsWith('/') ? next : '/'

  if (token_hash && type) {
    const supabase = await createClient()
    const { error } = await supabase.auth.verifyOtp({ type, token_hash })

    if (!error) {
      // For password reset: redirect to update-password page
      if (type === 'recovery') {
        redirect('/update-password')
      }
      redirect(redirectTo)
    }

    redirect(`/auth/error?error=${encodeURIComponent(error.message)}`)
  }

  redirect('/auth/error?error=Missing+token')
}
```

### Pattern 4: Server Actions for Auth Mutations

**What:** All auth mutations (signup, login, signout, resetPassword, updatePassword) are Server Actions — no API routes needed.

```typescript
// src/app/login/actions.ts
'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function login(formData: FormData) {
  const email = String(formData.get('email') ?? '')
  const password = String(formData.get('password') ?? '')
  const next = String(formData.get('next') ?? '/dashboard')

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    // Return error — page catches and displays as banner
    return { error: error.message }
  }

  revalidatePath('/', 'layout')
  redirect(next)
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/')
}
```

```typescript
// src/app/signup/actions.ts
'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function signup(formData: FormData) {
  const email = String(formData.get('email') ?? '')
  const password = String(formData.get('password') ?? '')

  const supabase = await createClient()
  const { error } = await supabase.auth.signUp({
    email,
    password,
    // emailRedirectTo not needed — email confirmation disabled for v4.2
  })

  if (error) {
    return { error: error.message }
  }

  // With email confirmation disabled: user gets session immediately
  redirect('/dashboard')
}
```

### Pattern 5: Header Auth State Threading

**What:** `layout.tsx` (Server Component) calls `getUser()` and passes `user` as a prop to `Header`. Header becomes a server shell component that imports a `HeaderClient` client component for interactive parts.

**When to use:** Any layout that needs to display auth-dependent UI without client-side flicker.

```typescript
// src/app/layout.tsx (modified)
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/Header'

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <html lang="en">
      <body ...>
        <Header user={user} />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  )
}
```

```typescript
// src/components/Header.tsx — becomes a server component
import { HeaderClient } from './HeaderClient'
import type { User } from '@supabase/supabase-js'

export function Header({ user }: { user: User | null }) {
  return <HeaderClient user={user} />
}
```

```typescript
// src/components/HeaderClient.tsx — handles all interactivity
'use client'
import type { User } from '@supabase/supabase-js'

export function HeaderClient({ user }: { user: User | null }) {
  // All existing useState, mobile menu, etc. lives here
  // Render "Sign Up" / "Log In" links when !user
  // Render avatar + dropdown when user exists
}
```

### Anti-Patterns to Avoid

- **Using `getSession()` in server code:** It reads cookies without JWT revalidation — can be spoofed. Always use `getUser()`.
- **Using individual cookie methods (`get`, `set`, `remove`):** @supabase/ssr requires `getAll` and `setAll` exclusively. Individual methods cause session loss.
- **Importing from `@supabase/auth-helpers-nextjs`:** Deprecated package with known silent session failures.
- **Calling `getUser()` from client components to check auth state:** Use the `user` prop passed from server, or `onAuthStateChange` for real-time updates.
- **Forgetting `revalidatePath('/', 'layout')` after signOut:** Without this, the header keeps showing the logged-in state until full page reload.
- **Not preserving `supabaseResponse` in middleware:** Returning a `new NextResponse()` instead of the existing `supabaseResponse` breaks cookie passing and causes auth loops.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Cookie-based session management | Custom cookie read/write logic | `@supabase/ssr` createServerClient | HTTP-only cookie handling, secure flag, path scoping — dozens of edge cases |
| JWT token refresh | Custom refresh logic | `updateSession` middleware pattern | Supabase handles token expiry, refresh timing, retry |
| PKCE code exchange | Custom OAuth state machine | `verifyOtp({ token_hash, type })` | Cryptographic verifier matching is non-trivial |
| Password reset email | Custom email with tokens | `resetPasswordForEmail()` | Token generation, expiry, secure storage all handled |
| Auth state hydration | Custom React context + localStorage | Server Component `getUser()` + prop threading | Avoids client/server hydration mismatch and flicker |
| Form validation | Custom validation functions | Zod schemas (already installed) | Already in project; use `z.string().email()`, `z.string().min(8)` |

**Key insight:** The surface area of auth edge cases (token expiry races, concurrent tab refresh, PKCE verifier mismatch, cookie domain issues) is enormous. Every piece of auth logic should delegate to the Supabase SDK.

---

## Common Pitfalls

### Pitfall 1: Individual Cookie Methods Break Sessions

**What goes wrong:** Using `get`, `set`, `remove` cookie methods (from older @supabase/ssr docs) instead of `getAll`/`setAll`. Session tokens silently fail to persist.

**Why it happens:** The `@supabase/ssr` package moved to bulk cookie operations to prevent partial write failures. Individual methods are no longer supported.

**How to avoid:** Use only `getAll()` and `setAll()` in both server.ts and middleware.ts. Never use individual cookie operations.

**Warning signs:** Users get logged out on page refresh despite completing login.

### Pitfall 2: Middleware Returns Wrong Response Object

**What goes wrong:** After calling `setAll`, creating a `new NextResponse()` instead of using the existing `supabaseResponse`. Auth cookies are dropped.

**Why it happens:** `setAll` updates `supabaseResponse` in place — returning a fresh response loses the cookies that were just set.

**How to avoid:** Always `return supabaseResponse` from the middleware utility. Never construct a new NextResponse after the Supabase client is created.

**Warning signs:** `AuthSessionMissingError` in Server Components despite valid cookies in the browser.

### Pitfall 3: PKCE Reset Link Browser-Session Binding

**What goes wrong:** User requests password reset on desktop browser, receives email, clicks link on mobile — the link appears broken ("invalid or expired link").

**Why it happens:** PKCE stores a code verifier in the browser's session storage where the flow was initiated. The link is valid, but the verifier to match it is only in the original browser session.

**How to avoid:** This is by design and cannot be fixed without switching to implicit flow (less secure). The UI must display the copy: "Open the link on this device for it to work."

**Warning signs:** Reports of reset links "not working" — they work only in the originating browser.

### Pitfall 4: getUser() Causes AuthSessionMissingError in Server Components

**What goes wrong:** `supabase.auth.getUser()` throws `AuthSessionMissingError` in a Server Component even though the user is logged in.

**Why it happens:** The middleware must run and pass the refreshed token to Server Components via `request.cookies.set` BEFORE the Server Component renders. If another middleware runs after and modifies the response, cookies can be lost.

**How to avoid:** Keep the Supabase middleware as the last middleware if chaining. Ensure `updateSession` is called before returning from any middleware wrapper.

**Warning signs:** Header shows anonymous state immediately after login, or auth-protected pages redirect to login despite active session.

### Pitfall 5: Missing Supabase Redirect URL Configuration

**What goes wrong:** Password reset emails link to your site URL but Supabase rejects the callback URL as "not in redirect allowlist."

**Why it happens:** Supabase requires all redirect URLs to be whitelisted in Dashboard > Authentication > URL Configuration.

**How to avoid:** In Supabase Dashboard, add to Redirect URLs:
- `http://localhost:3000/auth/confirm` (development)
- `https://notevra.com/auth/confirm` (production)
Also set Site URL to your production URL.

**Warning signs:** Auth callback returns error "redirect_uri not allowed."

### Pitfall 6: Header Test Regression

**What goes wrong:** Existing `Header.test.tsx` breaks after refactoring Header into server/client split because the test mocks won't accommodate the `user` prop.

**Why it happens:** Tests render `<Header />` without a `user` prop; TypeScript errors or runtime failures occur.

**How to avoid:** Update `Header.test.tsx` to pass `user={null}` and add a test for authenticated state. Mock the `signOut` server action.

**Warning signs:** `npm run test:unit` fails after Header refactor.

### Pitfall 7: NEXT_PUBLIC_SUPABASE_ANON_KEY vs PUBLISHABLE_KEY

**What goes wrong:** Using `NEXT_PUBLIC_SUPABASE_ANON_KEY` when Supabase's newer docs reference `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.

**Why it happens:** Supabase is transitioning from legacy anon/service_role keys to publishable/secret keys. New projects created after November 2025 may only have publishable keys.

**How to avoid:** Check the Supabase Dashboard > Settings > API Keys. If the project has a publishable key (`sb_publishable_...`), use `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. If only anon key exists, use `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Use whichever key the project actually has — both work the same way.

**Warning signs:** `createBrowserClient` throws at runtime if env var is undefined.

---

## Code Examples

### Sign-Up Server Action Pattern

```typescript
// src/app/signup/actions.ts
'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function signup(formData: FormData) {
  const email = String(formData.get('email') ?? '')
  const password = String(formData.get('password') ?? '')

  const supabase = await createClient()
  const { error } = await supabase.auth.signUp({ email, password })

  if (error) {
    // Don't throw — return so the form can display it
    return { error: error.message }
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}
```

### Forgot Password Server Action

```typescript
// src/app/forgot-password/actions.ts
'use server'

import { createClient } from '@/lib/supabase/server'

export async function resetPassword(formData: FormData) {
  const email = String(formData.get('email') ?? '')
  const supabase = await createClient()

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/confirm?next=/update-password&type=recovery`,
  })

  if (error) {
    return { error: error.message }
  }

  // Success — either redirect to /forgot-password/sent or show inline success
  return { success: true }
}
```

### Update Password Server Action

```typescript
// src/app/update-password/actions.ts
'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function updatePassword(formData: FormData) {
  const password = String(formData.get('password') ?? '')
  const supabase = await createClient()

  const { error } = await supabase.auth.updateUser({ password })

  if (error) {
    return { error: error.message }
  }

  redirect('/dashboard')
}
```

### Auth Error Page

```typescript
// src/app/auth/error/page.tsx
export default function AuthErrorPage({
  searchParams,
}: {
  searchParams: { error?: string }
}) {
  const message = searchParams.error ?? 'Something went wrong with your link.'

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="max-w-md text-center space-y-4">
        <h1 className="font-display text-2xl font-bold text-foreground">
          Link expired or invalid
        </h1>
        <p className="text-muted-foreground">{message}</p>
        <a href="/forgot-password" className="text-primary underline text-sm">
          Request a new password reset link
        </a>
      </div>
    </div>
  )
}
```

### Zod Validation Schemas for Auth Forms

```typescript
// src/lib/supabase/auth-schemas.ts
import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
})

export const signupSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

export const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
})

export const updatePasswordSchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters'),
})
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `@supabase/auth-helpers-nextjs` | `@supabase/ssr` | 2023 | auth-helpers is deprecated; ssr is the official replacement |
| Individual cookie methods (`get`, `set`, `remove`) | `getAll()` / `setAll()` only | @supabase/ssr ^0.5 | Breaking change — individual methods removed |
| `getSession()` for server auth | `getUser()` for server auth | 2024 | getSession() can be spoofed; getUser() validates with auth server |
| `exchangeCodeForSession(code)` | `verifyOtp({ token_hash, type })` | 2024 | New Supabase email template format uses token_hash, not code |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Late 2025 | New key format for projects created after Nov 2025 |

**Deprecated/outdated:**
- `createMiddlewareClient`: Removed — use `createServerClient` with `getAll`/`setAll` in middleware
- `createClientComponentClient`: Removed — use `createBrowserClient`
- `createServerComponentClient`: Removed — use `createServerClient` with `cookies()` from next/headers

---

## Discretion Recommendation: Forgot Password Success State

The CONTEXT.md leaves it to Claude's discretion whether to show success on the same page or redirect to `/forgot-password/sent`.

**Recommendation: Show inline success on the same page.** Replace the form with a success message in-place. This avoids an extra page/route, keeps the implementation simpler (one less page to build and style), and is consistent with how modern auth UIs handle this (GitHub, Linear, Vercel all do inline). The PKCE hint copy ("Open the link on this device for it to work") fits naturally in the inline success state.

---

## Supabase Dashboard Configuration (Pre-Code Checklist)

Before writing any code, these Supabase project settings must be in place:

1. **Disable email confirmation** (for v4.2): Dashboard > Authentication > Providers > Email > toggle "Confirm email" OFF
   - Document the re-enable procedure: toggle it back ON when setting up Resend SMTP in Phase 30
2. **Add redirect URLs**: Dashboard > Authentication > URL Configuration
   - Add: `http://localhost:3000/auth/confirm`
   - Add: `https://notevra.com/auth/confirm` (if domain is live)
3. **Set Site URL**: Dashboard > Authentication > URL Configuration > Site URL
   - Set to `http://localhost:3000` for dev, update to production URL before launch
4. **Copy API keys**: Dashboard > Settings > API > Publishable key and URL
   - Add to `.env.local` as `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

---

## Open Questions

1. **Publishable key vs anon key for this Supabase project**
   - What we know: The project was created before Nov 2025 (based on project context dating to early 2026), so it may have the legacy anon key format
   - What's unclear: Whether the Supabase project `aiypybffzqgmerkjehfn` has a publishable key or only anon key
   - Recommendation: Plan 28-01 should check Dashboard > Settings > API and use whichever key is present; env var name should match the key type

2. **Header component test coverage for auth state**
   - What we know: `Header.test.tsx` exists and tests the current anonymous-only header
   - What's unclear: How much test coverage to add for auth states without a real Supabase connection
   - Recommendation: Test with `user={null}` (anonymous) and `user={{ email: 'test@test.com', id: '123' } as User}` (authenticated) — mock the signOut server action; no Supabase client needed in unit tests

3. **`revalidatePath` scope after signOut**
   - What we know: `revalidatePath('/', 'layout')` is the pattern to bust the RSC cache
   - What's unclear: Whether Next.js 16.x requires any different cache invalidation strategy vs 14/15
   - Recommendation: Use `revalidatePath('/', 'layout')` — this is stable across versions and correctly invalidates the root layout RSC cache

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest ^4.0.18 + @testing-library/react ^16.3.2 |
| Config file | `vitest.config.ts` (exists at project root) |
| Quick run command | `npm run test:unit` |
| Full suite command | `npm run test:unit` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AUTH-01 | signUp() calls Supabase with email+password | unit (mocked) | `npm run test:unit -- --reporter=verbose` | ❌ Wave 0 |
| AUTH-02 | Email confirmation disabled (config, not code) | manual | Supabase Dashboard check | N/A |
| AUTH-03 | signInWithPassword() calls Supabase with creds | unit (mocked) | `npm run test:unit -- --reporter=verbose` | ❌ Wave 0 |
| AUTH-04 | resetPasswordForEmail() calls Supabase | unit (mocked) | `npm run test:unit -- --reporter=verbose` | ❌ Wave 0 |
| AUTH-05 | Session persists via cookie (middleware) | integration/manual | Browser refresh test | N/A |
| AUTH-06 | signOut() calls Supabase signOut | unit (mocked) | `npm run test:unit -- --reporter=verbose` | ❌ Wave 0 |
| AUTH-07 | /auth/confirm route calls verifyOtp with params | unit (mocked route handler) | `npm run test:unit -- --reporter=verbose` | ❌ Wave 0 |
| AUTH-08 | /auth/error page renders error from searchParams | unit | `npm run test:unit -- --reporter=verbose` | ❌ Wave 0 |
| AUTH-09 | Header shows auth links when user=null, avatar when user set | unit | `npm run test:unit` | ⚠️ Partial (Header.test.tsx exists, needs update) |

### Sampling Rate

- **Per task commit:** `npm run test:unit`
- **Per wave merge:** `npm run test:unit`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `src/app/login/actions.test.ts` — unit tests for login() and signOut() server actions (mock Supabase client)
- [ ] `src/app/signup/actions.test.ts` — unit tests for signup() server action
- [ ] `src/app/forgot-password/actions.test.ts` — unit tests for resetPassword() server action
- [ ] `src/app/update-password/actions.test.ts` — unit tests for updatePassword() server action
- [ ] `src/app/auth/confirm/route.test.ts` — unit tests for PKCE callback route handler
- [ ] `src/app/auth/error/page.test.tsx` — render test for error page with searchParam
- [ ] Update `src/components/Header.test.tsx` — add `user` prop, add auth state tests
- [ ] `src/lib/supabase/__mocks__/` — shared mock for createClient (server + browser) to use across all action tests

---

## Sources

### Primary (HIGH confidence)

- [Supabase SSR Next.js Guide](https://supabase.com/docs/guides/auth/server-side/nextjs) — middleware pattern, client factories, getUser vs getSession
- [Supabase Creating SSR Client](https://supabase.com/docs/guides/auth/server-side/creating-a-client) — createBrowserClient, createServerClient, getClaims vs getUser
- [Supabase UI Password-Based Auth](https://supabase.com/ui/docs/nextjs/password-based-auth) — auth/confirm route with verifyOtp, EmailOtpType
- [Supabase PKCE Flow](https://supabase.com/docs/guides/auth/sessions/pkce-flow) — browser-session binding, 5-minute code validity, code verifier behavior

### Secondary (MEDIUM confidence)

- [Ryan Katayi: Server-Side Auth Setup](https://www.ryankatayi.com/blog/server-side-auth-in-next-js-with-supabase-my-setup) — complete server.ts with getAll/setAll, middleware.ts pattern, server action examples — verified against official docs
- [Supabase AI Prompt: Next.js v16 Auth](https://supabase.com/docs/guides/getting-started/ai-prompts/nextjs-supabase-auth) — confirms getAll/setAll requirement, deprecated individual methods
- [Supabase General Auth Configuration](https://supabase.com/docs/guides/auth/general-configuration) — disable email confirmation toggle location
- [Supabase API Keys Migration](https://github.com/orgs/supabase/discussions/29260) — publishable key vs anon key transition

### Tertiary (LOW confidence)

- [Medium: Next.js + Supabase 2025 Guide](https://the-shubham.medium.com/next-js-supabase-cookie-based-auth-workflow-the-best-auth-solution-2025-guide-f6738b4673c1) — referenced for middleware shape, but blocked (403); content verified through other sources
- [DEV: Managing Auth State Server/Client Components](https://dev.to/jais_mukesh/managing-supabase-auth-state-across-server-client-components-in-nextjs-2h2b) — layout.tsx → Header prop threading pattern; architecturally sound, LOW because single community source

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — @supabase/ssr is official, getAll/setAll confirmed by official docs
- Architecture: HIGH — confirmed patterns from official Supabase docs and AI prompt guide
- Middleware pattern: HIGH — confirmed from multiple official sources
- PKCE callback: HIGH — verifyOtp with token_hash confirmed from official UI docs
- Header refactor pattern: MEDIUM — RSC prop threading is standard Next.js, confirmed conceptually; exact split structure is judgement call
- Pitfalls: HIGH — most are documented in Supabase GitHub issues or official troubleshooting docs

**Research date:** 2026-03-06
**Valid until:** 2026-04-06 (stable ecosystem — @supabase/ssr is mature; verify if Next.js major version change occurs)
