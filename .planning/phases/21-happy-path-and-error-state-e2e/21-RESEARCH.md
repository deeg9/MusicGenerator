# Phase 21: Happy Path and Error State E2E — Research

**Researched:** 2026-03-06
**Domain:** Playwright E2E — route interception, generation polling, error state UI
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| E2E-05 | Full happy path: quiz completion → generation → success page with audio | Success page polling flow fully audited; `POD_AVAILABLE` gate from global-setup; `test.setTimeout(120_000)` for real generation; audio element is `<audio src="/api/audio/[jobId]">` inside SongPlayer |
| E2E-06 | Error state: generation failure shows user-friendly error | `pageState === 'error'` branch renders h1 "Something went wrong creating your song" with "Try Again" button linking to /quiz; trigger by mocking `/api/poll-job/*` to return `{"status":"FAILED","error":null}` |
| E2E-07 | Error state: pod offline handled gracefully | `pageState === 'pod-down'` branch renders h1 "Our servers are temporarily offline" with "Start Over" button; trigger by mocking `/api/quiz-generate` to return 502 with `{"error":{"category":"gpu_unavailable",...}}` |
</phase_requirements>

---

## Summary

Phase 21 writes three E2E specs using the POM infrastructure and error-handling code built in Phases 19 and 20. The happy path test (E2E-05) must hit the real A40 pod because `page.route()` cannot intercept server-side Next.js-to-HeartMuLa fetches — this is a confirmed architectural constraint from Phase 18. It uses the `POD_AVAILABLE` environment variable from `global-setup.ts` to conditionally run or skip. The two error state tests (E2E-06, E2E-07) use `page.route()` to intercept the browser's calls to `/api/poll-job/*` and `/api/quiz-generate` respectively — these are same-origin XHR/fetch calls that Playwright CAN intercept.

The success page (`/quiz/success/[jobId]/page.tsx`) has four distinct UI states: `loading`, `ready`, `error`, and `pod-down`. Each renders a unique `<h1>` heading that serves as the anchor for E2E assertions. The SuccessPage POM stub from Phase 20 already has `loadingHeading`, `readyHeading`, `audioPlayer`, and `downloadButton` locators; it needs `errorHeading` and `podDownHeading` locators added to cover the two error states.

The happy path test navigates through all 6 quiz steps, clicks "Create My Song", waits for navigation to `/quiz/success/[jobId]`, waits up to 120s for the "Your song is ready!" heading, then asserts on the audio element and download link. Error state tests navigate directly to a fake success URL with a mocked API route already in place, then assert the correct recovery UI appears without an infinite spinner.

**Primary recommendation:** Gate E2E-05 on `POD_AVAILABLE === 'true'`; use `page.route()` mocks for E2E-06 and E2E-07 so they run unconditionally and finish in under 10 seconds.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @playwright/test | ^1.58.2 (installed) | Route mocking, assertions, test runner | Already installed; `page.route()` built-in — no extra packages needed |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| None new | — | No new packages required | All tooling is in place from Phase 18 |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `page.route()` mock on `/api/poll-job/*` | Real pod + forced FAILED status | Mocking is faster, unconditional, deterministic; real pod cannot reliably simulate FAILED |
| Direct navigation to `/quiz/success/fake-id` | Full quiz traversal before error test | Direct nav is faster; error tests don't need a real quiz traversal |
| `test.skip()` inside test body | `test.fixme()` | `test.skip(condition, reason)` at top of test is cleaner for conditional pod-availability gates |

**Installation:**
```bash
# Nothing to install — @playwright/test 1.58.2 already in devDependencies
```

---

## Architecture Patterns

### Recommended Project Structure
```
e2e/
├── pages/
│   ├── landing.ts              # exists (Phase 20)
│   ├── quiz.ts                 # exists (Phase 20)
│   └── success.ts              # exists (Phase 20) — needs errorHeading + podDownHeading added
├── fixtures.ts                 # exists (Phase 20)
├── happy-path.spec.ts          # NEW — E2E-05
├── error-states.spec.ts        # NEW — E2E-06 + E2E-07
├── landing.spec.ts             # exists (Phase 20)
├── quiz-validation.spec.ts     # exists (Phase 20)
├── quiz-navigation.spec.ts     # exists (Phase 20)
└── smoke.spec.ts               # exists (Phase 18)
```

Two spec files: one for the real-pod happy path (conditional), one for error states (always runs via mocking).

