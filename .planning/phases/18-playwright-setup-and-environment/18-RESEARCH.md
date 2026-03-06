# Phase 18: Playwright Setup and Environment - Research

**Researched:** 2026-03-06
**Domain:** Playwright E2E test harness, Next.js 16 integration, pod health check
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- E2E tests live in `e2e/` at the project root (standard Playwright convention)
- Page Object Models live in `e2e/pages/` (landing.ts, quiz.ts, success.ts)
- Spec files organized by page: `e2e/landing.spec.ts`, `e2e/quiz.spec.ts`, `e2e/success.spec.ts`
- Existing unit tests stay colocated in `src/` (e.g., `src/lib/r2.test.ts`) — no reorganization
- Chromium only for now (fastest runs, covers primary audience)
- Mobile viewport presets (iPhone SE + iPad) defined in `playwright.config.ts` now, used in Phase 22
- Headless by default, with `test:e2e:headed` script for debugging
- globalSetup pings the A40 pod; if unreachable, logs a warning and sets a flag
- Generation-dependent specs are skipped when pod is down; non-generation specs still run
- Pod URL read from `.env.local` (same `HEARTMULA_URL` the app uses — single source of truth)
- HEARTMULA_URL updated to A40 pod (`96y089egxk3xm5`) in this phase
- `reducedMotion: reduce` configured to disable Framer Motion animations
- `test:e2e` — headless Playwright run
- `test:e2e:headed` — headed Playwright for debugging
- `test:unit` — vitest run
- `analyze` — bundle analysis via `ANALYZE=true next build`
- `webServer` auto-starts Next.js dev server (`npm run dev` on port 3000)
- HTML reporter enabled (stored in `playwright-report/`)
- Screenshots and traces captured on failure only
- Generation tests configured with 60s+ timeouts

### Claude's Discretion
- Exact health check method (ping /health, root endpoint, or similar)
- globalSetup/globalTeardown implementation details
- Playwright config structure and project naming conventions
- Whether to use Playwright's built-in `dotenv` or manual loading

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| INFRA-01 | Update HEARTMULA_URL to A40 pod and verify connectivity | Health check implementation patterns; dotenv loading in globalSetup; fetch-based ping to pod |
| INFRA-02 | Install and configure Playwright with Next.js webServer | `@playwright/test` 1.58.x install; playwright.config.ts with webServer, baseURL, contextOptions, projects |
| INFRA-03 | Configure test timeouts (60s+ for generation tests) | Per-test and per-file timeout override; `test.setTimeout()` vs `timeout` in config |
</phase_requirements>

---

## Summary

Playwright 1.58.x is the current stable release. It integrates with Next.js 16 via the `webServer` config option, which auto-starts `npm run dev` before test runs and waits until port 3000 is ready. The project already has `dotenv` in devDependencies, so env loading in `globalSetup` requires no new package.

The `reducedMotion: reduce` setting lives in `use.contextOptions` in `playwright.config.ts`. This causes the browser context to report `prefers-reduced-motion: reduce`, which Framer Motion respects automatically — no app-code changes needed. The pod health check should use a lightweight `globalSetup` file that reads `HEARTMULA_URL` from `.env.local` via dotenv, issues a HEAD or GET request to the pod root, and sets `process.env.POD_AVAILABLE` to `"false"` on failure. Specs that require generation call `test.skip(!process.env.POD_AVAILABLE)` in a `beforeAll`.

For bundle analysis, Next.js 16.1 ships an experimental Turbopack analyzer (`npx next experimental-analyze`) that requires no extra package, but the established webpack-based `@next/bundle-analyzer` plugin with `ANALYZE=true next build` is the standard, well-documented path matching the locked decision.

**Primary recommendation:** Install `@playwright/test` + Chromium browsers, write `playwright.config.ts` from scratch (do not use `npm init playwright` which overwrites existing structure), wire `globalSetup` to load `.env.local` via dotenv and ping the pod, then add all four npm scripts.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @playwright/test | ^1.50.0 (latest 1.58.x) | E2E test runner + browser automation | Official Playwright test framework; includes Chromium binary management |
| @next/bundle-analyzer | latest | Bundle size visualization | Official Next.js plugin; minimal config; ANALYZE=true env flag |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| dotenv | ^17.3.1 (already installed) | Load `.env.local` in globalSetup | Node.js context (globalSetup runs outside browser); `dotenv.config()` with `path:` option |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @next/bundle-analyzer + ANALYZE=true | `npx next experimental-analyze` | Turbopack analyzer is newer and needs no package install, but is labeled experimental in 16.1; @next/bundle-analyzer is stable and matches the locked decision |
| Manual dotenv loading | Playwright built-in dotenv (`require.resolve`) | Playwright does not auto-load .env.local; dotenv is already in devDeps so manual loading is the right approach |
| globalSetup file | Project-dependency setup project | Project-dependency setup provides HTML report integration and trace support, but adds config complexity for a simple health check; globalSetup is sufficient here |

