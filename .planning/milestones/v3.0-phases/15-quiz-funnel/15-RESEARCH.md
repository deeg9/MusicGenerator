# Phase 15: Quiz Funnel - Research

**Researched:** 2026-03-06
**Domain:** Multi-step form wizard, Framer Motion animated transitions, Zod v4 validation, localStorage persistence
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Step Content & Input Types**
- Step 1 (Relationship + Name): Clickable cards with icons for relationship type (Mom, Dad, Partner, Friend, Child, Other). Text input for recipient name.
- Step 2 (Genre + Voice): Visual genre cards with mood descriptors (~6-8 genres, e.g. "Pop — upbeat & fun", "Folk — warm & acoustic"). Voice preference as 3 pill buttons: Male / Female / No Preference.
- Steps 3-5 (Qualities, Memories, Message): Large textarea with 2-3 guiding questions above each (~500 char limit shown but generous).
- Step 6 (Language + Email): Language dropdown with ~5 options (English default, Spanish, French, Portuguese, Mandarin). Email field is optional — lead capture only, labeled honestly ("Get notified about new features").

**Quiz Flow & Navigation**
- Back button on each step lets users revisit and edit previous answers
- Forward-only validation — must complete required fields to advance
- Final step "Create My Song" button triggers generation (Phase 16 wires this up — Phase 15 only renders the button)
- No review/summary page before submission
- Single /quiz URL throughout — no step in URL params
- localStorage persistence — refreshing mid-quiz does not lose progress

**Visual Style & Layout**
- Full-page centered card layout — each step renders as a centered card on clean background (like Typeform)
- Header remains visible (not full-screen immersive)
- Dots + step counter progress indicator: row of 6 dots (filled/active/empty) plus "Step 2 of 6" text
- Warm, encouraging subheadline below each step title
- Quick & smooth ~300ms transitions — Framer Motion horizontal slide (enter from right, back from left)

**Form State & Validation**
- useState + Zod validation — no new dependencies needed (both already installed)
- Validation errors appear on "Next" click only — no real-time or on-blur validation
- Errors clear when field is corrected
- Required: relationship type, recipient name, genre, at least one quality (~20 chars), at least one memory (~20 chars), message (min ~20 chars)
- Optional: voice preference (defaults to "any"), email, language (defaults to English)

### Claude's Discretion
- Exact genre list and mood descriptors
- Relationship type icons (Lucide or emoji)
- Guiding question copy for Steps 3-5
- Subheadline copy for each step
- Card styling details (shadow depth, border radius, padding)
- Mobile responsive breakpoints and adjustments
- Error message copy
- localStorage key naming and structure
- Whether to show "optional" labels on non-required fields

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| QUIZ-01 | Step 1 — User selects relationship type and enters recipient name | Clickable card pattern from HowItWorksSection; text input with Zod min(1) validation |
| QUIZ-02 | Step 2 — User selects music genre and voice preference | Same card pattern + pill buttons; genre data array; Zod enum or literal union |
| QUIZ-03 | Step 3 — User describes what makes recipient special (qualities textarea) | Textarea with guiding questions; Zod string().min(20) validation |
| QUIZ-04 | Step 4 — User shares favorite memories (memories textarea) | Same textarea pattern as Step 3 |
| QUIZ-05 | Step 5 — User writes a heartfelt message | Same textarea pattern as Steps 3-4 |
| QUIZ-06 | Step 6 — User selects language and enters email | Native select element + email input; Zod email() for optional validation |
| QUIZ-07 | Progress bar and step indicator visible throughout quiz | Dots + counter component; driven by currentStep state |
| QUIZ-08 | Animated step transitions (slide in/out with Framer Motion) | AnimatePresence + motion.div with custom variants; direction-aware x offset |
| QUIZ-09 | Per-step validation prevents advancing without required fields | Per-step Zod schemas + safeParse on "Next" click; inline error display |
</phase_requirements>

---

## Summary

Phase 15 is a self-contained client-side multi-step form wizard at `/quiz`. No new dependencies are required — Framer Motion v12.35, Zod v4.3, and React 19 useState are already installed. The wizard renders a single page (`src/app/quiz/page.tsx`) that manages step index, form data, validation errors, and animation direction as component state. localStorage provides mid-quiz persistence, read on mount and written on every state change.

