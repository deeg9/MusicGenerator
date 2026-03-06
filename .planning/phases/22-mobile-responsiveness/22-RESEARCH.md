# Phase 22: Mobile Responsiveness — Research

**Researched:** 2026-03-06
**Domain:** Tailwind CSS responsive design, Playwright mobile viewport testing, touch target compliance
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| MOB-01 | Landing page renders correctly at iPhone SE and iPad viewports — no horizontal overflow, all CTA buttons tappable | Existing layout largely uses responsive Tailwind classes; nav links hidden on mobile but anchor tags need `display:block` on mobile menu; HeroAudioCard has `max-w-sm` which constrains width safely |
| MOB-02 | Quiz funnel is usable at mobile viewport — touch targets meet 44px minimum, layout does not break | SelectionCard uses `p-4` which may be under 44px at narrow widths; navigation buttons need py-3 minimum; quiz container uses `min-h-[400px]` which needs audit at iPhone SE |
| MOB-03 | Success page audio player is visible and functional at mobile viewport — play button responds to touch | SongPlayer play button is `w-16 h-16` (64px) — already above 44px minimum; progress bar click needs touch equivalent; success page action buttons use `flex-col sm:flex-row` pattern already |
</phase_requirements>

---

## Summary

Phase 22 is a polish-and-verification phase. The Notevra codebase already uses Tailwind CSS v4 with responsive prefixes (`md:`, `sm:`, `lg:`) throughout. The foundation is strong — most key components have mobile-first or responsive patterns. The work is surgical: audit for specific violations, fix what's broken, add Playwright mobile tests against the two pre-configured projects (`mobile-iphone` and `mobile-ipad`).

The three primary concerns are: (1) landing page nav links are hidden on mobile behind a hamburger drawer — the existing implementation looks complete but needs E2E verification that the CTA button in the mobile header is reachable; (2) quiz `SelectionCard` grid uses `grid-cols-2 sm:grid-cols-3` which at iPhone SE (375px) renders 2-column grids — the cards' `p-4` padding gives a touch target of roughly 40px high depending on content, possibly below the 44px WCAG minimum; (3) the quiz navigation `px-6 py-8` wrapper combined with the `max-w-2xl` container should not overflow, but needs inspection.

The Playwright config already defines `mobile-iphone` (iPhone SE) and `mobile-ipad` (iPad) projects. The `test:e2e` script runs `--project=chromium` only. Phase 22 should add a `test:e2e:mobile` script and write mobile-specific spec files rather than modifying existing desktop specs.

**Primary recommendation:** Write minimal targeted fixes to CSS (touch targets, container overflow) and new Playwright specs that run against `mobile-iphone` and `mobile-ipad` projects. Do not rewrite existing desktop-passing tests.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Tailwind CSS | v4 (already installed) | Responsive utilities via `sm:`, `md:` prefixes | Already the project CSS framework |
| @playwright/test | ^1.58.2 (already installed) | Mobile viewport E2E testing | Already configured with `devices['iPhone SE']` and `devices['iPad']` |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@playwright/test` `devices` | Built-in | Provides real-device viewport/UA presets | Use `devices['iPhone SE']` (375x667, Safari UA) and `devices['iPad']` (768x1024) |

### No New Packages Required
This phase requires zero new npm packages. Playwright device presets and Tailwind responsive utilities are already in place.

---

## Architecture Patterns

### Playwright Mobile Projects (Already Configured)
The `playwright.config.ts` already defines:
```typescript
// Already in playwright.config.ts
{
  name: 'mobile-iphone',
  use: { ...devices['iPhone SE'] },
},
{
  name: 'mobile-ipad',
  use: { ...devices['iPad'] },
},
```

Running mobile tests:
```bash
npx playwright test --project=mobile-iphone
npx playwright test --project=mobile-ipad
```

Add to `package.json`:
```json
"test:e2e:mobile": "playwright test --project=mobile-iphone --project=mobile-ipad"
```

### Mobile Spec Pattern — New File Per Project
Do NOT modify `landing.spec.ts`, `quiz-validation.spec.ts`, etc. Create new files:
```
e2e/
├── mobile-landing.spec.ts      # MOB-01: landing at iPhone SE + iPad
├── mobile-quiz.spec.ts         # MOB-02: quiz funnel at mobile viewport
└── mobile-success.spec.ts      # MOB-03: success page audio at mobile
```

Each spec runs against the mobile projects and reuses existing POMs:
```typescript
// Source: Playwright docs — project-specific specs pattern
import { test, expect } from '@playwright/test';
import { LandingPage } from './pages/landing';

