# Phase 7: Animation + Typewriter - Context

**Gathered:** 2026-03-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Replace the vanilla React typewriter with danielpetho's Framer Motion typewriter component, add card hover lifts and generation flow transitions (AnimatePresence), and ensure all animations (including existing CSS animations) respect prefers-reduced-motion. No new UI components beyond the typewriter swap — footer and style-guide completion are Phase 8.

</domain>

<decisions>
## Implementation Decisions

### Typewriter Behavior
- Type + delete + cycle: types a word, pauses, deletes character-by-character, types the next word, loops
- Blinking block cursor (█) — retro-futuristic brand fit
- Reserve max width for the longest word to prevent CLS — measure upfront with min-width or invisible text
- Bricolage Grotesque font (font-display) with text-primary (sky-blue) color — carried from Phase 6
- Current vanilla typewriter in src/components/ui/typewriter.tsx gets replaced entirely

### Card Hover & Micro-interactions
- Both VariantCards AND ExampleCards get hover lift effect (consistent interactive feel)
- Hover: whileHover y: -2 with shadow increase (shadow-subtle → shadow-medium)
- Snappy spring physics: type: "spring", stiffness: 400, damping: 25
- Tap feedback: whileTap: { scale: 0.98 } for mobile tactile response

### Generation Flow Transitions
- AnimatePresence wrapping form → loading → results → error views in GenerationPage.tsx
- Transition style: fade + slide up (outgoing fades out + slides up, incoming fades in + slides up from below)
- Duration: 200ms — quick, not sluggish
- Error state animates consistently with other transitions (red color signals urgency)
- Variant cards stagger in with ~100ms delay between them — reveal/unwrapping moment

### Reduced-motion Strategy
- prefers-reduced-motion: all animations become instant (duration: 0)
- Typewriter: shows first word statically, no typing/deleting/cycling animation
- Cards: no hover lift, no tap scale
- Transitions: instant swap, no fade/slide
- Global @media (prefers-reduced-motion: reduce) CSS rule to also disable existing CSS animations (animate-wave, animate-pulse, eq-bar)
- Complete accessibility coverage — both new Framer Motion and existing CSS animations

### Claude's Discretion
- LazyMotion vs direct motion import (evaluate actual bundle impact)
- Reduced-motion detection approach (Framer Motion useReducedMotion hook vs CSS media query + JS hook)
- Exact typewriter typing/deleting speed values
- Stagger timing fine-tuning for variant card reveal
- How to implement the max-width CLS reservation technique

</decisions>

<specifics>
## Specific Ideas

- Block cursor (█) for retro-futuristic terminal aesthetic matching brand direction
- Card stagger-in creates an "unwrapping results" moment — makes generation feel rewarding
- Fade + slide-up transitions reinforce forward progression through the generation flow
- Snappy spring physics (stiffness: 400, damping: 25) for hover — responsive, modern feel

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `framer-motion` v12.35.0 already installed — no new dependencies
- `src/components/ui/text-shimmer.tsx` uses `import { motion } from 'framer-motion'` — established import pattern
- `src/components/ui/typewriter.tsx` — current vanilla implementation to replace
- Shadow tokens already defined: --shadow-subtle, --shadow-medium, --shadow-elevated (from Phase 5)

### Established Patterns
- Tailwind v4 with CSS-based config, semantic token utilities
- `font-display` class maps to Bricolage Grotesque (from Phase 5/6)
- `text-primary` = sky-blue for typewriter text (from Phase 6)
- Conditional rendering in GenerationPage.tsx: `{phase === 'idle' && <Form />}` — needs AnimatePresence wrapper

### Integration Points
- `src/components/HeroSection.tsx` — swap Typewriter import, add max-width CLS fix
- `src/components/GenerationPage.tsx` — wrap phase conditionals in AnimatePresence
- `src/components/VariantCard.tsx` — wrap in motion.div with whileHover/whileTap
- `src/components/ExampleCard.tsx` — wrap in motion.div with whileHover/whileTap
- `src/components/GenerationResults.tsx` — add stagger children for variant cards
- `src/app/globals.css` — add @media (prefers-reduced-motion: reduce) rule for CSS animations

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 07-animation-typewriter*
*Context gathered: 2026-03-05*