The primary technical complexity is the direction-aware Framer Motion slide animation: when the user goes forward, steps slide in from the right; when going back, steps slide in from the left. This requires tracking both step index and direction in state and using custom `variants` passed to `motion.div` with `AnimatePresence`. The existing `typewriter.tsx` component in the project uses this exact `AnimatePresence` + `motion.div` API pattern from Framer Motion v12, confirming the imports work correctly.

Zod v4 validation is per-step: each step has its own `z.object({})` schema. On "Next" click, `safeParse` runs against only the current step's fields. Errors are derived from `error.issues` and stored in a separate `errors` state object, displayed inline beneath each field.

**Primary recommendation:** Build as a single `QuizPage` client component with sub-components for each step and a shared `QuizProgress`, `QuizCard`, and `SelectionCard` component. Data flows down as props; callbacks flow up. Define `QuizData` type once and export it for Phase 16 to consume.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React useState | 19.2.3 | Step index, form data, errors, direction | Locked decision — no Zustand or react-hook-form needed |
| Framer Motion | 12.35.0 | Horizontal slide step transitions | Already installed; AnimatePresence confirmed working in project |
| Zod | 4.3.6 | Per-step validation schemas | Already installed; safeParse API verified working |
| next/navigation | 16.1.6 | Router push to /generating (Phase 16) | Built-in; `useRouter` hook for final step CTA |

### No New Dependencies

The user explicitly decided "useState + Zod validation — no new dependencies needed." Do NOT add react-hook-form, Formik, react-query, or any state management library.

### Installation

No installation step needed — all required packages are present in package.json.

---

## Architecture Patterns

### Recommended File Structure

```
src/app/quiz/
├── page.tsx              # QuizPage — 'use client', manages all state
└── _components/          # Quiz-specific components (underscore = not a route)
    ├── QuizProgress.tsx  # Dots progress indicator + "Step N of 6" text
    ├── QuizCard.tsx      # Centered card wrapper (padding, shadow, max-width)
    ├── SelectionCard.tsx # Reusable clickable card for relationship/genre
    ├── PillButton.tsx    # Reusable pill toggle for voice preference
    ├── Step1Relationship.tsx
    ├── Step2GenreVoice.tsx
    ├── Step3Qualities.tsx
    ├── Step4Memories.tsx
    ├── Step5Message.tsx
    └── Step6Language.tsx

src/lib/
└── quiz-types.ts         # QuizData interface — shared with Phase 16
```

The `_components/` convention (underscore prefix) marks the directory as a private colocation folder in Next.js App Router. Next.js does not treat it as a route segment.

### Pattern 1: Direction-Aware AnimatePresence Slide

**What:** Track `direction` (1 = forward, -1 = back) alongside `currentStep`. Pass it into motion variants via `custom` prop.
**When to use:** Any time slide direction must be different for forward vs. back navigation.

```typescript
// Source: framer-motion.com/docs/animate-presence + in-project typewriter.tsx pattern
'use client';
import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

const variants = {
  enter: (direction: number) => ({
    x: direction > 0 ? '100%' : '-100%',
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? '-100%' : '100%',
    opacity: 0,
  }),
};

// In component:
const [currentStep, setCurrentStep] = useState(0);
const [direction, setDirection] = useState(1);

function goNext() {
  setDirection(1);
  setCurrentStep((s) => s + 1);
}

function goBack() {
  setDirection(-1);
  setCurrentStep((s) => s - 1);
}

// JSX:
<div className="relative overflow-hidden">
  <AnimatePresence mode="wait" custom={direction}>
    <motion.div
      key={currentStep}
      custom={direction}
      variants={variants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={{ duration: 0.3, ease: 'easeInOut' }}
    >
      {STEPS[currentStep]}
    </motion.div>
  </AnimatePresence>
</div>
```

**Critical:** `mode="wait"` ensures exit animation completes before enter animation starts, preventing both steps from rendering simultaneously and overflowing the container.

### Pattern 2: Per-Step Zod Validation

