'use client';

import { Download, Lock } from 'lucide-react';
import Link from 'next/link';
import { SongPlayer } from '@/app/quiz/success/[jobId]/_components/SongPlayer';

interface SongCardProps {
  recipientName: string;
  relationship: string;
  genre: string;
  createdAt: string;       // ISO string — serialized from server component
  audioUrl: string;        // presigned R2 URL (no Content-Disposition — for playback)
  downloadUrl: string;     // presigned R2 URL (with Content-Disposition: attachment — for download)
  downloadFilename: string; // e.g. "notevra-song-for-emma.mp3"
  hasSubscription?: boolean;
}

export function SongCard({
  recipientName,
  relationship,
  genre,
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
          {!hasSubscription && (
            <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              30s Preview
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground capitalize">
          {relationship} · {genre} · {formattedDate}
        </p>
      </div>

      <SongPlayer src={audioUrl} isPreview={!hasSubscription} />

      {hasSubscription ? (
        <a
          href={downloadUrl}
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
      )}
    </div>
  );
}
