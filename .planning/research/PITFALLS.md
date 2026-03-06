# Pitfalls Research

**Domain:** Adding E2E testing and performance optimization to an existing Next.js gift funnel with external API dependencies (RunPod/HeartMuLa), cloud storage (Cloudflare R2), and a multi-step quiz form
**Researched:** 2026-03-06
**Confidence:** HIGH (all critical pitfalls grounded in actual codebase audit + verified against Playwright docs, Next.js docs, and community sources)

---

## Critical Pitfalls

### Pitfall 1: Playwright Cannot Intercept Server-Side Fetch Calls to HeartMuLa with page.route()

**What goes wrong:**
The `quiz-generate` route handler (`src/app/api/quiz-generate/route.ts`) calls HeartMuLa server-side via `fetch()` inside a Next.js API Route. Playwright's `page.route()` only intercepts browser-initiated network requests — it cannot intercept fetch calls that originate in the Node.js server process. If you write an E2E test that calls `page.route('**/generate/music', ...)` expecting to mock HeartMuLa, the mock will never fire. The real RunPod pod will be called instead, making tests depend on a live GPU pod being active, correctly configured, and responding within polling timeout.

This is not a gap in understanding — it is a documented architectural constraint: the Playwright test process and the Next.js server process are two separate processes with no shared memory. `page.route()` intercepts at the browser/CDP layer, not the server-side Node.js layer.

**Why it happens:**
Developers assume `page.route()` is a universal network interceptor. It works for client-side `fetch()` and `XMLHttpRequest`, but not for server-side `fetch()` inside API Routes or Server Components. The quiz funnel's critical generation path is entirely server-side.

**How to avoid:**
Two valid approaches for this app:

Option A (Recommended for v4.0): Write E2E tests that hit the real RunPod pod. Gate E2E tests with a pod health check before running. Accept that generation tests require a live pod. Use a known-good test quiz payload that reliably produces a short song. Mark generation tests as "integration" tests with a longer timeout (120s to match the polling timeout).

Option B: Use Next.js 16's experimental `testProxy` feature (enabled via `experimental: { testProxy: true }` in `next.config.ts`). This routes server-side fetches through a proxy that Playwright can intercept. Requires Next.js 15+ — the app runs Next.js 16.1.6, so this is viable but adds config complexity and is still experimental.

Do NOT attempt Option B for v4.0 — the live-pod approach is simpler, faster to implement, and more representative of real production behavior. Reserve mocking for unit tests (already established with Vitest).

**Warning signs:**
- `page.route()` mock for HeartMuLa URL never intercepts, test calls real API
- E2E test passes locally (pod is running) but fails in CI (no pod)
- Test suite hangs at "Generating your song..." indefinitely because mock never fires

**Phase to address:**
Phase 1 (E2E Setup). Decide the testing strategy (live pod vs. experimental proxy) before writing any generation flow tests. Document the decision in the test file.

---

### Pitfall 2: Polling Timeout Mismatch Between App and Test — Tests Time Out Before Song Completes

**What goes wrong:**
The success page (`src/app/quiz/success/[jobId]/page.tsx`) polls `/api/poll-job/[jobId]` every 2 seconds with a 120-second total timeout (`POLL_TIMEOUT_MS = 120_000`). Playwright's default test timeout is 30 seconds. If you write an E2E test that navigates to the success page and waits for "Your song is ready!" to appear, Playwright will abort the test after 30 seconds — before the 120-second app-level polling timeout has been reached.

The symptom: test fails with "Timeout exceeded: 30000ms" on the assertion for the success state, even though the song would have arrived at ~7-10 seconds. This can happen if there is a flaky RunPod response or the first poll takes longer than expected.

**Why it happens:**
Playwright's default timeout is independent of the app's polling timeout. Developers set `await expect(page.getByText('Your song is ready!')).toBeVisible()` without adjusting the timeout, not realizing the app may take longer to resolve.

**How to avoid:**
Set a test-level timeout that exceeds the sum of: generation time (~10s) + polling interval overhead (~4s) + page navigation time (~2s) = ~20s minimum. Use 60 seconds as a safe margin. Either:
- Set per-assertion timeout: `await expect(page.getByText('Your song is ready!')).toBeVisible({ timeout: 60_000 })`
- Or set the test timeout in the Playwright config: `timeout: 60_000` for tests in the generation suite

