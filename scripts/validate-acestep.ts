/**
 * validate-acestep.ts
 *
 * TypeScript validation script for the ACE-Step API.
 * Mirrors the 5 test scenarios from validate-acestep.sh, using the project's
 * runpod.ts client module once Plan 01 code is in place.
 *
 * Usage:
 *   RUNPOD_URL=https://{POD_ID}-8000.proxy.runpod.net npx tsx scripts/validate-acestep.ts
 *
 * Requires:
 *   - RUNPOD_URL environment variable
 *   - @/lib/runpod module (built in Plan 01-01)
 */

import { submitGenerationJob, queryJobStatus } from "@/lib/runpod";

// ──────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────

interface TestResult {
  testNumber: number;
  name: string;
  passed: boolean;
  elapsedMs: number;
  audioCount: number;
  error?: string;
  unexpectedFields?: string[];
}

interface GenerationPayload {
  prompt: string;
  lyrics: string;
  audio_duration: number;
  batch_size: number;
}

// ──────────────────────────────────────────────────────────────
// Config
// ──────────────────────────────────────────────────────────────

const RUNPOD_URL = process.env.RUNPOD_URL?.replace(/\/$/, "");
const POLL_TIMEOUT_MS = 90_000;
const POLL_INTERVAL_MS = 3_000;
const KNOWN_RESULT_FIELDS = new Set(["status", "task_id", "audio_urls", "audio_url", "error"]);

// ──────────────────────────────────────────────────────────────
// Core helpers
// ──────────────────────────────────────────────────────────────

function checkPrereqs(): void {
  if (!RUNPOD_URL) {
    console.error("[ERROR] RUNPOD_URL environment variable is not set.");
    console.error("Usage: RUNPOD_URL=https://... npx tsx scripts/validate-acestep.ts");
    process.exit(1);
  }
}

async function runGeneration(
  label: string,
  payload: GenerationPayload,
  expectedAudioCount = 1
): Promise<{ passed: boolean; elapsedMs: number; audioCount: number; error?: string; unexpectedFields?: string[] }> {
  const start = Date.now();

  console.log(`\n  Submitting: ${label}`);

  let taskId: string;
  try {
    const submitResponse = await submitGenerationJob({
      prompt: payload.prompt,
      lyrics: payload.lyrics,
      audioDuration: payload.audio_duration,
      batchSize: payload.batch_size,
    });
    taskId = submitResponse.task_id;
    console.log(`        task_id=${taskId}`);
  } catch (err) {
    return {
      passed: false,
      elapsedMs: Date.now() - start,
      audioCount: 0,
      error: `POST /release_task failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  // Poll until done or timeout
  const deadline = Date.now() + POLL_TIMEOUT_MS;
  let result: Record<string, unknown> | null = null;

  while (Date.now() < deadline) {
    try {
      const response = await queryJobStatus(taskId);
      const status = response?.status as number | undefined;

      if (status === 1) {
        result = response as Record<string, unknown>;
        break;
      } else if (status === 2) {
        return {
          passed: false,
          elapsedMs: Date.now() - start,
          audioCount: 0,
          error: `Task failed with status=2: ${JSON.stringify(response)}`,
        };
      }
    } catch (err) {
      console.warn(`        poll warning: ${err instanceof Error ? err.message : String(err)}`);
    }

    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }

  if (!result) {
    return {
      passed: false,
      elapsedMs: Date.now() - start,
      audioCount: 0,
      error: `Timed out after ${POLL_TIMEOUT_MS / 1000}s`,
    };
  }

  const elapsedMs = Date.now() - start;

  // Count audio URLs (handle both audio_urls array and audio_url string)
  const audioUrls = (result.audio_urls as string[] | undefined) ?? [];
  const audioUrl = result.audio_url as string | undefined;
  const allUrls = [...audioUrls, ...(audioUrl ? [audioUrl] : [])];
  const audioCount = allUrls.length;

  console.log(`        Elapsed: ${(elapsedMs / 1000).toFixed(1)}s`);
  console.log(`        Audio URLs returned: ${audioCount}`);

  // Surface unexpected fields for documentation
  const unexpectedFields: string[] = [];
  for (const field of Object.keys(result)) {
    if (!KNOWN_RESULT_FIELDS.has(field)) {
      unexpectedFields.push(field);
      console.warn(`        [WARN] Unexpected response field: ${field}`);
    }
  }

  if (audioCount < expectedAudioCount) {
    return {
      passed: false,
      elapsedMs,
      audioCount,
      error: `Expected ${expectedAudioCount} audio URL(s), got ${audioCount}`,
      unexpectedFields,
    };
  }

  return { passed: true, elapsedMs, audioCount, unexpectedFields };
}

// ──────────────────────────────────────────────────────────────
// Tests
// ──────────────────────────────────────────────────────────────

async function runTest(
  testNumber: number,
  name: string,
  payload: GenerationPayload,
  expectedAudioCount = 1
): Promise<TestResult> {
  const { passed, elapsedMs, audioCount, error, unexpectedFields } = await runGeneration(
    name,
    payload,
    expectedAudioCount
  );

  const status = passed ? "PASS" : "FAIL";
  console.log(`  [${status}] Test ${testNumber} — ${name} (${(elapsedMs / 1000).toFixed(1)}s)`);
  if (error) console.error(`        ${error}`);

  return { testNumber, name, passed, elapsedMs, audioCount, error, unexpectedFields };
}

async function runHealthCheck(): Promise<TestResult> {
  const start = Date.now();
  const name = "Health check (GET /)";

  try {
    const res = await fetch(`${RUNPOD_URL}/`);
    const passed = res.ok;
    const elapsedMs = Date.now() - start;
    console.log(`  [${passed ? "PASS" : "FAIL"}] Test 1 — ${name} (status=${res.status})`);
    return { testNumber: 1, name, passed, elapsedMs, audioCount: 0 };
  } catch (err) {
    const elapsedMs = Date.now() - start;
    const error = `Connection failed: ${err instanceof Error ? err.message : String(err)}`;
    console.error(`  [FAIL] Test 1 — ${name}: ${error}`);
    return { testNumber: 1, name, passed: false, elapsedMs, audioCount: 0, error };
  }
}

async function runStressTest(): Promise<TestResult> {
  const name = "Sequential stress test (5 generations)";
  console.log(`\nTest 5: ${name}`);

  let passCount = 0;
  let totalElapsedMs = 0;

  for (let i = 1; i <= 5; i++) {
    const { passed, elapsedMs } = await runGeneration(
      `Stress #${i}`,
      { prompt: "cinematic orchestral, dramatic", lyrics: "[Instrumental]", audio_duration: 30, batch_size: 1 },
      1
    );

    if (passed) {
      passCount++;
      console.log(`        Stress #${i}: PASS (${(elapsedMs / 1000).toFixed(1)}s)`);
    } else {
      console.error(`        Stress #${i}: FAIL`);
    }
    totalElapsedMs += elapsedMs;

    // Health check between generations
    try {
      const health = await fetch(`${RUNPOD_URL}/`);
      if (!health.ok) {
        console.warn(`        [WARN] Health check failed after stress #${i} — pod may have crashed`);
      }
    } catch {
      console.warn(`        [WARN] Health check connection refused after stress #${i}`);
    }
  }

  const passed = passCount === 5;
  console.log(`  [${passed ? "PASS" : "FAIL"}] Test 5 — ${name} (${passCount}/5 passed)`);

  return {
    testNumber: 5,
    name,
    passed,
    elapsedMs: totalElapsedMs,
    audioCount: passCount,
    error: passed ? undefined : `${5 - passCount}/5 stress generations failed`,
  };
}