// These specs run only on mobile projects (configured via CLI project flag)
test.describe('Landing — mobile', () => {
  test('hero CTA is tappable at iPhone SE', async ({ page }) => {
    const landing = new LandingPage(page);
    await landing.goto();
    await expect(landing.heroCtaButton).toBeVisible();
    // No horizontal overflow
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = page.viewportSize()!.width;
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth);
  });
});
```

### Horizontal Overflow Check Pattern
The canonical way to detect horizontal overflow in Playwright:
```typescript
// Source: Playwright docs + web standards — document.body.scrollWidth vs viewport
const bodyScrollWidth = await page.evaluate(() => document.body.scrollWidth);
const viewportWidth = page.viewportSize()!.width;
expect(bodyScrollWidth).toBeLessThanOrEqual(viewportWidth);
```

This catches elements that overflow to the right (most common cause of mobile horizontal scroll).

### Touch Target Size Verification
Playwright can assert bounding box dimensions:
```typescript
const box = await locator.boundingBox();
expect(box!.height).toBeGreaterThanOrEqual(44); // WCAG 2.5.5 minimum
expect(box!.width).toBeGreaterThanOrEqual(44);
```

Use for SelectionCards, navigation buttons, and the audio player play button.

### Tailwind Fix: Minimum Touch Target
WCAG 2.5.5 requires 44x44px minimum for interactive elements. The `min-h-11` utility is `44px` in Tailwind (11 * 4px = 44px):
```html
<!-- Add min-h-11 to SelectionCard to guarantee 44px height -->
<button className="... min-h-11 ...">
```

### Recommended Project Structure (no change needed)
The existing structure is correct. New mobile specs go into `e2e/`:
```
e2e/
├── pages/                      # Existing POMs (reuse as-is)
│   ├── landing.ts
│   ├── quiz.ts
│   └── success.ts
├── mobile-landing.spec.ts      # NEW — Phase 22
├── mobile-quiz.spec.ts         # NEW — Phase 22
└── mobile-success.spec.ts      # NEW — Phase 22
```

### Anti-Patterns to Avoid
- **Modifying existing desktop specs:** Desktop specs pass on `chromium`. Adding mobile assertions to them would require all mobile tests to also run on desktop, creating confusion.
- **Using `page.setViewportSize()` inside specs:** The viewport is already set by the device preset in `playwright.config.ts`. Do not override it.
- **Adding `test.use({ ...devices['iPhone SE'] })` to spec files:** The project config already handles this. Specs run against whatever projects the `--project` flag targets.
- **`overflow: hidden` to hide overflow instead of fixing it:** Masks the problem without solving it.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Mobile viewport simulation | Custom page.setViewportSize() calls | `devices['iPhone SE']` preset in Playwright config | Presets include correct UA string, device pixel ratio, and touch capabilities |
| Touch event simulation | Custom touchstart/touchend events | Playwright `.tap()` or standard `.click()` | Playwright click events work for both mouse and touch in the device preset context |
| Overflow detection | Screenshot diffing | `document.body.scrollWidth <= viewportWidth` assertion | Programmatic — fast, no visual regression infrastructure needed |

---

## Common Pitfalls

### Pitfall 1: Mobile Menu Nav Links Not Testable With Existing POM
**What goes wrong:** `landing.ts` defines `howItWorksLink`, `examplesLink`, `reviewsLink` using `.first()`. On mobile, the desktop nav links are `hidden md:hidden` — only the mobile drawer version is rendered in the DOM when the hamburger is open. The `.first()` selector may resolve to the hidden desktop link.
**Why it happens:** Header renders both desktop nav (`hidden md:flex`) and mobile drawer (`md:hidden`) simultaneously. The desktop links exist in DOM but are CSS-hidden.
**How to avoid:** In mobile tests, use `.locator('.md\\:hidden a[href="#how-it-works"]')` or click the hamburger button first to open the drawer, then assert the visible mobile links. Alternatively, verify the mobile CTA button (`Create Your Song` in the `flex md:hidden` div) directly — it's always visible.
**Warning signs:** `toBeVisible()` passing on mobile when a desktop-only element is targeted — Playwright's `isVisible()` checks computed CSS visibility, so `display:none` via `hidden` class will correctly fail.

### Pitfall 2: `min-h-[400px]` Quiz Container May Overflow on iPhone SE
**What goes wrong:** The quiz step container uses `min-h-[400px]` with `overflow-hidden`. On iPhone SE (375px wide), the card content (SelectionCards in 2-column grid) may push the height beyond the visible viewport, requiring the user to scroll.
**Why it happens:** `min-h-[400px]` forces the animated container to be at least 400px tall regardless of viewport height.
**How to avoid:** This is expected behavior — the user scrolls to see full content. The critical check is no *horizontal* overflow. Verify `scrollWidth <= viewportWidth`.
**Warning signs:** Content cut off horizontally, not vertically. Vertical scroll is acceptable on mobile.

### Pitfall 3: SongPlayer Progress Bar Needs Touch Interaction
**What goes wrong:** `handleProgressClick` uses `e.clientX` which works for mouse events. On mobile, touch events fire `touchstart`/`touchend` not `click`.
**Why it happens:** HTML `div` elements do not automatically translate touch events to click events on all mobile browsers.
**How to avoid:** React synthetic `onClick` on a `div` does fire on mobile touch (React normalizes this). Playwright's `.click()` against the `mobile-iphone` project also translates to a tap. This is likely NOT broken — confirm with a Playwright test that clicks the progress bar on mobile.
**Warning signs:** If manual device testing shows progress bar unresponsive, wrap the `div` in a `button` element with `type="button"` for guaranteed touch handling.

### Pitfall 4: `test:e2e` Script Only Runs Chromium
**What goes wrong:** Running `npm run test:e2e` after adding mobile specs will NOT run them — it passes `--project=chromium` explicitly.
**Why it happens:** Intentional — the existing script was set up to avoid running heavy generation tests on mobile unnecessarily.
**How to avoid:** Add `"test:e2e:mobile": "playwright test --project=mobile-iphone --project=mobile-ipad"` to `package.json`. Mobile specs reference this new script. Do not change the existing `test:e2e` script.

### Pitfall 5: `devices['iPad']` viewport is 768px — `md:` breakpoint activates
**What goes wrong:** At 768px, Tailwind's `md:` breakpoint fires. The iPad project will see the DESKTOP nav (not the hamburger), the 3-column grid layouts, etc. Mobile-specific tests should not test for the hamburger menu on iPad.
**Why it happens:** Tailwind's default `md:` breakpoint is 768px. iPad is exactly at the breakpoint boundary.
**How to avoid:** Mobile-specific concerns (hamburger menu, 2-column grids) are iPhone SE only. iPad tests should focus on no horizontal overflow and CTA tappability — both of which apply to the desktop layout rendered on iPad.

### Pitfall 6: `audioRef.current` in SongPlayer starts null on mobile Safari
**What goes wrong:** Mobile Safari may not fire `loadedmetadata` reliably for remote audio until the user interacts with the page (autoplay policy).
**Why it happens:** iOS autoplay restrictions block audio preloading until user gesture.
**How to avoid:** SongPlayer already handles this — it uses `preload="metadata"` and listens to both `loadedmetadata` AND `canplay`. The play button only calls `audio.play()` on explicit user click. Playwright `.click()` in a device context counts as a user gesture. MOB-03 only requires the player to be visible and the play button to respond to tap — not that audio actually plays in CI (which would need network access to R2).

---

## Code Examples

### Horizontal Overflow Assertion
```typescript
// Source: Playwright docs + MDN scrollWidth
test('no horizontal overflow at iPhone SE', async ({ page }) => {
  await page.goto('/');
  const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
  const viewportWidth = page.viewportSize()!.width; // 375 for iPhone SE
  expect(scrollWidth).toBeLessThanOrEqual(viewportWidth);
});
```

### Opening Mobile Header and Asserting CTA
```typescript
// Header has CTA in 'flex md:hidden' div — always visible without opening drawer
test('mobile header CTA is tappable', async ({ page }) => {
  await page.goto('/');
  // The mobile CTA is the first 'Create Your Song' link in the md:hidden block
  const mobileCta = page.locator('.md\\:hidden').getByRole('link', { name: /create your song/i });
  await expect(mobileCta).toBeVisible();
  const box = await mobileCta.boundingBox();
  expect(box!.height).toBeGreaterThanOrEqual(44);
});
```

Note: Tailwind v4 with `@import "tailwindcss"` uses `hidden` utility and `md:hidden` — these are standard Tailwind v4 classes. The backslash escaping of `:` in CSS selectors is needed in querySelector/Playwright CSS selectors.

### SelectionCard Touch Target Verification
```typescript
// Source: WCAG 2.5.5 — minimum 44x44px touch targets
test('relationship selection cards meet 44px minimum', async ({ page }) => {
  await page.goto('/quiz');
  // Get first SelectionCard button
  const firstCard = page.locator('button[aria-pressed]').first();
  await expect(firstCard).toBeVisible();
  const box = await firstCard.boundingBox();
  expect(box!.height).toBeGreaterThanOrEqual(44);
  // Confirm it's tappable
  await firstCard.click();
  await expect(firstCard).toHaveAttribute('aria-pressed', 'true');
});
```

### Audio Player Visible and Play Button Responds to Tap
```typescript
// Source: Phase 21 pattern — toBeAttached() for hidden audio elements
test('audio player is visible and play button tappable on mobile', async ({ page }) => {
  // Navigate to a pre-completed success page (mock or real jobId)
  await page.goto(`/quiz/success/${KNOWN_JOB_ID}?name=Test`);
  // Wait for ready state
  await expect(page.getByRole('heading', { name: /your song is ready/i })).toBeVisible({ timeout: 30_000 });
  // Audio element is attached to DOM
  await expect(page.locator('audio')).toBeAttached();
  // Play button is visible and meets touch target size
  const playButton = page.getByRole('button', { name: /play/i });
  await expect(playButton).toBeVisible();
  const box = await playButton.boundingBox();
  expect(box!.height).toBeGreaterThanOrEqual(44); // w-16 h-16 = 64px — passes
});
```

### Tailwind Fix for SelectionCard Touch Target
```typescript
// In SelectionCard.tsx — add min-h-11 to guarantee 44px height
className={[
  'flex flex-col items-center gap-2 rounded-xl p-4 text-center min-h-11',
  // ... rest of classes
].join(' ')}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual browser resizing | Playwright `devices` presets with real UA strings | Playwright v1.20+ | Accurate mobile simulation including touch, DPR, UA |
| CSS media query only testing | Both CSS + Playwright viewport assertion | Industry standard | Catches overflow that media queries alone miss |
| Separate mobile stylesheets | Tailwind responsive utilities (`sm:`, `md:`) | Tailwind v1+ | No separate files needed |

