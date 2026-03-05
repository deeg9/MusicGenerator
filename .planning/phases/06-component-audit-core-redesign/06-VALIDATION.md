---
phase: 6
slug: component-audit-core-redesign
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-05
---

# Phase 6 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest ^4.0.18 + @testing-library/react ^16.3.2 |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run src/components/ --reporter=verbose` |
| **Full suite command** | `npx vitest run --reporter=verbose` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/components/ --reporter=verbose`
- **After every plan wave:** Run `npx vitest run --reporter=verbose`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 06-01-01 | 01 | 1 | All | audit (bash) | `grep -rE "bg-zinc\|text-zinc\|bg-violet\|text-violet\|text-red-" src/components/ --include="*.tsx" \| wc -l` (must be 0) | N/A | ⬜ pending |
| 06-01-02 | 01 | 1 | COMP-01 | unit | `npx vitest run src/components/HeroSection.test.tsx` | ❌ W0 | ⬜ pending |
| 06-02-01 | 02 | 2 | COMP-01 | unit | `npx vitest run src/components/HeroSection.test.tsx` | ❌ W0 | ⬜ pending |
| 06-02-02 | 02 | 2 | COMP-02 | unit | `npx vitest run src/components/GenerationForm.test.tsx` | ✅ | ⬜ pending |
| 06-02-03 | 02 | 2 | COMP-04 | unit | `npx vitest run src/components/VariantCard.test.tsx` | ❌ W0 | ⬜ pending |
| 06-03-01 | 03 | 3 | COMP-03 | unit | `npx vitest run src/components/LoadingAnimation.test.tsx` | ✅ | ⬜ pending |
| 06-03-02 | 03 | 3 | COMP-04 | unit | `npx vitest run src/components/WaveformPlayer.test.tsx` | ✅ | ⬜ pending |
| 06-03-03 | 03 | 3 | COMP-04 | unit | `npx vitest run src/lib/colors.test.ts` | ❌ W0 | ⬜ pending |
| 06-03-04 | 03 | 3 | COMP-05 | unit | `npx vitest run src/components/ExampleCard.test.tsx` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/components/HeroSection.test.tsx` — stubs for COMP-01 (render assertions on font class, bg-accent CTA)
- [ ] `src/components/VariantCard.test.tsx` — stubs for COMP-04 (active ring, download button classes)
- [ ] `src/lib/colors.test.ts` — stubs for getCssColorAsHex unit tests (OKLCH parse + convert)

*Existing test files: GenerationForm, LoadingAnimation, WaveformPlayer, ExampleCard, ModeToggle, GenerationResults, theme-toggle — all exist and should continue to pass.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Dark/light theme visual correctness | All | Visual regression requires screenshot comparison | Toggle theme via ModeToggle, verify brand colors render correctly in both modes |
| Waveform color updates without page reload | COMP-04 | Requires running audio + theme toggle interaction | Play audio, toggle theme mid-playback, verify progress bar color changes immediately |
| Amber radial glow behind hero headline | COMP-01 | Visual gradient effect | Check hero section has visible warm glow behind headline text |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
