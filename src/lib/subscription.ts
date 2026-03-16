import { db } from '@/db';
import { subscriptions, songs } from '@/db/schema';
import { eq, sql, and } from 'drizzle-orm';
import { syncSubscriptionFromStripe } from '@/lib/stripe-sync';

export type SubscriptionInfo = {
  active: boolean;
  tier: string;
  songsRemaining: number;
  songsPerMonth: number;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: Date | null;
};

export async function getUserSubscription(userId: string): Promise<SubscriptionInfo | null> {
  const [sub] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1);

  if (!sub) {
    // No local record — try syncing from Stripe (self-healing for missed webhooks)
    const synced = await syncSubscriptionFromStripe(userId);
    if (synced) {
      // Re-query after backfill
      const [backfilled] = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.userId, userId))
        .limit(1);

      if (backfilled) {
        return {
          active: backfilled.status === 'active' || backfilled.status === 'trialing',
          tier: backfilled.tier,
          songsRemaining: backfilled.songsRemaining,
          songsPerMonth: backfilled.songsPerMonth,
          cancelAtPeriodEnd: backfilled.cancelAtPeriodEnd,
          currentPeriodEnd: backfilled.currentPeriodEnd,
        };
      }
    }
    return null;
  }

  return {
    active: sub.status === 'active' || sub.status === 'trialing',
    tier: sub.tier,
    songsRemaining: sub.songsRemaining,
    songsPerMonth: sub.songsPerMonth,
    cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
    currentPeriodEnd: sub.currentPeriodEnd,
  };
}

export async function canGenerate(userId: string): Promise<boolean> {
  const sub = await getUserSubscription(userId);
  if (!sub || !sub.active) return false;
  // Unlimited tier (songsPerMonth === -1) always can generate
  if (sub.songsPerMonth === -1) return true;
  return sub.songsRemaining > 0;
}

export async function decrementSongCredit(userId: string): Promise<void> {
  // Skip decrement for unlimited tier
  const [sub] = await db
    .select({ songsPerMonth: subscriptions.songsPerMonth })
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1);

  if (!sub || sub.songsPerMonth === -1) return;

  // Atomic decrement — prevents concurrent over-use
  await db
    .update(subscriptions)
    .set({
      songsRemaining: sql`GREATEST(${subscriptions.songsRemaining} - 1, 0)`,
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.userId, userId));
}

export type UnlockResult =
  | { unlocked: true; songsRemaining: number }
  | { error: 'no_subscription' | 'not_active' | 'insufficient_credits'; songsRemaining: number; songsPerMonth: number; tier: string; currentPeriodEnd: string | null };

/**
 * Atomically unlock a song by spending 1 credit.
 * For unlimited tier, skips credit check.
 */
export async function unlockSong(userId: string, songId: string): Promise<UnlockResult> {
  const sub = await getUserSubscription(userId);

  if (!sub) {
    return { error: 'no_subscription', songsRemaining: 0, songsPerMonth: 0, tier: '', currentPeriodEnd: null };
  }

  if (!sub.active) {
    return { error: 'not_active', songsRemaining: sub.songsRemaining, songsPerMonth: sub.songsPerMonth, tier: sub.tier, currentPeriodEnd: sub.currentPeriodEnd?.toISOString() ?? null };
  }

  // Unlimited tier — unlock immediately without credit decrement
  if (sub.songsPerMonth === -1) {
    await db
      .update(songs)
      .set({ unlockedAt: new Date() })
      .where(and(eq(songs.id, songId), eq(songs.userId, userId)));

    return { unlocked: true, songsRemaining: -1 };
  }

  // Check credits
  if (sub.songsRemaining <= 0) {
    return { error: 'insufficient_credits', songsRemaining: 0, songsPerMonth: sub.songsPerMonth, tier: sub.tier, currentPeriodEnd: sub.currentPeriodEnd?.toISOString() ?? null };
  }

  // Atomic: decrement credit + unlock song in a single transaction
  try {
    const newRemaining = await db.transaction(async (tx) => {
      const [updated] = await tx
        .update(subscriptions)
        .set({
          songsRemaining: sql`GREATEST(${subscriptions.songsRemaining} - 1, 0)`,
          updatedAt: new Date(),
        })
        .where(and(eq(subscriptions.userId, userId), sql`${subscriptions.songsRemaining} > 0`))
        .returning({ songsRemaining: subscriptions.songsRemaining });

      if (!updated) {
        throw new Error('insufficient_credits');
      }

      await tx
        .update(songs)
        .set({ unlockedAt: new Date() })
        .where(and(eq(songs.id, songId), eq(songs.userId, userId)));

      return updated.songsRemaining;
    });

    return { unlocked: true, songsRemaining: newRemaining };
  } catch (err) {
    // Race condition: credits consumed between check and transaction
    if (err instanceof Error && err.message === 'insufficient_credits') {
      return { error: 'insufficient_credits', songsRemaining: 0, songsPerMonth: sub.songsPerMonth, tier: sub.tier, currentPeriodEnd: sub.currentPeriodEnd?.toISOString() ?? null };
    }
    throw err;
  }
}
