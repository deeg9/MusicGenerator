'use server'

import { createClient } from '@/lib/supabase/server'
import { claimAnonymousSongs } from '@/lib/auth/claim-anonymous-songs'

/**
 * Claims anonymous songs for the currently authenticated user.
 * Call after email verification succeeds on the confirm page.
 */
export async function claimSongsForCurrentUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return

  await claimAnonymousSongs(user.id)
}