### Pattern 1: POD_AVAILABLE Gate for Real-Pod Tests
**What:** Skip generation tests when the A40 pod is unreachable — prevents flaky failures
**When to use:** Any test that hits the real HeartMuLa pod (E2E-05)

```typescript
// e2e/happy-path.spec.ts
// Source: global-setup.ts sets POD_AVAILABLE; process.env accessible in Playwright workers
import { test, expect } from '@playwright/test';
import { QuizPage } from './pages/quiz';
import { SuccessPage } from './pages/success';
import { VALID_QUIZ_DATA, STEP_HEADINGS } from './fixtures';

test.describe('Happy Path E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Clear quiz state to ensure clean run
    await page.goto('/quiz');
    await page.evaluate(() => localStorage.clear());
  });

  test('full funnel: quiz → generation → success page with audio', async ({ page }) => {
    // Skip if pod is unavailable
    test.skip(
      process.env.POD_AVAILABLE !== 'true',
      'A40 pod not reachable — skipping generation test',
    );

    // Set long timeout — generation takes up to 60s
    test.setTimeout(120_000);

    const quiz = new QuizPage(page);
    const success = new SuccessPage(page);

    // Traverse all 6 steps with valid data
    await quiz.goto();
    await quiz.selectOption(VALID_QUIZ_DATA.relationshipType);
    await quiz.step1NameInput.fill(VALID_QUIZ_DATA.recipientName);
    await quiz.clickNext();

    await expect(quiz.getStepHeading(STEP_HEADINGS[1])).toBeVisible();
    await quiz.selectOption(VALID_QUIZ_DATA.genre);
    await quiz.clickNext();

    await expect(quiz.getStepHeading(STEP_HEADINGS[2])).toBeVisible();
    await quiz.step3TextArea.fill(VALID_QUIZ_DATA.qualities);
    await quiz.clickNext();

    await expect(quiz.getStepHeading(STEP_HEADINGS[3])).toBeVisible();
    await quiz.step4TextArea.fill(VALID_QUIZ_DATA.memories);
    await quiz.clickNext();

    await expect(quiz.getStepHeading(STEP_HEADINGS[4])).toBeVisible();
    await quiz.step5TextArea.fill(VALID_QUIZ_DATA.message);
    await quiz.clickNext();

    await expect(quiz.getStepHeading(STEP_HEADINGS[5])).toBeVisible();
    await expect(quiz.createSongButton).toBeVisible();

    // Click "Create My Song" — triggers POST /api/quiz-generate then navigates to success page
    await quiz.createSongButton.click();

    // Wait for navigation to /quiz/success/[jobId]
    await page.waitForURL(/\/quiz\/success\/.+/, { timeout: 30_000 });

    // Loading state should be visible initially
    await expect(success.loadingHeading).toBeVisible();

    // Wait for generation to complete (up to 90s polling)
    await expect(success.readyHeading).toBeVisible({ timeout: 90_000 });

    // Verify audio player and download link exist
    await expect(success.audioPlayer).toBeAttached();
    await expect(success.downloadButton).toBeVisible();
  });
});
```

### Pattern 2: page.route() Mock for Error States
**What:** Intercept browser-to-Next.js API calls and return controlled responses
**When to use:** E2E-06 (FAILED status), E2E-07 (pod offline / 502)
**Critical constraint:** `page.route()` intercepts BROWSER fetch calls. It CANNOT intercept server-side Next.js fetch calls to HeartMuLa. This is why error state tests mock `/api/poll-job/*` and `/api/quiz-generate` — those ARE browser-originating calls.

```typescript
// Source: https://playwright.dev/docs/network#modify-responses

// E2E-06: Mock poll-job to return FAILED status
await page.route('/api/poll-job/**', async (route) => {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ status: 'FAILED', error: null }),
  });
});

// E2E-07: Mock quiz-generate to return 502 gpu_unavailable
await page.route('/api/quiz-generate', async (route) => {
  await route.fulfill({
    status: 502,
    contentType: 'application/json',
    body: JSON.stringify({
      error: {
        category: 'gpu_unavailable',
        retryable: true,
        userMessage: 'The generation server is temporarily unavailable.',
      },
      debug: { technicalMessage: '[redacted]' },
    }),
  });
});
```

### Pattern 3: Full Error State Spec
**What:** Navigate to success page with mock routes already installed; assert error UI
**When to use:** E2E-06 and E2E-07

