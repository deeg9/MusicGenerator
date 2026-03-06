# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v3.0 — Notevra Gift Funnel

**Shipped:** 2026-03-06
**Phases:** 5 | **Plans:** 11 | **Timeline:** ~13 hours

### What Was Built
- Complete product pivot from self-service AI tool to personalized song gift service
- Emotional landing page with hero audio card, testimonials, lazy-load YouTube, trust badges
- 6-step animated quiz funnel with Zod validation, direction-aware slides, localStorage persistence
- Quiz-to-HeartMuLa prompt conversion with instant generation (batch_size=1)
- Celebration success page with confetti, native audio player, MP3 download, sharing prompt
- Warm baby blue/yellow OKLCH token system + DM Sans/Libre Baskerville typography

### What Worked
- Atomic UI removal (45 files in one commit) prevented broken intermediate states
- Co-located Zod schemas with step components kept validation close to UI
- TDD for quiz-to-prompt conversion caught edge cases early
- Direction-aware AnimatePresence gave quiz a polished feel with minimal code
- Milestone audit caught font-heading/font-display naming drift before shipping

### What Was Inefficient
- font-heading vs font-display naming drift across 3 phases — should standardize token naming before multi-phase work
- SUMMARY.md frontmatter `requirements_completed` left empty in 19/29 cases — documentation gap that audit had to flag
- Phase 15-17 plan checkboxes in ROADMAP.md never checked — roadmap got out of sync with execution

### Patterns Established
- OKLCH primitive scales with 3-4 stops per color family
- localStorage with versioned key (notevra_quiz_v1) and SSR-safe try/catch
- Polling state machine pattern for generation status
- Native audio element for single-song playback (simpler than wavesurfer)
- canvas-confetti renders null component (appends own canvas to body)

### Key Lessons
1. Token naming must be agreed before multi-phase work starts — font-heading vs font-display caused 6 file fixes at milestone end
2. Quiz-to-prompt conversion should keep personal content in lyrics, not prompt — enhancePrompt strips meaningful content
3. Atomic removal of old UI is safer than incremental deletion — one commit, no broken build
4. URL params are the safest data carrier when localStorage is cleared before redirect

### Cost Observations
- Model mix: Primarily opus for planning/execution, haiku for research agents
- Sessions: ~5-6 across planning + execution
- Notable: 11 plans across 5 phases in ~13 hours — consistent ~70 min/plan throughput

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Timeline | Phases | Plans | Key Change |
|-----------|----------|--------|-------|------------|
| v1.0 | ~3h | 4 | 11 | Initial scaffold, TDD pipeline |
| v1.1 | ~2.5h | 4 | 10 | Design token system, theme infrastructure |
| v2.0 | ~2h | 4 | 8 | Complex UI patterns (workspace, player) |
| v3.0 | ~13h | 5 | 11 | Full product pivot, quiz funnel, new visual identity |

### Top Lessons (Verified Across Milestones)

1. Atomic commits for large structural changes prevent broken intermediate states (v1.0 schema, v3.0 UI removal)
2. Co-locate related code (schemas with components, styles with tokens) — reduces cross-file drift
3. Milestone audits catch integration issues that per-phase verification misses (font token drift in v3.0)