**Installation:**
```bash
npm install -D @playwright/test @next/bundle-analyzer
npx playwright install chromium
```

---

## Architecture Patterns

### Recommended Project Structure
```
e2e/
├── global-setup.ts      # pod health check, sets POD_AVAILABLE env var
├── pages/               # Page Object Models (Phase 20)
│   ├── landing.ts
│   ├── quiz.ts
│   └── success.ts
├── landing.spec.ts      # landing page specs (Phase 20)
├── quiz.spec.ts         # quiz funnel specs (Phase 20)
└── success.spec.ts      # success page specs (Phase 21)
playwright.config.ts     # root-level config
```

### Pattern 1: playwright.config.ts (Complete Structure)
**What:** Centralized config with Chromium-only project, webServer, reducedMotion, and timeout overrides
**When to use:** Single config handles all env and browser settings for this project

```typescript
// Source: https://playwright.dev/docs/test-configuration
// Source: https://playwright.dev/docs/api/class-testoptions (contextOptions.reducedMotion)
import { defineConfig, devices } from '@playwright/test';
import path from 'path';

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,           // default for non-generation tests
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,

  reporter: [['html', { outputFolder: 'playwright-report' }]],

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    contextOptions: {
      reducedMotion: 'reduce',    // disables Framer Motion animations
    },
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // Mobile viewport presets — defined now, used in Phase 22
    {
      name: 'mobile-iphone',
      use: { ...devices['iPhone SE'] },
    },
    {
      name: 'mobile-ipad',
      use: { ...devices['iPad'] },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },

  globalSetup: require.resolve('./e2e/global-setup'),
});
```

### Pattern 2: globalSetup — Pod Health Check
**What:** Node.js file that loads `.env.local`, pings the A40 pod, sets `POD_AVAILABLE` env var
**When to use:** Runs once before all tests; controls test-skip behavior in generation specs

```typescript
// Source: Playwright globalSetup pattern + dotenv docs
import dotenv from 'dotenv';
import path from 'path';

export default async function globalSetup() {
  // Load .env.local — same file the app reads at runtime
  dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

  const heartmulaUrl = process.env.HEARTMULA_URL;

  if (!heartmulaUrl) {
    console.warn('[globalSetup] HEARTMULA_URL not set — generation tests will be skipped');
    process.env.POD_AVAILABLE = 'false';
    return;
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10_000);
    const response = await fetch(heartmulaUrl, { signal: controller.signal });
    clearTimeout(timer);

    // Pod returns any 2xx/3xx/4xx — even 404 means it's reachable
    process.env.POD_AVAILABLE = 'true';
    console.log(`[globalSetup] A40 pod reachable (HTTP ${response.status}): ${heartmulaUrl}`);
  } catch (err) {
    process.env.POD_AVAILABLE = 'false';
    console.warn(`[globalSetup] A40 pod UNREACHABLE — generation tests will be skipped: ${err}`);
  }
}
```

