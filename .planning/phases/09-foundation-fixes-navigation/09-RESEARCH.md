# Phase 9: Foundation Fixes + Navigation - Research

**Researched:** 2026-03-05
**Domain:** React hooks correctness, GSAP setup, Next.js App Router navigation, Tailwind v4 active states
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- FIX-01: Add missing `[]` dependency array to navigate-create useEffect in GenerationPage.tsx:139
- FIX-02: Install gsap + @gsap/react to package.json
- FIX-03: Create src/lib/gsap-config.ts with "use client" directive, register ScrambleTextPlugin, all future animation files import from it
- Active state visual: 2-3px left border in primary/amber color on the active nav item (Spotify/Suno pattern)
- Active state determined by usePathname matching the nav item's href
- Library stub page: branded empty state — centered illustration area + "Your library is empty" message + "Create your first song" CTA button linking to create
- Build stub reusably so Phase 10 can use it as the actual empty state

### Claude's Discretion

- GSAP config export pattern — pick whatever is cleanest for the codebase

### Deferred Ideas (OUT OF SCOPE)

- None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| FIX-01 | Fix GenerationPage useEffect missing dependency array (performance leak) | Confirmed bug at line 139; empty `[]` dep array is the correct fix per React strict mode rules |
| FIX-02 | Install gsap + @gsap/react dependencies | gsap@3.14.2 and @gsap/react@2.1.2 are current stable versions on npm |
| FIX-03 | Create centralized gsap-config.ts with "use client" boundary | GSAP requires browser globals; "use client" + module singleton pattern documented below |
| LIB2-01 | User can navigate to /library page from the sidebar | Next.js App Router route at src/app/library/page.tsx; Sidebar NavLink needs `usePathname` + `href` comparison |
</phase_requirements>

---

## Summary

Phase 9 is four discrete, low-complexity tasks with no cross-task dependencies. The work is all within existing files except for two new files (gsap-config.ts and the /library route). Every task has a clear, verifiable success criterion.

The most important discipline here is understanding that the useEffect bug at GenerationPage.tsx:139 is a React strict-mode leak: without a `[]` dependency array, the effect re-runs on every render, stacking up `window.addEventListener` calls for `navigate-create` without any cleanup between renders. Adding `[]` makes the effect run once on mount and the cleanup function runs once on unmount — exactly the behavior intended.

The GSAP install is straightforward: both packages exist on npm under their standard names. ScrambleTextPlugin is included in the gsap package itself (no separate install) and is free since Webflow's 2024 acquisition. The centralized config file prevents the "GSAP not initialized" class of bug where plugins are called before `gsap.registerPlugin()` runs, which would otherwise cause silent failures.

**Primary recommendation:** Complete the four tasks in order (FIX-01, FIX-02, FIX-03, LIB2-01), each as a focused, atomic change. No task requires another to be done first.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| gsap | 3.14.2 | Animation engine; ScrambleTextPlugin for library card effects in Phase 11 | Industry standard; free since Webflow acquisition 2024 |
| @gsap/react | 2.1.2 | React hooks (useGSAP) for scope-safe animation cleanup | Official GSAP-provided React integration; prevents stale ref leaks |
| next/navigation | (Next.js 16.1.6 built-in) | usePathname, useRouter for sidebar active state | App Router pattern; already imported in GenerationPage.tsx |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| gsap.ScrambleTextPlugin | (bundled in gsap) | Text scramble animation on library card hover | Phase 11; registered in gsap-config.ts |

**Installation:**
```bash
npm install gsap @gsap/react
```

---

## Architecture Patterns

### File Locations
```
src/
├── app/
│   └── library/
│       └── page.tsx          # New: /library route (LIB2-01)
├── lib/
│   └── gsap-config.ts        # New: centralized GSAP setup (FIX-03)
└── components/
    └── layout/
        └── Sidebar.tsx       # Modified: active state + Library href (LIB2-01)
src/components/
    └── GenerationPage.tsx    # Modified: add [] to useEffect (FIX-01)
```

### Pattern 1: useEffect with Stable Event Listener (FIX-01)

**What:** A window event listener that only needs to be registered once — on mount — with cleanup on unmount.

