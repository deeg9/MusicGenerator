---
phase: quick-17
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/components/landing/HeroSection.tsx
  - src/components/landing/HomepageChatBox.tsx
  - src/components/landing/TestimonialsSection.tsx
  - src/app/page.tsx
autonomous: true
requirements: [MOBILE-HERO, REMOVE-SIGNUP-GATE, LAZY-LOAD-VIDEO, SIMPLIFY-MOBILE-HERO]
must_haves:
  truths:
    - "On mobile (<768px), hero shows only headline + subtitle + CTA button above the fold without scrolling"
    - "Chat box is hidden on mobile, visible on md+ screens"
    - "Chat box sends all users to /quiz directly, never to /signup"
    - "Videos are lazy-loaded or hidden on mobile to reduce page weight"
    - "Song preview carousel and two-column media grid are hidden on mobile"
  artifacts:
    - path: "src/components/landing/HeroSection.tsx"
      provides: "Mobile-first hero with responsive visibility controls"
    - path: "src/components/landing/HomepageChatBox.tsx"
      provides: "Signup gate removed — all users route to /quiz"
    - path: "src/components/landing/TestimonialsSection.tsx"
      provides: "Lazy-loaded or hidden video on mobile"
  key_links:
    - from: "HeroSection.tsx"
      to: "/quiz"
      via: "CTA button Link href"
      pattern: 'href="/quiz"'
    - from: "HomepageChatBox.tsx"
      to: "/quiz"
      via: "router.push on handleSend"
      pattern: "router\\.push.*quiz"
---

<objective>
Mobile-first homepage conversion optimization: make the hero section convert on mobile by putting headline + CTA above the fold, remove the signup gate from the chat box, lazy-load heavy media, and hide desktop-only complexity on small screens.

Purpose: Facebook in-app browser users on mobile need a fast, clean landing with immediate CTA. Current hero pushes CTA far below fold with chat box, carousel, video, and two-column media.
Output: Optimized HeroSection, simplified HomepageChatBox routing, lazy-loaded videos.
</objective>

<execution_context>
@/Users/deeg/.claude/get-shit-done/workflows/execute-plan.md
@/Users/deeg/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@src/components/landing/HeroSection.tsx
@src/components/landing/HomepageChatBox.tsx
@src/components/landing/TestimonialsSection.tsx
@src/components/landing/SongPreviewCarousel.tsx
@src/components/landing/HeroAudioCard.tsx
@src/app/page.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Mobile-first hero layout + remove signup gate</name>
  <files>src/components/landing/HeroSection.tsx, src/components/landing/HomepageChatBox.tsx</files>
  <action>
**HeroSection.tsx — Mobile-first above-the-fold layout:**

1. Keep the badge, heading (with rotating words), and CTA button + social proof visible on ALL screen sizes. These must render above the fold on mobile without scrolling.

2. Hide the following on mobile (show on md+ only) using Tailwind `hidden md:block` or `hidden md:grid`:
   - `<HomepageChatBox />` — wrap in `<div className="hidden md:block w-full">`
   - `<SongPreviewCarousel />` — wrap in `<div className="hidden md:block w-full">`
   - The two-column media grid (video + hero image) — add `hidden md:grid` to the existing `grid` div

3. Add a concise subtitle below the h1 for mobile context (visible on all sizes):
   `<p className="text-lg text-muted-foreground max-w-lg text-center">Create a one-of-a-kind song for someone you love — in seconds.</p>`

4. Move the CTA button + social proof block UP — place it immediately after the subtitle, BEFORE the chat box. Currently it sits at the very bottom after the description paragraph. Remove the duplicate description paragraph that currently lives below the media grid (the one starting "Create a one-of-a-kind personalized song...") since the new subtitle replaces it.

5. Reduce top padding on mobile: change `py-16 md:py-24` to `py-10 md:py-24` so the hero content starts higher.