Additionally, use `expect.poll` for polling-based assertions rather than a single `toBeVisible` with a long timeout. This gives better error messages when something goes wrong.

**Warning signs:**
- E2E generation test always fails at exactly 30 seconds
- Test error says "Timeout exceeded" not "Element not found"
- Test passes when run with `--timeout=60000` flag but fails with defaults

**Phase to address:**
Phase 1 (E2E Setup). Configure Playwright timeouts for the generation-heavy test suite before writing assertions.

---

### Pitfall 3: Framer Motion Animations Cause Flaky Assertions on Quiz Step Transitions

**What goes wrong:**
The quiz page (`src/app/quiz/page.tsx`) uses Framer Motion `AnimatePresence` with slide variants for step transitions. Each step enters from off-screen over 300ms (`duration: 0.3`). If a Playwright test clicks "Next" and immediately asserts that the next step's content is visible, the assertion may fire during the slide animation — when the new step is partially rendered and not yet fully in place. This produces intermittent failures depending on CPU load during the test run.

The generating overlay also uses a 200ms opacity transition. Tests that check "Creating your song..." immediately after clicking "Create My Song" may catch the transition state rather than the settled state.

**Why it happens:**
Playwright's auto-waiting handles standard DOM visibility changes, but Framer Motion adds CSS transforms (`translateX`) that make elements technically visible in the DOM but visually off-screen. `toBeVisible()` returns `true` if the element is in the viewport and not hidden, but an element translated 100% to the right is still "visible" per the DOM — it is just off-screen in terms of visual layout. The assertion succeeds while the animation is mid-flight.

**How to avoid:**
Two mitigations:

1. Use `--project=chromium` for animation-sensitive tests and configure Playwright to disable CSS animations in the test browser context: set `reducedMotion: 'reduce'` in the Playwright device config. The app already checks `useReducedMotion()` and sets animation `duration` to 0 when reduced motion is active. Playwright's `reducedMotion: 'reduce'` sends the `prefers-reduced-motion: reduce` media query to the browser, which activates the app's zero-duration path.

2. Wait for step content by text or role rather than by timing. After clicking "Next", wait for the specific heading text of the next step to be visible: `await expect(page.getByRole('heading', { name: 'Set the mood' })).toBeVisible()`. This is a state assertion, not a timing assertion.

**Warning signs:**
- Quiz navigation tests pass on 8/10 runs but fail on 2/10 (flakiness)
- Failures occur on "Click Next and assert new step content" patterns
- Tests pass when run in headed mode (slower) but fail in headless CI (faster)

**Phase to address:**
Phase 1 (E2E Setup). Set `reducedMotion: 'reduce'` in the Playwright base config before writing quiz navigation tests.

---

### Pitfall 4: `src/env.ts` Throws on Import if Environment Variables Are Missing — Crashes Playwright's Next.js Server

**What goes wrong:**
`src/env.ts` validates all required environment variables at module import time using Zod's `safeParse`. If any required variable is missing or malformed, it throws `Missing or invalid environment variables: ...` immediately. During E2E testing, Playwright starts the Next.js development server (`webServer` in `playwright.config.ts`). If the test environment's `.env.local` is missing `HEARTMULA_URL`, `CLOUDFLARE_ACCOUNT_ID`, or other required variables, the Next.js server crashes on startup before any test can run.

The error is reported as "Failed to start webServer" in Playwright output, which is cryptic — it doesn't surface the actual missing variable message.

**Why it happens:**
Strict environment validation that is correct for production becomes a barrier in testing. CI environments without a `.env.local` file fail immediately. Developers who clone the repo and run Playwright tests without setting up environment variables get a confusing "webServer failed" error.

**How to avoid:**
Create a `.env.test` or `.env.test.local` file with test-safe values for all required environment variables. For variables that point to external services (HeartMuLa, R2), use the real values from `.env.local` in the E2E test environment. For CI, set these as GitHub Actions secrets and inject them into the environment.

