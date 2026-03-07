# Architecture Research

**Domain:** Supabase Auth + Resend email delivery + song dashboard — Next.js App Router integration
**Researched:** 2026-03-06
**Confidence:** HIGH (Supabase SSR docs verified, Resend docs verified, existing codebase inspected directly)

---

## Context: What Already Exists

Before documenting what changes, here is the existing architecture as of v3.0:

```
src/app/
├── layout.tsx                    # Root layout: Header + <main> + Footer (no auth context)
├── page.tsx                      # Landing page (Server Component, static)
├── quiz/
│   ├── page.tsx                  # 6-step quiz funnel ('use client', zustand, localStorage)
│   └── success/[jobId]/
│       └── page.tsx              # Song ready page ('use client', polling /api/poll-job)
├── api/
│   ├── quiz-generate/route.ts    # POST: HeartBula job submission → returns { jobId }
│   ├── poll-job/[jobId]/route.ts # GET: polls HeartBula status → returns { status }
│   └── audio/[jobId]/route.ts    # GET: R2 presigned URL redirect for audio playback
src/lib/
├── heartmula.ts                  # HeartBula API client
├── r2.ts                         # R2 presigned URL generation
├── quiz-prompt.ts                # Quiz answers → HeartBula generation params
└── quiz-types.ts                 # Shared QuizData type
src/db/
├── index.ts                      # Drizzle client (postgres-js, Supabase transaction pooler)
└── schema.ts                     # generations + outputs tables (v1.0 schema — unused in v3.0)
src/env.ts                        # Zod-validated env vars (no auth vars yet)
```

**Key gaps for v4.2:**
- No auth: `src/lib/supabase/` does not exist
- No middleware: `src/middleware.ts` does not exist
- No songs table: `src/db/schema.ts` has old v1.0 generations/outputs schema (unused)
- No email: `resend` not installed
- No dashboard route: `/dashboard` does not exist
- No auth UI: `/login`, `/signup` routes do not exist
- Header has no auth state awareness

