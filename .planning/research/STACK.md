# Stack Research

**Domain:** Supabase Auth + Resend email delivery + song dashboard — additions to existing Notevra gift funnel
**Researched:** 2026-03-06
**Confidence:** HIGH (versions verified against live npm registry and official docs; patterns verified against official Supabase Auth SSR guide updated for Next.js 16)

---

## Context: Existing Stack (Do Not Re-research)

This research covers ONLY net-new additions for the v4.2 Auth & Email Delivery milestone. The following are already installed and working:

| Already In Place | Version | Relevance to v4.2 |
|------------------|---------|-------------------|
| Next.js App Router | 16.1.6 | Server Components, Server Actions, middleware — all used by auth flow |
| React | 19.2.3 | Client Components for auth modals/forms; `useActionState` for form state |
| Drizzle ORM | ^0.45.1 | Already the DB layer — songs table will be added alongside auth |
| `postgres` driver | ^3.4.8 | Already connects to Supabase Postgres — auth uses the same project |
| Zod | ^4.3.6 | Already installed — reuse for auth form validation |
| Tailwind CSS | ^4 | OKLCH tokens already configured — auth/dashboard UI included |
| react-hook-form | NOT INSTALLED | Check: project uses native forms + `useActionState` for quiz; auth forms are simple (2-3 fields), no hook-form needed |
| Framer Motion | ^12.35.0 | Auth modal entrance animation — already installed |
| lucide-react | ^0.577.0 | Icons for auth UI — already installed |

**Key architectural fact:** Supabase Auth and Drizzle ORM coexist cleanly. Supabase Auth manages `auth.users` (its own schema). Drizzle manages your `public.*` tables. The link is a `user_id uuid references auth.users(id)` foreign key on any table that needs to belong to a user (in this case, a `user_songs` or enriched `generations` table).

---

## Recommended Stack — New Additions Only

### Auth: Supabase Auth via @supabase/ssr

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `@supabase/supabase-js` | `^2.98.0` | Supabase client — Auth API, user session management | The base Supabase JS client. Required peer dep of `@supabase/ssr`. Provides `supabase.auth.signUp()`, `signInWithPassword()`, `resetPasswordForEmail()`, `signOut()`, and `onAuthStateChange()`. |
| `@supabase/ssr` | `^0.9.0` | Cookie-based SSR session management for Next.js App Router | The official replacement for the deprecated `@supabase/auth-helpers-nextjs`. Exports `createBrowserClient` (Client Components) and `createServerClient` (Server Components + middleware). Handles cookie refresh in middleware so Server Components always have a valid session. Required for Next.js App Router auth — without it, sessions don't persist across server renders. |

**Why Supabase Auth over alternatives:**
- **vs. NextAuth / Auth.js:** The Supabase project (`aiypybffzqgmerkjehfn`) already exists with Row Level Security. Supabase Auth is built into that project — zero additional infrastructure. NextAuth would require a separate adapter and duplicate user management.
- **vs. Clerk:** Clerk adds a third-party service with its own pricing. Supabase Auth is already included in the existing Supabase plan.
- **vs. custom JWT:** Custom auth is weeks of work with many security edge cases. Supabase Auth handles email verification, password reset flows, session refresh, and PKCE out of the box.

**Critical: `@supabase/auth-helpers-nextjs` is deprecated.** Do not install it. All maintenance is on `@supabase/ssr`.

