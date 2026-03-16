'use client'

import posthog from 'posthog-js'
import { PostHogProvider as PHProvider } from 'posthog-js/react'
import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { identifyUser } from '@/lib/analytics'

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
      person_profiles: 'identified_only',
      capture_pageview: false,
      capture_pageleave: true,
    })
  }, [])

  // Identify authenticated users in PostHog
  useEffect(() => {
    async function identify() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        identifyUser(user.id, {
          email: user.email,
          name: user.user_metadata?.full_name,
        })
      }
    }
    void identify()
  }, [])

  return <PHProvider client={posthog}>{children}</PHProvider>
}