**Health check method (Claude's discretion):** Fetch the pod root URL with a 10-second timeout. Any HTTP response (including 404) means the pod is reachable. `AbortError` / network error means it is down. This avoids dependency on a specific `/health` endpoint that may not exist on the HeartMuLa server.

### Pattern 3: Skipping Pod-Dependent Tests
**What:** In generation specs, skip the entire describe block when pod is down
**When to use:** Any spec that calls the real A40 pod

```typescript
// Source: https://playwright.dev/docs/api/class-test (test.describe.configure / test.skip)
import { test, expect } from '@playwright/test';

test.describe('Generation — full happy path', () => {
  test.beforeAll(() => {
    test.skip(process.env.POD_AVAILABLE !== 'true', 'A40 pod unreachable — skipping generation tests');
  });

  test('completes quiz and generates audio', async ({ page }) => {
    // ...
  });
});
```

### Pattern 4: Per-Test Timeout Override (Generation Tests)
**What:** Override the default 30s timeout for tests that call the real pod
**When to use:** Any test that triggers song generation (INFRA-03)

```typescript
// Source: https://playwright.dev/docs/test-timeouts
test('full generation happy path', async ({ page }) => {
  test.setTimeout(120_000);   // 2 minutes — covers 7s generation + polling + audio load
  // ...
});
```

### Pattern 5: Env Loading for .env.local
**What:** dotenv.config with explicit path — NOT dotenv.config() alone
**When to use:** Any Node.js context outside the Next.js runtime (globalSetup, scripts)

```typescript
// Source: dotenv docs — path option required for .env.local (non-default filename)
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
```

**Critical:** `dotenv.config()` with no options only reads `.env`, not `.env.local`. The `path:` option is mandatory.

### Pattern 6: Bundle Analyzer Setup
**What:** `@next/bundle-analyzer` wrapping next.config.ts
**When to use:** `npm run analyze` script via `ANALYZE=true next build`

```typescript
// Source: https://nextjs.org/docs/app/guides/package-bundling
// next.config.ts
import type { NextConfig } from 'next';
import BundleAnalyzer from '@next/bundle-analyzer';

const withBundleAnalyzer = BundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

const nextConfig: NextConfig = {
  serverExternalPackages: ['ffmpeg-static'],
};

export default withBundleAnalyzer(nextConfig);
```

### Pattern 7: tsconfig for e2e/ Directory
**What:** Minimal `e2e/tsconfig.json` that extends root, scoped to the e2e folder
**When to use:** Playwright picks up the nearest tsconfig.json; scoping prevents conflicts with Next.js compiler settings

```json
// e2e/tsconfig.json
{
  "extends": "../tsconfig.json",
  "compilerOptions": {
    "moduleResolution": "node",
    "baseUrl": "..",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["./**/*.ts"]
}
```

**Note:** `moduleResolution: "bundler"` (used in root tsconfig.json) is a Next.js/Vite option. Playwright runs in Node.js and requires `"node"` resolution. Without this override, `import` statements in globalSetup/spec files may fail to resolve.

### Anti-Patterns to Avoid
- **Running `npm init playwright`:** Overwrites package.json scripts and creates example tests in wrong locations. Use manual installation and hand-write `playwright.config.ts`.
- **Using `dotenv.config()` without path:** Only reads `.env`, silently misses `.env.local`. Always pass `{ path: '.env.local' }`.
- **Setting global `timeout: 60_000`:** Slows down all tests unnecessarily. Keep default at 30s; override per-test with `test.setTimeout(120_000)` only where needed.
- **Forgetting `reuseExistingServer: !process.env.CI`:** Without this, local dev runs fail if port 3000 is already in use.
- **Checking `response.status === 200` for pod health:** HeartMuLa may return non-200 on GET /. Any HTTP response means the pod is up — check for network error instead.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Browser automation | Custom puppeteer/CDP scripts | @playwright/test | Built-in waiting, auto-retry, cross-browser, network interception |
| webServer startup waiting | Manual sleep/poll loop | `webServer.url` + Playwright built-in | Playwright polls until URL is ready, handles timeout |
| reducedMotion emulation | CSS injection or app-code flags | `contextOptions.reducedMotion: 'reduce'` | Browser-level media query emulation, zero app changes |
| Bundle size visualization | Custom build script | @next/bundle-analyzer | Handles webpack chunk analysis, treemap visualization |

**Key insight:** Playwright's configuration layer handles most cross-cutting concerns (env, timing, animation, server lifecycle) that look like they need custom infrastructure code.

---

## Common Pitfalls

### Pitfall 1: moduleResolution Mismatch in e2e TypeScript
**What goes wrong:** TypeScript errors in `e2e/global-setup.ts` when importing `dotenv` or native Node.js modules. The root `tsconfig.json` uses `"moduleResolution": "bundler"`, which is a Next.js/Vite mode not understood by `tsc` or Playwright's TypeScript runner in Node.js context.
**Why it happens:** `moduleResolution: "bundler"` is designed for bundled environments. Playwright compiles test files in Node.js context where standard `"node"` resolution applies.
**How to avoid:** Add `e2e/tsconfig.json` that extends the root but overrides `moduleResolution` to `"node"`.
**Warning signs:** `Cannot find module 'dotenv'` or `Module not found` errors specifically in globalSetup or spec files.

### Pitfall 2: .env.local Not Loaded in globalSetup
**What goes wrong:** `process.env.HEARTMULA_URL` is `undefined` in globalSetup even though it exists in `.env.local`. Pod check always sets `POD_AVAILABLE=false`.
**Why it happens:** Next.js loads `.env.local` for its own runtime, but `globalSetup` runs as a plain Node.js script — Next.js has not loaded env yet.
**How to avoid:** Call `dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })` at the top of `globalSetup` before reading any env vars.
**Warning signs:** No HEARTMULA_URL warning in globalSetup output even though the key is in `.env.local`.

### Pitfall 3: webServer Port Conflict
**What goes wrong:** `npm run test:e2e` fails immediately with "server already running on port 3000".
**Why it happens:** Default config tries to start a new dev server when one is already running.
**How to avoid:** Set `reuseExistingServer: !process.env.CI` in the `webServer` config (already in the recommended config above).
**Warning signs:** Playwright error message mentioning port 3000 already in use.

### Pitfall 4: Framer Motion Animations Not Disabled
**What goes wrong:** Assertions on element visibility or URL fail intermittently because Framer Motion step-transition animations are still running (quiz steps animate in/out).
**Why it happens:** `contextOptions.reducedMotion: 'reduce'` emulates the browser media query. Framer Motion must be configured to respect it — by default, Framer Motion v12 does respect `prefers-reduced-motion` automatically via its `reducedMotion: "user"` default behavior.
**How to avoid:** Confirm Framer Motion version is ≥ 10 (it is — package.json shows ^12.35.0). The `contextOptions` approach works without any app-code changes.
**Warning signs:** Flaky `toBeVisible` assertions on quiz step elements; tests pass individually but fail in suite.

### Pitfall 5: Generation Timeout Too Short
**What goes wrong:** Full generation E2E test fails with "Test timeout of Xs exceeded" even when the pod is healthy.
**Why it happens:** Default Playwright timeout is 30s. A40 pod averages ~7s for generation, but polling, audio upload to R2, presigned URL generation, and page load can push total time to 60–90s.
**How to avoid:** Call `test.setTimeout(120_000)` inside any test that triggers generation. Do NOT raise the global timeout.
**Warning signs:** Tests fail with timeout error on the "wait for audio player" assertion, not on a network error.

### Pitfall 6: Playwright Browsers Not Installed
**What goes wrong:** `npm run test:e2e` fails with "Executable doesn't exist at ... chromium".
**Why it happens:** `npm install @playwright/test` installs the test runner but not the browser binaries.
**How to avoid:** Run `npx playwright install chromium` after installing the package. Add this to onboarding notes.
**Warning signs:** Error message referencing a browser executable path.

---

## Code Examples

### Full playwright.config.ts (Production-Ready)
```typescript
// Source: https://playwright.dev/docs/test-configuration + https://playwright.dev/docs/api/class-testoptions
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,

  reporter: [['html', { outputFolder: 'playwright-report', open: 'never' }]],

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    contextOptions: {
      reducedMotion: 'reduce',
    },
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile-iphone',
      use: { ...devices['iPhone SE'] },
    },
    {
      name: 'mobile-ipad',
      use: { ...devices['iPad'] },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },

  globalSetup: require.resolve('./e2e/global-setup'),
});
```

### package.json Scripts to Add
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "test:e2e": "playwright test",
    "test:e2e:headed": "playwright test --headed",
    "test:unit": "vitest run",
    "analyze": "ANALYZE=true next build"
  }
}
```

### .gitignore Entries to Add
```
# Playwright
/playwright-report/
/test-results/
/e2e/.auth/
```

### Minimal Smoke Test (Phase 18 validation)
```typescript
// e2e/smoke.spec.ts — verifies harness works before Phase 20 adds real specs
import { test, expect } from '@playwright/test';