**API key naming note:** Supabase is transitioning from `NEXT_PUBLIC_SUPABASE_ANON_KEY` to `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (new format: `sb_publishable_...`). Both work during the transition period — the existing project likely has the anon key; either value can be used in `createBrowserClient` and `createServerClient` without code changes.

### Email: Resend + React Email

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `resend` | `^6.9.3` | Transactional email API — song-ready notification to creator, gift delivery to recipient | Already researched and selected in v4.1 for the contact form. Same SDK, same pattern. Free tier: 3,000 emails/month, 100/day. Native Next.js Server Actions integration via `resend.emails.send()`. API-based (no SMTP server to manage). |
| `@react-email/components` | `^0.0.36` | React component library for building HTML email templates | Provides pre-built, well-tested email components (`Html`, `Body`, `Container`, `Heading`, `Text`, `Button`, `Hr`, `Link`, `Section`, `Img`) that render to cross-client-compatible HTML. Maintained by the Resend team — first-class integration. Write email templates as React components, render server-side. |
| `@react-email/render` | `^1.1.3` | Renders React email components to HTML strings for sending | The render function (`renderAsync(EmailComponent)`) converts your React email template to a production-ready HTML string. Used server-side in Route Handlers or Server Actions before passing to `resend.emails.send({ html: ... })`. |

**Why `@react-email/components` for this milestone (not plain HTML strings):**

Notevra sends two distinct email types with brand styling — a song-ready notification (with a link to the dashboard + playback) and a gift delivery email (emotional, the recipient's first contact with Notevra). Both need the baby-blue/yellow brand treatment with proper heading hierarchy and a CTA button. Writing cross-client HTML email by hand is notoriously error-prone across Outlook/Gmail/Apple Mail. React Email's components handle this. The template complexity justifies the dependency.

**`@react-email/render` + `next.config.ts` note:** React Email requires `@react-email/render` to be listed in `serverExternalPackages` in `next.config.ts` to avoid bundling conflicts with Next.js's webpack. This is a one-line config addition (see Configuration section below).

**Why Resend over alternatives:**
- **vs. Nodemailer/SMTP:** API-based, no SMTP server, better deliverability, simpler setup for a new project.
- **vs. SendGrid:** SendGrid has more complex API, higher friction for domain verification, less clean Next.js DX.
- **vs. AWS SES:** More setup complexity, requires AWS account/IAM. Resend is faster to ship.

### Supporting: No Additional Libraries Needed

| Capability | Approach | Why No New Package |
|------------|----------|--------------------|
| Auth form validation | Zod (already installed) + native `<form>` + `useActionState` | Email/password forms are 2-3 fields. Zod already handles validation. react-hook-form would add ~30KB for no benefit at this field count. |
| Protected routes | Next.js `middleware.ts` + `@supabase/ssr` | The middleware pattern (see below) handles route protection without a router-level auth library. |
| Auth modal UI | Tailwind (already installed) + Framer Motion (already installed) | The auth prompt on the success page is a modal — no headless UI library needed. |
| Song dashboard | Server Component + Drizzle query | The dashboard lists songs from the DB. Drizzle is already installed. No separate data-fetching library needed. |
| Password reset | Supabase Auth built-in | `supabase.auth.resetPasswordForEmail()` handles reset email delivery via Supabase's own email — no Resend needed for this flow unless you want custom branding on the reset email. |

---

## Configuration Required

### `next.config.ts` — serverExternalPackages

```ts
// next.config.ts
const nextConfig: NextConfig = {
  // ... existing config
  serverExternalPackages: ['@react-email/render'],
};
```

This prevents `@react-email/render` from being bundled by Next.js webpack, which causes runtime errors when rendering email templates in Server Actions or Route Handlers. One-line addition, no impact on other packages.

### `lib/supabase/server.ts` — Server Client

```ts
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,  // or PUBLISHABLE_KEY if using new format
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Component context — cookies() is read-only; middleware handles writes
          }
        },
      },
    }
  );
}
```

### `lib/supabase/client.ts` — Browser Client

```ts
import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

### `middleware.ts` — Token Refresh (CRITICAL)

Server Components cannot write cookies. Without this middleware, auth tokens expire and the user appears logged out mid-session. The middleware runs on every navigation and refreshes the session before the page renders.

```ts
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: Do NOT run any code between createServerClient and getUser()
  // getUser() validates the token with Supabase Auth server (not just JWT decode)
  const { data: { user } } = await supabase.auth.getUser();

  // Redirect unauthenticated users away from protected routes
  if (!user && request.nextUrl.pathname.startsWith('/dashboard')) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
```

**Security note:** Always use `auth.getUser()` in middleware. Never use `auth.getSession()` — it does not revalidate the token with the Supabase server and can be spoofed.

### Database: `user_id` Column on Generations Table

Supabase Auth manages `auth.users`. Drizzle manages `public.generations`. The link is a nullable `user_id` column on the `generations` table — nullable because quiz generation stays public (no account required).

