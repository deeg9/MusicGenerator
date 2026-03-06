# Phase 23: Performance Audit and Optimization - Research

**Researched:** 2026-03-06
**Domain:** Next.js bundle optimization, lazy loading, Core Web Vitals
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PERF-01 | Run bundle analysis and identify optimization targets | `@next/bundle-analyzer` already installed and configured in `next.config.ts`; `npm run analyze` script already defined in `package.json` |
| PERF-02 | Lazy load below-fold landing page sections | `next/dynamic` wraps server and client components; landing page has 4 below-fold sections (HowItWorks, Testimonials, VideoSection, BottomCta) |
| PERF-03 | Lazy load canvas-confetti (only needed on success page) | `canvas-confetti` is a direct import inside `ConfettiBlast.tsx`; lazy-loading moves it out of main bundle via dynamic `import()` inside `useEffect` |
| PERF-04 | Core Web Vitals: LCP < 2.5s and CLS < 0.1 on landing page | Measured via Lighthouse CLI against `next start` production build; landing page is largely static content — high likelihood of passing once lazy loading reduces JS payload |
</phase_requirements>

---

## Summary

The project has a well-structured landing page with five sections: `HeroSection` (above-fold), plus `HowItWorksSection`, `TestimonialsSection`, `VideoSection`, and `BottomCtaSection` (below-fold). All five are currently statically imported in `app/page.tsx`, meaning their JavaScript is in the initial bundle for every visitor even though only `HeroSection` is visible on first paint. The fix is straightforward: convert the four below-fold imports to `next/dynamic()` calls in the landing page.

The `canvas-confetti` library is imported directly inside `ConfettiBlast.tsx` with a top-level `import confetti from 'canvas-confetti'`. This means confetti code is bundled into every client chunk that includes the success page. The correct fix is to convert the top-level import to a dynamic `import()` inside the `useEffect` where confetti is actually fired, removing it from the module graph at bundle time.

The `@next/bundle-analyzer` plugin is already installed and configured — the `analyze` script (`ANALYZE=true next build`) is already in `package.json`. The planner only needs to run it, document findings, implement the two lazy-load fixes, and then validate Core Web Vitals with Lighthouse CLI against a production build.

**Primary recommendation:** Use `next/dynamic` for the four below-fold landing page components, use dynamic `import()` inside the `useEffect` to lazy-load `canvas-confetti`, then measure LCP/CLS with Lighthouse CLI against `next start`.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@next/bundle-analyzer` | 16.1.6 (dev) | Webpack bundle visualization | Already installed and wired in `next.config.ts` |
| `next/dynamic` | 16.1.6 | Lazy-load client and server components | Official Next.js API; splits components into separate chunks |
| `lighthouse` | CLI (global) | Measure LCP, CLS on production build | Industry-standard tool; outputs per-metric pass/fail |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `npx next experimental-analyze` | 16.1.6 | Turbopack-native bundle analyzer | Alternative to `@next/bundle-analyzer` when Turbopack is in use; project uses webpack so use `@next/bundle-analyzer` instead |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `lighthouse` CLI | Chrome DevTools Lighthouse | CLI is scriptable and produces JSON output; prefer CLI for repeatable measurement |
| `next/dynamic` for below-fold | Intersection Observer + manual lazy load | `next/dynamic` is already the correct abstraction in Next.js; no need for manual IO |
| `LazyMotion` from framer-motion | Current full `motion` import | LazyMotion requires refactoring all `motion.*` call sites; high effort; `framer-motion` is only used on the success page and is not on the landing page critical path — skip for this phase |

**Installation:** No new packages needed. `lighthouse` can be invoked via `npx` without global install.

```bash
# Bundle analysis (already configured)
npm run analyze
# or directly:
ANALYZE=true npm run build

