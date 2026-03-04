# ACE-Step API Validation Results

> Validated manually against live RunPod pod on 2026-03-04.
> This document is the authoritative reference for Phase 2 development.

---

## Test Environment

| Field               | Value                                |
|---------------------|--------------------------------------|
| Date                | 2026-03-04                           |
| GPU type            | RTX PRO 4500 (32 GB VRAM)           |
| Pod ID              | zwysa4aou3a8it                       |
| Docker image        | valyriantech/ace-step-1.5 (stock)    |
| ACE-Step version    | 1.0 (from /health response)         |
| Validation method   | Manual curl + Next.js API routes     |

---

## API Field Confirmation

These field names are what the ACE-Step REST API actually accepts and returns.

### Request Fields (POST /release_task)

| Field              | Expected             | Actual               | Notes                     |
|--------------------|----------------------|----------------------|---------------------------|
| Style/vibe input   | `prompt`             | `prompt`             | Works as expected         |
| Lyrics input       | `lyrics`             | `lyrics`             | `[Instrumental]` for no vocals |
| Duration           | `audio_duration`     | `audio_duration`     | In seconds (int)          |
| Variants count     | `batch_size`         | `batch_size`         | 2 = two variants          |
| Task ID returned   | `task_id`            | `data.task_id`       | Nested in `data` envelope |

### Response Fields (POST /query_result)

| Field              | Expected             | Actual               | Notes                     |
|--------------------|----------------------|----------------------|---------------------------|
| Request body       | `task_id`            | `task_id_list: [...]`| Array, not single string  |
| Status (in-progress)| `status: 0`         | `data[0].status: 0`  | Nested in data array      |
| Status (done)      | `status: 1`          | `data[0].status: 1`  | Nested in data array      |
| Status (failed)    | `status: 2`          | `data[0].status: 2`  | Nested in data array      |
| Audio URL(s)       | `audio_urls: [...]`  | `data[0].result` (JSON string) | Must JSON.parse, then read `.file` from each item |
| Any unexpected fields | —                 | `generation_info` in each result item | Contains BPM, key info |

### Additional Endpoints Discovered

| Endpoint                | Method | Purpose                                    |
|-------------------------|--------|--------------------------------------------|
| `GET /health`           | GET    | Health check (returns `{"data":{"status":"ok"}}`) |
| `GET /v1/stats`         | GET    | Job statistics (total, queued, running, succeeded, failed) |
| `GET /v1/audio?path=`   | GET    | Serve generated audio file by path         |
| `POST /format_input`    | POST   | LLM-enhanced lyrics/caption formatting     |
| `GET /v1/models`        | GET    | List available models                      |

---

## Instrumental Mode

**Mechanism tested:** `[Instrumental]` tag in lyrics field

| Test              | Expected                    | Actual                     |
|-------------------|-----------------------------|----------------------------|
| Input             | `lyrics: "[Instrumental]"`  | `lyrics: "[Instrumental]"` |
| Output            | No audible vocals           | Confirmed: no vocals       |
| Status returned   | `status: 1`                 | `status: 1`                |

**Notes:** The `format_input` endpoint also returns `[Instrumental]` for instrumental-style prompts, confirming this is the standard mechanism.

---

## Custom Lyrics

**Mechanism tested:** Structured lyrics with `[Verse]` / `[Chorus]` tags

| Test              | Expected                    | Actual                     |
|-------------------|-----------------------------|----------------------------|
| Input tags        | `[Verse]`, `[Chorus]`       | `[Verse]`, `[Chorus]`      |
| Lyrics reflected  | Words appear in vocals       | Yes — lyrics are followed  |
| Status returned   | `status: 1`                 | `status: 1`                |

**Notes:** Structured tags `[Verse]` and `[Chorus]` are recognized. The `format_input` endpoint can enhance user-provided lyrics with proper structure and metadata (BPM, key, time signature).

---

## Timing Data

Generation timing for 30-second tracks on RTX PRO 4500 (32 GB VRAM).

| Test                               | Duration   | Status   |
|------------------------------------|------------|----------|
| Health check (GET /health)         | <1s        | pass     |
| Basic generation (30s, lyrics)     | ~7s        | pass     |
| Instrumental mode (30s)            | ~7s        | pass     |
| Dual variant (batch_size=2, 30s)   | ~7s        | pass     |

**Average generation time (from /v1/stats):** 6.9s across 8 jobs
**Note:** All 8 jobs succeeded with 0 failures.

---

## Memory Leak Observations

ACE-Step has a confirmed memory leak (GitHub issue #142). Observations from validation:

| Observation                             | Result                        |
|-----------------------------------------|-------------------------------|
| Pod responded after all test generations | Yes                          |
| Any health check failures between tests | 0                            |
| Custom Docker image required            | No (stock image stable)       |
| Supervisord restart triggered           | N/A (using stock image)       |

**Notes:** With RTX PRO 4500 (32 GB VRAM), the stock image is stable across multiple sequential generations. The Docker/supervisord config is ready as a fallback if the memory leak manifests under heavier load. Previous testing showed RTX 3090 (24 GB) and RTX 4090 (24 GB) OOM on the 5Hz LLM component — 32+ GB VRAM is required.

---

## Open Issues

| # | Issue                         | Severity    | Resolution / Workaround         |
|---|-------------------------------|-------------|----------------------------------|
| 1 | R2 presigned URLs return 403  | Medium      | R2 API token needs "Object Read" permission — config fix in Cloudflare Dashboard |
| 2 | `query_result` uses `task_id_list` not `task_id` | Resolved | Fixed in `src/lib/runpod.ts` (commit bbd90ff) and `scripts/validate-acestep.sh` |
| 3 | Response envelope nesting     | Resolved    | All responses wrap in `{data: ..., code, error}` — client handles this |

---

## Phase 2 Reference

**Confirmed working parameters for Phase 2 development:**

```json
{
  "prompt": "style/vibe description string",
  "lyrics": "[Verse]\\nLyric line\\n\\n[Chorus]\\nChorus line",
  "audio_duration": 30,
  "batch_size": 2
}
```

**For instrumental:** Set `lyrics` to `"[Instrumental]"`

**Polling timeout recommendation:** 15s (P95 ~7s + 100% buffer)

**Instrumental mechanism:** `lyrics: "[Instrumental]"` — confirmed working

**Custom lyrics mechanism:** Structured tags `[Verse]`, `[Chorus]` in lyrics field — confirmed working

**Audio retrieval:** `JSON.parse(data[0].result)` → array of `{file: "/path/to/audio.wav"}` → fetch via `GET ${RUNPOD_URL}${file}`

---

*Validated manually on 2026-03-04 against live RunPod pod zwysa4aou3a8it*
