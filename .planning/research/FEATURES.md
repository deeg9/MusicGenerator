# Feature Research

**Domain:** Testing & Optimization — Next.js gift funnel (E2E, performance, error handling, mobile)
**Researched:** 2026-03-06
**Confidence:** HIGH (Playwright + Next.js official docs verified; RunPod retry patterns MEDIUM)

---

## Scope Note

This file covers the **v4.0 Testing & Optimization milestone** feature landscape. v3.0 shipped the complete Notevra gift funnel (landing page, 6-step quiz, generation, success page). v4.0 adds no new user-facing features — it validates, hardens, and optimizes the existing funnel for production readiness.

The question being answered: what testing and optimization work is table stakes vs. differentiating, what is scope creep, and in what order should it be done?

---

## What Is Already Built (Do Not Rebuild)

| Component | Status | Relevance to v4.0 |
|-----------|--------|-------------------|
| Emotional landing page | BUILT | Needs CWV audit (LCP, INP, CLS) + mobile test |
| 6-step quiz funnel with Zod validation | BUILT | Needs E2E test per step + validation regression tests |
| Quiz-to-HeartMuLa prompt conversion | BUILT | Needs unit test for pure function |
| Instant generation (POST /api/quiz-generate) | BUILT | Needs E2E happy-path + error path testing |
| Poll loop (GET /api/poll-job) | BUILT | Needs resilience testing (flaky network, FAILED status) |
| Success page (confetti + audio + download) | BUILT | Needs E2E assertion: confetti fired, audio src set, download link present |
| Error classification library (`/lib/errors.ts`) | BUILT | Needs error boundary (error.tsx) to surface errors in UI |
| Native audio player (SongPlayer) | BUILT | Needs mobile audio playback test |
| A40 pod migration | PENDING | Must verify connectivity before any E2E can pass |

---

## Feature Landscape

### Table Stakes (Users Expect These)

Work that any production-quality testing/optimization milestone must deliver. Missing these means the milestone fails its stated goal.

| Feature | Why Expected | Complexity | Dependencies on Existing |
|---------|--------------|------------|--------------------------|
| **Full happy-path E2E test** — landing → all 6 quiz steps → generation → success page | This is the entire product flow; if it does not work end-to-end under Playwright, nothing else matters | MEDIUM | Requires A40 pod to be online and URL configured in env; hits the real API |
| **A40 pod connectivity verification** | The pod migration (RTX 4090 → A40, ID 96y089egxk3xm5) is unvalidated; all generation tests will silently fail against a dead endpoint | LOW | New .env variable; single connectivity smoke test |
| **Generation API error handling** — pod offline, FAILED status, polling timeout | RunPod pods can stop; users must see a retry UI, not a blank screen or infinite spinner | HIGH | Requires error.tsx boundaries to exist before error path tests make sense |
| **Error boundaries (error.tsx)** — at /quiz and /quiz/success route levels | Next.js App Router does not provide default error boundaries for route segments; without error.tsx, unhandled client errors crash the full page | MEDIUM | New files only; no existing code changes |
| **Per-step quiz validation tests** — all 6 Zod schemas enforce correctly | Each step has co-located validation; empty submits, under-length inputs, and missing selections must all show the correct error state | MEDIUM | Tests depend on existing step components and schemas |
| **Mobile viewport tests** — iPhone 15 Pro and Pixel 8 at minimum | Gift funnel users skew mobile; competitor Songfinch reports majority mobile traffic; unresponsive UI at 375px = no conversion | MEDIUM | Playwright `devices` emulation; same test flows reused at mobile viewport |
| **Core Web Vitals audit** — LCP, INP, CLS measured on landing page and quiz | LCP >2.5s is a Google ranking penalty; INP >200ms fails 43% of sites in 2026; CLS on quiz card transitions is a real risk with Framer Motion | MEDIUM | Lighthouse CLI or PageSpeed Insights; `next/image priority` fix likely needed for hero |

### Differentiators (Beyond Baseline Testing)

Work that elevates confidence beyond a basic test pass and leaves the codebase in better shape.

