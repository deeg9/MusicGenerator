'use server'

import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

export async function resetPassword(formData: FormData) {
  const email = formData.get('email') as string

  const headerStore = await headers()
  const origin =
    headerStore.get('origin') ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    'http://localhost:3000'

  const supabase = await createClient()

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/confirm`,
  })

  if (error) {
    return { error: error.message }
  }

  return { success: true }
}
