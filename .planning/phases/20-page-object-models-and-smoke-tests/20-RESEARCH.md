# Phase 20: Page Object Models and Smoke Tests - Research

**Researched:** 2026-03-06
**Domain:** Playwright Page Object Models, E2E spec authoring, quiz funnel selectors
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| INFRA-04 | Set up Page Object Models for landing, quiz, and success pages | POM class pattern documented; all selectors audited from source; fixture pattern for test injection |
| E2E-01 | Landing page loads with hero, CTA buttons, navigation | HeroSection, Header source audited; exact text strings, selectors, and nav hrefs documented |
| E2E-02 | Quiz funnel completes all 6 steps with valid input | All 6 step schemas and required fields documented; valid fixture values specified |
| E2E-03 | Quiz validation rejects invalid input at each step | All 6 Zod schemas audited; error `role="alert"` elements confirmed for assertion |
| E2E-04 | Quiz back/forward navigation preserves state | localStorage key `notevra_quiz_v1` confirmed; state preservation via localStorage read on mount |
</phase_requirements>

---

## Summary

Phase 20 builds three Page Object Model (POM) classes — `LandingPage`, `QuizPage`, `SuccessPage` — then uses them to write three E2E specs that pass without needing the live generation API: landing page smoke, quiz validation, and back/forward navigation. The infrastructure (Playwright 1.58.2, `playwright.config.ts`, `globalSetup`, chromium-only project) is fully in place from Phase 18.

The quiz funnel is a 6-step single-page component at `/quiz/page.tsx`. All validation happens client-side via Zod schemas before any navigation. Step advances happen by clicking the "Next" button; the component uses `AnimatePresence` (disabled via `reducedMotion: reduce` in the Playwright config) for slide transitions. State persists to `localStorage` under key `notevra_quiz_v1` after every `data` state update.

The POM classes should wrap locators as class properties and expose action methods (fill, click, assert) — not raw `page` references. Tests import POMs directly (no fixture file needed at this phase scale; three POMs, three spec files is straightforward without the added indirection of `test.extend()`).

**Primary recommendation:** Write thin POM classes with typed `Locator` properties, use `page.getByRole` and `page.getByPlaceholder` selectors (resilient to class renames), and drive all three specs from valid fixture data defined once in a shared `e2e/fixtures.ts` file.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @playwright/test | ^1.58.2 (already installed) | POM base types (Page, Locator), test runner | Already installed in Phase 18; provides `Page`, `Locator`, `expect` |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| None new | — | No new packages needed | All tooling is in place from Phase 18 |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Direct POM imports in specs | `test.extend()` fixture pattern | Fixtures add indirection and a custom `test` export; justified at scale (10+ spec files); overkill for 3 spec files |
| `page.locator('css selector')` | `page.getByRole()`, `page.getByPlaceholder()` | Role/placeholder selectors are more resilient to Tailwind class changes; ARIA-aligned; official Playwright recommendation |
| Seeding localStorage before page.goto() | Navigating forward through steps | For state-preservation tests, `page.evaluate()` can seed localStorage then navigate — avoids slow step-by-step traversal |

**Installation:**
```bash
# Nothing to install — @playwright/test 1.58.2 already in devDependencies
```

---

## Architecture Patterns

### Recommended Project Structure
```
e2e/
├── global-setup.ts          # already exists (Phase 18)
├── smoke.spec.ts            # already exists (Phase 18)
├── pages/                   # NEW — Phase 20
│   ├── landing.ts           # LandingPage POM
│   ├── quiz.ts              # QuizPage POM
│   └── success.ts           # SuccessPage POM
├── fixtures.ts              # NEW — shared valid quiz data
├── landing.spec.ts          # NEW — E2E-01
├── quiz-validation.spec.ts  # NEW — E2E-03
├── quiz-navigation.spec.ts  # NEW — E2E-04 (back/forward + state)
└── tsconfig.json            # already exists (Phase 18)
playwright.config.ts         # already exists (Phase 18)
```

Note: E2E-02 (full 6-step completion) is covered as part of quiz-navigation.spec.ts which must traverse all steps to test preservation. A dedicated `quiz-complete.spec.ts` for E2E-02 is not required if navigation spec demonstrates full valid traversal.

