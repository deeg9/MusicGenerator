'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { claimAnonymousSongs } from '@/lib/auth/claim-anonymous-songs'

export async function signup(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const next = (formData.get('next') as string) || '/dashboard'

  const supabase = await createClient()

  const { error } = await supabase.auth.signUp({ email, password })

  if (error) {
    const message =
      error.message === 'User already registered'
        ? "Hmm, that email's already taken. Try logging in instead?"
        : error.message
    return { error: message }
  }

  // Redirect to check-email interstitial (session is null until email confirmed)
  const params = new URLSearchParams({ email })
  if (next && next !== '/dashboard') {
    params.set('next', next)
  }
  redirect(`/signup/check-email?${params.toString()}`)
}

export async function verifySignupOtp(email: string, code: string, nextUrl: string) {
  const supabase = await createClient()

  const { error } = await supabase.auth.verifyOtp({
    email,
    token: code,
    type: 'signup',
  })

  if (error) {
    return {
      error: error.message === 'Token has expired or is invalid'
        ? 'Invalid or expired code. Please try again.'
        : error.message,
    }
  }

  // Claim anonymous songs (non-fatal)
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await claimAnonymousSongs(user.id)
    }
  } catch {
    // Non-fatal
  }

  const safeNext = nextUrl.startsWith('/') ? nextUrl : '/dashboard'
  revalidatePath('/', 'layout')
  redirect(safeNext)
}
