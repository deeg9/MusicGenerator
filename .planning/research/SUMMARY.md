# Project Research Summary

**Project:** Notevra v4.1 — Legal and Informational Pages
**Domain:** Legal compliance, trust infrastructure, and informational pages for an AI music gift service
**Researched:** 2026-03-06
**Confidence:** HIGH

## Executive Summary

Notevra v4.1 adds three pages — Contact, Privacy Policy, and Terms of Service — to an existing product that already works. This is not a product feature milestone; it is a trust and legal compliance milestone. The research is unambiguous: these pages must be accurate to Notevra's actual data flows, not copy-pasted from templates. The quiz collects emotionally sensitive personal information (recipient names, relationship details, personal memories), and any Privacy Policy that fails to name this data explicitly is non-compliant with CCPA 2026 (effective January 1, 2026) and GDPR. The standard "contact, privacy, terms" milestone that looks simple from the outside has meaningful legal risk concentrated in the content, not the code.

The recommended technical approach is minimal and correct for the scope: three static Server Components using the existing Next.js App Router, a single shared `LegalLayout` prose wrapper, a custom `.prose-legal` CSS block in `globals.css` (no new typography plugin), and optionally MDX via `@next/mdx` if legal content needs to live as editable Markdown files. The Contact page should launch as a display-only page (email or social links + response time expectation + brand warmth) with no inline form — a form adds spam protection complexity and email infrastructure dependency that is not justified by current support volume. The existing Footer already has links wired to `/contact`, `/privacy`, and `/terms` — the routes just need to exist.

The highest-risk item in this milestone is not a line of code: it is the DMCA designated agent registration with the US Copyright Office ($6 one-time fee) that must be completed before the Terms of Service goes live. Without this registration, Notevra loses DMCA Section 512 safe harbor protection for any hosted content. The second-highest-risk item is ownership language in the ToS: AI-generated works lack copyright protection under US law as of a 2025 US Court of Appeals ruling, and any ToS that says "you own your song" without qualification is a misleading representation. Both are write-once-correctly problems, not refactor problems.

## Key Findings

### Recommended Stack

The v4.1 milestone requires minimal net-new dependencies. The existing stack (Next.js 16.1.6, React 19.2.3, Tailwind CSS v4, DM Sans + Libre Baskerville, Framer Motion, Zod, lucide-react) covers everything needed for a display-only Contact page and TSX-based Privacy Policy and Terms of Service.

See `.planning/research/STACK.md` for full version compatibility matrix and configuration code examples.

**Core technologies (net-new, conditional):**
- `@next/mdx@16.1.6` + `@mdx-js/loader@3.1.1` + `@mdx-js/react@3.1.1` + `@types/mdx`: MDX support for legal pages — compiles at build time, zero runtime cost, legal content stays in git as editable Markdown. Add only if MDX is chosen over TSX for legal content.
- `resend@6.9.3`: Contact form email delivery — add only after Stripe payments create enough support volume to justify a form. Deferred from v4.1.
- Native `<form>` + `useActionState` + Zod: Sufficient for a future 3-field contact form — no `react-hook-form` needed.

**Do not add:**
- `next-mdx-remote` — runtime MDX, overkill for static local files; sends MDX runtime to the client bundle
- `contentlayer` / `contentlayer2` — effectively unmaintained since 2023
- `@tailwindcss/typography` — fights the existing OKLCH token system; write `.prose-legal` manually in `globals.css`
- `@react-email/components` — full email template library; a contact notification needs only a plain-text string

### Expected Features

The feature research is high-confidence, grounded in CCPA 2026, GDPR, DMCA Section 512, and direct analysis of competitor ToS and Privacy Policies (Suno, AIVA, Boomy).

See `.planning/research/FEATURES.md` for the full feature dependency graph, competitor analysis, and section-by-section content requirements for each page.

**Must have (table stakes — P1):**
- Contact page with email address, response time expectation ("We aim to reply within 2 business days"), and brand-warm copy
- Privacy Policy: quiz data explicitly named as personal information, AI transparency statement, specific retention timeframes (not "as long as necessary"), named third-party processors (Vercel, RunPod, Cloudflare R2), user rights section with deletion contact mechanism
- Terms of Service: usage license (not ownership claim), honest AI copyright disclosure, acceptable use policy, DMCA agent designation, minimum age (13+), warranty disclaimer, liability cap, "Changes to Terms" clause with Last Updated date
- DMCA agent registered with US Copyright Office ($6 one-time action — must complete before ToS goes live)
- Footer links to all three pages (Footer component already wired — routes just need to exist)