| Feature | Value Proposition | Complexity | Dependencies on Existing |
|---------|-------------------|------------|--------------------------|
| **Polling resilience test** — simulate 2-3 failed poll responses before eventual success | Generation hangs and network blips are the #1 user-visible failure mode for an async generation product; proving recovery works is more valuable than testing the happy path twice | HIGH | Playwright `route()` interception to mock /api/poll-job responses; existing GeneratingOverlay needs to handle intermediate failures gracefully |
| **Page Object Model (POM) architecture** — QuizPage, LandingPage, SuccessPage classes | 6-step quiz has unique selectors per step; without POM, selector changes break every test file individually; a POM makes the suite maintainable as the product evolves | MEDIUM | Playwright fixtures; creates `tests/pages/` directory with encapsulated locators |
| **Unit test for quiz-to-prompt conversion** — `quizToPrompt()` pure function | This function determines song quality; it is a pure TypeScript function with no dependencies — unit testing it is high value at low cost; covers edge cases (empty qualities, single-word memories) | LOW | Vitest or Jest; no mocking needed; pure input/output function |
| **localStorage quiz persistence test** — fill steps 1-3, reload, confirm state restored | The `notevra_quiz_v1` key is already implemented; testing it prevents regression on a feature that directly affects abandonment rate (users who accidentally refresh) | LOW | Playwright `page.reload()` with state assertions |
| **Reduced-motion accessibility test** — verify quiz slide animations disable under `prefers-reduced-motion: reduce` | `useReducedMotion` hook already exists in the codebase; test that it actually suppresses the Framer Motion `AnimatePresence` transitions; costs almost nothing to add | LOW | `page.emulateMedia({ reducedMotion: 'reduce' })` |
| **Smoke test tag set (@smoke)** — 5-6 critical tests tagged for CI use | Subset of tests that run in under 2 minutes; can be wired to a pre-deploy CI check without running the full suite (which includes live API calls) | LOW | Playwright `--grep @smoke` filter; tag applied to existing tests |
| **Bundle size analysis** — one-time audit with @next/bundle-analyzer | Framer Motion, lucide-react, and wavesurfer.js are all potential bundle weight contributors; a single audit identifies if lazy loading is needed before the CWV work starts | LOW | `@next/bundle-analyzer`; one-time script in package.json; not CI enforcement |

### Anti-Features (Commonly Requested, Often Problematic)

Work that seems like good testing practice but creates scope creep or more problems than it solves for this milestone.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **Unit tests for all quiz step components** | "Thorough coverage" | Quiz step components are primarily form UI wired to Zod schemas; unit tests here mock the validation and DOM behavior that E2E already covers end-to-end; adds maintenance burden without catching integration failures | Unit test only `quizToPrompt()` (pure function); let Playwright cover the form UI |
| **Visual regression screenshot comparison** | Catches accidental style changes | Screenshot diffs are flaky across CI environments (font rendering, anti-aliasing, pixel density differences); establishing and maintaining a baseline adds overhead; false positives block deploys | Manual visual audit during development + Playwright mobile viewport tests catch real breakage; defer visual regression to a milestone with a stable design system |
| **Mock all RunPod calls in E2E tests** | "Tests should be deterministic; no real API calls" | Mocking the entire generation pipeline means you never verify the A40 pod migration worked; the most critical unknown for this milestone is live pod connectivity | Keep one live integration test (happy path); mock only the error paths (pod offline, FAILED status) using route interception |
| **Lighthouse CI score gates (blocking)** | "Enforce performance budgets" | Score gates block deploys and require weeks of threshold tuning after optimizations are made; premature before a baseline is even established | Run Lighthouse as an audit only in this milestone; document baseline scores; add score gates in v5.0 after optimization work stabilizes |
| **Full accessibility audit (axe-core integration)** | "Compliance and inclusivity" | A full a11y audit is its own milestone with its own remediation backlog; bolting it onto a testing/performance milestone dilutes focus and generates a large issue list with no time to fix it | Fix specific a11y issues discovered during mobile viewport testing (focus rings, tap target sizes); defer systematic axe-core audit |
| **Load / stress testing** | "What happens under traffic?" | No auth, no payments, no real user traffic yet; RunPod A40 has fixed pod capacity that load testing cannot change; premature before monetization creates real concurrent users | Defer to post-monetization; when Stripe goes live, measure actual concurrency needs |
| **Vitest component unit tests for landing page sections** | "Test everything" | Landing page sections are mostly static content (hero text, testimonial cards, "how it works" steps); Playwright already asserts they render and scroll correctly in the E2E suite; duplicating with unit tests adds cost, not confidence | E2E assertions for "hero headline visible, CTA button renders" covers what matters for a static content section |

---

## Feature Dependencies

