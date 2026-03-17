---
phase: quick-8
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/lib/quiz-types.ts
  - src/app/quiz/_components/Step5Message.tsx
  - src/app/api/quiz-generate/route.ts
  - src/db/schema.ts
  - src/app/api/poll-job/[jobId]/route.ts
  - src/app/quiz/success/[jobId]/_components/RecipientEmailForm.tsx
  - src/app/quiz/success/[jobId]/page.tsx
autonomous: true
requirements: [QUICK-8]
must_haves:
  truths:
    - "Recipient email entered during quiz is stored in quizData JSONB"
    - "Gift email auto-sends to recipient when song generation completes"
    - "Recipient email is only sent once (guarded by recipientEmailSentAt timestamp)"
    - "Success page shows 'Gift email sent' confirmation when auto-sent, or manual form when not"
  artifacts:
    - path: "src/lib/quiz-types.ts"
      provides: "recipientEmail field on QuizData"
      contains: "recipientEmail"
    - path: "src/db/schema.ts"
      provides: "recipientEmailSentAt column on songs table"
      contains: "recipientEmailSentAt"
    - path: "src/app/api/poll-job/[jobId]/route.ts"
      provides: "Auto-send recipient email block after creator email block"
      contains: "recipientEmailSentAt"
  key_links:
    - from: "src/app/quiz/_components/Step5Message.tsx"
      to: "src/lib/quiz-types.ts"
      via: "recipientEmail field in QuizData"
      pattern: "recipientEmail"
    - from: "src/app/api/poll-job/[jobId]/route.ts"
      to: "/api/send-recipient-email"
      via: "fetch call with songId + recipientEmail from quizData"
      pattern: "send-recipient-email"
---

<objective>
Auto-send gift email to recipient when song generation completes, by collecting recipient email during the quiz and triggering the existing send-recipient-email endpoint from poll-job on COMPLETED.

Purpose: Gift recipients currently only get an email if the creator manually enters the address on the success page. This causes most recipients to never receive the gift notification.

Output: Recipient email collected in quiz Step 5, stored in quizData, auto-sent on completion, success page reflects auto-send status.
</objective>

<execution_context>
@/Users/deeg/.claude/get-shit-done/workflows/execute-plan.md
@/Users/deeg/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@src/lib/quiz-types.ts
@src/app/quiz/_components/Step5Message.tsx
@src/app/api/quiz-generate/route.ts
@src/db/schema.ts
@src/app/api/poll-job/[jobId]/route.ts
@src/app/api/send-recipient-email/route.ts
@src/app/quiz/success/[jobId]/_components/RecipientEmailForm.tsx
@src/app/quiz/success/[jobId]/page.tsx

<interfaces>
From src/lib/quiz-types.ts:
```typescript
export interface QuizData {
  relationshipType: RelationshipType | '';
  recipientName: string;
  genre: string;
  voicePreference: VoicePreference;
  qualities: string;
  memories: string;
  message: string;
  language: string;
  email: string;
  emailOptIn: boolean;
}
```

From src/db/schema.ts (songs table quizData JSONB type):
```typescript
quizData: jsonb('quiz_data').notNull().$type<{
  occasion?: string;
  qualities?: string;
  memories?: string;
  message?: string;
  voiceGender?: string;
  language?: string;
  email?: string;
  emailOptIn?: boolean;
}>(),
```

From src/app/api/send-recipient-email/route.ts:
```typescript
// Expects POST body: { songId: string, recipientEmail: string }
export async function POST(request: NextRequest): Promise<NextResponse>
```