---

## Open Questions

1. **Will `test:e2e:mobile` run happy-path generation tests?**
   - What we know: `happy-path.spec.ts` has a POD_AVAILABLE gate that skips when pod is unreachable. Mobile projects will also pick up this spec if run with `--project=mobile-iphone`.
   - What's unclear: Whether to include or exclude `happy-path.spec.ts` from mobile runs.
   - Recommendation: Use `npx playwright test e2e/mobile-*.spec.ts --project=mobile-iphone --project=mobile-ipad` to run ONLY mobile-specific specs, avoiding generation test overhead.

2. **Does the mobile header CTA button (`px-4 py-2`) meet 44px?**
   - What we know: `py-2` = 8px vertical padding each side + ~20px text = ~36px total height. Likely under 44px.
   - What's unclear: Exact rendered height with line-height and font.
   - Recommendation: Measure with `boundingBox()` in test. If under 44px, increase to `py-2.5` (10px) or add `min-h-11`.

3. **Does `overflow-hidden` on the quiz step container cause content clipping on mobile?**
   - What we know: `relative overflow-hidden min-h-[400px] w-full max-w-2xl` — the overflow-hidden is needed for the slide animation to clip exiting steps.
   - What's unclear: Whether content inside taller steps (like Step 3 with textarea) gets clipped or scrolls.
   - Recommendation: Test Steps 3-5 (textarea steps) at iPhone SE. If height is insufficient, `min-h-[400px]` may need to become `min-h-[500px]` or `min-h-fit`.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Playwright 1.58.2 |
