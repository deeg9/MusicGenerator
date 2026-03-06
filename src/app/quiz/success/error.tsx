'use client';

import { useEffect } from 'react';
import { RefreshCw, Home } from 'lucide-react';

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function SuccessErrorBoundary({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[SuccessErrorBoundary]', error);
    }
  }, [error]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-16">
      <div className="flex flex-col items-center gap-6 max-w-sm text-center">
        <div className="w-16 h-16 rounded-full bg-yellow-100 flex items-center justify-center">
          <RefreshCw className="w-8 h-8 text-yellow-600" />
        </div>

        <div className="flex flex-col gap-2">
          <h1 className="font-display text-2xl text-foreground">
            Something went wrong
          </h1>
          <p className="text-muted-foreground text-sm">
            We hit a snag delivering your song. Your quiz answers are saved — try again and
            we&apos;ll get it right.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full">
          <button
            onClick={reset}
            className="flex-1 inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-xl font-medium hover:opacity-90 transition-opacity"
          >
            <RefreshCw className="w-4 h-4" />
            Try again
          </button>

          <a
            href="/"
            className="flex-1 inline-flex items-center justify-center gap-2 border border-border text-foreground px-6 py-3 rounded-xl font-medium hover:bg-muted transition-colors"
          >
            <Home className="w-4 h-4" />
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}