Document the required variables for E2E testing in a comment at the top of `playwright.config.ts`. Do NOT create stub/fake values for HeartMuLa or R2 — the E2E tests depend on real connectivity (see Pitfall 1).

**Warning signs:**
- `Failed to start webServer` in Playwright output with no further error detail
- Next.js server process exits immediately during `playwright test`
- Error appears even before any test page loads

**Phase to address:**
Phase 1 (E2E Setup). Set up environment variable configuration for the test runner before writing any tests.

---

### Pitfall 5: Pod URL Change (A40 Migration) Not Reflected in Test Environment — Tests Hit Wrong or Dead Pod

**What goes wrong:**
The project is migrating from RTX 4090 pod (`zwysa4aou3a8it`) to A40 pod (`96y089egxk3xm5`). The `HEARTMULA_URL` in `.env.local` must be updated to point to the new pod URL. If E2E tests are run against the old pod URL (left over in a test environment config or cached `.env.local`), all generation tests will fail with connection refused or 404 errors. The failure mode looks identical to "pod is down" — it is not obvious that a URL migration is the cause.

Additionally: RunPod pod URLs change format on pod restart when the pod does not use a static IP or custom domain. If the A40 pod is restarted, its URL may change. Any test that hardcodes the pod URL (rather than reading from env) will break silently.

**Why it happens:**
Environment variable files are not committed to git. Migration from one pod to another requires manual `.env.local` updates. When a developer runs tests after the migration without updating their local env, tests hit the dead pod.

**How to avoid:**
Before running E2E tests: verify the pod URL is live with a health check script (`curl $HEARTMULA_URL/health`). Add a Playwright `globalSetup` file that performs this health check and fails early with a clear error message if the pod is not reachable. This converts a cryptic "connection refused" deep inside a test into an immediate "pod is unreachable — check HEARTMULA_URL in .env.local".

**Warning signs:**
- All generation E2E tests fail with network errors
- `curl $HEARTMULA_URL/health` from the terminal times out or returns 404
- The error occurs immediately on job submission (not after polling)

**Phase to address:**
Phase 1 (E2E Setup) and Phase 2 (Backend API Verification). The health check should be the first thing the test suite verifies.

---

### Pitfall 6: Audio Element Cannot Be Tested for Actual Playback in Playwright — Only UI State Can Be Asserted

**What goes wrong:**
The success page renders a `<SongPlayer>` component with a native `<audio>` element. Playwright cannot assert that audio is actually playing — it can only assert that the `<audio>` element exists in the DOM, that the `src` attribute is set, and that UI controls (play button, progress bar) are in the expected state. Attempting to assert `audio.currentTime > 0` or `audio.paused === false` via JavaScript evaluation will not work reliably because browsers in Playwright's headless Chromium mode block audio autoplay and may not advance `currentTime` without a real audio device.

Developers expecting full audio playback verification will waste time trying to make audio play in headless mode, which is a known browser security limitation.

**Why it happens:**
The temptation is to write the "gold standard" test: navigate to the success page, verify the song plays. But verifiable audio playback requires a real browser with a real audio output device. Playwright's headless Chromium has no audio output.

**How to avoid:**
Test the audio delivery chain at the boundary that can be tested:
1. Assert that the `<audio>` element's `src` attribute is set to `/api/audio/[jobId]` (verifiable via DOM)
2. Assert that a GET request to `/api/audio/[jobId]` returns status 200 with `Content-Type: audio/mpeg` (verifiable via `page.waitForResponse()`)
3. Assert that the Download link has the correct `href` and `download` attribute (verifiable via DOM)

The actual audio signal is tested manually or via a headful test in local development. Document this limitation in the test file.

**Warning signs:**
- Test tries to click play and then assert `audio.paused === false` — this is likely to be flaky or always fail headlessly
- Test uses `page.evaluate(() => document.querySelector('audio').play())` — autoplay policy blocks this
- Hours spent debugging "audio doesn't play in CI" — this is expected, not a bug

**Phase to address:**
Phase 3 (E2E Flow Testing). Set audio test expectations correctly from the start — test delivery, not playback.

---

