'use client';

import { Download } from 'lucide-react';
import { SongPlayer } from '@/app/quiz/success/[jobId]/_components/SongPlayer';

interface SongCardProps {
  recipientName: string;
  relationship: string;
  genre: string;
  createdAt: string;       // ISO string — serialized from server component
  audioUrl: string;        // presigned R2 URL
  downloadFilename: string; // e.g. "notevra-song-for-emma.mp3"
}

export function SongCard({
  recipientName,
  relationship,
  genre,
  createdAt,
  audioUrl,
  downloadFilename,
}: SongCardProps) {
  const formattedDate = new Date(createdAt).toLocaleDateString();

  return (
    <div className="bg-card rounded-2xl border border-border p-6 flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="font-display text-xl text-foreground">
          A song for {recipientName}
        </h2>
        <p className="text-sm text-muted-foreground capitalize">
          {relationship} · {genre} · {formattedDate}
        </p>
      </div>

      <SongPlayer src={audioUrl} />

      <a
        href={audioUrl}
        download={downloadFilename}
        className="inline-flex items-center justify-center gap-2 border border-border text-foreground px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-muted transition-colors"
      >
        <Download className="w-4 h-4" />
        Download
      </a>
    </div>
  );
}
