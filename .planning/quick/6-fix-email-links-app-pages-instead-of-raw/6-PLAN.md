---
phase: quick-6
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/app/api/send-creator-email/route.ts
  - src/app/api/send-recipient-email/route.ts
  - src/emails/SongReadyEmail.tsx
  - src/emails/GiftDeliveryEmail.tsx
  - src/app/listen/[songId]/page.tsx
autonomous: true
requirements: [EMAIL-LINKS-FIX]
must_haves:
  truths:
    - "Creator email 'Listen Now' links to the success page, not a raw R2 URL"
    - "Creator email 'Download MP3' links to /api/audio proxy, not a raw R2 URL"
    - "Recipient email 'Listen to Your Song' links to /listen/[songId] page, not a raw R2 URL"
    - "No presigned R2 URLs appear in any email HTML"
    - "Public /listen/[songId] page renders branded player with fresh presigned audio"
  artifacts:
    - path: "src/app/listen/[songId]/page.tsx"
      provides: "Public branded listen page for gift recipients"
    - path: "src/app/api/send-creator-email/route.ts"
      provides: "Creator email with app URLs instead of R2 URLs"
    - path: "src/app/api/send-recipient-email/route.ts"
      provides: "Recipient email with app URL instead of R2 URL"
  key_links:
    - from: "src/emails/SongReadyEmail.tsx"
      to: "/quiz/success/[jobId]"
      via: "listenUrl prop set by send-creator-email route"
    - from: "src/emails/GiftDeliveryEmail.tsx"
      to: "/listen/[songId]"
      via: "listenUrl prop set by send-recipient-email route"
    - from: "src/app/listen/[songId]/page.tsx"
      to: "/api/audio/[jobId]"
      via: "server-side fetch for presigned URL"
---

<objective>
Replace raw R2 presigned URLs in creator and recipient emails with links to branded app pages. Creator "Listen Now" links to the existing success page, "Download MP3" links to the audio API proxy. Recipient "Listen to Your Song" links to a new public /listen/[songId] page. This fixes the black-screen UX and eliminates exposure of Cloudflare account credentials in email links.

Purpose: Security (hide R2 credentials) and UX (branded pages instead of raw audio files)
Output: Updated email routes, updated email templates, new public listen page
</objective>

<execution_context>
@/Users/deeg/.claude/get-shit-done/workflows/execute-plan.md
@/Users/deeg/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@src/app/api/send-creator-email/route.ts
@src/app/api/send-recipient-email/route.ts
@src/emails/SongReadyEmail.tsx
@src/emails/GiftDeliveryEmail.tsx
@src/app/api/audio/[jobId]/route.ts
@src/app/quiz/success/[jobId]/page.tsx
@src/db/schema.ts

<interfaces>
<!-- Song schema fields available (from src/db/schema.ts): -->
id: uuid (PK)
heartbulaJobId: text (used as jobId in URLs)
recipientName: text
relationship: text
genre: text
r2Mp3Key: text (null until finalized)
status: 'generating' | 'completed' | 'failed'
quizData: jsonb (contains message, occasion, etc.)

<!-- Audio API (src/app/api/audio/[jobId]/route.ts): -->
GET /api/audio/[jobId] → { url: presignedUrl }
GET /api/audio/[jobId]?download=true&name=filename.mp3 → 302 redirect to presigned download URL

<!-- SongPlayer component: -->
import path: @/app/quiz/success/[jobId]/_components/SongPlayer
props: { src: string, isPreview: boolean, onPreviewEnd: () => void }
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Update email routes to use app URLs instead of R2 presigned URLs</name>
  <files>src/app/api/send-creator-email/route.ts, src/app/api/send-recipient-email/route.ts</files>
  <action>
In send-creator-email/route.ts:
- Remove the `import { getAudioPresignedUrl } from '@/lib/r2';` import
- Remove the `Promise.all` block that generates listenUrl and downloadUrl presigned URLs (lines 84-87)
- Build siteUrl: `const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';`
- Build listenUrl as the success page: `const listenUrl = \`\${siteUrl}/quiz/success/\${song.heartbulaJobId}?name=\${encodeURIComponent(song.recipientName)}&songId=\${song.id}\`;`
- Build downloadUrl via audio API proxy: `const downloadUrl = \`\${siteUrl}/api/audio/\${song.heartbulaJobId}?download=true&name=\${encodeURIComponent(song.recipientName + '-song.mp3')}\`;`
- Pass these new URLs to the SongReadyEmail template (no template prop changes needed — same prop names)