---

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     Next.js Middleware (src/middleware.ts)               │
│                     Runs on every request                               │
│         Supabase session refresh → sets auth cookies on response        │
├────────────────────────────────┬────────────────────────────────────────┤
│           PUBLIC ROUTES        │           PROTECTED ROUTES             │
│                                │                                        │
│  ┌──────────┐  ┌────────────┐  │  ┌───────────┐  ┌─────────────────┐   │
│  │    /     │  │   /quiz    │  │  │/dashboard │  │/api/send-email  │   │
│  │ Landing  │  │  Funnel   │  │  │ Server    │  │  auth-gated     │   │
│  │          │  │           │  │  │ Component │  │  API route      │   │
│  └──────────┘  └───────────┘  │  └────┬──────┘  └────────────────┘   │
│                                │       │ reads user                    │
│  ┌────────────────────────┐   │       ↓                               │
│  │  /quiz/success/[jobId] │   │  ┌──────────────────────────┐         │
│  │  + auth prompt after   │   │  │  Supabase (songs table)  │         │
│  │    song ready          │   │  │  user_id FK → auth.users │         │
│  └────────────────────────┘   │  └──────────────────────────┘         │
├────────────────────────────────┴────────────────────────────────────────┤
│                     AUTH ROUTES (unprotected)                           │
│                                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────────┐    │
│  │   /login     │  │   /signup    │  │  /auth/confirm (callback)  │    │
│  │  Server +    │  │  Server +    │  │  Route Handler — exchanges │    │
│  │ client form  │  │ client form  │  │  code for session cookie   │    │
│  └──────────────┘  └──────────────┘  └────────────────────────────┘    │
├─────────────────────────────────────────────────────────────────────────┤
│                     SUPABASE INFRASTRUCTURE                             │
│                                                                         │
│  ┌──────────────────┐  ┌───────────────┐  ┌────────────────────────┐   │
│  │   Auth service   │  │  songs table  │  │     Drizzle ORM        │   │
│  │  (email+password │  │ user_id FK    │  │  (server-only, API     │   │
│  │   + cookies)     │  │ RLS policies  │  │   routes + actions)    │   │
│  └──────────────────┘  └───────────────┘  └────────────────────────┘   │
├─────────────────────────────────────────────────────────────────────────┤
│                     EMAIL INFRASTRUCTURE (Resend)                       │
│                                                                         │
│  ┌────────────────────────────┐  ┌─────────────────────────────────┐   │
│  │  /api/send-creator-email   │  │  /api/send-recipient-email      │   │
│  │  "Your song is ready"      │  │  "Here is your gift song"       │   │
│  │  POST from success page    │  │  POST from success page         │   │
│  └────────────────────────────┘  └─────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Status |
|-----------|----------------|--------|
| `src/middleware.ts` | Refresh Supabase auth session on every request; set auth cookies on response | NEW |
| `src/lib/supabase/client.ts` | Browser Supabase client via `createBrowserClient` — for Client Components | NEW |
| `src/lib/supabase/server.ts` | Server Supabase client via `createServerClient` — for Server Components, API routes, Server Actions | NEW |
| `src/db/schema.ts` | Add `songs` table with `user_id` FK; keep or replace old generations/outputs | MODIFY |
| `src/env.ts` | Add `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `RESEND_API_KEY` | MODIFY |
| `src/app/login/page.tsx` | Email/password login form — Server Component with client form child | NEW |
| `src/app/signup/page.tsx` | Email/password signup form — Server Component with client form child | NEW |
| `src/app/auth/confirm/route.ts` | Auth callback handler — exchange email confirmation code for session | NEW |
| `src/app/quiz/success/[jobId]/page.tsx` | After song ready: add auth prompt + recipient email capture + trigger emails | MODIFY |
| `src/app/dashboard/page.tsx` | Song dashboard — Server Component, reads signed-in user's songs from Supabase | NEW |
| `src/app/api/send-creator-email/route.ts` | POST: send "song ready" email to creator via Resend | NEW |
| `src/app/api/send-recipient-email/route.ts` | POST: send gift delivery email to recipient via Resend | NEW |
| `src/components/Header.tsx` | Add conditional auth nav: "My Songs" link when signed in, "Sign In" link when signed out | MODIFY |
| `src/components/AuthPrompt.tsx` | Sign-up nudge shown on success page after song is ready — Client Component | NEW |
| `src/lib/emails/` | React Email templates: `SongReadyEmail.tsx`, `GiftDeliveryEmail.tsx` | NEW |

---

## Recommended Project Structure

```
src/
├── middleware.ts                         # NEW — Supabase session refresh on every request
├── lib/
│   ├── supabase/
│   │   ├── client.ts                     # NEW — createBrowserClient for 'use client' components
│   │   └── server.ts                     # NEW — createServerClient for Server Components + API routes
│   ├── emails/
│   │   ├── SongReadyEmail.tsx            # NEW — React Email template: "Your song is ready"
│   │   └── GiftDeliveryEmail.tsx         # NEW — React Email template: "You've received a song"
│   ├── heartmula.ts                      # UNCHANGED
│   ├── r2.ts                             # UNCHANGED
│   ├── quiz-prompt.ts                    # UNCHANGED
│   └── quiz-types.ts                     # UNCHANGED
├── db/
│   ├── index.ts                          # UNCHANGED — Drizzle client
│   └── schema.ts                         # MODIFY — add songs table, update or remove old tables
├── env.ts                                # MODIFY — add 3 new env vars
├── app/
│   ├── layout.tsx                        # UNCHANGED
│   ├── page.tsx                          # UNCHANGED
│   ├── login/
│   │   └── page.tsx                      # NEW — login page
│   ├── signup/
│   │   └── page.tsx                      # NEW — signup page
│   ├── auth/
│   │   └── confirm/
│   │       └── route.ts                  # NEW — email confirmation callback
│   ├── dashboard/
│   │   ├── page.tsx                      # NEW — song history (Server Component, auth-gated)
│   │   └── _components/
│   │       └── SongCard.tsx              # NEW — individual song row with play/download
│   ├── quiz/
│   │   ├── page.tsx                      # UNCHANGED
│   │   └── success/[jobId]/
│   │       ├── page.tsx                  # MODIFY — add AuthPrompt + RecipientEmailForm
│   │       └── _components/
│   │           ├── ConfettiBlast.tsx     # UNCHANGED
│   │           ├── SongPlayer.tsx        # UNCHANGED
│   │           ├── SharePrompt.tsx       # UNCHANGED
│   │           ├── AuthPrompt.tsx        # NEW — sign up to save your song
│   │           └── RecipientEmailForm.tsx # NEW — enter recipient email to send the gift
│   └── api/
│       ├── quiz-generate/route.ts        # MODIFY — insert songs row after successful job
│       ├── poll-job/[jobId]/route.ts     # UNCHANGED
│       ├── audio/[jobId]/route.ts        # UNCHANGED
│       ├── send-creator-email/route.ts   # NEW — POST: Resend "song ready" to creator
│       └── send-recipient-email/route.ts # NEW — POST: Resend gift delivery to recipient
└── components/
    ├── Header.tsx                        # MODIFY — add auth-aware nav items
    ├── Footer.tsx                        # UNCHANGED
    └── landing/                          # UNCHANGED