### Pattern 1: POM Class Structure
**What:** Class with `Page` reference, typed `Locator` properties, and action/assertion methods
**When to use:** All three POM files

```typescript
// e2e/pages/landing.ts
// Source: https://playwright.dev/docs/pom
import { type Page, type Locator } from '@playwright/test';

export class LandingPage {
  readonly page: Page;

  // Locators — defined once, used everywhere
  readonly heroHeading: Locator;
  readonly heroCtaButton: Locator;
  readonly navCreateButton: Locator;
  readonly howItWorksSection: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heroHeading = page.getByRole('heading', {
      name: /turn your feelings into a song/i,
    });
    // Hero CTA (inside HeroSection)
    this.heroCtaButton = page.getByRole('link', { name: /create your song/i }).first();
    // Header nav CTA (desktop)
    this.navCreateButton = page.getByRole('link', { name: /create your song/i }).nth(1);
    this.howItWorksSection = page.locator('#how-it-works');
  }

  async goto() {
    await this.page.goto('/');
  }
}
```

### Pattern 2: QuizPage POM — Per-Step Selector Strategy
**What:** Selectors keyed to ARIA roles and placeholder text, not CSS classes
**When to use:** quiz.ts POM

```typescript
// e2e/pages/quiz.ts
import { type Page, type Locator } from '@playwright/test';

export class QuizPage {
  readonly page: Page;

  // Navigation controls
  readonly nextButton: Locator;
  readonly backButton: Locator;
  readonly progressIndicator: Locator;

  // Step 1 selectors
  readonly step1NameInput: Locator;
  // Step 1 relationship cards selected by aria-pressed
  // Step 3–5 textarea selectors
  readonly step3TextArea: Locator;
  readonly step4TextArea: Locator;
  readonly step5TextArea: Locator;
  // Step 6
  readonly step6LanguageSelect: Locator;
  readonly step6EmailInput: Locator;

  // Error messages (role="alert")
  readonly errorAlert: Locator;

  constructor(page: Page) {
    this.page = page;
    this.nextButton = page.getByRole('button', { name: /next/i });
    this.backButton = page.getByRole('button', { name: /back/i });
    this.progressIndicator = page.locator('[aria-label]').filter({ hasText: /step/i });

    // Step 1
    this.step1NameInput = page.getByPlaceholder('Their first name');

    // Steps 3–5: all use textarea; distinguish by placeholder
    this.step3TextArea = page.getByPlaceholder(/kind, patient/i);
    this.step4TextArea = page.getByPlaceholder(/got lost driving/i);
    this.step5TextArea = page.getByPlaceholder(/I don't say it enough/i);

    // Step 6
    this.step6LanguageSelect = page.getByRole('combobox'); // <select>
    this.step6EmailInput = page.getByPlaceholder('your@email.com');

    // Validation errors
    this.errorAlert = page.getByRole('alert');
  }

  async goto() {
    await this.page.goto('/quiz');
  }

  // Helper: click a SelectionCard (button[aria-pressed]) by visible label
  async selectOption(label: string) {
    await this.page.getByRole('button', { name: label, exact: true }).click();
  }

  async clickNext() {
    await this.nextButton.click();
  }

  async clickBack() {
    await this.backButton.click();
  }
}
```

### Pattern 3: SuccessPage POM
**What:** Minimal POM for loading / ready / error states
**When to use:** success.ts — primarily consumed by Phase 21; stub only needed in Phase 20

```typescript
// e2e/pages/success.ts
import { type Page, type Locator } from '@playwright/test';

export class SuccessPage {
  readonly page: Page;
  readonly loadingHeading: Locator;
  readonly readyHeading: Locator;
  readonly audioPlayer: Locator;
  readonly downloadButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.loadingHeading = page.getByRole('heading', { name: /creating your song/i });
    this.readyHeading = page.getByRole('heading', { name: /your song is ready/i });
    this.audioPlayer = page.locator('audio');
    this.downloadButton = page.getByRole('link', { name: /download song/i });
  }

  async goto(jobId: string, name = '') {
    await this.page.goto(`/quiz/success/${jobId}?name=${encodeURIComponent(name)}`);
  }
}
```

