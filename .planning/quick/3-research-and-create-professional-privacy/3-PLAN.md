---
phase: quick
plan: 3
type: execute
wave: 1
depends_on: []
files_modified:
  - src/app/privacy/page.tsx
  - src/app/terms/page.tsx
  - src/components/CookieConsent.tsx
  - src/app/layout.tsx
autonomous: true
requirements: [PRIVACY-POLICY, COOKIE-CONSENT]
must_haves:
  truths:
    - "Visiting /privacy shows a complete, professionally written privacy policy"
    - "Visiting /terms shows a complete, professionally written terms of service"
    - "First-time visitors see a cookie consent banner at the bottom of the page"
    - "Accepting or declining cookies dismisses the banner and persists the choice"
    - "Privacy policy covers all third-party services (Supabase, Vercel, Cloudflare R2, RunPod, Google Gemini)"
    - "Policy includes GDPR and CCPA required sections"
  artifacts:
    - path: "src/app/privacy/page.tsx"
      provides: "Full privacy policy content"
      min_lines: 150
    - path: "src/app/terms/page.tsx"
      provides: "Full terms of service content"
      min_lines: 100
    - path: "src/components/CookieConsent.tsx"
      provides: "Cookie consent banner component"
      min_lines: 30
  key_links:
    - from: "src/app/layout.tsx"
      to: "src/components/CookieConsent.tsx"
      via: "component import and render"
      pattern: "CookieConsent"
---

<objective>
Replace the placeholder privacy policy and terms of service pages with comprehensive, legally compliant content, and add a cookie consent banner to the site.

Purpose: Notevra (www.notevra.net) needs professional legal pages before scaling — covers GDPR, CCPA, and general best practices for an AI-powered music generation service that uses Supabase (auth/database), Vercel (hosting/analytics), Cloudflare R2 (audio file storage), RunPod (AI compute), and Google Gemini (AI text generation for prompt engineering).

Output: Complete privacy policy page, complete terms of service page, cookie consent banner component rendered site-wide.
</objective>

<execution_context>
@/Users/deeg/.claude/get-shit-done/workflows/execute-plan.md
@/Users/deeg/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@src/app/privacy/page.tsx (placeholder — replace entirely)
@src/app/terms/page.tsx (placeholder — replace entirely)
@src/app/layout.tsx (add CookieConsent component)
@src/components/Footer.tsx (styling reference for legal link classes)
@src/app/globals.css (design tokens reference)

<interfaces>
<!-- Existing patterns the executor needs -->

From src/app/layout.tsx:
- Root layout renders Header + main + Footer
- Uses font variables: dmSans, libreBaskerville, geistMono
- Tailwind classes: antialiased, min-h-screen, flex, flex-col

From existing placeholder pages (privacy/terms):
- Container pattern: `container mx-auto px-6 py-20 max-w-2xl`
- Heading: `font-display text-3xl font-bold text-foreground mb-4`
- Body text: `text-muted-foreground`

Design system decision [v4.1]: Legal pages use TSX over MDX — simpler, no new dependencies
Design system decision [v4.1]: No @tailwindcss/typography — write .prose-legal manually using existing OKLCH tokens
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create comprehensive privacy policy and terms of service pages</name>
  <files>src/app/privacy/page.tsx, src/app/terms/page.tsx</files>
  <action>
Replace the placeholder privacy policy page with a complete, professionally written privacy policy for Notevra. The policy must be written in plain, accessible language (not legalese) while covering all legally required areas.

**Privacy Policy (src/app/privacy/page.tsx) must include these sections:**

1. **Introduction** — Who we are (Notevra, www.notevra.net), what we do (AI-powered personalized song gift service), effective date (2026-03-15)
2. **Information We Collect** — Account info (email, name via Google OAuth or email signup), quiz responses (recipient name, occasion, mood, relationship, story details), generated content (AI-created songs, lyrics), usage data (pages visited, features used), device/browser info, cookies
3. **How We Use Your Information** — Generate personalized songs, deliver songs via email, improve service, communicate with users, prevent abuse
4. **Third-Party Services** — Describe each with what data flows to them:
   - Supabase (US-West-2): Authentication, database storage — stores account data, song metadata
   - Vercel: Hosting, serverless functions — processes requests, may collect analytics
   - Cloudflare R2: Audio file storage — stores generated song files (WAV/MP3)
   - RunPod: AI compute — processes song generation requests (receives lyrics, tags, duration)
   - Google Gemini: AI text generation — processes quiz answers to create song prompts (receives quiz responses)
   - Resend: Email delivery — receives recipient email addresses for song delivery and creator notifications
5. **Cookies and Tracking** — What cookies we use (auth session cookies via Supabase, cookie consent preference), no third-party advertising cookies
6. **Data Retention** — How long we keep data, song files, account data
7. **Your Rights (GDPR)** — Right to access, rectify, erase, restrict, port, object. How to exercise (email contact)
8. **Your Rights (CCPA)** — Right to know, delete, opt-out of sale (we do not sell data), non-discrimination
9. **Children's Privacy** — Not directed at children under 13, COPPA compliance
10. **Data Security** — Encryption in transit (HTTPS), access controls, no method is 100% secure
11. **International Data Transfers** — Data processed in US, appropriate safeguards
12. **Changes to This Policy** — How we notify of changes
13. **Contact Us** — Link to /contact page