**Should have (differentiators — P2):**
- Plain-language Privacy Policy under 1,000 words (vs. competitor boilerplate from Termly or iubenda)
- Proactive AI transparency statement naming ACE-Step 1.5 and explicitly stating user data is not used for training
- Warm, brand-aligned Contact page copy in Libre Baskerville
- Social links on Contact page if Notevra brand accounts exist

**Defer (v4.x or later):**
- Contact form with backend — add when Resend is integrated for order delivery (post-Stripe payments)
- Cookie consent banner — add only when analytics are introduced; not needed for v4.1 (no analytics cookies, localStorage is not a cookie)
- Commercial use tier in ToS — add with Stripe payments and commercial licensing
- Binding arbitration clause — add with payments; requires a click-through acceptance mechanism to be enforceable
- Automated data deletion tooling — add with Supabase Auth and user accounts

### Architecture Approach

All three pages are static Server Components with zero client-side JavaScript for page content. They inherit the root layout's Header and Footer automatically — no layout changes required. The only new shared component is `LegalLayout`, a prose wrapper that takes `title` and `lastUpdated` props and applies a `.prose-legal` CSS class. This CSS block is defined once in `globals.css` under `@layer components` using existing OKLCH design tokens — no typography plugin, no override configuration.

See `.planning/research/ARCHITECTURE.md` for full directory structure, annotated code examples for LegalLayout, `.prose-legal`, and the static metadata export pattern, plus anti-pattern documentation.

**Major components:**
1. `src/components/LegalLayout.tsx` — Shared prose wrapper: max-width container (`max-w-3xl`), page `<h1>` rendered from `title` prop, `lastUpdated` date in header, `.prose-legal` children slot. Server Component, no state, no hooks.
2. `src/app/contact/page.tsx` — Contact page: display-only Server Component, `mailto:` link or social links + response time copy + brand-warm headline
3. `src/app/privacy/page.tsx` — Privacy Policy: Server Component, `<article>` outer wrapper, `<section aria-labelledby>` per major section, `id` attributes on all `<h2>` elements for anchor navigation
4. `src/app/terms/page.tsx` — Terms of Service: same semantic structure as Privacy Policy; cross-references Privacy Policy
5. `.prose-legal` CSS block in `globals.css` — Styles `h2`, `h3`, `p`, `ul`, `ol`, `a` inside legal prose using `var(--font-libre)`, `var(--foreground)`, `var(--navy-800)`, `var(--blue-500)` (all confirmed present in `src/app/tokens/primitives.css`)

**Build order (dependency-ordered):** `.prose-legal` in `globals.css` → `LegalLayout.tsx` → `contact/page.tsx` → `privacy/page.tsx` → `terms/page.tsx`. Each step depends on the previous. Validate Footer link resolution after Contact page (the first new route).

**Key anti-patterns to avoid:**
- `'use client'` on legal pages — breaks `metadata` export, forces content into JS bundle, eliminates static rendering
- Per-route `layout.tsx` for prose wrapper — introduces unnecessary route group complexity; import `LegalLayout` directly in each page instead
- `@tailwindcss/typography` — requires extensive overrides to match OKLCH tokens; `.prose-legal` block is 20 lines and uses existing variables directly

### Critical Pitfalls

See `.planning/research/PITFALLS.md` for all 11 pitfalls with warning signs, "Looks Done But Isn't" checklist, and recovery strategies.

**Top pitfalls requiring immediate attention during content writing:**

1. **Privacy Policy omits quiz data as personal information** — Relationship details, recipient names, personal memories, and heartfelt messages are personal information under CCPA and GDPR. The policy must name them explicitly and describe their emotional sensitivity. Avoid: treating quiz answers as "anonymous session data." The policy must also explicitly state quiz data is NOT used for AI training.

2. **ToS claims "you own your song" without qualification** — US law as of March 2025 does not grant copyright protection to AI-generated works. "You own your song" is a misleading representation that creates liability if users rely on it commercially. Use: "Notevra grants you a worldwide, royalty-free license to use, share, and download your song. We do not claim ownership. Because songs are AI-generated, they may not qualify for copyright protection under current US law." Do not copy Suno's ToS — they updated it in November 2025 after a Warner Music Group settlement.

3. **DMCA agent not registered before ToS goes live** — DMCA Section 512 safe harbor requires a registered designated agent at copyright.gov ($6). Without this, Notevra is exposed to full DMCA liability. This is a one-time action and a hard dependency for ToS publication — it must happen before the page ships.

4. **Vague data retention language ("as long as necessary")** — CPRA (active enforcement 2025-2026) requires specific retention periods for each data category. State concrete timeframes: generated audio deleted after 30 days (or chosen number); quiz answers not stored server-side beyond generation; Vercel logs per Vercel's standard policy.

