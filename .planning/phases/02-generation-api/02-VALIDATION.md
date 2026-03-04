---
phase: 2
slug: generation-api
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-04
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Manual API testing via curl + existing validate-acestep.ts |
| **Config file** | none |
| **Quick run command** | `npx tsx scripts/validate-acestep.ts` |
| **Full suite command** | `npx tsx scripts/validate-acestep.ts && curl -s -X POST http://localhost:3000/api/generate -H 'Content-Type: application/json' -d '{"prompt":"test"}' \| jq .` |
| **Estimated runtime** | ~5 seconds (quick), ~15 seconds (full with API call) |

---

## Sampling Rate

- **After every task commit:** Run `npx tsx scripts/validate-acestep.ts`
- **After every plan wave:** Run full suite command (validate + generate smoke test)
- **Before `/gsd:verify-work`:** All 6 GEN requirements verified manually end-to-end
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 02-01-01 | 01 | 1 | GEN-03 | manual | `curl -X POST localhost:3000/api/generate -H 'Content-Type: application/json' -d '{"prompt":"upbeat pop","tags":"pop,happy"}' \| jq .data.enhancedCaption` | N/A | ⬜ pending |
| 02-01-02 | 01 | 1 | GEN-01 | manual | `curl -X POST localhost:3000/api/generate -H 'Content-Type: application/json' -d '{"prompt":"chill lofi beat"}'` | N/A | ⬜ pending |
| 02-02-01 | 02 | 1 | GEN-01 | manual | Open localhost:3000, type vibe description, submit, verify generation starts | N/A | ⬜ pending |
| 02-02-02 | 02 | 1 | GEN-02 | manual | Switch to Custom mode, enter lyrics with [Verse]/[Chorus] tags, submit | N/A | ⬜ pending |
| 02-02-03 | 02 | 1 | GEN-04 | manual | Select each duration preset, verify API payload contains correct seconds value | N/A | ⬜ pending |
| 02-02-04 | 02 | 1 | GEN-05 | manual | Toggle instrumental mode on, submit, verify lyrics field contains [Instrumental] | N/A | ⬜ pending |
| 02-03-01 | 03 | 2 | GEN-06 | manual | Submit generation, poll until complete, verify 2 audio URLs in response | N/A | ⬜ pending |
| 02-03-02 | 03 | 2 | GEN-01 | manual | Full E2E: submit → poll → play both audio variants in browser | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

*Existing infrastructure covers all phase requirements.* No test framework installation needed — validation is manual end-to-end plus the existing `validate-acestep.ts` script for RunPod health.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Vibe prompt generates song | GEN-01 | Requires RunPod GPU inference | Submit prompt, poll status, verify audio plays |
| Custom lyrics structure reflected | GEN-02 | Requires listening to output | Submit [Verse]/[Chorus] lyrics, verify song structure |
| Genre tags in enhanced caption | GEN-03 | Requires format_input endpoint | Check enhancedCaption contains submitted genre tags |
| Duration matches preset | GEN-04 | Requires audio length measurement | Submit each preset, measure output audio duration |
| Instrumental has no vocals | GEN-05 | Requires listening to output | Submit with instrumental=true, verify no vocals |
| Two variants returned | GEN-06 | Requires full pipeline completion | Verify outputs array has 2 entries with distinct audio URLs |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