# Lighthouse measurement
npx lighthouse http://localhost:3000 --output=json --output-path=./lighthouse-report.json --chrome-flags="--headless"
```

---

## Architecture Patterns

### Recommended Project Structure

No new directories needed. Changes are confined to:

```
src/
├── app/
│   └── page.tsx                    # Convert 4 below-fold imports to next/dynamic
└── app/quiz/success/[jobId]/
    └── _components/
        └── ConfettiBlast.tsx       # Convert top-level import to dynamic import()
```

### Pattern 1: next/dynamic for Below-Fold Server Components

**What:** Wrap non-critical, below-fold sections in `dynamic()` so their JavaScript is split into a separate chunk and not included in the initial page bundle.

**When to use:** Sections that are not visible on first paint (below the fold). The `HeroSection` stays as a static import because it IS the LCP element.

**Example:**

```typescript
// Source: https://nextjs.org/docs/app/guides/lazy-loading
// app/page.tsx
import { HeroSection } from '@/components/landing/HeroSection'; // Static: above fold, LCP element
import dynamic from 'next/dynamic';

// Below-fold: lazy loaded, not in initial bundle
const HowItWorksSection = dynamic(
  () => import('@/components/landing/HowItWorksSection').then((m) => m.HowItWorksSection)
);
const TestimonialsSection = dynamic(
  () => import('@/components/landing/TestimonialsSection').then((m) => m.TestimonialsSection)
);
const VideoSection = dynamic(
  () => import('@/components/landing/VideoSection').then((m) => m.VideoSection)
);
const BottomCtaSection = dynamic(
  () => import('@/components/landing/BottomCtaSection').then((m) => m.BottomCtaSection)
);

export default function Home() {
  return (
    <main>
      <HeroSection />
      <HowItWorksSection />
      <TestimonialsSection />
      <VideoSection />
      <BottomCtaSection />
    </main>
  );
}
```

**Key detail — named exports:** All four components are named exports (not default exports), so the `.then((m) => m.ComponentName)` pattern is required. `next/dynamic` only accepts default exports directly; named exports require this chained `.then()`.

**Key detail — SSR:** These are server components with no browser APIs. Do NOT add `ssr: false`. SSR must remain enabled (the default) to avoid layout shifts and to preserve SEO.

**Key detail — no Suspense fallback needed:** The sections are pure static content. A null fallback (the default) is fine. Adding a skeleton fallback adds complexity with no measurable benefit here.

### Pattern 2: Dynamic `import()` Inside useEffect for Libraries

**What:** Replace a top-level `import` of a library with a dynamic `import()` call inside the `useEffect` where the library is actually invoked. This removes the library from the module graph at bundle time.

**When to use:** A library is only needed at runtime in a specific user interaction or lifecycle event, not during render. `canvas-confetti` is only invoked after the page is fully mounted — exactly this case.

**Example:**

```typescript
// Source: https://nextjs.org/docs/app/guides/lazy-loading (External Libraries section)
// _components/ConfettiBlast.tsx — BEFORE
import confetti from 'canvas-confetti';

useEffect(() => {
  void confetti({ ... });
}, [reducedMotion]);

