import { cookies } from 'next/headers'
import { db } from '@/db'
import { songs } from '@/db/schema'
import { eq, and, isNull } from 'drizzle-orm'

/**
 * Claims any anonymous songs (tied to notevra_session cookie) to the given user.
 * Non-fatal — callers should wrap in try/catch.
 */
export async function claimAnonymousSongs(userId: string) {
  const cookieStore = await cookies()
  const sessionToken = cookieStore.get('notevra_session')?.value

  if (!sessionToken) return

  await db
    .update(songs)
    .set({ userId, sessionToken: null })
    .where(and(eq(songs.sessionToken, sessionToken), isNull(songs.userId)))
}
