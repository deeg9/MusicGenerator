import { type EmailOtpType } from '@supabase/supabase-js'
import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const next = searchParams.get('next') ?? '/'

  if (!token_hash || !type) {
    return NextResponse.redirect(
      new URL('/auth/error?error=Missing+token', request.url)
    )
  }

  const supabase = await createClient()

  const { error } = await supabase.auth.verifyOtp({ type, token_hash })

  if (error) {
    return NextResponse.redirect(
      new URL(
        `/auth/error?error=${encodeURIComponent(error.message)}`,
        request.url
      )
    )
  }

  if (type === 'recovery') {
    return NextResponse.redirect(new URL('/update-password', request.url))
  }

  // Only redirect to relative paths for security
  const safeNext = next.startsWith('/') ? next : '/'
  return NextResponse.redirect(new URL(safeNext, request.url))
}
