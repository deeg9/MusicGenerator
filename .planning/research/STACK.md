# Stack Research

**Domain:** Legal and informational static pages — Contact, Privacy Policy, Terms of Service for AI music gift service
**Researched:** 2026-03-06
**Confidence:** HIGH (versions verified against live npm registry; Next.js App Router patterns verified against official Next.js docs)

---

## Context: Existing Stack (Do Not Re-research)

This research covers ONLY net-new additions for the v4.1 Legal & Info Pages milestone. The following are already installed and working:

| Already In Place | Version | Relevance to v4.1 |
|------------------|---------|-------------------|
| Next.js App Router | 16.1.6 | Static page rendering, `generateMetadata`, Server Actions |
| React | 19.2.3 | Server Components for static pages; `useActionState` for form state |
| Zod | ^4.3.6 | Already used for quiz validation — reuse for contact form validation |
| Tailwind CSS | ^4 | OKLCH tokens already configured — all styling included |
| DM Sans + Libre Baskerville | next/font/google | Typography already loaded in root layout — no additions needed |
| Framer Motion | ^12.35.0 | Optional entrance animations — already installed |
| Header + Footer | — | Already wrap every page in root layout — legal pages inherit them |
| lucide-react | ^0.577.0 | Icons for contact page (email, social) — already installed |

---

## Recommended Stack — New Additions Only

### Content: MDX for Legal Pages

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `@next/mdx` | `16.1.6` | Render Privacy Policy and Terms of Service from local `.mdx` files in `/app` | The official Next.js package for MDX, version-locked to Next.js. Lets you write legal content as structured Markdown with React component interpolation (e.g., `<EffectiveDate />` or `<ContactEmail />`). MDX files in the App Router `app/` directory become pages automatically with `pageExtensions` config — no separate data layer needed. Legal content lives in version-controlled `.mdx` files, editable without touching React code. |
| `@mdx-js/loader` | `3.1.1` | Webpack loader that compiles `.mdx` to React components | Required peer dependency of `@next/mdx` for webpack-based Next.js builds. Does the actual MDX-to-JSX compilation at build time — no runtime overhead. |
| `@mdx-js/react` | `3.1.1` | Provides `MDXProvider` context and component substitution | Allows global component overrides via `mdx-components.tsx` — so `# Heading` becomes `<h1 className="font-display text-3xl ...">` using Notevra's Libre Baskerville styles, and `---` becomes a styled `<hr />`. Write once, applies to all `.mdx` legal pages. |
| `@types/mdx` | latest | TypeScript types for MDX module imports | Required for TypeScript to understand `.mdx` file imports without type errors. Peer dep for `@mdx-js/react`. |

**Why MDX over plain TSX for legal content:** Legal content changes independently of component logic. Non-developer edits (updating an effective date, adding a clause) should be a single-file markdown edit, not a JSX file change. MDX with the `@next/mdx` App Router pattern achieves this while keeping content in git, building to static HTML at `next build`, and costing zero additional runtime overhead.

**Why MDX over a headless CMS (Contentful, Sanity):** Zero infrastructure cost, zero API calls at runtime, legal content lives in the same git repository as the code that links to it. For 2-3 static legal pages that change rarely, a CMS adds operational complexity with no benefit.

### Contact Form: Resend Email API

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `resend` | `6.9.3` | Send contact form submissions to the Notevra inbox via Next.js Server Actions | Resend is the current standard for transactional email in Next.js projects. Free tier: 3,000 emails/month, 100/day — sufficient for a contact form. Native Server Actions integration: the `resend.emails.send()` call goes inside an `async` server function with `"use server"` — no API route needed. Zod is already installed for validation. React 19's `useActionState` handles pending/error/success states without client-side state libraries. |

**Why Resend over alternatives:**
- **vs. Nodemailer/SMTP:** Nodemailer requires a mail server or SMTP credentials. Resend is an API — no server management, better deliverability, simpler setup.
- **vs. SendGrid:** SendGrid requires domain verification for any meaningful volume and has a more complex API. Resend's API surface is minimal and its Next.js integration is first-class.
- **vs. a simple mailto: link on the contact page:** A `mailto:` link is adequate if the Contact page only needs to display contact info. If an inline form is desired, Resend is the standard. See "Stack Patterns by Variant" below.

---