```typescript
// e2e/error-states.spec.ts
import { test, expect } from '@playwright/test';
import { SuccessPage } from './pages/success';
import { QuizPage } from './pages/quiz';
import { VALID_QUIZ_DATA, STEP_HEADINGS } from './fixtures';

const FAKE_JOB_ID = 'test-job-error-simulation';

test.describe('Error State E2E', () => {
  // E2E-06: Generation failure (FAILED status from poll-job)
  test('generation failure shows friendly error with retry action', async ({ page }) => {
    // Mock poll-job to return FAILED before navigating
    await page.route('/api/poll-job/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'FAILED', error: null }),
      });
    });

    const success = new SuccessPage(page);
    await success.goto(FAKE_JOB_ID, 'Maria');

    // Loading heading appears first
    await expect(success.loadingHeading).toBeVisible();

    // Error state: heading and retry button should appear
    await expect(success.errorHeading).toBeVisible({ timeout: 10_000 });
    await expect(success.tryAgainButton).toBeVisible();

    // Confirm no infinite spinner visible (loading heading gone)
    await expect(success.loadingHeading).not.toBeVisible();
  });

  // E2E-07: Pod offline (502 from quiz-generate)
  test('pod offline during quiz submit shows graceful error — not blank page', async ({ page }) => {
    // Seed quiz data into localStorage so we can test from last step
    await page.goto('/quiz');
    await page.evaluate((data) => {
      localStorage.setItem('notevra_quiz_v1', JSON.stringify(data));
    }, VALID_QUIZ_DATA);

    // Mock quiz-generate to return 502 gpu_unavailable
    await page.route('/api/quiz-generate', async (route) => {
      await route.fulfill({
        status: 502,
        contentType: 'application/json',
        body: JSON.stringify({
          error: {
            category: 'gpu_unavailable',
            retryable: true,
            userMessage: 'The generation server is temporarily unavailable.',
          },
          debug: { technicalMessage: '[redacted]' },
        }),
      });
    });

    const quiz = new QuizPage(page);
    await quiz.goto();

    // Navigate through all steps using loaded data
    await quiz.selectOption(VALID_QUIZ_DATA.relationshipType);
    await quiz.step1NameInput.fill(VALID_QUIZ_DATA.recipientName);
    await quiz.clickNext();

    await expect(quiz.getStepHeading(STEP_HEADINGS[1])).toBeVisible();
    await quiz.selectOption(VALID_QUIZ_DATA.genre);
    await quiz.clickNext();

    await expect(quiz.getStepHeading(STEP_HEADINGS[2])).toBeVisible();
    await quiz.step3TextArea.fill(VALID_QUIZ_DATA.qualities);
    await quiz.clickNext();

    await expect(quiz.getStepHeading(STEP_HEADINGS[3])).toBeVisible();
    await quiz.step4TextArea.fill(VALID_QUIZ_DATA.memories);
    await quiz.clickNext();

    await expect(quiz.getStepHeading(STEP_HEADINGS[4])).toBeVisible();
    await quiz.step5TextArea.fill(VALID_QUIZ_DATA.message);
    await quiz.clickNext();

    await expect(quiz.getStepHeading(STEP_HEADINGS[5])).toBeVisible();
    await expect(quiz.createSongButton).toBeVisible();

    // Click Create My Song — triggers the mocked 502
    await quiz.createSongButton.click();

    // Should show error state on quiz page — NOT navigate to success page
    // quiz/page.tsx renders genStatus === 'error' with error message text
    await expect(page.getByText(/temporarily unavailable/i)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('button', { name: /try again/i })).toBeVisible();

    // Confirm no unhandled exception / blank page (title not 'Error')
    await expect(page).not.toHaveTitle(/error/i);

    // Confirm still on /quiz (not navigated away)
    await expect(page).toHaveURL(/\/quiz$/);
  });
});
```

### Pattern 4: SuccessPage POM Extension
**What:** Add error state locators to the existing SuccessPage POM
**When to use:** Phase 21 before writing error-states.spec.ts

