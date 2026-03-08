# RunPod Serverless Migration Plan

> Migrate HeartBula from a persistent A40 pod to RunPod Serverless for auto-scaling and massive cost savings.

**Status:** Research / Planning
**Date:** 2026-03-06

---

## Why Migrate?

| Problem | Impact |
|---------|--------|
| Persistent pod runs 24/7 | $252/month even with 0 songs |
| Single worker, sequential queue | 200 songs = 23 min wait for last user |
| No auto-scaling | Can't handle traffic spikes |
| Manual pod management | Restart on crash, monitor uptime |

---

## Cost Comparison

Generation time: **~7 seconds per song** on A40.

| Songs/Day | Persistent Pod (A40) | Serverless Flex (A40) | Savings |
|-----------|---------------------|-----------------------|---------|
| 50 | $252/mo | **$3.57/mo** | 70x cheaper |
| 200 | $252/mo | **$14.28/mo** | 17.6x cheaper |
| 1,000 | $252/mo | **$71.40/mo** | 3.5x cheaper |
| 3,529 | $252/mo | $252/mo | Break-even |

**At our expected volume (couple hundred/day), serverless saves ~$230/month.**

---

## How RunPod Serverless Works

1. Client sends request to `POST /run` with job input
2. Request enters RunPod's managed queue
3. RunPod auto-scales workers (0 to 1000+) based on queue depth
4. Worker processes job via a handler function (not a FastAPI server)
5. Client polls `GET /status/{job_id}` or uses webhook for result

### Key Differences from Persistent Pods

| Aspect | Persistent Pod (Current) | Serverless |
|--------|-------------------------|------------|
| Billing | Per-hour, always on | Per-second, only when processing |
| Scaling | Manual (1 worker) | Auto (0 to 1000+ workers) |
| API pattern | FastAPI server (custom routes) | RunPod handler function |
| State | Persistent filesystem | Stateless (use R2 for audio) |
| SSH access | Yes | No |
| Cold start | None (always running) | ~2s with FlashBoot enabled |

---

## Serverless GPU Pricing (A40)

| Worker Type | Rate | When Billed |
|-------------|------|-------------|
| **Flex** | $0.00034/sec ($1.22/hr) | Only during active processing |
| **Active** | $0.00024/sec ($0.86/hr) | 24/7 (always warm, no cold start) |

**Flex is ideal for us** — we only pay for the ~7 seconds each song takes to generate.

Per-song cost: **$0.00238** (~0.2 cents per song)

---

## Cold Start

| Scenario | Latency |
|----------|---------|
| Flex worker (no FlashBoot) | ~42 seconds |
| Flex worker (FlashBoot enabled) | **~2 seconds** (P90) |
| Active worker (always warm) | **0 seconds** |

**Recommendation:** Use Flex workers + FlashBoot. Total user wait = ~9 seconds (2s cold start + 7s generation). Acceptable for a song gift service.

If cold start becomes a problem at scale, set `idle_timeout` higher (e.g., 60s) so workers stay warm between bursts.

---

## What Changes

### Server-Side: Handler Pattern

RunPod Serverless does NOT run a FastAPI server. We need a `handler.py` wrapper:

```python
import runpod

# Model loads ONCE per worker lifecycle (at boot)
model = load_heartmula_model()

def handler(job):
    input_data = job["input"]

    # Generate audio
    result = model.generate(
        prompt=input_data["prompt"],
        lyrics=input_data.get("lyrics", ""),
        duration_ms=input_data.get("duration_ms", 30000),
    )

    # Upload to R2 (workers are stateless — no local file persistence)
    audio_url = upload_to_r2(result)

    return {"audio_url": audio_url}

runpod.serverless.start({"handler": handler})
```

### Dockerfile

```dockerfile
FROM nvidia/cuda:12.1-runtime-ubuntu22.04

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN pip install runpod

COPY handler.py .
# Copy HeartBula model code/weights

CMD ["python3", "-u", "handler.py"]
```

### Client-Side: `heartmula.ts` Changes

Current endpoints → new RunPod Serverless endpoints:

| Current | Serverless |
|---------|------------|
| `POST {HEARTMULA_URL}/generate/music` | `POST https://api.runpod.ai/v2/{ENDPOINT_ID}/run` |
| `GET {HEARTMULA_URL}/jobs/{jobId}` | `GET https://api.runpod.ai/v2/{ENDPOINT_ID}/status/{jobId}` |
| `GET {HEARTMULA_URL}/download_track/{jobId}` | Not needed — handler uploads to R2, returns URL |

