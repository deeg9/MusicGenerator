# ACE-Step API Validation Results

> Run `bash scripts/validate-acestep.sh $RUNPOD_URL` then fill in the **Actual** columns below.
> This document is the authoritative reference for Phase 2 development.

---

## Test Environment

| Field               | Value                        |
|---------------------|------------------------------|
| Date                | _(fill in after running)_    |
| GPU type            | _(e.g., RTX 3090 / RTX 4090)_|
| Pod ID              | _(RunPod pod ID)_            |
| Docker image        | _(valyriantech/ace-step-1.5 or custom)_|
| ACE-Step version    | _(check /workspace or image tag)_|
| Validation script   | scripts/validate-acestep.sh  |

---

## API Field Confirmation

These field names are what the ACE-Step REST API actually accepts and returns.
The shell script will surface any unexpected fields automatically.

### Request Fields (POST /release_task)

| Field              | Expected             | Actual               | Notes                     |
|--------------------|----------------------|----------------------|---------------------------|
| Style/vibe input   | `prompt`             | _(fill in)_          | May be `caption` in older versions |
| Lyrics input       | `lyrics`             | _(fill in)_          |                           |
| Duration           | `audio_duration`     | _(fill in)_          | In seconds (int)          |
| Variants count     | `batch_size`         | _(fill in)_          | 1 or 2                    |
| Task ID returned   | `task_id`            | _(fill in)_          | String UUID               |

### Response Fields (GET /query_result?task_id=...)

| Field              | Expected             | Actual               | Notes                     |
|--------------------|----------------------|----------------------|---------------------------|
| Status (in-progress)| `status: 0`         | _(fill in)_          |                           |
| Status (done)      | `status: 1`          | _(fill in)_          |                           |
| Status (failed)    | `status: 2`          | _(fill in)_          |                           |
| Audio URL(s)       | `audio_urls: [...]`  | _(fill in)_          | May be `audio_url` (string) |
| Any unexpected fields | —                 | _(fill in)_          | Script reports these automatically |

---

## Instrumental Mode

**Mechanism tested:** `[Instrumental]` tag in lyrics field (vs. empty string)

| Test              | Expected                    | Actual                     |
|-------------------|-----------------------------|----------------------------|
| Input             | `lyrics: "[Instrumental]"`  | _(fill in)_                |
| Output            | No audible vocals           | _(fill in: vocals absent?) |
| Status returned   | `status: 1`                 | _(fill in)_                |

**Notes:** _(Add any observations here — e.g., if empty lyrics also works, or if a different tag is required)_

---

## Custom Lyrics

**Mechanism tested:** Structured lyrics with `[Verse]` / `[Chorus]` tags

| Test              | Expected                    | Actual                     |
|-------------------|-----------------------------|----------------------------|
| Input tags        | `[Verse]`, `[Chorus]`       | _(fill in)_                |
| Lyrics reflected  | Words appear in vocals       | _(fill in: yes/no/partial) |
| Status returned   | `status: 1`                 | _(fill in)_                |

**Notes:** _(Add observations — e.g., which tags are recognized, whether lyrics are followed precisely)_

---

## Timing Data

Generation timing for 30-second tracks on this GPU/image combination.

| Test                               | Duration   | Status   |
|------------------------------------|------------|----------|
| Test 1: Health check               | _(fill in)_| _(pass/fail)_ |
| Test 2: Basic generation (30s)     | _(fill in)_| _(pass/fail)_ |
| Test 3: Instrumental mode (30s)    | _(fill in)_| _(pass/fail)_ |
| Test 4: Dual variant (30s ×2)      | _(fill in)_| _(pass/fail)_ |
| Test 5: Stress #1 (30s)            | _(fill in)_| _(pass/fail)_ |
| Test 5: Stress #2 (30s)            | _(fill in)_| _(pass/fail)_ |
| Test 5: Stress #3 (30s)            | _(fill in)_| _(pass/fail)_ |
| Test 5: Stress #4 (30s)            | _(fill in)_| _(pass/fail)_ |
| Test 5: Stress #5 (30s)            | _(fill in)_| _(pass/fail)_ |

**P50 generation time (30s track):** _(fill in)_
**P95 generation time (30s track):** _(fill in)_

---

## Memory Leak Observations

ACE-Step has a confirmed memory leak (GitHub issue #142). This section documents whether it manifested during validation.

| Observation                             | Result                        |
|-----------------------------------------|-------------------------------|
| Pod responded after all 5 stress tests  | _(fill in: yes / no)_         |
| Any health check failures between tests | _(fill in: count)_            |
| Custom Docker image required            | _(fill in: yes / no)_         |
| Supervisord restart triggered           | _(fill in: yes / no / N/A)_   |

**Notes:** _(Describe what happened during stress test — any OOM errors, pod unresponsiveness, or auto-recovery events)_

---

## Open Issues

> Track any unexpected behavior found during validation that affects Phase 2 implementation.

| # | Issue                         | Severity    | Resolution / Workaround         |
|---|-------------------------------|-------------|----------------------------------|
| — | _(fill in if any found)_      | —           | —                                |

**Examples of issues to record:**
- Field name differs from expected (e.g., `caption` instead of `prompt`)
- Different status codes than expected
- Audio URL structure different from expected
- Duration parameter behaves differently (e.g., seconds vs. milliseconds)
- Any error response format details

---

## Phase 2 Reference

**Confirmed working parameters for Phase 2 development:**

```json
{
  "prompt": "_(confirmed field name)_",
  "lyrics": "_(confirmed field name)_",
  "audio_duration": 30,
  "batch_size": 2
}
```

**Polling timeout recommendation:** _(Based on P95 timing above + 20% buffer — fill in after validation)_

**Instrumental mechanism:** _(fill in confirmed approach)_

**Custom lyrics mechanism:** _(fill in confirmed approach)_

---

*Generated by scripts/validate-acestep.sh — fill in Actual columns after running against live pod*
