# Project Research Summary

**Project:** Notevra v4.0 — Testing & Optimization
**Domain:** E2E testing, API verification, performance auditing, mobile responsiveness — Next.js App Router gift funnel
**Researched:** 2026-03-06
**Confidence:** HIGH

## Executive Summary

Notevra v4.0 is a hardening and validation milestone for a shipped gift song funnel — not a feature-building milestone. The v3.0 product (landing page → 6-step quiz → AI generation via HeartMuLa/RunPod → success page with audio delivery) is functionally complete. v4.0's job is to prove that it works reliably under real conditions: correct quiz validation, stable generation polling, mobile usability, production-quality Core Web Vitals, and an error UI that guides users when generation fails. This is a common milestone pattern for early-stage consumer products validating before monetization.

The recommended approach builds testing infrastructure in dependency order: environment setup and Playwright configuration first, missing Vitest API route tests second, then E2E specs from simplest (no-API UI flows) to most complex (live generation with a real A40 pod), followed by performance auditing and mobile verification. The stack additions are minimal and well-justified: Playwright for E2E, MSW for unit-level API mocking, @vitest/coverage-v8 for coverage, @next/bundle-analyzer for performance, and @axe-core/playwright for accessibility scans. No framework replacements — all tools extend what already exists.

The key risks are architectural. Playwright's page.route() cannot intercept server-side fetch calls to HeartMuLa — E2E generation tests must hit the real A40 pod, not mocks. The A40 pod migration (from RTX 4090 pod zwysa4aou3a8it to A40 pod 96y089egxk3xm5) is unverified, making pod connectivity the most critical blocker for the milestone. Secondary risks include Framer Motion animation flakiness in E2E tests (mitigated by setting reducedMotion: 'reduce' in Playwright config), localStorage test contamination between quiz specs, and performance metrics measured from the dev server rather than a production build. All risks are known and preventable with correct setup before tests are written.

## Key Findings

### Recommended Stack

The existing stack (Next.js 16.1.6, React 19.2.3, Vitest 4.0.18, @testing-library/react, jsdom, TypeScript, Tailwind CSS 4) requires no changes. v4.0 adds five devDependencies only.

See `.planning/research/STACK.md` for full version compatibility matrix and integration code examples.

