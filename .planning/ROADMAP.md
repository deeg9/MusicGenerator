# Roadmap: Notevra

## Milestones

- ✅ **v1.0 Core Generation** — Phases 1-4 (shipped 2026-03-05)
- ✅ **v1.1 Brand & Visual Redesign** — Phases 5-8 (shipped 2026-03-05)
- ✅ **v2.0 Suno-Style UX Overhaul** — Phases 9-12 (shipped 2026-03-06)
- ✅ **v3.0 Notevra Gift Funnel** — Phases 13-17 (shipped 2026-03-06)
- ✅ **v4.0 Testing & Optimization** — Phases 18-23 (shipped 2026-03-06)
- 🚧 **v4.1 Legal & Info Pages** — Phases 24-27 (in progress)

## Phases

<details>
<summary>✅ v1.0 Core Generation (Phases 1-4) — SHIPPED 2026-03-05</summary>

- [x] Phase 1: Infrastructure Foundation (3/3 plans) — completed 2026-03-04
- [x] Phase 2: Generation API (3/3 plans) — completed 2026-03-05
- [x] Phase 3: Playback and Download (2/2 plans) — completed 2026-03-05
- [x] Phase 4: UX Polish (3/3 plans) — completed 2026-03-05

</details>

<details>
<summary>✅ v1.1 Brand & Visual Redesign (Phases 5-8) — SHIPPED 2026-03-05</summary>

- [x] Phase 5: Token Foundation + Theme Infrastructure (3/3 plans) — completed 2026-03-05
- [x] Phase 6: Component Audit + Core Redesign (3/3 plans) — completed 2026-03-05
- [x] Phase 7: Animation + Typewriter (2/2 plans) — completed 2026-03-05
- [x] Phase 8: Footer + Style Guide Completion (2/2 plans) — completed 2026-03-05

</details>

<details>
<summary>✅ v2.0 Suno-Style UX Overhaul (Phases 9-12) — SHIPPED 2026-03-06</summary>

- [x] Phase 9: Foundation Fixes + Navigation (1/1 plan) — completed 2026-03-05
- [x] Phase 10: Library Data Layer (1/1 plan) — completed 2026-03-05
- [x] Phase 11: Library UI + Persistent Player (3/3 plans) — completed 2026-03-06
- [x] Phase 12: Same-Page Workspace Transformation (3/3 plans) — completed 2026-03-06

</details>

<details>
<summary>✅ v3.0 Notevra Gift Funnel (Phases 13-17) — SHIPPED 2026-03-06</summary>

- [x] Phase 13: Foundation and Visual Identity (2/2 plans) — completed 2026-03-06
- [x] Phase 14: Landing Page (2/2 plans) — completed 2026-03-06
- [x] Phase 15: Quiz Funnel (3/3 plans) — completed 2026-03-06
- [x] Phase 16: Generation Integration (2/2 plans) — completed 2026-03-06
- [x] Phase 17: Success Page (2/2 plans) — completed 2026-03-06

</details>

<details>
<summary>✅ v4.0 Testing & Optimization (Phases 18-23) — SHIPPED 2026-03-06</summary>

- [x] Phase 18: Playwright Setup and Environment (1/1 plan) — completed 2026-03-06
- [x] Phase 19: Error Boundaries and API Hardening (3/3 plans) — completed 2026-03-06
- [x] Phase 20: Page Object Models and Smoke Tests (2/2 plans) — completed 2026-03-06
- [x] Phase 21: Happy Path and Error State E2E (2/2 plans) — completed 2026-03-06
- [x] Phase 22: Mobile Responsiveness (2/2 plans) — completed 2026-03-06
- [x] Phase 23: Performance Audit and Optimization (2/2 plans) — completed 2026-03-06

</details>

### v4.1 Legal & Info Pages (In Progress)

**Milestone Goal:** Add Contact, Privacy Policy, and Terms of Service pages tailored to Notevra as an AI music gift service — covering quiz data collection, audio storage, third-party processors, AI content rights, and DMCA compliance.

- [ ] **Phase 24: Shared Legal Infrastructure** - `.prose-legal` CSS block and `LegalLayout` Server Component that all three pages depend on
- [ ] **Phase 25: Contact Page** - `/contact` route with email display, brand-warm copy, and Footer link validation
- [ ] **Phase 26: Privacy Policy** - `/privacy` route with full CCPA/GDPR/COPPA-compliant content naming quiz data, retention periods, and user rights
- [ ] **Phase 27: Terms of Service** - `/terms` route with AI content license, acceptable use, DMCA designation, disclaimers, and liability terms

