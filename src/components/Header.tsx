import { HeaderClient } from './HeaderClient';
import { getUserSubscription, type SubscriptionInfo } from '@/lib/subscription';
import { createClient } from '@/lib/supabase/server';

export async function Header() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

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
