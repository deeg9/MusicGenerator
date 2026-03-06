# Phase 18: Playwright Setup and Environment - Context

**Gathered:** 2026-03-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Install Playwright, update HEARTMULA_URL to the A40 pod, verify connectivity, and configure the test harness with correct timeouts and animation settings. Every subsequent phase can run tests without environment surprises.

</domain>

<decisions>
## Implementation Decisions

### Test file organization
- E2E tests live in `e2e/` at the project root (standard Playwright convention)
- Page Object Models live in `e2e/pages/` (landing.ts, quiz.ts, success.ts)
- Spec files organized by page: `e2e/landing.spec.ts`, `e2e/quiz.spec.ts`, `e2e/success.spec.ts`
- Existing unit tests stay colocated in `src/` (e.g., `src/lib/r2.test.ts`) — no reorganization

### Browser targets
- Chromium only for now (fastest runs, covers primary audience)
- Mobile viewport presets (iPhone SE + iPad) defined in `playwright.config.ts` now, used in Phase 22
- Headless by default, with `test:e2e:headed` script for debugging

### Pod health check strategy
- globalSetup pings the A40 pod; if unreachable, logs a warning and sets a flag
- Generation-dependent specs are skipped when pod is down; non-generation specs still run
- Pod URL read from `.env.local` (same `HEARTMULA_URL` the app uses — single source of truth)
- HEARTMULA_URL updated to A40 pod (`96y089egxk3xm5`) in this phase
- `reducedMotion: reduce` configured to disable Framer Motion animations (decided in v4.0 roadmap planning)

### Script naming
- `test:e2e` — headless Playwright run
- `test:e2e:headed` — headed Playwright for debugging
- `test:unit` — vitest run
- `analyze` — bundle analysis via `ANALYZE=true next build`

### Playwright config
- `webServer` auto-starts Next.js dev server (`npm run dev` on port 3000)
- HTML reporter enabled (stored in `playwright-report/`)
- Screenshots and traces captured on failure only
- Generation tests configured with 60s+ timeouts

### Claude's Discretion
- Exact health check method (ping /health, root endpoint, or similar)
- globalSetup/globalTeardown implementation details
- Playwright config structure and project naming conventions
- Whether to use Playwright's built-in `dotenv` or manual loading

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches.

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `vitest.config.ts`: Existing unit test config with jsdom + @testing-library — serves as pattern for test tooling
- `src/env.ts`: Zod-validated env vars including HEARTMULA_URL — Playwright globalSetup can reference same validation pattern
- `src/lib/heartmula.ts`: API client with timeout signals — health check can reuse same URL patterns

### Established Patterns
- Path alias `@/` mapped to `src/` in vitest config — Playwright tsconfig should match
- dotenv already in devDependencies — available for globalSetup env loading
- Framer Motion used throughout quiz flow — `reducedMotion: reduce` critical for stable tests

### Integration Points
- `package.json` scripts: Currently has dev, build, start, lint — needs test:e2e, test:e2e:headed, test:unit, analyze
- `.env.local`: HEARTMULA_URL needs updating from RTX 4090 pod to A40 pod
- `.gitignore`: Will need entries for playwright-report/, test-results/, e2e output

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 18-playwright-setup-and-environment*
*Context gathered: 2026-03-06*
