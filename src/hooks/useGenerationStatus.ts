'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

type GenerationStatus = 'pending' | 'processing' | 'completed' | 'failed';

interface Output {
  id: string;
  variantIndex: number;
  r2Key: string;
  url: string | null;
  createdAt: string;
}

export interface StatusResult {
  jobId: string;
  status: GenerationStatus;
  startedAt: string;
  completedAt: string | null;
  failedAt: string | null;
  outputs: Output[];
  error: { category: string; retryable: boolean; message: string } | null;
}

interface UseGenerationStatusReturn {
  data: StatusResult | null;
  isPolling: boolean;
  elapsedSeconds: number;
  error: string | null;
}

export function useGenerationStatus(jobId: string | null): UseGenerationStatusReturn {
  const [data, setData] = useState<StatusResult | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (elapsedRef.current) clearInterval(elapsedRef.current);
    intervalRef.current = null;
    elapsedRef.current = null;
    setIsPolling(false);
  }, []);

  useEffect(() => {
    if (!jobId) return;

    setIsPolling(true);
    setElapsedSeconds(0);
    setError(null);
    setData(null);
    startTimeRef.current = Date.now();

    // Elapsed counter — updates every second
    elapsedRef.current = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);

    // Poll every 2.5 seconds
    const poll = async () => {
      try {
        const res = await fetch(`/api/status/${jobId}`);
        if (!res.ok) {
          setError('Failed to check generation status.');
          stopPolling();
          return;
        }
        const result = (await res.json()) as StatusResult;
        setData(result);
        if (result.status === 'completed' || result.status === 'failed') {
          stopPolling();
        }
      } catch {
        // Network error — keep polling (transient issue)
      }
    };

    poll(); // immediate first poll
    intervalRef.current = setInterval(poll, 2500);

    return () => stopPolling();
  }, [jobId, stopPolling]);

  return { data, isPolling, elapsedSeconds, error };
}
