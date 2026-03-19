---
phase: quick-14
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/lib/genres.ts
  - src/lib/quiz-types.ts
  - src/app/quiz/_components/Step2GenreVoice.tsx
  - src/components/landing/HomepageChatBox.tsx
  - src/components/landing/HeroSection.tsx
  - src/app/quiz/page.tsx
autonomous: true
requirements: [HOMEPAGE-CHATBOX]
must_haves:
  truths:
    - "User sees a chat-style input box on the homepage with textarea and genre dropdown"
    - "User can type a song idea, pick a genre, and hit Send"
    - "Logged-out user is redirected to /signup?next=/quiz with input cached in localStorage"
    - "Logged-in user is redirected straight to /quiz with input cached in localStorage"
    - "Quiz page reads cached homepage input and pre-fills genre + memories fields"
  artifacts:
    - path: "src/lib/genres.ts"
      provides: "Shared GENRE_OPTIONS array"
      exports: ["GENRE_OPTIONS"]
    - path: "src/components/landing/HomepageChatBox.tsx"
      provides: "Chat-style input component with genre dropdown"
      min_lines: 60
  key_links:
    - from: "src/components/landing/HomepageChatBox.tsx"
      to: "src/lib/genres.ts"
      via: "import GENRE_OPTIONS"
      pattern: "import.*GENRE_OPTIONS.*from.*genres"
    - from: "src/components/landing/HomepageChatBox.tsx"
      to: "localStorage"
      via: "HOMEPAGE_INPUT_KEY write"
      pattern: "localStorage\\.setItem.*HOMEPAGE_INPUT_KEY"
    - from: "src/app/quiz/page.tsx"
      to: "localStorage"
      via: "HOMEPAGE_INPUT_KEY read + remove"
      pattern: "localStorage\\.(getItem|removeItem).*HOMEPAGE_INPUT_KEY"
---

<objective>
Add a chat-style input box to the Notevra homepage that captures a song idea + genre, caches it in localStorage, routes the user to signup (or quiz if logged in), and pre-fills the quiz with that data.

Purpose: Convert homepage visitors into quiz completions by letting them start describing their song idea immediately, reducing friction to the first meaningful action.
Output: HomepageChatBox component integrated into HeroSection, quiz page reads and consumes cached input.
</objective>

<execution_context>
@/Users/deeg/.claude/get-shit-done/workflows/execute-plan.md
@/Users/deeg/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@src/lib/quiz-types.ts
@src/app/quiz/_components/Step2GenreVoice.tsx
@src/components/landing/HeroSection.tsx
@src/app/quiz/page.tsx
@src/lib/supabase/client.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Extract genres to shared module + add homepage input constant</name>
  <files>src/lib/genres.ts, src/lib/quiz-types.ts, src/app/quiz/_components/Step2GenreVoice.tsx</files>
  <action>
1. Create `src/lib/genres.ts`:
   - Export the `GenreOption` type: `{ id: string; label: string; mood: string }`
   - Export the `GENRE_OPTIONS` array (copy from Step2GenreVoice.tsx — all 7 genres: Pop, R&B / Soul, Folk / Acoustic, Rock, Hip-Hop, Classical, Country)

2. Update `src/app/quiz/_components/Step2GenreVoice.tsx`:
   - Remove the local `GENRE_OPTIONS` constant and its type annotation
   - Add `import { GENRE_OPTIONS } from '@/lib/genres'` at top
   - Everything else stays the same

3. Add to `src/lib/quiz-types.ts` (append after INITIAL_QUIZ_DATA):
   - `export const HOMEPAGE_INPUT_KEY = 'notevra_homepage_input';`
   - `export interface HomepageInput { prompt: string; genre: string; }`
  </action>
  <verify>
    <automated>cd /Users/deeg/Documents/GitHub/MusicGenerator && npx tsc --noEmit 2>&1 | head -30</automated>
  </verify>
  <done>GENRE_OPTIONS exported from src/lib/genres.ts, Step2GenreVoice imports from there, HOMEPAGE_INPUT_KEY and HomepageInput type exported from quiz-types.ts, TypeScript compiles clean.</done>
</task>

<task type="auto">
  <name>Task 2: Create HomepageChatBox component and integrate into HeroSection</name>
  <files>src/components/landing/HomepageChatBox.tsx, src/components/landing/HeroSection.tsx</files>
  <action>