test('app loads at root', async ({ page }) => {
  await page.goto('/');
  await expect(page).not.toHaveTitle(/error/i);
});
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `globalSetup` as only option for pre-test setup | Project dependencies (`dependencies:` in projects array) preferred; `globalSetup` still supported | Playwright 1.31+ | Project deps have trace/report support; for simple pod check, globalSetup is still acceptable |
| `@next/bundle-analyzer` (webpack) | `npx next experimental-analyze` (Turbopack) available as alternative | Next.js 16.1 | Turbopack analyzer needs no package install but is experimental; @next/bundle-analyzer remains stable path |
| `page.emulateMedia({ reducedMotion: 'reduce' })` per-test | `contextOptions.reducedMotion: 'reduce'` globally in config | Playwright 1.25+ | Config-level approach applies to all contexts without per-test calls |

**Deprecated/outdated:**
- `require('@next/bundle-analyzer')({ enabled })` with CommonJS in next.config.js: This project uses TypeScript (`next.config.ts`), so use ESM `import BundleAnalyzer from '@next/bundle-analyzer'` instead.
- `npm init playwright` / `pnpm create playwright`: Useful for greenfield setups; avoid here as it overwrites project structure.

---

## Open Questions

1. **What endpoint does the A40 pod expose at its root?**
   - What we know: The pod runs HeartMuLa; endpoints confirmed in MEMORY.md are `/generate/enhance_prompt`, `/generate/music`, `/jobs/{id}`, `/download_track/{id}`
   - What's unclear: Whether the root URL `/` returns anything meaningful or 404
   - Recommendation: Use root URL for health check — any HTTP response (including 404) means pod is up; only network errors / timeout indicate the pod is down. This is the most reliable approach without adding a dedicated `/health` route.

