# Requirements: Notevra

**Defined:** 2026-03-06
**Core Value:** Anyone can create a deeply personal, one-of-a-kind song for someone they love — in seconds, no musical skill required.

## v4.1 Requirements

Requirements for Legal & Info Pages milestone. Each maps to roadmap phases.

### Contact Page

- [ ] **CONT-01**: User can view contact email address (contact@notevra.com) with mailto link
- [ ] **CONT-02**: Contact page has proper SEO metadata (title, description)
- [ ] **CONT-03**: Contact page uses consistent brand styling (Libre Baskerville headings, DM Sans body, baby blue palette)

### Privacy Policy

- [ ] **PRIV-01**: Privacy Policy lists all data collected (quiz answers: relationship, occasion, genre, qualities, memories, message; generated audio; server logs)
- [ ] **PRIV-02**: Privacy Policy explains how data is used (song generation, service improvement)
- [ ] **PRIV-03**: Privacy Policy names third-party processors (RunPod, Cloudflare R2, Vercel)
- [ ] **PRIV-04**: Privacy Policy states data retention policy (indefinite for audio, session-based for quiz data in localStorage)
- [ ] **PRIV-05**: Privacy Policy includes CCPA/GDPR user rights section (access, deletion, opt-out)
- [ ] **PRIV-06**: Privacy Policy includes children's privacy section (COPPA — service not intended for under 13)
- [ ] **PRIV-07**: Privacy Policy includes policy update notification clause
- [ ] **PRIV-08**: Privacy Policy has proper SEO metadata and "Last Updated" date displayed

### Terms of Service

- [ ] **TOS-01**: ToS defines AI-generated content rights using license language (not ownership)
- [ ] **TOS-02**: ToS includes acceptable use policy (no illegal content, no impersonation, no harmful use)
- [ ] **TOS-03**: ToS includes DMCA/copyright section with designated agent contact
- [ ] **TOS-04**: ToS includes disclaimers (no warranty, AI output not guaranteed unique)
- [ ] **TOS-05**: ToS includes limitation of liability clause
- [ ] **TOS-06**: ToS includes governing law and dispute resolution clause
- [ ] **TOS-07**: ToS includes service modification/termination rights
- [ ] **TOS-08**: ToS has proper SEO metadata and "Last Updated" date displayed

### Shared Infrastructure

- [ ] **INFRA-01**: Shared LegalLayout component for consistent page structure across all three pages
- [ ] **INFRA-02**: Legal prose typography styles applied via Tailwind (using existing OKLCH tokens)

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
- **AUTH-01**: User authentication (Supabase Auth)
- **EMAIL-01**: Email delivery system (order confirmation + song link)

### Analytics

- **ANLYT-01**: Analytics/conversion tracking
- **ADMIN-01**: Admin dashboard for order management

### Email Integration

- **EMAIL-02**: Contact form with name, email, message fields
- **EMAIL-03**: Form submissions sent via Resend or similar service

### Legal Compliance

- **LEGAL-01**: DMCA agent registration with US Copyright Office ($6 filing)
- **LEGAL-02**: Cookie consent banner (when analytics/ad networks are added)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Contact form | No email sending infrastructure yet — defer to post-payment milestone |
| Cookie consent banner | No cookies used (localStorage only), no analytics — unnecessary friction |
| Social media links | No accounts exist yet |
| MDX for legal content | TSX pages with Tailwind typography are simpler and sufficient |
| Legal review by attorney | Content will be well-researched but not attorney-reviewed |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| INFRA-01 (v4.1) | Phase 24 | Pending |
| INFRA-02 (v4.1) | Phase 24 | Pending |
| CONT-01 | Phase 25 | Pending |
| CONT-02 | Phase 25 | Pending |
| CONT-03 | Phase 25 | Pending |
| PRIV-01 | Phase 26 | Pending |
| PRIV-02 | Phase 26 | Pending |
| PRIV-03 | Phase 26 | Pending |
| PRIV-04 | Phase 26 | Pending |
| PRIV-05 | Phase 26 | Pending |
| PRIV-06 | Phase 26 | Pending |
| PRIV-07 | Phase 26 | Pending |
| PRIV-08 | Phase 26 | Pending |
| TOS-01 | Phase 27 | Pending |
| TOS-02 | Phase 27 | Pending |
| TOS-03 | Phase 27 | Pending |
| TOS-04 | Phase 27 | Pending |
| TOS-05 | Phase 27 | Pending |
| TOS-06 | Phase 27 | Pending |
| TOS-07 | Phase 27 | Pending |
| TOS-08 | Phase 27 | Pending |

**Coverage:**
- v4.1 requirements: 18 total
- Mapped to phases: 18
- Unmapped: 0

---
*Requirements defined: 2026-03-06*
*Last updated: 2026-03-06 after v4.1 roadmap creation*