**The bug:** Line 139 of GenerationPage.tsx has `useEffect(() => { ... })` with no dependency array. Without `[]`, React re-runs the effect after every render. The cleanup function removes the old listener but a new one is immediately added each render cycle, causing multiple registrations to stack up in practice under React 18+ concurrent features and strict mode double-invocation.

**The fix:**
```typescript
// Source: GenerationPage.tsx:139 — add [] dependency array
useEffect(() => {
  function onNavigateCreate() {
    if (phase !== 'idle') {
      handleNewGeneration();
    }
  }
  window.addEventListener('navigate-create', onNavigateCreate);
  return () => window.removeEventListener('navigate-create', onNavigateCreate);
}, []); // <-- add this
```

**Note on the fix:** Adding `[]` means `phase` and `handleNewGeneration` are captured at mount time (stale closure). Since `handleNewGeneration` is defined inside the component and calls `setPhase` (a stable setter), this is fine — `setPhase` is stable across renders. The `phase` closure staleness is acceptable because the handler only fires on explicit user navigation events, not in a polling loop.

If the stale closure on `phase` is a concern, an alternative is to use a ref:
```typescript
const phaseRef = useRef(phase);
useEffect(() => { phaseRef.current = phase; }, [phase]);

useEffect(() => {
  function onNavigateCreate() {
    if (phaseRef.current !== 'idle') {
      handleNewGeneration();
    }
  }
  window.addEventListener('navigate-create', onNavigateCreate);
  return () => window.removeEventListener('navigate-create', onNavigateCreate);
}, []); // stable ref, no stale closure
```

The ref pattern is cleaner and more correct. Either approach resolves the duplicate listener bug.

### Pattern 2: Centralized GSAP Config Module (FIX-03)

**What:** A single module-level file that imports gsap, registers all plugins once, and re-exports gsap. All animation files in the project import from this file instead of directly from 'gsap'.

**Why:** `gsap.registerPlugin()` must be called before any plugin method is invoked. If two files both `import gsap from 'gsap'` and call `registerPlugin`, the behavior is harmless but redundant. More importantly, if any file imports ScrambleTextPlugin directly without registering it, animations silently fail. A central config eliminates this class of bug.

