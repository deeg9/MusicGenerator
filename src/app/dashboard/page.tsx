import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/db';
import { songs } from '@/db/schema';
import { eq, desc, and, isNotNull } from 'drizzle-orm';
import { getAudioPresignedUrl } from '@/lib/r2';
import { Music } from 'lucide-react';
import Link from 'next/link';
import { SongCard } from './_components/SongCard';
import { getUserSubscription, type SubscriptionInfo } from '@/lib/subscription';
import { SubscriptionCard } from './_components/SubscriptionCard';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function buildDownloadFilename(recipientName: string): string {
  const slug = recipientName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `notevra-song-for-${slug}.mp3`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  // Auth guard — use getUser() per locked project decision (never getSession())
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?next=/dashboard');
  }

  // Fetch subscription info — graceful fallback on DB timeout
  let subscription: SubscriptionInfo | null = null;
  try {
    subscription = await getUserSubscription(user.id);
  } catch {
    // Connection timeout — show "no subscription" gracefully
  }

  // Query completed songs — graceful fallback on DB timeout
  let songsWithUrls: Array<{
    id: string;
    recipientName: string;
    relationship: string;
    genre: string;
    createdAt: Date;
    audioUrl: string;
    downloadFilename: string;
  }> = [];
  try {
    const userSongs = await db
      .select()
      .from(songs)
      .where(and(eq(songs.userId, user.id), isNotNull(songs.r2Mp3Key)))
      .orderBy(desc(songs.createdAt));

    const completedSongs = userSongs.filter((s) => s.r2Mp3Key !== null);

    songsWithUrls = await Promise.all(
      completedSongs.map(async (song) => {
        const downloadFilename = buildDownloadFilename(song.recipientName);
        const audioUrl = await getAudioPresignedUrl(song.r2Mp3Key!, 3600, downloadFilename);
        return {
          ...song,
          audioUrl,
          downloadFilename,
        };
      }),
    );
  } catch {
    // Connection timeout — show empty song list gracefully
  }

  return (
    <main className="min-h-screen bg-background px-4 py-16">
      <div className="max-w-2xl mx-auto flex flex-col gap-8">
        <h1 className="font-display text-3xl text-foreground">My Songs</h1>

        {/* Subscription status */}
        <SubscriptionCard subscription={subscription} />

        {songsWithUrls.length === 0 ? (
          // Empty state
          <div className="flex flex-col items-center gap-6 py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
              <Music className="w-8 h-8 text-muted-foreground" />
            </div>
            <div className="flex flex-col gap-2">
              <p className="text-lg font-medium text-foreground">
                You haven't created any songs yet.
              </p>
              <p className="text-sm text-muted-foreground">
                Create a personalized song for someone you love.
              </p>
            </div>
            <Link
              href="/quiz"
              className="bg-primary text-primary-foreground px-6 py-3 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              Create your first song
            </Link>
          </div>
        ) : (
          // Song list
          <div className="flex flex-col gap-6">
            {songsWithUrls.map((song) => (
              <SongCard
                key={song.id}
                recipientName={song.recipientName}
                relationship={song.relationship}
                genre={song.genre}
                createdAt={song.createdAt.toISOString()}
                audioUrl={song.audioUrl}
                downloadFilename={song.downloadFilename}
                hasSubscription={!!subscription?.active}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