```ts
// src/db/schema.ts — add user_id to generations
userId: uuid('user_id'),  // nullable — anonymous generations allowed
// No .references() directly to auth.users in Drizzle schema definition
// Add the FK constraint via a raw SQL migration instead (Drizzle can't reference auth.* schema)
```

The FK constraint is added via raw migration SQL:
```sql
ALTER TABLE public.generations
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
```

This is because Drizzle's schema definitions can only reference tables in the `public` schema — `auth.users` is in the `auth` schema managed by Supabase, not by Drizzle. The convention is: define the column in Drizzle schema without `.references()`, add the FK via a custom SQL migration.

### Environment Variables to Add

```bash
# .env.local — additions for v4.2

# Supabase Auth (same project as DATABASE_URL)
NEXT_PUBLIC_SUPABASE_URL=https://aiypybffzqgmerkjehfn.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=       # From Supabase Dashboard > Settings > API > anon/public key
                                     # Or use NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY with new sb_publishable_... format

# Resend (for song-ready + gift delivery emails)
RESEND_API_KEY=                      # From Resend Dashboard > API Keys
RESEND_FROM_ADDRESS=songs@notevra.com  # Must be a verified domain in Resend
```

---

## Installation

```bash
# Auth
npm install @supabase/supabase-js @supabase/ssr

# Email
npm install resend @react-email/components @react-email/render
```

No dev-only dependencies. All packages needed at runtime (build time for React Email templates, runtime for auth and email sending).

---

## What NOT to Add

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `@supabase/auth-helpers-nextjs` | Officially deprecated. No new bug fixes or features. Will cause confusion alongside `@supabase/ssr`. | `@supabase/ssr` |
| `next-auth` / `auth.js` | Adds a separate auth layer on top of Supabase Auth. Requires a Supabase adapter, doubles complexity, and the Supabase project already has auth built in. | `@supabase/ssr` directly |
| `react-hook-form` (net new) | Auth forms are 2-3 fields (email + password). Zod + `useActionState` covers this. RHF adds ~30KB for no benefit at this field count. | Native `<form>` + Zod + `useActionState` |
| `react-email` (dev tool, not `@react-email/components`) | The `react-email` npm package is a dev-server tool for previewing email templates in a browser. Useful for complex template development but not required at runtime — it has a known conflict with Next.js 15.3+ preview server (fails on internal Next.js module). | `@react-email/components` + `@react-email/render` only |
| `nodemailer` | Requires SMTP credentials and server management. Resend is API-based with better deliverability and simpler setup. | `resend` |
| Supabase Row Level Security for all tables | RLS is valuable but adds complexity. For this milestone, server-side auth checks (middleware + `auth.getUser()`) are sufficient. RLS can be layered on in a future security hardening phase. | Server-side auth checks in Route Handlers / Server Actions |

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| `@supabase/ssr` | `@supabase/auth-helpers-nextjs` | Never — it's deprecated. `@supabase/ssr` is the successor. |
| Supabase Auth | Clerk | When starting a new project without an existing Supabase setup, or when you need social OAuth (GitHub, Google) out of the box without configuration. For Notevra, Supabase is already the DB — adding Clerk creates a second identity system. |
| Supabase Auth | Auth.js (NextAuth) | When you need multi-provider OAuth (10+ providers) and your DB is not Supabase. For Notevra, email+password is the only required method in this milestone. |
| `@react-email/components` | Plain HTML string in `resend.emails.send()` | When the email is simple (1-2 lines, no styling, no CTA button). Notevra's gift delivery email is an emotionally significant touchpoint — it needs brand styling and a CTA button. React Email's components handle cross-client HTML rendering correctly. |
| Resend | AWS SES | When your app is already deeply integrated in AWS infrastructure and you need very high volume (>100K emails/month) at lowest cost. For Notevra at launch volume, Resend's free tier and simpler DX win. |

---

## Stack Patterns by Variant

**If the auth prompt on the success page is a modal (quiz stays public):**
- No route-level protection for `/quiz` or `/success`
- Middleware only protects `/dashboard`
- Auth modal uses `createBrowserClient` + `supabase.auth.signUp()` / `signInWithPassword()`
- After sign-in, a Server Action associates the `generation_id` from localStorage with the new `user_id`
- This is the recommended pattern — keeps the funnel frictionless

