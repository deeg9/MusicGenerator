# Architecture Research

**Domain:** Testing & optimization integration — Playwright E2E, API tests, and performance onto existing Next.js App Router gift funnel
**Researched:** 2026-03-06
**Confidence:** HIGH (official Next.js docs, official Playwright docs, verified against existing codebase — all patterns confirmed by direct file inspection)

---

## Standard Architecture

### System Overview — Test Infrastructure Layered onto Existing App

```
┌──────────────────────────────────────────────────────────────────┐
│                     E2E Layer (NEW — Playwright)                  │
│  ┌────────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│  │  e2e/flows/    │  │  e2e/pages/      │  │  e2e/fixtures/   │  │
│  │  (test specs)  │  │  (page objects)  │  │  (test helpers)  │  │
│  └───────┬────────┘  └──────────────────┘  └──────────────────┘  │
│          │ playwright.config.ts → webServer → next build/start    │
├──────────┴───────────────────────────────────────────────────────┤
│           Existing Application (no structural changes)            │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌───────────┐  │
│  │ app/page   │  │ app/quiz   │  │ app/quiz/  │  │ app/api/  │  │
│  │ (landing)  │  │ (6-step)   │  │ success/   │  │ 3 routes  │  │
│  └────────────┘  └────────────┘  └────────────┘  └───────────┘  │
├──────────────────────────────────────────────────────────────────┤
│       Unit/Integration Layer (Vitest — already exists)            │
│  ┌───────────────────┐  ┌──────────────────────────────────────┐  │
│  │ src/**/*.test.tsx │  │ src/app/api/**/route.test.ts         │  │
│  │ component tests   │  │ API handler tests, vi.mock pattern   │  │
│  └───────────────────┘  └──────────────────────────────────────┘  │
├──────────────────────────────────────────────────────────────────┤
│              Performance Layer (NEW — build-time tooling)         │
│  ┌──────────────┐  ┌─────────────────┐  ┌─────────────────────┐  │
│  │ @next/bundle │  │ next/dynamic    │  │ useReportWebVitals  │  │
│  │  -analyzer   │  │ (lazy loading)  │  │ (CWV monitoring)    │  │
│  └──────────────┘  └─────────────────┘  └─────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Status |
|-----------|----------------|--------|
| `e2e/flows/` | Full user journey test specs | NEW — one file per major flow |
| `e2e/pages/` | Page Object Model classes | NEW — wraps Playwright `page` per page |
| `e2e/fixtures/` | Shared test setup, pre-filled quiz data | NEW |
| `playwright.config.ts` | Browser targets, webServer, baseURL, reporters | NEW — at project root |
| `vitest.config.ts` | Unit/integration runner | MODIFY — add `exclude: ['e2e/**']` |
| `next.config.ts` | Next.js build config | MODIFY — add `withBundleAnalyzer` wrapper |
| `package.json` | Build/test scripts | MODIFY — add `test:e2e`, `test:unit`, `analyze` scripts |

---

## Recommended Project Structure

```
/ (project root)
├── e2e/                              # NEW — Playwright lives outside src/
│   ├── flows/                        # NEW — one spec file per user flow
│   │   ├── landing.spec.ts           # Landing page render, CTAs navigate to /quiz
│   │   ├── quiz-happy-path.spec.ts   # Full funnel: landing → quiz → success
│   │   ├── quiz-validation.spec.ts   # Step validation errors (no API needed)
│   │   ├── quiz-error-states.spec.ts # Generation failure / timeout states
│   │   └── api-smoke.spec.ts         # API route smoke tests (gated on pod health)
│   ├── pages/                        # NEW — Page Object Models
│   │   ├── LandingPage.ts            # Landing POM: locators, CTA click
│   │   ├── QuizPage.ts               # Quiz POM: step navigation, field fill
│   │   └── SuccessPage.ts            # Success POM: wait for player, download
│   └── fixtures/                     # NEW — Playwright fixture extensions
│       └── index.ts                  # Extended test object with pre-filled quiz data
├── playwright.config.ts              # NEW — at project root
├── src/
│   ├── app/
│   │   ├── layout.tsx                # OPTIONAL MODIFY: add useReportWebVitals
│   │   ├── page.tsx                  # unchanged
│   │   ├── quiz/
│   │   │   ├── page.tsx              # unchanged
│   │   │   └── _components/         # *.test.tsx already exist (Vitest)
│   │   └── api/
│   │       ├── quiz-generate/
│   │       │   ├── route.ts          # unchanged
│   │       │   └── route.test.ts     # already exists — 14 tests
│   │       ├── poll-job/[jobId]/
│   │       │   ├── route.ts          # unchanged
│   │       │   └── route.test.ts     # ADD — missing unit tests
│   │       └── audio/[jobId]/
│   │           ├── route.ts          # unchanged
│   │           └── route.test.ts     # ADD — missing unit tests
│   └── lib/
│       └── heartmula.ts              # unchanged — tested via vi.mock
├── next.config.ts                    # MODIFY — withBundleAnalyzer wrapper
├── vitest.config.ts                  # MODIFY — exclude e2e/**
└── package.json                      # MODIFY — scripts
```

### Structure Rationale

- **`e2e/` at project root (not inside `src/`):** Playwright tests are not part of the application source. They test the running application from the outside. Keeping them outside `src/` makes the Vitest exclusion trivial (`exclude: ['e2e/**']`) and signals clearly that these files are test infrastructure, not shipped code. This matches the official Next.js Playwright documentation pattern.

- **`e2e/pages/` Page Object Models:** The quiz funnel has 6 steps, 3 pages, and multiple specs that share the same interactions. POMs eliminate locator duplication across specs — if a button label changes, one class update fixes all tests. POM is justified once two or more specs share the same page interactions, which is the case here immediately.

- **`e2e/fixtures/`:** Playwright fixtures provide dependency injection for setup/teardown. A pre-filled quiz fixture lets integration specs skip the 6-step fill when testing post-quiz behavior. Faster tests, less noise.

- **Route tests co-located with routes:** The existing pattern in this codebase is `route.test.ts` next to `route.ts`. Two API routes (`poll-job` and `audio`) are missing their unit tests. They should be added in the same location following the exact pattern established in `quiz-generate/route.test.ts`.

---

## Architectural Patterns

### Pattern 1: Playwright webServer Integration

**What:** `playwright.config.ts` uses the `webServer` option to automatically run `npm run start` before the test suite and tear it down after. Tests always run against a production build.

**When to use:** Always — this is the official Next.js recommendation and what the documentation prescribes. Playwright needs a server to test against; manual server management in CI is fragile.

**Trade-offs:** Requires `next build` before `playwright test`. Adds ~45–90s to CI per run. Worth it — dev server has different behavior (no minification, different hydration). Tests that pass on dev but fail in production are worse than slow CI.

**Example:**
```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'Mobile Chrome', use: { ...devices['Pixel 5'] } },
  ],
  webServer: {
    command: 'npm run start',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI, // reuse local server during development
  },
});
```

**package.json scripts to add:**
```json
{
  "scripts": {
    "test:unit":  "vitest run",
    "test:e2e":   "playwright test",
    "test:all":   "npm run test:unit && npm run test:e2e",
    "analyze":    "ANALYZE=true npm run build"
  }
}
```

### Pattern 2: Page Object Model for Quiz Funnel

**What:** Each page in the funnel gets a TypeScript POM class that wraps Playwright's `page` object. Specs call page methods (`await quiz.fillStep1('Mom', 'Sarah')`) not raw locators.

**When to use:** Any spec that navigates more than one page step. With 6 quiz steps, a success page, and multiple specs testing different paths through the same UI, POM is essential.

**Trade-offs:** Small upfront cost to write the POM. Pays back immediately because multiple specs share the same interactions. Locator changes require editing one class, not every spec.

**Example:**
```typescript
// e2e/pages/QuizPage.ts
import { type Page, type Locator } from '@playwright/test';

