'use client';

import { Download, Lock, Loader2, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { SongPlayer } from '@/app/quiz/success/[jobId]/_components/SongPlayer';

interface SongCardProps {
  recipientName: string;
  relationship: string;
  genre: string;
  status: 'generating' | 'completed' | 'failed';
  createdAt: string;       // ISO string — serialized from server component
  audioUrl: string | null;
  downloadUrl: string | null;
  downloadFilename: string;
  hasSubscription?: boolean;
}

export function SongCard({
  recipientName,
  relationship,
  genre,
  status,
  createdAt,
  audioUrl,
  downloadUrl,
  downloadFilename,
  hasSubscription = false,
}: SongCardProps) {
  const formattedDate = new Date(createdAt).toLocaleDateString();

  return (
    <div className="bg-card rounded-2xl border border-border p-6 flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <h2 className="font-display text-xl text-foreground">
            A song for {recipientName}
          </h2>
          {status === 'completed' && !hasSubscription && (
            <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              30s Preview
            </span>
          )}
          {status === 'generating' && (
            <span className="text-xs font-medium text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" />
              Generating
            </span>
          )}
          {status === 'failed' && (
            <span className="text-xs font-medium text-red-700 bg-red-100 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              Failed
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground capitalize">
          {relationship} · {genre} · {formattedDate}
        </p>
      </div>

      {status === 'completed' && audioUrl && (
        <SongPlayer src={audioUrl} isPreview={!hasSubscription} />
      )}

      {status === 'generating' && (
        <div className="flex items-center gap-3 py-4 text-sm text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
          <span>Your song is being created. This usually takes a few seconds.</span>
        </div>
      )}

      {status === 'failed' && (
        <div className="flex items-center gap-3 py-4 text-sm text-red-600">
          <AlertCircle className="w-5 h-5" />
          <span>Something went wrong generating this song.</span>
        </div>
      )}

      {status === 'completed' && (
        hasSubscription ? (
          <a
            href={downloadUrl ?? '#'}
            download={downloadFilename}
            className="inline-flex items-center justify-center gap-2 border border-border text-foreground px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-muted transition-colors"
          >
            <Download className="w-4 h-4" />
            Download
          </a>
        ) : (
          <Link
            href="/pricing"
            className="inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Lock className="w-4 h-4" />
            Subscribe to Unlock Full Song
          </Link>
        )
      )}

      {status === 'failed' && (
        <Link
          href="/quiz"
          className="inline-flex items-center justify-center gap-2 border border-border text-foreground px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-muted transition-colors"
        >
          Try Again
        </Link>
      )}
    </div>
  );
}
