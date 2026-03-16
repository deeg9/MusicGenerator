import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/db';
import { songs, subscriptions } from '@/db/schema';
import { eq, isNull, isNotNull, sql } from 'drizzle-orm';

/**
 * TEMPORARY debug endpoint — delete after diagnosing dashboard issues.
 * Returns raw DB data for the logged-in user to identify missing songs/subscriptions.
 */
export async function GET() {
  try {
    // Auth check
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      return NextResponse.json({ error: 'Auth error', details: authError.message }, { status: 401 });
    }
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // 1. DB health check
    let dbHealthy = false;
    let dbError: string | null = null;
    try {
      await db.execute(sql`SELECT 1`);
      dbHealthy = true;
    } catch (err) {
      dbError = err instanceof Error ? err.message : String(err);
    }

    // 2. User's songs (by userId)
    let userSongs: unknown[] = [];
    let userSongsError: string | null = null;
    try {
      userSongs = await db
        .select({
          id: songs.id,
          userId: songs.userId,
          sessionToken: songs.sessionToken,
          status: songs.status,
          recipientName: songs.recipientName,
          genre: songs.genre,
          r2Mp3Key: songs.r2Mp3Key,
          r2WavKey: songs.r2WavKey,
          createdAt: songs.createdAt,
          completedAt: songs.completedAt,
          unlockedAt: songs.unlockedAt,
        })
        .from(songs)
        .where(eq(songs.userId, user.id));
    } catch (err) {
      userSongsError = err instanceof Error ? err.message : String(err);
    }

    // 3. Orphaned songs (userId IS NULL, sessionToken IS NOT NULL)
    let orphanedSongs: unknown[] = [];
    let orphanedError: string | null = null;
    try {
      orphanedSongs = await db
        .select({
          id: songs.id,
          userId: songs.userId,
          sessionToken: songs.sessionToken,
          status: songs.status,
          recipientName: songs.recipientName,
          genre: songs.genre,
          createdAt: songs.createdAt,
        })
        .from(songs)
        .where(isNull(songs.userId));
    } catch (err) {
      orphanedError = err instanceof Error ? err.message : String(err);
    }

    // 4. Total song count
    let totalSongs: number | null = null;
    try {
      const [row] = await db.select({ count: sql<number>`count(*)` }).from(songs);
      totalSongs = row?.count ?? null;
    } catch {
      // skip
    }

    // 5. Subscription for this user
    let userSubscription: unknown = null;
    let subscriptionError: string | null = null;
    try {
      const [sub] = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.userId, user.id))
        .limit(1);
      userSubscription = sub ?? null;
    } catch (err) {
      subscriptionError = err instanceof Error ? err.message : String(err);
    }

    // 6. All subscriptions (to see if Chris's exists under a different userId)
    let allSubscriptions: unknown[] = [];
    try {
      allSubscriptions = await db
        .select({
          id: subscriptions.id,
          userId: subscriptions.userId,
          tier: subscriptions.tier,
          status: subscriptions.status,
          stripeCustomerId: subscriptions.stripeCustomerId,
          songsRemaining: subscriptions.songsRemaining,
          createdAt: subscriptions.createdAt,
        })
        .from(subscriptions);
    } catch {
      // skip
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
      },
      db: {
        healthy: dbHealthy,
        error: dbError,
      },
      userSongs: {
        count: userSongs.length,
        error: userSongsError,
        data: userSongs,
      },
      orphanedSongs: {
        count: orphanedSongs.length,
        error: orphanedError,
        data: orphanedSongs,
      },
      totalSongsInDb: totalSongs,
      subscription: {
        error: subscriptionError,
        data: userSubscription,
      },
      allSubscriptions: {
        count: allSubscriptions.length,
        data: allSubscriptions,
      },
    }, { status: 200 });
  } catch (err) {
    return NextResponse.json({
      error: 'Unexpected error',
      details: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    }, { status: 500 });
  }
}
