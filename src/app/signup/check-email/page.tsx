'use client'

import { Suspense, useState, useRef, useTransition } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { claimSongsForCurrentUser } from '@/app/auth/confirm/actions'

function CheckEmailContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const email = searchParams.get('email') ?? ''
  const next = searchParams.get('next') ?? '/dashboard'

  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement | null>(null)

  function submitCode(otp: string) {
    startTransition(async () => {
      const supabase = createClient()
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: 'signup',
      })

      if (verifyError) {
        setError(verifyError.message === 'Token has expired or is invalid'
          ? 'Invalid or expired code. Please try again.'
          : verifyError.message
        )
        setCode('')
        inputRef.current?.focus()
        return
      }

      // Claim anonymous songs (non-fatal)
      try {
        await claimSongsForCurrentUser()
      } catch {
        // Non-fatal
      }

      const safeNext = next.startsWith('/') ? next : '/dashboard'
      router.push(safeNext)
    })
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const digits = code.replace(/\D/g, '')
    if (digits.length < 6) {
      setError('Please enter the verification code from your email.')
      return
    }
    submitCode(digits)
  }

  return (
    <main className="min-h-[60vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-card rounded-[var(--radius-lg)] shadow-[var(--shadow-medium)] p-8 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mx-auto mb-6">
          <span className="text-3xl">&#9993;</span>
        </div>

        <h1 className="font-display text-2xl font-bold text-foreground mb-3">
          Check your inbox
        </h1>

        <p className="text-sm text-foreground mb-2">
          We sent a verification code to{' '}
          {email ? <span className="font-medium">{email}</span> : 'your email'}.
        </p>

        <p className="text-xs text-muted-foreground mb-6">
          Don&apos;t see it? Check your spam folder.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            ref={inputRef}
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={code}
            onChange={e => {
              setCode(e.target.value.replace(/\D/g, ''))
              setError(null)
            }}
            disabled={isPending}
            placeholder="Enter code"
            className="w-full text-center text-2xl font-semibold tracking-[0.3em] rounded-lg border border-border px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
            autoFocus
          />

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          <button
            type="submit"
            disabled={isPending || code.replace(/\D/g, '').length < 6}
            className="w-full bg-primary text-primary-foreground rounded-lg px-4 py-2.5 text-sm font-semibold hover:opacity-90 disabled:opacity-60 transition-opacity flex items-center justify-center gap-2"
          >
            {isPending && <Loader2 size={16} className="animate-spin" />}
            Verify
          </button>
        </form>

        <p className="mt-6 text-sm text-muted-foreground">
          <Link
            href="/signup"
            className="text-primary font-medium hover:underline"
          >
            Try again with a different email
          </Link>
        </p>
      </div>
    </main>
  )
}

export default function CheckEmailPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-[60vh] flex items-center justify-center px-4 py-12">
          <div className="w-full max-w-md bg-card rounded-[var(--radius-lg)] shadow-[var(--shadow-medium)] p-8 text-center">
            <h1 className="font-display text-2xl font-bold text-foreground mb-3">Loading...</h1>
          </div>
        </main>
      }
    >
      <CheckEmailContent />
    </Suspense>
  )
}