| Config file | `playwright.config.ts` (root) |
| Quick mobile run | `npx playwright test e2e/mobile-*.spec.ts --project=mobile-iphone` |
| Full mobile suite | `npx playwright test e2e/mobile-*.spec.ts --project=mobile-iphone --project=mobile-ipad` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| MOB-01 | Landing has no horizontal overflow at iPhone SE (375px) | E2E | `npx playwright test e2e/mobile-landing.spec.ts --project=mobile-iphone` | ❌ Wave 0 |
| MOB-01 | Landing CTA buttons visible and tappable (44px+) at iPhone SE and iPad | E2E | `npx playwright test e2e/mobile-landing.spec.ts --project=mobile-iphone --project=mobile-ipad` | ❌ Wave 0 |
| MOB-02 | All 6 quiz steps completable at iPhone SE — no overflow, cards tappable | E2E | `npx playwright test e2e/mobile-quiz.spec.ts --project=mobile-iphone` | ❌ Wave 0 |
| MOB-03 | Success page audio player visible and play button responds at iPhone SE | E2E | `npx playwright test e2e/mobile-success.spec.ts --project=mobile-iphone` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npx playwright test e2e/mobile-landing.spec.ts --project=mobile-iphone` (quick, no pod dependency)
- **Per wave merge:** `npx playwright test e2e/mobile-*.spec.ts --project=mobile-iphone --project=mobile-ipad`
- **Phase gate:** Full mobile suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `e2e/mobile-landing.spec.ts` — covers MOB-01
- [ ] `e2e/mobile-quiz.spec.ts` — covers MOB-02
- [ ] `e2e/mobile-success.spec.ts` — covers MOB-03
- [ ] `package.json` script `"test:e2e:mobile"` — new entry point for mobile runs

---

## Specific Component Audit

This section summarizes what the planner can directly use to scope fixes.

### Landing Page — MOB-01

| Component | Issue? | Details |
|-----------|--------|---------|
| Header | Likely OK | Mobile CTA (`flex md:hidden`) present; hamburger present; desktop nav hidden with `hidden md:flex` |
| Header mobile CTA height | Needs check | `px-4 py-2` ≈ 36px tall — may be under 44px minimum |
| HeroSection | OK | `text-4xl md:text-5xl`, `py-20 md:py-28`, `px-4` — responsive |
| HeroAudioCard | OK | `max-w-sm w-full` — constrains to container, no overflow risk |
| HowItWorksSection | OK | `grid-cols-1 md:grid-cols-3` — single column on mobile |
| TestimonialsSection | OK | `grid-cols-1 md:grid-cols-2 lg:grid-cols-4` — single column on mobile |
| VideoSection | OK | `aspect-video` — responsive by nature |
| BottomCtaSection | Check | `flex-col sm:flex-row` trust badges — should collapse properly |
| Footer | Check | `grid-cols-2 md:grid-cols-4` — 2 columns on mobile, may need review at 375px |

### Quiz Page — MOB-02

| Component | Issue? | Details |
|-----------|--------|---------|
| Quiz container | Check | `min-h-[400px]` with `overflow-hidden` — animation requires overflow-hidden; verify content not clipped |
| Quiz nav buttons | Check | `py-3` navigation buttons ≈ 44px with line-height; confirm |
| Back button | Likely small | `text-sm font-medium` with icon — touch target may be small; needs `min-h-11 min-w-11` |
| SelectionCards | Fix needed | `p-4` on card — rendered height depends on icon + label. On 2-col grid at 375px, each card is ~155px wide; height depends on content, may be 40-42px without `min-h-11` |
| PillButton (voice) | OK | `py-2 px-5` ≈ 36px — below 44px but pills are typically exempted if they are not primary actions; label text makes them wider which compensates |
| Text inputs/textareas | OK | `py-3` = 12px padding + font ≈ 44px; within expected range |
| QuizCard | OK | `p-6 sm:p-8` — 24px padding on mobile, fine |

### Success Page — MOB-03

| Component | Issue? | Details |
|-----------|--------|---------|
| SongPlayer play button | OK | `w-16 h-16` = 64px — well above 44px minimum |
| SongPlayer progress bar | Check | `h-2` progress bar has small touch target — but clicking it is non-critical (scrubbing); play/pause is primary action |
| Action buttons | OK | `flex-col sm:flex-row` — stacks on mobile, each button full width |
| Loading state | OK | Centered content, no overflow risk |
| Error/timeout states | OK | `max-w-sm` containers, centered |

---

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection — all component files read and audited (2026-03-06)
- `playwright.config.ts` — mobile projects confirmed defined with `devices['iPhone SE']` and `devices['iPad']`
- Tailwind CSS v4 docs (inline knowledge) — responsive prefix behavior is unchanged from v3

### Secondary (MEDIUM confidence)
- WCAG 2.5.5 — 44x44px minimum touch target size (established standard, well-documented)
- Playwright `devices` presets — `devices['iPhone SE']` is 375x667 viewport with Mobile Safari UA (Playwright built-in, HIGH confidence)
- `devices['iPad']` is 768x1024 (Playwright built-in, HIGH confidence)

### Tertiary (LOW confidence)
- iOS autoplay behavior impact on `audio.play()` in Playwright device context — general knowledge, not test-verified for this specific setup

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new packages, Tailwind + Playwright already installed
- Architecture: HIGH — code directly inspected, patterns confirmed
- Pitfalls: HIGH for CSS issues (direct code inspection), MEDIUM for iOS audio behavior (general knowledge)

**Research date:** 2026-03-06
**Valid until:** 2026-06-06 (stable domain — Tailwind v4 + Playwright patterns unlikely to change)