5. **Contact page exposes founder email in plain HTML source** — `href="mailto:hello@notevra.com"` in plain text is harvested by scrapers within weeks of launch. For v4.1, the recommended approach is social-links-only contact (if accounts exist) or a displayed email with HTML entity encoding as a minimum partial mitigation. A Resend-based form that abstracts the real address is the proper solution but is deferred.

## Implications for Roadmap

Based on combined research, the milestone maps naturally to six sequential phases ordered by dependency chain. Legal content and non-code decisions must be made before implementation begins. Non-code actions (DMCA registration, email address decision, retention period decision) are blocking dependencies for specific phases.

### Phase 1: Content Decisions and Non-Code Prerequisites

**Rationale:** Non-code decisions and legal content must be locked before implementation begins. Writing legal text after building the page structure leads to rework if the content drives layout changes. DMCA registration must happen before the ToS route is deployed. This phase is short (2-4 hours of work) but unlocks everything downstream.

**Delivers:** DMCA designated agent registered at copyright.gov ($6), contact email address decided and monitored, audio retention period decided (concrete number for R2 lifecycle rule and Privacy Policy), contact mechanism decided (display-only vs. form with Resend), social media account status confirmed, final legal text drafted for all three pages.

**Addresses:** DMCA registration (hard dependency for ToS launch), data retention period decision, contact mechanism decision (affects Contact page implementation approach), email address operational decision.

**Avoids:** Pitfall 3 (DMCA agent missing at launch), Pitfall 5 (vague retention language — must decide the number before writing the policy), Pitfall 7 (contact form spam — decide static vs. form before building anything).

**Research flag:** No additional code research needed. Content writing guidance is fully documented in FEATURES.md (section-by-section requirements for all three pages). The legal text itself requires thoughtful writing against actual Notevra data flows — not code research.

---

### Phase 2: Shared Infrastructure

**Rationale:** CSS and shared component must exist before any page can be built. Two files, zero page routes, validates the design system works for prose content at the typography level.

**Delivers:** `.prose-legal` CSS block added to `globals.css` under `@layer components`, `src/components/LegalLayout.tsx` Server Component with `title`, `lastUpdated` props and semantic `<article>` wrapper.

**Uses:** Existing OKLCH design tokens (`var(--font-libre)`, `var(--foreground)`, `var(--navy-800)`, `var(--blue-500)`) — all confirmed present in `src/app/tokens/primitives.css`.

**Implements:** Architecture Pattern 2 (LegalLayout) and Pattern 3 (.prose-legal). Validates prose typography in isolation before any page ships.

**Avoids:** Anti-Pattern 3 (adding `@tailwindcss/typography`), Anti-Pattern 1 (`'use client'` on the wrapper component).

**Research flag:** Standard patterns. All code examples are documented in ARCHITECTURE.md. No additional research needed.

---

### Phase 3: Contact Page

**Rationale:** Contact page is the shortest-content page and the first to validate that new routes resolve, Footer links work, and LegalLayout renders correctly end-to-end. Ship this first to test the integration before committing to long-form legal page content. Contact mechanism decision (from Phase 1) drives implementation approach.

**Delivers:** `/contact` route, Footer link resolution confirmed, brand-warm contact display (email or social links + response time expectation in Libre Baskerville heading).

**Uses:** `LegalLayout`, lucide-react icons (already installed), `mailto:` link or social media links per Phase 1 decision.

**Avoids:** Pitfall 7 (spam vector — display-only, no form), Pitfall 10 (email exposed in plain HTML — use social links or entity encoding).

**Research flag:** Standard patterns. Display-only Server Component, zero complexity. No additional research needed.

---

### Phase 4: Privacy Policy Page

**Rationale:** Privacy Policy is the longest page with the most legal risk. It depends on Phase 1 content decisions (data inventory, retention periods, third-party processor list). Building it after Contact validates the prose rendering at scale and confirms LegalLayout handles long-form content correctly.

**Delivers:** `/privacy` route with complete CCPA 2026 and GDPR-compliant content: quiz data named as personal information, AI transparency statement, concrete retention periods, named third-party processors, user rights section with deletion contact mechanism, children's privacy section.

**Uses:** `LegalLayout`, `<section aria-labelledby="...">` per major section, `id` attributes on `<h2>` headings for anchor navigation, `<article>` outer wrapper.

**Avoids:** Pitfall 1 (quiz data omitted), Pitfall 5 (vague retention), Pitfall 6 (emotional sensitivity of memory/message data not acknowledged), Pitfall 9 (accessibility — heading hierarchy + contrast requirements).