**Core technologies (net-new):**
- `@playwright/test ^1.50.1`: E2E testing of the full landing → quiz → generation → success flow — the Next.js-recommended E2E framework; supports App Router Server Components; handles full browser automation including network interception and mobile device emulation
- `msw ^2.12.10`: API mocking for Vitest unit/integration tests — uses Fetch API primitives (not http module), so it works with Next.js native fetch; covers HeartMuLa generate/query_result and R2 presigned URL calls in isolation
- `@vitest/coverage-v8 ^4.0.18`: Code coverage — V8 is the only practical choice for App Router (Istanbul's babel instrumentation breaks with SWC); must match vitest major version (^4.x)
- `@next/bundle-analyzer ^16.1.6`: Bundle composition audit — wraps next.config.ts, enabled only via ANALYZE=true env var, zero production impact; version tracks Next.js version
- `@axe-core/playwright ^4.11.1`: Automated WCAG scans within existing Playwright tests — official Deque package (not community wrapper); scans any page state during a Playwright test run

**Explicitly excluded:** Cypress (App Router compatibility issues; Playwright is Next.js's official recommendation), Jest (Vitest already installed and API-compatible), Lighthouse CI with score gates (premature before baseline established), Istanbul coverage (breaks with SWC), supertest (incompatible with App Router routes).

### Expected Features

The v4.0 feature landscape is entirely testing and optimization work. No new user-facing features ship in this milestone. The question being answered is: what testing and optimization work is table stakes, what is differentiating, and what is scope creep?

See `.planning/research/FEATURES.md` for full feature dependency graph and prioritization matrix.

**Must have (table stakes — P1):**
- A40 pod connectivity verification — all generation tests depend on it; the pod migration from RTX 4090 is unverified and is the single biggest milestone blocker
- Error boundaries (error.tsx) at /quiz and /quiz/success route segments — Next.js App Router has no default error boundaries; without them, any uncaught client error crashes the full page with no recovery UI
- Full happy-path E2E test — landing → 6-step quiz → generation → success page; covers the complete product flow end-to-end
- Generation API error handling — pod offline (503), FAILED status, polling timeout; each must show a retry UI rather than an infinite spinner
- Per-step quiz validation E2E — all 6 Zod schemas enforce correctly; empty submits show correct error states
- Mobile viewport tests — iPhone 15 Pro and Pixel 8; no horizontal overflow, buttons tappable (44px min), inputs usable
- Core Web Vitals audit — Lighthouse on landing page and quiz from a production build; document LCP, INP, CLS baseline; fix P1 issues (likely: hero image missing next/image priority, layout shift on quiz card mount)

**Should have (competitive — P2, add within this milestone after P1s pass):**
- Polling resilience test — simulate 2-3 failed poll responses before eventual success; the most likely real-world failure mode for async generation
- Page Object Model (POM) architecture — QuizPage, LandingPage, SuccessPage classes; justified immediately given 6-step quiz with selectors shared across multiple specs
- Unit test for quizToPrompt() — pure function, no dependencies; high value at very low cost
- Bundle size analysis via @next/bundle-analyzer — framer-motion, canvas-confetti candidates; run once to inform lazy loading decisions
- localStorage quiz persistence test — regression test for notevra_quiz_v1 key; page.reload() with state assertions
- Smoke test tags (@smoke) — tag 5-6 critical tests for CI use without running full generation suite

**Defer to v5.0+:**
- Lighthouse CI score gates — premature before performance optimization stabilizes
- Full accessibility audit — own milestone with its own remediation backlog
- Load/stress testing — pre-monetization; no real concurrent users yet
- Visual regression testing — requires stable design system and baseline management strategy
- Analytics/conversion tracking — post-payment funnel analysis

### Architecture Approach

Test infrastructure is layered onto the existing application without structural changes to any app source code. The architecture separates E2E tests (e2e/ at project root — outside src/) from unit/integration tests (Vitest — inside src/), with a clear boundary: Playwright tests reach the application only via HTTP to localhost:3000, never via direct imports. Vitest tests mock all external calls via vi.mock() and never touch real network. Bundle analysis is a build-time-only tool with zero production impact.

See `.planning/research/ARCHITECTURE.md` for full directory structure, data flow diagrams, and annotated code examples.

**Major components:**
1. `e2e/flows/` — Playwright test specs, one file per user flow (landing, quiz-happy-path, quiz-validation, quiz-error-states, api-smoke)
2. `e2e/pages/` — Page Object Model classes (LandingPage, QuizPage, SuccessPage); wraps Playwright locators so selector changes require one edit, not many
3. `e2e/fixtures/` — Playwright fixture extensions; pre-filled quiz data for skipping setup steps in post-quiz specs
4. `playwright.config.ts` — browser targets (Chromium + Mobile Chrome), webServer pointing to npm run start, timeout configuration per project
5. `src/app/api/poll-job/[jobId]/route.test.ts` and `src/app/api/audio/[jobId]/route.test.ts` — two missing Vitest API route tests following the established vi.mock pattern from quiz-generate/route.test.ts
6. `next.config.ts` (modified) — withBundleAnalyzer wrapper, ffmpeg-static in serverExternalPackages
7. Performance tooling — lazy loading via next/dynamic for framer-motion and canvas-confetti if bundle analysis confirms they are in the client bundle

**Build order (dependency-ordered):**
Vitest config update → missing route unit tests → Playwright install + config → Page Object Models → smoke E2E specs (no API) → happy-path E2E (live pod) → error state E2E → bundle analysis + optimization

### Critical Pitfalls

See `.planning/research/PITFALLS.md` for all 10 pitfalls with full prevention strategies, warning signs, and recovery steps.

**Top pitfalls requiring immediate attention at Phase 1 setup:**

1. **page.route() cannot intercept server-side HeartMuLa fetch calls** — E2E tests that mock HeartMuLa with page.route() will silently fail to intercept; the real pod is called regardless. Use live pod for all generation E2E; reserve mocking for Vitest unit tests. Never attempt to use page.route() for HeartMuLa URLs.

2. **A40 pod migration unverified — blocks the entire milestone** — All generation tests fail if the pod URL in HEARTMULA_URL is wrong or pod is stopped. Add a Playwright globalSetup health check that fails early with a clear error before any test runs. This is the first action of Phase 1.

3. **Framer Motion slide animations cause flaky quiz step assertions** — AnimatePresence transitions run 300ms; toBeVisible() fires mid-animation. Set reducedMotion: 'reduce' in playwright.config.ts base config — this activates the useReducedMotion() zero-duration path already in the app.

4. **Playwright default 30s timeout is shorter than the app's 120s polling timeout** — generation tests fail at exactly 30s under normal conditions. Set test.setTimeout(90_000) on the happy path spec; configure a separate Playwright project for generation tests with a higher timeout budget.

5. **localStorage quiz persistence contaminates test isolation** — notevra_quiz_v1 key persists across tests that share a browser context. Call localStorage.clear() in a beforeEach hook for all quiz tests before writing any quiz flow spec.

6. **env.ts Zod validation crashes the Next.js server before any test runs if env vars are missing** — Playwright's webServer error is cryptic. Create .env.test with all required variables and add a globalSetup health check with a readable error message.

## Implications for Roadmap

Based on combined research, the milestone should follow strict dependency ordering. Each phase has concrete prerequisites that, if skipped, create failure modes that look like unrelated bugs rather than setup problems.

### Phase 1: Foundation — Playwright Setup and Environment Verification

**Rationale:** The most dangerous work in this milestone is setup-related, not test-writing. Every subsequent phase depends on: Playwright being correctly configured, the A40 pod being reachable, environment variables being complete, localStorage isolation being in place, and animation flakiness being prevented. Doing all setup work in one focused phase means the rest of the milestone is about test logic, not environment debugging. Six of the ten documented pitfalls are prevented entirely by correct Phase 1 setup.

**Delivers:** Working Playwright harness (playwright.config.ts, webServer config pointing to npm run start, Chromium + Pixel 5 browser install), confirmed A40 pod connectivity via globalSetup health check, .env.test with all required variables, reducedMotion: 'reduce' in base config, localStorage.clear() in beforeEach pattern, updated Vitest config excluding e2e/, package.json test scripts (test:unit, test:e2e, test:all, analyze).

**Addresses:** A40 pod connectivity verification (P1), Playwright harness infrastructure
**Avoids:** All six setup-related pitfalls: page.route() misunderstanding (Pitfall 1), timeout mismatch (Pitfall 2), animation flakiness (Pitfall 3), env.ts crash (Pitfall 4), pod URL staleness (Pitfall 5), localStorage contamination (Pitfall 7)
**Research flag:** Standard patterns — all config patterns are documented in ARCHITECTURE.md with verified code examples. No additional research needed.

---

### Phase 2: Unit Test Gap Closure and Error Boundaries

**Rationale:** Two API routes (poll-job and audio) have no Vitest unit tests. These tests are fast to write (vi.mock pattern established in quiz-generate/route.test.ts), independent of Playwright, and close the unit test gap before E2E tests create false confidence. Error boundaries (error.tsx) must be implemented before error-path E2E tests are written — otherwise Playwright just observes a page crash, not a graceful error UI. The debug.technicalMessage security exposure identified in PITFALLS.md should also be addressed here.

**Delivers:** poll-job/[jobId]/route.test.ts and audio/[jobId]/route.test.ts (vi.mock pattern, matching quiz-generate coverage), error.tsx at /quiz and /quiz/success route segments with retry UI, updated Vitest coverage configuration via @vitest/coverage-v8, review and server-side filtering of debug.technicalMessage in error responses.

**Addresses:** Error boundaries (P1), unit test coverage for all API routes, @vitest/coverage-v8 configuration
**Avoids:** Error path E2E tests having nothing to assert against; debug.technicalMessage client exposure (security, Pitfall SECURITY section)
**Uses stack:** @vitest/coverage-v8 (configure), msw server.ts mock handlers (implement for HeartMuLa and R2)
**Research flag:** Standard patterns — vi.mock pattern and Next.js error.tsx are officially documented. No additional research needed.

---

### Phase 3: Page Object Models and Smoke E2E Tests (No API Required)

**Rationale:** Building POMs before any spec references them validates the locator API design without coupling to spec implementation. Smoke specs (landing page, quiz validation) require no live API calls and provide fast feedback. These specs reveal selector issues and confirm Playwright can navigate the app before generation tests (which take 20-30s each) are written. The quizToPrompt() unit test belongs here — pure function, no dependencies, high value at low cost.

**Delivers:** LandingPage.ts, QuizPage.ts, SuccessPage.ts POMs in e2e/pages/; e2e/fixtures/index.ts with pre-filled quiz data; landing.spec.ts (page load, CTA navigation to /quiz, no API); quiz-validation.spec.ts (all 6 Zod schemas, empty submit shows error states, valid input enables Continue); quizToPrompt() unit test in Vitest covering edge cases.

**Addresses:** Per-step quiz validation tests (P1), POM architecture (P2), unit test for quizToPrompt() (P2)
**Implements architecture:** e2e/pages/ and e2e/flows/ directory structure; Page Object Model pattern
**Research flag:** Standard patterns — Playwright POM is official documentation with verified examples in ARCHITECTURE.md. No additional research needed.

---

### Phase 4: Full Happy-Path and Error State E2E Tests

**Rationale:** The happy-path E2E test is the highest-value single test in the milestone — it validates the complete product flow with a real A40 pod. It must come after Phase 3 because it reuses the QuizPage and SuccessPage POMs. Error state specs come immediately after because they reuse the same POMs and mock failure responses at the Next.js API layer (not the HeartMuLa layer — see Pitfall 1). The polling resilience test is an extension of error state coverage and belongs in this phase.

**Delivers:** quiz-happy-path.spec.ts with 90s test.setTimeout; quiz-error-states.spec.ts covering pod offline (502 mock via page.route() on /api/quiz-generate), FAILED status (mock poll response), polling timeout; polling resilience test simulating 2-3 transient poll failures before success; api-smoke.spec.ts for pod connectivity verification gated on HEARTMULA_URL; @smoke tags on 5-6 critical tests.

**Addresses:** Full happy-path E2E (P1), generation API error handling (P1), polling resilience test (P2), smoke test tags (P2)
**Avoids:** Timeout mismatch (test.setTimeout(90_000)), page.route() used only for Next.js API layer not HeartMuLa server-side fetch (Pitfall 1), audio delivery tested via DOM and response assertions not audio playback (Pitfall 6)
**Research flag:** Live-pod integration and Playwright route() interception patterns are documented in ARCHITECTURE.md. No additional research needed.

---

### Phase 5: Mobile Responsiveness Tests

**Rationale:** Mobile tests reuse all three POMs from Phase 3 — the only addition is running the same flows at mobile viewports. This phase isolates mobile-specific issues (tap target sizes, touch-action: manipulation, horizontal overflow) from functional issues. Testing mobile after E2E passes on desktop means failures are attributable to viewport/touch behavior, not application logic. The reduced-motion accessibility test and localStorage persistence test both fit naturally here.

**Delivers:** Full 6-step quiz flow tested on iPhone SE and Pixel 5 Playwright devices; tap target verification (44x44px minimum); horizontal overflow assertions on all pages; download link behavior on mobile; reduced-motion test verifying Framer Motion disables under prefers-reduced-motion: reduce; localStorage persistence test (fill steps 1-3, reload, confirm state restored).

**Addresses:** Mobile viewport tests (P1), localStorage persistence test (P2), reduced-motion accessibility test (P2)
**Avoids:** Mobile touch event issues on SelectionCard/PillButton — verify touch-action: manipulation CSS is applied (Pitfall 10)
**Research flag:** Playwright mobile device emulation is standard. Specific touch-action CSS fixes may require manual verification during execution, but the pattern is known.

---

### Phase 6: Performance Audit and Optimization

**Rationale:** Performance work comes last because it requires a production build (npm run build && npm start — never dev mode), benefits from knowing which code paths are exercised by the E2E suite, and optimization targets are identified by bundle analysis rather than guessed. The Core Web Vitals audit establishes the baseline; optimization work is scoped to P1 issues only. Lighthouse CI score gates are explicitly deferred to v5.0.

**Delivers:** Bundle analysis report from ANALYZE=true npm run build; framer-motion and canvas-confetti lazy loading via next/dynamic if analysis confirms they are primary client bundle contributors; LCP/INP/CLS baseline measurements from production build documented for v5.0 reference; hero image next/image priority fix if missing; quiz card mount layout shift fix if CLS > 0.1; audio proxy TTFB measured and streaming optimization deferred if TTFB < 500ms; ffmpeg-static serverExternalPackages verification.

**Addresses:** Core Web Vitals audit and P1 fixes (P1), bundle size analysis (P2)
**Avoids:** Performance measurements from dev mode (Pitfall 8), audio proxy buffering documented and deferred appropriately (Pitfall 9)
**Research flag:** framer-motion lazy loading with next/dynamic and AnimatePresence has non-obvious integration behavior. If bundle analysis confirms framer-motion is a primary client bundle concern, flag Phase 6 for `/gsd:research-phase` before implementing lazy loading — the correct wrapping pattern for components using AnimatePresence is not straightforward.

---

### Phase Ordering Rationale

- **Phase 1 first** because environment failures disguise themselves as application failures. Six of ten documented pitfalls are prevented by correct Playwright setup; deferring setup creates confusing failures throughout.
- **Phase 2 before E2E** because error boundaries must exist before error-path E2E tests can assert graceful behavior; testing errors without error.tsx just verifies the app crashes.
- **Phase 3 before Phases 4-5** because POMs are shared by all subsequent E2E phases; building them first means phases 4 and 5 focus on test logic, not selector duplication.
- **Phase 4 before Phase 5** because if the full happy path fails on desktop, mobile failures are noise. Desktop confirmation is a prerequisite.
- **Phase 6 last** because performance optimization requires a production build and benefits from E2E coverage data; optimizing before tests pass creates moving targets.

### Research Flags

Phases needing `/gsd:research-phase` during planning:

- **Phase 6 (Performance):** framer-motion lazy loading with next/dynamic and AnimatePresence requires specific wrapping patterns that are not covered in the official docs. If bundle analysis confirms framer-motion is a primary client bundle concern, research the correct lazy loading approach before implementing. This is a MEDIUM-confidence area and should not be attempted without a research phase.

Phases with standard patterns (skip research-phase):

- **Phase 1 (Setup):** Playwright webServer config, reducedMotion, localStorage isolation — all directly documented in official Playwright docs and ARCHITECTURE.md.
- **Phase 2 (Unit tests + error boundaries):** vi.mock pattern is established in the codebase; Next.js error.tsx is officially documented.
- **Phase 3 (POMs + smoke tests):** Official Playwright POM pattern with full examples in ARCHITECTURE.md.
- **Phase 4 (E2E flows):** All patterns documented in ARCHITECTURE.md with verified code examples including timeout configuration and route interception.
- **Phase 5 (Mobile):** Playwright device emulation is standard; CSS tap-target fixes are straightforward.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All versions verified against live npm registry (2026-03-06); version compatibility confirmed across all five new packages; official Next.js 16.1.6 docs verified for Playwright recommendation |
| Features | HIGH | Grounded in direct codebase inspection of existing components; priority ordering based on Playwright and Next.js official patterns and a confirmed codebase audit of what exists and what is missing |
| Architecture | HIGH | All patterns verified against official Next.js and Playwright documentation; code examples confirmed against actual codebase structure (vitest.config.ts, quiz-generate/route.test.ts, next.config.ts inspected directly) |
| Pitfalls | HIGH | All 10 pitfalls derived from direct codebase audit (2026-03-06) plus verified Playwright/Next.js documentation; Pitfalls 1-10 have documented warning signs and verified recovery strategies |

**Overall confidence:** HIGH

All four research files were grounded in direct codebase inspection plus official documentation. No pitfalls are speculative; all have verified sources. The primary remaining uncertainty is operational (A40 pod state) rather than architectural, and the mitigation (globalSetup health check) is straightforward.

### Gaps to Address

- **A40 pod status (ID: 96y089egxk3xm5):** Research confirmed the migration plan and pod ID; it did not verify the pod is currently running. This must be the first thing verified during Phase 1 execution before any test is written. If the pod is stopped, it must be restarted in RunPod before proceeding.

- **ffmpeg-static bundle placement:** STACK.md flagged that ffmpeg-static is listed as a `dependency` (not devDependency), which may cause the binary to appear in the server bundle. Phase 6 bundle analysis will confirm. ARCHITECTURE.md's Pattern 5 shows the preemptive fix (serverExternalPackages: ['ffmpeg-static'] in next.config.ts) which should be applied in Phase 1 as a safe precaution.

- **framer-motion lazy loading with AnimatePresence:** If bundle analysis reveals framer-motion is a significant client bundle contributor, the correct next/dynamic wrapping pattern for AnimatePresence-using components is non-trivial. Flag Phase 6 for research-phase if this optimization is pursued.

- **debug.technicalMessage client exposure:** PITFALLS.md identified that classifyError in /lib/errors.ts includes debug.technicalMessage in the 502 response body, making internal error details accessible to the browser. This should be reviewed and filtered server-side during Phase 2 error boundary work before new error UI surfaces these messages.

## Sources

### Primary (HIGH confidence)
- Next.js official testing guide — https://nextjs.org/docs/app/guides/testing — Playwright recommendation, App Router compatibility
- Next.js Playwright guide — https://nextjs.org/docs/app/guides/testing/playwright — webServer config, baseURL, production vs dev trade-offs
- Next.js error handling docs — https://nextjs.org/docs/app/getting-started/error-handling — error.tsx route segments
- Next.js bundle analyzer / package bundling — https://nextjs.org/docs/app/guides/package-bundling — withBundleAnalyzer pattern
- Next.js lazy loading — https://nextjs.org/docs/app/guides/lazy-loading — next/dynamic patterns
- Playwright Best Practices — https://playwright.dev/docs/best-practices — role-based locators, data-testid guidance
- Playwright Page Object Models — https://playwright.dev/docs/pom — POM pattern (official)
- Playwright accessibility testing — https://playwright.dev/docs/accessibility-testing — @axe-core/playwright integration
- Playwright mock APIs — https://playwright.dev/docs/mock — page.route() scope and server-side limitations
- Playwright test timeouts — https://playwright.dev/docs/test-timeouts — timeout configuration
- MSW v2 docs — https://mswjs.io/docs/integrations/node — setupServer, lifecycle hooks
- Vitest coverage docs — https://vitest.dev/guide/coverage.html — V8 vs Istanbul comparison, SWC compatibility
- npm registry — all five new packages verified against live registry (2026-03-06)
- Direct codebase audit — src/app/api/, src/app/quiz/, src/lib/heartmula.ts, src/lib/errors.ts, src/env.ts, vitest.config.ts, next.config.ts, package.json

### Secondary (MEDIUM confidence)
- Core Web Vitals 2026 targets — https://www.digitalapplied.com/blog/core-web-vitals-2026-inp-lcp-cls-optimization-guide — INP thresholds
- RunPod error handling documentation — https://docs.runpod.io/serverless/workers/handlers/handler-error-handling — persistent pod behavior differs from serverless docs
- Next.js GitHub Discussion — intercepting server-side fetch in Playwright — page.route() server-side limitation confirmed
- BetterStack — Avoiding Flaky Tests in Playwright — animation timing patterns
- Playwright GitHub Issue #4055 — Framer Motion animation waitForAnimation

### Tertiary (LOW confidence)
- Community sources on Framer Motion + Playwright flakiness — consistent across multiple sources; specific fix (reducedMotion media query activating zero-duration path) verified against the codebase's useReducedMotion() hook

---
*Research completed: 2026-03-06*
*Ready for roadmap: yes*
