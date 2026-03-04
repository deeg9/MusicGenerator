#!/usr/bin/env bash
# validate-acestep.sh
# Runs 5 validation tests against a live ACE-Step API endpoint.
# Usage: bash scripts/validate-acestep.sh [RUNPOD_URL]
#        Or set RUNPOD_URL env var before running.
#
# Requirements: curl, jq
# Each test polls /query_result until status=1 (done) or 90s timeout.

set -euo pipefail

# ──────────────────────────────────────────────────────────────
# Configuration
# ──────────────────────────────────────────────────────────────
RUNPOD_URL="${1:-${RUNPOD_URL:-}}"
POLL_INTERVAL=3     # seconds between status polls
POLL_TIMEOUT=90     # seconds before giving up on a single generation
RESULT_DONE=1       # status code meaning "complete"
RESULT_FAILED=2     # status code meaning "error"

# Colours (no-op if terminal doesn't support them)
RED="\033[0;31m"
GREEN="\033[0;32m"
YELLOW="\033[0;33m"
RESET="\033[0m"

# ──────────────────────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────────────────────
err() { echo -e "${RED}[ERROR]${RESET} $*" >&2; }
ok()  { echo -e "${GREEN}[PASS]${RESET}  $*"; }
warn(){ echo -e "${YELLOW}[WARN]${RESET}  $*"; }
info(){ echo "        $*"; }

require_cmd() {
  for cmd in "$@"; do
    command -v "$cmd" &>/dev/null || { err "Required command not found: $cmd"; exit 1; }
  done
}

check_prereqs() {
  require_cmd curl jq
  if [[ -z "$RUNPOD_URL" ]]; then
    err "RUNPOD_URL is not set."
    echo "Usage: $0 <RUNPOD_URL>   or   RUNPOD_URL=https://... $0"
    exit 1
  fi
  # Strip trailing slash
  RUNPOD_URL="${RUNPOD_URL%/}"
}

# POST to /release_task, return task_id
submit_task() {
  local payload="$1"
  local response
  response=$(curl -sf -X POST "${RUNPOD_URL}/release_task" \
    -H "Content-Type: application/json" \
    -d "$payload") || { err "POST /release_task failed (curl exit $?)"; return 1; }

  local task_id
  task_id=$(echo "$response" | jq -r '.data.task_id // .task_id // empty')
  if [[ -z "$task_id" ]]; then
    err "No task_id in response: $response"
    return 1
  fi
  echo "$task_id"
}

# Poll /query_result?task_id=... until done, failed, or timeout
# Returns: 0 on success, 1 on failure/timeout
# Echoes final result JSON on success
poll_task() {
  local task_id="$1"
  local start
  start=$(date +%s)

  while true; do
    local elapsed=$(( $(date +%s) - start ))
    if (( elapsed >= POLL_TIMEOUT )); then
      err "Timed out after ${POLL_TIMEOUT}s waiting for task_id=$task_id"
      return 1
    fi

    local response
    response=$(curl -sf -X POST "${RUNPOD_URL}/query_result" \
      -H "Content-Type: application/json" \
      -d "{\"task_id_list\":[\"${task_id}\"]}") || {
      warn "POST /query_result failed (elapsed ${elapsed}s), retrying..."
      sleep "$POLL_INTERVAL"
      continue
    }

    # Response: { data: [{ task_id, result: "JSON string", status }], code, error }
    local status result_json
    status=$(echo "$response" | jq -r '.data[0].status // -1')
    result_json=$(echo "$response" | jq -r '.data[0].result // "[]"')

    if [[ "$status" == "$RESULT_DONE" ]]; then
      # Parse the result JSON string and attach audio file paths
      local audio_urls
      audio_urls=$(echo "$result_json" | jq -r '[.[] | .file // empty]')
      echo "{\"status\":${status},\"audio_urls\":${audio_urls},\"raw_result\":${result_json}}"
      return 0
    elif [[ "$status" == "$RESULT_FAILED" ]]; then
      err "Task $task_id returned status=$status: $response"
      return 1
    fi

    sleep "$POLL_INTERVAL"
  done
}