**If password reset email needs Notevra branding:**
- Use Supabase Auth's "Custom SMTP" setting (Supabase Dashboard > Auth > SMTP Settings) pointing to Resend's SMTP bridge (`smtp.resend.com`)
- OR use a Supabase Auth hook to intercept the reset email and send via Resend SDK
- For v4.2, using Supabase's built-in reset email is sufficient — defer custom branding

**If song dashboard needs real-time updates (song status polling):**
- Supabase Realtime (`supabase.channel().on('postgres_changes')`) is available via `@supabase/supabase-js`
- For v4.2, polling or a simple refresh pattern is sufficient — generation is synchronous (~7s) and completes before the user reaches the dashboard

---

## Version Compatibility

| Package | Version | Compatible With | Notes |
|---------|---------|-----------------|-------|
| `@supabase/supabase-js` | ^2.98.0 | Next.js 16, React 19 | Uses native fetch internally. Works in Node.js and Edge runtimes. |
| `@supabase/ssr` | ^0.9.0 | `@supabase/supabase-js` ^2.x, Next.js 16 | Peer dep: `@supabase/supabase-js`. Both must be installed. PKCE flow enabled by default. |
| `resend` | ^6.9.3 | Next.js 16 Server Actions, React 19 | Uses native fetch. Works in Node.js runtime (not Edge). Route Handlers and Server Actions are Node.js by default. |
| `@react-email/components` | ^0.0.36 | `@react-email/render` same major | Must use together. Both maintained by Resend team — versions track each other. |
| `@react-email/render` | ^1.1.3 | Next.js 16 with `serverExternalPackages` | **Requires** `serverExternalPackages: ['@react-email/render']` in `next.config.ts` or webpack bundling will error. |

---

## Sources

- Supabase SSR client docs — https://supabase.com/docs/guides/auth/server-side/creating-a-client — `createServerClient`, `createBrowserClient`, cookie-only pattern (HIGH confidence — official docs, confirmed updated for Next.js 16)
- Supabase Auth Next.js quickstart — https://supabase.com/docs/guides/auth/quickstarts/nextjs — env var names including new `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` format (HIGH confidence — official docs)
- Supabase AI prompt for Next.js auth — https://supabase.com/docs/guides/getting-started/ai-prompts/nextjs-supabase-auth — full middleware.ts and server/client patterns for Next.js 16 (HIGH confidence — official Supabase docs)
- Supabase API key migration — https://github.com/orgs/supabase/discussions/29260 — publishable key vs anon key transition, backward compatibility (HIGH confidence — official GitHub discussion)
- Supabase user data management — https://supabase.com/docs/guides/auth/managing-user-data — profiles table pattern, `auth.users` FK, trigger for auto-population (HIGH confidence — official docs)
- Drizzle + Supabase auth.users FK pattern — https://github.com/orgs/supabase/discussions/27426 — how to reference auth.users from Drizzle-managed public tables (MEDIUM confidence — official Supabase discussion forum)
- npm registry — `@supabase/ssr` latest: 0.9.0, published 2 days ago (HIGH confidence — npm registry search result)
- npm registry — `@supabase/supabase-js` latest: 2.98.0, published 8 days ago (HIGH confidence — npm registry search result)
- npm registry — `resend` latest: 6.9.3, published 7 days ago (HIGH confidence — npm registry search result)
- Resend Next.js docs — https://resend.com/docs/send-with-nextjs — Server Actions pattern, `{ data, error }` response handling (HIGH confidence — official docs)
- React Email GitHub issue #977 — https://github.com/resend/react-email/issues/977 — serverExternalPackages requirement for `@react-email/render` (HIGH confidence — confirmed in multiple issues and discussions)
- WebSearch — react-email v3/v5 and Next.js 15-16 compatibility — `serverExternalPackages` fix confirmed across multiple sources (MEDIUM confidence — community sources, consistent)
- WebSearch — `@supabase/ssr` deprecates `@supabase/auth-helpers-nextjs` — official migration guide confirmed (HIGH confidence — official Supabase migration docs)

---

*Stack research for: Notevra v4.2 — Supabase Auth, Resend email delivery, song dashboard*
*Researched: 2026-03-06*
