---
phase: quick
plan: 1
subsystem: success-page
tags: [paywall, subscription, preview, audio, ux]
dependency_graph:
  requires: [subscription-check-api, supabase-client]
  provides: [30s-preview-paywall, preview-banner, preview-cta, gated-download]
  affects: [success-page, song-player]
tech_stack:
  added: []
  patterns: [safe-default-restrict, lift-state-for-paywall, subscription-gate]
key_files:
  created:
    - src/app/quiz/success/[jobId]/_components/PreviewPaywall.tsx
  modified:
    - src/app/quiz/success/[jobId]/_components/SongPlayer.tsx
    - src/app/quiz/success/[jobId]/page.tsx
decisions:
  - "isPreview defaults to true (restrict first, unlock after subscription check) to avoid flash of unrestricted content"
  - "previewEnded state lifted to page via onPreviewEnd callback so PreviewCTA can be positioned outside SongPlayer"
  - "PreviewPaywall exports two named components (PreviewBanner, PreviewCTA) rather than one unified component to allow independent placement above/below player"
  - "Subscription check: anonymous users remain in preview mode without fetching /api/subscription/check"
metrics:
  duration: "~2 minutes"
  completed_date: "2026-03-14"
  tasks_completed: 2
  files_modified: 3
---

# Quick Task 1: 30s Preview Paywall with Unlock Full Song Summary

**One-liner:** 30-second audio preview paywall with gradient fade overlay, PreviewBanner/PreviewCTA components, and gated download — subscribed users bypass all restrictions via /api/subscription/check.

## What Was Built

Free/anonymous users now hear only the first 30 seconds of their generated song before playback stops, a gradient overlay fades the player card, and a prominent "Unlock Full Song" CTA appears linking to /pricing. A top banner informs users they're on a preview throughout. The download button is replaced with a "Subscribe to Download" link for preview users. Subscribed users get the full song with no restrictions.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add preview mode to SongPlayer and create PreviewPaywall | 73a258e | SongPlayer.tsx, PreviewPaywall.tsx (new) |
| 2 | Wire subscription check into success page | 50719b6 | page.tsx |

## Implementation Details

### SongPlayer.tsx changes
- Added `isPreview?: boolean` and `onPreviewEnd?: () => void` props
- `PREVIEW_LIMIT_S = 30` constant
- `previewEnded` state tracks when 30s cap is hit
- `handleTimeUpdate` pauses audio, sets currentTime to 30, fires `onPreviewEnd` callback when limit is reached
- `handleProgressClick` clamps seek target to `Math.min(fraction * duration, PREVIEW_LIMIT_S)` in preview mode
- `handlePlayPause` resets to 0 on replay (user can re-listen to 30s preview)
- Progress bar and time label use `displayDuration = isPreview ? PREVIEW_LIMIT_S : duration`
- Gradient fade overlay (`absolute inset-0 rounded-2xl bg-gradient-to-t from-background/90 via-background/40 to-transparent`) renders when `isPreview && previewEnded`

### PreviewPaywall.tsx (new)
- `PreviewBanner`: renders when `isPreview` — full-width pill bar with "30-second preview" notice and "See plans" link
- `PreviewCTA`: renders when `isPreview` — shows subtle nudge text while preview is active, shows "Unlock Full Song" button (with Lock icon) when `previewEnded`

### page.tsx changes
- `isPreview` state: default `true` (safe default — restrict first, unlock after check)
- `previewEnded` state: lifted from SongPlayer via `onPreviewEnd` callback
- `useEffect` on mount: checks `supabase.auth.getUser()` then fetches `/api/subscription/check`; sets `isPreview(false)` only when response is 200 and `data.active === true`
- `PreviewBanner` rendered above player, `PreviewCTA` rendered below
- Download button conditionally shows "Subscribe to Download" Link to /pricing (with Lock icon) for preview users, normal download anchor for subscribed users

## Decisions Made

1. **isPreview defaults true**: Avoids flash of unrestricted content while subscription check is in-flight. Safe default is always restriction.
2. **previewEnded lifted to parent**: Needed to position `PreviewCTA` outside `SongPlayer` DOM — two separate named exports (`PreviewBanner`, `PreviewCTA`) allow independent placement.
3. **Anonymous short-circuit**: Anonymous users skip the `/api/subscription/check` fetch entirely (would return 401) — saves a network round-trip.
4. **Non-preview mode unchanged**: `isPreview` defaults to `false` in `SongPlayerProps`, so existing `SongCard` imports in the dashboard work identically without any changes.

## Deviations from Plan

None — plan executed exactly as written. Task 2 specified the split into `PreviewBanner`/`PreviewCTA` named exports as the approach, which was implemented.

## Self-Check

- [x] `src/app/quiz/success/[jobId]/_components/SongPlayer.tsx` — modified, exists
- [x] `src/app/quiz/success/[jobId]/_components/PreviewPaywall.tsx` — created, exists
- [x] `src/app/quiz/success/[jobId]/page.tsx` — modified, exists
- [x] Commit 73a258e exists (Task 1)
- [x] Commit 50719b6 exists (Task 2)
- [x] No TypeScript errors in modified files
- [x] Pre-existing test file TS errors are unrelated (vitest types not in tsconfig includes)

## Self-Check: PASSED