From src/app/quiz/success/[jobId]/_components/RecipientEmailForm.tsx:
```typescript
interface RecipientEmailFormProps {
  songId: string;
}
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add recipientEmail to quiz flow and storage</name>
  <files>src/lib/quiz-types.ts, src/app/quiz/_components/Step5Message.tsx, src/app/api/quiz-generate/route.ts, src/db/schema.ts</files>
  <action>
1. **src/lib/quiz-types.ts** — Add `recipientEmail: string` field to the `QuizData` interface (after `message`). Add `recipientEmail: ''` to `INITIAL_QUIZ_DATA`.

2. **src/app/quiz/_components/Step5Message.tsx** — Below the message textarea and its error, add an optional recipient email section:
   - A collapsible/toggle section with label "Want to email this song directly to them?" (use a checkbox or text link to reveal)
   - When revealed, show an email input with placeholder "their@email.com" bound to `data.recipientEmail` via `updateData({ recipientEmail: ... })`
   - Add a small helper text: "We'll send them a gift notification when the song is ready"
   - Do NOT add recipientEmail to step5Schema validation (it's optional, no validation needed beyond HTML type="email")

3. **src/app/api/quiz-generate/route.ts** — Two changes:
   - In `validateQuizData`, add: `recipientEmail: typeof obj.recipientEmail === 'string' ? obj.recipientEmail : ''`
   - In the `db.insert(songs).values(...)` call (line ~116-131), add `recipientEmail: validation.data.recipientEmail || undefined` to the quizData JSONB object

4. **src/db/schema.ts** — Two changes:
   - Add `recipientEmail?: string` to the `$type<{...}>()` generic on the `quizData` jsonb column
   - Add `recipientEmailSentAt: timestamp('recipient_email_sent_at', { withTimezone: true })` column to the songs table, after `creatorEmailSentAt` (line ~64)
   - Then apply to DB: run `npx drizzle-kit push` (if it fails due to the known Supabase CHECK constraint bug, provide the raw SQL equivalent: `ALTER TABLE songs ADD COLUMN recipient_email_sent_at timestamptz;`)
  </action>
  <verify>
    <automated>cd /Users/deeg/Documents/GitHub/MusicGenerator && npx tsc --noEmit 2>&1 | head -30</automated>
  </verify>
  <done>recipientEmail field exists in QuizData, Step5Message has email input, quiz-generate stores it in quizData JSONB, songs table has recipientEmailSentAt column</done>
</task>

<task type="auto">
  <name>Task 2: Auto-send recipient email on completion and update success page</name>
  <files>src/app/api/poll-job/[jobId]/route.ts, src/app/quiz/success/[jobId]/_components/RecipientEmailForm.tsx, src/app/quiz/success/[jobId]/page.tsx</files>
  <action>
1. **src/app/api/poll-job/[jobId]/route.ts** — After the creator email block (lines 93-138), add a parallel recipient email block following the exact same pattern:
   ```
   // Send recipient email — non-blocking, failures must never break the poll response
   try {
     const [songForRecipientEmail] = await db
       .select({
         id: songs.id,
         quizData: songs.quizData,
         recipientEmailSentAt: songs.recipientEmailSentAt,
       })
       .from(songs)
       .where(eq(songs.heartbulaJobId, jobId))
       .limit(1);

     const recipientEmail = songForRecipientEmail?.quizData?.recipientEmail;
     if (songForRecipientEmail && recipientEmail && !songForRecipientEmail.recipientEmailSentAt) {
       const recipientRes = await fetch(
         new URL('/api/send-recipient-email', request.url),
         {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({ songId: songForRecipientEmail.id, recipientEmail }),
         },
       );
       if (recipientRes.ok) {
         await db
           .update(songs)
           .set({ recipientEmailSentAt: new Date() })
           .where(eq(songs.id, songForRecipientEmail.id));
       }
     }
   } catch (recipientEmailError) {
     console.error('[poll-job] recipient email failed (non-fatal):', recipientEmailError);
   }
   ```
   IMPORTANT: Reuse the `songForEmail` query result if possible to avoid a second DB read. If the existing `songForEmail` select already has `quizData`, just add `recipientEmailSentAt` to that select and use the same variable. This is an optimization — check if you can extend the existing select at line 95-104 to include `recipientEmailSentAt`, then add the recipient block after the creator block using the same `songForEmail` variable.

2. **src/app/quiz/success/[jobId]/_components/RecipientEmailForm.tsx** — Update the component:
   - Change props interface to: `{ songId: string; recipientEmailSentAt?: string | null; recipientEmail?: string | null }`
   - If `recipientEmailSentAt` is truthy, render a confirmation message: "Gift email sent to {recipientEmail}! They'll receive it shortly." with a checkmark icon (use `Check` from lucide-react). Do NOT show the form.
   - If `recipientEmailSentAt` is falsy but `recipientEmail` is truthy, pre-populate the email input with `recipientEmail` (set as initial `useState` value)
   - If neither, show the existing form as-is (no changes)

3. **src/app/quiz/success/[jobId]/page.tsx** — Thread the new props:
   - After song completes (in the `data.status === 'COMPLETED'` block inside the poll effect, around line 180-206), fetch the song's `recipientEmailSentAt` and `recipientEmail` from quizData. Add state: `const [recipientEmailSentAt, setRecipientEmailSentAt] = useState<string | null>(null)` and `const [recipientEmailFromQuiz, setRecipientEmailFromQuiz] = useState<string | null>(null)`
   - After the poll completes with COMPLETED, make a lightweight fetch to get the song row data. The poll response already returns some data — the cleanest approach is to add `recipientEmailSentAt` and `recipientEmail` (from quizData) to the poll-job GET response JSON when status is COMPLETED. Update poll-job route to include these two fields in the COMPLETED response.
   - In the success page, read these from the poll response and set state.
   - Pass `recipientEmailSentAt={recipientEmailSentAt}` and `recipientEmail={recipientEmailFromQuiz}` to `<RecipientEmailForm>`.
  </action>
  <verify>
    <automated>cd /Users/deeg/Documents/GitHub/MusicGenerator && npx tsc --noEmit 2>&1 | head -30</automated>
  </verify>
  <done>Poll-job auto-sends recipient email on COMPLETED (guarded by recipientEmailSentAt), success page shows "Gift email sent" confirmation when auto-sent or pre-populated form when not, TypeScript compiles clean</done>
</task>

</tasks>

<verification>
1. TypeScript compiles with no errors: `npx tsc --noEmit`
2. Dev server starts: `npm run dev` (no crash)
3. Manual flow: Complete quiz with recipient email -> song generates -> poll-job sends recipient email -> success page shows "Gift email sent" confirmation
4. Manual flow: Complete quiz WITHOUT recipient email -> success page shows manual form as before
</verification>

<success_criteria>
- recipientEmail collected during quiz Step 5 (optional field)
- recipientEmail stored in quizData JSONB on song generation
- poll-job auto-sends gift email to recipient on COMPLETED status
- recipientEmailSentAt timestamp prevents duplicate sends
- Success page shows confirmation when auto-sent, manual form otherwise
- No regressions to creator email flow
</success_criteria>

<output>
After completion, create `.planning/quick/8-auto-send-gift-email-to-recipient-when-s/8-SUMMARY.md`
</output>