**Terms of Service (src/app/terms/page.tsx) must include:**

1. **Acceptance of Terms** — By using the service you agree
2. **Service Description** — AI-powered personalized song creation and delivery
3. **User Accounts** — Account creation, responsibility for credentials
4. **Acceptable Use** — No harmful/illegal content, no abuse of AI generation
5. **Intellectual Property** — Users own their generated songs for personal use; Notevra retains platform IP; AI-generated content limitations
6. **Content Guidelines** — Quiz inputs must not contain harmful, hateful, or illegal content
7. **Service Availability** — No guarantee of uptime, may modify/discontinue
8. **Limitation of Liability** — Service provided "as is", limitation of damages
9. **Indemnification** — User indemnifies Notevra
10. **Governing Law** — US law applies
11. **Changes to Terms** — Right to modify, continued use = acceptance
12. **Contact** — Link to /contact page

**Styling for both pages:**
- Use the existing container pattern: `container mx-auto px-6 py-20 max-w-2xl`
- Page title: `font-display text-3xl font-bold text-foreground mb-4`
- Effective date below title: `text-sm text-muted-foreground mb-10`
- Section headings: `font-display text-xl font-bold text-foreground mt-10 mb-3`
- Body paragraphs: `text-muted-foreground leading-relaxed mb-4`
- Lists: `list-disc list-inside text-muted-foreground leading-relaxed mb-4 space-y-1`
- Links: `text-primary hover:underline`
- Add metadata export for each page (title, description)
- Both are Server Components (no 'use client')
- Effective date: March 15, 2026
- Last updated: March 15, 2026
  </action>
  <verify>
    <automated>cd /Users/deeg/Documents/GitHub/MusicGenerator && npx next build 2>&1 | tail -20</automated>
  </verify>
  <done>Both /privacy and /terms render complete, multi-section legal content with proper styling. Privacy policy covers all 6 third-party services. Terms covers acceptable use, IP, liability. Both have effective dates and contact links.</done>
</task>

<task type="auto">
  <name>Task 2: Create cookie consent banner and wire into layout</name>
  <files>src/components/CookieConsent.tsx, src/app/layout.tsx</files>
  <action>
Create a cookie consent banner component and add it to the root layout.

**CookieConsent component (src/components/CookieConsent.tsx):**
- 'use client' component (needs useState, useEffect, localStorage)
- On mount, check localStorage for key `notevra-cookie-consent` — if value exists ('accepted' or 'declined'), do not show banner
- If no stored preference, render a fixed-position banner at the bottom of the viewport
- Banner styling:
  - `fixed bottom-0 inset-x-0 z-50` for positioning
  - Inner container: `container mx-auto px-6 py-4` with `bg-card border-t border-border shadow-lg`
  - Flex layout: text on left, buttons on right, wraps on mobile
  - Text: "We use cookies to keep you signed in and improve your experience." with a link to /privacy ("Learn more" styled as `text-primary hover:underline`)
  - Two buttons: "Decline" (outline style: `border border-border text-foreground hover:bg-muted`) and "Accept" (primary: `bg-primary text-primary-foreground hover:opacity-90`)
  - Both buttons: `rounded-lg px-4 py-2 text-sm font-medium transition-colors`
- On Accept click: set localStorage `notevra-cookie-consent` = 'accepted', hide banner
- On Decline click: set localStorage `notevra-cookie-consent` = 'declined', hide banner
- Use a brief entrance animation: banner starts with `translate-y-full` and transitions to `translate-y-0` after a short delay (use Tailwind transition classes, NOT framer-motion)
- Do NOT install any new packages — pure React + Tailwind + localStorage

**Layout update (src/app/layout.tsx):**
- Import CookieConsent from '@/components/CookieConsent'
- Render `<CookieConsent />` after `<Footer />` inside the body, before closing body tag
- No other changes to layout
  </action>
  <verify>
    <automated>cd /Users/deeg/Documents/GitHub/MusicGenerator && npx next build 2>&1 | tail -20</automated>
  </verify>
  <done>Cookie consent banner appears on first visit at bottom of page. Clicking Accept or Decline hides the banner and persists choice in localStorage. Banner does not reappear on subsequent visits. Banner links to /privacy page.</done>
</task>

</tasks>

<verification>
- `npm run build` completes without errors
- Visit /privacy — full privacy policy renders with all sections
- Visit /terms — full terms of service renders with all sections
- First visit to any page shows cookie consent banner at bottom
- Clicking Accept hides banner, refreshing page does not show it again
- Clearing localStorage and refreshing shows banner again
</verification>

<success_criteria>
- Privacy policy page has 13+ sections covering all third-party services, GDPR, CCPA, cookies, data retention, children's privacy, and contact information
- Terms of service page has 11+ sections covering acceptable use, IP, liability, and service terms
- Cookie consent banner renders site-wide, persists user choice in localStorage
- All pages build without errors
- No new npm dependencies added
</success_criteria>

<output>
After completion, create `.planning/quick/3-research-and-create-professional-privacy/3-SUMMARY.md`
</output>
