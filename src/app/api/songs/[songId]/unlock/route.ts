import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/db';
import { songs } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { unlockSong } from '@/lib/subscription';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ songId: string }> },
): Promise<NextResponse> {
  const { songId } = await params;

  // 1. Auth check
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  // 2. Verify song exists and belongs to user
  const [song] = await db
    .select({ id: songs.id, userId: songs.userId, unlockedAt: songs.unlockedAt })
    .from(songs)
    .where(and(eq(songs.id, songId), eq(songs.userId, user.id)))
    .limit(1);

  if (!song) {
    return NextResponse.json({ error: 'Song not found' }, { status: 404 });
  }

  // 3. Idempotent — already unlocked
  if (song.unlockedAt) {
    return NextResponse.json({ unlocked: true });
  }

  // 4. Attempt unlock (handles subscription check + credit decrement)
  const result = await unlockSong(user.id, songId);

  if ('error' in result) {
    return NextResponse.json(result, { status: 403 });
  }

  return NextResponse.json(result);
}