# Run a single generation, return 0/1 for pass/fail and elapsed seconds via global
run_generation() {
  local label="$1"
  local payload="$2"
  local expected_audio_count="${3:-1}"  # how many audio URLs we expect

  local t_start t_end elapsed task_id result audio_count
  t_start=$(date +%s)

  echo ""
  echo "  Submitting: $label"

  task_id=$(submit_task "$payload") || return 1
  info "task_id=$task_id"

  result=$(poll_task "$task_id") || return 1
  t_end=$(date +%s)
  elapsed=$(( t_end - t_start ))

  # Count audio URLs in the result (field may be audio_urls or audio_url depending on version)
  audio_count=$(echo "$result" | jq '[
    (.data.audio_urls // .audio_urls // []),
    (if (.data.audio_url // .audio_url) then [(.data.audio_url // .audio_url)] else [] end)
  ] | add | length')

  info "Elapsed: ${elapsed}s"
  info "Audio URLs returned: ${audio_count}"

  if (( audio_count < expected_audio_count )); then
    err "Expected ${expected_audio_count} audio URL(s), got ${audio_count}"
    info "Full result: $(echo "$result" | jq .)"
    return 1
  fi

  # Surface any unexpected top-level fields for documentation
  local known_fields=("status" "task_id" "audio_urls" "audio_url" "error")
  local all_fields
  all_fields=$(echo "$result" | jq -r 'keys[]')
  while IFS= read -r field; do
    local found=0
    for k in "${known_fields[@]}"; do [[ "$field" == "$k" ]] && found=1; done
    (( found == 0 )) && warn "Unexpected field in response: $field"
  done <<< "$all_fields"

  LAST_ELAPSED=$elapsed
  return 0
}

# ──────────────────────────────────────────────────────────────
# Tests
# ──────────────────────────────────────────────────────────────
PASS_COUNT=0
FAIL_COUNT=0
TIMING_1="n/a" TIMING_2="n/a" TIMING_3="n/a" TIMING_4="n/a" TIMING_5="n/a"

set_timing() { eval "TIMING_$1=\"$2\""; }
get_timing() { eval "echo \"\$TIMING_$1\""; }

run_test() {
  local test_num="$1"
  local label="$2"
  local payload="$3"
  local expected_audio="${4:-1}"

  LAST_ELAPSED=0
  if run_generation "$label" "$payload" "$expected_audio"; then
    ok "Test $test_num — $label (${LAST_ELAPSED}s)"
    PASS_COUNT=$(( PASS_COUNT + 1 ))
    set_timing "$test_num" "${LAST_ELAPSED}s"
  else
    err "Test $test_num — $label FAILED"
    FAIL_COUNT=$(( FAIL_COUNT + 1 ))
    set_timing "$test_num" "FAILED"
  fi
}

# ──────────────────────────────────────────────────────────────
# Main
# ──────────────────────────────────────────────────────────────
main() {
  check_prereqs

  echo "=============================================="
  echo "  ACE-Step API Validation"
  echo "  Endpoint: $RUNPOD_URL"
  echo "  $(date -u)"
  echo "=============================================="

  # Test 1: Health check
  echo ""
  echo "Test 1: Health check"
  local t1_start
  t1_start=$(date +%s)
  local http_code
  http_code=$(curl -s -o /dev/null -w "%{http_code}" "${RUNPOD_URL}/health")
  if [[ "$http_code" == "200" ]]; then
    ok "Test 1 — Health check (GET /health) returned 200"
    PASS_COUNT=$(( PASS_COUNT + 1 ))
    set_timing 1 "$(( $(date +%s) - t1_start ))s"
  else
    err "Test 1 — Health check FAILED (non-200 or connection refused)"
    FAIL_COUNT=$(( FAIL_COUNT + 1 ))
    set_timing 1 "FAILED"
  fi

  # Test 2: Basic generation with custom lyrics
  run_test 2 "Basic generation with custom lyrics" \
    '{"prompt":"upbeat pop song, bright and cheerful","lyrics":"[Verse]\nTest lyrics line one\nTest lyrics line two\n\n[Chorus]\nTest chorus line","audio_duration":30,"batch_size":1}'

  # Test 3: Instrumental mode via [Instrumental] tag
  run_test 3 "Instrumental mode ([Instrumental] tag)" \
    '{"prompt":"ambient electronic, soft pads","lyrics":"[Instrumental]","audio_duration":30,"batch_size":1}'

  # Test 4: Dual variant (batch_size=2, expect 2 audio URLs)
  run_test 4 "Dual variant (batch_size=2)" \
    '{"prompt":"jazz piano, smooth","lyrics":"[Instrumental]","audio_duration":30,"batch_size":2}' 2

  # Test 5: Sequential stress test (5 generations back-to-back)
  echo ""
  echo "Test 5: Sequential stress test (5 × 30s generations)"
  local stress_pass=0 stress_fail=0
  for i in 1 2 3 4 5; do
    LAST_ELAPSED=0
    if run_generation "Stress #${i}" \
      '{"prompt":"cinematic orchestral, dramatic","lyrics":"[Instrumental]","audio_duration":30,"batch_size":1}'; then
      stress_pass=$(( stress_pass + 1 ))
      info "  Stress #${i}: PASS (${LAST_ELAPSED}s)"
    else
      stress_fail=$(( stress_fail + 1 ))
      info "  Stress #${i}: FAIL"
    fi

    # Health check between generations to detect unresponsive pod
    local hc_code
    hc_code=$(curl -s -o /dev/null -w "%{http_code}" "${RUNPOD_URL}/health")
    if [[ "$hc_code" != "200" ]]; then
      warn "Health check failed after stress generation #${i} — pod may have crashed"
    fi
  done

  if (( stress_fail == 0 )); then
    ok "Test 5 — Sequential stress test (5/5 passed)"
    PASS_COUNT=$(( PASS_COUNT + 1 ))
    set_timing 5 "${stress_pass}/5 passed"
  else
    err "Test 5 — Sequential stress test (${stress_fail}/5 failed)"
    FAIL_COUNT=$(( FAIL_COUNT + 1 ))
    set_timing 5 "${stress_pass}/5 passed"
  fi

  # ────────────────────────────────────────────────
  # Summary
  # ────────────────────────────────────────────────
  echo ""
  echo "=============================================="
  echo "  Results Summary"
  echo "=============================================="
  echo ""
  printf "  %-6s %-40s %s\n" "Test" "Name" "Result"
  printf "  %-6s %-40s %s\n" "------" "----------------------------------------" "----------"
  printf "  %-6s %-40s %s\n" "1" "Health check"                        "$(get_timing 1)"
  printf "  %-6s %-40s %s\n" "2" "Basic generation (custom lyrics)"    "$(get_timing 2)"
  printf "  %-6s %-40s %s\n" "3" "Instrumental mode"                   "$(get_timing 3)"
  printf "  %-6s %-40s %s\n" "4" "Dual variant (batch_size=2)"         "$(get_timing 4)"
  printf "  %-6s %-40s %s\n" "5" "Sequential stress (5 generations)"   "$(get_timing 5)"
  echo ""
  echo "  Passed: $PASS_COUNT / $(( PASS_COUNT + FAIL_COUNT ))"
  echo ""

  if (( FAIL_COUNT == 0 )); then
    echo -e "  ${GREEN}All tests passed.${RESET}"
    echo ""
    echo "  Next steps:"
    echo "  - Fill in docs/ACESTEP-VALIDATION.md with the timing data above"
    echo "  - If stress test passed: stock image is fine, skip custom Docker build"
    echo "  - If stress test failed: build docker/Dockerfile and redeploy"
    exit 0
  else
    echo -e "  ${RED}${FAIL_COUNT} test(s) failed.${RESET}"
    echo ""
    echo "  If stress test failed: pod is crashing under load (memory leak #142)."
    echo "  Build and deploy docker/Dockerfile with supervisord to auto-restart ACE-Step."
    exit 1
  fi
}

main "$@"
