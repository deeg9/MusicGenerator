---
phase: quick-task
plan: 2
type: execute
wave: 1
depends_on: []
files_modified:
  - src/db/schema.ts
  - src/app/api/poll-job/[jobId]/route.ts
  - src/app/api/poll-job/[jobId]/route.test.ts
autonomous: true
requirements: [EMAIL-AUTO-NOTIFY]

must_haves:
  truths:
    - "Authenticated creator receives an email when their song finishes generating"
    - "Email is sent exactly once per song, even if poll-job is called multiple times after completion"
    - "Anonymous songs do not trigger creator emails (no userId = no email)"
  artifacts:
    - path: "src/db/schema.ts"
      provides: "creatorEmailSentAt column on songs table"
      contains: "creatorEmailSentAt"
    - path: "src/app/api/poll-job/[jobId]/route.ts"
      provides: "Auto-send creator email after finalization"
      contains: "send-creator-email"
  key_links:
    - from: "src/app/api/poll-job/[jobId]/route.ts"
      to: "/api/send-creator-email"
      via: "internal fetch after finalizeSong succeeds"
      pattern: "send-creator-email"
---

<objective>
Automatically send the creator a "song ready" email when their song finishes generating, triggered from the poll-job finalization flow.

Purpose: Currently the send-creator-email endpoint exists but is never called. Users who close the browser during generation never learn their song is ready. This wires automatic notification into the finalization pipeline.

Output: Poll-job triggers creator email on first COMPLETED finalization for authenticated users. Idempotent via creatorEmailSentAt column.
</objective>

<execution_context>
@/Users/deeg/.claude/get-shit-done/workflows/execute-plan.md
@/Users/deeg/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@src/db/schema.ts
@src/app/api/poll-job/[jobId]/route.ts
@src/app/api/send-creator-email/route.ts
@src/emails/SongReadyEmail.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add creatorEmailSentAt column and apply migration</name>
  <files>src/db/schema.ts</files>
  <action>
Add a `creatorEmailSentAt` timestamp column to the `songs` table in schema.ts:

```
creatorEmailSentAt: timestamp('creator_email_sent_at', { withTimezone: true }),
```

Place it after the `failedAt` field in the timing section. It defaults to null (no email sent yet).

After updating the schema file, apply the migration to Supabase. Since drizzle-kit push has been problematic with Supabase CHECK constraints (see Phase 29-01 decision), apply via raw SQL in the Supabase SQL Editor if push fails:

```sql
ALTER TABLE songs ADD COLUMN creator_email_sent_at TIMESTAMPTZ;
```

Alternatively try `npx drizzle-kit push` first -- a simple nullable column add should work fine without CHECK constraint issues.
  </action>
  <verify>
    <automated>npx drizzle-kit push --dry-run 2>&1 | grep -i "creator_email_sent_at" || grep -r "creatorEmailSentAt" src/db/schema.ts</automated>
  </verify>
  <done>songs table has creatorEmailSentAt nullable timestamp column in both schema.ts and the live database</done>
</task>

<task type="auto">
  <name>Task 2: Wire automatic creator email into poll-job finalization</name>
  <files>src/app/api/poll-job/[jobId]/route.ts, src/app/api/poll-job/[jobId]/route.test.ts</files>
  <action>
In `poll-job/[jobId]/route.ts`, after the `finalizeSong()` call succeeds inside the COMPLETED branch, add a non-blocking call to send the creator email:

1. Import `eq` is already imported. Add import for `songs` fields needed.

2. After the `finalizeSong(jobId, ...)` try/catch block (around line 88-91), add a new try/catch block that:
   a. Queries the song row by heartbulaJobId to get `id`, `userId`, and `creatorEmailSentAt`
   b. Guards: skip if `userId` is null (anonymous) or `creatorEmailSentAt` is not null (already sent)
   c. Calls the internal send-creator-email endpoint: `fetch(new URL('/api/send-creator-email', request.url), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ songId: song.id }) })`
   d. On success (2xx response), updates the song row: `db.update(songs).set({ creatorEmailSentAt: new Date() }).where(eq(songs.id, song.id))`
   e. Entire block wrapped in try/catch with `console.error('[poll-job] creator email failed (non-fatal):', error)` -- email failures must NEVER break the poll response

3. The `finalizeSong` function signature does not need to change. The email logic runs after finalization, not inside it.

4. Important: The `request` (NextRequest) object is available as `_req` parameter -- rename it to `request` so the URL can be derived for the internal fetch call.

5. Update the existing test file to add a test case:
   - Mock fetch globally (or add to existing mock setup)
   - When poll returns COMPLETED for a song with userId and no creatorEmailSentAt, assert that `/api/send-creator-email` was called
   - When poll returns COMPLETED for a song without userId (anonymous), assert email was NOT sent
  </action>
  <verify>
    <automated>npx vitest run src/app/api/poll-job --reporter=verbose 2>&1 | tail -30</automated>
  </verify>
  <done>Poll-job automatically sends creator email on first COMPLETED finalization for authenticated users. Anonymous songs skip email. Failures are logged but non-fatal. Tests pass.</done>
</task>

</tasks>

<verification>
1. Schema has `creatorEmailSentAt` column
2. `npx vitest run src/app/api/poll-job` passes
3. Manual verification: generate a song as authenticated user, confirm email arrives after completion
</verification>

<success_criteria>
- Authenticated users automatically receive "song ready" email when generation completes
- Email sent exactly once (creatorEmailSentAt prevents duplicates)
- Anonymous songs silently skip email
- Email failures do not break poll-job responses
- All existing poll-job tests continue to pass
</success_criteria>

<output>
After completion, create `.planning/quick/2-email-notifications-when-songs-are-ready/2-SUMMARY.md`
</output>
