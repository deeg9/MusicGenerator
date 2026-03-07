'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

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

  revalidatePath('/', 'layout')
  redirect(next)
}
