import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { songs } from '@/db/schema';
import { resend } from '@/lib/resend';
import { getAudioPresignedUrl } from '@/lib/r2';
import { GiftDeliveryEmail } from '@/emails/GiftDeliveryEmail';

/**
 * Extract the first name from a Supabase user's full_name metadata
 * or fall back to the email prefix.
 */
function extractFirstName(user: { email?: string; user_metadata?: { full_name?: string } }): string {
  const fullName = user.user_metadata?.full_name;
  if (fullName) {
    return fullName.split(' ')[0];
  }
  if (user.email) {
    return user.email.split('@')[0];
  }
  return 'Someone';
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  // 1. Parse and validate request body
  let songId: string | undefined;
  let recipientEmail: string | undefined;
  try {
    const body = await request.json() as Record<string, unknown>;
    songId = typeof body.songId === 'string' ? body.songId : undefined;
    recipientEmail = typeof body.recipientEmail === 'string' ? body.recipientEmail : undefined;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!songId || !recipientEmail) {
    return NextResponse.json(
      { error: 'songId and recipientEmail are required' },
      { status: 400 },
    );
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

  // 4. Extract creator context
  let creatorFirstName = 'Someone';

  if (song.userId) {
    // Authenticated song — look up creator name via Supabase admin client
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
    const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(song.userId);
    if (user) {
      creatorFirstName = extractFirstName(user);
    }
  }

  const message = (song.quizData as { message?: string })?.message ?? '';

  // 5. Generate presigned URL (7-day maximum — R2 hard cap)
  const listenUrl = await getAudioPresignedUrl(song.r2Mp3Key, 604800);

  // 6. Send email via Resend
  const { data, error } = await resend.emails.send({
    from: 'Notevra <hello@notevra.com>',
    to: [recipientEmail],
    subject: `${creatorFirstName} made something just for you`,
    react: GiftDeliveryEmail({
      recipientName: song.recipientName,
      creatorFirstName,
      relationship: song.relationship,
      message,
      genre: song.genre,
      listenUrl,
    }),
  });

  if (error || !data) {
    return NextResponse.json({ error }, { status: 500 });
  }

  return NextResponse.json({ id: data.id }, { status: 200 });
}
