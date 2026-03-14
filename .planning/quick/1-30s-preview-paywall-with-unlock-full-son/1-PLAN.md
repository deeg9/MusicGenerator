---
phase: quick
plan: 1
type: execute
wave: 1
depends_on: []
files_modified:
  - src/app/quiz/success/[jobId]/_components/SongPlayer.tsx
  - src/app/quiz/success/[jobId]/page.tsx
  - src/app/quiz/success/[jobId]/_components/PreviewPaywall.tsx
autonomous: true
requirements: [PREVIEW-01]
must_haves:
  truths:
    - "Free/unauthenticated users hear only 30 seconds of the song before playback stops"
    - "A visual fade overlay appears on the player area when preview limit is reached"
    - "An Unlock Full Song CTA button links to /pricing"
    - "A top banner nudge appears for preview-limited users"
    - "Subscribed users hear the full song with no restrictions"
  artifacts:
    - path: "src/app/quiz/success/[jobId]/_components/SongPlayer.tsx"
      provides: "Preview-limited audio playback with 30s cap and fade overlay"
    - path: "src/app/quiz/success/[jobId]/_components/PreviewPaywall.tsx"
      provides: "Unlock Full Song CTA button and top banner nudge"
    - path: "src/app/quiz/success/[jobId]/page.tsx"
      provides: "Wires subscription check and passes isPreview to player/paywall"
  key_links:
    - from: "src/app/quiz/success/[jobId]/page.tsx"
      to: "/api/subscription/check"
      via: "fetch in useEffect"
      pattern: "fetch.*api/subscription/check"
    - from: "src/app/quiz/success/[jobId]/_components/SongPlayer.tsx"
      to: "PreviewPaywall.tsx"
      via: "isPreview prop controls 30s limit and overlay"
---

<objective>
Add a 30-second preview paywall to the success page. Free/unauthenticated users hear only 30s of their generated song, then see a visual fade overlay on the player, a prominent "Unlock Full Song" CTA button, and a top banner nudge — all linking to /pricing. Subscribed users get the full song uninterrupted.

Purpose: Convert free users to paid subscribers by gating full song access behind subscription.
Output: Modified SongPlayer with preview mode, new PreviewPaywall component, wired success page.
</objective>

<execution_context>
@/Users/deeg/.claude/get-shit-done/workflows/execute-plan.md
@/Users/deeg/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@src/app/quiz/success/[jobId]/page.tsx
@src/app/quiz/success/[jobId]/_components/SongPlayer.tsx
@src/app/quiz/success/[jobId]/_components/AuthPrompt.tsx
@src/app/api/subscription/check/route.ts
@src/lib/subscription.ts
@src/app/pricing/page.tsx

<interfaces>
<!-- Existing subscription check API -->
From src/app/api/subscription/check/route.ts:
```typescript
// GET /api/subscription/check
// Returns 401 if not authenticated
// Returns 404 with { active: false, tier: null, songsRemaining: 0, songsPerMonth: 0 } if no sub
// Returns 200 with { active, tier, songsRemaining, songsPerMonth, cancelAtPeriodEnd, currentPeriodEnd }
```

From src/app/quiz/success/[jobId]/_components/SongPlayer.tsx:
```typescript
interface SongPlayerProps {
  src: string;
}
export function SongPlayer({ src }: SongPlayerProps): JSX.Element;
```