```
[Full Happy-Path E2E Test]
    └──requires──> [A40 Pod Connectivity Verification]
                       └──requires──> [NEXT_PUBLIC_RUNPOD_URL updated in .env]

[Generation API Error Handling]
    └──requires──> [Error Boundary (error.tsx at /quiz and /quiz/success)]
    └──enhanced-by──> [Polling Resilience Test]

[Per-Step Quiz Validation Tests]
    └──enhanced-by──> [Page Object Model Architecture]
                          └──enables──> [Mobile Viewport Tests reuse same POM]

[Core Web Vitals Audit]
    └──enhanced-by──> [Bundle Size Analysis]
                          └──informs──> [Which components need lazy loading]

[Smoke Test Tags]
    └──requires──> [Full Happy-Path E2E Test exists]
    └──requires──> [Per-Step Quiz Validation Tests exist]

[localStorage Quiz Persistence Test]
    └──depends-on──> [existing notevra_quiz_v1 implementation — already built]

[Reduced-Motion Accessibility Test]
    └──depends-on──> [existing useReducedMotion hook — already built]

[Unit Test: quizToPrompt()]
    └──depends-on──> [existing /lib/quiz-prompt.ts — already built]
    └──standalone──> No browser or API dependencies
```

### Dependency Notes

- **Pod verification must happen first.** The full E2E happy path hits the real RunPod API. If the A40 pod URL is wrong or the pod is stopped, every generation-related test will fail with a misleading error (network timeout vs. assertion failure). Verifying pod connectivity before writing E2E tests saves significant debugging time.
- **Error boundaries are a prerequisite for error handling tests.** Playwright can only assert a graceful error UI if the error.tsx files exist. Testing error paths before boundaries are in place just verifies the app crashes, which is not useful coverage.
- **POM enables mobile test reuse.** The 6-step quiz has unique selectors per step. Building the POM before writing mobile viewport tests means the same Page Objects are exercised at both desktop and mobile viewports — no code duplication.
- **Bundle analysis informs CWV optimization order.** If bundle analysis reveals framer-motion is 140KB of the JS bundle, that tells you where to spend CWV optimization effort (lazy loading the quiz page) vs. image optimization on the landing page. Do the analysis before deciding which CWV fixes to make.

---

## Test Category Breakdown

The expected test categories for a gift funnel E2E suite and what each covers:

| Category | What It Tests | Playwright Approach | Live API? |
|----------|--------------|---------------------|-----------|
| Navigation / routing | Landing CTA navigates to /quiz; success page route resolves; back button returns from quiz | `goto`, `waitForURL`, `click` | No |
| Form validation | Each of 6 quiz steps: empty submit shows error messages, valid input enables Continue, invalid input blocked | `fill`, `click`, `expect(locator).toBeVisible()` | No |
| Generation happy path | POST /api/quiz-generate → poll /api/poll-job → redirect to /quiz/success/[jobId] | `waitForResponse`, `waitForURL` with 45s timeout | YES — real A40 |
| Success page assertions | Confetti canvas appended to DOM; native audio `src` attribute set to R2 URL; download link href valid | `waitForSelector`, `evaluate(() => document.querySelector('audio').src)` | No (uses result from happy path) |
| Error states | Pod offline (mock 503) → retry UI shown; FAILED status (mock) → error message shown; polling timeout → fallback shown | `route()` interception; mock API responses | No (mocked) |
| Mobile responsiveness | Same navigation + quiz flows at iPhone 15 Pro and Pixel 8 viewports; no horizontal scroll; buttons tappable (48px min) | `use: devices['iPhone 15 Pro']` in playwright.config | No |
| Accessibility | Reduced-motion preference suppresses quiz slide transitions; keyboard navigation works through quiz steps | `page.emulateMedia({ reducedMotion: 'reduce' })` | No |
| State persistence | Fill quiz steps 1-3; reload page; confirm quiz state restored from localStorage | `page.reload()` + field value assertions | No |

---

## MVP Definition

### This Milestone Is (Ship These)

Minimum work to declare the v4.0 milestone complete. Every item directly validates or hardens the existing funnel.