### Pitfall 7: localStorage Quiz Persistence Survives Between Tests — Previous Test Data Contaminates Subsequent Tests

**What goes wrong:**
The quiz page reads from `localStorage` on mount and pre-populates answers from a previous session (key: `notevra_quiz_v1`). If a previous Playwright test fills out the quiz and does not clear localStorage afterward, the next test may start with pre-populated quiz data from the previous test run. This breaks tests that assume a clean quiz state — for example, a test that verifies "Step 1 starts empty" may find values already filled in from the previous test.

Playwright test isolation at the browser context level handles cookies and sessionStorage by default, but localStorage behavior depends on whether tests share a browser context.

**Why it happens:**
Playwright reuses browser contexts across tests in the same worker by default unless explicitly configured. Within a shared context, localStorage persists between `page.goto()` calls. The quiz's localStorage persistence is a v3.0 feature — it is correct behavior for users, but adversarial for test isolation.

**How to avoid:**
In `playwright.config.ts`, use `storageState` with an empty state file, or call `await page.evaluate(() => localStorage.clear())` in a `beforeEach` hook for all quiz tests. Better: configure each test to use a fresh browser context with `use: { storageState: undefined }` to ensure clean state.

Alternatively, add a URL parameter that the quiz page checks to bypass localStorage loading (e.g., `?fresh=1`). This is the cleanest approach because it doesn't require test-specific browser context management.

**Warning signs:**
- Quiz tests pass in isolation but fail when run as a suite
- Step 1 shows pre-filled recipient name from a previous test's data
- Test fails on "assert Step 1 fields are empty" after another test submitted the quiz

**Phase to address:**
Phase 1 (E2E Setup). Configure test isolation for localStorage before writing any quiz flow tests.

---

### Pitfall 8: Performance Measurement in Dev Mode vs. Production Build — Measurements Are Not Comparable

**What goes wrong:**
Next.js development mode (`next dev`) includes hot-module replacement, React DevTools hooks, and unminified bundles. Measuring Core Web Vitals (LCP, INP, CLS) or bundle sizes in dev mode produces numbers that are 3-10x worse than production. If the performance audit is run against `next dev`, any "optimization" work that reduces dev bundle sizes may not translate to meaningful production improvements, and the baseline numbers create a false picture of how bad production performance actually is.

**Why it happens:**
Running `npx playwright test` against `next dev` (via the `webServer` config) is the easiest test setup. Switching to `next build && next start` for performance tests requires a separate build step. Developers skip the build and measure against dev mode.

**How to avoid:**
Run all performance-related measurements against a production build:
```bash
next build && next start
```
Use a separate Playwright config profile (or a `--project=perf` flag) that starts the production server. Use `@next/bundle-analyzer` to audit bundle sizes from the production build output (`next build --profile`). Measure Core Web Vitals in Lighthouse CI or PageSpeed Insights against the production URL, not localhost dev mode.

**Warning signs:**
- Lighthouse score on `http://localhost:3000` (dev) shows LCP of 4-8 seconds — this is expected and not indicative of production
- Bundle sizes reported in dev mode are 3-5x larger than production
- "Optimization" work reduces dev mode score but production score is unchanged

**Phase to address:**
Phase 4 (Performance Optimization). Establish baseline metrics from a production build before making optimization decisions.

---

### Pitfall 9: Audio Proxy Route Buffers the Entire Song Before Streaming — Memory and Latency Issue

**What goes wrong:**
`src/app/api/audio/[jobId]/route.ts` calls `fetchAudioBuffer()` which downloads the entire audio file into a `Buffer` in memory before returning it to the browser:

```typescript
const buffer = await fetchAudioBuffer(jobId);
return new NextResponse(new Uint8Array(buffer), { ... });
```

For a 30-second audio file at typical MP3 bitrates (128-192kbps), this is approximately 500KB-700KB. This is manageable at low traffic but has two specific problems:

1. **Time To First Byte (TTFB) for audio**: The browser cannot start playing audio until the entire file is downloaded to the Next.js server and then re-downloaded to the browser. This adds latency equal to the HeartMuLa→server download time before any audio bytes reach the browser.