```

### Structure Rationale

- **`src/lib/supabase/`:** Supabase officially recommends a `utils/supabase/` folder; placing it in `src/lib/supabase/` is consistent with the existing `src/lib/` convention for non-component utilities.
- **`src/lib/emails/`:** React Email templates are TypeScript components. Co-locating them in `src/lib/emails/` keeps email rendering logic separate from page/route logic and makes the two templates easy to preview with React Email's dev server.
- **`src/app/auth/confirm/route.ts`:** The auth callback must be a Route Handler (not a page) because it redirects the user after exchanging the one-time code for a session. Supabase requires this exact path by default (`/auth/confirm`).
- **`_components/` in success page:** `AuthPrompt` and `RecipientEmailForm` are private to the success page and should not be in `src/components/`. They belong co-located under `success/[jobId]/_components/`.
- **`src/app/dashboard/_components/`:** `SongCard` is private to the dashboard. Co-located.
- **`src/middleware.ts`:** Must be at `src/` root (or project root) — Next.js will not detect it inside `app/`.

---

## Architectural Patterns

### Pattern 1: Supabase SSR Client Split (Server vs Browser)

**What:** Two separate Supabase client factory functions — one for Server Components/API routes, one for Client Components. They share the same project credentials but differ in how they manage cookies.

**When to use:** Every time Supabase is accessed. Server client for all server-side code; browser client for interactive Client Components.

**Trade-offs:** Two files to maintain, but this separation is mandatory — using the browser client in server code bypasses cookie-based session management and is a security risk.

**Example:**
```typescript
// src/lib/supabase/server.ts — for Server Components, API routes, Server Actions
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {} // Server Components can't set cookies — middleware handles this
        },
      },
    }
  )
}

