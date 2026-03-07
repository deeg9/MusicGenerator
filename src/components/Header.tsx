import type { User } from '@supabase/supabase-js';
import { HeaderClient } from './HeaderClient';

export function Header({ user }: { user: User | null }) {
  return <HeaderClient user={user} />;
}
