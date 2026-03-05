---
phase: 4
slug: ux-polish
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-03-05
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest ^4.0.18 |
| **Config file** | `vite.config.ts` |
| **Quick run command** | `npx vitest run src/components/` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/components/`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 04-01-00 | 01 | 1 | UX-01, UX-02, UX-03 | scaffold | `ls src/components/LoadingAnimation.test.tsx src/components/ModeToggle.test.tsx src/components/ExampleCard.test.tsx` | Creates them | ⬜ pending |
| 04-01-01 | 01 | 1 | UX-01 | unit | `npx vitest run src/components/LoadingAnimation.test.tsx` | ⬜ W0 (04-01-00) | ⬜ pending |
| 04-01-02 | 01 | 1 | UX-01 | compile | `npx tsc --noEmit` | N/A | ⬜ pending |
| 04-02-01 | 02 | 2 | UX-02 | unit | `npx vitest run src/components/ModeToggle.test.tsx` | ⬜ W0 (04-01-00) | ⬜ pending |
| 04-02-02 | 02 | 2 | UX-02 | unit | `npx vitest run src/components/GenerationForm.test.tsx` | ⬜ W0 (04-01-00) | ⬜ pending |
| 04-03-01 | 03 | 2 | UX-03 | unit | `npx vitest run src/components/ExampleCard.test.tsx` | ⬜ W0 (04-01-00) | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Wave 0 is handled by Task 0 in Plan 04-01 (first task to execute). It creates all three test stub files before any implementation tasks run.

- [ ] `src/components/LoadingAnimation.test.tsx` — stubs for UX-01 stage rendering and progression
- [ ] `src/components/ModeToggle.test.tsx` — stubs for UX-02 segmented control behavior
- [ ] `src/components/ExampleCard.test.tsx` — stubs for UX-03 card rendering

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Waveform bar animation is visually smooth | UX-01 | CSS animation not testable in jsdom | Load app, trigger generation, verify equalizer bars animate with violet gradient |
| Segmented control sliding indicator animates | UX-02 | CSS transition visual | Toggle between Simple/Custom, verify sliding background animates smoothly |
| Lyrics textarea slides in/out smoothly | UX-02 | CSS grid transition visual | Switch modes, verify slide-down + fade animation on lyrics field |
| Hero waveform accent animation | UX-03 | SVG/CSS animation visual | Load landing page, verify subtle animated soundwave behind headline |
| Form-to-loading crossfade transition | UX-01 | CSS transition visual | Submit generation, verify smooth crossfade from form to loading state |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 15s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved
