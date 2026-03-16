import type { User } from '@supabase/supabase-js';
import { HeaderClient } from './HeaderClient';
import { getUserSubscription, type SubscriptionInfo } from '@/lib/subscription';

export async function Header({ user }: { user: User | null }) {
  let subscription: SubscriptionInfo | null = null;
  if (user) {
    try {
      subscription = await getUserSubscription(user.id);
    } catch (err) {
      console.error('[Header] Failed to fetch subscription:', err);
    }
  }

  return <HeaderClient user={user} subscription={subscription} />;
}