**Research flag:** No code research needed. Content requirements are fully specified in FEATURES.md ("Privacy Policy — Sections Required"). Architecture patterns are identical to Contact Page.

---

### Phase 5: Terms of Service Page

**Rationale:** ToS depends on the ownership/license position finalized in Phase 1 and the DMCA agent registered (also Phase 1). It cross-references the Privacy Policy. Building it after Privacy Policy ensures Privacy Policy is final before ToS points to it.

**Delivers:** `/terms` route with complete ToS: usage license (not ownership claim), honest AI copyright disclosure with ACE-Step model reference, acceptable use policy, DMCA agent designation (with registered agent name and email), minimum age (13+), warranty disclaimer, liability cap, "Changes to Terms" clause with Last Updated date, indemnification clause.

**Uses:** `LegalLayout`, same semantic HTML structure as Privacy Policy.

**Avoids:** Pitfall 2 (unsupportable ownership claim), Pitfall 3 (ACE-Step training data indemnification gap), Pitfall 4 (COPPA age clause missing), Pitfall 11 ("Changes to Terms" clause omitted).

**Research flag:** No code research needed. Content requirements fully specified in FEATURES.md ("Terms of Service — Sections Required"). The DMCA agent registration from Phase 1 provides the designated agent contact to include.

---

### Phase 6: SEO, Sitemap, and Accessibility Verification

**Rationale:** Verification phase, not a build phase. Easy to ship legal pages and discover weeks later they are de-indexed or fail accessibility audits. Making verification explicit prevents the "looks done but isn't" failure modes documented in PITFALLS.md.

**Delivers:** All three routes added to `sitemap.ts` with `priority: 0.3` and `changeFrequency: 'monthly'`, `robots.ts` confirmed to not block any legal page path, `curl -I` verification that no `X-Robots-Tag: noindex` header is returned for each page in production, Lighthouse accessibility audit >= 90 on each page, heading hierarchy verified with axe or browser DevTools.

**Avoids:** Pitfall 8 (legal pages accidentally noindexed or excluded from sitemap), Pitfall 9 (accessibility failures — heading order violations, contrast below 4.5:1).

**Research flag:** Standard patterns. If `sitemap.ts` does not already exist in the codebase, check current state before writing new patterns — ARCHITECTURE.md assumes it exists; verify during Phase 6 execution. No pre-planning research needed.

---

### Phase Ordering Rationale

- **Content before code:** Legal content drives implementation details (section structure, anchor IDs, cross-references between Privacy Policy and ToS). Writing content first avoids rework.
- **Non-code actions are blocking dependencies:** DMCA registration, email address decision, and retention period decision are all Phase 1 blocking items. Phases 4 and 5 cannot be completed accurately without them.
- **Contact page before legal pages:** Shortest content, fastest validation of route + LegalLayout + Footer integration. Any structural issue with LegalLayout surfaces on the simplest page first.
- **Privacy Policy before ToS:** ToS cross-references Privacy Policy. ToS also depends on the data inventory finalized during Privacy Policy writing.
- **Verification as its own phase:** SEO and accessibility checks are consistently skipped when embedded in page-build phases. Making them an explicit phase prevents the "looks done but isn't" failure mode.

### Research Flags

Phases likely needing deeper research during planning:
- **None identified.** This milestone is well-documented. Code patterns are established (Next.js App Router static Server Components). Legal content requirements are specified in detail in FEATURES.md. The only unknowns are operational decisions (email address, retention period, DMCA agent identity) that belong to Phase 1 planning, not code research.

Phases with standard patterns (skip research-phase):
- **All phases (2-6):** Next.js static Server Components, `export const metadata`, `@layer components` CSS, and Playwright sitemap/robots verification are all officially documented patterns. ARCHITECTURE.md provides ready-to-use code examples for every component.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Versions verified against live npm registry. `@next/mdx` version-locked to Next.js 16.1.6. Resend free tier pricing cited from official blog — verify current limits at resend.com/pricing before use. |
| Features | HIGH | CCPA 2026, GDPR, DMCA Section 512, COPPA 2025 all verified against official regulatory sources. US copyright ruling (March 2025) confirmed via multiple sources including US Copyright Office guidance. Competitor ToS/Privacy analysis direct from live Suno and AIVA documents. |
| Architecture | HIGH | Verified directly against codebase: `layout.tsx`, `Footer.tsx`, `globals.css`, `tokens/primitives.css` all inspected. Footer links confirmed already wired to `/contact`, `/privacy`, `/terms`. OKLCH tokens confirmed available for `.prose-legal`. |
| Pitfalls | HIGH | Legal compliance pitfalls grounded in FTC, CPRA, US Copyright Office guidance, and active 2025-2026 enforcement precedents (Suno Warner settlement Nov 2025, CPRA enforcement ramp-up). Technical pitfalls grounded in actual codebase inspection. |