// src/lib/supabase/client.ts — for 'use client' components
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  )
}
```

### Pattern 2: Middleware Session Refresh

**What:** `src/middleware.ts` calls `updateSession()` on every non-static request, refreshing the Supabase JWT and writing updated cookies to both the request and response.

**When to use:** Always required for Supabase Auth SSR. Without it, Server Components see stale or expired sessions.

**Trade-offs:** Adds one network call per request to Supabase Auth. Small latency impact; necessary for correctness. The matcher excludes static assets to minimize overhead.

**Example:**
```typescript
// src/middleware.ts
import { type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // CRITICAL: always call getUser() — never getSession() in middleware
  await supabase.auth.getUser()

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

### Pattern 3: Server Component Auth Guard (Dashboard)

**What:** Dashboard page reads user from Supabase server client. If no user, redirects to `/login`. If user exists, fetches their songs from the database using Drizzle and renders.

**When to use:** Any protected page — dashboard, account settings, etc.

**Trade-offs:** Auth check runs on the server before any HTML is sent. No client-side flicker. Correct approach for App Router. Do NOT use `getSession()` here — always `getUser()` for security.

**Example:**
```typescript
// src/app/dashboard/page.tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/db'
import { songs } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { SongCard } from './_components/SongCard'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const userSongs = await db
    .select()
    .from(songs)
    .where(eq(songs.userId, user.id))
    .orderBy(songs.createdAt)

  return (
    <main>
      <h1>Your Songs</h1>
      {userSongs.map(song => <SongCard key={song.id} song={song} />)}
    </main>
  )
}
```

### Pattern 4: songs Table Schema with auth.users FK

**What:** A new `songs` table stores one row per generated song. The `user_id` column is a UUID foreign key to `auth.users.id`. Because `auth` is a Supabase-managed schema, Drizzle must declare a minimal `auth` schema proxy to reference it correctly.

**When to use:** Any table that needs to associate rows with authenticated users.

**Trade-offs:** Foreign key to `auth.users` requires the Drizzle `pgSchema` approach — you cannot reference `auth.users` directly from the default `public` schema with Drizzle's standard FK syntax without declaring the schema proxy. RLS policies must be written in SQL migration files, not managed by Drizzle.

**Example:**
```typescript
// src/db/schema.ts — new songs table
import { pgTable, pgSchema, uuid, text, timestamp, index } from 'drizzle-orm/pg-core'

// Proxy for Supabase's auth schema — needed for FK reference only
const authSchema = pgSchema('auth')
const authUsers = authSchema.table('users', {
  id: uuid('id').primaryKey(),
})

export const songs = pgTable(
  'songs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').references(() => authUsers.id, { onDelete: 'cascade' }),
    jobId: text('job_id').notNull(),          // HeartBula job ID for audio lookup
    recipientName: text('recipient_name'),
    creatorEmail: text('creator_email'),
    recipientEmail: text('recipient_email'),   // nullable — set when gift is sent
    r2Key: text('r2_key'),                     // set when generation completes
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('songs_user_id_idx').on(table.userId),
    index('songs_job_id_idx').on(table.jobId),
  ]
)
```

**RLS policy (SQL migration — not in Drizzle schema):**
```sql
-- Enable RLS on songs table
ALTER TABLE public.songs ENABLE ROW LEVEL SECURITY;

-- Users can only read their own songs
CREATE POLICY "users_own_songs_select"
  ON public.songs FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own songs
CREATE POLICY "users_own_songs_insert"
  ON public.songs FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

### Pattern 5: Resend Email via API Route

**What:** Two dedicated API routes wrap Resend email sends. The success page POSTs to them client-side after song generation completes. Each route accepts the minimum data needed to compose and send the email.

**When to use:** Triggered from the client-side success page, which is a Client Component (`'use client'`). Using a Server Action would require changing the success page architecture. API routes are the cleaner integration point here.

**Trade-offs:** API routes add one network hop vs. Server Actions. But the success page is already a Client Component with polling logic — adding a Server Action would require refactoring. The API route approach fits the existing pattern in `quiz-generate/route.ts`.

**Example:**
```typescript
// src/app/api/send-creator-email/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { SongReadyEmail } from '@/lib/emails/SongReadyEmail'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: NextRequest) {
  const { creatorEmail, recipientName, songUrl } = await request.json()

  const { error } = await resend.emails.send({
    from: 'Notevra <songs@notevra.com>',
    to: creatorEmail,
    subject: `Your song for ${recipientName} is ready`,
    react: SongReadyEmail({ recipientName, songUrl }),
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ sent: true }, { status: 200 })
}
```

### Pattern 6: Auth-Aware Header

**What:** `Header.tsx` becomes a Server Component that reads the current user from Supabase. It conditionally renders either "My Songs" (signed-in) or "Sign In" (signed-out) in the nav.

**When to use:** Any global nav that must reflect auth state.

**Trade-offs:** Server Component headers cannot use client-side interactivity like dropdown menus. If a user menu dropdown is needed, extract only the dropdown into a `'use client'` child component and pass the user email as a prop. The header shell stays a Server Component.

**Note:** `Header.tsx` is currently `'use client'` due to the mobile menu toggle. The mobile menu state must stay client-side. One approach: keep the full `Header.tsx` as `'use client'`, call `createBrowserClient` and use `supabase.auth.getUser()` in a `useEffect` to hydrate auth state. Alternatively, wrap the header in a Server Component that passes user data as a prop to the client header.

**Recommended approach for Header:** Extract a small `UserNav` server component rendered inside the header's server wrapper, passing auth state down as props to the mobile-menu client component.

---

## Data Flow

### Flow 1: Quiz Completion → Song Saved to Database

```
/quiz page (client, zustand state)
    ↓ POST quizData
/api/quiz-generate/route.ts
    ↓ submitGenerationJob(params) → HeartBula
    ↓ returns { jobId }
    ↓ INSERT INTO songs (job_id, recipient_name, creator_email, user_id)
      user_id = null if not signed in; set if user is logged in
    ↓ returns { jobId }