## What NOT to Add

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `next-mdx-remote` | Designed for dynamic MDX loaded from a CMS or database at runtime. Sends the MDX runtime to the client bundle. For static local legal files, `@next/mdx` compiles at build time with zero runtime cost. | `@next/mdx` + local `.mdx` files |
| `contentlayer` or `contentlayer2` | Contentlayer is effectively unmaintained (last release 2023, open GitHub issues unresolved). The fork `contentlayer2` exists but the community has shifted to direct `@next/mdx` or Velite for local content. | `@next/mdx` directly |
| `react-hook-form` (net new) | Already have Zod installed. For a 3-field contact form (name, email, message), React 19's `useActionState` + native form action + Zod server-side validation is sufficient. Adding react-hook-form for this scope adds ~30KB client JS for marginal benefit. | Native `<form action={serverAction}>` + `useActionState` + Zod |
| `@react-email/components` | Full React Email component library is for designing rich HTML emails with layouts, images, and brand templates. A contact form notification email needs only a minimal plain-text template — the `resend` package alone handles this without a separate rendering library. | Inline `text` field in `resend.emails.send()` |
| Any rich text editor (TipTap, Quill, Slate) | Legal pages are write-once, edit-rarely content. An editor implies a CMS workflow. Legal content belongs in version-controlled `.mdx` files, edited in a code editor and deployed via git. | MDX files in git |
| `gray-matter` | Frontmatter parsing library for extracting metadata from markdown files. Useful when programmatically loading many content files. For 2 legal pages loaded directly as App Router pages, frontmatter is not needed — metadata goes in a `export const metadata` export alongside the MDX page. | `export const metadata` in `page.tsx` adjacent to `.mdx` |

---

## Stack Patterns by Variant

**If Contact page = display only (email address + social links, no inline form):**
- No `resend` package needed
- Page is a Server Component with static content — zero new dependencies
- Render contact info with lucide-react icons (already installed)
- This is the recommended approach for v4.1 — validate conversion before adding form complexity

**If Contact page = inline form with email delivery:**
- Add `resend` ^6.9.3
- Use React 19 `useActionState` + `"use server"` action + Zod for validation
- No additional client-side form library needed
- Requires a Resend account + domain verification + `RESEND_API_KEY` in `.env.local`

**If Privacy Policy / Terms need effective dates or dynamic content:**
- Use MDX with a custom React component: `<EffectiveDate date="2026-03-06" />`
- Component renders the date in the correct locale format — no date library needed

**If legal content needs to be edited by a non-developer:**
- Consider Notion + `notion-to-md` or a headless CMS in a future milestone
- For v4.1, git + MDX is the right call (single developer, infrequent edits)

---

## SEO Metadata Approach

No new packages needed. Next.js App Router's built-in `generateMetadata` / `export const metadata` handles all SEO for these pages.

**Pattern for legal pages (Server Components — static at build time):**

```ts
// app/privacy/page.tsx (or adjacent to page.mdx)
export const metadata = {
  title: 'Privacy Policy — Notevra',
  description: 'How Notevra collects, uses, and protects your personal information when you create a personalized AI song gift.',
  robots: { index: true, follow: true },
};
```

**Why `robots: index: true` for legal pages:** Privacy Policy and Terms of Service pages should be indexed. Search engines may surface them for trust signals. They should NOT have `noindex` unless there is a specific legal reason.

**Why no Open Graph image for legal pages:** Legal pages don't benefit from OG images for social sharing. A generic `<meta name="robots">` and a `<link rel="canonical">` (automatically handled by Next.js via `alternates.canonical`) is sufficient.

**Static rendering guarantee:** All three pages (Contact, Privacy, Terms) have no dynamic data. They will pre-render to static HTML at `next build` without any additional configuration because Next.js App Router defaults to static rendering for Server Components with no dynamic data access.

---

## MDX Configuration

```ts
// next.config.ts — add createMDX wrapper
import type { NextConfig } from 'next';
import createMDX from '@next/mdx';

const withMDX = createMDX({
  // Remark/rehype plugins can be added here if needed later
  // e.g., remarkGfm for GitHub-flavored markdown tables
});

const nextConfig: NextConfig = {
  pageExtensions: ['ts', 'tsx', 'md', 'mdx'],
  // existing config...
};

export default withMDX(nextConfig);
```

