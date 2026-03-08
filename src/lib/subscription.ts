import { db } from '@/db';
import { subscriptions } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';

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

  if (!sub) return null;

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
