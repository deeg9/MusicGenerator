import { type NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/db'
import { songs } from '@/db/schema'
import { eq, and, isNull } from 'drizzle-orm'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  // Sanitize next: must start with '/', otherwise default to /dashboard
  const safeNext = next.startsWith('/') ? next : '/dashboard'

  if (!code) {
    return NextResponse.redirect(
      new URL('/auth/error?error=Missing+OAuth+code', request.url)
    )
  }

  const supabase = await createClient()

  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    return NextResponse.redirect(
      new URL(
        `/auth/error?error=${encodeURIComponent(error.message)}`,
        request.url
      )
    )
  }

  // Claim any anonymous songs associated with this session (non-fatal)
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (user) {
      const cookieStore = await cookies()
      const sessionToken = cookieStore.get('notevra_session')?.value

      if (sessionToken) {
        await db
          .update(songs)
          .set({ userId: user.id, sessionToken: null })
          .where(and(eq(songs.sessionToken, sessionToken), isNull(songs.userId)))
      }
    }
  } catch (claimError) {
    // Non-fatal — OAuth succeeded, don't block the redirect
    console.error('[auth/callback] Anonymous song claim failed (non-fatal):', claimError)
  }

  return NextResponse.redirect(new URL(safeNext, origin))
}