### Pattern 4: Shared Fixtures File
**What:** Valid quiz data used across all specs — single source of truth
**When to use:** Import into any spec that needs to fill the quiz

```typescript
// e2e/fixtures.ts
export const VALID_QUIZ_DATA = {
  relationshipType: 'Mom',       // SelectionCard label
  recipientName: 'Maria',        // min 1 char, max 50
  genre: 'Pop',                  // SelectionCard label
  voicePreference: 'Female',     // PillButton label
  qualities: 'She is kind, patient, and always knows how to make me laugh.',  // min 20 chars
  memories: 'We got lost driving to the coast and ended up at a tiny diner.', // min 20 chars
  message: "I don't say it enough, but you mean everything to me, Mom.",       // min 20 chars
  language: 'English',           // <select> option value
  email: '',                     // optional — leave blank to avoid email validation
};
```

### Pattern 5: State Seeding via localStorage
**What:** Pre-populate quiz state directly in the browser before navigating to avoid slow step traversal
**When to use:** Back/forward navigation tests where you need to start on step N, not step 0

```typescript
// Source: https://playwright.dev/docs/api/class-page#page-evaluate
// Used in quiz-navigation.spec.ts to seed prior step answers
await page.goto('/quiz');  // must navigate first so localStorage origin is set
await page.evaluate((data) => {
  localStorage.setItem('notevra_quiz_v1', JSON.stringify(data));
}, VALID_QUIZ_DATA);
await page.reload();  // reload so the component reads the seeded state
```

This technique skips having to click through 5 steps to test step 6 preservation.

### Pattern 6: Asserting on SelectionCard Selected State
**What:** SelectionCards use `aria-pressed` — use Playwright's attribute assertion
**When to use:** Verifying a card is still selected after back/forward navigation

```typescript
// Source: SelectionCard.tsx uses aria-pressed={selected}
await expect(quizPage.page.getByRole('button', { name: 'Mom', exact: true }))
  .toHaveAttribute('aria-pressed', 'true');
```

### Anti-Patterns to Avoid
- **Selecting elements by Tailwind classes:** `page.locator('.rounded-full.bg-primary')` — class names are volatile; use role/label selectors instead
- **One locator per step per spec:** Define locators once in the POM, reuse across specs; duplication causes sync failures when UI changes
- **Asserting on step index directly:** The quiz has no visible step number element by default; assert on QuizCard heading text (`'Who is this song for?'`) to know which step is active
- **Navigating through all 6 steps in every test:** Use localStorage seeding (Pattern 5) for state-preservation tests; only full-traversal specs should click through all steps
- **Using `page.waitForTimeout()`:** Never sleep; use `await expect(locator).toBeVisible()` instead — Playwright auto-retries

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Waiting for step transitions | `page.waitForTimeout(300)` | `await expect(quizPage.nextButton).toBeEnabled()` or `await expect(heading).toBeVisible()` | Playwright auto-retries assertions; sleep causes flaky tests |
| Selector strings duplicated in specs | Inline `page.locator('.something')` in each test | POM Locator properties | Single location to update when UI changes |
| Custom retry logic for state | Manual poll loops | `await expect(locator).toBeVisible({ timeout: 5000 })` | Built-in retry with configurable timeout |
| localStorage manipulation | Custom fetch to Next.js API | `page.evaluate()` | Playwright exposes full browser context including localStorage |

**Key insight:** The POM's value is centralizing ALL selector knowledge in one class file. If a selector appears in a spec file directly, it defeats the purpose.

---

## Common Pitfalls

### Pitfall 1: QuizCard Heading Ambiguity
**What goes wrong:** `page.getByRole('heading', { name: /your/i })` matches multiple headings (HeroSection h1 on landing + QuizCard title) depending on which page loads.
**Why it happens:** The app uses `<h1>` in layout-level components and in QuizCard simultaneously.
**How to avoid:** Use exact text strings matching the QuizCard `title` prop: `'Who is this song for?'`, `'Set the mood'`, `'What makes them special?'`, `'Share a memory'`, `'Write from the heart'`, `'Almost there!'`
**Warning signs:** Assertion matches wrong element; step detection logic reports wrong step.

