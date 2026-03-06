# Stack Research

**Domain:** Testing and optimization — E2E, API verification, performance auditing for Next.js 14+ gift funnel
**Researched:** 2026-03-06
**Confidence:** HIGH (versions verified against live npm registry and official docs; Next.js App Router integration patterns verified against official Next.js 16.1.6 docs)

---

## Context: Existing Stack (Do Not Re-research)

This research covers ONLY net-new additions for the v4.0 Testing & Optimization milestone. The following are installed and working:

| Already In Place | Version | Relevance to v4.0 |
|------------------|---------|-------------------|
| Next.js App Router | 16.1.6 | E2E tests target the running app |
| React | 19.2.3 | No changes |
| Zod | ^4.3.6 | Already used for quiz validation |
| vitest | ^4.0.18 | Already installed — extend, do not replace |
| @testing-library/react | ^16.3.2 | Already installed — use for component tests |
| @testing-library/user-event | ^14.6.1 | Already installed |
| @testing-library/jest-dom | ^6.9.1 | Already installed |
| jsdom | ^28.1.0 | Already installed as vitest environment |
| TypeScript | ^5 | No changes |
| Tailwind CSS | ^4 | No changes |

---

## Recommended Stack — New Additions Only

### Core Testing Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| @playwright/test | ^1.50.1 | E2E testing of full landing → quiz → generation → success flow | The official Next.js-recommended E2E framework. Runs against a real browser (Chromium, Firefox, WebKit) against the built Next.js production server. Next.js docs explicitly guide Playwright over Cypress for App Router — async Server Components render correctly via Playwright because it receives fully-rendered HTML. Built-in `webServer` config starts `next dev` automatically before tests run. |
| msw | ^2.12.10 | Mock the HeartMuLa/RunPod API and Cloudflare R2 presigned URL calls in unit/integration tests | MSW v2 intercepts at the network level using Fetch API primitives — no application code changes needed. Works in vitest (Node.js via `setupServer` from `msw/node`) and in Playwright (via service worker in browser). Lets you test the polling loop, error branches, and timeout states without an actual RunPod pod running. V2 is the current API — v1 is deprecated. |
| @vitest/coverage-v8 | ^4.0.18 | Code coverage for vitest unit and component tests | V8 coverage is the only practical choice for Next.js App Router — Istanbul requires source pre-instrumentation which breaks with SWC and Server Actions. Since v3.2.0, Vitest's V8 provider uses AST-based remapping for Istanbul-equivalent accuracy. Pin to same major as existing `vitest` install (^4.0.18). |

### Performance Audit Tools

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| @next/bundle-analyzer | ^16.1.6 | Visualize JavaScript bundle composition, find oversized dependencies | Official Vercel package. Version tracks Next.js version (16.1.6). Wraps `next.config.ts` — set `ANALYZE=true npm run build` to generate an interactive treemap. Identifies if framer-motion, ffmpeg-static, or drizzle-orm are bleeding into client bundles. Critical before any performance optimization work. |

### Accessibility Audit (Playwright-integrated)

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| @axe-core/playwright | ^4.11.1 | Automated WCAG accessibility scans within Playwright E2E tests | Integrates directly into existing Playwright tests — `new AxeBuilder({ page }).analyze()` scans the current page state. No separate test runner. Catches ~50% of WCAG issues automatically. Critical for verifying the quiz funnel is keyboard-navigable and screen-reader-friendly. Use from Deque (official axe maintainer), not the community `axe-playwright` package. |

---

## What NOT to Add

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Cypress | Heavier install, slower than Playwright, App Router async components have known quirks with Cypress component testing. Next.js now recommends Playwright in official docs. | `@playwright/test` |
| Jest | Already have vitest — adding Jest creates dual test runner confusion. Vitest is a superset of Jest's API (compatible syntax) and runs faster via Vite's ESM transform. | Extend existing `vitest` |
| `@playwright/test` + separate `playwright` package | The `playwright` (sans `/test`) package is the browser automation library. `@playwright/test` is the full test runner that includes it. Install only `@playwright/test` — it bundles `playwright` internally. | `@playwright/test` only |
| Lighthouse CI (`@lhci/cli`) | Heavyweight CI integration requiring a separate server, LHCI token, and budget configuration. Overkill for a single-developer project at this stage. | Run Chrome DevTools Lighthouse manually + `@next/bundle-analyzer` for build-time analysis |
| `istanbul` / `@vitest/coverage-istanbul` | Doesn't work with Next.js SWC compilation or Server Actions. Produces incorrect coverage maps. V8 coverage achieves the same accuracy since Vitest v3.2. | `@vitest/coverage-v8` |
| `supertest` for API route testing | Designed for Express-style servers. Next.js App Router API routes are not Express handlers — supertest can't mount them correctly. | Playwright API testing (`request` fixture) or msw handlers in vitest |
| `react-query` / `swr` for test data | The app uses native fetch — adding a data-fetching library to make testing easier is backwards. Mock the fetch calls with msw instead. | `msw` |