export class QuizPage {
  readonly page: Page;
  readonly nextButton: Locator;
  readonly backButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.nextButton = page.getByRole('button', { name: /next/i });
    this.backButton = page.getByRole('button', { name: /back/i });
  }

  async goto() {
    await this.page.goto('/quiz');
  }

  async fillStep1(relationshipType: string, recipientName: string) {
    await this.page.getByText(relationshipType).click();
    await this.page.getByPlaceholder('Their first name').fill(recipientName);
    await this.nextButton.click();
  }

  async selectGenre(genre: string) {
    await this.page.getByText(genre).click();
    await this.nextButton.click();
  }

  async fillTextStep(text: string) {
    await this.page.locator('textarea').fill(text);
    await this.nextButton.click();
  }

  async fillStep6AndSubmit(language: string) {
    await this.page.getByText(language).click();
    await this.page.getByRole('button', { name: /create my song/i }).click();
  }
}
```

```typescript
// e2e/pages/SuccessPage.ts
import { type Page } from '@playwright/test';

export class SuccessPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async waitForSongReady(timeoutMs = 60_000) {
    // Wait for the audio player to appear — indicates polling completed
    await this.page.getByTestId('song-player').waitFor({
      state: 'visible',
      timeout: timeoutMs,
    });
  }

  async waitForLoadingState() {
    await this.page.getByText(/creating your song/i).waitFor({ state: 'visible' });
  }

  async isDownloadLinkPresent() {
    return this.page.getByRole('link', { name: /download song/i }).isVisible();
  }
}
```

### Pattern 3: Two-Level API Testing Strategy

**What:** API routes are tested at two distinct levels with different purposes:
1. **Vitest unit tests** (already exist for `quiz-generate`, need adding for `poll-job` and `audio`): mock all external calls with `vi.mock()`, test route logic in isolation, run in <100ms, no server needed.
2. **Playwright E2E smoke tests** (`e2e/flows/api-smoke.spec.ts`): hit real endpoints through a running server, verify connectivity to the RunPod A40 pod. Gated behind an environment check.

**When to use:** Unit tests for every route, always. Smoke tests only when pod connectivity must be confirmed — not on every PR.

**Trade-offs:** Two test strategies for the same routes. Necessary because Vitest cannot test real network behavior and Playwright smoke tests are environment-dependent (pod must be running).

**Example — unit test for missing route (poll-job):**
```typescript
// src/app/api/poll-job/[jobId]/route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Mock } from 'vitest';