```typescript
// e2e/pages/success.ts — extended for Phase 21
import { type Page, type Locator } from '@playwright/test';

export class SuccessPage {
  readonly page: Page;

  // Existing (Phase 20)
  readonly loadingHeading: Locator;
  readonly readyHeading: Locator;
  readonly audioPlayer: Locator;
  readonly downloadButton: Locator;

  // NEW — Phase 21 error states
  readonly errorHeading: Locator;       // 'Something went wrong creating your song'
  readonly podDownHeading: Locator;     // 'Our servers are temporarily offline'
  readonly tryAgainButton: Locator;     // links back to /quiz on error state
  readonly startOverButton: Locator;    // 'Start Over' button on pod-down state

  constructor(page: Page) {
    this.page = page;

    this.loadingHeading = page.getByRole('heading', { name: /creating your song/i });
    this.readyHeading = page.getByRole('heading', { name: /your song is ready/i });
    this.audioPlayer = page.locator('audio');
    this.downloadButton = page.getByRole('link', { name: /download/i });

    // Error states (from success page.tsx source audit)
    this.errorHeading = page.getByRole('heading', {
      name: /something went wrong creating your song/i,
    });
    this.podDownHeading = page.getByRole('heading', {
      name: /our servers are temporarily offline/i,
    });
    this.tryAgainButton = page.getByRole('button', { name: /try again/i });
    this.startOverButton = page.getByRole('button', { name: /start over/i });
  }

  async goto(jobId: string, name?: string) {
    const url = name
      ? `/quiz/success/${jobId}?name=${encodeURIComponent(name)}`
      : `/quiz/success/${jobId}`;
    await this.page.goto(url);
  }
}
```

### Pattern 5: Loading State Assertion Before Error State
**What:** Assert the loading heading IS visible first, then wait for it to transition to error
**When to use:** All error state tests that navigate to `/quiz/success/[jobId]`
**Why:** If you skip asserting the loading state first, the test has no evidence the page actually entered the polling loop before the mock kicked in. A heading assertion for the loading state proves the page rendered before the error state appeared.

```typescript
// Correct: assert loading first, then error
await expect(success.loadingHeading).toBeVisible();
await expect(success.errorHeading).toBeVisible({ timeout: 10_000 });

// Wrong: jumping straight to error without loading proof
await expect(success.errorHeading).toBeVisible({ timeout: 10_000 });
```

### Anti-Patterns to Avoid
- **Mocking server-side fetch:** `page.route('/heartmula-url/*', ...)` — HeartMuLa calls come from the Next.js server process, not the browser. `page.route()` only intercepts browser-originating requests. This is confirmed from STATE.md.
- **Using `page.waitForTimeout()`:** Never sleep in test code. Use `await expect(locator).toBeVisible({ timeout: N })`.
- **Asserting audio `src` directly:** The `audioPlayer` is a hidden `<audio>` element inside `SongPlayer`. Its `src` points to `/api/audio/[jobId]`. For the happy path, assert `.toBeAttached()` (element in DOM) not `.toBeVisible()` — native `<audio>` has no visual presence.
- **Forgetting `test.setTimeout` on happy path:** The default Playwright timeout is 30s. Generation takes up to 60s. Without `test.setTimeout(120_000)`, the test will time out waiting for `readyHeading`.
- **Not clearing localStorage before happy path:** If a previous test seeded quiz data, the quiz may start from a pre-filled state. Always clear localStorage in `beforeEach`.
- **Running error state tests without mocking first:** `page.route()` must be called before `page.goto()` for the mock to be active when the page loads.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| API response mocking | Custom mock server | `page.route()` | Built-in; operates in browser context; zero config |
| Waiting for URL change after quiz submit | `page.waitForSelector('/quiz/success')` | `page.waitForURL(/\/quiz\/success\/.+/)` | URL-based wait is faster and more specific than DOM polling |
| Polling state detection | Timer-based wait | `expect(heading).toBeVisible({ timeout: 90_000 })` | Playwright auto-retries; no sleep needed |
| Glob-like route matching | Complex regex | `/api/poll-job/**` glob pattern in `page.route()` | Playwright supports glob patterns natively in route matching |

---

## Common Pitfalls

### Pitfall 1: E2E-07 Error Appears on Quiz Page, Not Success Page
**What goes wrong:** Test navigates to success page looking for pod-down error, but the error actually renders on `/quiz` (the `genStatus === 'error'` overlay in `quiz/page.tsx`).
**Why it happens:** When `/api/quiz-generate` returns 502, the quiz page catches it in `handleCreate()` and sets `genStatus = 'error'` — it does NOT navigate to the success page at all. The user never leaves `/quiz`.
**How to avoid:** E2E-07 must assert on the quiz page's error overlay (`page.getByText(/temporarily unavailable/i)`) and confirm `page.url()` still matches `/quiz`, not navigate to a success URL.
**Warning signs:** Test navigates to `/quiz/success/...` expecting pod-down UI that's actually on `/quiz`.

