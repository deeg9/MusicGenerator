# RunPod Serverless Migration

> Migrate HeartBula from a persistent A40 pod to RunPod Serverless for auto-scaling and massive cost savings.

**Status:** Implemented (Phases 33-34 complete)
**Date:** 2026-03-09

---

## Architecture

```
Quiz UI → /api/quiz-generate → RunPod Serverless /run
                                     ↓
                              HeartMuLa 3B (A40 GPU)
                                     ↓
                              WAV → ffmpeg → MP3
                                     ↓
                              Upload both to R2
                                     ↓
Poll UI → /api/poll-job → RunPod /status/{id}
                              ↓
                        Read R2 keys from output
                        Update song DB row
                              ↓
Audio UI → /api/audio → R2 presigned URL redirect
```

---

## Cost Comparison

| Songs/Day | Persistent Pod (A40) | Serverless Flex (A40) | Savings |
|-----------|---------------------|-----------------------|---------|
| 50 | $252/mo | **$3.57/mo** | 70x |
| 200 | $252/mo | **$14.28/mo** | 17.6x |
| 1,000 | $252/mo | **$71.40/mo** | 3.5x |

Per-song cost: **$0.00238** (~0.2 cents)

---

## Files Changed

| File | Change |
|------|--------|
| `docker/serverless/handler.py` | **New** — RunPod handler: load model, generate, convert, upload R2 |
| `docker/serverless/Dockerfile` | **New** — CUDA 12.1 + heartlib + baked model weights |
| `src/env.ts` | `HEARTMULA_URL` → `RUNPOD_API_KEY` + `RUNPOD_ENDPOINT_ID` |
| `src/lib/heartmula.ts` | Rewritten for RunPod Serverless API |
| `src/app/api/quiz-generate/route.ts` | Pass `songId` to `submitGenerationJob()` |
| `src/app/api/poll-job/[jobId]/route.ts` | Simplified: read R2 keys from RunPod output |
| `src/app/api/audio/[jobId]/route.ts` | Simplified: R2-only, no HeartBula proxy fallback |
| `.env.local.example` | Updated credential names |

### Removed Functions
- `enhancePrompt()` — Gemini handles this via `quiz-prompt.ts`
- `fetchAudioBuffer()` — handler uploads to R2 directly

---

## RunPod Serverless API

### Submit Job
```
POST https://api.runpod.ai/v2/{ENDPOINT_ID}/run
Authorization: Bearer {API_KEY}

{
  "input": {
    "lyrics": "[Verse]\nHappy birthday...",
    "tags": "piano,happy,birthday",
    "duration_ms": 30000,
    "song_id": "uuid-for-r2-keys"
  }
}

→ { "id": "runpod-job-id", "status": "IN_QUEUE" }
```

### Poll Status
```
GET https://api.runpod.ai/v2/{ENDPOINT_ID}/status/{job_id}
Authorization: Bearer {API_KEY}

→ {
    "status": "COMPLETED",
    "output": {
      "r2_wav_key": "songs/{song_id}/audio.wav",
      "r2_mp3_key": "songs/{song_id}/audio.mp3"
    }
  }
```

### Status Mapping
| RunPod | Internal |
|--------|----------|
| IN_QUEUE | QUEUED |
| IN_PROGRESS | PROCESSING |
| COMPLETED | COMPLETED |
| FAILED / CANCELLED / TIMED_OUT | FAILED |

---

## Endpoint Configuration

| Setting | Value |
|---------|-------|
| GPU | A40 (48GB VRAM) |
| Worker type | Flex |
| Max workers | 5 |
| Idle timeout | 30s |
| Execution timeout | 120s |
| FlashBoot | Enabled |
| Scaling strategy | Request Count (1) |

---

## Deployment Steps

1. Build Docker image: `docker build -t notevra/heartmula-serverless docker/serverless/`
2. Push to Docker Hub: `docker push notevra/heartmula-serverless:latest`
3. Create RunPod Serverless Endpoint with image
4. Set endpoint env vars: `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `CLOUDFLARE_ACCOUNT_ID`
5. Add `RUNPOD_API_KEY` and `RUNPOD_ENDPOINT_ID` to `.env.local`
6. Test via curl, then end-to-end through quiz funnel

---

## Rollback

Persistent pod stays running through testing. To rollback:
1. Revert `.env.local` to `HEARTMULA_URL`
2. `git revert` the heartmula.ts and route changes
3. Pod is unchanged and ready
