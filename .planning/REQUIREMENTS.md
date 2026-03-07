# Requirements: Notevra

**Defined:** 2026-03-06
**Core Value:** Anyone can create a deeply personal, one-of-a-kind song for someone they love — in seconds, no musical skill required.

## v4.2 Requirements

Requirements for Auth & Email Delivery milestone. Each maps to roadmap phases.

### Authentication

- [x] **AUTH-01**: User can sign up with email and password
- [x] **AUTH-02**: User receives email confirmation after sign-up (via Resend SMTP)
- [x] **AUTH-03**: User can log in with email and password
- [x] **AUTH-04**: User can reset password via email link
- [x] **AUTH-05**: User session persists across browser refresh (cookie-based via @supabase/ssr)
- [x] **AUTH-06**: User can sign out
- [x] **AUTH-07**: Auth callback route handles email confirmation and password reset tokens
- [x] **AUTH-08**: Auth error page shows graceful message for expired/invalid links
- [x] **AUTH-09**: Header nav shows auth state (Sign up/Login when anonymous, My Songs when authenticated)

### Song Persistence

- [ ] **SONG-01**: Songs table exists in Supabase with RLS policies (user can only access own songs)
- [ ] **SONG-02**: Generated songs are saved to database with user_id (if authenticated) or session_token (if anonymous)
- [ ] **SONG-03**: Quiz context stored on song record (recipient name, relationship, message, genre)
- [ ] **SONG-04**: Anonymous songs are claimed by user account on sign-up via session_token match

### Email Delivery

- [ ] **EMAIL-01**: Resend configured as Supabase SMTP provider for auth emails
- [ ] **EMAIL-02**: Creator receives song-ready email with listen/download link after generation
- [ ] **EMAIL-03**: Recipient receives branded gift delivery email with song context and listen link
- [ ] **EMAIL-04**: Email templates use Notevra brand styling (baby blue, Libre Baskerville, warm tone)

### Dashboard

- [ ] **DASH-01**: Authenticated users can access /dashboard (redirects to login if unauthenticated)
- [ ] **DASH-02**: Dashboard lists all user's past songs with recipient name, relationship, genre, and date
- [ ] **DASH-03**: User can play songs in dashboard via native audio player with R2 presigned URLs
- [ ] **DASH-04**: User can re-download songs from dashboard

### Success Page

- [ ] **SUCC-01**: Non-blocking auth upsell appears on success page after generation ("Sign up to save your song")
- [ ] **SUCC-02**: User can enter recipient email on success page to send gift delivery email
- [ ] **SUCC-03**: Recipient email field includes privacy framing ("Private link — no marketing, ever")

## v4.1 Requirements (Deferred)

Deferred legal pages — not started, skipped in favor of v4.2.

### Contact Page

- [ ] **CONT-01**: User can view contact email address (contact@notevra.com) with mailto link
- [ ] **CONT-02**: Contact page has proper SEO metadata (title, description)
- [ ] **CONT-03**: Contact page uses consistent brand styling

### Privacy Policy

- [ ] **PRIV-01**: Privacy Policy lists all data collected
- [ ] **PRIV-02**: Privacy Policy explains how data is used
- [ ] **PRIV-03**: Privacy Policy names third-party processors
- [ ] **PRIV-04**: Privacy Policy states data retention policy
- [ ] **PRIV-05**: Privacy Policy includes CCPA/GDPR user rights section
- [ ] **PRIV-06**: Privacy Policy includes children's privacy section (COPPA)
- [ ] **PRIV-07**: Privacy Policy includes policy update notification clause
- [ ] **PRIV-08**: Privacy Policy has proper SEO metadata and "Last Updated" date

### Terms of Service

- [ ] **TOS-01**: ToS defines AI-generated content rights using license language
- [ ] **TOS-02**: ToS includes acceptable use policy
- [ ] **TOS-03**: ToS includes DMCA/copyright section
- [ ] **TOS-04**: ToS includes disclaimers
- [ ] **TOS-05**: ToS includes limitation of liability clause
- [ ] **TOS-06**: ToS includes governing law and dispute resolution clause
- [ ] **TOS-07**: ToS includes service modification/termination rights
- [ ] **TOS-08**: ToS has proper SEO metadata and "Last Updated" date

## v4.0 Requirements (Complete)

### Infrastructure