**What:** Define one Zod schema per step. Run `safeParse` on "Next" click. Map `error.issues` to a field-keyed error object.
**When to use:** Any step with required fields.

```typescript
// Source: Verified against Zod v4.3.6 installed in project
import { z } from 'zod';

const step1Schema = z.object({
  relationshipType: z.string().min(1, 'Please select a relationship type'),
  recipientName: z.string().min(1, 'Please enter a name').max(50),
});

type Step1Errors = Partial<Record<keyof z.infer<typeof step1Schema>, string>>;

function handleNext() {
  const result = step1Schema.safeParse({
    relationshipType: data.relationshipType,
    recipientName: data.recipientName,
  });

  if (!result.success) {
    const fieldErrors: Step1Errors = {};
    for (const issue of result.error.issues) {
      const field = issue.path[0] as keyof Step1Errors;
      if (!fieldErrors[field]) fieldErrors[field] = issue.message;
    }
    setErrors(fieldErrors);
    return;
  }
  setErrors({});
  goNext();
}
```

**Zod v4 note:** Import as `import { z } from 'zod'` — the named `z` export is confirmed present in v4.3.6 (tested). `error.issues` replaces `error.errors` from Zod v3.

### Pattern 3: localStorage Persistence

**What:** Read quiz data from localStorage on mount, write on every data change.
**When to use:** Any client component needing cross-refresh persistence without a backend.

```typescript
// Source: MDN Web Docs localStorage API + React useEffect pattern
const QUIZ_STORAGE_KEY = 'notevra_quiz_v1';

// Read on mount
useEffect(() => {
  try {
    const saved = localStorage.getItem(QUIZ_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as Partial<QuizData>;
      setData((prev) => ({ ...prev, ...parsed }));
    }
  } catch {
    // Ignore corrupt storage
  }
}, []);

// Write on every data change
useEffect(() => {
  try {
    localStorage.setItem(QUIZ_STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Ignore storage quota errors
  }
}, [data]);
```

**Important:** Step index is NOT persisted to localStorage. On refresh, the user returns to Step 1 with their previously entered answers pre-filled. This is simpler and safer than persisting step index (avoids users landing mid-funnel with broken state).

### Pattern 4: QuizData Type (Phase 16 Contract)

Define this once in `src/lib/quiz-types.ts` and import it from both `page.tsx` and Phase 16's generation code.

```typescript
// src/lib/quiz-types.ts
export type RelationshipType = 'Mom' | 'Dad' | 'Partner' | 'Friend' | 'Child' | 'Other';
export type VoicePreference = 'Male' | 'Female' | 'No Preference';

export interface QuizData {
  // Step 1
  relationshipType: RelationshipType | '';
  recipientName: string;
  // Step 2
  genre: string;
  voicePreference: VoicePreference | 'No Preference';
  // Step 3
  qualities: string;
  // Step 4
  memories: string;
  // Step 5
  message: string;
  // Step 6
  language: string;
  email: string;
}

export const INITIAL_QUIZ_DATA: QuizData = {
  relationshipType: '',
  recipientName: '',
  genre: '',
  voicePreference: 'No Preference',
  qualities: '',
  memories: '',
  message: '',
  language: 'English',
  email: '',
};
```

### Pattern 5: Reduced Motion Accessibility

The `useReducedMotion` hook is already installed at `src/hooks/useReducedMotion.ts`. Use it in `QuizPage` to skip slide animations when the user prefers reduced motion.

```typescript
const reducedMotion = useReducedMotion();

// In transition prop:
transition={{ duration: reducedMotion ? 0 : 0.3, ease: 'easeInOut' }}
```

### Anti-Patterns to Avoid