New request format:
```json
{
  "input": {
    "prompt": "A birthday song for Sarah",
    "lyrics": "Happy birthday dear Sarah...",
    "duration_ms": 30000
  }
}
```

New response format:
```json
{
  "id": "abc-123",
  "status": "COMPLETED",
  "output": { "audio_url": "https://r2.example.com/track.mp3" }
}
```

**Status values change:**
- Current: `QUEUED`, `PROCESSING`, `COMPLETED`, `FAILED`
- Serverless: `IN_QUEUE`, `IN_PROGRESS`, `COMPLETED`, `FAILED`, `TIMED_OUT`, `CANCELLED`

Authentication header required:
```
Authorization: Bearer RUNPOD_API_KEY
```

### Alternative: `/runsync` for Instant Response

Since generation takes ~7s, we could use the synchronous endpoint instead of poll-based:

```
POST /runsync
→ Blocks until complete (up to 90s)
→ Returns result in single request
```

This simplifies the client — no polling loop needed. But it ties up the HTTP connection for 7+ seconds, which may not be ideal at scale.

---

## Scaling Behavior

### Auto-Scaling Strategy

**Request Count Scaling** (recommended for us):
- Formula: `ceil((queued + in_progress) / scaler_value)`
- With `scaler_value = 1`: one worker per request = maximum parallelism
- 200 concurrent requests = 200 workers = all songs generate simultaneously

### Configuration

| Setting | Recommended Value | Why |
|---------|------------------|-----|
| Min active workers | 0 | Save cost, accept ~2s cold start |
| Max workers | 20 | Cap costs; handles 20 simultaneous songs |
| Idle timeout | 30s | Keep workers warm during bursts |
| Scaling strategy | Request Count (1) | One worker per song |
| FlashBoot | Enabled | Reduce cold start to ~2s |
| Execution timeout | 60s | Generous buffer over 7s generation |

---

## Migration Steps

### Phase 1: Build Serverless Handler
- [ ] Get HeartBula's Python model loading code
- [ ] Write `handler.py` wrapper with R2 upload
- [ ] Build Docker image with model weights + handler
- [ ] Push to Docker Hub

### Phase 2: Deploy & Test on RunPod
- [ ] Create Serverless Endpoint in RunPod console
- [ ] Select A40 GPU, configure scaling
- [ ] Enable FlashBoot
- [ ] Test generation via RunPod API
- [ ] Validate audio quality matches persistent pod

### Phase 3: Update Notevra Client
- [ ] Add `RUNPOD_API_KEY` and `RUNPOD_ENDPOINT_ID` to `.env.local`
- [ ] Update `heartmula.ts` to use RunPod Serverless API
- [ ] Update status mapping (`IN_QUEUE` → `QUEUED`, etc.)
- [ ] Remove `download_track` flow (handler uploads to R2 directly)
- [ ] Test end-to-end: quiz → generate → song delivery

### Phase 4: Cutover
- [ ] Switch production to serverless endpoint
- [ ] Monitor costs and cold start times
- [ ] Terminate persistent A40 pod
- [ ] Clean up other 3 paused pods ($0.03/hr wasted)

---

## Limits & Gotchas

| Limit | Value |
|-------|-------|
| Max payload (async) | 10 MB |
| Max execution timeout | 7 days (default 10 min) |
| Result retention (async) | 30 minutes |
| Rate limit (/run) | 1000 req/10sec |
| Max workers | 1000+ |

- **Workers are stateless** — generated audio must be uploaded to R2 inside the handler, not stored locally
- **No SSH** — can't debug live workers; use RunPod logging
- **Result expiry** — async results vanish after 30 min; use webhooks or poll promptly
- **`torch.compile` warmup** — first inference on a cold worker takes longer; consider disabling `torch_compile` for serverless since workers are short-lived

---

## Open Questions

1. **HeartBula model code access** — do we have the Python source to create a handler, or is it only available as the pre-built Docker image?
2. **Model weights size** — affects cold start time and Docker image size
3. **`torch_compile`** — should we disable it for serverless? Compilation overhead hurts on short-lived workers
4. **LLM component** — does HeartBula's prompt enhancement run on CPU or GPU? If CPU, that part could run separately
5. **Webhook vs polling** — do we want RunPod to POST results to us, or keep polling?

---

*Research sources: [RunPod Serverless Docs](https://docs.runpod.io/serverless), [RunPod Pricing](https://www.runpod.io/pricing), [FlashBoot Blog](https://www.runpod.io/blog/introducing-flashboot-serverless-cold-start)*