2. **Memory accumulation**: At modest traffic (10 concurrent users each downloading), the Next.js process holds 5-7MB of audio in memory simultaneously. This is not a scaling concern for v4.0 validation but will become one pre-launch.

**Why it happens:**
The `fetchAudioBuffer` pattern is simple and correct for a single-user validation scenario. The proxy exists for good reasons (hides HeartMuLa URL, enables `download` attribute). The memory buffering is an unintentional side effect.

**How to avoid:**
For v4.0, this is a known limitation to document rather than fix. The fix — streaming the response body from HeartMuLa to the client using `ReadableStream` piping — is more complex and should be a separate performance task. Document this as a known optimization target.

Do verify in testing that the route works correctly for audio playback (status 200, correct Content-Type) and that the download link works. Do not attempt to optimize the streaming behavior during v4.0 unless audio delivery latency is measured as a user-perceptible issue.

**Warning signs:**
- Time between success page appearance and audio being playable exceeds 3-4 seconds (TTFB for the audio route)
- Node.js process memory grows proportionally with concurrent users
- Audio download is noticeably slow compared to direct HeartMuLa download

**Phase to address:**
Phase 4 (Performance Optimization). Measure the TTFB. Flag streaming as a future optimization if measured latency is user-perceptible.

---

### Pitfall 10: Mobile Touch Events on Quiz — Click vs. Tap Behavioral Differences

**What goes wrong:**
Playwright mobile device emulation (e.g., `iPhone SE`) simulates touch events. The quiz's SelectionCard and PillButton components use `onClick` handlers. In most cases, touch events fire `click` correctly, but two specific patterns cause issues on mobile:

1. **Hover states masked as tappable areas**: Cards that have `:hover` styles (Tailwind `hover:` classes) may appear to require a hover before they are clickable on touch devices. On actual mobile devices, there is no hover state — the first tap both hovers and clicks. In Playwright mobile emulation, this can cause assertions that check for hover-dependent styles to fail.

2. **Double-tap zoom on selection cards**: If card elements do not have `touch-action: manipulation` in CSS, mobile browsers attempt double-tap zoom on rapid successive taps. In the quiz, rapid "Next → Next → Next" navigation can trigger zoom behavior instead of navigation.

**Why it happens:**
The quiz UI was built and tested on desktop. Mobile-specific touch behaviors were not part of the v3.0 acceptance criteria. Playwright mobile emulation reveals these edge cases that are invisible on desktop.

**How to avoid:**
During mobile responsiveness testing, test with `devices['iPhone SE']` and `devices['Pixel 5']` in Playwright to cover both small iOS and Android viewports. Verify that all interactive elements have sufficient tap target size (minimum 44x44px). Check for `touch-action: manipulation` on interactive elements to prevent double-tap zoom. Test the full 6-step quiz flow on mobile emulation as a required E2E test.

**Warning signs:**
- Quiz selection cards appear unresponsive on mobile (require double-tap)
- Playwright mobile test finds elements "not actionable" for tap
- Quiz navigation works on desktop test but fails on mobile test