// AFTER — canvas-confetti is NOT in the main bundle; loads only when fired
useEffect(() => {
  if (reducedMotion) return;

  void import('canvas-confetti').then(({ default: confetti }) => {
    void confetti({
      origin: { x: 0.25, y: 0.5 },
      particleCount: 80,
      spread: 70,
      colors: BRAND_COLORS,
    });
  });

  const timer = setTimeout(() => {
    void import('canvas-confetti').then(({ default: confetti }) => {
      void confetti({
        origin: { x: 0.75, y: 0.5 },
        particleCount: 80,
        spread: 70,
        colors: BRAND_COLORS,
      });
    });
  }, 150);

  return () => clearTimeout(timer);
}, [reducedMotion]);
```

**Alternative — import once, fire twice:** To avoid two `import()` calls, import once and reuse:

```typescript
useEffect(() => {
  if (reducedMotion) return;

  void import('canvas-confetti').then(({ default: confetti }) => {
    void confetti({ origin: { x: 0.25, y: 0.5 }, particleCount: 80, spread: 70, colors: BRAND_COLORS });
    const timer = setTimeout(() => {
      void confetti({ origin: { x: 0.75, y: 0.5 }, particleCount: 80, spread: 70, colors: BRAND_COLORS });
    }, 150);
    // Note: timer cleanup must be handled outside this .then()
  });
}, [reducedMotion]);
```

The single-import version is cleaner. Use a ref or outer variable for the timer to preserve cleanup.

### Pattern 3: Lighthouse CLI for Core Web Vitals Measurement

**What:** Run `lighthouse` CLI against `next start` (a production build) to get lab-data LCP and CLS scores.

**When to use:** After implementing lazy loading changes. Measure before and after to document improvement.

**Procedure:**

```bash
# Step 1: Build production
npm run build

# Step 2: Start production server (port 3000)
npm start &

# Step 3: Run Lighthouse (headless Chrome)
npx lighthouse http://localhost:3000 \
  --output=json \
  --output-path=./lighthouse-landing.json \
  --chrome-flags="--headless --no-sandbox" \
  --only-categories=performance

