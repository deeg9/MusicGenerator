---
phase: 5
slug: token-foundation-theme-infrastructure
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-05
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.0 + jsdom |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 05-01-01 | 01 | 1 | BRAND-01 | manual-only | Visual inspection on /style-guide | N/A | ⬜ pending |
| 05-01-02 | 01 | 1 | BRAND-03 | manual-only | Visual inspection on /style-guide | N/A | ⬜ pending |
| 05-02-01 | 02 | 1 | BRAND-04 | smoke | `npx vitest run src/components/theme-toggle.test.tsx` | ❌ W0 | ⬜ pending |
| 05-03-01 | 03 | 2 | BRAND-02 | manual-only | Visual inspection on /style-guide | N/A | ⬜ pending |
| 05-03-02 | 03 | 2 | BRAND-01, BRAND-03 | manual-only | Visual inspection on /style-guide | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/components/theme-toggle.test.tsx` — covers BRAND-04 (ThemeProvider renders, toggle works, mounted guard present)

*CSS variable existence and visual font rendering cannot be tested in jsdom — jsdom does not process CSS files or render fonts. The /style-guide page IS the visual verification tool for BRAND-01 through BRAND-03.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| CSS token file exports expected variable names | BRAND-01 | jsdom does not process CSS files | Open /style-guide, verify cream/amber/sky-blue color swatches in both modes |
| Bricolage + Figtree load as CSS variables | BRAND-02 | jsdom cannot render fonts | Open /style-guide, verify heading and body font rendering |
| Shadow, radius, spacing tokens render as swatches | BRAND-03 | Visual-only verification | Open /style-guide, verify labeled spacing/radius/shadow reference swatches |
| No FOUC on hard reload | BRAND-04 | Requires real browser | Hard reload page in light and dark mode, verify no white flash |
| Tailwind v4 border regression fixed | SC-05 | Visual verification | Inspect card and input borders, verify they match --border token |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