vi.mock('@/lib/heartmula', () => ({
  queryJobStatus: vi.fn(),
}));

import { GET } from './route';
import { queryJobStatus } from '@/lib/heartmula';

function makeRequest(jobId: string): Request {
  return new Request(`http://localhost/api/poll-job/${jobId}`);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/poll-job/[jobId]', () => {
  it('returns status from queryJobStatus', async () => {
    (queryJobStatus as Mock).mockResolvedValue({
      status: 'COMPLETED',
      audio_path: '/jobs/abc/output.mp3',
    });
    const res = await GET(makeRequest('abc') as Parameters<typeof GET>[0], {
      params: Promise.resolve({ jobId: 'abc' }),
    });
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(body.status).toBe('COMPLETED');
  });

  it('returns QUEUED when queryJobStatus throws (transient error)', async () => {
    (queryJobStatus as Mock).mockRejectedValue(new Error('network error'));
    const res = await GET(makeRequest('xyz') as Parameters<typeof GET>[0], {
      params: Promise.resolve({ jobId: 'xyz' }),
    });
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(body.status).toBe('QUEUED');
  });
});
```

**Example — E2E smoke test (gated on pod availability):**
```typescript
// e2e/flows/api-smoke.spec.ts
import { test, expect } from '@playwright/test';