# Step 4: Extract metrics from JSON
node -e "
const r = require('./lighthouse-landing.json');
const lcp = r.audits['largest-contentful-paint'].numericValue;
const cls = r.audits['cumulative-layout-shift'].numericValue;
console.log('LCP:', lcp + 'ms', lcp < 2500 ? 'PASS' : 'FAIL');
console.log('CLS:', cls.toFixed(4), cls < 0.1 ? 'PASS' : 'FAIL');
"
```

**Important:** Lighthouse on localhost does not apply real network throttling by default (it simulates). The score reflects simulated 4G conditions. For this phase, lab data on a production build is the correct measurement.

### Anti-Patterns to Avoid

- **Lazy loading HeroSection:** HeroSection is the LCP element. Making it dynamic would delay the largest contentful paint and worsen LCP. Never lazy load above-fold content.
- **Adding `ssr: false` to below-fold sections:** These sections have no browser-only APIs. SSR must stay on to preserve progressive rendering and avoid layout shifts (CLS impact).
- **Using `React.lazy` directly:** `next/dynamic` is the correct API in Next.js App Router. It handles RSC boundaries correctly.
- **Measuring LCP in dev mode:** `next dev` has hot-reload overhead. Always measure with `next build && next start`.
- **Top-level `import()` that is unused at render time:** The issue with `canvas-confetti` is exactly this — imported at module scope but only fired in useEffect. Move the import inside the effect.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Bundle visualization | Custom webpack stats parser | `npm run analyze` (`@next/bundle-analyzer`) | Already configured; generates interactive treemap |
| Lazy loading | Intersection Observer + manual import logic | `next/dynamic` | Next.js handles RSC boundaries, chunk naming, SSR correctly |
| Performance measurement | Manual timing with `performance.now()` | Lighthouse CLI | Lighthouse measures real LCP/CLS using the browser's paint API |

**Key insight:** All tooling for this phase is already installed or available via npx. The phase is entirely configuration and code changes — no new dependencies.

---

## Common Pitfalls

### Pitfall 1: Named vs. Default Export with next/dynamic

**What goes wrong:** Using `dynamic(() => import('@/components/landing/HowItWorksSection'))` fails silently or throws at runtime because `next/dynamic` expects the dynamic import to resolve to a default export. All four below-fold components are named exports.

**Why it happens:** `next/dynamic` requires a default export by default. Named exports require the `.then()` chaining pattern.

**How to avoid:** Always use `dynamic(() => import('...').then((m) => m.ExportedName))` for named exports.

**Warning signs:** Component renders as `undefined` or throws "The default export is not a React component" at runtime.

### Pitfall 2: ssr:false on Server Components

**What goes wrong:** Adding `{ ssr: false }` to a `next/dynamic()` call in a Server Component file causes a Next.js build error: "`ssr: false` is not allowed with `next/dynamic` in Server Components."

**Why it happens:** `ssr: false` is only valid inside Client Components (`'use client'`). `app/page.tsx` is a Server Component.

**How to avoid:** Do not add `ssr: false`. The landing page sections have no browser APIs and do not need it.

### Pitfall 3: canvas-confetti Import Pattern

**What goes wrong:** `canvas-confetti` uses a default export, but some bundlers and TypeScript configs may see `confetti` as a named import. When converting to dynamic import, `{ default: confetti }` destructuring is the correct pattern.

**Why it happens:** ESM/CJS interop differences. The library's types declare a default export, so `import('canvas-confetti').then(({ default: confetti }) => ...)` is correct.

**Warning signs:** `confetti is not a function` at runtime after refactor.

**How to avoid:** Always destructure `{ default: confetti }` from the dynamic import result.

### Pitfall 4: Measuring LCP Before Production Build

**What goes wrong:** Developer runs Lighthouse against `localhost:3000` while `next dev` is running and gets an artificially inflated LCP score (2-5x slower than production).

**Why it happens:** `next dev` includes HMR runtime, un-minified bundles, and additional dev-only code.

**How to avoid:** Always `npm run build && npm start` before Lighthouse measurement. Kill the dev server first.

### Pitfall 5: Timer Cleanup with Async Dynamic Import

**What goes wrong:** In `ConfettiBlast`, the cleanup function `() => clearTimeout(timer)` is set up before the dynamic import resolves. If the component unmounts before the import resolves, the timer may still fire.

**Why it happens:** The `setTimeout` is created inside a `.then()` callback that runs asynchronously. The cleanup runs before `.then()` resolves.

**How to avoid:** Track the timeout ID in a ref or use an `isMounted` flag inside the effect:

```typescript
useEffect(() => {
  if (reducedMotion) return;
  let timer: ReturnType<typeof setTimeout>;

  void import('canvas-confetti').then(({ default: confetti }) => {
    void confetti({ origin: { x: 0.25, y: 0.5 }, particleCount: 80, spread: 70, colors: BRAND_COLORS });
    timer = setTimeout(() => {
      void confetti({ origin: { x: 0.75, y: 0.5 }, particleCount: 80, spread: 70, colors: BRAND_COLORS });
    }, 150);
  });

  return () => clearTimeout(timer);
}, [reducedMotion]);
```

---

## Code Examples

Verified patterns from official sources:

### Bundle Analysis Run

```bash
# Source: next.config.ts (already configured), package.json "analyze" script
ANALYZE=true npm run build
# Opens three browser tabs: client.html, nodejs.html, edge.html
# Focus on client.html — this is what users download
```

### next/dynamic Named Export

```typescript
// Source: https://nextjs.org/docs/app/guides/lazy-loading
import dynamic from 'next/dynamic';

const HowItWorksSection = dynamic(
  () => import('@/components/landing/HowItWorksSection').then((m) => m.HowItWorksSection)
);
```

### canvas-confetti Dynamic Import with Cleanup Safety

```typescript
// Based on: https://nextjs.org/docs/app/guides/lazy-loading (External Libraries section)
useEffect(() => {
  if (reducedMotion) return;
  let timer: ReturnType<typeof setTimeout>;

  void import('canvas-confetti').then(({ default: confetti }) => {
    void confetti({ origin: { x: 0.25, y: 0.5 }, particleCount: 80, spread: 70, colors: BRAND_COLORS });
    timer = setTimeout(() => {
      void confetti({ origin: { x: 0.75, y: 0.5 }, particleCount: 80, spread: 70, colors: BRAND_COLORS });
    }, 150);
  });

  return () => clearTimeout(timer);
}, [reducedMotion]);
```

### Lighthouse Metric Extraction

```bash
# Run against production build on port 3000
npx lighthouse http://localhost:3000 \
  --output=json \
  --output-path=./lighthouse-landing.json \
  --chrome-flags="--headless --no-sandbox" \
  --only-categories=performance \
  --quiet