**GSAP config export pattern (Claude's discretion — recommendation: re-export gsap):**
```typescript
// Source: src/lib/gsap-config.ts
'use client';

import gsap from 'gsap';
import { ScrambleTextPlugin } from 'gsap/ScrambleTextPlugin';

gsap.registerPlugin(ScrambleTextPlugin);

export { gsap };
export { ScrambleTextPlugin };
```

Animation files that need gsap import from here:
```typescript
// Any future animation file
import { gsap } from '@/lib/gsap-config';
```

**Why re-export rather than side-effect import:** A side-effect-only import (`import '@/lib/gsap-config'`) would register plugins but force consumers to also import gsap separately. Re-exporting gives consumers a single import source and ensures the registration side-effect always runs before gsap is used.

**"use client" is mandatory:** GSAP manipulates the DOM and references `window`. Without "use client", Next.js server rendering will throw `ReferenceError: window is not defined` on the server.

### Pattern 3: Sidebar Active State with usePathname (LIB2-01)

**What:** The NavLink component in Sidebar.tsx compares `usePathname()` against the nav item's `href`. When they match, apply active styling: a left border indicator (2-3px, primary/amber color) and active text color.

**Current state:** Sidebar is a Client Component ("use client" at line 1). `usePathname` is already in the project (used in GenerationPage.tsx). NavLink is an inner function component inside Sidebar.tsx.

**Implementation approach:** Pass `pathname` down from the Sidebar parent or call `usePathname` inside NavLink. Since NavLink is already a separate function component (not a hook), it can call `usePathname` directly:

```typescript
// Source: src/components/layout/Sidebar.tsx
import { usePathname } from 'next/navigation';

function NavLink({ href, icon: Icon, label, isOpen, onClick }: {
  href: string;
  icon: typeof House;
  label: string;
  isOpen: boolean;
  onClick?: (e: React.MouseEvent) => void;
}) {
  const pathname = usePathname();
  const isActive = pathname === href;

  return (
    <a
      href={href}
      onClick={onClick}
      className={[
        'flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors',
        isActive
          ? 'border-l-2 border-primary text-foreground bg-accent/10 pl-[10px]'
          : 'text-muted-foreground hover:bg-accent/10 hover:text-foreground',
      ].join(' ')}
    >
      <Icon className="h-5 w-5 flex-shrink-0" />
      {/* ... AnimatePresence label */}
    </a>
  );
}
```

**Border width note:** A 2px left border with `border-l-2` requires compensating the padding to avoid layout shift. `pl-3` is `12px`; with `border-l-2` (2px), reduce to `pl-[10px]` to keep icon position stable. Alternatively use `border-l-[3px]` (3px) and `pl-[9px]`.

**href values to update in NAV_ITEMS:**
- `Library`: change from `'#'` to `'/library'`
- `Home`: change from `'#home'` to `'/'` (so active state works on /library vs home)
- `Search`: remains `'#'` (not a real route in this phase — do not add active logic for it)
- `Create`: remains special onClick handler (no href change needed for this phase)

**pathname matching edge cases:**
- `/library` matches exactly `pathname === '/library'` — simple string equality is correct
- `/` (home) matches `pathname === '/'` — works correctly
- Sub-routes like `/library/123` would not match `/library` with exact equality. Not a concern for this phase; Phase 10 can use `pathname.startsWith('/library')` if needed.

### Pattern 4: /library Stub Route (LIB2-01)

**What:** A new Next.js App Router route at `src/app/library/page.tsx`. Contains a branded empty state that Phase 10 will populate with actual song cards.

**Route file pattern (App Router):**
```typescript
// Source: src/app/library/page.tsx
export default function LibraryPage() {
  return (
    <div className="flex min-h-full flex-col items-center justify-center px-4 py-16">
      {/* Illustration area — placeholder for Phase 10 */}
      <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-accent/10">
        <Library className="h-10 w-10 text-accent" />
      </div>
      <h2 className="mb-2 font-display text-2xl font-bold text-foreground">
        Your library is empty
      </h2>
      <p className="mb-8 text-center text-sm text-muted-foreground">
        Songs you generate will appear here.
      </p>
      <a
        href="/"
        className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
      >
        Create your first song
      </a>
    </div>
  );
}
```

**No "use client" needed** for the stub — it's static markup. Phase 10 will add "use client" when data fetching is introduced.

**Metadata:** Can add `export const metadata` for the page title. Not required for success criteria but good practice.

### Anti-Patterns to Avoid

- **Calling `gsap.registerPlugin()` in multiple files:** Even if idempotent, it signals the centralized config is not being used. All animation code must import from `@/lib/gsap-config`.
- **Using `<Link>` from next/link for the Library nav item when NavLink uses `<a>`:** Keep consistency — NavLink uses `<a>`. Phase 10 can upgrade to `<Link>` for prefetching if desired; premature optimization here.
- **Adding active state to Create nav item:** Create fires a custom event (no href), so `pathname` matching does not apply. Leave Create's styling as-is.
- **Importing gsap directly in future animation files:** Any file that does `import gsap from 'gsap'` (not from `@/lib/gsap-config`) bypasses registration. This is the primary pitfall the config file prevents.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Plugin registration | Custom plugin registration system | gsap.registerPlugin() in gsap-config.ts | GSAP's built-in mechanism handles deduplication |
| Active route detection | Manual URL parsing | usePathname() from next/navigation | Built-in, SSR-safe, reactive to navigation |
| Animation cleanup | Manual cleanup in useEffect | useGSAP() from @gsap/react | Handles scope, context reversion, and cleanup automatically |

---

## Common Pitfalls

### Pitfall 1: gsap-config "use client" Missing
**What goes wrong:** Server renders the page, hits GSAP's `window` reference, throws `ReferenceError`.
**Why it happens:** GSAP is browser-only; Next.js server-renders all components by default.
**How to avoid:** First line of gsap-config.ts must be `'use client';`.
**Warning signs:** Build succeeds but server startup logs show `ReferenceError: window is not defined`.

### Pitfall 2: NavLink Called Without Pathname Being Available
**What goes wrong:** `usePathname()` called outside a Client Component tree throws.
**Why it happens:** Sidebar.tsx already has `'use client'` at the top, so NavLink inherits the client boundary. This pitfall only matters if someone extracts NavLink to a separate file without "use client".
**How to avoid:** NavLink stays inside Sidebar.tsx or in a file with its own "use client" directive.
**Warning signs:** TypeScript error or runtime error about hooks being called outside a React component.

### Pitfall 3: Border-L Layout Shift
**What goes wrong:** Adding `border-l-2` to an active nav item shifts the icon position rightward by 2px, causing a visible jump when navigating.
**Why it happens:** The border adds to the box model width.
**How to avoid:** Compensate with reduced left padding. With `px-3` (12px) normally, use `pl-[10px]` (10px left padding) when `border-l-2` (2px) is active to keep icon in the same position.
**Warning signs:** Icon visibly shifts 2px right when the route becomes active.

### Pitfall 4: Stale Closure in Fixed useEffect
**What goes wrong:** After adding `[]` to the navigate-create useEffect, `phase` inside `onNavigateCreate` is always the initial value (`'idle'`).
**Why it happens:** Closures in `useEffect` with `[]` capture values at mount time.
**How to avoid:** Use a `useRef` for `phase` that is kept current in a separate `useEffect([phase])`. The navigate-create handler reads `phaseRef.current` instead of `phase`.
**Warning signs:** Clicking the sidebar "Create" button after a song generates does nothing (because `phase !== 'idle'` check uses stale `'idle'` value).

### Pitfall 5: GSAP ScrambleTextPlugin Not in Free Tier
**What goes wrong:** Developer assumes ScrambleTextPlugin requires a paid license.
**Why it happens:** Historical knowledge — ScrambleTextPlugin was premium before Webflow's 2024 acquisition.
**How to avoid:** It is free. Import from `'gsap/ScrambleTextPlugin'` — no license key needed.
**Warning signs:** N/A — this is a non-issue confirmed by STATE.md decision log.

---

## Code Examples

### FIX-01: Corrected useEffect with ref pattern
```typescript
// src/components/GenerationPage.tsx — replace lines 139-147
const phaseRef = useRef(phase);
useEffect(() => { phaseRef.current = phase; }, [phase]);

useEffect(() => {
  function onNavigateCreate() {
    if (phaseRef.current !== 'idle') {
      handleNewGeneration();
    }
  }
  window.addEventListener('navigate-create', onNavigateCreate);
  return () => window.removeEventListener('navigate-create', onNavigateCreate);
}, []); // stable — no stale closure on phase
```

### FIX-02: Install command
```bash
npm install gsap @gsap/react
```

### FIX-03: gsap-config.ts
```typescript
// src/lib/gsap-config.ts
'use client';

import gsap from 'gsap';
import { ScrambleTextPlugin } from 'gsap/ScrambleTextPlugin';

gsap.registerPlugin(ScrambleTextPlugin);

export { gsap };
export { ScrambleTextPlugin };
```

### LIB2-01: Updated NAV_ITEMS in Sidebar.tsx
```typescript
const NAV_ITEMS = [
  { label: 'Home', href: '/', icon: House },
  { label: 'Create', href: '#create', icon: Music },
  { label: 'Library', href: '/library', icon: Library },
  { label: 'Search', href: '#', icon: Search },
];
```

### LIB2-01: NavLink with active state
```typescript
function NavLink({ href, icon: Icon, label, isOpen, onClick }: {
  href: string;
  icon: typeof House;
  label: string;
  isOpen: boolean;
  onClick?: (e: React.MouseEvent) => void;
}) {
  const pathname = usePathname();
  const isActive = href !== '#' && href !== '#create' && pathname === href;

  return (
    <a
      href={href}
      onClick={onClick}
      className={[
        'flex items-center gap-3 rounded-lg py-2.5 transition-colors',
        isActive
          ? 'border-l-[3px] border-primary bg-accent/10 pl-[9px] pr-3 text-foreground'
          : 'px-3 text-muted-foreground hover:bg-accent/10 hover:text-foreground',
      ].join(' ')}
    >
      <Icon className="h-5 w-5 flex-shrink-0" />
      <AnimatePresence>
        {isOpen && (
          <motion.span
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: 'auto' }}
            exit={{ opacity: 0, width: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden whitespace-nowrap text-sm font-medium"
          >
            {label}
          </motion.span>
        )}
      </AnimatePresence>
    </a>
  );
}
```

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.0.18 + @testing-library/react 16.3.2 |
| Config file | `/Users/deeg/Documents/GitHub/MusicGenerator/vitest.config.ts` |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FIX-01 | navigate-create listener registered exactly once; cleanup on unmount | unit | `npx vitest run src/components/GenerationPage.test.tsx -t "navigate-create"` | ❌ Wave 0 (no GenerationPage.test.tsx exists yet) |
| FIX-02 | gsap + @gsap/react in node_modules; dev server starts without module errors | smoke | `node -e "require('gsap')"` after install | ❌ Wave 0 (install first) |
| FIX-03 | gsap-config.ts exports gsap; ScrambleTextPlugin registered before any animation | unit | `npx vitest run src/lib/gsap-config.test.ts` | ❌ Wave 0 |
| LIB2-01 | /library renders; Library nav item shows active border on /library | unit/smoke | `npx vitest run src/app/library/page.test.tsx` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run --reporter=verbose`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/components/GenerationPage.test.tsx` — test that navigate-create listener is added once and cleaned up; covers FIX-01
- [ ] `src/lib/gsap-config.test.ts` — test that gsap-config exports gsap and ScrambleTextPlugin is registered; covers FIX-03
- [ ] `src/app/library/page.test.tsx` — test that LibraryPage renders empty state text and CTA link; covers LIB2-01
- [ ] FIX-02 can be validated by `node -e "require('gsap')"` — no test file needed, but include in plan verification steps

---

## Open Questions

1. **handleNewGeneration stale closure after adding [] to FIX-01**
   - What we know: `handleNewGeneration` calls `setPhase`, `setJobId`, `setEnhancedCaption`, `setErrorMessage` (all stable setters), and `router.replace` (stable from useRouter). `searchParams` and `pathname` inside `handleNewGeneration` may be stale.
   - What's unclear: Whether stale `searchParams` inside `handleNewGeneration` causes a problem when the user navigates. In practice, the navigate-create event fires from sidebar click → the user wants to start a new song — stale searchParams would attempt to delete a stale `job` param which is benign.
   - Recommendation: Use the phaseRef pattern for the `phase` check (the part that matters). The stale `searchParams` issue is benign and doesn't need addressing in this phase.

2. **Mobile sidebar: Library link active state**
   - What we know: The mobile overlay sidebar in Sidebar.tsx renders nav items with inline `<a>` tags (lines 159-172), not using the NavLink component. These will need the same active state treatment.
   - What's unclear: Whether the user expects mobile active state in this phase.
   - Recommendation: Apply active state to mobile nav items as well, for consistency. The same `usePathname` + className logic applies.

---

## Sources

### Primary (HIGH confidence)
- Direct code inspection: `src/components/GenerationPage.tsx` lines 139-147 — confirmed missing `[]`
- Direct code inspection: `src/components/layout/Sidebar.tsx` lines 9-14 — confirmed Library href is `'#'`
- Direct code inspection: `package.json` — confirmed gsap and @gsap/react absent from dependencies
- npm registry: `npm show gsap version` → 3.14.2; `npm show @gsap/react version` → 2.1.2
- React docs (training data, HIGH confidence): useEffect with no dependency array runs after every render

### Secondary (MEDIUM confidence)
- GSAP free tier post-Webflow acquisition: confirmed in project STATE.md decision log (2026-03-05)
- Next.js App Router usePathname: confirmed in use at GenerationPage.tsx line 23 (project already uses it)

### Tertiary (LOW confidence)
- None

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — versions from npm registry directly; GSAP license confirmed in STATE.md
- Architecture: HIGH — all patterns derived from direct code inspection of existing files
- Pitfalls: HIGH — useEffect bug directly observed in source; other pitfalls from direct pattern analysis

**Research date:** 2026-03-05
**Valid until:** 2026-04-05 (stable APIs; GSAP 3.x, Next.js 16.x, React 19.x)
