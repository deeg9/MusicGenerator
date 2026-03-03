# Pitfalls Research

**Domain:** AI Music Generation SaaS (ACE-Step 1.5 + Next.js + RunPod + Stripe)
**Researched:** 2026-03-03
**Confidence:** HIGH (ACE-Step issues from live GitHub tracker, RunPod from official docs, Stripe from official docs + community post-mortems)

---

## Critical Pitfalls

### Pitfall 1: ACE-Step Memory Leak Accumulates Across Generations

**What goes wrong:**
ACE-Step 1.5 reserves system RAM for each generation but does not release it after completion. On a system with 32GB RAM, observed progression is: Generation 1: 1.5GB → 13.3GB, Generation 2: 16.5GB → 21.4GB, Generation 3: 30GB → system lockup. The process spawns new sub-processes for each generation without proper cleanup. On a RunPod serverless worker, this manifests as the worker becoming unresponsive or crashing after 2-3 generations, returning job failures to users with no clear error message.

**Why it happens:**
The model's generation handler starts new processes each time without deallocating the previous generation's resources. This is a confirmed open bug in ACE-Step 1.5 as of February 2026 (GitHub issue #142). The serverless deployment model makes this worse — workers are expected to handle multiple jobs in sequence, so accumulated memory eventually kills the worker.

**How to avoid:**
Configure the RunPod worker with a max job count of 1-2 per worker lifecycle, then force worker restart. Set `RUNPOD_MAX_JOB_RETRIES=1` and configure the endpoint to spawn fresh workers rather than reusing them across many jobs. Set execution timeout conservatively to prevent zombie workers. Monitor VRAM and RAM metrics per job in RunPod dashboard. When the bug is fixed upstream, revisit reuse strategy.

**Warning signs:**
- Workers that were healthy start timing out after the first few jobs
- RunPod logs show job failures with OOM (out of memory) errors
- First generation of the day succeeds, second or third fails without explanation
- Worker health checks fail intermittently

**Phase to address:** Infrastructure Setup phase — configure worker restart policy before production traffic hits it.

---

### Pitfall 2: RunPod Job TTL Kills In-Flight Generations

**What goes wrong:**
RunPod's TTL timer starts when the job is submitted, not when execution begins. The default TTL is 24 hours but the critical issue is that if a worker is cold-starting (downloading model weights), the queue wait time eats into the TTL budget. More dangerously: if TTL expires while a job is actively running, the job is immediately terminated and removed from the system. Subsequent status checks return 404 — not an error, not a timeout, just "not found." The user's UI receives no useful error, the credit was already deducted, and the generation is gone.

**Why it happens:**
Developers configure TTL based on expected generation time (30-60 seconds for music) without accounting for cold start time (30-300 seconds depending on model size and caching). Under load, queue time compounds further. The result is jobs being terminated before they complete despite the configured TTL appearing generous.

**How to avoid:**
Set TTL to at minimum 3x your expected generation time plus expected cold start time. For ACE-Step with a 60-second generation and up to 3-minute cold start: set TTL to at least 600 seconds. Use async polling (`/run` not `/runsync`) so the frontend stays connected. Store job IDs in your database immediately on submission so you can reconcile incomplete jobs. Implement a job status reconciliation background task that identifies submitted-but-never-completed jobs and refunds credits.

**Warning signs:**
- Frontend receives 404 on job status poll, not a timeout error
- Jobs that succeed in staging fail in production (staging has no queue wait)
- Users report generations that "disappeared" with no error message
- Generation success rate drops during peak hours

**Phase to address:** Infrastructure Setup phase — establish job lifecycle handling before connecting to the frontend.

---

### Pitfall 3: Credit Deducted Before Generation Confirms Success

**What goes wrong:**
The intuitive implementation deducts credits when the user hits "Generate." If the generation fails (RunPod cold start, model error, OOM crash, TTL expiry, network timeout), the credit is gone but the user got nothing. This is the most common complaint pattern in AI generation SaaS. Refund logic is never added because it seems like an edge case — until it's 20% of generations on cold mornings.

**Why it happens:**
Developers think of credit deduction as "payment for the attempt" rather than "payment for the result." The implementation is simpler: deduct at request time, don't worry about async job state. The failure modes only become apparent after deployment when real users lose credits.

**How to avoid:**
Use a two-phase credit pattern: (1) Reserve/hold credits when job is submitted (write a pending reservation record), (2) Confirm and consume the reservation only when the job returns a successful audio file, (3) Cancel the reservation and restore credits if the job fails or times out. Implement in a Postgres function (callable via Supabase RPC) so the hold/confirm/cancel is atomic. Never do this in two separate API calls — race conditions will cause double-refunds or missed refunds.

Concrete schema:
```sql
-- credit_reservations table
id, user_id, credits_held, job_id, status (pending|confirmed|cancelled), created_at

-- atomic hold function
CREATE FUNCTION hold_credits(p_user_id uuid, p_amount int, p_job_id text)
RETURNS void AS $$
BEGIN
  UPDATE users SET credits = credits - p_amount
  WHERE id = p_user_id AND credits >= p_amount;
  IF NOT FOUND THEN RAISE EXCEPTION 'Insufficient credits'; END IF;
  INSERT INTO credit_reservations (...) VALUES (...);
END; $$ LANGUAGE plpgsql;
```

**Warning signs:**
- Users reporting "lost credits" in support tickets
- Credit balance in database doesn't match expected deductions
- Failed jobs have no corresponding credit restoration in logs
- Generation success rate under 90% (common with cold starts)

**Phase to address:** Credit System phase — establish the reservation pattern before any real money changes hands.

---

### Pitfall 4: Stripe Webhook Race Condition Leaves Users on Free Tier After Payment

**What goes wrong:**
User completes Stripe Checkout, is redirected back to the app. The frontend immediately calls the billing status API. The database still shows the free tier because the Stripe webhook hasn't arrived yet (webhooks are async, typically 1-5 seconds delayed). User sees "Free Plan" and thinks payment failed. Some users immediately try to pay again (double charge risk). Others open support tickets. Others churn.

This is a well-documented production issue affecting virtually every Stripe + Next.js SaaS that uses the naive implementation.

**Why it happens:**
Stripe Checkout redirects the user before the webhook fires. The redirect happens in milliseconds; the webhook arrives seconds later. The frontend makes API calls immediately after redirect, reads stale database state, and the UI shows pre-payment status.

**How to avoid:**
Implement a checkout sync endpoint that the success page calls before displaying status. This endpoint immediately queries the Stripe API directly (not the database) for the session ID, updates the database synchronously, then returns billing status. If the session ID isn't yet complete in Stripe's system, implement polling with exponential backoff (1s, 2s, 4s, max 5 attempts). The webhook handler must also be idempotent using stored event IDs — it will process the same event as the sync endpoint, and that's fine.

```typescript
// After Stripe redirect, before showing success UI:
await fetch('/api/billing/sync-checkout?session_id=' + sessionId);
// This fetches from Stripe API directly and writes to DB
// Then check DB for updated plan
```

**Warning signs:**
- Users emailing "I paid but still on free plan"
- Support tickets immediately after payment
- Database shows plan upgrade occurring seconds after user-facing confirmation
- Stripe dashboard shows successful payments with no corresponding database update

**Phase to address:** Payment Integration phase — add the sync endpoint before enabling real payments.

---

### Pitfall 5: Stripe Webhook Handler Not Idempotent — Duplicate Credit Grants

**What goes wrong:**
Stripe retries webhook delivery with exponential backoff for up to 3 days if your endpoint fails or times out. If your handler processes `invoice.paid`, grants 500 credits, and then times out before returning 200 to Stripe — Stripe retries, and the user gets 1000 credits. Or if your endpoint is briefly down during Stripe's retry window, the retry grants credits again when you come back online.

**Why it happens:**
Developers verify the webhook signature and immediately process the event without checking if it was already processed. Fast to implement, catastrophically wrong under failure conditions.

**How to avoid:**
Store processed Stripe event IDs in the database. Before processing any webhook, check if `event.id` exists. If it does, return 200 immediately (acknowledge receipt, skip processing). If it doesn't, insert the event ID and process within the same database transaction.

```typescript
// Webhook handler pattern
const eventId = event.id;
const existing = await db.stripe_events.findUnique({ where: { event_id: eventId } });
if (existing) return res.json({ received: true }); // Already processed

await db.$transaction(async (tx) => {
  await tx.stripe_events.create({ data: { event_id: eventId } });
  await tx.users.update({ where: { ... }, data: { credits: { increment: amount } } });
});
```

**Warning signs:**
- Users with unexpectedly high credit balances
- `invoice.paid` fired twice in Stripe logs for the same invoice
- Webhook processing errors in application logs followed by apparent success
- Credit totals don't reconcile with expected grant amounts

**Phase to address:** Payment Integration phase — implement before accepting any live payments.

---

### Pitfall 6: Vercel Serverless Timeout Kills the Generation Polling Loop

**What goes wrong:**
Next.js API routes deployed to Vercel timeout at 10 seconds (Hobby) or 60 seconds (Pro). If a developer puts the RunPod polling loop inside a Next.js API route — submitting the job, then waiting in a while loop until complete — the Vercel function times out mid-wait. The RunPod job continues, but the frontend receives a 504 and shows the user an error. The user's credit was held (or deducted). The audio file completes on RunPod and goes nowhere.

**Why it happens:**
It's the obvious implementation: submit job, poll until done, return result. Works perfectly in local development where no function timeout exists. Fails entirely in production on Vercel.

**How to avoid:**
Never poll inside a Next.js API route. Use the async pattern: (1) Submit job to RunPod, return the job ID to the frontend immediately, (2) Frontend polls a lightweight `/api/generation/status?jobId=X` endpoint every 2-3 seconds, (3) Status endpoint checks RunPod job status and returns it, (4) When status is complete, return the audio URL. The frontend handles the wait, not the server. This also gives you progress feedback UI for free.

**Warning signs:**
- 504 errors in production, never in development
- Generation appears to complete in RunPod dashboard but user sees an error
- API route execution time approaching Vercel's limit in production logs
- Works for short songs, fails for longer ones

**Phase to address:** Generation API phase — establish the async pattern from day one.

---

### Pitfall 7: ACE-Step Turbo Generates Distortion Artifacts on Certain Genres

**What goes wrong:**
ACE-Step 1.5's audio normalization pipeline uses standard deviation-based normalization that introduces audible clipping and distortion artifacts, particularly on rock and electronic genres. The distortion is baked into the audio file — it's not playback clipping. Users generating "upbeat rock birthday song" or "electronic dance track" will receive noticeably distorted audio that sounds broken. (GitHub issue #298, fix PR #299 was merged but reports persist.)

**Why it happens:**
The std-based normalization doesn't account for the high dynamic range of certain genres. The distortion appears to be a pre/post-processing issue in the model's audio codec stage, not the diffusion model itself.

**How to avoid:**
Add post-processing normalization before serving audio to users. Use a server-side audio normalization step (loudnorm filter in FFmpeg, or a Python audio library like `pyloudnorm`) after receiving the file from ACE-Step. Normalize to -14 LUFS for streaming compatibility. Test generation with rock, electronic, and hip-hop genres specifically — these are the highest-risk categories. Add a quality check step that flags excessive peak levels before delivering to the user.

**Warning signs:**
- Users reporting audio sounds "broken" or "buzzy" on certain genres
- Audio peak levels consistently hitting 0dBFS or above
- Quality complaints concentrated in specific genre categories
- Waveform visualization showing obvious clipping (flat tops on peaks)

**Phase to address:** Generation Integration phase — add post-processing normalization before releasing to users.

---

### Pitfall 8: Audio File Too Large for Download — No Compression Step

**What goes wrong:**
ACE-Step generates uncompressed WAV output by default. A 3-minute WAV file at 44.1kHz stereo 16-bit is approximately 31MB. A 10-minute song is 100MB+. Serving raw WAV to users creates: (1) Slow download times, (2) Excessive storage costs on S3/Supabase Storage, (3) Browser memory pressure when loading into the audio preview player, (4) Mobile users burning through data. At 5-10 users this is invisible; at 100 users generating daily it becomes a real cost.

**Why it happens:**
WAV is the natural output format, and developers skip the conversion step because "it works" and conversion adds complexity. The cost and performance problems only surface at scale.

**How to avoid:**
Convert WAV to MP3 (320kbps) or AAC (256kbps) before storing or serving. MP3 at 320kbps reduces a 31MB WAV to approximately 8MB — a 4x reduction with imperceptible quality loss for music streaming. Use FFmpeg on the RunPod worker to convert immediately after generation, before uploading to storage. Store only the compressed version; discard the WAV. Serve MP3 for preview and download — all modern browsers support it natively.

**Warning signs:**
- Storage costs growing faster than user count
- Audio preview taking >3 seconds to start playing
- Download complaints from users on mobile or slower connections
- WAV files accumulating in storage without a cleanup process

**Phase to address:** Generation Integration phase — add format conversion before connecting storage.

---

### Pitfall 9: Signed URL Expires Before User Downloads

**What goes wrong:**
Generated audio is stored in S3/Supabase Storage and served via a time-limited signed URL. If the URL is generated immediately after generation and embedded in the frontend, users who don't download immediately — they preview, then come back to download an hour later — get an access denied error. The audio exists in storage but appears "gone" to the user.

**Why it happens:**
Developers generate the signed URL once and store it in the database. The URL expires (common default: 1 hour, or even 15 minutes). The database record now has a dead URL.

**How to avoid:**
Never store signed URLs in the database. Store only the storage path (e.g., `generations/user_123/song_456.mp3`). Generate fresh signed URLs on every request to serve audio. Set URL expiration to 1 hour for preview and regenerate for download. Alternatively, for downloadable files, generate a 24-hour URL only at the moment the user clicks "Download."

**Warning signs:**
- Users reporting "download not working" hours after generation
- 403 Access Denied errors in browser network logs
- Support tickets: "my song disappeared"
- Signed URLs in database have past expiration timestamps

**Phase to address:** Storage integration phase — establish the path-only storage pattern from the start.

---

### Pitfall 10: Free Tier Abuse via Disposable Email Accounts

**What goes wrong:**
AI generation SaaS free tiers are prime targets for credential farming. Using disposable email providers (which offer programmatic APIs to create thousands of addresses), attackers create bulk accounts to harvest free credits or GPU compute. One comparable AI image generator documented 3,500+ malicious registration attempts in two weeks. For a GPU-backed service, each abusive generation directly costs money — the free tier becomes a free GPU service for bad actors.

**Why it happens:**
Email verification without disposable email detection is trivially bypassed. Standard email verification confirms the inbox exists but doesn't distinguish throwaway from real accounts. Without phone verification or behavioral signals, the signup flow has no friction for bots.

**How to avoid:**
Block known disposable email domains at signup using a maintained blocklist (libraries: `disposable-email-domains` npm package, or API services like AbstractAPI). Add rate limiting on the signup endpoint (max 5 signups/IP/hour). Implement a honeypot field in the signup form. For the free tier specifically, limit generations per IP address in addition to per account. Consider requiring phone verification for credits above the minimum free tier. Do not implement all of this on day one — add layers as abuse patterns emerge.

**Warning signs:**
- Spike in signups from email domains you don't recognize
- High signup count, low engagement (no subsequent logins)
- GPU costs growing without proportional user growth
- Signups clustered in short time windows (automated behavior)

**Phase to address:** Auth phase — add disposable email blocking at signup from the start; add progressive layers after launch.

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Deduct credits at request submission (not on success) | Simpler implementation | Users lose credits on failures; support burden | Never — implement the reservation pattern from day one |
| Store signed URLs in database | Avoids regeneration logic | All stored URLs expire; broken downloads | Never — store paths, generate URLs on demand |
| Poll RunPod inside Next.js API route | Single endpoint flow | 504 timeouts in production; lost generations | Never — async pattern is just as simple |
| Skip audio format conversion (serve raw WAV) | No FFmpeg dependency | 4-10x higher storage costs; slow previews | Acceptable in day-zero prototype only |
| Use Stripe test mode "forever" | Faster iteration | Real payment edge cases untested | Acceptable until first real user |
| No webhook idempotency | Faster webhook handler | Duplicate credit grants on Stripe retry | Never — idempotency is 3 extra lines of code |
| One "always on" RunPod worker | Eliminates cold starts | $144+/month even with no users | Acceptable if cost is budgeted and cold starts are unacceptable |
| Trust client-reported job ID for credit confirmation | Simpler frontend logic | Users can fake completion to get credits back | Never — server must confirm job result directly with RunPod |

---

## Integration Gotchas

Common mistakes when connecting to external services.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| RunPod Serverless | Using `/runsync` for generation (1-minute result retention) | Use `/run` (async), store job ID, poll `/status/{id}` from frontend |
| RunPod Serverless | Not setting `executionTimeout` — defaults to 600s which may not fit cold start + generation | Explicitly set `executionTimeout` to 300+ for music generation |
| RunPod Serverless | Single GPU type selected — unavailable GPU kills all jobs | Select multiple GPU types (RTX 3090, RTX 4090, A5000) for availability |
| ACE-Step REST API | Sending concurrent requests to same worker | Worker is single-threaded per GPU; queue requests, don't send concurrent |
| ACE-Step REST API | No generation parameter validation before sending to API | Validate prompt length, lyric length, duration range server-side first |
| Stripe Webhooks | No signature verification | Always verify `stripe-signature` header with `stripe.webhooks.constructEvent()` |
| Stripe Webhooks | Processing webhook synchronously before returning 200 | Return 200 immediately, process asynchronously (or use background job) |
| Stripe Webhooks | Listening to all event types | Subscribe only to events you handle: `checkout.session.completed`, `invoice.paid`, `customer.subscription.deleted` |
| Supabase | Doing credit check and deduct as two separate queries | Use a Postgres function via RPC so check + deduct is a single atomic operation |
| S3/Supabase Storage | No cleanup of failed generation artifacts | Incomplete uploads and temp files accumulate; implement lifecycle rules |

---

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| No request queue — every user hits RunPod directly | Concurrent generations fail or slow each other | Implement a simple job queue (database-backed or Redis); RunPod handles one job per worker | 3+ simultaneous users |
| Polling from frontend every 500ms | Unnecessary API load; Vercel function invocations accumulate cost | Poll every 2-3 seconds; use exponential backoff if job is taking long | 50+ concurrent pollers |
| Loading full audio file into browser memory for preview | Mobile browser tab crashes on long songs | Stream audio via `<audio src>` tag with range request support; don't load into JS memory | Songs > 5 minutes |
| Storing all generation metadata in memory (no database) | Server restart loses all job history; no credit reconciliation possible | Write job records to database at submission, update on completion | First server restart |
| Single RunPod endpoint with no fallback | Endpoint outage = 100% generation failure | Use RunPod's multi-GPU type selection; add error handling with user-facing "try again" | Any RunPod endpoint issue |
| No database index on `user_id` in credits/generations tables | Credit check queries slow as user count grows | Index `user_id` from the start | ~1,000 generation records |

---

## Security Mistakes

Domain-specific security issues beyond general web security.

| Mistake | Risk | Prevention |
|---------|------|------------|
| Accepting user-provided job ID to confirm completion and release credit hold | Users fabricate job IDs to get credits refunded for successful generations | Server always calls RunPod API directly with stored job ID; never trust client-reported status |
| Exposing RunPod API key in Next.js client code | Attackers run arbitrary GPU jobs at your cost | RunPod API key lives only in Next.js API routes (server-side); never in `NEXT_PUBLIC_` variables |
| Not validating generation prompt server-side | Users submit multi-hour duration requests or inject control characters | Validate: max prompt length (500 chars), max duration (300 seconds), allowed characters |
| Storing Stripe webhook secret in frontend code | Webhook signature verification bypassed | Stripe secret lives only in server environment variables; verify in API route, not middleware |
| No rate limit on generation endpoint | Single user can drain all GPU budget | Rate limit per user: max 5 concurrent pending jobs, max 20 per hour (adjust for plan tier) |
| Returning RunPod internal error details to frontend | Leaks infrastructure details (model paths, server addresses) | Catch RunPod errors server-side; return sanitized "Generation failed" messages to client |

---

## UX Pitfalls

Common user experience mistakes in this domain.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Showing "Generating..." with no time estimate | Users don't know if it's working or hung; abandon after 10-15 seconds | Show expected generation time ("~30 seconds") and elapsed time counter |
| Generic error message on generation failure | Users don't know if it's their input or the system | Distinguish input errors ("Prompt too long") from system errors ("Generation failed, your credit was not charged") |
| No retry option after failure | Users must start from scratch, re-enter prompt | Keep prompt/lyrics in form state; show "Try Again" button that resubmits without re-entering |
| Immediate redirect away from generation page | Browser navigation breaks the polling loop | Keep user on generation page until complete; use polling, not page reload |
| Audio preview requires full file load | Long wait before user can hear anything | Use streaming HTML5 audio: `<audio src="..." preload="auto">` — playback starts at ~5-10% buffered |
| No visual confirmation that credit was not charged on failure | Users assume they lost credits even when refunded | Explicitly display "No credits were charged" in failure message |
| Download link to unsigned S3 URL | Works in dev (public bucket), fails in prod (private bucket) | Always generate fresh signed download URL at click time; never pre-embed unsigned URLs |
| Hiding generation progress behind generic spinner | Users lose trust during long waits | Show named stages: "Initializing model" → "Generating music" → "Finalizing audio" |

---

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **Credit deduction:** Looks complete with basic decrement — verify you have a reservation/confirmation pattern, not just subtract-on-submit
- [ ] **Generation success:** Works in dev with one user — verify it handles concurrent requests without race conditions on the credit check
- [ ] **Stripe payment:** Checkout flow works in test mode — verify webhook handler is idempotent (event ID stored), handles retry without double-granting
- [ ] **Audio download:** Downloads work in browser — verify signed URL is generated fresh at download time, not pre-stored
- [ ] **Error handling:** Try/catch around RunPod call — verify credit is restored on failure, user sees actionable error, retry works
- [ ] **Generation polling:** Status check works — verify what happens when job returns 404 (TTL expired vs. not found) and that user credit is restored
- [ ] **Audio quality:** Generated audio sounds good on test prompts — verify with rock, electronic, hip-hop genres where distortion is most common
- [ ] **Worker health:** First generation succeeds — verify second and third also succeed (memory leak won't show until generation 2-3)
- [ ] **Stripe subscription update:** User upgraded in Stripe — verify database reflects upgrade immediately after redirect, not only after webhook fires
- [ ] **Free tier limits:** Daily credit reset implemented — verify it's enforced at generation time (server-side), not trusted from client

---

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Users lost credits to failed generations (no reservation pattern) | MEDIUM | Export affected users from DB, calculate lost credits from generation failure logs, issue manual credit grants via admin function or Stripe credit |
| Duplicate credit grants from non-idempotent webhook | MEDIUM | Query `stripe_events` (if exists) or Stripe dashboard for duplicate event IDs, identify affected user accounts, manually correct balances, add idempotency going forward |
| Stripe webhook missing (user not upgraded) | LOW | Manually fetch subscription from Stripe API for affected user, update database, notify user their account is now corrected |
| Audio files stored as WAV not MP3 (storage cost issue) | MEDIUM | Write a migration script that converts existing WAVs to MP3, updates storage paths in DB, deletes originals; run off-peak hours |
| Signed URLs stored in DB are expired | LOW | Write a migration to clear `audio_url` column values (keep paths); update serving logic to generate fresh URLs; re-generate for active records |
| RunPod worker OOM crash during peak (memory leak) | LOW | Reduce max jobs per worker to 1; restart workers; temporarily increase minimum workers to compensate for lower throughput per worker |
| Turbo model distortion complaints | LOW | Deploy post-processing normalization step (FFmpeg loudnorm), reprocess any stored audio for affected users who reported issues |

---

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| ACE-Step memory leak kills workers | Infrastructure Setup | Run 5 sequential generation jobs; verify all succeed; check RunPod memory metrics |
| RunPod TTL kills in-flight jobs | Infrastructure Setup | Submit job with intentional 30-second delay; verify status tracking handles 404 gracefully |
| Credit deducted before success confirmed | Credit System | Simulate generation failure mid-job; verify credit is restored and user sees "not charged" message |
| Stripe webhook race condition | Payment Integration | Complete Stripe Checkout; verify plan updates before webhook fires (use sync endpoint) |
| Stripe webhook duplicate grants | Payment Integration | Replay a webhook event manually; verify credits granted only once |
| Vercel function timeout | Generation API | Deploy to Vercel (not just local); verify 3-minute generation completes without 504 |
| Audio distortion artifacts | Generation Integration | Generate rock + electronic genre songs; verify no audible clipping |
| WAV files too large | Generation Integration | Verify generated files are MP3/AAC, not WAV; check file size is under 15MB for 3-min song |
| Signed URL expiry | Storage Integration | Generate audio; wait 2 hours; verify download still works |
| Free tier abuse | Auth Phase | Verify disposable email domains are rejected at signup; verify rate limiting on generation endpoint |

---

## Sources

- ACE-Step 1.5 GitHub Issues: Memory leak #142, Distortion artifacts #298 — https://github.com/ace-step/ACE-Step-1.5/issues
- RunPod Endpoint Configuration (TTL, execution timeout, worker lifecycle) — https://docs.runpod.io/serverless/references/endpoint-configurations
- RunPod Optimization Guide — https://docs.runpod.io/serverless/development/optimization
- RunPod FlashBoot cold start announcement — https://www.runpod.io/blog/introducing-flashboot-serverless-cold-start
- Stripe Webhook Race Conditions (Pedro Alonso) — https://www.pedroalonso.net/blog/stripe-webhooks-solving-race-conditions/
- Billing Webhook Race Condition Solution Guide — https://excessivecoding.com/blog/billing-webhook-race-condition-solution-guide
- Stripe Webhook Idempotency Best Practices — https://www.stigg.io/blog-posts/best-practices-i-wish-we-knew-when-integrating-stripe-webhooks
- Building Reliable Stripe Subscriptions (NestJS idempotency patterns) — https://dev.to/aniefon_umanah_ac5f21311c/building-reliable-stripe-subscriptions-in-nestjs-webhook-idempotency-and-optimistic-locking-3o91
- Vercel Serverless Function Timeout Limits — https://community.vercel.com/t/next-js-api-routes-returns-504-gateway-timeout-while-working-locally/9222
- Supabase Concurrent Writes and Row Locking — https://bootstrapped.app/guide/how-to-handle-concurrent-writes-in-supabase
- AI SaaS Free Tier Bot Abuse (Castle.io) — https://blog.castle.io/how-bots-and-fraudsters-exploit-free-tiers-in-ai-saas/
- AI Engineering Pitfalls (Chip Huyen) — https://huyenchip.com/2025/01/16/ai-engineering-pitfalls.html
- AI SaaS Credits System Patterns — https://colorwhistle.com/ai-saas-credits-system/
- AWS S3 Presigned URL Best Practices — https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-presigned-url.html

---
*Pitfalls research for: AI Music Generation SaaS (ACE-Step 1.5 + Next.js + RunPod + Stripe)*
*Researched: 2026-03-03*
