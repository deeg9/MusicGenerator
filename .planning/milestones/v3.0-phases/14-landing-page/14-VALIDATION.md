---
phase: 14
slug: landing-page
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-05
---

# Phase 14 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.0.18 + @testing-library/react 16.3.2 |
| **Config file** | `vitest.config.ts` (exists) |
| **Quick run command** | `npx vitest run src/components/landing/` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/components/landing/`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 14-01-01 | 01 | 1 | LAND-01 | unit | `npx vitest run src/components/landing/HeroAudioCard.test.tsx` | ❌ W0 | ⬜ pending |
| 14-01-02 | 01 | 1 | LAND-02 | unit | `npx vitest run src/components/landing/HowItWorksSection.test.tsx` | ❌ W0 | ⬜ pending |
| 14-01-03 | 01 | 1 | LAND-03 | unit | `npx vitest run src/components/landing/TestimonialsSection.test.tsx` | ❌ W0 | ⬜ pending |
| 14-01-04 | 01 | 1 | LAND-04 | unit | `npx vitest run src/components/landing/VideoSection.test.tsx` | ❌ W0 | ⬜ pending |
| 14-01-05 | 01 | 1 | LAND-05 | unit | `npx vitest run src/components/landing/BottomCtaSection.test.tsx` | ❌ W0 | ⬜ pending |
| 14-01-06 | 01 | 1 | LAND-06 | unit | `npx vitest run src/components/Footer.test.tsx` | ✅ (update) | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/components/landing/HeroAudioCard.test.tsx` — stubs for LAND-01
- [ ] `src/components/landing/HowItWorksSection.test.tsx` — stubs for LAND-02
- [ ] `src/components/landing/TestimonialsSection.test.tsx` — stubs for LAND-03
- [ ] `src/components/landing/VideoSection.test.tsx` — stubs for LAND-04 (click-to-load behavior)
- [ ] `src/components/landing/BottomCtaSection.test.tsx` — stubs for LAND-05
- [ ] `src/components/Footer.test.tsx` — EXISTS, update after Footer.tsx replacement to add column heading assertions
- [ ] `vi.mock('next/link', ...)` pattern required in all new landing test files (established in Header.test.tsx)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Audio playback produces audible sound | LAND-01 | Browser audio policy requires user gesture; JSDOM cannot verify actual audio output | Click play button in browser, verify sound plays |
| YouTube video loads and plays after click | LAND-04 | Iframe content cross-origin; cannot verify actual video playback | Click video thumbnail, verify YouTube iframe appears and plays |
| Framer Motion scroll animations fire | LAND-02, LAND-03 | IntersectionObserver behavior differs in JSDOM vs real browser | Scroll down page, verify sections animate in |
| Visual design matches brand spec | ALL | Visual fidelity not testable via unit tests | Compare rendered page against brand colors (baby blue, mellow yellow) |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