## Phase Details

<details>
<summary>✅ v4.0 Phase Details (Phases 18-23) — SHIPPED 2026-03-06</summary>

### Phase 18: Playwright Setup and Environment
**Goal**: The Playwright test harness is installed, configured, and confirmed to reach the live A40 pod — every subsequent phase can run without environment surprises
**Depends on**: Nothing (first phase of milestone)
**Requirements**: INFRA-01, INFRA-02, INFRA-03
**Success Criteria** (what must be TRUE):
  1. `npm run test:e2e` launches Playwright and runs against the local Next.js server without error
  2. A40 pod (96y089egxk3xm5) health check passes in globalSetup — a clear error appears if pod is unreachable
  3. Generation tests are configured with 60s+ timeouts so they do not false-fail under normal conditions
  4. Framer Motion animations are disabled in tests (reducedMotion: reduce) so step transitions do not cause flaky assertions
  5. `npm run test:unit` and `npm run analyze` scripts exist and run
**Plans**: 1 plan
Plans:
- [x] 18-01-PLAN.md — Install Playwright, configure harness, verify A40 pod connectivity

### Phase 19: Error Boundaries and API Hardening
**Goal**: The application handles generation failures gracefully — users see a recovery UI instead of a page crash or an infinite spinner, and API routes return structured errors rather than stack traces
**Depends on**: Phase 18
**Requirements**: ERR-01, ERR-02, ERR-03
**Success Criteria** (what must be TRUE):
  1. Navigating to /quiz or /quiz/success when a client error occurs shows an error boundary with a recovery action, not a blank crash screen
  2. API routes respond with structured JSON (status code + message field) when an error occurs — no stack traces in the response body
  3. When generation polling times out, the success page shows a user-friendly timeout message with a retry option rather than spinning indefinitely
**Plans**: 3 plans
Plans:
- [x] 19-01-PLAN.md — API hardening: production debug stripping, poll-job granular errors, audio + quiz-generate alignment
- [x] 19-02-PLAN.md — Error boundaries at /quiz and /quiz/success routes
- [x] 19-03-PLAN.md — Success page timeout recovery: Check Again, 15s reassurance, error differentiation

### Phase 20: Page Object Models and Smoke Tests
**Goal**: The three Page Object Models are built and the first E2E specs pass — landing page loads correctly, all 6 quiz steps validate input, back/forward navigation preserves state — all without requiring the live generation API
**Depends on**: Phase 18
**Requirements**: INFRA-04, E2E-01, E2E-02, E2E-03, E2E-04
**Success Criteria** (what must be TRUE):
  1. LandingPage, QuizPage, and SuccessPage POM classes exist and wrap all selectors used across specs
  2. Landing page E2E spec passes: hero loads, CTA navigates to /quiz, navigation renders
  3. Quiz validation spec passes: each of the 6 steps rejects invalid input with visible error state and accepts valid input to advance
  4. Back/forward navigation E2E passes: answers entered in earlier steps are still present after navigating forward and back
**Plans**: 2 plans
Plans:
- [x] 20-01-PLAN.md — POMs, fixtures, and landing page smoke spec
- [x] 20-02-PLAN.md — Quiz validation and navigation E2E specs

### Phase 21: Happy Path and Error State E2E
**Goal**: The complete Notevra funnel is verified end-to-end against the live A40 pod — a user can go from landing through the full quiz to a success page with audio, and error conditions (pod offline, failed generation) show recovery UI rather than broken states
**Depends on**: Phase 20
**Requirements**: E2E-05, E2E-06, E2E-07
**Success Criteria** (what must be TRUE):
  1. Happy path E2E passes: completing all 6 quiz steps triggers generation, the success page loads with a playable audio element and download link
  2. When the API returns a generation failure status, the user sees a friendly error message with a retry action — not an infinite spinner
  3. When the pod is offline (502 from /api/quiz-generate), the user sees a graceful error message — not a blank page or unhandled exception
**Plans**: 2 plans
Plans:
- [x] 21-01-PLAN.md — Error state E2E specs (generation failure + pod offline) with page.route() mocks
- [x] 21-02-PLAN.md — Happy path E2E spec with POD_AVAILABLE gate and real A40 pod generation