### Pitfall 2: page.route() Not Active Before Page Navigation
**What goes wrong:** `page.route()` mock does not intercept requests because the route was registered after the page already navigated.
**Why it happens:** `page.route()` is only active for requests initiated AFTER the route is registered.
**How to avoid:** Always call `await page.route(...)` BEFORE `await page.goto(...)` or `await success.goto(...)`.
**Warning signs:** Test goes into real polling loop instead of hitting mock; test times out or hits real API.

### Pitfall 3: audio Element Not Visible But Should Be Attached
**What goes wrong:** `await expect(success.audioPlayer).toBeVisible()` fails even when the audio is playing correctly.
**Why it happens:** `SongPlayer` renders `<audio>` with no width/height and no visible UI — the custom player UI wraps it but the `<audio>` element itself has no rendered pixels.
**How to avoid:** Use `toBeAttached()` for the audio element existence check. Use role/label selectors for the play button: `page.getByRole('button', { name: /play/i })`.
**Warning signs:** `toBeVisible()` fails on the audio locator even on a working success page.

### Pitfall 4: FAILED Status Returns Immediately — Loading Assertion Races
**What goes wrong:** By the time the loading heading assertion runs, the page has already transitioned to the error state and `loadingHeading` is gone.
**Why it happens:** `page.route()` mock returns FAILED synchronously on the first poll (which fires ~100ms after page load). The loading heading may disappear before the assertion executes.
**How to avoid:** Either (a) assert `loadingHeading` first with `{ timeout: 2000 }` and accept flakiness risk, or (b) start the test with only the error heading assertion without requiring the loading assertion. Document which approach is used.
**Warning signs:** `expect(loadingHeading).toBeVisible()` times out on the mock-accelerated error test.

### Pitfall 5: test.setTimeout Scope
**What goes wrong:** `test.setTimeout(120_000)` set in a `test.describe` block doesn't apply to individual tests as expected.
**Why it happens:** In Playwright, `test.setTimeout()` called outside a test function applies globally; inside a test function it applies to that test only.
**How to avoid:** Call `test.setTimeout(120_000)` as the first line inside the happy-path test function (not in describe or beforeEach). This is the confirmed correct usage per Playwright docs.
**Warning signs:** Test still times out at 30s despite setting 120s timeout.

### Pitfall 6: Route Glob Scope — Wildcard Must Match Full Path Segment
**What goes wrong:** `page.route('/api/poll-job/*')` does not match `/api/poll-job/some-uuid-with-dashes`.
**Why it happens:** `*` in Playwright glob matches any characters except `/`. The jobId contains only non-slash characters so `*` should work, but UUIDs with multiple segments might not.
**How to avoid:** Use `**` glob to be safe: `/api/poll-job/**`. This matches `/api/poll-job/anything/and/nested`.
**Warning signs:** Mock intercept count is 0 after test; route not matched.

---

## Code Examples

Verified from source code audit:

### Success Page UI State Headings (Exact Strings)
```typescript
// Source: src/app/quiz/success/[jobId]/page.tsx — verified lines 191, 329, 229, 294
const SUCCESS_PAGE_HEADINGS = {
  loading: 'Creating your song…',         // with recipientName: 'Creating your song for Maria…'
  loadingAlt: 'Creating your song…',      // without name (fallback)
  ready: 'Your song is ready!',
  error: 'Something went wrong creating your song',
  timeout: 'This is taking longer than expected',
  podDown: 'Our servers are temporarily offline',
};

// NOTE: loadingHeading is matched with /creating your song/i (case-insensitive, covers both variants)
```

### Success Page Error State Action Elements
```typescript
// Source: src/app/quiz/success/[jobId]/page.tsx — audited

// error state (pageState === 'error'):
// <button onClick={() => router.push('/quiz')}>Try Again</button>
// role='button', name='Try Again'

// timeout state (pageState === 'timeout'):
// <button onClick={handleCheckAgain}>Check Again</button>
// <button onClick={() => router.push('/quiz')}>Start Over</button>

// pod-down state (pageState === 'pod-down'):
// <button onClick={() => router.push('/quiz')}>Start Over</button>
// role='button', name='Start Over'
```

