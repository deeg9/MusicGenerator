import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { songs } from '@/db/schema';
import { resend } from '@/lib/resend';
import { getAudioPresignedUrl } from '@/lib/r2';
import { SongReadyEmail } from '@/emails/SongReadyEmail';

export async function POST(request: NextRequest): Promise<NextResponse> {
  // 1. Parse and validate request body
  let songId: string | undefined;
  try {
    const body = await request.json() as Record<string, unknown>;
    songId = typeof body.songId === 'string' ? body.songId : undefined;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!songId) {
    return NextResponse.json({ error: 'songId is required' }, { status: 400 });
  }

  // 2. Look up song via Drizzle (postgres role bypasses RLS)
  const rows = await db
    .select()
    .from(songs)
    .where(eq(songs.id, songId))
    .limit(1);

  if (rows.length === 0) {
    return NextResponse.json({ error: 'Song not found' }, { status: 404 });
  }

  const song = rows[0];

  // 3. Validate song is owned by an authenticated user
  if (!song.userId) {
    return NextResponse.json(
      { error: 'Song has no userId — anonymous songs cannot receive creator emails' },
      { status: 400 },
    );
  }

  // 4. Validate song has been finalized
  if (!song.r2Mp3Key) {
    return NextResponse.json(
      { error: 'Song is not finalized — r2Mp3Key is null' },
      { status: 400 },
    );
  }

  // 5. Look up creator email via Supabase admin client (service role)
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(song.userId);

  if (!user || !user.email) {
    return NextResponse.json(
      { error: 'Creator user not found or has no email' },
      { status: 500 },
    );
  }

  // 6. Generate presigned URLs (24h expiry for creator)
  const [listenUrl, downloadUrl] = await Promise.all([
    getAudioPresignedUrl(song.r2Mp3Key, 86400),
    getAudioPresignedUrl(song.r2Mp3Key, 86400, `${song.recipientName}-song.mp3`),
  ]);

  // 7. Send email via Resend
  const { data, error } = await resend.emails.send({
    from: 'Notevra <hello@notevra.com>',
    to: [user.email],
    subject: `Your song for ${song.recipientName} is ready`,
    react: SongReadyEmail({
      recipientName: song.recipientName,
      listenUrl,
      downloadUrl,
      genre: song.genre,
    }),
  });

  if (error || !data) {
    return NextResponse.json({ error }, { status: 500 });
  }

  return NextResponse.json({ id: data.id }, { status: 200 });
}