### Phase 22: Mobile Responsiveness
**Goal**: The full funnel is usable on mobile — landing, quiz, and success pages render correctly at iPhone and iPad viewports with no horizontal overflow, touch targets large enough to tap, and the audio player functional on mobile
**Depends on**: Phase 21
**Requirements**: MOB-01, MOB-02, MOB-03
**Success Criteria** (what must be TRUE):
  1. Landing page renders at iPhone SE and iPad viewports with no horizontal overflow and all CTA buttons tappable
  2. All 6 quiz steps are completable at mobile viewport — inputs are usable, selection cards are tappable (44px minimum touch target), layout does not break
  3. Success page audio player is visible and functional at mobile viewport — play button responds to touch
**Plans**: 2 plans
Plans:
- [x] 22-01-PLAN.md — CSS touch target fixes, test:e2e:mobile script, and mobile landing spec
- [x] 22-02-PLAN.md — Mobile quiz funnel and success page E2E specs

### Phase 23: Performance Audit and Optimization
**Goal**: Bundle size is understood and optimized where warranted, and the landing page passes Core Web Vitals thresholds (LCP < 2.5s, CLS < 0.1) from a production build
**Depends on**: Phase 22
**Requirements**: PERF-01, PERF-02, PERF-03, PERF-04
**Success Criteria** (what must be TRUE):
  1. Bundle analysis report is generated (ANALYZE=true npm run build) and optimization targets are documented
  2. Below-fold landing page sections are lazy loaded — initial bundle does not include components that are not visible on first paint
  3. canvas-confetti is lazy loaded — it is not present in the main bundle for routes other than /quiz/success
  4. Landing page LCP is below 2.5s and CLS is below 0.1 measured from a production build
**Plans**: 2 plans
Plans:
- [x] 23-01-PLAN.md — Bundle analysis, lazy load below-fold sections and canvas-confetti
- [x] 23-02-PLAN.md — Core Web Vitals measurement with Lighthouse CLI

</details>

### Phase 24: Shared Legal Infrastructure
**Goal**: The prose typography CSS and shared LegalLayout component exist and render correctly — every legal page can be built on top of this foundation without structural rework
**Depends on**: Nothing (first phase of milestone)
**Requirements**: INFRA-01 (v4.1), INFRA-02 (v4.1)
**Success Criteria** (what must be TRUE):
  1. A `.prose-legal` CSS block exists in `globals.css` that styles headings, body text, lists, and links using existing OKLCH design tokens
  2. `LegalLayout` renders a page title in Libre Baskerville, a "Last Updated" date, and a prose content slot — visually consistent with Notevra brand
  3. A developer can wrap any page's content in `<LegalLayout>` and receive correct prose styling without additional CSS
**Plans**: TBD

Plans:
- [ ] 24-01: `.prose-legal` CSS block + `LegalLayout` Server Component

### Phase 25: Contact Page
**Goal**: Visitors can find how to reach Notevra — the `/contact` route exists, Footer links resolve, and the page presents contact information in brand-consistent style
**Depends on**: Phase 24
**Requirements**: CONT-01, CONT-02, CONT-03
**Success Criteria** (what must be TRUE):
  1. Visiting `/contact` shows the contact email address (contact@notevra.com) as a working mailto link
  2. The page title and meta description are set correctly for search engines
  3. The page uses Libre Baskerville headings and DM Sans body text with the baby blue palette — visually indistinguishable in style from the rest of Notevra
  4. Footer links to `/contact` resolve without 404
**Plans**: TBD

Plans:
- [ ] 25-01: Contact page route, content, and Footer link validation

### Phase 26: Privacy Policy
**Goal**: Users can read a complete, accurate Privacy Policy that names the personal information Notevra collects (including quiz data), explains retention, identifies third-party processors, and provides CCPA/GDPR/COPPA-compliant user rights — all in plain language
**Depends on**: Phase 24
**Requirements**: PRIV-01, PRIV-02, PRIV-03, PRIV-04, PRIV-05, PRIV-06, PRIV-07, PRIV-08
**Success Criteria** (what must be TRUE):
  1. Visiting `/privacy` shows a complete Privacy Policy with a visible "Last Updated" date and correct SEO metadata
  2. The policy explicitly names quiz data (relationship, occasion, genre, qualities, memories, message) as personal information collected by the service
  3. The policy names all three third-party processors (RunPod, Cloudflare R2, Vercel) and describes what data each receives
  4. The policy states a concrete audio retention period and states that quiz answers are not stored server-side beyond generation
  5. The policy includes a user rights section (access, deletion, opt-out) with a contact mechanism, a children's privacy section (COPPA, 13+), and a policy update clause
