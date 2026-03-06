# Phase 9: Foundation Fixes + Navigation - Context

**Gathered:** 2026-03-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Resolve known bugs that would compound under v2.0 complexity and wire the sidebar Library link to a real /library route. Specifically: fix GenerationPage useEffect leak (FIX-01), install GSAP dependencies (FIX-02), create centralized gsap-config.ts (FIX-03), and make Library link navigate to /library with active state (LIB2-01).

</domain>

<decisions>
## Implementation Decisions

### Bug Fixes (from roadmap)
- FIX-01: Add missing `[]` dependency array to navigate-create useEffect in GenerationPage.tsx:139
- FIX-02: Install gsap + @gsap/react to package.json
- FIX-03: Create src/lib/gsap-config.ts with "use client" directive, register ScrambleTextPlugin, all future animation files import from it

### Sidebar Active State
- Left border indicator: 2-3px left border in primary/amber color on the active nav item (Spotify/Suno pattern)
- Active state determined by usePathname matching the nav item's href

### Library Stub Page
- Branded empty state: centered illustration area + "Your library is empty" message + "Create your first song" CTA button linking to create
- Build this reusably so Phase 10 can use it as the actual empty state

### GSAP Config Export Pattern
- Claude's discretion — pick whatever is cleanest for the codebase

</decisions>

<specifics>
## Specific Ideas

No specific requirements — phase is fully prescriptive from roadmap success criteria.

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `Sidebar.tsx`: Already has NavLink component with hover styling (hover:bg-accent/10), can extend for active state
- `usePathname` from next/navigation: Already imported in GenerationPage.tsx, established pattern

### Established Patterns
- Sidebar nav items defined as NAV_ITEMS array with { label, href, icon } shape
- "Create" nav item has special onClick handler (handleCreateNav) — Library will need similar special handling or just a real href
- Framer Motion AnimatePresence used throughout sidebar for expand/collapse

### Integration Points
- GenerationPage.tsx:139 — useEffect with no dependency array (the bug)
- Sidebar.tsx:12 — Library href is '#' (dead link)
- No gsap in package.json yet
- No src/app/library/ route exists yet
- No src/lib/gsap-config.ts exists yet

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 09-foundation-fixes-navigation*
*Context gathered: 2026-03-05*