- [ ] **A40 pod connectivity verification** — unblocks everything else
- [ ] **Error boundaries (error.tsx)** — /quiz and /quiz/success segments; prerequisite for error testing
- [ ] **Full happy-path E2E test** — landing → 6-step quiz → generation → success page; the product's complete flow
- [ ] **Generation API error handling** — pod offline (503), FAILED status, polling timeout; each shows a retry UI
- [ ] **Per-step quiz validation E2E** — all 6 Zod schemas enforce correctly; empty submit shows errors
- [ ] **Mobile viewport tests** — iPhone 15 Pro and Pixel 8; no overflow, buttons tappable, inputs usable
- [ ] **Core Web Vitals audit** — Lighthouse on landing page and quiz; document LCP, INP, CLS baseline scores; fix any P1 issues found (likely: hero image missing `priority`, layout shift on quiz card mount)

### Add Within This Milestone (After Core Tests Pass)

- [ ] **Polling resilience test** — add after happy-path is green; simulates network blips during generation polling
- [ ] **POM architecture** — refactor selectors into Page Object classes once test count exceeds ~10
- [ ] **Unit test: quizToPrompt()** — pure function; add to Vitest; covers edge case inputs
- [ ] **Bundle size analysis** — run @next/bundle-analyzer; document findings; inform lazy loading decisions
- [ ] **localStorage persistence test** — low-risk regression test for quiz state on page reload
- [ ] **Smoke test tags (@smoke)** — tag 5-6 critical tests; documents the "quick confidence check" subset

### Future Consideration (v5.0+)

- [ ] **Lighthouse CI score gates** — enforce performance budgets after optimization work stabilizes
- [ ] **Full accessibility audit** (axe-core) — own milestone; systematic remediation backlog
- [ ] **Load / stress testing** — post-monetization, when real concurrent traffic exists
- [ ] **Visual regression** — after design system stabilizes; requires baseline management strategy
- [ ] **Analytics/conversion tracking** — funnel drop-off per step; A/B testing quiz copy

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| A40 pod connectivity verification | HIGH | LOW | P1 |
| Error boundaries (error.tsx) | HIGH | LOW | P1 |
| Full happy-path E2E test | HIGH | MEDIUM | P1 |
| Generation API error handling | HIGH | HIGH | P1 |
| Per-step quiz validation tests | HIGH | MEDIUM | P1 |
| Mobile viewport tests | HIGH | MEDIUM | P1 |
| Core Web Vitals audit + P1 fixes | MEDIUM | MEDIUM | P1 |
| Polling resilience test | HIGH | HIGH | P2 |
| POM architecture | MEDIUM | MEDIUM | P2 |
| Unit test: quizToPrompt() | MEDIUM | LOW | P2 |
| Bundle size analysis | MEDIUM | LOW | P2 |
| localStorage persistence test | LOW | LOW | P2 |
| Smoke test tags | MEDIUM | LOW | P2 |
| Lighthouse CI score gates | LOW | MEDIUM | P3 |
| Full a11y audit | MEDIUM | HIGH | P3 |
| Load testing | LOW | HIGH | P3 |
| Visual regression | LOW | HIGH | P3 |

**Priority key:**
- P1: Must have — directly validates or hardens the gift funnel for production
- P2: Should have — improves suite quality and maintainability; add within this milestone after P1s pass
- P3: Defer — future milestone; premature before product-market fit or revenue

---

## Sources

- [Next.js Playwright testing guide (official)](https://nextjs.org/docs/app/guides/testing/playwright) — HIGH confidence
- [Next.js error handling docs (official)](https://nextjs.org/docs/app/getting-started/error-handling) — HIGH confidence
- [Core Web Vitals 2026 targets and INP guidance](https://www.digitalapplied.com/blog/core-web-vitals-2026-inp-lcp-cls-optimization-guide) — MEDIUM confidence
- [Playwright mobile automation guide (BrowserStack)](https://www.browserstack.com/guide/playwright-mobile-automation) — HIGH confidence
- [RunPod error handling documentation](https://docs.runpod.io/serverless/workers/handlers/handler-error-handling) — MEDIUM confidence (serverless docs; persistent pod behavior differs)
- [Next.js bundle analyzer patterns](https://foundations.significa.co/guides/performance-tracking) — MEDIUM confidence
- [Playwright checkout flow testing patterns (Checkly)](https://www.checklyhq.com/docs/learn/playwright/checkout-testing-guide/) — HIGH confidence
- Codebase inspection: `/src/app/api/quiz-generate/route.ts`, `/src/app/quiz/page.tsx`, `/src/app/quiz/_components/` — HIGH confidence

---
*Feature research for: Notevra v4.0 Testing & Optimization milestone*
*Researched: 2026-03-06*
