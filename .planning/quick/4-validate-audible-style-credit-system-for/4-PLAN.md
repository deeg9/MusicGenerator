---
phase: quick-4
plan: 01
type: execute
wave: 1
depends_on: []
files_modified: []
autonomous: true
requirements: [VALIDATE-CREDIT-SYSTEM]

must_haves:
  truths:
    - "Credit decrement is fully removed from the generation flow"
    - "unlockSong handles unlimited, insufficient, and atomic decrement correctly"
    - "Poll response includes unlockedAt for already-unlocked songs"
    - "Success page auto-unlocks for unlimited tier users"
    - "UnlockModal renders all 3 states: has-credits, no-credits, no-subscription"
    - "PreviewPaywall and SubscribeToDownload delegate to parent via props, not Stripe directly"
    - "Build compiles successfully"
    - "Migration 0002 adds unlocked_at column"
  artifacts: []
  key_links: []
---

<objective>
Validate that the Audible-style credit system was implemented correctly across all 9 files.

Purpose: Confirm correctness, catch race conditions, missing error handling, or broken imports before shipping.
Output: Validation report with pass/fail per file and any issues found.
</objective>

<execution_context>
@/Users/deeg/.claude/get-shit-done/workflows/execute-plan.md
@/Users/deeg/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Validate all 9 files against credit system spec</name>
  <files></files>
  <action>
Read and validate each of the 9 files. For each file, check the specific requirements below and report PASS/FAIL with details.

**1. src/db/schema.ts**
- PASS if: `unlockedAt` column exists as `timestamp('unlocked_at', { withTimezone: true })` on songs table
- FAIL if: column missing, wrong type, or wrong name

**2. src/app/api/quiz-generate/route.ts**
- PASS if: No imports of `getUserSubscription` or `decrementSongCredit` from subscription.ts. No step 8 credit decrement block. Generation is free for everyone.
- FAIL if: Any credit check or decrement logic remains in this file

**3. src/lib/subscription.ts**
- PASS if: `unlockSong(userId, songId)` function exported with:
  - Checks subscription existence and active status
  - Unlimited tier (songsPerMonth === -1) unlocks without decrement
  - Insufficient credits returns error with subscription metadata
  - Atomic credit decrement uses SQL `GREATEST(songsRemaining - 1, 0)` with `songsRemaining > 0` WHERE guard
  - Sets `unlockedAt` on the song row with userId ownership check
- ISSUE to flag: The credit decrement and song unlock are TWO separate awaited queries, not wrapped in a real DB transaction. This means if the process crashes between decrement and unlock, the credit is spent but song stays locked. Flag this as a known race condition but not a blocker for shipping (low probability, recoverable manually).

**4. src/app/api/songs/[songId]/unlock/route.ts**
- PASS if: POST handler with auth check (getUser), ownership check (song belongs to user), idempotent unlock (returns success if already unlocked), delegates to unlockSong()
- FAIL if: missing auth, missing ownership check, not idempotent, or handles credits directly

**5. src/app/api/poll-job/[jobId]/route.ts**
- PASS if: COMPLETED responses include `unlockedAt` field (both fast-path DB check and RunPod completion path)
- FAIL if: unlockedAt missing from either path

**6. src/app/quiz/success/[jobId]/page.tsx**
- PASS if:
  - Imports UnlockModal and CreditState type
  - Poll response checks `data.unlockedAt` to skip preview for already-unlocked songs
  - Auto-unlock effect for unlimited tier (checks songsPerMonth === -1, calls unlock API)
  - handleUnlockClick fetches subscription/check, routes to login for anon users, shows modal with correct credit state
  - handleModalConfirm calls unlock API and handles insufficient_credits race
- FAIL if: any of the above missing

**7. src/app/quiz/success/[jobId]/_components/PreviewPaywall.tsx**
- PASS if: PreviewCTA accepts `onUnlockClick` and `loading` props, calls onUnlockClick on button click (no direct Stripe/pricing redirect)
- FAIL if: contains Stripe checkout logic or direct href to /pricing on the unlock button

**8. src/app/quiz/success/[jobId]/_components/SubscribeToDownload.tsx**
- PASS if: Accepts `onUnlockClick` and `loading` props, calls onUnlockClick (no direct Stripe logic)
- FAIL if: contains Stripe checkout or pricing redirect

**9. src/app/quiz/success/[jobId]/_components/UnlockModal.tsx**
- PASS if: Exports CreditState type with 3 variants (has-credits, no-credits, no-subscription). Modal renders all 3 states. has-credits shows credit count + progress bar + confirm button. no-credits shows renewal date + upgrade link. no-subscription shows subscribe CTA. Modal has close button + Escape key handler + overlay click to close.
- FAIL if: missing any state, missing accessibility features

**Additional checks:**
- Migration file `drizzle/0002_bizarre_cannonball.sql` adds `unlocked_at` column
- Run `npx next build` (or confirm it was already run) to verify compilation
- Check for any TypeScript errors in the modified files via `npx tsc --noEmit`

Report findings as a structured table.
  </action>
  <verify>
    <automated>cd /Users/deeg/Documents/GitHub/MusicGenerator && npx tsc --noEmit 2>&1 | head -30</automated>
  </verify>
  <done>All 9 files validated with PASS/FAIL status. Any race conditions or edge cases documented. TypeScript compilation confirmed clean.</done>
</task>

</tasks>

<verification>
- All 9 files checked against spec
- No stale imports from removed credit decrement
- Build compiles without errors
- Race conditions documented (not necessarily fixed — validation only)
</verification>

<success_criteria>
- Structured validation report produced for all 9 files
- TypeScript compilation passes
- Any issues categorized as blocker vs non-blocker
</success_criteria>

<output>
After completion, create `.planning/quick/4-validate-audible-style-credit-system-for/4-SUMMARY.md`
</output>
