# Phase 15: Quiz Funnel - Context

**Gathered:** 2026-03-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Build a fully navigable 6-step quiz funnel at /quiz that collects relationship details, genre/voice preferences, qualities, memories, a heartfelt message, and language/email. Each step validates before advancing, transitions animate with Framer Motion, and progress persists in localStorage. The quiz page does NOT trigger generation — that's Phase 16. This phase builds the funnel UI and data collection only.

</domain>

<decisions>
## Implementation Decisions

### Step Content & Input Types
- **Step 1 (Relationship + Name):** Clickable cards with icons for relationship type (Mom, Dad, Partner, Friend, Child, Other). Text input for recipient name.
- **Step 2 (Genre + Voice):** Visual genre cards with mood descriptors (~6-8 genres, e.g. "Pop — upbeat & fun", "Folk — warm & acoustic"). Voice preference as 3 pill buttons: Male / Female / No Preference.
- **Steps 3-5 (Qualities, Memories, Message):** Large textarea with 2-3 guiding questions above each (e.g. "What are 3 words that describe them? What do they love?"). Character limit shown but generous (~500 chars).
- **Step 6 (Language + Email):** Language dropdown with ~5 options (English default, Spanish, French, Portuguese, Mandarin). Email field is optional — lead capture only, labeled honestly ("Get notified about new features").

### Quiz Flow & Navigation
- Back button on each step lets users revisit and edit previous answers
- Forward-only validation — must complete required fields to advance
- Final step "Create My Song" button triggers generation immediately (Phase 16 wires this up)
- No review/summary page before submission
- Single /quiz URL throughout — no step in URL params
- localStorage persistence — refreshing mid-quiz does not lose progress

### Visual Style & Layout
- Full-page centered card layout — each step renders as a centered card on clean background (like Typeform)
- Header remains visible (not full-screen immersive)
- Dots + step counter progress indicator: row of 6 dots (filled/active/empty) plus "Step 2 of 6" text
- Warm, encouraging subheadline below each step title (e.g. "Every great song starts with someone special.")
- Quick & smooth ~300ms transitions — Framer Motion horizontal slide (enter from right, back from left)

### Form State & Validation
- useState + Zod validation — no new dependencies needed (both already installed)
- Validation errors appear on "Next" click only — no real-time or on-blur validation
- Errors clear when field is corrected
- Required fields: relationship type, recipient name, genre, at least one quality, at least one memory, message (min ~20 chars)
- Optional fields: voice preference (defaults to "any"), email, language (defaults to English)

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

</decisions>

<specifics>
## Specific Ideas

- Quiz should feel warm and personal, not like filling out a form — the emotional gift-giving context should be reinforced at every step
- Clickable cards for relationship and genre match the landing page's card-based design language (Phase 14 testimonials, how-it-works cards)
- Guiding questions on text steps help users who don't know what to write — this is critical for song quality since the answers feed directly into the generation prompt (Phase 16)
- Email collection is lead capture only in v3.0 — no email system exists yet. Must be labeled honestly, not misleadingly framed as "delivery"

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `framer-motion` (v12.35): Already installed for step transition animations (AnimatePresence + motion.div)
- `zod` (v4.3): Already installed for per-step validation schemas
- `Header.tsx`: Renders on all pages via layout.tsx — quiz page gets header automatically
- `Footer.tsx`: Renders on all pages via layout.tsx — quiz page gets footer automatically
- `useReducedMotion.ts` hook: Available for accessibility — skip animations if user prefers reduced motion
- Landing page card patterns (HowItWorksSection, TestimonialsSection): Card styling with bg-card, rounded-xl, shadow-subtle can be reused for quiz step cards and selection cards

### Established Patterns
- Tailwind v4 with OKLCH tokens: bg-primary, bg-secondary, bg-card, bg-muted, text-foreground, etc.
- font-display for headings, default sans for body
- Server components by default, 'use client' only when needed — quiz page will be mostly client-side due to state management
- Lucide React for icons (used in landing page sections)

### Integration Points
- `/quiz` route: New route under `src/app/quiz/page.tsx` — linked from all "Create Your Song" CTA buttons on landing page
- `layout.tsx` provides Header + Footer wrapping automatically
- Quiz data shape must be compatible with Phase 16's quiz-to-prompt conversion — define a clear QuizData type/interface
- localStorage key for quiz data — will be read by Phase 16 generation trigger

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 15-quiz-funnel*
*Context gathered: 2026-03-06*