**Phase to address:**
Phase 5 (Mobile Responsiveness). Run full quiz flow on mobile Playwright devices during the mobile audit phase.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Mock HeartMuLa in E2E tests instead of using live pod | Tests run without pod costs | Tests never verify real API contract; generation bugs escape to production | Never — use live pod for generation E2E, mock only in unit tests |
| Run performance audit against `next dev` | No build step required | Measurements are unreliable; optimizations target the wrong things | Never for performance decisions; acceptable for quick sanity checks |
| Skip clearing localStorage between tests | Simpler test setup | Tests contaminate each other; intermittent failures that are hard to diagnose | Never for a test suite that will run in CI |
| Hardcode a test `jobId` in success page E2E test | Simpler test without full quiz flow | Misses the quiz→generation→success handoff bugs that are the most likely failure points | Only when testing success page UI in isolation with an explicit fixture |
| Accept audio buffering (full download before stream) | No streaming complexity | TTFB degradation visible to users; memory growth with concurrent users | Acceptable for v4.0 validation milestone — document and defer |
| Skip Playwright timeout configuration | Works locally with fast pod | CI failures at exactly 30 seconds; flaky test reputation | Never — always configure timeouts before writing generation tests |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| HeartMuLa via `page.route()` | Using Playwright's page.route() to mock server-side HeartMuLa calls | Not possible without Next.js testProxy. Use live pod for E2E; mock in Vitest unit tests only. |
| RunPod A40 pod | Testing before verifying pod is live on the new URL | Run `curl $HEARTMULA_URL/health` in a globalSetup script; fail early with a clear error if unreachable |
| Cloudflare R2 CORS in E2E | R2 CORS configured for localhost:3000 only; tests running on a different port fail CORS | Verify Playwright's `webServer` starts on port 3000, or update R2 CORS to include the test port |
| localStorage quiz persistence | Shared browser context between tests carries quiz data forward | Call `localStorage.clear()` in `beforeEach`, or use fresh browser context per test |
| HTML5 audio in headless Chromium | Expecting audio to play and `currentTime` to advance in headless mode | Test audio delivery (status 200, Content-Type) not audio playback; document limitation |
| Next.js `env.ts` Zod validation | Missing `.env.local` causes server to crash before any test runs | Document all required vars; add pod health check to globalSetup; keep `.env.local` synced |
| Framer Motion step transitions | Asserting on step content immediately after click, mid-animation | Use `reducedMotion: 'reduce'` in Playwright config to disable animations via media query |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Measuring CWV in dev mode | LCP shows 4-8s, INP shows 500ms — false alarms | Always measure from `next build && next start` | Immediately — dev mode numbers are always misleading |
| Framer Motion included in initial JS bundle | Slower TTI for landing page; heavier quiz page load | Verify framer-motion is tree-shaken; it should only load in client components that use it | At any traffic level — affects first paint |
| `canvas-confetti` loading on every page | Confetti bundle loaded even on landing page | Ensure `canvas-confetti` is only imported in the success page ConfettiBlast component | Immediately — adds ~25KB to pages that don't need it |
| Audio proxy buffers entire file in memory | Slow Time To First Byte for audio; memory pressure under concurrent load | Stream response body instead of buffering; or use HeartMuLa URL directly for playback (requires exposing it) | Visible at ~5+ concurrent generation completions |
| Polling every 2s when tab is backgrounded | Unnecessary server requests; wasted RunPod proxy calls | Add `document.addEventListener('visibilitychange', ...)` to pause polling when hidden | Not a correctness issue at v4.0 scale but wasteful |
| Next.js Image component not used for landing hero | LCP image not optimized; no automatic format conversion (WebP/AVIF) | Use `<Image>` from `next/image` with `priority` prop for above-fold hero images | Immediately — measurable LCP regression without it |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Exposing HeartMuLa URL in E2E test output | Pod URL visible in CI logs; anyone can call generation API directly | `HEARTMULA_URL` is server-only env var — never log it in test output; verify it stays out of client bundles |
| E2E tests generating real songs at scale in CI | RunPod costs and pod wear from CI runs | Limit generation E2E tests to one per CI run; use Playwright's `--repeat-each=1` and separate generation tests from smoke tests |
| Test quiz data with real personal content | PII in test fixtures stored in git | Use obviously synthetic data in fixtures: `recipientName: 'Test User'`, `memories: 'E2E test memory'` |
| Quiz errors exposing internal error messages | `classifyError` includes `technicalMessage` in debug field — this is returned to the client in the error response | Verify `debug.technicalMessage` is only logged server-side and not surfaced in UI; it currently appears in the 502 response body which is accessible to the client |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Error state on success page shows "Try Again" but quiz answers are already cleared from localStorage | User must redo the entire quiz after a generation failure | Clear localStorage only after successful job redirect; restore quiz answers from URL params if generation fails mid-flight |
| Timeout state message says "warming up" but A40 pod is always warm (persistent pod, no cold start) | Confusing messaging for a symptom that shouldn't happen | Update timeout message to reflect the actual scenario: "This is taking longer than usual — the generation may have been interrupted." |
| Download filename uses recipient name from URL param (raw string) — special characters create broken filenames | `notevra-song-for-café-au-lait.mp3` creates download issues on Windows | The existing `buildGiftFilename` function strips non-alphanumeric chars correctly — verify this handles emoji and non-ASCII names in mobile testing |
| Mobile quiz step buttons too small for confident tapping | Users tap wrong option; frustrating quiz experience | Verify all SelectionCard and PillButton elements meet 44x44px minimum tap target; add padding if needed |
| No visual feedback between clicking "Create My Song" and seeing the generating overlay | Sub-second gap where nothing happens; user may tap twice | Ensure the button is disabled immediately on click and the generating overlay appears within one frame |

