import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { songs } from '@/db/schema';
import { resend } from '@/lib/resend';
import { GiftDeliveryEmail } from '@/emails/GiftDeliveryEmail';
import { render } from '@react-email/components';

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

  // 5. Build app URL for listen page (no presigned R2 URL — branded page instead)
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  const listenUrl = `${siteUrl}/listen/${song.id}`;

  // 6. Send email via Resend
  const html = await render(GiftDeliveryEmail({
    recipientName: song.recipientName,
    creatorFirstName,
    relationship: song.relationship,
    message,
    genre: song.genre,
    listenUrl,
  }));

  const { data, error } = await resend.emails.send({
    from: 'Notevra <hello@notevra.net>',
    to: [recipientEmail],
    subject: `${creatorFirstName} made something just for you`,
    html,
  });

  if (error || !data) {
    return NextResponse.json({ error }, { status: 500 });
  }

  return NextResponse.json({ id: data.id }, { status: 200 });
}
