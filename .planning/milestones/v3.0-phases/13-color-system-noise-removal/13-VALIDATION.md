---
phase: 13
slug: color-system-noise-removal
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-05
---

# Phase 13 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.0.18 + @testing-library/react 16.3.2 |
| **Config file** | `vitest.config.ts` (project root) |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green + `next build` succeeds
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 13-01-01 | 01 | 1 | FNDN-01 | manual-only | `ls src/components/layout/Sidebar.tsx` should fail + `next build` succeeds | N/A | ⬜ pending |
| 13-01-02 | 01 | 1 | FNDN-02 | manual-only | Visual verification + read primitives.css for OKLCH values | N/A | ⬜ pending |
| 13-01-03 | 01 | 1 | FNDN-03 | manual-only | Browser DevTools font inspector | N/A | ⬜ pending |
| 13-02-01 | 02 | 1 | FNDN-04 | smoke | `npx vitest run src/components/Header.test.tsx` | ❌ W0 | ⬜ pending |
| 13-02-02 | 02 | 1 | FNDN-05 | grep | `grep -r "Notera\|MusicGenerator" src/ --include="*.tsx" --include="*.ts"` — zero results | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/components/Header.test.tsx` — covers FNDN-04; renders header, checks for "Notevra" wordmark and "Create Your Song" button text
- [ ] `src/components/Footer.test.tsx` — covers FNDN-05 (footer says "Notevra"); simple render check

*Existing vitest infrastructure covers all other needs; no new config required.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Old UI files deleted | FNDN-01 | File deletion verified by absence + build success | Run `next build` — no import errors. Verify `ls src/components/layout/Sidebar.tsx` returns "not found" |
| Color tokens applied | FNDN-02 | Visual/perceptual verification needed | Open browser, verify background is cloud white, buttons are baby blue, accents are mellow yellow |
| Fonts render correctly | FNDN-03 | Font rendering is visual | Open browser DevTools → Computed → font-family. Verify headings = Libre Baskerville, body = DM Sans |
| No old brand references | FNDN-05 | Grep covers code; visual check for rendered text | Run grep command + visually check page title, meta tags, footer in browser |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