---

## Integration Architecture

### Playwright Configuration for Next.js App Router

Playwright requires the Next.js server to be running during E2E tests. The `webServer` config handles this automatically:

```ts
// playwright.config.ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "Mobile Safari", use: { ...devices["iPhone 15"] } },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
  },
});
```

**Why `npm run dev` not `npm run build && npm start`:** For the v4.0 bug-fix-and-test milestone, dev mode gives immediate feedback during the fix pass. Production mode testing can be added in CI later.

**Why only Chromium + Mobile Safari:** Covers the two dominant rendering engines (Blink + WebKit). Firefox can be added but triples test run time for marginal coverage gain at this stage.

### MSW Setup for Vitest (API Mocking)

MSW v2 in a Node.js vitest environment intercepts fetch calls from API routes and hooks:

```ts
// tests/mocks/server.ts
import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";

export const server = setupServer(
  // Mock HeartMuLa /generate endpoint
  http.post("*/generate", () => {
    return HttpResponse.json({
      data: { task_id: "mock-task-123" },
      code: 200,
      error: null,
    });
  }),
  // Mock HeartMuLa /query_result endpoint
  http.post("*/query_result", () => {
    return HttpResponse.json({
      data: [{ status: 1, result: JSON.stringify([{ file: "/audio/mock.wav" }]) }],
      code: 200,
      error: null,
    });
  }),
  // Mock Cloudflare R2 presigned URL download
  http.get("https://*.r2.cloudflarestorage.com/*", () => {
    return new HttpResponse(new ArrayBuffer(1024), {
      headers: { "Content-Type": "audio/wav" },
    });
  })
);
```

```ts
// vitest.setup.ts (add to existing setup file)
import { server } from "./tests/mocks/server";
beforeAll(() => server.listen({ onUnhandledRequest: "warn" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

### Bundle Analyzer Configuration

```ts
// next.config.ts
import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const nextConfig: NextConfig = {
  // existing config
};

export default withBundleAnalyzer(nextConfig);
```

Run: `ANALYZE=true npm run build` — opens browser with interactive bundle treemap.

**Known concern:** `ffmpeg-static` (5.3.0) is a `dependency` not `devDependency` — it may be bundling the ffmpeg binary into the server bundle. Bundle analyzer will confirm whether it's tree-shaken or included.

### Axe Accessibility in Playwright Tests

```ts
// tests/e2e/accessibility.spec.ts
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("landing page has no critical accessibility violations", async ({ page }) => {
  await page.goto("/");
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();
  expect(results.violations).toEqual([]);
});

