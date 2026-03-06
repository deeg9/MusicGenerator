# Deferred Items — Phase 10

Items discovered during execution but out of scope (pre-existing issues).

## Pre-existing Test Failures

### HeroSection.test.tsx — 2 failing tests
- **Tests**: "CTA link has bg-accent class" and "CTA link does NOT have bg-primary class"
- **Root cause**: Tests query `a[href="#create"]` but HeroSection no longer renders that link with that exact href
- **Status**: Pre-existing before Phase 10 — confirmed by stashing Phase 10 changes and re-running
- **Action needed**: Update HeroSection component or tests in a future phase (likely Phase 9 or 11 cleanup)

## Pre-existing Build Issues

### /style-guide page build error
- **Error**: "Failed to collect page data for /style-guide" during `npx next build`
- **Root cause**: `src/app/style-guide/page.tsx` calls `notFound()` at module top level when `NODE_ENV === 'production'`, which causes Next.js page data collection to fail in production builds
- **Status**: Pre-existing before Phase 10 — not related to library data layer changes
- **TypeScript check**: `npx tsc --noEmit` passes with zero errors
- **Action needed**: Move the `notFound()` call inside the page component function, or guard the entire module differently