### Quiz Page Pod-Down Error Overlay
```typescript
// Source: src/app/quiz/page.tsx lines 253-274 (genStatus === 'error' branch)
// Error message: {genError} — which is the userMessage from the 502 response
// The text "temporarily unavailable" comes from classifyError for gpu_unavailable
// Button: 'Try Again' (onClick: reset genStatus to 'idle')
// Page stays at /quiz — no navigation

// What the mocked 502 returns (from errors.ts toErrorResponse):
// { error: { category: 'gpu_unavailable', retryable: true, userMessage: '...' } }
// quiz/page.tsx handleCreate() reads: body.error?.userMessage → sets genError
// The error.tsx boundary does NOT trigger here — handleCreate catches the error in try/catch
```

### page.route() with glob — Confirmed Syntax
```typescript
// Source: https://playwright.dev/docs/network#handle-requests
// glob '**' matches any path including slashes
await page.route('/api/poll-job/**', async (route) => {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ status: 'FAILED', error: null }),
  });
});
```

### test.setTimeout() Inside Test
```typescript
// Source: https://playwright.dev/docs/api/class-test#test-set-timeout
// Call INSIDE the test function — not in describe or beforeEach
test('full funnel happy path', async ({ page }) => {
  test.skip(process.env.POD_AVAILABLE !== 'true', 'Pod not reachable');
  test.setTimeout(120_000);
  // ... rest of test
});
```

### waitForURL Pattern
```typescript
// Source: https://playwright.dev/docs/api/class-page#page-wait-for-url
// Wait for navigation away from /quiz after clicking Create My Song
await page.waitForURL(/\/quiz\/success\/.+/, { timeout: 30_000 });
// This waits for URL to match the regex — handles the async POST → redirect flow
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Custom mock server (MSW, json-server) | `page.route()` built-in | Playwright 1.0+ | Zero config; same browser context; no separate process |
| `test.skip()` based on env var inside test | `test.skip(condition, reason)` | Playwright 1.10+ | First-class skip API; shows reason in report |
| Sleeping while polling completes | `expect(locator).toBeVisible({ timeout: N })` | Playwright 1.0+ | Assertion-based waiting; fails with clear message |

**Deprecated/outdated:**
- `page.waitForSelector()`: Use `await expect(page.locator(...)).toBeVisible()` — provides better error messages and auto-retry.
- `page.waitForNavigation()`: Use `page.waitForURL()` instead — more explicit and stable.

---

## Key Architectural Constraint: page.route() Intercept Scope

This is the most important architectural fact for Phase 21, confirmed in STATE.md from Phase 18:

> `page.route() cannot intercept server-side HeartMuLa fetch — all generation E2E tests hit the real A40 pod`

**What this means concretely:**

| Request Origin | Interceptable by page.route()? | Used for |
|---------------|-------------------------------|----------|
| Browser → `/api/quiz-generate` | YES | E2E-07 pod-offline mock |
| Browser → `/api/poll-job/[jobId]` | YES | E2E-06 FAILED status mock |
| Next.js server → HeartMuLa | NO | Must hit real pod for E2E-05 |
| Next.js server → Cloudflare R2 | NO | Not relevant to Phase 21 |

The implication: you cannot write an E2E-05 happy path test that uses a mock — it must hit the real A40 pod (or be skipped). Error state tests for the success page's polling loop (E2E-06) use mocked poll-job responses because those are browser-initiated. E2E-07 tests the quiz page's error overlay which fires when the browser-to-Next.js call to `/api/quiz-generate` fails.

---

## Open Questions

1. **Loading heading assertion race in E2E-06**
   - What we know: The FAILED status mock returns synchronously on the first poll (~100ms). The loading heading may disappear before the test can assert on it.
   - What's unclear: Whether asserting loading heading before error heading is stable or inherently racy.
   - Recommendation: Make the loading heading assertion optional in E2E-06. Focus the test on the terminal state (error heading visible) and the "no infinite spinner" assertion. Document the decision.

2. **Does the quiz error overlay show `userMessage` verbatim?**
   - What we know: `quiz/page.tsx` sets `genError = err.message` and renders `{genError}`. The message is extracted from `body.error?.userMessage`.
   - What's unclear: If the mock returns `userMessage: 'The generation server is temporarily unavailable.'`, does that exact text appear?
   - What the source says: `handleCreate()` reads `body.error?.userMessage ?? 'Generation failed'` and throws `new Error(message)`. Then `err.message` is set as `genError` and rendered as `<p className="...">{genError}</p>`. So yes — the userMessage text is rendered verbatim.
   - Recommendation: Assert `page.getByText(/temporarily unavailable/i)` which is a substring of the returned userMessage.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Playwright 1.58.2 |
| Config file | `playwright.config.ts` (exists) |
| Quick run command | `npx playwright test e2e/error-states.spec.ts --project=chromium` |
| Full suite command | `npm run test:e2e` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| E2E-05 | Full funnel: quiz → POST /api/quiz-generate → /quiz/success → audio visible | E2E (real pod, conditional) | `npx playwright test e2e/happy-path.spec.ts --project=chromium` | ❌ Wave 0 |
| E2E-06 | FAILED poll response → success page shows friendly error heading + retry button | E2E (mocked) | `npx playwright test e2e/error-states.spec.ts --project=chromium` | ❌ Wave 0 |
| E2E-07 | 502 from /api/quiz-generate → quiz page shows graceful error overlay, stays on /quiz | E2E (mocked) | `npx playwright test e2e/error-states.spec.ts --project=chromium` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npx playwright test e2e/error-states.spec.ts --project=chromium` (mocked tests always runnable)
- **Per wave merge:** `npm run test:e2e` (chromium only; E2E-05 skips if pod unreachable)
- **Phase gate:** All tests green (E2E-05 may be annotated skip if pod is down, which is acceptable)