**Overall confidence:** HIGH

### Gaps to Address

- **Contact email address:** The actual support email (`hello@notevra.com` or `support@notevra.com`) is an operational decision that must be made in Phase 1. It appears in three places — Privacy Policy (user rights section), Terms of Service (DMCA agent contact), and Contact page — and must be consistent. The inbox must be actively monitored before any page goes live.

- **Audio retention period:** "30 days" is suggested in research as a reasonable default for generated audio in Cloudflare R2. The actual decision must be made in Phase 1 and implemented as an R2 lifecycle rule. The Privacy Policy must state the exact same number that the lifecycle rule enforces. Mismatch between stated and actual retention is a compliance risk.

- **DMCA agent identity:** The designated agent can be the founder's name and email. This must be decided and registered at copyright.gov before Phase 5 (ToS). The agent's name and contact email are required content in the ToS DMCA section.

- **Social media accounts for Contact page:** If Notevra brand accounts (Instagram, X/Twitter) exist, include them on the Contact page. If they do not exist, the Contact page falls back to email-only or uses HTML entity encoding as a partial spam mitigation. Confirm account status in Phase 1.

- **MDX vs. TSX decision:** Research recommends `@next/mdx` if legal content needs to be editable without touching React code. If only a developer will edit these files, plain TSX avoids the MDX configuration step. This is a preference call — make it before Phase 2 to avoid mid-milestone dependency installation.

- **Resend free tier limits (if form is ever added):** Research cites 3,000 emails/month, 100/day from an official blog post. Verify current limits at resend.com/pricing before adding `resend` to a future milestone.

## Sources

### Primary (HIGH confidence)

- Next.js App Router documentation — https://nextjs.org/docs/app — Server Components, metadata export, static rendering
- Next.js metadata API reference — https://nextjs.org/docs/app/api-reference/functions/generate-metadata
- Next.js MDX guide — https://nextjs.org/docs/app/guides/mdx — `@next/mdx` App Router setup, `pageExtensions`, `mdx-components.tsx`
- npm registry — `@next/mdx` 16.1.6, `@mdx-js/loader` 3.1.1, `@mdx-js/react` 3.1.1, `resend` 6.9.3 (live registry, 2026-03-06)
- Resend docs — https://resend.com/docs/send-with-nextjs — Server Actions integration
- CCPA 2026 / CPRA requirements — SecurePrivacy, DLA Piper — specific retention disclosure requirements effective January 1, 2026
- DMCA Section 512 — https://www.copyright.gov/512/ — safe harbor, designated agent registration
- US Copyright Office AI and Copyright — https://www.copyright.gov/ai/ — human authorship requirement
- US Court of Appeals AI copyright ruling (March 2025) — confirmed via Soundverse report and US Copyright Office 2025 report
- COPPA 2025 rule update — FTC official rule, Federal Register (effective 2025-04-22)
- Cloudflare R2 Data Security — https://developers.cloudflare.com/r2/reference/data-security/ — customer data isolation confirmation
- Suno Terms of Service — https://suno.com/terms — direct analysis (post-Warner settlement version)
- Suno Privacy Policy — https://suno.com/privacy — direct analysis
- Codebase inspection — `src/app/layout.tsx`, `src/components/Footer.tsx`, `src/app/globals.css`, `src/app/tokens/primitives.css` — all inspected directly

### Secondary (MEDIUM confidence)

- Suno ToS analysis post-Warner settlement (Nov 2025) — Medium article; confirms updated ownership language; use as cautionary reference, not template
- AIVA licensing terms helpdesk — free vs. paid copyright ownership tiers
- Resend pricing blog — 3,000 emails/month free tier; date of blog post not confirmed current
- WebSearch — contentlayer maintenance status — consistent community consensus on abandonment since 2023
- Contact page best practices — SaasFrame, Prosper Marketing; form field count and conversion benchmarks
- WCAG 2.1 Level AA — accessibility baseline for legal long-form text

### Tertiary (LOW confidence)

- ACE-Step training data provenance ("professionally licensed tracks, public domain music, MIDI-to-audio synthetic data") — from ACE-Step GitHub and HuggingFace model card; sufficient basis for ToS disclaimer language, not independently verified against original dataset documentation

---
*Research completed: 2026-03-06*
*Ready for roadmap: yes*