/quiz/success/[jobId] (client, redirected from quiz)
    ↓ polls /api/poll-job/[jobId] every 5s
    ↓ on COMPLETED: sets audioUrl = /api/audio/[jobId]
    ↓ shows song player + auth prompt + recipient email form
    ↓ user enters recipient email → POST /api/send-recipient-email
    ↓ user signs up → session created → songs row updated with user_id
```

### Flow 2: Signed-In User Dashboard

```
Browser requests /dashboard
    ↓
middleware.ts: refresh Supabase session, update cookies
    ↓
/dashboard/page.tsx (Server Component)
    ↓ createClient() → supabase.auth.getUser()
    ↓ no user → redirect('/login')
    ↓ user found → db.select().from(songs).where(userId = user.id)
    ↓ render SongCard list with /api/audio/[jobId] links
```

### Flow 3: Sign-Up Flow (New User on Success Page)

```
/quiz/success/[jobId] — song ready state
    ↓ AuthPrompt component renders ("Save your song — sign up free")
    ↓ user fills email + password → POST to Supabase signUp
    ↓ Supabase sends confirmation email
    ↓ user clicks link → /auth/confirm?code=...
    ↓ /auth/confirm/route.ts: exchangeCodeForSession
    ↓ session cookie set → redirect('/dashboard')
    ↓ songs row associated with new user_id (via UPDATE or trigger)
```

### Flow 4: Email Delivery Trigger (Success Page)

```
/quiz/success/[jobId] — song ready state (client)
    ↓ (optional) user enters creator email + recipient email
    ↓ POST /api/send-creator-email { creatorEmail, recipientName, songUrl }
    ↓ POST /api/send-recipient-email { recipientEmail, recipientName, songUrl }
    ↓ Both routes call resend.emails.send() with React Email template
    ↓ Resend delivers to inboxes
```

### State Management

The success page polling flow is already client-side state. Auth state is not held in zustand — it lives in Supabase session cookies managed by middleware. The dashboard is fully server-rendered.

```
Supabase session (cookies, managed by middleware.ts)
    ↓ (server reads via createServerClient)
Server Components (dashboard, header) ← auth.getUser()

Browser Client (login/signup forms) → supabase.auth.signIn/signUp → session cookie
```

---

## Integration Points

### New vs Modified Files

| File | Change Type | What Changes |
|------|-------------|--------------|
| `src/middleware.ts` | NEW | Session refresh for all requests |
| `src/lib/supabase/client.ts` | NEW | Browser client factory |
| `src/lib/supabase/server.ts` | NEW | Server client factory |
| `src/lib/emails/SongReadyEmail.tsx` | NEW | React Email template |
| `src/lib/emails/GiftDeliveryEmail.tsx` | NEW | React Email template |
| `src/db/schema.ts` | MODIFY | Add `songs` table + auth schema proxy |
| `src/env.ts` | MODIFY | Add `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `RESEND_API_KEY` |
| `src/app/login/page.tsx` | NEW | Login form page |
| `src/app/signup/page.tsx` | NEW | Signup form page |
| `src/app/auth/confirm/route.ts` | NEW | Email confirmation callback |
| `src/app/dashboard/page.tsx` | NEW | Song history page (protected) |
| `src/app/dashboard/_components/SongCard.tsx` | NEW | Song row component |
| `src/app/api/send-creator-email/route.ts` | NEW | Resend: creator notification |
| `src/app/api/send-recipient-email/route.ts` | NEW | Resend: gift delivery |
| `src/app/api/quiz-generate/route.ts` | MODIFY | Insert songs row after job creation |
| `src/app/quiz/success/[jobId]/page.tsx` | MODIFY | Add AuthPrompt + RecipientEmailForm |
| `src/app/quiz/success/[jobId]/_components/AuthPrompt.tsx` | NEW | Sign-up nudge on success |
| `src/app/quiz/success/[jobId]/_components/RecipientEmailForm.tsx` | NEW | Recipient email input |
| `src/components/Header.tsx` | MODIFY | Auth-aware nav (My Songs / Sign In) |

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Supabase Auth | `@supabase/ssr` — cookie-based SSR sessions; `createBrowserClient` / `createServerClient` | Use `getUser()` NOT `getSession()` in server code. Middleware refresh is mandatory. |
| Supabase Database | Drizzle ORM via existing `src/db/index.ts` — same postgres-js connection | songs table references `auth.users` via `pgSchema('auth')` proxy in Drizzle schema |
| Resend | `resend` npm package in API routes; `@react-email/components` for templates (optional) | Requires verified sending domain. `RESEND_API_KEY` in env. |
| Cloudflare R2 | UNCHANGED — `/api/audio/[jobId]` presigned URL redirect | Dashboard song playback reuses the same audio API route |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Success page → Resend API routes | `fetch()` from client | Fire-and-forget — failure should not block song display |
| `quiz-generate` → songs table | Drizzle `db.insert()` in server | `user_id` may be null if user is not signed in at generation time |
| Dashboard → songs table | Drizzle `db.select()` filtered by `user.id` | RLS policies as second defense layer |
| Header → Supabase Auth | Server Component reads `getUser()` | Must be coordinated with middleware.ts — middleware runs first |
| Auth confirm route → Supabase | `supabase.auth.exchangeCodeForSession(code)` | Supabase default callback URL must be configured in Supabase dashboard |

