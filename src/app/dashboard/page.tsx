import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/db';
import { songs } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
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
  } catch (err) {
    console.error('[Dashboard] Failed to fetch subscription:', err);
  }

  // Query all user songs — graceful fallback on DB timeout
  const isUnlimitedTier = !!subscription?.active && subscription.songsPerMonth === -1;

  let userSongsWithUrls: Array<{
    id: string;
    recipientName: string;
    relationship: string;
    genre: string;
    status: 'generating' | 'completed' | 'failed';
    createdAt: Date;
    audioUrl: string | null;
    downloadUrl: string | null;
    downloadFilename: string;
    isUnlocked: boolean;
  }> = [];
  try {
    const userSongs = await db
      .select()
      .from(songs)
      .where(eq(songs.userId, user.id))
      .orderBy(desc(songs.createdAt));

    userSongsWithUrls = await Promise.all(
      userSongs.map(async (song) => {
        const downloadFilename = buildDownloadFilename(song.recipientName);
        let audioUrl: string | null = null;
        let downloadUrl: string | null = null;

        if (song.r2Mp3Key) {
          audioUrl = await getAudioPresignedUrl(song.r2Mp3Key, 3600);
          downloadUrl = await getAudioPresignedUrl(song.r2Mp3Key, 3600, downloadFilename);
        }

        return {
          ...song,
          status: song.status as 'generating' | 'completed' | 'failed',
          audioUrl,
          downloadUrl,
          downloadFilename,
          isUnlocked: !!song.unlockedAt,
        };
      }),
    );
  } catch (err) {
    console.error('[Dashboard] Failed to fetch songs:', err);
  }

  return (
    <main className="min-h-screen bg-background px-4 py-16">
      <div className="max-w-2xl mx-auto flex flex-col gap-8">
        <h1 className="font-display text-3xl text-foreground">My Songs</h1>

        {/* Subscription status */}
        <SubscriptionCard subscription={subscription} />

        {userSongsWithUrls.length === 0 ? (
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
            {userSongsWithUrls.map((song) => (
              <SongCard
                key={song.id}
                recipientName={song.recipientName}
                relationship={song.relationship}
                genre={song.genre}
                status={song.status}
                createdAt={song.createdAt.toISOString()}
                audioUrl={song.audioUrl}
                downloadUrl={song.downloadUrl}
                downloadFilename={song.downloadFilename}
                hasSubscription={!!subscription?.active}
                isUnlocked={song.isUnlocked}
                isUnlimitedTier={isUnlimitedTier}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