---

## "Looks Done But Isn't" Checklist

- [ ] **Playwright installed and configured:** `npx playwright install` has been run with all required browsers; `playwright.config.ts` exists with correct `webServer` config pointing to `localhost:3000`.
- [ ] **Pod health check passes:** `curl $HEARTMULA_URL/health` returns 200 before any E2E test that involves generation. The A40 pod URL (`96y089egxk3xm5`) is confirmed as the active pod.
- [ ] **Environment variables present for E2E:** All variables in `src/env.ts` are set in the test environment; the Next.js server starts without crashing.
- [ ] **Test isolation confirmed:** `localStorage.clear()` or fresh context is called before each quiz test; no data bleeds between tests.
- [ ] **Playwright timeouts configured:** Generation-related tests use a timeout of at least 60 seconds; `playwright.config.ts` sets this per-project, not per-assertion.
- [ ] **`reducedMotion: 'reduce'` set:** Playwright base config includes `reducedMotion: 'reduce'` to disable Framer Motion animations during tests.
- [ ] **Production build baseline measured:** Core Web Vitals measured from `next build && next start`, not `next dev`. LCP, INP, and CLS values documented as baseline before optimization.
- [ ] **Audio delivery tested (not playback):** E2E test verifies `/api/audio/[jobId]` returns status 200 with `Content-Type: audio/mpeg`, not that audio actually plays.
- [ ] **Mobile quiz flow tested:** Full 6-step quiz completed on `iPhone SE` viewport in Playwright; all steps navigate correctly and "Create My Song" button is tappable.
- [ ] **Download works on mobile:** Download link tested on mobile viewport; file download is triggered (not navigation to audio URL).
- [ ] **Error states covered:** E2E tests include at least one test for the error state (simulated by submitting to a disconnected or error-returning endpoint) and the timeout state.
- [ ] **Poll-job route tested against real status transitions:** E2E test observes the full QUEUED → PROCESSING → COMPLETED transition in poll responses, not just the final state.

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| page.route() mock never fires (server-side fetch not intercepted) | LOW | Remove mock; update test to use live pod; move mock to Vitest unit test |
| Test suite times out at 30s on generation tests | LOW | Add `timeout: 60_000` to Playwright config for generation test project; re-run |
| Framer Motion causes flaky quiz navigation tests | LOW | Add `reducedMotion: 'reduce'` to Playwright config; this activates zero-duration animation path in the app |
| localStorage contamination between tests | LOW | Add `page.evaluate(() => localStorage.clear())` to `beforeEach` in quiz test suite |
| Missing env vars crash Next.js server in CI | MEDIUM | Add all required vars as GitHub Actions secrets; document in README; add globalSetup health check with readable error message |
| Pod URL stale (A40 migration not reflected) | LOW | Run `curl $HEARTMULA_URL/health`; update `.env.local` and CI secrets with new pod URL; re-run tests |
| Performance baseline measured from dev mode | LOW | Re-run measurements from `next build && next start`; discard dev mode numbers |
| Audio buffering causes slow delivery | MEDIUM | Implement streaming proxy using `Response` piping; or bypass proxy by allowing direct HeartMuLa URL for audio (requires CORS configuration on the pod) |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| `page.route()` cannot intercept server-side HeartMuLa fetch | Phase 1: E2E Setup | Test comment documents live-pod strategy; no server-side fetch mocks in E2E tests |
| Playwright timeout vs. app polling timeout mismatch | Phase 1: E2E Setup | `playwright.config.ts` has `timeout: 60_000` for generation test project |
| Framer Motion causes flaky quiz step assertions | Phase 1: E2E Setup | `reducedMotion: 'reduce'` in Playwright config; quiz nav tests pass 10/10 runs |
| `env.ts` throws on missing vars, crashes webServer | Phase 1: E2E Setup | All required env vars documented and present; `playwright test` starts without webServer error |
| Pod URL stale after A40 migration | Phase 1: E2E Setup / Phase 2: Backend Verification | globalSetup health check passes; `HEARTMULA_URL` points to A40 pod |
| Audio element playback untestable in headless mode | Phase 3: E2E Flow Testing | Test asserts audio delivery (status 200, Content-Type) not playback; limitation documented |
| localStorage contamination between tests | Phase 1: E2E Setup | `beforeEach` clears localStorage; quiz tests pass in suite order and reversed order |
| Performance baseline measured from dev mode | Phase 4: Performance Optimization | Baseline numbers from `next build && next start`; documented before any optimization work |
| Audio proxy buffers entire file | Phase 4: Performance Optimization | TTFB measured; streaming deferred to post-v4.0 if TTFB < 500ms |
| Mobile touch event issues on quiz cards | Phase 5: Mobile Responsiveness | Full quiz flow on iPhone SE in Playwright passes; tap targets >= 44x44px verified |