6. For the hero video element, add `loading="lazy"` attribute and change `autoPlay` to only auto-play on md+ using a media query approach: remove the `autoPlay` attribute from the JSX and instead add a useEffect that checks `window.matchMedia('(min-width: 768px)')` and calls `videoRef.current?.play()` only on desktop. This prevents the video from auto-downloading on mobile.

**HomepageChatBox.tsx — Remove signup gate:**

1. In the `handleSend` function, remove the entire Supabase auth check block (lines 45-54: the `createClient()` call, `getUser()` call, and the if/else routing logic).

2. Replace with a single unconditional redirect: `router.push('/quiz');`

3. Remove the unused import: `import { createClient } from '@/lib/supabase/client';`

This removes the Supabase client-side dependency from the homepage chat box entirely, making it lighter and faster.
  </action>
  <verify>
    <automated>cd /Users/deeg/Documents/GitHub/MusicGenerator && npx tsc --noEmit --pretty 2>&1 | head -30</automated>
  </verify>
  <done>
  - On mobile viewport: hero shows badge, headline, subtitle, CTA button, and social proof above fold
  - Chat box, carousel, and media grid are hidden on mobile, visible on md+
  - HomepageChatBox always routes to /quiz regardless of auth state
  - No Supabase client import in HomepageChatBox
  - Video does not autoplay on mobile
  </done>
</task>

<task type="auto">
  <name>Task 2: Lazy-load testimonials video on mobile</name>
  <files>src/components/landing/TestimonialsSection.tsx</files>
  <action>
**TestimonialsSection.tsx — Lazy-load or hide video on mobile:**

1. The testimonials section has a video element (`/testimonial-video-new.mov`) that auto-plays. On mobile this is heavy and unnecessary for conversion.

2. Hide the entire video + floating audio card container on mobile: wrap the `<div className="relative max-w-2xl mx-auto">` (lines 231-282) in a `<div className="hidden md:block">`.

3. On the video element itself, add `loading="lazy"` for browsers that support it, and remove `autoPlay`. Instead, use an IntersectionObserver in a useEffect: when the video container enters the viewport, call `video.play()`. This ensures the video only loads/plays when scrolled to on desktop.

4. Add a ref to the video element (e.g., `testimonialVideoRef`) and the IntersectionObserver logic:
   ```
   useEffect(() => {
     const video = testimonialVideoRef.current;
     if (!video) return;
     const observer = new IntersectionObserver(
       ([entry]) => { if (entry.isIntersecting) { video.play(); observer.disconnect(); } },
       { threshold: 0.3 }
     );
     observer.observe(video);
     return () => observer.disconnect();
   }, []);
   ```

This cuts significant page weight for mobile Facebook in-app browser users who will never scroll to or need this video.
  </action>
  <verify>
    <automated>cd /Users/deeg/Documents/GitHub/MusicGenerator && npx tsc --noEmit --pretty 2>&1 | head -30</automated>
  </verify>
  <done>
  - Testimonials video is hidden on mobile (hidden md:block)
  - Video lazy-loads via IntersectionObserver on desktop instead of eager autoPlay
  - TypeScript compiles without errors
  </done>
</task>

</tasks>

<verification>
1. `npx tsc --noEmit` passes with no errors
2. `npm run build` completes successfully
3. Manual check: open localhost:3000 at 375px width — should see badge, headline, subtitle, CTA above fold with no chat box, carousel, or media grid visible
4. Manual check: open localhost:3000 at 1024px width — should see full desktop layout with chat box, carousel, media
5. Manual check: type in chat box and submit — should navigate to /quiz regardless of auth state
</verification>

<success_criteria>
- Mobile hero is above-the-fold: headline + subtitle + CTA visible without scrolling on 375px viewport
- Chat box, carousel, two-column media hidden on mobile
- Chat box routes everyone to /quiz (no signup gate)
- Videos lazy-load (no autoPlay, IntersectionObserver on desktop)
- Build passes, no TypeScript errors
</success_criteria>

<output>
After completion, create `.planning/quick/17-mobile-first-homepage-conversion-optimiz/17-SUMMARY.md`
</output>
