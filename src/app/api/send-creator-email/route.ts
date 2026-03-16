import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { songs } from '@/db/schema';
import { resend } from '@/lib/resend';
import { SongReadyEmail } from '@/emails/SongReadyEmail';
import { render } from '@react-email/components';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try { return await handlePost(request); } catch (err) {
    console.error('[send-creator-email] Unhandled error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

async function handlePost(request: NextRequest): Promise<NextResponse> {
  // 1. Parse and validate request body
  let songId: string | undefined;
  let creatorEmail: string | undefined;
  try {
    const body = await request.json() as Record<string, unknown>;
    songId = typeof body.songId === 'string' ? body.songId : undefined;
    creatorEmail = typeof body.creatorEmail === 'string' ? body.creatorEmail : undefined;
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

  // 3. Validate song has been finalized
  if (!song.r2Mp3Key) {
    return NextResponse.json(
      { error: 'Song is not finalized — r2Mp3Key is null' },
      { status: 400 },
    );
  }

  // 4. Resolve creator email: use provided creatorEmail, or look up via Supabase for authenticated users
  let recipientEmail = creatorEmail;

  if (!recipientEmail) {
    if (!song.userId) {
      return NextResponse.json(
        { error: 'Song has no userId and no creatorEmail provided' },
        { status: 400 },
      );
    }

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

    recipientEmail = user.email;
  }

  // 5. Build app URLs (no presigned R2 URLs — branded pages instead)
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  const listenUrl = `${siteUrl}/quiz/success/${song.heartbulaJobId}?name=${encodeURIComponent(song.recipientName)}&songId=${song.id}`;
  const downloadUrl = `${siteUrl}/api/audio/${song.heartbulaJobId}?download=true&name=${encodeURIComponent(`${song.recipientName}-song.mp3`)}`;

  // 6. Send email via Resend
  const html = await render(SongReadyEmail({
    recipientName: song.recipientName,
    listenUrl,
    downloadUrl,
    genre: song.genre,
  }));

  const { data, error } = await resend.emails.send({
    from: 'Notevra <hello@notevra.net>',
    to: [recipientEmail],
    subject: `Your song for ${song.recipientName} is ready`,
    html,
  });

  if (error || !data) {
    return NextResponse.json({ error }, { status: 500 });
  }

  return NextResponse.json({ id: data.id }, { status: 200 });
}