In send-recipient-email/route.ts:
- Remove the `import { getAudioPresignedUrl } from '@/lib/r2';` import
- Remove the presigned URL generation line (line 84: `const listenUrl = await getAudioPresignedUrl(...)`)
- Build siteUrl: `const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';`
- Build listenUrl as the listen page: `const listenUrl = \`\${siteUrl}/listen/\${song.id}\`;`
- Pass to GiftDeliveryEmail template (same prop name, no template changes needed)
  </action>
  <verify>
    <automated>cd /Users/deeg/Documents/GitHub/MusicGenerator && npx tsc --noEmit --pretty 2>&1 | head -30</automated>
  </verify>
  <done>Both email routes build app-relative URLs. No presigned R2 URLs generated in either route. TypeScript compiles cleanly.</done>
</task>

<task type="auto">
  <name>Task 2: Create public /listen/[songId] page for gift recipients</name>
  <files>src/app/listen/[songId]/page.tsx</files>
  <action>
Create a new Server Component page at src/app/listen/[songId]/page.tsx:

1. Import db, songs, eq from drizzle; getAudioPresignedUrl from @/lib/r2
2. This is a server component (no 'use client') with a client island for the player
3. Accept params: { songId: string }
4. Look up song by `songs.id` (not heartbulaJobId) using db.select().from(songs).where(eq(songs.id, songId))
5. If not found or status !== 'completed' or !r2Mp3Key, show a simple "Song not found" message (return a styled div)
6. Generate a fresh presigned URL server-side: `const audioUrl = await getAudioPresignedUrl(song.r2Mp3Key, 3600);`
7. Render a branded page with:
   - Warm off-white background (bg-[#faf9f7]) matching email aesthetic
   - Centered container max-w-lg
   - Branded header: "Notevra" in Libre Baskerville (font-display), baby blue color (#6ba3c9)
   - Heading: "A song for {recipientName}" in font-display
   - Subtext: "From your {relationship}" in muted text
   - Genre tag: small pill with genre name
   - A client component wrapper `<ListenPlayer src={audioUrl} />` — create this inline as a 'use client' component in the same directory or embed via a simple audio element approach
   - Footer: "Made with Notevra" in muted text, link to notevra.net

For the audio player, since SongPlayer is deeply coupled to the success page (preview paywall, etc.), create a simple dedicated client component `src/app/listen/[songId]/ListenPlayer.tsx`:
- 'use client' component
- Takes `src: string` prop
- Uses native HTML `<audio>` element with controls, styled with Tailwind (w-full, rounded)
- No preview restrictions — full playback for gift recipients

Add metadata export for SEO: `export function generateMetadata()` returning title "A song for {name} | Notevra"
  </action>
  <verify>
    <automated>cd /Users/deeg/Documents/GitHub/MusicGenerator && npx tsc --noEmit --pretty 2>&1 | head -30</automated>
  </verify>
  <done>Public /listen/[songId] page exists, renders branded player, generates fresh presigned URL server-side, no R2 credentials exposed to client. TypeScript compiles cleanly.</done>
</task>

<task type="auto">
  <name>Task 3: Update email template PreviewProps and verify build</name>
  <files>src/emails/SongReadyEmail.tsx, src/emails/GiftDeliveryEmail.tsx</files>
  <action>
Update PreviewProps in both email templates to use app URLs instead of raw URLs, so the React Email dev preview reflects the real link pattern:

In SongReadyEmail.tsx:
- Change listenUrl PreviewProps to: 'https://notevra.net/quiz/success/demo-job-id?name=Sarah&songId=demo-song-id'
- Change downloadUrl PreviewProps to: 'https://notevra.net/api/audio/demo-job-id?download=true&name=Sarah-song.mp3'

In GiftDeliveryEmail.tsx:
- Change listenUrl PreviewProps to: 'https://notevra.net/listen/demo-song-id'

Then run the build to confirm everything compiles and the app builds successfully.
  </action>
  <verify>
    <automated>cd /Users/deeg/Documents/GitHub/MusicGenerator && npm run build 2>&1 | tail -20</automated>
  </verify>
  <done>Email PreviewProps reflect app URLs. Full Next.js build succeeds with no errors. New /listen/[songId] route appears in build output.</done>
</task>

</tasks>

<verification>
- `npm run build` passes with no errors
- New route `/listen/[songId]` appears in the build output
- Grep for `getAudioPresignedUrl` in send-creator-email and send-recipient-email routes returns no matches (removed)
- Grep for R2-related imports in email route files shows no presigned URL generation
</verification>

<success_criteria>
- Creator email "Listen Now" links to /quiz/success/[jobId] with name and songId params
- Creator email "Download MP3" links to /api/audio/[jobId]?download=true
- Recipient email "Listen to Your Song" links to /listen/[songId]
- No raw R2 presigned URLs appear in any email
- /listen/[songId] page renders branded player with server-generated presigned audio URL
- Full Next.js build passes
</success_criteria>

<output>
After completion, create `.planning/quick/6-fix-email-links-app-pages-instead-of-raw/6-SUMMARY.md`
</output>
