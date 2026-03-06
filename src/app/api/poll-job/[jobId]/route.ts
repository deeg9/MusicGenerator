import { NextRequest, NextResponse } from 'next/server';
import { queryJobStatus } from '@/lib/heartmula';
import { classifyError, toErrorResponse } from '@/lib/errors';

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/poll-job/[jobId]
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Poll HeartMuLa for the status of a generation job.
 *
 * Returns { status, error } without exposing internal HeartMuLa URL.
 *
 * Error handling:
 * - gpu_unavailable (network error / ECONNREFUSED): 502 with structured error
 *   so the success page can distinguish "pod down" from "song still running"
 * - All other transient errors: returns status=QUEUED so the client keeps
 *   polling rather than showing an error for minor blips
 *
 * This replaces the v2.0 /api/status/[jobId] which queried the DB via Drizzle.
 * v3.0 has no DB access — all status comes from HeartMuLa directly.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
): Promise<NextResponse> {
  const { jobId } = await params;

  try {
    const result = await queryJobStatus(jobId);
    return NextResponse.json({ status: result.status, error: result.error_msg ?? null });
  } catch (rawError) {
    const classified = classifyError(rawError);
    console.error('[poll-job] queryJobStatus failed:', classified.technicalMessage);

    if (classified.category === 'gpu_unavailable') {
      // Pod is unreachable — caller needs to know this is a hard failure, not a blip
      return NextResponse.json(toErrorResponse(classified), { status: 502 });
    }

    // Truly transient (unknown category) — keep polling gracefully
    return NextResponse.json({ status: 'QUEUED', error: null });
  }
}