### Wave 0 Gaps
- [ ] `e2e/happy-path.spec.ts` — E2E-05 happy path spec
- [ ] `e2e/error-states.spec.ts` — E2E-06 + E2E-07 error state specs
- [ ] `e2e/pages/success.ts` — extend existing POM with `errorHeading`, `podDownHeading`, `tryAgainButton`, `startOverButton` locators

*(No framework installs needed — all infrastructure in place)*

---

## Sources

### Primary (HIGH confidence)
- Source code audit: `src/app/quiz/success/[jobId]/page.tsx` — all four UI states (`loading`, `ready`, `error`, `pod-down`), exact heading text strings, action button types and onClick handlers
- Source code audit: `src/app/quiz/page.tsx` — `handleCreate()` flow, `genStatus` error state rendering, error message extraction from API response
- Source code audit: `src/app/api/quiz-generate/route.ts` — 502 response shape for gpu_unavailable
- Source code audit: `src/app/api/poll-job/[jobId]/route.ts` — FAILED status response shape, 502 gpu_unavailable handling
- Source code audit: `src/lib/errors.ts` — `toErrorResponse()` structure, `gpu_unavailable` category
- Source code audit: `src/app/quiz/success/[jobId]/_components/SongPlayer.tsx` — confirms `<audio>` is hidden; play button uses `aria-label="Play"`
- Source code audit: `e2e/pages/success.ts`, `e2e/pages/quiz.ts`, `e2e/fixtures.ts` — existing POM and fixtures
- Source code audit: `e2e/global-setup.ts` — POD_AVAILABLE environment variable pattern
- Source code audit: `playwright.config.ts` — default 30s timeout, reducedMotion, webServer config
- `.planning/STATE.md` — confirmed constraint: `page.route() cannot intercept server-side HeartMuLa fetch`
- Playwright docs: `https://playwright.dev/docs/network#handle-requests` — `page.route()` and `route.fulfill()`
- Playwright docs: `https://playwright.dev/docs/api/class-test#test-set-timeout` — `test.setTimeout()` usage inside test

### Secondary (MEDIUM confidence)
- Playwright docs: `https://playwright.dev/docs/api/class-page#page-wait-for-url` — `page.waitForURL()` pattern

### Tertiary (LOW confidence)
- None

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — @playwright/test 1.58.2 already installed; no new packages
- Architecture: HIGH — all patterns derived from reading actual source files; API response shapes audited directly
- Selector strategy: HIGH — all heading strings verified against `success/[jobId]/page.tsx` source
- Pitfalls: HIGH — route intercept scope constraint confirmed from STATE.md; audio visibility issue confirmed from SongPlayer.tsx

**Research date:** 2026-03-06
**Valid until:** 2026-04-06 (stable stack; re-verify if success page UI states or API response shapes change)