**Plans**: TBD

Plans:
- [ ] 26-01: Privacy Policy page with full CCPA/GDPR/COPPA-compliant content

### Phase 27: Terms of Service
**Goal**: Users can read complete Terms of Service that accurately represent their rights to AI-generated songs using license language, define acceptable use, designate a DMCA agent, and include all standard liability protections
**Depends on**: Phase 26
**Requirements**: TOS-01, TOS-02, TOS-03, TOS-04, TOS-05, TOS-06, TOS-07, TOS-08
**Success Criteria** (what must be TRUE):
  1. Visiting `/terms` shows complete Terms of Service with a visible "Last Updated" date and correct SEO metadata
  2. The ToS grants users a license to use, share, and download their song — without claiming the user "owns" the AI-generated work or misrepresenting copyright status
  3. The ToS includes an acceptable use policy prohibiting illegal content, impersonation, and harmful use
  4. The ToS names a DMCA designated agent with contact information for copyright notices
  5. The ToS includes warranty disclaimer, limitation of liability, governing law, and service modification/termination rights sections
**Plans**: TBD

Plans:
- [ ] 27-01: Terms of Service page with AI license language, DMCA designation, and liability terms

## Progress

| Phase | Milestone | Plans | Status | Completed |
|-------|-----------|-------|--------|-----------|
| 1. Infrastructure Foundation | v1.0 | 3/3 | Complete | 2026-03-04 |
| 2. Generation API | v1.0 | 3/3 | Complete | 2026-03-05 |
| 3. Playback and Download | v1.0 | 2/2 | Complete | 2026-03-05 |
| 4. UX Polish | v1.0 | 3/3 | Complete | 2026-03-05 |
| 5. Token Foundation + Theme Infrastructure | v1.1 | 3/3 | Complete | 2026-03-05 |
| 6. Component Audit + Core Redesign | v1.1 | 3/3 | Complete | 2026-03-05 |
| 7. Animation + Typewriter | v1.1 | 2/2 | Complete | 2026-03-05 |
| 8. Footer + Style Guide Completion | v1.1 | 2/2 | Complete | 2026-03-05 |
| 9. Foundation Fixes + Navigation | v2.0 | 1/1 | Complete | 2026-03-05 |
| 10. Library Data Layer | v2.0 | 1/1 | Complete | 2026-03-05 |
| 11. Library UI + Persistent Player | v2.0 | 3/3 | Complete | 2026-03-06 |
| 12. Same-Page Workspace Transformation | v2.0 | 3/3 | Complete | 2026-03-06 |
| 13. Foundation and Visual Identity | v3.0 | 2/2 | Complete | 2026-03-06 |
| 14. Landing Page | v3.0 | 2/2 | Complete | 2026-03-06 |
| 15. Quiz Funnel | v3.0 | 3/3 | Complete | 2026-03-06 |
| 16. Generation Integration | v3.0 | 2/2 | Complete | 2026-03-06 |
| 17. Success Page | v3.0 | 2/2 | Complete | 2026-03-06 |
| 18. Playwright Setup and Environment | v4.0 | 1/1 | Complete | 2026-03-06 |
| 19. Error Boundaries and API Hardening | v4.0 | 3/3 | Complete | 2026-03-06 |
| 20. Page Object Models and Smoke Tests | v4.0 | 2/2 | Complete | 2026-03-06 |
| 21. Happy Path and Error State E2E | v4.0 | 2/2 | Complete | 2026-03-06 |
| 22. Mobile Responsiveness | v4.0 | 2/2 | Complete | 2026-03-06 |
| 23. Performance Audit and Optimization | v4.0 | 2/2 | Complete | 2026-03-06 |
| 24. Shared Legal Infrastructure | v4.1 | 0/TBD | Not started | - |
| 25. Contact Page | v4.1 | 0/TBD | Not started | - |
| 26. Privacy Policy | v4.1 | 0/TBD | Not started | - |
| 27. Terms of Service | v4.1 | 0/TBD | Not started | - |

---
*See `.planning/milestones/` for detailed phase archives*
