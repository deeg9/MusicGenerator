# Phase 28: Auth Infrastructure - Context

**Gathered:** 2026-03-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can create accounts, log in, reset passwords, and have sessions persist across browser refreshes. The @supabase/ssr package handles cookie-based sessions, middleware runs on protected routes only, and the quiz funnel remains entirely public and anonymous. This phase delivers auth UI pages, middleware, callback handler, error page, and header auth state — no song persistence or email delivery (those are Phase 29 and 30).

</domain>

<decisions>
## Implementation Decisions

### Auth page structure
- Dedicated full pages: /login, /signup, /forgot-password, /update-password as separate routes
- Not modals, not tabbed — each flow gets its own page and URL
- Pages include standard Header and Footer (full page chrome)
- Centered card form layout on cloud white background — form is the focus
- Full Notevra brand styling: baby blue primary buttons, Libre Baskerville headings, warm mellow yellow accents

### Auth flow behavior
- Context-dependent redirects using return_url parameter: from success page → back to success page; from header → to /dashboard
- Error display: field-level inline validation (red text below field) for client-side, banner above form for server-side errors ("email taken", "invalid credentials")
- Sign-up and login pages cross-link with contextual text: "Don't have an account? Sign up" / "Already have an account? Log in"

### Password reset flow
- Claude's Discretion: whether to show success on same page or redirect to /forgot-password/sent
- Subtle hint text on the confirmation screen: "Open the link on this device for it to work" (PKCE constraint)
- Update-password page at /update-password handles the token from the reset email

### Header auth integration
- Anonymous visitors: add "Sign Up" and "Log In" as separate text links in the header nav area
- Authenticated users: user initial in a circle (avatar-style, matching the Notevra "N" logo pattern) with dropdown containing "My Songs" and "Sign Out"
- "Create Your Song" CTA stays visible for ALL users — auth links are separate
- Mobile: auth links appear inside the hamburger menu drawer below existing nav items

### Password & validation UX
- Minimum 8 characters, no complexity requirements (no uppercase/number rules)
- No password strength indicator — keep the form simple
- Single email field on sign-up (no "confirm email" second field)
- Warm, friendly error messages: "Hmm, that email's already taken. Try logging in instead?" — matches the gift service personality

### Carried from prior research
- Use @supabase/ssr only — auth-helpers-nextjs is deprecated
- Use getUser() in all server code — getSession() can be spoofed
- Middleware matcher excludes static assets to avoid 400 errors
- Only protect /dashboard in middleware — quiz funnel stays public
- Email confirmation disabled for v4.2 — document re-enable procedure

</decisions>

<specifics>
## Specific Ideas

- User initial avatar should mirror the Notevra "N" logo circle style (rounded-full, bg-primary, text-primary-foreground) for visual consistency
- Auth error messages should have personality, not generic — the gift service is warm and friendly
- Password reset PKCE warning should be subtle, not alarming — just helpful context

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- Header.tsx: Client component with mobile hamburger menu — auth state integrates here, need to pass user prop or use Supabase client
- Notevra "N" logo circle pattern: `rounded-full bg-primary text-primary-foreground shadow-md` — reuse for user avatar initial
- Zod: Already installed, use for client-side form validation on auth forms
- lucide-react: Already installed, use for form icons (eye toggle for password, mail icon, etc.)

### Established Patterns
- OKLCH design tokens in globals.css — auth pages use these, no custom colors
- DM Sans body + Libre Baskerville headings — auth page typography follows this
- Framer Motion installed — can use for subtle form transitions if desired
- Layout pattern: layout.tsx wraps all pages with Header + Footer — auth pages inherit this automatically

### Integration Points
- layout.tsx: May need to wrap children in a provider or pass auth context
- middleware.ts: New file at project root, matcher for /dashboard only
- .env.local: Needs NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY added
- next.config.ts: No changes expected for auth
- /quiz routes: Must NOT be affected by middleware — quiz stays public

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 28-auth-infrastructure*
*Context gathered: 2026-03-06*