### Pitfall 2: SelectionCard Click Target
**What goes wrong:** `page.getByRole('button', { name: 'Pop' })` matches the PillButton voice preference options too if labels overlap.
**Why it happens:** Both SelectionCards and PillButtons render as `<button>` with visible text labels.
**How to avoid:** Use `exact: true` for all SelectionCard and PillButton lookups. Also note that `'R&B / Soul'` contains special characters — escape or use regex if needed.
**Warning signs:** Wrong card selected; `aria-pressed` assertion fails on unexpected element.

### Pitfall 3: Back Button Not Visible on Step 0
**What goes wrong:** `await quizPage.backButton.click()` throws "Element not visible" on step 0.
**Why it happens:** `quiz/page.tsx` renders `<div aria-hidden="true" />` instead of the Back button on step 0 (`currentStep > 0` guard).
**How to avoid:** Never call `clickBack()` on step 0. In navigation specs, advance to step 1 first. POM method should assert step > 0 or let Playwright throw naturally.
**Warning signs:** `ElementNotVisible` error on back button click in step 0.

### Pitfall 4: localStorage State Not Cleared Between Tests
**What goes wrong:** Test 2 picks up quiz state left by Test 1, causing unexpected pre-filled inputs.
**Why it happens:** `notevra_quiz_v1` is written to localStorage on every `data` state change; persists across page loads in the same browser context.
**How to avoid:** Either use `test.beforeEach(() => page.evaluate(() => localStorage.clear()))` or use `page.context().clearCookies()` / fresh context per spec. Playwright's default is a fresh context per test file, but within a file tests share context.
**Warning signs:** Test 3 passes unexpectedly because step 1 name is already filled from Test 1.

### Pitfall 5: "Next" Button Text Changes on Last Step
**What goes wrong:** `quizPage.nextButton` (defined as `getByRole('button', { name: /next/i })`) becomes invisible on step 5 because the button says "Create My Song".
**Why it happens:** `quiz/page.tsx` line: `{isLastStep ? 'Create My Song' : 'Next'}`.
**How to avoid:** Define a separate locator `readonly createSongButton = page.getByRole('button', { name: /create my song/i })` and use it on step 5. Alternatively define `nextOrCreateButton` as `page.getByRole('button', { name: /next|create my song/i })`.
**Warning signs:** `quizPage.nextButton.click()` throws on step 5.

### Pitfall 6: Step 6 Language Select Already Has a Default
**What goes wrong:** Test for "invalid Step 6" is hard to construct — the language `<select>` defaults to `'English'` and step6Schema only validates `language: z.string().min(1)`. Email validation (`z.string().email(...)`) only fires if the user types an invalid email.
**Why it happens:** Step 6 has no truly "empty/invalid" state unless email is filled with a malformed value.
**How to avoid:** For E2E-03 Step 6 validation test: fill email with `'not-an-email'` and assert error appears. Language field requires no special test — it cannot be empty via the UI.
**Warning signs:** Step 6 validation test passes vacuously without actually testing an error state.

---

## Code Examples

Verified patterns from source code audit:

### QuizCard Step Headings (Exact Strings)
```typescript
// Verified from quiz/page.tsx renderStep() switch
const STEP_HEADINGS = [
  'Who is this song for?',       // step 0 (Step1Relationship)
  'Set the mood',                 // step 1 (Step2GenreVoice)
  'What makes them special?',    // step 2 (Step3Qualities)
  'Share a memory',              // step 3 (Step4Memories)
  'Write from the heart',        // step 4 (Step5Message)
  'Almost there!',               // step 5 (Step6Language)
];
```

### Step-by-Step Validation Rules (from Zod schemas)
```typescript
// Verified from each Step*.tsx file
const STEP_VALIDATION = {
  step1: {
    relationshipType: 'required — select one of: Mom, Dad, Partner, Friend, Child, Other',
    recipientName: 'required, min 1 char, max 50 chars',
  },
  step2: {
    genre: 'required — select one of: Pop, R&B / Soul, Folk / Acoustic, Rock, Hip-Hop, Classical, Country',
    voicePreference: 'optional — PillButton (no validation error emitted)',
  },
  step3: {
    qualities: 'min 20 chars',
  },
  step4: {
    memories: 'min 20 chars',
  },
  step5: {
    message: 'min 20 chars',
  },
  step6: {
    language: 'required (defaults to English — no UI path to empty)',
    email: 'optional — only validates if filled; must be valid email format',
  },
};
```

