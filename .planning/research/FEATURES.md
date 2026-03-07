# Feature Research

**Domain:** Legal and informational pages for an AI music generation gift service (Contact, Privacy Policy, Terms of Service)
**Researched:** 2026-03-06
**Confidence:** HIGH (Privacy/ToS requirements verified against official CCPA/GDPR sources, Suno ToS/Privacy analysis, US Copyright Office guidance, and Cloudflare R2 documentation. Contact page patterns from SaaS industry data and competitor analysis.)

---

## Context: What Already Exists

Notevra v3.0 ships with: landing page, 6-step quiz funnel, AI generation pipeline (ACE-Step 1.5 on RunPod A40), success page with confetti + audio playback + download, header + footer navigation. No auth, no payments. This milestone (v4.1) adds three legal/informational pages.

**New pages:** Contact, Privacy Policy, Terms of Service.

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features that users and legal compliance require. Missing these = product feels incomplete or legally exposed.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Contact page with support email | Users need a channel to report issues or ask questions. 51% of website visitors leave if contact info is hard to find (HubSpot industry data). Gift service users may have emotional stakes — support access builds trust. | LOW | Display `hello@notevra.com` or similar as a mailto link. No backend form required for v4.1 given zero auth and low traffic volume. |
| Privacy Policy page | Required by GDPR (EU users), CCPA (California users), and standard practice for any web app collecting personal data. Quiz answers constitute personal data — emotional details about third parties (loved ones) are collected. | LOW | Static page. Content must be accurate to actual Notevra data flows — not copy-pasted from a template. |
| Privacy Policy: what data is collected | CCPA 2026 (effective Jan 1 2026) and GDPR both require explicit categorical disclosure of data types collected. Quiz answers contain personal/emotional content (relationship details, memories about a third party). | LOW | Categories: quiz responses (browser localStorage only — not persisted server-side in raw form), generation prompts (sent to RunPod), generated audio files (stored in Cloudflare R2), Vercel server logs (IP, User-Agent, timestamp). |
| Privacy Policy: how data is used | Legally required. Must state purpose of each data type: quiz answers → construct generation prompt → generate song. Audio → user download and delivery. Logs → security and debugging. | LOW | Critical differentiator: Notevra does NOT train AI on user data. ACE-Step 1.5 is a fixed open-source model. State this explicitly — it is both legally accurate and a trust signal. Cloudflare confirms R2 customer data is never used to train Cloudflare AI models. |
| Privacy Policy: data retention timeframes | CCPA 2026 updated regulations now require specific retention periods, not vague "as long as necessary" language. | LOW | Define clearly: quiz answers (browser localStorage only — never stored on Notevra servers in raw form), generated audio (stored in R2 for 30 days, then auto-deleted), Vercel edge logs (per Vercel's standard retention policy). |
| Privacy Policy: third-party data sharing | CCPA requires disclosure of all service providers and contractors that receive personal data. GDPR requires legal basis for each processor. | LOW | Third parties: Vercel (hosting — receives server logs), Cloudflare R2 (audio storage), RunPod (AI compute — receives the generation prompt text derived from quiz answers). No ad networks, no analytics platforms, no payment processors in v4.1. |
| Privacy Policy: user rights section | GDPR (right to erasure, right of access, right to portability) and CCPA (right to delete, right to opt-out) require a statement of user rights and a mechanism to exercise them. | LOW | Simple: "Email us at [address] to request deletion of any data associated with your session." No automated tooling needed in v4.1 — no user accounts means data is not indexed to an identity. |
| Terms of Service page | Required to establish acceptable use terms, disclaim warranties, limit liability, and set governing law. All AI music services have this: Suno, Udio, AIVA, Boomy, Mubert. | LOW | Static page. Omitting this = no legal basis for terminating abusive use or limiting Notevra's liability for generation quality. |
| ToS: usage license for generated songs | The central legal question of any AI music service. What can the user do with their generated song? | MEDIUM | Grant: non-exclusive, personal, non-commercial license for personal gifting use. Be explicit that Notevra does not claim ownership of user outputs. Do not overpromise copyright — AI-generated works have no US copyright protection (US Court of Appeals, March 2025 ruling confirmed this, aligning with long-standing human-authorship requirement). |
| ToS: AI-generated music ownership reality | US courts (March 2025) confirmed AI-generated works lack copyright protection without meaningful human authorship. Suno's own support documentation acknowledges this. AIVA's free tier retains copyright; paid tier grants it. Notevra must set honest expectations. | MEDIUM | Honest framing: "Your song is AI-generated. Under current US law, AI-generated works cannot be copyrighted. The song is yours to use for personal gifting — download it, share it, gift it — but Notevra cannot grant you copyright ownership." This is more transparent than competitors and avoids overpromising. |
| ToS: acceptable use policy | Prevent misuse: generation of illegal/harmful content, impersonation, using outputs to train competing AI models. Standard across all AI services. | LOW | Prohibit: illegal content, impersonation, CSAM, harassment, commercial resale of outputs without a commercial license, using outputs to train competing AI systems. |
| ToS: disclaimer of warranties | Standard legal protection. Service provided "as is" with no guarantees of output quality, uptime, or fitness for any purpose. | LOW | Boilerplate "AS IS" language. |
| ToS: limitation of liability | Standard. Protects against consequential damages claims. Currently the service is free — cap at amount paid ($0). | LOW | Straightforward: cap at $0 or $100 (whichever is higher). Add a higher cap when Stripe payments are introduced. |
| ToS: DMCA/copyright section | DMCA Section 512 safe harbor requires a designated copyright agent and takedown procedure for any online service that generates or hosts content. Requires registration with the US Copyright Office. | LOW-MEDIUM | This is the one non-copy action required: register a designated agent at copyright.gov/dmca-agent ($6 fee, one-time). Then include agent contact email in ToS. Failure to register means losing DMCA safe harbor protection. |
| ToS: minimum age requirement | COPPA prohibits collecting data from users under 13 without parental consent. CCPA has separate rules for minors. | LOW | State minimum age 13. Parental consent required for under-18 users. Standard language. |
| Footer links to all three pages | Users expect Privacy Policy and Terms links in every website footer. Standard web convention — their absence signals an untrustworthy product. | LOW | Notevra footer already exists. Add three nav links. |

### Differentiators (Competitive Advantage)

Features that make Notevra's legal/info pages warmer and more aligned with brand than generic legalese.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Contact page with brand warmth | Most AI services use cold support portals (Suno redirects to Intercom; Udio uses a form). A warm, human contact page with personality fits the gift service brand and builds trust at a critical moment — users who reach out to contact a gift service are often emotionally invested. | LOW | Headline like "We'd love to hear from you" in Libre Baskerville. Brief context: "Questions about your song? Feedback? We're here." Email + social links alongside response time expectation. |
| Response time expectation on Contact page | Setting "We aim to reply within 2 business days" manages expectations. Gift buyers may be on a deadline (birthday, anniversary). Stating a response time reduces anxiety. | LOW | One sentence. No technical work. |
| Plain-language Privacy Policy | Most AI music privacy policies are unreadable legal boilerplate generated by Termly or iubenda. A clearly written, short policy signals trust — especially important for a gift service where users share personal memories and details about loved ones. | LOW | Write in plain English. Bold summary lines before each legal section. Avoid legal jargon. Short total length (under 1,000 words). Reference model: Basecamp's plain-language privacy approach. |
| Proactive AI transparency statement | In 2026, AI disclosure is increasingly expected by users and becoming mandatory under the EU AI Act for large providers. Proactively disclosing what AI Notevra uses, what it does with inputs, and that user data is NOT used to train the model differentiates from sketchy services. | LOW | One paragraph in Privacy Policy: "Notevra uses ACE-Step 1.5, an open-source AI model, to generate your song. Your quiz answers are transformed into a music generation prompt. We do not train any AI model on your data." |
| Honest "your song is yours" framing in ToS | Rather than hiding ownership ambiguity in legalese, address it directly and warmly. Framing this as a user-friendly disclosure rather than a limitation builds trust vs generating anxiety. Competitors either hedge (Suno) or bury it (Boomy). | LOW | Specific language: "The song we generate for you belongs to you in every practical sense — download it, share it, gift it. As an AI-generated work, it does not qualify for copyright protection under current US law, but that doesn't change what it means to you and the person you're giving it to." |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Contact form with backend | "Forms look more professional than a mailto link" | Requires server-side handling, spam protection (reCAPTCHA or Cloudflare Turnstile), email delivery infrastructure, and adds a new third-party to disclose in the Privacy Policy — significant complexity for v4.1 when email volume is near zero and no payments mean no urgent support volume. | Display email address as a mailto link. Add a form only after payment launch creates support volume that warrants it. |
| Live chat widget (Intercom, Crisp) | "Users expect instant help" | Adds third-party JS loaded on every page, triggers GDPR consent requirements for the chat vendor, and creates operational overhead (someone must monitor and respond in real time). Suno uses this because they have a paid user base and staff. Notevra has neither yet. | Email contact + clear response time expectation covers the need at current scale. |
| Cookie consent banner | "GDPR requires it" | A consent banner is required only if you use non-essential cookies (analytics, advertising, personalization). Notevra v4.1 has no analytics, no ad cookies, and uses only browser localStorage (not cookies). A banner adds conversion friction on a gift funnel unnecessarily. | Accurately disclose cookie/localStorage use in Privacy Policy. If no non-essential cookies — no consent banner is legally required. Add banner only when analytics are introduced. |
| Auto-generated legal text (Termly, iubenda, PrivacyPolicies.com) | "Faster than writing custom policy" | Auto-generated policies contain clauses that do not match actual data practices — sections about advertising networks, social login data, payment processors, and marketing platforms that Notevra does not use. Mismatch between stated practices and actual practices is a legal risk greater than having a shorter, accurate policy. | Write policy manually based on actual Notevra data flows. Short. Accurate. Reviewable. Takes 2-3 hours for a competent writer — worth it. |
| Separate ToS tiers for different user types | "Some users might want commercial use" | Premature complexity. No payments, no accounts, one user type (gift giver). Multi-tier ToS adds legal surface area and confusion at a stage where the goal is funnel validation. | Single ToS, personal non-commercial use only. Commercial tier added to ToS when Stripe payments and commercial licensing are introduced. |
| Mandatory binding arbitration clause | "Standard in consumer-facing ToS" | Binding arbitration with class action waiver is aggressive for a free gift service with no paying customers. Legally, it requires a clear acceptance mechanism (click-through checkbox on ToS) to be enforceable — not just a posted page. May deter users without providing meaningful protection at this stage. | Omit for v4.1. Add a proper arbitration clause with click-through acceptance when payments are introduced and real financial disputes become possible. |
| GDPR Data Processing Agreement (DPA) | "Required for EU users" | A full DPA is required when acting as a data processor for business customers. Notevra processes data for individual consumers, not businesses. A standard privacy policy covers individual consumer rights under GDPR. | Privacy Policy with a GDPR rights section covers individual users. Full DPA deferred until enterprise/business customers appear. |

---

## Feature Dependencies

```
Contact Page
    └──requires──> Email address decision (hello@notevra.com or support@notevra.com)
    └──requires──> Social media accounts exist (Instagram, X/Twitter)
    └──enhances──> Footer links (adds "Contact" to nav)

Privacy Policy
    └──requires──> Data inventory audit (what does Notevra actually collect and where is it stored?)
    └──requires──> Third-party list finalized (Vercel, RunPod, Cloudflare R2)
    └──enhances──> ToS (cross-reference: "See our Privacy Policy")
    └──enhances──> Contact page (user rights exercise goes to contact email)

Terms of Service
    └──requires──> DMCA agent registration ($6 US Copyright Office fee — one-time action, must happen before launch)
    └──requires──> Ownership/license position decision (personal use only, non-commercial)
    └──enhances──> Privacy Policy (cross-reference: "See our Terms of Service")

Footer Links
    └──requires──> All three pages deployed
    └──depends-on──> Existing Footer component (already built in v3.0 — add 3 link items)
```

### Dependency Notes

- **Privacy Policy requires a data inventory first.** Before writing, confirm exactly what Notevra stores server-side vs. what stays in the browser. Quiz answers are localStorage-only (`notevra_quiz_v1` key per PROJECT.md) — they are never persisted on Notevra servers in raw form. The generation prompt derived from quiz answers IS sent to RunPod. Generated audio IS stored in Cloudflare R2. Vercel edge logs capture IP and User-Agent. This inventory shapes every disclosure in the policy.
- **ToS requires DMCA agent registration before going live.** This is not just copy-writing — it is a legal filing with the US Copyright Office. The service costs $6. The registration must be completed before the ToS is published. The designated agent can be the founder's email address. Without this, Notevra loses DMCA safe harbor protection for any hosted content.
- **Contact page requires email address decision.** The chosen support email must be actively monitored. Simple operational dependency, not technical. The email address must match what appears in the Privacy Policy (user rights section) and the ToS (DMCA contact).
- **All three pages must be live before footer links can point to them.** Ship all three pages in the same deploy.

---

## MVP Definition

### Launch With (this milestone, v4.1)

Minimum viable legal/info pages for a publicly accessible AI gift service.

- [ ] Contact page — email address (mailto link), optional social links, brand-warm headline and brief copy, expected response time
- [ ] Privacy Policy — data inventory disclosure, AI transparency statement, retention periods, third-party list, user rights section
- [ ] Terms of Service — usage license, ownership reality disclosure, acceptable use, DMCA agent designation, age requirement, warranty disclaimer, liability cap
- [ ] DMCA agent registered with US Copyright Office ($6 — one-time action before launch)
- [ ] Footer updated — add links to all three pages

### Add After Validation (v4.x / post-payment launch)

- [ ] Contact form with backend — when email volume grows after Stripe payments launch; requires spam protection decision
- [ ] Cookie consent banner — when analytics are added (Google Analytics, Mixpanel, etc.)
- [ ] Commercial use tier in ToS — when Stripe payments and commercial licensing are introduced
- [ ] Arbitration clause with click-through acceptance — when payments create real financial dispute risk
- [ ] Updated liability cap — raise from $0 to amount paid when Stripe payments are live

### Future Consideration (v5+ / post-product-market-fit)

- [ ] Automated data deletion tooling — when Supabase Auth introduces user accounts and data indexed to identity
- [ ] Full GDPR Data Processing Agreement — if enterprise/business customers emerge
- [ ] Accessibility statement page — good practice, not urgent for v4.1
- [ ] Trust center / security page — relevant after payments and auth are live
- [ ] Live chat support — after paid user base reaches scale that justifies operational overhead

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Contact page (email + response time + brand warmth) | HIGH — trust signal, support channel | LOW | P1 |
| Privacy Policy (accurate, plain-language, complete) | HIGH — legal compliance + user trust | LOW | P1 |
| Terms of Service (license, DMCA, acceptable use, disclaimer) | HIGH — legal protection | LOW | P1 |
| DMCA agent registration (non-copy action) | HIGH — legal safe harbor | LOW ($6 + 15 min) | P1 |
| Footer links to all three pages | HIGH — discoverability, convention | LOW | P1 |
| AI transparency statement in Privacy Policy | MEDIUM — trust differentiator | LOW | P2 |
| Plain-language writing style throughout | MEDIUM — trust differentiator | LOW | P2 |
| Social links on Contact page | LOW — nice to have | LOW | P2 |
| Contact form with backend | LOW (now) | MEDIUM | P3 |
| Cookie consent banner | LOW (no analytics yet) | MEDIUM | P3 |
| Live chat widget | LOW (now) | HIGH | P3 |

**Priority key:**
- P1: Must have for this milestone
- P2: Should have — include if it takes under an hour; these are LOW cost and MEDIUM value
- P3: Defer to future milestone

---

## Competitor Feature Analysis

| Feature | Suno | AIVA | Boomy/Mubert | Notevra Approach |
|---------|------|------|--------------|-----------------|
| Contact method | Email (support@suno.com) + Discord community | Help center + email | Email only | Email mailto link + optional social links. No form for v4.1. |
| Privacy Policy length | Long, multi-section, CCPA/GDPR compliant | Standard length | Standard | Short, plain-language, accurate to actual data flows. Under 1,000 words target. |
| AI disclosure in Privacy Policy | "Training and enhance the models" clause — vague | Minimal disclosure | Minimal | Proactive: explicitly state which AI model, that user data is NOT used for training. |
| Data training disclosure | Suno uses inputs for model improvement | Unclear | Unclear | Clear NO: "We do not train any AI model on your quiz answers or generated songs." |
| ToS: music ownership | Paid tiers get assignment; free = personal non-commercial with attribution | Free = AIVA owns; paid = user gets copyright | Royalty-free license, platform retains partial rights | Personal use license for all users. Honest disclosure that AI-generated music lacks copyright protection under US law. |
| Ownership honesty | Suno hedges; own support docs admit no copyright protection | Free users have no copyright | Not explicit | Direct, warm honesty: "The song is yours in every practical sense. It cannot be copyrighted — that's a US law reality, not a Notevra limitation." |
| DMCA agent | Registered: copyright@suno.com | Registered | Yes | Must register before ToS goes live ($6, one-time). |
| Arbitration clause | Yes — mandatory binding arbitration | No | No | No — omit for free service. Add when payments introduce real disputes. |
| Cookie banner | Yes (analytics cookies present) | Yes | Yes | No — skip until analytics are added. |
| Age minimum | 13 | Unspecified | Unspecified | 13, parental consent for under-18. |

---

## Key Research Findings: Content Required in Each Page

### Contact Page — What to Show

1. **Warm headline** — "We'd love to hear from you" (Libre Baskerville; fits gift service emotional register)
2. **Brief context** — "Questions about your song? Ideas? Feedback? Reach out — we read every message."
3. **Email address** — primary contact method; displayed as a clickable mailto link
4. **Response time expectation** — "We aim to reply within 2 business days." Gift buyers often have deadlines (birthdays, anniversaries) — setting expectations reduces anxiety.
5. **Social links** — Instagram and/or X/Twitter if Notevra brand accounts exist
6. **No contact form for v4.1** — reduces scope and avoids email infrastructure dependency

### Privacy Policy — Sections Required

Based on CCPA 2026 (effective Jan 1 2026), GDPR, and actual Notevra data flows:

1. **Introduction** — who we are, what this policy covers, effective date
2. **What data we collect** — (a) quiz answers (browser localStorage — never stored raw on our servers), (b) generation prompt (sent to RunPod API), (c) generated audio file (stored in Cloudflare R2), (d) server logs (Vercel — IP address, User-Agent, timestamp, request path)
3. **How we use your data** — quiz answers → generate a personalized song prompt → generate your song; audio → deliver to you for download; logs → security and debugging
4. **AI transparency** — "We use ACE-Step 1.5, an open-source AI music model. Your quiz answers are used only to create your song. We do not train any AI model on your data. Cloudflare does not train AI on content stored in R2."
5. **Third-party services** — Vercel (hosting), Cloudflare R2 (audio storage), RunPod (AI compute); none for analytics, advertising, or payment processing in v4.1
6. **Data retention** — quiz answers: browser only, cleared when you clear browser data; generated audio: deleted from our servers after 30 days; server logs: per Vercel's standard retention policy
7. **Cookies and local storage** — we use browser localStorage to save your quiz progress; we do not use advertising or analytics cookies
8. **Your rights** — how to request deletion; email address for requests; note that without accounts, data is not indexed to your identity
9. **Children's privacy** — minimum age 13; we do not knowingly collect data from children under 13
10. **Policy updates** — how we notify users of changes; effective date
11. **Contact** — email for privacy-related requests

### Terms of Service — Sections Required

Based on Suno ToS analysis, DMCA Section 512, US Copyright Office guidance, and CCPA/GDPR:

1. **Acceptance of terms** — using the service constitutes acceptance; age requirement (13+)
2. **What Notevra does** — brief description of the gift song service
3. **Your song: license and ownership** — Notevra grants you a non-exclusive, personal, non-commercial license to download, share, and gift your generated song. Honest disclosure: AI-generated works do not qualify for copyright protection under current US law. You may use the song for personal gifting; you may not sell it, license it commercially, or use it to train competing AI models.
4. **Acceptable use** — prohibited: illegal content, impersonation, CSAM, harassment, commercial resale without license, using outputs to train competing AI, circumventing service restrictions
5. **User submissions** — by submitting quiz answers, you grant Notevra license to use that input solely to generate your requested song; we do not use it for AI training or share it with third parties except as needed to operate the service (RunPod generation)
6. **DMCA and copyright** — designated copyright agent designation; takedown request process; counter-notice process; repeat infringer policy
7. **Disclaimer of warranties** — service provided "as is"; no guarantee of output quality, specific style, uptime, or availability
8. **Limitation of liability** — not liable for indirect/consequential damages; liability capped at amount paid in last 6 months or $100 (whichever is greater); at current free tier, this is $0/$100
9. **Governing law** — specify applicable state/jurisdiction
10. **Changes to terms** — how Notevra may update terms; continued use = acceptance
11. **Contact** — for terms questions; for DMCA notices

---

## Sources

- [Suno Privacy Policy](https://suno.com/privacy) — HIGH confidence. Section structure and AI training disclosure language analyzed directly.
- [Suno Terms of Service](https://suno.com/terms) — HIGH confidence. Ownership tiers, DMCA, acceptable use, liability analyzed directly.
- [AIVA Licensing Terms helpdesk](https://aiva.crisp.help/en/article/i-dont-understand-the-terms-of-license-1wqvh5v/) — MEDIUM confidence. Free vs paid copyright ownership tiers.
- [US Court of Appeals AI copyright ruling — March 2025 (Soundverse report)](https://www.soundverse.ai/blog/article/us-court-bans-copyright-for-ai-art-what-musicians-and-creators-must-know-in-2025) — HIGH confidence. Confirmed by multiple sources including US Copyright Office guidance.
- [US Copyright Office — AI and Copyright](https://www.copyright.gov/ai/) — HIGH confidence. Official stance on human authorship requirement.
- [DMCA Section 512 — US Copyright Office](https://www.copyright.gov/512/) — HIGH confidence. Safe harbor and designated agent registration requirements.
- [CCPA Privacy Policy Requirements 2025 (SecurePrivacy)](https://secureprivacy.ai/blog/ccpa-privacy-policy-requirements-2025) — HIGH confidence. Data disclosure obligations.
- [CCPA 2025 Updated Regulations (DLA Piper)](https://www.dlapiper.com/en-us/insights/publications/2025/09/ccpa-2025-updated-regulations) — HIGH confidence. Retention disclosure requirements effective Jan 1 2026.
- [Cloudflare R2 Data Security](https://developers.cloudflare.com/r2/reference/data-security/) — HIGH confidence. Customer data isolation confirmation.
- [Cloudflare Workers AI Privacy](https://developers.cloudflare.com/workers-ai/privacy/) — HIGH confidence. Cloudflare does not train on customer content.
- [Contact Page Best Practices 2025 (Prosper Marketing)](https://www.prospermarketingsolutions.com/blogs-contact-form-best-practices-for-2025/) — MEDIUM confidence. Form field count and conversion data.
- [37 SaaS Contact Page Examples (SaasFrame)](https://www.saasframe.io/categories/contact-page) — MEDIUM confidence. Design pattern reference.
- [Suno Support Contact](https://help.suno.com/en/articles/2551617) — HIGH confidence. Confirms Suno's email-first support model with Discord as secondary community channel.
- [Legal considerations for AI music generators (Soundful)](https://soundful.com/legal-considerations-when-using-ai-music-generators/) — MEDIUM confidence. Industry-level overview.

---

*Feature research for: Notevra v4.1 — Legal and informational pages (Contact, Privacy Policy, Terms of Service)*
*Researched: 2026-03-06*