- **Persisting step index to localStorage:** User could land mid-funnel with stale partial data and no way to know. Return to Step 1 on refresh with data pre-filled.
- **Using AnimatePresence without `mode="wait"`:** Both steps render simultaneously during transition, causing a double-wide layout overflow. Always use `mode="wait"` for step transitions.
- **Real-time or on-blur validation:** The decision is "validation errors appear on Next click only." Adding `onChange` or `onBlur` validation contradicts user expectation.
- **Putting animation state in Zod:** Animation direction is UI state, not form state. Keep `direction` as a separate `useState`, not in the data model.
- **Creating a new route per step:** `/quiz/1`, `/quiz/2`, etc. are explicitly out of scope. Single `/quiz` URL throughout.
- **Importing from `framer-motion/client`:** This is an internal sub-export for React Server Component boundaries. Use `import { motion, AnimatePresence } from 'framer-motion'` directly in the 'use client' component.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Form validation | Custom required-field checker | Zod `safeParse` | Edge cases: whitespace-only strings, empty arrays, min-length — Zod handles all of these |
| Step animations | CSS transitions or manual state toggling | Framer Motion `AnimatePresence` + `motion.div` | Exit animations require tracking unmounted components — impossible with plain CSS transitions |
| Accessible focus management | Manual `focus()` calls | Let browser handle naturally | `motion.div` renders a real DOM node; browser focus moves to it naturally on mount |
| localStorage error handling | Unguarded `JSON.parse` | try/catch wrapper | Storage can be corrupt, disabled (private mode), or quota-exceeded — always wrap |

---

## Common Pitfalls

### Pitfall 1: AnimatePresence Exit Not Triggering

**What goes wrong:** The exiting step disappears immediately without animating out.
**Why it happens:** `mode` defaults to `"sync"` — both enter and exit run simultaneously. If the parent container has `overflow: hidden` but incorrect height, the exit element is clipped to zero before the animation runs.
**How to avoid:** Use `mode="wait"`. Ensure the wrapper div has `relative overflow-hidden` and a defined height (or `min-h` matching the tallest step).
**Warning signs:** Steps snap instead of sliding; step content appears briefly doubled.

### Pitfall 2: Zod v4 Error Shape Change from v3

**What goes wrong:** Code uses `error.errors` (Zod v3 property) — this is `undefined` in Zod v4.
**Why it happens:** Zod v4 renamed the property. The project is on Zod 4.3.6.
**How to avoid:** Always use `result.error.issues` (confirmed available in v4.3.6).
**Warning signs:** `fieldErrors` is always empty despite failed validation.

### Pitfall 3: localStorage SSR Crash

**What goes wrong:** `localStorage is not defined` error during server-side render or static build.
**Why it happens:** Next.js renders pages server-side first. `localStorage` doesn't exist on the server.
**How to avoid:** Only access `localStorage` inside `useEffect` (runs client-side only). Never call it at module scope or during render.
**Warning signs:** Build fails with `ReferenceError: localStorage is not defined`; works in dev but fails in `next build`.

### Pitfall 4: SelectionCard click-outside deselect issue

**What goes wrong:** A user clicks an already-selected card expecting to deselect it; nothing happens, or selection clears accidentally.
**Why it happens:** Single-select fields (relationship type, genre) should be toggle-select only if a second option is clicked, not deselect on re-click.
**How to avoid:** Only set a new selection, never clear it. "Must select one" — don't allow deselect on click. This matches the validation requirement (required field).
**Warning signs:** User can advance with no relationship type selected.

### Pitfall 5: Framer Motion `custom` prop propagation

**What goes wrong:** Direction-aware variants receive `undefined` as `custom`, causing all transitions to go the same direction.
**Why it happens:** The `custom` prop must be passed to BOTH `AnimatePresence` and `motion.div`. Passing it only to one or the other causes the other to use stale or undefined values.
**How to avoid:** Pass `custom={direction}` to both the `<AnimatePresence>` component and the `<motion.div>` inside it.

---

## Code Examples

### QuizProgress Component

```typescript
// Dots progress indicator — source: custom for this project
interface QuizProgressProps {
  currentStep: number; // 0-indexed
  totalSteps: number;  // 6
}

export function QuizProgress({ currentStep, totalSteps }: QuizProgressProps) {
  return (
    <div className="flex flex-col items-center gap-3">
      <p className="text-sm font-medium text-muted-foreground">
        Step {currentStep + 1} of {totalSteps}
      </p>
      <div className="flex items-center gap-2" role="progressbar" aria-valuenow={currentStep + 1} aria-valuemax={totalSteps}>
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div
            key={i}
            className={[
              'h-2 rounded-full transition-all duration-300',
              i < currentStep
                ? 'w-2 bg-primary/50'          // completed
                : i === currentStep
                  ? 'w-4 bg-primary'            // active (wider)
                  : 'w-2 bg-border',            // upcoming
            ].join(' ')}
            aria-hidden="true"
          />
        ))}
      </div>
    </div>
  );
}
```