### Landing Page — All CTA Selectors
```typescript
// Verified from HeroSection.tsx and Header.tsx
// HeroSection: <Link href="/quiz">Create Your Song</Link>
// Header desktop: <Link href="/quiz">Create Your Song</Link>
// Header mobile: <Link href="/quiz">Create Your Song</Link>
// All three render as <a href="/quiz"> with text "Create Your Song"

// Use .first() / .nth() if you need to target a specific one
const heroCtaButton = page.getByRole('link', { name: 'Create Your Song' }).first();
```

### Nav Anchor Links (for E2E-01 navigation render check)
```typescript
// Verified from Header.tsx
// Desktop nav links:
// <a href="#how-it-works">How it Works</a>
// <a href="#examples">Examples</a>
// <a href="#reviews">Reviews</a>
const navLinks = {
  howItWorks: page.getByRole('link', { name: 'How it Works' }),
  examples: page.getByRole('link', { name: 'Examples' }),
  reviews: page.getByRole('link', { name: 'Reviews' }),
};
```

### Textarea Placeholders (unique identifiers for Steps 3–5)
```typescript
// Verified from Step3Qualities.tsx, Step4Memories.tsx, Step5Message.tsx
const step3 = page.getByPlaceholder(/kind, patient, always knows/i);
const step4 = page.getByPlaceholder(/got lost driving to the beach/i);
const step5 = page.getByPlaceholder(/I don't say it enough/i);
```

### Error Alert Assertion Pattern
```typescript
// Verified from Step*.tsx — all error messages use role="alert"
// e.g. <p className="..." role="alert">{errors.relationshipType}</p>
await expect(page.getByRole('alert')).toBeVisible();
await expect(page.getByRole('alert')).toContainText('Please select who this song is for');
```