2. **Does `ANALYZE=true next build` conflict with `serverExternalPackages: ['ffmpeg-static']` in next.config.ts?**
   - What we know: These are independent config options — one controls bundling exclusion, the other triggers the analyzer
   - What's unclear: Whether ffmpeg-static causes any analyzer warnings
   - Recommendation: No action needed; proceed with the standard `@next/bundle-analyzer` wrapper pattern.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Playwright 1.58.x + Vitest 4.0.x |
| Config file | `playwright.config.ts` (Wave 0 — to be created) |
| Quick run command | `npx playwright test e2e/smoke.spec.ts` |
| Full suite command | `npm run test:e2e` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| INFRA-01 | HEARTMULA_URL updated and pod health check passes | smoke/manual | `npm run test:e2e -- --grep "app loads"` + inspect globalSetup output | ❌ Wave 0 |
| INFRA-02 | `npm run test:e2e` launches without error | smoke | `npx playwright test e2e/smoke.spec.ts` | ❌ Wave 0 |
| INFRA-03 | Generation tests configured with 60s+ timeouts | config inspection | `npm run test:e2e` (timeout config verified by passing smoke test) | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npx playwright test e2e/smoke.spec.ts`
- **Per wave merge:** `npm run test:e2e`
- **Phase gate:** `npm run test:e2e` green + globalSetup logs show pod reachable before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `e2e/smoke.spec.ts` — covers INFRA-02 (harness boots, app responds)
- [ ] `e2e/global-setup.ts` — covers INFRA-01 (pod health check)
- [ ] `playwright.config.ts` — covers INFRA-02, INFRA-03 (webServer, timeouts, reducedMotion)
- [ ] `e2e/tsconfig.json` — required for TypeScript resolution in Node.js context
- [ ] Framework install: `npm install -D @playwright/test @next/bundle-analyzer && npx playwright install chromium`

---

## Sources

### Primary (HIGH confidence)
- `https://playwright.dev/docs/test-configuration` — playwright.config.ts options, webServer, timeout
- `https://playwright.dev/docs/api/class-testoptions` — contextOptions.reducedMotion verified
- `https://playwright.dev/docs/test-global-setup-teardown` — globalSetup pattern, project dependencies alternative
- `https://nextjs.org/docs/app/guides/testing/playwright` — Next.js 16.1.6 + Playwright integration (fetched, dated 2026-02-27)
- `https://nextjs.org/docs/app/guides/package-bundling` — @next/bundle-analyzer setup, ANALYZE=true pattern (fetched, dated 2026-02-27, version 16.1.6)
- `https://playwright.dev/docs/test-webserver` — webServer config options

### Secondary (MEDIUM confidence)
- `https://playwright.dev/docs/test-annotations` — test.skip() conditional patterns
- `https://playwright.dev/docs/test-typescript` — tsconfig.json path resolution in Playwright (verified: supports baseUrl and paths)
- WebSearch: @playwright/test 1.58.2 is latest stable version (npm registry)

### Tertiary (LOW confidence)
- WebSearch: `moduleResolution: "bundler"` incompatibility with Playwright Node.js context — community reports, not official docs. Flag for validation during Wave 0 if TypeScript errors appear in e2e/.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — versions verified via npm registry and official Next.js docs (dated 2026-02-27 for v16.1.6)
- Architecture: HIGH — playwright.config.ts patterns verified against official Playwright docs; contextOptions.reducedMotion API confirmed
- Pitfalls: MEDIUM-HIGH — dotenv .env.local pitfall and moduleResolution pitfall from multiple community sources; core claims verified against official docs

**Research date:** 2026-03-06
**Valid until:** 2026-04-06 (Playwright releases frequently; verify latest version if more than 30 days pass)