test("quiz funnel steps are accessible", async ({ page }) => {
  await page.goto("/quiz");
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});
```

### Coverage Configuration

Add to `vitest.config.ts`:

```ts
export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/**/*.test.{ts,tsx}", "src/app/api/**"], // API routes tested via Playwright
    },
  },
});
```

---

## Test Directory Structure

```
tests/
  e2e/                        # Playwright tests
    landing.spec.ts           # Landing page load, CTA clicks, hero
    quiz.spec.ts              # 6-step quiz flow: step nav, validation, completion
    generation.spec.ts        # Generation polling, success page, confetti
    api.spec.ts               # API route health checks via request fixture
    accessibility.spec.ts     # Axe scans per page
    mobile.spec.ts            # Mobile Safari viewport tests
  mocks/
    server.ts                 # MSW handlers for vitest
    handlers/
      heartmula.ts            # RunPod/ACE-Step mock responses
      r2.ts                   # Cloudflare R2 presigned URL mocks
playwright.config.ts
vitest.config.ts              # (existing — extend with coverage config)
vitest.setup.ts               # (existing — add MSW server lifecycle)
```

---

## Installation

```bash
# E2E testing
npm install -D @playwright/test

# Install Playwright browsers (Chromium + WebKit only for this milestone)
npx playwright install chromium webkit

# API mocking for unit/integration tests
npm install -D msw

# Code coverage
npm install -D @vitest/coverage-v8

# Bundle analysis (devDependency — only runs during ANALYZE=true build)
npm install -D @next/bundle-analyzer

# Accessibility scanning within Playwright tests
npm install -D @axe-core/playwright
```

---

## Alternatives Considered

| Recommended | Alternative | Why Not |
|-------------|-------------|---------|
| `@playwright/test` ^1.50.1 | Cypress | Next.js App Router async Server Components have Cypress compatibility caveats. Playwright is Next.js's official recommendation and runs headless across 3 engines with a single install. |
| `msw` ^2.12.10 | `nock` | nock intercepts at the Node.js `http` module level, which doesn't work for fetch-based requests (the native fetch in Node 18+ bypasses `http`). msw v2 uses Fetch API primitives and works with both native fetch and axios. |
| `msw` ^2.12.10 | `jest-fetch-mock` / `vi.mock(fetch)` | Manual mocking requires changing test code per-handler. MSW provides a shared handler layer usable across vitest and Playwright — write once, run in both contexts. |
| `@vitest/coverage-v8` | `@vitest/coverage-istanbul` | Istanbul's babel-instrumentation pipeline breaks with Next.js's SWC compiler. Istanbul coverage reports are inaccurate for App Router server code. V8 coverage via Vitest v3.2+ has equivalent AST remapping accuracy. |
| `@axe-core/playwright` | `axe-playwright` (community) | `axe-playwright` is a community wrapper not maintained by Deque (axe-core's authors). `@axe-core/playwright` is the official Deque package with guaranteed compatibility with axe-core updates. |
| `@next/bundle-analyzer` | `webpack-bundle-analyzer` directly | `@next/bundle-analyzer` wraps webpack-bundle-analyzer with correct Next.js config integration and server/client split views. Using the raw package requires manual Next.js webpack config patching. |

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| `@playwright/test` ^1.50.1 | Next.js 16.1.6 (Next.js 14+ App Router) | Playwright navigates the built app — no framework coupling. Works by receiving server-rendered HTML. No version coupling to Next.js. |
| `msw` ^2.12.10 | Node.js 18+, `vitest` ^4.x | MSW v2 requires Node 18+ for native fetch. Project uses Node (Next.js 16 requires Node 18+). Integrates with vitest via `setupServer` from `msw/node`. Not MSW v1 — the API changed completely. |
| `@vitest/coverage-v8` | `vitest` ^4.0.18 | Must match vitest major version. Both ^4.x — no conflict. |
| `@next/bundle-analyzer` | `next` 16.1.6 | Pin to same version as Next.js. Current: 16.1.6. |
| `@axe-core/playwright` ^4.11.1 | `@playwright/test` ^1.50.1 | `@axe-core/playwright` 4.x is compatible with Playwright 1.40+. No version conflict at 1.50. |

---

## Sources

- Next.js official testing guide — https://nextjs.org/docs/app/guides/testing — Playwright recommended for App Router E2E; confirmed against Next.js 16.1.6 docs (HIGH confidence — official docs)
- Next.js Playwright guide — https://nextjs.org/docs/app/guides/testing/playwright — `webServer` config pattern, `baseURL` setup, production vs dev server trade-offs (HIGH confidence — official docs)
- npm registry — `@playwright/test` latest: 1.58.2 (using ^1.50.1 floor for stability range) (HIGH confidence — live registry)
- npm registry — `msw` latest: 2.12.10 (HIGH confidence — live registry, 24 days ago)
- npm registry — `@axe-core/playwright` latest: 4.11.1 (HIGH confidence — live registry, confirmed from search)
- npm registry — `@next/bundle-analyzer` latest: 16.1.6 (tracks Next.js version) (HIGH confidence — live registry)
- MSW v2 docs — https://mswjs.io/docs/integrations/node — `setupServer` from `msw/node`, `beforeAll`/`afterEach`/`afterAll` lifecycle (HIGH confidence — official docs)
- Vitest coverage docs — https://vitest.dev/guide/coverage.html — V8 vs Istanbul comparison, AST remapping since v3.2 (HIGH confidence — official docs)
- WebSearch — "Why Istanbul Coverage Doesn't Work with Next.js App Router" (DEV Community, confirmed multi-source) — V8 as only practical choice for App Router (MEDIUM confidence — community, consistent across sources)
- Playwright accessibility docs — https://playwright.dev/docs/accessibility-testing — `@axe-core/playwright` official integration pattern (HIGH confidence — official Playwright docs)
- WebSearch — `@next/bundle-analyzer` version 16.1.6 confirmed (HIGH confidence — matches Next.js version tracking convention)

---

*Stack research for: Notevra v4.0 — E2E testing, API mocking, performance auditing, accessibility scanning additions only*
*Researched: 2026-03-06*