---

## Build Order

This order minimizes rework by establishing infrastructure before building features on top of it.

**1. Auth infrastructure (all new files, no existing file changes):**
- Create `src/lib/supabase/client.ts` and `src/lib/supabase/server.ts`
- Create `src/middleware.ts`
- Add env vars to `src/env.ts`
- Validates Supabase session management works end-to-end before any UI

**2. Database schema (existing file change — minimal risk):**
- Add `songs` table to `src/db/schema.ts`
- Run Drizzle migration
- Write RLS policy SQL manually
- Validates data layer before building any UI on top of it

**3. Auth pages (new files, no existing file changes):**
- Create `/login`, `/signup` pages with forms
- Create `/auth/confirm/route.ts`
- Validates full auth flow: sign up → email confirm → session → redirect

**4. Modify `quiz-generate` to save songs (single file change):**
- Add `db.insert(songs)` after successful HeartBula job submission
- `user_id` is null for unauthenticated generations
- Validates song persistence independently of success page changes

**5. Success page additions (existing file change — surgery required):**
- Add `AuthPrompt` component
- Add `RecipientEmailForm` component
- Wire email API calls
- This is the most complex existing-file change — depends on steps 3 and 6

**6. Resend email routes (new files, no existing file changes):**
- Create `src/lib/emails/` templates
- Create `/api/send-creator-email` and `/api/send-recipient-email`
- Test with Resend test mode before connecting to real domain

**7. Dashboard page (new files, no existing file changes):**
- Create `src/app/dashboard/page.tsx` with Server Component auth guard
- Create `SongCard` component
- Depends on steps 1, 2, and 3

**8. Header auth state (existing file change — last, after everything else works):**
- Modify `Header.tsx` to show "My Songs" / "Sign In" based on auth
- Lowest-risk last step — purely additive UI

---

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0–1k users | Current architecture — Supabase free tier handles auth and database. Resend free tier: 3,000 emails/month. |
| 1k–100k users | Supabase scales automatically. Resend Pro tier for email volume. Add rate limiting to email API routes (middleware or Upstash). |
| 100k+ users | Database reads on dashboard may need pagination. Audio files in R2 scale without changes (zero egress fees). Auth scales with Supabase. |

### Scaling Priorities

1. **First bottleneck:** Email volume hitting Resend free tier limits. Fix: upgrade Resend plan (~$20/month for 50k emails). Not a code change.
2. **Second bottleneck:** Dashboard loading all songs without pagination. Fix: add `LIMIT` + cursor-based pagination to Drizzle query. Affects only `dashboard/page.tsx`.

---

## Anti-Patterns

### Anti-Pattern 1: Using `getSession()` in Server Code

**What people do:** Call `supabase.auth.getSession()` in Server Components or middleware to check auth status.

**Why it's wrong:** `getSession()` reads the session from the cookie but does not validate it with the Supabase Auth server. It can be spoofed. Official Supabase docs explicitly warn: "Never trust `getSession()` inside server code."

**Do this instead:** Always call `supabase.auth.getUser()` in server-side code. It makes a network request to validate the token on every call — that is the intended behavior for correctness and security.

### Anti-Pattern 2: Skipping Middleware

**What people do:** Add auth guards only inside page components, skipping `middleware.ts`.

