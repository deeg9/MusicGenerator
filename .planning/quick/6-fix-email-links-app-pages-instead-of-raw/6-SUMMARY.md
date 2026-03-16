---
phase: quick-6
plan: 01
subsystem: email-delivery
tags: [email, security, r2, listen-page, branded-ux]
dependency_graph:
  requires: [send-creator-email, send-recipient-email, r2, db/schema]
  provides: [/listen/[songId] page, app-url email links]
  affects: [SongReadyEmail.tsx, GiftDeliveryEmail.tsx]
tech_stack:
  added: []
  patterns: [server-component-presign, client-island-player]
key_files:
  created:
    - src/app/listen/[songId]/page.tsx
    - src/app/listen/[songId]/ListenPlayer.tsx
  modified:
    - src/app/api/send-creator-email/route.ts
    - src/app/api/send-recipient-email/route.ts
    - src/emails/SongReadyEmail.tsx
    - src/emails/GiftDeliveryEmail.tsx
decisions:
  - getAudioPresignedUrl removed from both email routes — links now point to app pages that generate presigned URLs on demand
  - /listen/[songId] uses song.id (UUID) as route param, not heartbulaJobId, matching the recipient email's song-id reference
  - ListenPlayer is a minimal 'use client' island with native <audio> — no preview restrictions for gift recipients
metrics:
  duration: ~8 minutes
  completed: 2026-03-16
---

# Quick Task 6: Fix Email Links — App Pages Instead of Raw R2 URLs Summary

**One-liner:** Replaced raw R2 presigned URLs in creator/recipient emails with branded app page links, and created a public `/listen/[songId]` page that generates presigned audio URLs server-side.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Update email routes to use app URLs | 0b3ecad | send-creator-email/route.ts, send-recipient-email/route.ts |
| 2 | Create public /listen/[songId] page | 2939e92 | listen/[songId]/page.tsx, ListenPlayer.tsx |
| 3 | Update email PreviewProps + verify build | 6a9f6d7 | SongReadyEmail.tsx, GiftDeliveryEmail.tsx |

## What Was Built

### Email Route Changes

**send-creator-email/route.ts:**
- Removed `getAudioPresignedUrl` import and `Promise.all` presigning block
- `listenUrl` now: `${siteUrl}/quiz/success/${song.heartbulaJobId}?name=...&songId=...`
- `downloadUrl` now: `${siteUrl}/api/audio/${song.heartbulaJobId}?download=true&name=...`
- Creator sees branded success page, audio proxy handles download with proper Content-Disposition

**send-recipient-email/route.ts:**
- Removed `getAudioPresignedUrl` import and single presigning call
- `listenUrl` now: `${siteUrl}/listen/${song.id}`
- Recipient lands on branded gift page, not a raw audio file in browser

### New /listen/[songId] Page

Server Component at `src/app/listen/[songId]/page.tsx`:
- Looks up song by UUID (`songs.id`) via Drizzle
- Returns "Song not available" if not completed or missing `r2Mp3Key`
- Generates fresh presigned URL server-side (1-hour expiry) — credentials never exposed to client
- Branded layout: Notevra header, recipient name, relationship, genre pill
- `ListenPlayer` client island: native `<audio controls>` with full playback (no preview restrictions)
- `generateMetadata` exports SEO title: "A song for {name} | Notevra"

### Email Template Updates

`SongReadyEmail.PreviewProps` and `GiftDeliveryEmail.PreviewProps` updated to reflect real URL patterns for React Email dev preview.

## Verification

- `npx tsc --noEmit` — no errors in modified/created files
- `npm run build` — passes, `/listen/[songId]` appears as dynamic route
- `grep getAudioPresignedUrl send-creator-email/route.ts send-recipient-email/route.ts` — no matches

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check

- [x] `src/app/listen/[songId]/page.tsx` exists
- [x] `src/app/listen/[songId]/ListenPlayer.tsx` exists
- [x] Commits 0b3ecad, 2939e92, 6a9f6d7 exist in git log
- [x] Build passes with `/listen/[songId]` in route output
- [x] No presigned URL generation in email routes

## Self-Check: PASSED