### SelectionCard Component (Relationship & Genre)

```typescript
// Reusable clickable card — matches existing bg-card, rounded-xl, shadow-subtle pattern
interface SelectionCardProps {
  label: string;
  subLabel?: string;
  icon?: React.ReactNode;
  selected: boolean;
  onSelect: () => void;
}

export function SelectionCard({ label, subLabel, icon, selected, onSelect }: SelectionCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={[
        'flex flex-col items-center gap-2 rounded-xl p-4 text-center transition-all',
        'border-2 cursor-pointer',
        selected
          ? 'border-primary bg-primary/10 shadow-medium'
          : 'border-border bg-card shadow-subtle hover:border-primary/50',
      ].join(' ')}
      aria-pressed={selected}
    >
      {icon && <span className="text-2xl">{icon}</span>}
      <span className="font-semibold text-sm text-foreground">{label}</span>
      {subLabel && <span className="text-xs text-muted-foreground">{subLabel}</span>}
    </button>
  );
}
```

### Inline Error Display Pattern

```typescript
// Below any field that can have a validation error
{errors.recipientName && (
  <p className="mt-1 text-sm text-destructive" role="alert">
    {errors.recipientName}
  </p>
)}
```

### Textarea with Char Count

```typescript
// Steps 3-5 textarea with generous 500-char limit
<div className="relative">
  <textarea
    value={data.qualities}
    onChange={(e) => {
      setData((prev) => ({ ...prev, qualities: e.target.value }));
      if (errors.qualities) setErrors((prev) => ({ ...prev, qualities: undefined }));
    }}
    maxLength={500}
    rows={5}
    placeholder="e.g. Kind, patient, always knows how to make me laugh..."
    className="w-full rounded-lg border border-input bg-background px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
  />
  <span className="absolute bottom-3 right-3 text-xs text-muted-foreground">
    {data.qualities.length}/500
  </span>
</div>
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Zod `error.errors` | Zod `error.issues` | Zod v4 (2024) | Must use `issues` — `errors` is undefined in v4 |
| `import { motion } from 'framer-motion/client'` | `import { motion } from 'framer-motion'` in 'use client' | FM v12 | Sub-path export exists for RSC boundaries; not needed here |
| Separate page route per step | Single page, step as state | Next.js App Router best practice | No URL step — locked decision; avoids back-button conflicts |
| `window.localStorage` with guard | `localStorage` inside `useEffect` | React 18+ SSR standard | `useEffect` only runs client-side — safe pattern |

---

## Open Questions

1. **Textarea minimum quality for Phase 16 prompt generation**
   - What we know: Required fields have min ~20 chars as decided in CONTEXT.md
   - What's unclear: Whether 20 chars is enough for the AI to produce a meaningful song — Phase 16 risk
   - Recommendation: Use min(20) in Phase 15 as specified; Phase 16 research will determine if prompt enrichment is needed

2. **localStorage clearing after generation**
   - What we know: Phase 15 persists to localStorage; Phase 16 reads it
   - What's unclear: Whether Phase 16 or Phase 17 should clear the stored quiz data after generation
   - Recommendation: Phase 15 writes only; Phase 16 reads and clears after successful generation start

3. **Quiz page Footer visibility**
   - What we know: `layout.tsx` renders Header + Footer on all pages automatically
   - What's unclear: Whether Footer under the quiz card creates visual clutter on shorter viewport heights
   - Recommendation: Footer renders naturally — if it feels cluttered, it can be hidden via a `quiz/layout.tsx` override in Phase 15 itself (Claude's discretion)

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.0.18 + @testing-library/react 16.3.2 |
| Config file | `vitest.config.ts` (project root) |
| Quick run command | `npx vitest run src/app/quiz` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| QUIZ-01 | Step 1 renders relationship cards and name input | unit | `npx vitest run src/app/quiz/_components/Step1Relationship.test.tsx` | Wave 0 |
| QUIZ-02 | Step 2 renders genre cards and voice pills | unit | `npx vitest run src/app/quiz/_components/Step2GenreVoice.test.tsx` | Wave 0 |
| QUIZ-03 | Step 3 textarea renders with guiding questions | unit | `npx vitest run src/app/quiz/_components/Step3Qualities.test.tsx` | Wave 0 |
| QUIZ-04 | Step 4 textarea renders with guiding questions | unit | `npx vitest run src/app/quiz/_components/Step4Memories.test.tsx` | Wave 0 |
| QUIZ-05 | Step 5 textarea renders with guiding questions | unit | `npx vitest run src/app/quiz/_components/Step5Message.test.tsx` | Wave 0 |
| QUIZ-06 | Step 6 renders language dropdown and email input | unit | `npx vitest run src/app/quiz/_components/Step6Language.test.tsx` | Wave 0 |
| QUIZ-07 | Progress shows "Step N of 6" and correct active dot | unit | `npx vitest run src/app/quiz/_components/QuizProgress.test.tsx` | Wave 0 |
| QUIZ-08 | Slide transition direction-aware (manual test) | manual-only | — | N/A — AnimatePresence behavior not testable in jsdom |
| QUIZ-09 | Validation blocks advancing with empty required fields | unit | `npx vitest run src/app/quiz` | Wave 0 |

**QUIZ-08 manual-only justification:** Framer Motion AnimatePresence exit animations do not execute in jsdom (no layout engine). Direction-aware slide is verified by visual inspection in the browser during verification step.

### Sampling Rate

- **Per task commit:** `npx vitest run src/app/quiz`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

All test files are new (no quiz route exists yet). These must be created:

- [ ] `src/app/quiz/_components/QuizProgress.test.tsx` — covers QUIZ-07
- [ ] `src/app/quiz/_components/Step1Relationship.test.tsx` — covers QUIZ-01
- [ ] `src/app/quiz/_components/Step2GenreVoice.test.tsx` — covers QUIZ-02
- [ ] `src/app/quiz/_components/Step3Qualities.test.tsx` — covers QUIZ-03
- [ ] `src/app/quiz/_components/Step4Memories.test.tsx` — covers QUIZ-04
- [ ] `src/app/quiz/_components/Step5Message.test.tsx` — covers QUIZ-05
- [ ] `src/app/quiz/_components/Step6Language.test.tsx` — covers QUIZ-06
- [ ] `src/app/quiz/page.test.tsx` — covers QUIZ-09 (validation integration)

No new framework install needed — vitest + @testing-library/react already configured.

---

## Sources

### Primary (HIGH confidence)

- In-project `src/components/ui/typewriter.tsx` — confirmed AnimatePresence + motion.div pattern from framer-motion v12.35.0
- In-project `package.json` — all dependency versions confirmed installed
- In-project `src/app/globals.css` — semantic token names verified (bg-card, text-muted-foreground, etc.)
- In-project `vitest.config.ts` — test runner configuration confirmed
- Node.js runtime verification of Zod v4.3.6 `safeParse`, `error.issues`, `z.object`, `z.string().min()` — all verified working
- In-project `src/hooks/useReducedMotion.ts` — accessibility hook confirmed available

### Secondary (MEDIUM confidence)

- Next.js App Router docs — `_` prefix for private folders convention (prevents route creation)
- MDN Web Docs localStorage — try/catch pattern for quota errors and private mode
- Framer Motion v12 docs — `custom` prop required on both AnimatePresence and motion.div for variant functions

### Tertiary (LOW confidence)

- None

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages verified installed at exact versions via node_modules inspection
- Architecture: HIGH — patterns verified against in-project existing code
- Pitfalls: HIGH — Zod v4 issue shape verified at runtime; AnimatePresence pattern confirmed in typewriter.tsx
- Test infrastructure: HIGH — vitest config and @testing-library/react confirmed installed

**Research date:** 2026-03-06
**Valid until:** 2026-04-06 (stable libraries — framer-motion and zod move slowly at patch versions)
