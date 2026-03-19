import { notFound } from 'next/navigation';
import { db } from '@/db';
import { songs } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getAudioPresignedUrl } from '@/lib/r2';
import { SongPlayer } from '@/app/quiz/success/[jobId]/_components/SongPlayer';
import Link from 'next/link';
import type { Metadata } from 'next';

type Props = { params: Promise<{ songId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { songId } = await params;

  const [song] = await db
    .select({
      title: songs.title,
      recipientName: songs.recipientName,
      status: songs.status,
      unlockedAt: songs.unlockedAt,
    })
    .from(songs)
    .where(eq(songs.id, songId))
    .limit(1);

  if (!song || song.status !== 'completed' || !song.unlockedAt) {
    return { title: 'Song not found — Notevra' };
  }

  const displayTitle = song.title || `A song for ${song.recipientName}`;

  return {
    title: `${displayTitle} — Notevra`,
    description: `Listen to "${displayTitle}" — a personalized song made with love on Notevra.`,
    openGraph: {
      title: `${displayTitle} — Notevra`,
      description: `Listen to "${displayTitle}" — a personalized song made with love on Notevra.`,
      type: 'music.song',
    },
  };
}

export default async function SharePage({ params }: Props) {
  const { songId } = await params;

  const [song] = await db
    .select()
    .from(songs)
    .where(eq(songs.id, songId))
    .limit(1);

  // Only show completed, unlocked songs
  if (!song || song.status !== 'completed' || !song.unlockedAt) {
    notFound();
  }

  // Generate presigned audio URL (1 hour)
  let audioUrl: string | null = null;
  if (song.r2Mp3Key) {
    audioUrl = await getAudioPresignedUrl(song.r2Mp3Key, 3600);
  }

  if (!audioUrl) {
    notFound();
  }

  const displayTitle = song.title || `A song for ${song.recipientName}`;
  const formattedDate = new Date(song.createdAt).toLocaleDateString();

  return (
    <div className="min-h-screen bg-background px-4 py-16">
      <div className="max-w-lg mx-auto flex flex-col gap-6">
        {/* Song info */}
        <div className="flex flex-col gap-1 text-center">
          <h1 className="font-display text-2xl text-foreground">
            {displayTitle}
          </h1>
          <p className="text-sm text-muted-foreground capitalize">
            {song.relationship} · {song.genre} · {formattedDate}
          </p>
        </div>

        {/* Player */}
        <SongPlayer
          src={audioUrl}
          isPreview={false}
          songTitle={song.title || undefined}
          recipientName={song.recipientName}
        />

        {/* CTA */}
        <div className="text-center flex flex-col gap-3 pt-4">
          <p className="text-sm text-muted-foreground">
            Made with love on Notevra
          </p>
          <Link
            href="/quiz"
            className="inline-flex items-center justify-center bg-primary text-primary-foreground px-6 py-3 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            Create your own song
          </Link>
        </div>
      </div>
    </div>
  );
}