test.describe('API smoke tests', () => {
  // Skip entire suite if pod not configured
  test.skip(!process.env.HEARTMULA_URL, 'HeartMuLa pod URL not set');

  test('GET /api/poll-job/:jobId returns status without 500', async ({ request }) => {
    const response = await request.get('/api/poll-job/unknown-job-id');
    // Route should return QUEUED for unknown IDs (graceful fallback), never 5xx
    expect(response.status()).toBeLessThan(500);
    const body = await response.json();
    expect(body).toHaveProperty('status');
  });
});
```

### Pattern 4: Generation Test with Time Budget

**What:** The happy path E2E test submits a real quiz and waits for generation to complete. It must set an explicit `test.setTimeout` higher than the default 30s because generation takes ~10s plus polling intervals.

**When to use:** For the full happy path spec only. Other specs should mock the generation step or test only the UI states.

**Trade-offs:** Long-running test (up to ~20s). Run it in its own Playwright project or CI job to avoid blocking fast feedback.

**Example:**
```typescript
// e2e/flows/quiz-happy-path.spec.ts
import { test, expect } from '@playwright/test';
import { QuizPage } from '../pages/QuizPage';
import { SuccessPage } from '../pages/SuccessPage';

test('full funnel: quiz to song delivery', async ({ page }) => {
  test.setTimeout(90_000); // generation + polling can take 20-30s

  const quiz = new QuizPage(page);
  const success = new SuccessPage(page);

  await quiz.goto();
  await quiz.fillStep1('Mom', 'Sarah');
  await quiz.selectGenre('Pop');
  await quiz.fillTextStep('caring and patient');
  await quiz.fillTextStep('Sunday morning pancakes');
  await quiz.fillTextStep('Thank you for everything');
  await quiz.fillStep6AndSubmit('English');

  // After submission, should land on success page with loading state
  await success.waitForLoadingState();

  // Poll resolves — song player should appear
  await success.waitForSongReady(60_000);

  // Verify key success-state elements
  expect(await success.isDownloadLinkPresent()).toBe(true);
  await expect(page).toHaveURL(/\/quiz\/success\/.+/);
});
```

### Pattern 5: Bundle Analyzer as On-Demand Tool

**What:** `@next/bundle-analyzer` wraps `next.config.ts` behind an env var. Zero overhead when not active. Generates three HTML reports: `client.html`, `nodejs.html`, `edge.html` in `.next/analyze/`.

**When to use:** Before any "reduce bundle size" optimization work. Run once, identify the largest client-side dependencies, then target them with `next/dynamic`.

**Trade-offs:** Requires an extra install. The env-var gate ensures zero production impact.

**Example:**
```typescript
// next.config.ts (modified from current single-line config)
import type { NextConfig } from 'next';
import withBundleAnalyzer from '@next/bundle-analyzer';

const analyze = withBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

const nextConfig: NextConfig = {
  serverExternalPackages: ['ffmpeg-static'],
};

export default analyze(nextConfig);
```

```bash
# Run once to analyze, then open .next/analyze/client.html
ANALYZE=true npm run build
```

**Key candidates in this codebase for lazy loading:**
- `framer-motion` — used in quiz step transitions and success page animations. Heavy on initial load.
- `canvas-confetti` — only needed on the success ready state (not loading/error states).
- Landing page sections — HeroSection, TestimonialsSection, VideoSection are below the fold and can be lazy-loaded.

---

## Data Flow

### E2E Test Execution Flow

```
Developer / CI runs: npm run build
                          ↓
playwright test
                          ↓
playwright.config.ts: webServer starts → npm run start (port 3000)
                          ↓
Playwright Chromium → GET http://localhost:3000/
                          ↓
Test: click "Create a Song" CTA → navigate to /quiz
                          ↓
QuizPage POM: fill 6 steps → click "Create My Song"
                          ↓
Browser: POST /api/quiz-generate → Next.js API route
             → heartmula.ts → submitGenerationJob() → RunPod A40 (real)
             ← { jobId: "abc-123" }
                          ↓
Browser: redirect → /quiz/success/abc-123
                          ↓
SuccessPage: polls GET /api/poll-job/abc-123 every 2s
              → heartmula.ts → queryJobStatus() → RunPod A40
              ← { status: "COMPLETED" }
                          ↓
Browser: GET /api/audio/abc-123 (audio proxy)
              → heartmula.ts → fetchAudioBuffer() → RunPod download
              ← MP3 buffer → audio/mpeg response
                          ↓
Playwright asserts: song-player visible, download link present
```

### Unit Test Isolation Flow (Vitest — existing and new)

```
Vitest runner (jsdom environment, no server)
                ↓