1. Create `src/components/landing/HomepageChatBox.tsx` as a `'use client'` component:
   - Imports: `useState, useRef` from react, `useRouter` from next/navigation, `createClient` from `@/lib/supabase/client`, `GENRE_OPTIONS` from `@/lib/genres`, `HOMEPAGE_INPUT_KEY` and `HomepageInput` from `@/lib/quiz-types`, `ChevronDown, Send` from lucide-react
   - State: `prompt` (string), `genre` (string, default empty = "Genre"), `dropdownOpen` (boolean), `error` (string | null)
   - Layout: a centered card (max-w-xl, white bg `bg-white`, rounded-2xl, shadow-medium, p-4) containing:
     a. Textarea: 3 rows, resize-none, border-none, focus:ring-0, placeholder "What do you want this song to be about...", text-foreground, font body (DM Sans inherits)
     b. Bottom bar (flex items-center justify-between, pt-2, border-t border-gray-100):
        - Left side: Genre dropdown button — shows selected genre label or "Genre" if none selected, with ChevronDown icon. On click toggles `dropdownOpen`. When open, render an absolutely-positioned dropdown (bg-white, rounded-xl, shadow-elevated, py-1, z-50, bottom-full mb-1) with each genre as a button showing label + mood subtitle. Clicking a genre sets `genre` state and closes dropdown.
        - Right side: Send button — circular (w-10 h-10), bg-primary (#6ba3c9 via Tailwind `bg-primary`), text-white, flex items-center justify-center, rounded-full, hover:bg-primary/90. Contains Send icon (h-4 w-4).
   - Close dropdown when clicking outside: useRef on dropdown container, useEffect with mousedown listener.
   - On Send click:
     a. If `prompt.trim()` is empty, set error to "Tell us about your song idea" and return
     b. Clear error
     c. Save to localStorage: `localStorage.setItem(HOMEPAGE_INPUT_KEY, JSON.stringify({ prompt: prompt.trim(), genre } as HomepageInput))`
     d. Check auth: `const supabase = createClient(); const { data: { user } } = await supabase.auth.getUser();`
     e. If user exists: `router.push('/quiz')`
     f. If no user: `router.push('/signup?next=/quiz')`
   - Error display: if error is set, show a small `text-red-500 text-sm` message below textarea

2. Update `src/components/landing/HeroSection.tsx`:
   - Add `import { HomepageChatBox } from './HomepageChatBox'`
   - In the Left Column (`flex flex-col gap-6`), insert `<HomepageChatBox />` after the heading (h1) and before the video player div
   - Keep everything else as-is (video, description, CTA, social proof all remain)
  </action>
  <verify>
    <automated>cd /Users/deeg/Documents/GitHub/MusicGenerator && npx tsc --noEmit 2>&1 | head -30</automated>
  </verify>
  <done>HomepageChatBox renders on homepage below heading with textarea, genre dropdown, and send button. Send caches input and routes to /signup?next=/quiz (logged out) or /quiz (logged in).</done>
</task>

<task type="auto">
  <name>Task 3: Quiz page reads and consumes homepage input on mount</name>
  <files>src/app/quiz/page.tsx</files>
  <action>
1. Add import: `import { HOMEPAGE_INPUT_KEY, type HomepageInput } from '@/lib/quiz-types'`

2. In the existing first useEffect (the one that reads `QUIZ_STORAGE_KEY` on mount, lines 86-99), add AFTER the existing localStorage restore block (inside the same useEffect, after the try/catch):
   ```
   try {
     const homepageRaw = localStorage.getItem(HOMEPAGE_INPUT_KEY);
     if (homepageRaw) {
       const homepageInput = JSON.parse(homepageRaw) as HomepageInput;
       localStorage.removeItem(HOMEPAGE_INPUT_KEY); // consume once
       setData((prev) => ({
         ...prev,
         ...(homepageInput.genre && !prev.genre ? { genre: homepageInput.genre } : {}),
         ...(homepageInput.prompt && !prev.memories ? { memories: homepageInput.prompt } : {}),
       }));
     }
   } catch {
     // Ignore corrupt homepage input
   }
   ```

Key behaviors:
- Only sets genre if homepage input has a genre AND existing data.genre is empty
- Only sets memories if homepage input has a prompt AND existing data.memories is empty
- Removes HOMEPAGE_INPUT_KEY immediately so it's consumed once
- Runs AFTER quiz restore so it doesn't override user's in-progress quiz data
- Uses functional setData to get latest state from the quiz restore that ran just before
  </action>
  <verify>
    <automated>cd /Users/deeg/Documents/GitHub/MusicGenerator && npx tsc --noEmit 2>&1 | head -30</automated>
  </verify>
  <done>Quiz page reads HOMEPAGE_INPUT_KEY from localStorage on mount, pre-fills genre and memories if they were empty, removes the key so it's consumed once. Does not override existing non-empty quiz values.</done>
</task>

</tasks>

<verification>
1. TypeScript compiles: `npx tsc --noEmit` passes
2. Dev server runs: `npm run dev` starts without errors
3. Manual smoke test: Visit homepage, see chat box below heading, type a prompt, pick a genre, click Send — redirects to /signup?next=/quiz (logged out) or /quiz (logged in) with localStorage key set
</verification>

<success_criteria>
- GENRE_OPTIONS shared between homepage chat box and quiz Step 2 (single source of truth)
- Chat box visible on homepage with textarea, genre dropdown, send button
- Send validates non-empty prompt, caches {prompt, genre} in localStorage, routes appropriately based on auth
- Quiz page reads cached input on mount, pre-fills genre + memories, consumes the key
- All existing quiz functionality unchanged (localStorage restore, step navigation, generation)
</success_criteria>

<output>
After completion, create `.planning/quick/14-homepage-chat-box-with-genre-dropdown-si/14-SUMMARY.md`
</output>