---

## Sources

- Direct codebase audit (2026-03-06):
  - `src/app/api/quiz-generate/route.ts` — server-side fetch to HeartMuLa; cannot be intercepted by `page.route()`
  - `src/app/api/audio/[jobId]/route.ts` — full buffer download pattern; TTFB and memory implications
  - `src/app/quiz/success/[jobId]/page.tsx` — 2s poll interval, 120s timeout; `audioUrl` state management
  - `src/app/quiz/page.tsx` — Framer Motion slide variants; localStorage read/write pattern; `notevra_quiz_v1` key
  - `src/lib/heartmula.ts` — fetch timeout values; endpoint structure for A40 pod
  - `src/lib/errors.ts` — `debug.technicalMessage` is returned in error response body (client-accessible)
  - `src/env.ts` — throws on invalid env; no graceful fallback for missing vars
  - `src/test-setup.ts` — Vitest setup only; no Playwright setup yet
  - `vitest.config.ts` — Vitest configured; Playwright not yet installed
  - `package.json` — no `@playwright/test` dependency yet; Next.js 16.1.6 (supports experimental testProxy)
- Playwright documentation: [Mock APIs](https://playwright.dev/docs/mock), [Test Timeouts](https://playwright.dev/docs/test-timeouts), [Best Practices](https://playwright.dev/docs/best-practices)
- Next.js GitHub Discussion: [Intercepting server-side fetch in Playwright](https://github.com/vercel/next.js/discussions/76436)
- Playwright GitHub Issue: [Framer Motion animation waitForAnimation](https://github.com/microsoft/playwright/issues/4055)
- Momentic Blog: [Fetch Mocking With Playwright in Next.js 15](https://momentic.ai/blog/fetch-mocking-with-playwright-next-js)
- Cloudflare R2 Docs: [CORS configuration](https://developers.cloudflare.com/r2/buckets/cors/), [Presigned URLs](https://developers.cloudflare.com/r2/api/s3/presigned-urls/)
- RunPod Docs: [Network timeout behavior](https://drdroid.io/integration-diagnosis-knowledge/runpod-network-timeout) — 100s Cloudflare proxy timeout applies to synchronous requests; async polling model avoids this
- BetterStack: [Avoiding Flaky Tests in Playwright](https://betterstack.com/community/guides/testing/avoid-flaky-playwright-tests/)
- Semaphore CI: [Flaky Tests in Animation Workflows](https://semaphore.io/blog/flaky-tests-ui)
- Next.js Docs: [Core Web Vitals and Server Components](https://nextjs.org/learn-pages-router/seo/web-performance)
- Vercel Academy: [Client-Server Component Boundaries](https://vercel.com/academy/nextjs-foundations/client-server-boundaries)

---
*Pitfalls research for: Notevra v4.0 — Testing & Optimization of existing Next.js gift funnel*
*Researched: 2026-03-06*