vi.mock('@/lib/heartmula') — replaces all HTTP calls with stubs
vi.mock('@/lib/quiz-prompt') — controls prompt conversion output
                ↓
Import route handler directly: import { POST } from './route'
                ↓
Call handler with synthetic Request objects (standard Web API)
                ↓
Assert response.status and response.json() shape
                ↓
No network, no Next.js server, runs in <150ms per test file
```

### Performance Measurement Flow

```
User loads page in production
      ↓
next/font: DM Sans + Libre Baskerville
  font-display: swap already configured in layout.tsx
  → zero FOIT, graceful text rendering during font load
      ↓
Server Components render HTML: landing sections, Header, Footer
  → full HTML delivered in first response
  → zero client JS for non-interactive landing sections
      ↓
Client hydration: quiz page (framer-motion, Zod validation)
  → target: hydration completes before user scrolls to CTA
      ↓
useReportWebVitals (if added to layout.tsx)
  → captures LCP, INP, CLS from real browser
  → sends to console or analytics endpoint
      ↓
Lighthouse CI or manual PageSpeed audit → verify CWV thresholds
  LCP < 2.5s, INP < 200ms, CLS < 0.1
```

---

## Integration Points

### New Files and Their Integration with Existing Code

| New File | Integrates With | Integration Method |
|----------|-----------------|--------------------|
| `playwright.config.ts` | `package.json` scripts | `test:e2e` script calls `playwright test` |
| `playwright.config.ts` | Next.js build | `webServer` starts `npm run start` on port 3000 |
| `e2e/pages/LandingPage.ts` | `src/app/page.tsx` | Targets rendered HTML via Playwright locators |
| `e2e/pages/QuizPage.ts` | `src/app/quiz/page.tsx` | Fills inputs rendered by quiz step components |
| `e2e/pages/SuccessPage.ts` | `src/app/quiz/success/[jobId]/page.tsx` | Waits for polling resolution, asserts player |
| `e2e/flows/quiz-happy-path.spec.ts` | All three API routes + RunPod A40 | Real HTTP through Next.js server |
| `src/app/api/poll-job/[jobId]/route.test.ts` | `poll-job/route.ts`, `heartmula.ts` | vi.mock pattern, same as quiz-generate |
| `src/app/api/audio/[jobId]/route.test.ts` | `audio/route.ts`, `heartmula.ts` | vi.mock pattern, same as quiz-generate |

### Modified Files (Minimal Changes)

| Existing File | Change | Why |
|---------------|--------|-----|
| `vitest.config.ts` | Add `exclude: ['e2e/**']` to `test` config block | Prevent Vitest from picking up Playwright specs and failing on Playwright imports |
| `next.config.ts` | Wrap export with `withBundleAnalyzer({ enabled: process.env.ANALYZE === 'true' })` | On-demand bundle analysis; zero production impact |
| `package.json` | Add `test:unit`, `test:e2e`, `test:all`, `analyze` scripts | CI and developer ergonomics |
| `src/app/layout.tsx` | Optionally add `useReportWebVitals` call | CWV reporting — only if an analytics sink is available; defer if not |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Playwright tests ↔ Next.js app | HTTP only (localhost:3000) | No direct imports between `e2e/` and `src/` — ever |
| Playwright tests ↔ RunPod A40 | Via Next.js API routes only | Tests never call HeartMuLa directly |
| Vitest tests ↔ `heartmula.ts` | `vi.mock('@/lib/heartmula')` | No real HTTP in unit tests |
| Bundle analyzer ↔ Next.js build | Webpack plugin via `next.config.ts` wrapper | Zero runtime impact — build-time only |

---

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| v4.0 testing (now) | No test database needed — funnel has no DB writes. Playwright tests the live RunPod A40 pod. |
| After payments (v5.0+) | Add test Supabase project for E2E. Add DB seeding fixtures to `e2e/fixtures/`. Add test Stripe webhook key. |
| High traffic / load testing | Add k6 or Artillery targeting `/api/quiz-generate`. Test RunPod queue behavior under concurrent submissions. |

### Scaling Priorities

1. **First bottleneck is the audio proxy.** `GET /api/audio/[jobId]` downloads the full MP3 buffer into Node.js memory and streams it to the browser. At low traffic this is fine. At higher traffic, replace with a redirect to a presigned R2 URL so audio bytes never touch the Next.js server.

2. **Second bottleneck is the test suite itself.** Happy path E2E tests hit a real RunPod pod. If multiple CI runs execute simultaneously, generation jobs pile up in the HeartMuLa queue. Use `workers: 1` in CI Playwright config to serialize E2E runs.

---

## Anti-Patterns

### Anti-Pattern 1: Running Playwright Against the Dev Server

**What people do:** Set `webServer.command` to `npm run dev` because it starts faster than a production build.

**Why it's wrong:** Dev server has different behavior: no minification, different hydration behavior, source maps, and development-mode React. Tests that pass on the dev server can fail in production builds. Font loading, Server Component streaming, and dynamic imports behave differently between the two.

**Do this instead:** Always `npm run build` then `npm run start`. Use `reuseExistingServer: !process.env.CI` in `playwright.config.ts` so during local development you can keep a prod server running across multiple test runs without rebuilding.

### Anti-Pattern 2: Mixing Vitest and Playwright Test Files in the Same Directory

**What people do:** Put `*.spec.ts` files alongside `*.test.ts` files in `src/`, or forget to exclude `e2e/` from `vitest.config.ts`.

**Why it's wrong:** Vitest picks up Playwright test files and tries to run them in jsdom — fails because Playwright APIs don't exist in that environment. Playwright picks up Vitest tests and tries to run them against the browser — fails on server-only Next.js imports. Both runners report false failures that obscure real issues.

**Do this instead:** All Playwright tests live in `e2e/` at the project root. Add `exclude: ['e2e/**']` to the `test` block in `vitest.config.ts`. Playwright's `testDir: './e2e'` already isolates its scope.

### Anti-Pattern 3: Testing Generation Poll Loop Without a Time Budget

**What people do:** Write a Playwright test that submits the quiz and waits for generation with the default test timeout (30s in Playwright).

**Why it's wrong:** Generation takes ~7–10s. Add two polling intervals plus server startup time and you're close to 30s even on a healthy pod. Under queue pressure (multiple CI jobs hitting the same pod) you'll regularly exceed 30s. These failures look like application bugs when they're actually timeout configuration issues.

**Do this instead:** Set `test.setTimeout(90_000)` on the happy path generation spec. Use `waitForSongReady(60_000)` with an explicit timeout argument in the SuccessPage POM. Add a separate `quiz-happy-path.spec.ts` Playwright project in `playwright.config.ts` with a different timeout budget.

### Anti-Pattern 4: Using Playwright to Cover What Vitest Already Tests

**What people do:** Write E2E tests to verify that quiz validation error messages appear for each step, or that `POST /api/quiz-generate` returns 400 for missing fields.

**Why it's wrong:** This codebase already has 14 Vitest tests for `quiz-generate/route.ts` and step-level component tests for all 6 quiz steps. Replicating this coverage in Playwright means booting a browser for behavior that is already tested faster and more precisely at the unit level. Each duplicate E2E test adds ~5–10s to the test run.

**Do this instead:** Rely on Vitest for validation logic, API contract behavior, and component rendering. Use Playwright only for integration concerns: Does navigation between pages work? Does the browser correctly handle 502 errors from the API? Does the polling state machine display the right UI state when the job completes?

### Anti-Pattern 5: `data-testid` on Every Element

**What people do:** Add `data-testid="step-1-relationship"` to every interactive element as the first thing when setting up testing.

**Why it's wrong:** `data-testid` attributes add test-only noise to the production HTML and create tight coupling between tests and implementation. They become stale when component structure changes. The Playwright best practices guide recommends using role-based locators (`getByRole`, `getByLabel`, `getByText`) as the primary strategy — these test the same attributes that assistive technologies use, so they also verify accessibility.

**Do this instead:** Use `getByRole('button', { name: /create my song/i })`, `getByPlaceholder('Their first name')`, `getByText('Pop')`. Reserve `data-testid` only for elements with no semantic role that must be targeted by tests — such as the `SongPlayer` component wrapper that has no natural ARIA role.

---

## Build Order for Test Infrastructure (Dependency-Ordered)

The following order respects technical dependencies and minimizes rework:

**Step 1 — Vitest config update (zero risk, zero dependencies)**
Add `exclude: ['e2e/**']` to `vitest.config.ts`. Existing Vitest tests continue to pass. Prepares for E2E directory creation without conflicts.

**Step 2 — Missing Vitest route tests (zero new dependencies)**
Add `poll-job/[jobId]/route.test.ts` and `audio/[jobId]/route.test.ts` following the exact pattern in `quiz-generate/route.test.ts`. These use `vi.mock` and require no server. Closes the unit test gap before adding E2E infrastructure.

**Step 3 — Playwright install and config (infrastructure only)**
Run `npm init playwright`. Create `playwright.config.ts` with `webServer` pointing at `npm run start`. Add package.json scripts. Install browsers via `npx playwright install`. No test files written yet — just the harness. Verify `npx playwright test --list` shows zero tests (no errors).

**Step 4 — Page Object Models (no specs yet)**
Write `LandingPage.ts`, `QuizPage.ts`, `SuccessPage.ts` in `e2e/pages/`. No test specs yet. This step validates the POM API design before the first spec references it. Locators can be verified manually by running `npx playwright codegen localhost:3000` to confirm selectors.

**Step 5 — Smoke E2E specs (no external services)**
Write `landing.spec.ts` (page load, CTA navigation to /quiz — no API). Write `quiz-validation.spec.ts` (step validation errors — no API call). These specs run fast and verify the UI layer in isolation before touching the generation pipeline.

**Step 6 — Full happy path spec**
Write `quiz-happy-path.spec.ts`. This is the first spec that hits the real RunPod A40 pod. Set `test.setTimeout(90_000)`. Requires pod is running. This is the highest-value test in the suite.

**Step 7 — Error state specs**
Write `quiz-error-states.spec.ts`. Test what happens when `/api/quiz-generate` returns 502 (use `page.route()` to intercept and mock the response). Test the timeout state (advance time or mock polling to always return QUEUED). These specs can run fast because they use Playwright's network interception, not real API calls.

**Step 8 — Bundle analyzer + optimization**
Install `@next/bundle-analyzer`. Modify `next.config.ts`. Run `ANALYZE=true npm run build`. Identify large client-side packages. Apply `next/dynamic` to the candidates: framer-motion animation blocks, canvas-confetti (only needed when `pageState === 'ready'`), below-fold landing sections.

---

## Sources

- [Next.js Playwright Testing Guide](https://nextjs.org/docs/app/guides/testing/playwright) — official, updated 2026-02-27 — HIGH confidence
- [Playwright Best Practices](https://playwright.dev/docs/best-practices) — official Playwright documentation — HIGH confidence
- [Playwright Page Object Models](https://playwright.dev/docs/pom) — official — HIGH confidence
- [Next.js Bundle Analyzer / Package Bundling](https://nextjs.org/docs/app/guides/package-bundling) — official — HIGH confidence
- [Next.js Lazy Loading](https://nextjs.org/docs/app/guides/lazy-loading) — official — HIGH confidence
- Codebase: `vitest.config.ts` — confirms jsdom environment, `@` alias, `src/test-setup.ts` setup file
- Codebase: `src/app/api/quiz-generate/route.test.ts` — confirms vi.mock pattern for route testing
- Codebase: `src/app/quiz/_components/Step1Relationship.test.tsx` — confirms RTL/vitest component test pattern
- Codebase: `package.json` — confirms vitest + @testing-library/react already installed; playwright NOT yet installed
- Codebase: `next.config.ts` — confirms bare config, no existing analyzer wrapper
- [Core Web Vitals optimization in Next.js 2025](https://makersden.io/blog/optimize-web-vitals-in-nextjs-2025) — community, MEDIUM confidence

---

*Architecture research for: Notevra v4.0 — testing and optimization integration with Next.js App Router*
*Researched: 2026-03-06*