**Why it's wrong:** Server Components cannot write cookies. Without middleware refreshing the session token, the token expires and users get silently logged out. Middleware is the only place that can both read and write cookies on each request.

**Do this instead:** Always create `src/middleware.ts` with `createServerClient` and `getUser()` as described in Pattern 2. This is a hard requirement for Supabase Auth SSR.

### Anti-Pattern 3: Sending Email Synchronously in `quiz-generate` Route

**What people do:** Call `resend.emails.send()` inside `POST /api/quiz-generate` before returning the `{ jobId }` response.

**Why it's wrong:** Email delivery adds latency to the quiz → success page redirect. The creator email cannot be sent until the song is ready anyway (the song URL isn't available at generation time, only at polling completion). Sending it at job creation would send a premature notification.

**Do this instead:** Trigger both emails from the success page once the poll confirms `status === 'COMPLETED'` and the song URL is available. POST to `/api/send-creator-email` and `/api/send-recipient-email` as fire-and-forget calls that do not block the song player rendering.

### Anti-Pattern 4: Storing Recipient Email Only in Client State

**What people do:** Capture recipient email in React state on the success page, use it once to send the email, never persist it.

**Why it's wrong:** If the email send fails or the user refreshes the page, the recipient email is lost. There is no record that a gift was sent or who received it.

**Do this instead:** Write recipient email to the `songs` row in the database when the user submits the recipient form. This creates a permanent record of gift delivery and enables future "resend gift" functionality.

### Anti-Pattern 5: Using Drizzle to Manage RLS Policies

**What people do:** Try to define Supabase Row Level Security policies inside Drizzle schema files or migrations generated by `drizzle-kit generate`.

**Why it's wrong:** Drizzle's RLS support in `drizzle-orm/pg-core` is designed for user-managed Postgres, not Supabase's `auth.uid()` function which is injected by the Supabase JWT layer. Drizzle-generated RLS policies targeting `auth.uid()` may not compile correctly and can produce confusing migration output.

**Do this instead:** Write RLS SQL policies manually in a separate `.sql` file applied via `drizzle-kit push` or the Supabase SQL editor. Drizzle manages table structure; Supabase Auth manages RLS. Keep them separate.

### Anti-Pattern 6: Putting `middleware.ts` Inside `src/app/`

**What people do:** Create `src/app/middleware.ts` thinking it belongs with other app router files.

**Why it's wrong:** Next.js only looks for `middleware.ts` at the project root or `src/` root. Inside `src/app/` it is silently ignored — no session refresh, no auth, no error.

**Do this instead:** Place `middleware.ts` at `src/middleware.ts` (since the project uses the `src/` directory convention). Confirm it is running by checking the Next.js dev server logs.

---

## Sources

- Supabase Auth SSR for Next.js — official setup guide: https://supabase.com/docs/guides/auth/server-side/nextjs (HIGH confidence — official docs)
- Supabase creating SSR clients — `createBrowserClient` / `createServerClient` patterns: https://supabase.com/docs/guides/auth/server-side/creating-a-client (HIGH confidence — official docs)
- Supabase `auth.getUser()` vs `getSession()` security distinction: https://supabase.com/docs/reference/javascript/auth-getuser (HIGH confidence — official docs)
- Supabase User Management — `auth.users` FK and trigger pattern: https://supabase.com/docs/guides/auth/managing-user-data (HIGH confidence — official docs)
- Drizzle ORM + Supabase auth schema proxy — `pgSchema('auth')` pattern: https://orm.drizzle.team/docs/tutorials/drizzle-with-supabase (MEDIUM confidence — official Drizzle docs, cross-referenced with GitHub discussion #27426)
- Resend + Next.js App Router: https://resend.com/docs/send-with-nextjs (HIGH confidence — official Resend docs)
- Resend official App Router example repo: https://github.com/resend/resend-nextjs-app-router-example (MEDIUM confidence — official example, may lag behind latest patterns)
- Existing codebase: `src/app/api/quiz-generate/route.ts`, `src/app/quiz/success/[jobId]/page.tsx`, `src/db/schema.ts`, `src/db/index.ts`, `src/env.ts`, `src/app/layout.tsx`, `src/components/Header.tsx` — direct inspection (HIGH confidence — ground truth)

---

*Architecture research for: Notevra v4.2 — Supabase Auth + Resend email + song dashboard*
*Researched: 2026-03-06*