From src/lib/supabase/client.ts:
```typescript
export function createClient(): SupabaseClient;
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add preview mode to SongPlayer and create PreviewPaywall component</name>
  <files>
    src/app/quiz/success/[jobId]/_components/SongPlayer.tsx
    src/app/quiz/success/[jobId]/_components/PreviewPaywall.tsx
  </files>
  <action>
**SongPlayer.tsx** — Add an optional `isPreview` prop (default `false`) and `PREVIEW_LIMIT_S = 30` constant:

1. Extend `SongPlayerProps` to `{ src: string; isPreview?: boolean }`.
2. Add state: `const [previewEnded, setPreviewEnded] = useState(false)`.
3. In the `handleTimeUpdate` listener, if `isPreview && audio.currentTime >= PREVIEW_LIMIT_S`, pause the audio, set `currentTime` to `PREVIEW_LIMIT_S`, set `previewEnded` to `true`, and set `isPlaying` to `false`.
4. In `handleProgressClick`, if `isPreview`, clamp the seek target to `Math.min(fraction * duration, PREVIEW_LIMIT_S)`.
5. In `handlePlayPause`, if `previewEnded` is true, reset `audio.currentTime = 0`, set `previewEnded(false)` so the user can replay the 30s preview.
6. When `isPreview` and the progress bar renders, override the visual duration display: show `formatTime(PREVIEW_LIMIT_S)` as the right time label (not the full duration), and compute `progressPercent` based on `PREVIEW_LIMIT_S` instead of `duration`.
7. When `previewEnded` is true, render a gradient fade overlay (`absolute inset-0 rounded-2xl bg-gradient-to-t from-background/90 via-background/40 to-transparent pointer-events-none`) over the player card. Use a relative wrapper div.
8. The existing non-preview behavior must be completely unchanged (isPreview defaults false).

**PreviewPaywall.tsx** — New client component:

1. Props: `{ isPreview: boolean; previewEnded: boolean }`. Render nothing if `!isPreview`.
2. **Top banner** (renders when `isPreview` is true, even before preview ends): A full-width rounded bar above the player with text "You're listening to a 30-second preview" and a small "See plans" link to `/pricing`. Style: `bg-secondary/60 border border-border rounded-xl px-4 py-2.5 text-sm text-muted-foreground` with the link as `text-primary font-medium hover:underline`.
3. **CTA button** (renders when `previewEnded` is true): Below the player, a prominent button: "Unlock Full Song" linking to `/pricing`. Style: `bg-primary text-primary-foreground px-8 py-3.5 rounded-xl text-base font-bold shadow-md hover:opacity-90 transition-opacity`. Use a `Link` from next/link. Add a small `Lock` icon from lucide-react before the text.
4. When `previewEnded` is false but `isPreview` is true, show a subtle text below the player: "Preview ends at 0:30 — subscribe for the full song" with a `/pricing` link on "subscribe".
  </action>
  <verify>
    <automated>npx tsc --noEmit --pretty 2>&1 | head -30</automated>
  </verify>
  <done>SongPlayer accepts isPreview prop, caps playback at 30s, shows fade overlay. PreviewPaywall shows banner/CTA. Non-preview mode unchanged — dashboard SongCard import still works identically.</done>
</task>

<task type="auto">
  <name>Task 2: Wire subscription check into success page and pass isPreview to components</name>
  <files>
    src/app/quiz/success/[jobId]/page.tsx
  </files>
  <action>
In the success page component, add subscription awareness:

1. Add state: `const [isPreview, setIsPreview] = useState(true)` — default to preview (safe default: restrict first, unlock after check).
2. Add state: `const [previewEnded, setPreviewEnded] = useState(false)`.
3. Add a `useEffect` that runs once on mount to check subscription status:
   - First call `createClient()` from `@/lib/supabase/client` and check `supabase.auth.getUser()`.
   - If user is null (anonymous), keep `isPreview = true` (already default).
   - If user exists, fetch `/api/subscription/check`. If response is 200 and `data.active === true`, set `isPreview(false)`. Otherwise keep `isPreview = true`.
   - Import `createClient` from `@/lib/supabase/client`.
4. Pass `isPreview` prop to `<SongPlayer>`: `<SongPlayer src={audioUrl} isPreview={isPreview} />`.
5. Add a callback prop or lift `previewEnded` state: Add `onPreviewEnd` callback prop to SongPlayer that sets `previewEnded(true)` in the parent. In SongPlayer, call `onPreviewEnd?.()` when preview ends (in the timeupdate handler alongside setting previewEnded internally). Update SongPlayerProps to include `onPreviewEnd?: () => void`.
6. Render `<PreviewPaywall isPreview={isPreview} previewEnded={previewEnded} />`:
   - Place the banner portion ABOVE the `{audioUrl && <SongPlayer .../>}` line.
   - Place the CTA portion BELOW the SongPlayer.
   - To achieve this cleanly, split PreviewPaywall into two exports: `PreviewBanner` and `PreviewCTA`, both taking `{ isPreview: boolean; previewEnded: boolean }`. Adjust Task 1's PreviewPaywall.tsx to export these two named components instead of one.
7. The download button should also be gated: if `isPreview`, change the download link to a `/pricing` link with text "Subscribe to Download" instead of "Download Song". Keep the same styling but swap the icon to `Lock` from lucide-react.

Do NOT modify the loading/error/timeout/pod-down states — only the ready state section.
  </action>
  <verify>
    <automated>npx tsc --noEmit --pretty 2>&1 | head -30</automated>
  </verify>
  <done>Anonymous and unsubscribed users see 30s preview with fade overlay, top banner, CTA button, and gated download. Subscribed users see full song, normal download, no paywall elements. Existing SongCard in dashboard is unaffected (isPreview defaults to false).</done>
</task>

</tasks>

<verification>
1. `npx tsc --noEmit` passes with no errors
2. Manual test: visit success page while logged out — song plays max 30s, fade overlay appears, banner visible, CTA links to /pricing, download button shows "Subscribe to Download"
3. Manual test: visit success page while logged in with active subscription — full song plays, no banner, no CTA, normal download button
4. Dashboard SongCard still renders SongPlayer without preview restrictions
</verification>

<success_criteria>
- Free/anonymous users: audio stops at 30s, gradient overlay fades player, "Unlock Full Song" CTA visible linking to /pricing, top banner shows preview notice, download gated
- Subscribed users: full song plays, no paywall elements, normal download
- No TypeScript errors, no regression in dashboard player
</success_criteria>

<output>
After completion, create `.planning/quick/1-30s-preview-paywall-with-unlock-full-son/1-SUMMARY.md`
</output>