- [x] **INFRA-01**: Update HEARTMULA_URL to A40 pod and verify connectivity
- [x] **INFRA-02**: Install and configure Playwright with Next.js webServer
- [x] **INFRA-03**: Configure test timeouts (60s+ for generation tests)
- [x] **INFRA-04**: Set up Page Object Models for landing, quiz, and success pages

### E2E Testing

- [x] **E2E-01**: Landing page loads with hero, CTA buttons, navigation
- [x] **E2E-02**: Quiz funnel completes all 6 steps with valid input
- [x] **E2E-03**: Quiz validation rejects invalid input at each step
- [x] **E2E-04**: Quiz back/forward navigation preserves state
- [x] **E2E-05**: Full happy path: quiz completion → generation → success page with audio
- [x] **E2E-06**: Error state: generation failure shows user-friendly error
- [x] **E2E-07**: Error state: pod offline handled gracefully

### Error Handling

- [x] **ERR-01**: Add error.tsx boundaries at /quiz and /quiz/success routes
- [x] **ERR-02**: API route errors return structured JSON (not stack traces)
- [x] **ERR-03**: Network timeout during generation shows recovery UI

### Mobile

- [x] **MOB-01**: Landing page renders correctly at iPhone and iPad viewports
- [x] **MOB-02**: Quiz funnel is usable at mobile viewport (touch targets, layout)
- [x] **MOB-03**: Success page audio player works at mobile viewport

### Performance

- [x] **PERF-01**: Run bundle analysis and identify optimization targets
- [x] **PERF-02**: Lazy load below-fold landing page sections
- [x] **PERF-03**: Lazy load canvas-confetti (only needed on success page)
- [x] **PERF-04**: Core Web Vitals pass LCP < 2.5s, CLS < 0.1 on landing page

## Future Requirements

### Monetization

- **PAY-01**: Payment/checkout via Stripe

### Analytics

- **ANLYT-01**: Analytics/conversion tracking
- **ADMIN-01**: Admin dashboard for order management

### Legal Compliance

- **LEGAL-01**: DMCA agent registration with US Copyright Office ($6 filing)
- **LEGAL-02**: Cookie consent banner (when analytics/ad networks are added)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Social login (Google/GitHub OAuth) | Email+password sufficient for gift service; OAuth adds account-linking complexity |
| Mandatory auth before generation | Kills quiz funnel conversion — auth must come after generation |
| Hard email verification gate | Users should see dashboard immediately; soft banner for unconfirmed |
| Passwordless / magic link only | Breaks immediate "save my song" momentum with inbox-checking wait |
| Public song sharing URLs | Requires permanent R2 storage, URL management — gift email is the sharing mechanism |
| In-dashboard song regeneration | User can start a new quiz instead; avoids scope creep |
| Batch email to multiple recipients | One song, one gift, one email — singularity is the brand |
| Dark mode | Warm light aesthetic is the brand direction |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 28 | Complete |
| AUTH-02 | Phase 28 | Complete |
| AUTH-03 | Phase 28 | Complete |
| AUTH-04 | Phase 28 | Complete |
| AUTH-05 | Phase 28 | Complete |
| AUTH-06 | Phase 28 | Complete |
| AUTH-07 | Phase 28 | Complete |
| AUTH-08 | Phase 28 | Complete |
| AUTH-09 | Phase 28 | Complete |
| SONG-01 | Phase 29 | Pending |
| SONG-02 | Phase 29 | Pending |
| SONG-03 | Phase 29 | Pending |
| SONG-04 | Phase 29 | Pending |
| EMAIL-01 | Phase 30 | Pending |
| EMAIL-02 | Phase 30 | Pending |
| EMAIL-03 | Phase 30 | Pending |
| EMAIL-04 | Phase 30 | Pending |
| DASH-01 | Phase 31 | Pending |
| DASH-02 | Phase 31 | Pending |
| DASH-03 | Phase 31 | Pending |
| DASH-04 | Phase 31 | Pending |
| SUCC-01 | Phase 31 | Pending |
| SUCC-02 | Phase 31 | Pending |
| SUCC-03 | Phase 31 | Pending |

**Coverage:**
- v4.2 requirements: 24 total
- Mapped to phases: 24
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-06*
*Last updated: 2026-03-06 after v4.2 roadmap creation*