```tsx
// src/mdx-components.tsx — maps markdown elements to Notevra design system
import type { MDXComponents } from 'mdx/types';

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    h1: ({ children }) => (
      <h1 className="font-display text-3xl font-bold text-foreground mb-6 mt-10">{children}</h1>
    ),
    h2: ({ children }) => (
      <h2 className="font-display text-xl font-bold text-foreground mb-4 mt-8">{children}</h2>
    ),
    h3: ({ children }) => (
      <h3 className="font-sans text-lg font-semibold text-foreground mb-3 mt-6">{children}</h3>
    ),
    p: ({ children }) => (
      <p className="text-muted-foreground leading-relaxed mb-4">{children}</p>
    ),
    a: ({ href, children }) => (
      <a href={href} className="text-primary underline underline-offset-2 hover:text-primary/80">{children}</a>
    ),
    ul: ({ children }) => (
      <ul className="list-disc list-inside text-muted-foreground space-y-1 mb-4 ml-4">{children}</ul>
    ),
    ol: ({ children }) => (
      <ol className="list-decimal list-inside text-muted-foreground space-y-1 mb-4 ml-4">{children}</ol>
    ),
    hr: () => <hr className="border-border/40 my-8" />,
    ...components,
  };
}
```

**Note:** `mdx-components.tsx` must live at the project root or `src/` root, not inside `app/`. Next.js looks for it at `./mdx-components.tsx` or `./src/mdx-components.tsx`.

---

## Installation

```bash
# MDX support for Privacy Policy and Terms of Service pages
npm install @next/mdx @mdx-js/loader @mdx-js/react @types/mdx

# Contact form email delivery (only if adding an inline form — see Stack Patterns)
npm install resend
```

No dev-only dependencies — `@next/mdx` and its peers are needed at build time (not dev-only).

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| `@next/mdx` + local files | Headless CMS (Sanity, Contentful) | When legal content is edited by non-developers with no git access, or when the same legal content must appear across multiple products/brands |
| `@next/mdx` + local files | `next-mdx-remote` | When MDX content is stored in a database or fetched from an API at runtime rather than co-located in the repo |
| Resend for contact form | `mailto:` link | Preferred for v4.1 if the contact page only needs to display info. `mailto:` avoids all email infrastructure until there is a demonstrated need for an inline form. |
| Resend for contact form | Nodemailer + SMTP | When you already have SMTP infrastructure (e.g., existing G Suite domain). Resend is simpler for new projects with no existing mail server. |
| React 19 `useActionState` | `react-hook-form` | When the form has 5+ fields, complex cross-field validation, or multi-step behavior. A 3-field contact form does not justify the bundle addition. |

---

## Version Compatibility

| Package | Version | Compatible With | Notes |
|---------|---------|-----------------|-------|
| `@next/mdx` | 16.1.6 | Next.js 16.1.6 | Version-locked to Next.js — always install the same version as `next`. |
| `@mdx-js/loader` | 3.1.1 | `@next/mdx` 16.x | Peer dependency. MDX v3 required — v2 dropped Next.js App Router support. |
| `@mdx-js/react` | 3.1.1 | `@next/mdx` 16.x, React 19.2.3 | Same MDX v3 family. React 19 compatible. |
| `resend` | 6.9.3 | Next.js 16 Server Actions, React 19 | Uses native fetch internally. Works in Edge runtime and Node.js runtime. |

---

## Sources

- Next.js official MDX guide — https://nextjs.org/docs/app/guides/mdx — App Router MDX setup, `pageExtensions`, `mdx-components.tsx` location (HIGH confidence — official docs, updated February 27, 2026)
- npm registry — `@next/mdx` latest: 16.1.6 (HIGH confidence — live registry)
- npm registry — `@mdx-js/loader` and `@mdx-js/react` latest: 3.1.1 (HIGH confidence — live registry)
- npm registry — `resend` latest: 6.9.3 (HIGH confidence — live registry)
- Resend docs — https://resend.com/docs/send-with-nextjs — Server Actions integration pattern (HIGH confidence — official docs)
- Resend pricing — https://resend.com/blog/new-free-tier — Free tier: 3,000 emails/month, 100/day (MEDIUM confidence — official blog post, date not confirmed current)
- Next.js `generateMetadata` docs — https://nextjs.org/docs/app/api-reference/functions/generate-metadata — `metadata` export, `robots`, `alternates.canonical` (HIGH confidence — official docs)
- Next.js Route Segment Config docs — https://nextjs.org/docs/app/api-reference/file-conventions/route-segment-config — `export const dynamic = 'force-static'` behavior (HIGH confidence — official docs)
- WebSearch — contentlayer maintenance status — multiple community sources confirm lack of active maintenance since 2023 (MEDIUM confidence — consistent across community sources)

---

*Stack research for: Notevra v4.1 — Contact, Privacy Policy, and Terms of Service pages*
*Researched: 2026-03-06*
