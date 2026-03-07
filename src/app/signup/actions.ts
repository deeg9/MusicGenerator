'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/db'
import { songs } from '@/db/schema'
import { eq, and, isNull } from 'drizzle-orm'

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

  // Claim any anonymous songs associated with this session
  try {
    const { data: { user } } = await supabase.auth.getUser()
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
    // Non-fatal — signup succeeded, don't block the redirect
    console.error('[signup] Anonymous song claim failed (non-fatal):', claimError)
  }

  revalidatePath('/', 'layout')
  redirect(next)
}
