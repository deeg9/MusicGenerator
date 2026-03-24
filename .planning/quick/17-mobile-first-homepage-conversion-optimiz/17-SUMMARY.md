---
phase: quick-17
plan: 01
subsystem: landing
tags: [mobile, conversion, homepage, performance]
dependency_graph:
  requires: []
  provides: [mobile-first-hero, signup-gate-removed, lazy-video]
  affects: [src/components/landing/HeroSection.tsx, src/components/landing/HomepageChatBox.tsx, src/components/landing/TestimonialsSection.tsx]
tech_stack:
  added: []
  patterns: [IntersectionObserver for lazy video, matchMedia for conditional autoplay, Tailwind hidden md:block for responsive visibility]
key_files:
  created: []
  modified:
    - src/components/landing/HeroSection.tsx
    - src/components/landing/HomepageChatBox.tsx
    - src/components/landing/TestimonialsSection.tsx
decisions:
  - "Video autoplay replaced by useEffect + matchMedia check — prevents mobile video download entirely"
  - "Chat box, carousel, and media grid hidden with hidden md:block/grid — no JS, pure Tailwind"
  - "Supabase auth check removed from HomepageChatBox — all users route directly to /quiz"
  - "Testimonial video uses IntersectionObserver threshold 0.3 — only loads/plays when 30% visible on desktop"
metrics:
  duration: "2m 12s"
  completed_date: "2026-03-24"
  tasks: 2
  files_modified: 3
---

# Quick Task 17: Mobile-First Homepage Conversion Optimization Summary

**One-liner:** Mobile hero above-the-fold redesign — CTA first, desktop-only complexity hidden, signup gate removed, videos lazy-loaded via IntersectionObserver.

## Objective

Facebook in-app browser users on mobile were seeing a hero section with chat box, carousel, two-column media grid, and CTA buried below the fold. This plan restructured the hero for mobile conversion: headline + subtitle + CTA visible immediately, all heavy desktop UI hidden on small screens.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Mobile-first hero layout + remove signup gate | a14d1c5 | HeroSection.tsx, HomepageChatBox.tsx |
| 2 | Lazy-load testimonials video on mobile | 0fff8e6 | TestimonialsSection.tsx |

## Changes Made

### HeroSection.tsx

- Reduced top padding from `py-16` to `py-10` on mobile (`md:py-24` preserved)
- Added subtitle `<p>` below h1, visible on all screen sizes: "Create a one-of-a-kind song for someone you love — in seconds."
- Moved CTA button + social proof block UP — now immediately after subtitle, before desktop-only elements
- Wrapped `<HomepageChatBox />` in `<div className="hidden md:block w-full">`
- Wrapped `<SongPreviewCarousel />` in `<div className="hidden md:block w-full">`
- Changed two-column media grid from `grid` to `hidden md:grid` (preserves `grid-cols-1 md:grid-cols-2` on desktop)
- Removed `autoPlay` attribute from hero video
- Added `useEffect` that calls `videoRef.current?.play()` only when `window.matchMedia('(min-width: 768px)')` matches

### HomepageChatBox.tsx

- Removed `createClient` import from `@/lib/supabase/client`
- Removed entire Supabase auth check block (was: createClient, getUser, if/else routing)
- `handleSend` is now synchronous — unconditionally calls `router.push('/quiz')`

### TestimonialsSection.tsx

- Added `testimonialVideoRef` ref on video element
- Removed `autoPlay` from testimonial video
- Added `useEffect` with IntersectionObserver (threshold: 0.3) — plays video when 30% in viewport, disconnects after first play
- Wrapped entire video + floating audio card `<div className="relative max-w-2xl mx-auto">` in `<div className="hidden md:block">`

## Deviations from Plan

None — plan executed exactly as written.

## Verification

- `npx tsc --noEmit`: Pre-existing test file errors only (heartmula, quiz-generate, auth/callback tests) — no errors in modified files
- `npm run build`: Completed successfully, all routes compiled
- Manual verification required: 375px viewport should show badge, headline, subtitle, CTA above fold with no chat box/carousel/media

## Self-Check: PASSED

Files exist:
- src/components/landing/HeroSection.tsx — FOUND
- src/components/landing/HomepageChatBox.tsx — FOUND
- src/components/landing/TestimonialsSection.tsx — FOUND

Commits exist:
- a14d1c5 — FOUND (feat(quick-17): mobile-first hero layout + remove signup gate)
- 0fff8e6 — FOUND (feat(quick-17): lazy-load testimonials video, hide on mobile)