// ──────────────────────────────────────────────────────────────
// Main
// ──────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  checkPrereqs();

  console.log("==============================================");
  console.log("  ACE-Step API Validation (TypeScript)");
  console.log(`  Endpoint: ${RUNPOD_URL}`);
  console.log(`  ${new Date().toISOString()}`);
  console.log("==============================================");

  const results: TestResult[] = [];

  // Test 1: Health check
  console.log("\nTest 1: Health check");
  results.push(await runHealthCheck());

  // Test 2: Basic generation with custom lyrics
  console.log("\nTest 2: Basic generation with custom lyrics");
  results.push(
    await runTest(2, "Basic generation with custom lyrics", {
      prompt: "upbeat pop song, bright and cheerful",
      lyrics: "[Verse]\nTest lyrics line one\nTest lyrics line two\n\n[Chorus]\nTest chorus line",
      audio_duration: 30,
      batch_size: 1,
    })
  );

  // Test 3: Instrumental mode
  console.log("\nTest 3: Instrumental mode ([Instrumental] tag)");
  results.push(
    await runTest(3, "Instrumental mode ([Instrumental] tag)", {
      prompt: "ambient electronic, soft pads",
      lyrics: "[Instrumental]",
      audio_duration: 30,
      batch_size: 1,
    })
  );

  // Test 4: Dual variant
  console.log("\nTest 4: Dual variant (batch_size=2)");
  results.push(
    await runTest(4, "Dual variant (batch_size=2)", {
      prompt: "jazz piano, smooth",
      lyrics: "[Instrumental]",
      audio_duration: 30,
      batch_size: 2,
    }, 2)
  );

  // Test 5: Sequential stress
  results.push(await runStressTest());

  // ─────────────────────────────────────────────
  // Summary
  // ─────────────────────────────────────────────
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  console.log("\n==============================================");
  console.log("  Results Summary");
  console.log("==============================================\n");
  console.log("  Test   Name                                       Result");
  console.log("  -----  -----------------------------------------  ----------");
  for (const r of results) {
    const status = r.passed ? `PASS (${(r.elapsedMs / 1000).toFixed(1)}s)` : "FAIL";
    console.log(`  ${String(r.testNumber).padEnd(6)} ${r.name.padEnd(49)} ${status}`);
  }
  console.log(`\n  Passed: ${passed} / ${results.length}`);

  if (failed === 0) {
    console.log("\n  All tests passed.");
    console.log("  - Fill in docs/ACESTEP-VALIDATION.md with timing data above");
    console.log("  - If stress test passed: stock image works, skip custom Docker build");
  } else {
    console.log(`\n  ${failed} test(s) failed.`);
    if (!results.find((r) => r.testNumber === 5)?.passed) {
      console.log("  Stress test failed — pod is likely crashing (memory leak #142).");
      console.log("  Build docker/Dockerfile and redeploy with supervisord.");
    }
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("[FATAL]", err);
  process.exit(1);
});