# Check results
node -e "
const r = require('./lighthouse-landing.json');
const lcp = r.audits['largest-contentful-paint'].numericValue;
const cls = r.audits['cumulative-layout-shift'].numericValue;
console.log('LCP:', Math.round(lcp) + 'ms', lcp < 2500 ? 'PASS' : 'FAIL');
console.log('CLS:', cls.toFixed(4), cls < 0.1 ? 'PASS' : 'FAIL');
"
```

---

## Current Codebase State

Understanding what already exists, to avoid re-implementing:

| Item | State | Notes |
|------|-------|-------|
| `@next/bundle-analyzer` | Installed and configured | `next.config.ts` already wraps config; `npm run analyze` already in `package.json` |
| `npm run analyze` script | Defined | `ANALYZE=true next build` — ready to run |
| `canvas-confetti` | Top-level import in `ConfettiBlast.tsx` | Must be converted to dynamic import inside `useEffect` |
| Landing page sections | 5 static imports in `app/page.tsx` | `HeroSection` stays static; 4 others need `next/dynamic` |
| `lucide-react` | Already auto-optimized | Next.js 16 auto-applies `optimizePackageImports` for lucide-react — no action needed |
| `framer-motion` | Full import in success page | Not on landing page; not a landing-page LCP concern; defer LazyMotion refactor (high effort, low impact for this phase) |
| `VideoSection` | Already lazy (uses click-to-load iframe pattern) | YouTube iframe only loads after button click — already optimal for LCP; dynamic import still removes its JS from initial bundle |

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| webpack-bundle-analyzer (manual) | `@next/bundle-analyzer` wrapper | ~2021 | Integrated with Next.js build pipeline |
| `React.lazy` + `Suspense` | `next/dynamic` (composite) | ~2022 | Handles SSR and RSC boundaries correctly |
| PageSpeed Insights only | Lighthouse CLI + field data (CrUX) | 2023-2025 | Lab data (Lighthouse) is for development; field data drives Google rankings. For this phase, lab data on production build is the requirement. |

**Deprecated/outdated:**
- `@next/third-parties` for YouTube: This project uses its own `VideoSection` with a custom click-to-load pattern — correct approach, no change needed.
- `optimizePackageImports` for lucide-react: Automatically applied by Next.js 16, no config needed.

---

## Open Questions

1. **framer-motion bundle contribution**
   - What we know: `framer-motion` is imported on the success page (`/quiz/success/[jobId]/page.tsx`). It is NOT imported on the landing page root route.
   - What's unclear: Whether `framer-motion` appears in the landing-page client bundle at all (depends on Next.js chunk splitting heuristics).
   - Recommendation: Run `npm run analyze` first. If framer-motion appears in the landing page chunks, consider LazyMotion refactor in a follow-up. Do not preemptively optimize.

2. **LCP element identity**
   - What we know: The hero section has an `<h1>` heading and a play button audio card. No `<img>` or `<video>` tag in HeroSection (the audio card uses a custom progress bar, not an image).
   - What's unclear: Whether Lighthouse identifies the `<h1>` or the audio card as the LCP element.
   - Recommendation: After running Lighthouse, check the "LCP element" in the report. If an image element in a below-fold section is incorrectly identified (unlikely but possible with lazy loading), investigate.

3. **CLS sources**
   - What we know: No images without explicit dimensions detected in HeroSection. Fonts use `display: swap` which can cause FOUT (flash of unstyled text) contributing to CLS.
   - What's unclear: Whether `display: swap` on DM Sans / Libre Baskerville causes measurable CLS on this page.
   - Recommendation: If CLS > 0.1, check Lighthouse's "Avoid large layout shifts" audit. If font swap is the cause, the fix is `font-display: optional` (no swap) or preloading critical font files — but do not implement preemptively.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Playwright 1.58.2 |
| Config file | `playwright.config.ts` |
| Quick run command | `npm run test:e2e` |
| Full suite command | `npm run test:e2e` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PERF-01 | Bundle analysis report generated | manual verification | `npm run analyze` | N/A — manual |
| PERF-02 | Below-fold sections not in initial bundle | manual-only (bundle inspection) | `npm run analyze` → client.html | N/A — manual |
| PERF-03 | canvas-confetti absent from non-success routes | manual-only (bundle inspection) | `npm run analyze` → client.html | N/A — manual |
| PERF-04 | LCP < 2.5s and CLS < 0.1 | manual (Lighthouse CLI) | `npx lighthouse http://localhost:3000 ...` | N/A — manual |

