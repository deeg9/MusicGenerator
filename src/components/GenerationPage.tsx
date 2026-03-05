'use client';

import { useState } from 'react';
import { GenerationForm, type GenerationFormData } from './GenerationForm';
import { GenerationResults } from './GenerationResults';

export function GenerationPage() {
  const [jobId, setJobId] = useState<string | null>(null);
  const [enhancedCaption, setEnhancedCaption] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(data: GenerationFormData) {
    setIsSubmitting(true);
    setJobId(null); // Clear previous results (prevents stale poll)
    setEnhancedCaption(null);

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const errorBody = await res.json().catch(() => null);
        const message = errorBody?.error?.message ?? 'Failed to start generation.';
        alert(message); // Simple for Phase 2; Phase 4 replaces with toast
        return;
      }

      const result = await res.json();
      setJobId(result.jobId);
      setEnhancedCaption(result.enhancedCaption ?? null);
    } catch {
      alert('Network error. Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="mx-auto max-w-2xl px-4 py-12">
        <header className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight">MusicGenerator</h1>
          <p className="mt-2 text-zinc-400">Create your own song in seconds</p>
        </header>

        <GenerationForm onSubmit={handleSubmit} isSubmitting={isSubmitting} />

        <div className="mt-8">
          <GenerationResults jobId={jobId} enhancedCaption={enhancedCaption} />
        </div>
      </div>
    </div>
  );
}
