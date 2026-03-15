import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { claimAnonymousSongs } from '@/lib/auth/claim-anonymous-songs'

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
      await claimAnonymousSongs(user.id)
    }
  } catch (claimError) {
    // Non-fatal — OAuth succeeded, don't block the redirect
    console.error('[auth/callback] Anonymous song claim failed (non-fatal):', claimError)
  }

  return NextResponse.redirect(new URL(safeNext, origin))
}