**Justification for manual-only tests:** Performance metrics and bundle composition cannot be reliably asserted by Playwright E2E tests. Bundle analysis requires inspecting webpack output (not a DOM assertion). Lighthouse metrics require a real browser paint measurement. These are inherently non-automatable with the project's current test stack. The success criterion for PERF-04 is documented measurements from the Lighthouse JSON output.

### Sampling Rate

- **Per task commit:** Verify landing page still renders correctly — `npm run test:e2e -- e2e/landing.spec.ts`
- **Per wave merge:** Full E2E suite — `npm run test:e2e`
- **Phase gate:** Lighthouse report showing LCP < 2500ms and CLS < 0.1 before `/gsd:verify-work`

### Wave 0 Gaps

None — no new test files need to be created. The bundle analysis and Lighthouse measurement are documented as manual verification steps.

---

## Sources

### Primary (HIGH confidence)

- Next.js official docs (v16.1.6, fetched 2026-03-06): [Lazy Loading guide](https://nextjs.org/docs/app/guides/lazy-loading) — `next/dynamic` patterns, named export syntax, `ssr: false` limitations
- Next.js official docs (v16.1.6, fetched 2026-03-06): [Package Bundling guide](https://nextjs.org/docs/app/guides/package-bundling) — `@next/bundle-analyzer` setup, `ANALYZE=true` usage, output format
- Next.js official docs (v16.1.6, fetched 2026-03-06): [optimizePackageImports](https://nextjs.org/docs/app/api-reference/config/next-config-js/optimizePackageImports) — `lucide-react` is auto-optimized by default
- Project source inspection (2026-03-06): `next.config.ts`, `package.json`, `app/page.tsx`, `ConfettiBlast.tsx` — confirmed existing state

### Secondary (MEDIUM confidence)

- [Lighthouse npm package](https://www.npmjs.com/package/lighthouse) — CLI usage and JSON output format
- [Core Web Vitals 2025-2026](https://www.digitalapplied.com/blog/core-web-vitals-2026-inp-lcp-cls-optimization-guide) — confirmed LCP < 2.5s and CLS < 0.1 thresholds
- [Motion LazyMotion docs](https://motion.dev/motion/lazy-motion/) — confirmed LazyMotion exists but page content not extractable; defer to open question

### Tertiary (LOW confidence)

- WebSearch results on framer-motion LazyMotion bundle sizes — claims 34kb → 4.6kb reduction; not independently verified; moot because framer-motion is not on landing page critical path

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — `@next/bundle-analyzer` and `next/dynamic` verified against Next.js 16 official docs; project already has both configured or available
- Architecture: HIGH — landing page structure confirmed by source inspection; all 4 below-fold components identified; `ConfettiBlast` pattern confirmed
- Pitfalls: HIGH — named export pitfall and `ssr: false` limitation confirmed by official docs; timer cleanup pitfall derived from code inspection

**Research date:** 2026-03-06
**Valid until:** 2026-06-06 (stable APIs; Next.js 16 lazy loading is stable)
