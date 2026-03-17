import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/db';
import { songs } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

type RouteContext = { params: Promise<{ songId: string }> };

// ── PATCH: Update song title ────────────────────────────────────────────────

export async function PATCH(
  request: NextRequest,
  { params }: RouteContext,
): Promise<NextResponse> {
  const { songId } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  // Verify ownership
  const [song] = await db
    .select({ id: songs.id })
    .from(songs)
    .where(and(eq(songs.id, songId), eq(songs.userId, user.id)))
    .limit(1);

  if (!song) {
    return NextResponse.json({ error: 'Song not found' }, { status: 404 });
  }

  const body = await request.json();
  const title = typeof body.title === 'string' ? body.title.trim() : '';

  if (!title || title.length > 100) {
    return NextResponse.json(
      { error: 'Title must be 1-100 characters' },
      { status: 400 },
    );
  }

  await db
    .update(songs)
    .set({ title })
    .where(eq(songs.id, songId));

  return NextResponse.json({ updated: true, title });
}

// ── DELETE: Remove song ─────────────────────────────────────────────────────

export async function DELETE(
  _request: NextRequest,
  { params }: RouteContext,
): Promise<NextResponse> {
  const { songId } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  // Verify ownership
  const [song] = await db
    .select({ id: songs.id })
    .from(songs)
    .where(and(eq(songs.id, songId), eq(songs.userId, user.id)))
    .limit(1);

  if (!song) {
    return NextResponse.json({ error: 'Song not found' }, { status: 404 });
  }

  await db.delete(songs).where(eq(songs.id, songId));

  return NextResponse.json({ deleted: true });
}
