---
phase: 11
slug: library-ui-persistent-player
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-05
---

# Phase 11 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.x + @testing-library/react + jsdom |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 11-01-01 | 01 | 1 | LIB2-04 | unit | `npx vitest run src/components/LibrarySongCard.test.tsx` | ✅ (needs extension) | ⬜ pending |
| 11-01-02 | 01 | 1 | LIB2-04 | unit | `npx vitest run src/components/LibrarySongCard.test.tsx` | ✅ (needs extension) | ⬜ pending |
| 11-01-03 | 01 | 1 | LIB2-04 | unit | `npx vitest run src/components/LibrarySongCard.test.tsx` | ✅ (needs extension) | ⬜ pending |
| 11-02-01 | 02 | 1 | PERS-01 | unit | `npx vitest run src/components/layout/BottomAudioPlayer.test.tsx` | ❌ W0 | ⬜ pending |
| 11-02-02 | 02 | 1 | PERS-02 | unit | `npx vitest run src/components/layout/BottomAudioPlayer.test.tsx` | ❌ W0 | ⬜ pending |
| 11-02-03 | 02 | 1 | PERS-03 | unit | `npx vitest run src/contexts/AudioPlayerContext.test.tsx` | ❌ W0 | ⬜ pending |
| 11-02-04 | 02 | 1 | PERS-04 | manual | N/A | N/A | ⬜ pending |
| 11-02-05 | 02 | 1 | PERS-05 | unit | `npx vitest run src/components/layout/AppShell.test.tsx` | ❌ W0 | ⬜ pending |
| 11-03-01 | 03 | 2 | LIB2-05 | unit | `npx vitest run src/components/LibrarySongCard.test.tsx` | ✅ (needs extension) | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/components/layout/BottomAudioPlayer.test.tsx` — covers PERS-01, PERS-02, PERS-03
- [ ] `src/contexts/AudioPlayerContext.test.tsx` — covers skip action reducer logic, SET_PLAYLIST
- [ ] `src/components/layout/AppShell.test.tsx` — covers PERS-05 (provider wraps children)
- [ ] Mock strategy for wavesurfer in BottomAudioPlayer tests (follow existing WaveformPlayer.test.tsx mock pattern)

*Existing `LibrarySongCard.test.tsx` needs extension but file exists — not a Wave 0 gap.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Waveform visualization renders in player bar | PERS-04 | Canvas-based rendering cannot be meaningfully unit tested | 1. Play a track from library 2. Verify mini waveform appears in bottom player bar 3. Verify waveform animates during playback |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