### Back/Forward Navigation State Preservation
```typescript
// quiz/page.tsx uses localStorage on every data change:
// useEffect(() => { localStorage.setItem('notevra_quiz_v1', JSON.stringify(data)); }, [data]);
// And reads on mount:
// useEffect(() => { const saved = localStorage.getItem('notevra_quiz_v1'); ... }, []);

// To seed state and reload:
await page.goto('/quiz');
await page.evaluate((data) => {
  localStorage.setItem('notevra_quiz_v1', JSON.stringify(data));
}, VALID_QUIZ_DATA);
await page.reload();
// Now the quiz loads with all answers pre-filled from localStorage
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Inline selectors in spec files | POM classes with typed Locators | Playwright 1.0+ recommendation | Single change point when UI updates |
| `page.emulateMedia()` per test | `contextOptions.reducedMotion: 'reduce'` in config | Playwright 1.25+ | Applies globally; no per-test boilerplate |
| `page.waitForSelector()` | `expect(locator).toBeVisible()` | Playwright 1.18+ | Auto-retry with assertion semantics; fails with clear message |
| Fixture file via `test.extend()` | Direct POM instantiation in `beforeEach` | N/A | Fixtures justified at scale; direct instantiation simpler for 3 specs |

**Deprecated/outdated:**
- `page.$()` / `page.$$()`: These are old Playwright APIs. Use `page.locator()`, `page.getByRole()`, etc.
- `page.waitForTimeout()`: Never use in specs; flaky by design. Replace with assertion-based waiting.

---

## Open Questions

1. **Does QuizProgress expose an accessible label for step number?**
   - What we know: `QuizProgress.tsx` renders progress indicator (Phase 15 component). It renders dots/indicators but the source wasn't read.
   - What's unclear: Whether there is an accessible aria-label like "Step 2 of 6" for assertion.
   - Recommendation: Assert step by QuizCard heading text (fully verified above) rather than a progress indicator attribute. This is more semantically meaningful regardless.

2. **Should landing.spec.ts assert on HeroAudioCard content?**
   - What we know: HeroSection includes a `<HeroAudioCard />` (a demo audio card). Its internals aren't audited.
   - What's unclear: Whether it's interactive enough to warrant assertion in E2E-01.
   - Recommendation: E2E-01 requirement says "hero loads, CTA navigates to /quiz, navigation renders" — skip HeroAudioCard for Phase 20; add in Phase 21 if relevant.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Playwright 1.58.2 |
| Config file | `playwright.config.ts` (exists — Phase 18) |
| Quick run command | `npx playwright test e2e/landing.spec.ts --project=chromium` |
| Full suite command | `npm run test:e2e` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| INFRA-04 | LandingPage, QuizPage, SuccessPage POM classes exist | structural | `npx playwright test --list` (confirms spec imports resolve) | ❌ Wave 0 |
| E2E-01 | Landing page hero loads; CTA navigates to /quiz; nav links visible | E2E smoke | `npx playwright test e2e/landing.spec.ts --project=chromium` | ❌ Wave 0 |
| E2E-02 | Quiz funnel: all 6 steps accept valid input and advance | E2E | `npx playwright test e2e/quiz-navigation.spec.ts --project=chromium` | ❌ Wave 0 |
| E2E-03 | Quiz validation: each step rejects invalid input with visible error | E2E | `npx playwright test e2e/quiz-validation.spec.ts --project=chromium` | ❌ Wave 0 |
| E2E-04 | Back/forward navigation preserves answers | E2E | `npx playwright test e2e/quiz-navigation.spec.ts --project=chromium` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npx playwright test e2e/landing.spec.ts --project=chromium`
- **Per wave merge:** `npm run test:e2e` (chromium only — excludes mobile projects)
- **Phase gate:** Full chromium suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `e2e/pages/landing.ts` — LandingPage POM (INFRA-04)
- [ ] `e2e/pages/quiz.ts` — QuizPage POM (INFRA-04)
- [ ] `e2e/pages/success.ts` — SuccessPage POM stub (INFRA-04)
- [ ] `e2e/fixtures.ts` — shared valid quiz data
- [ ] `e2e/landing.spec.ts` — E2E-01 spec
- [ ] `e2e/quiz-validation.spec.ts` — E2E-03 spec
- [ ] `e2e/quiz-navigation.spec.ts` — E2E-02 + E2E-04 spec

*(All infrastructure exists — no framework installs needed for Wave 0)*

---

## Sources

### Primary (HIGH confidence)
- Source code audit: `src/app/quiz/page.tsx` — step structure, navigation, localStorage key, error states
- Source code audit: `src/app/quiz/_components/Step1Relationship.tsx` through `Step6Language.tsx` — Zod schemas, element structure, ARIA attributes
- Source code audit: `src/app/quiz/_components/SelectionCard.tsx` — `aria-pressed` attribute confirmed
- Source code audit: `src/components/Header.tsx` — nav link text and hrefs
- Source code audit: `src/components/landing/HeroSection.tsx` — hero heading text, CTA link text
- Source code audit: `src/lib/quiz-types.ts` — `QuizData` interface, `INITIAL_QUIZ_DATA`
- `https://playwright.dev/docs/pom` — POM class pattern, Locator as property approach (fetched 2026-03-06)
- `https://playwright.dev/docs/test-fixtures` — `test.extend()` fixture pattern for POMs (fetched 2026-03-06)
- `playwright.config.ts` at project root — confirms `reducedMotion: reduce` and `testDir: './e2e'` (read directly)

### Secondary (MEDIUM confidence)
- `https://playwright.dev/docs/locators` — `getByRole`, `getByPlaceholder` as preferred selector strategies (referenced from POM docs)

### Tertiary (LOW confidence)
- None

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — @playwright/test 1.58.2 already installed; no new packages needed
- Architecture: HIGH — POM structure derived directly from Phase 18 CONTEXT.md decisions (e2e/pages/ directory, exact filenames)
- Selector strategy: HIGH — all selectors derived from reading actual source files, not assumptions
- Pitfalls: HIGH — step-button text change, back button guard, and localStorage persistence verified from `quiz/page.tsx` source

**Research date:** 2026-03-06
**Valid until:** 2026-04-06 (Playwright and the quiz UI are both stable; re-verify if quiz steps change)
