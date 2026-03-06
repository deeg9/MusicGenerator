# Requirements: Notevra

**Defined:** 2026-03-06
**Core Value:** Anyone can create a deeply personal, one-of-a-kind song for someone they love — in seconds.

## v4.0 Requirements

Requirements for testing & optimization milestone. Each maps to roadmap phases.

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

Deferred to next milestone. Tracked but not in current roadmap.

### Monetization

- **PAY-01**: Payment/checkout via Stripe
- **AUTH-01**: User authentication (Supabase Auth)
- **EMAIL-01**: Email delivery system (order confirmation + song link)

### Analytics

- **ANLYT-01**: Analytics/conversion tracking
- **ADMIN-01**: Admin dashboard for order management

### Test Expansion

- **TEST-01**: Accessibility audit with axe-core
- **TEST-02**: CI/CD integration for automated test runs
- **TEST-03**: Visual regression testing

## Out of Scope

| Feature | Reason |
|---------|--------|
| Unit test rewrite | Existing vitest unit tests are sufficient; focus on E2E |
| CI/CD pipeline | Manual testing for v4.0; automate in future milestone |
| Load/stress testing | Not needed at current scale |
| Visual regression testing | Adds complexity; defer to future |
| Cross-browser testing beyond Chromium + Mobile Safari | Two browsers cover 90%+ of users |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| INFRA-01 | Phase 18 | Complete |
| INFRA-02 | Phase 18 | Complete |
| INFRA-03 | Phase 18 | Complete |
| INFRA-04 | Phase 20 | Complete |
| E2E-01 | Phase 20 | Complete |
| E2E-02 | Phase 20 | Complete |
| E2E-03 | Phase 20 | Complete |
| E2E-04 | Phase 20 | Complete |
| E2E-05 | Phase 21 | Complete |
| E2E-06 | Phase 21 | Complete |
| E2E-07 | Phase 21 | Complete |
| ERR-01 | Phase 19 | Complete |
| ERR-02 | Phase 19 | Complete |
| ERR-03 | Phase 19 | Complete |
| MOB-01 | Phase 22 | Complete |
| MOB-02 | Phase 22 | Complete |
| MOB-03 | Phase 22 | Complete |
| PERF-01 | Phase 23 | Complete |
| PERF-02 | Phase 23 | Complete |
| PERF-03 | Phase 23 | Complete |
| PERF-04 | Phase 23 | Complete |

**Coverage:**
- v4.0 requirements: 21 total
- Mapped to phases: 21
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-06*
*Last updated: 2026-03-06 after roadmap creation (phases 18-23)*
