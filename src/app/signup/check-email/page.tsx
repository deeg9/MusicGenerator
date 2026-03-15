'use client'

import { Suspense, useState, useRef, useTransition } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { claimSongsForCurrentUser } from '@/app/auth/confirm/actions'

const CODE_LENGTH = 6

function CheckEmailContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const email = searchParams.get('email') ?? ''
  const next = searchParams.get('next') ?? '/dashboard'

  const [code, setCode] = useState<string[]>(Array(CODE_LENGTH).fill(''))
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  function handleChange(index: number, value: string) {
    // Only allow digits
    const digit = value.replace(/\D/g, '').slice(-1)
    const newCode = [...code]
    newCode[index] = digit
    setCode(newCode)
    setError(null)

    // Auto-advance to next input
    if (digit && index < CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus()
    }

    // Auto-submit when all digits filled
    if (digit && index === CODE_LENGTH - 1 && newCode.every(d => d !== '')) {
      submitCode(newCode.join(''))
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, CODE_LENGTH)
    if (!pasted) return

    const newCode = [...code]
    for (let i = 0; i < CODE_LENGTH; i++) {
      newCode[i] = pasted[i] || ''
    }
    setCode(newCode)

    // Focus the next empty input or last input
    const nextEmpty = newCode.findIndex(d => d === '')
    inputRefs.current[nextEmpty === -1 ? CODE_LENGTH - 1 : nextEmpty]?.focus()

    // Auto-submit if complete
    if (newCode.every(d => d !== '')) {
      submitCode(newCode.join(''))
    }
  }

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
        setCode(Array(CODE_LENGTH).fill(''))
        inputRefs.current[0]?.focus()
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
    const otp = code.join('')
    if (otp.length !== CODE_LENGTH) {
      setError('Please enter the full 6-digit code.')
      return
    }
    submitCode(otp)
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
          We sent a 6-digit code to{' '}
          {email ? <span className="font-medium">{email}</span> : 'your email'}.
        </p>

        <p className="text-xs text-muted-foreground mb-6">
          Don&apos;t see it? Check your spam folder.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex justify-center gap-2">
            {Array.from({ length: CODE_LENGTH }).map((_, i) => (
              <input
                key={i}
                ref={el => { inputRefs.current[i] = el }}
                type="text"
                inputMode="numeric"
                autoComplete={i === 0 ? 'one-time-code' : 'off'}
                maxLength={1}
                value={code[i]}
                onChange={e => handleChange(i, e.target.value)}
                onKeyDown={e => handleKeyDown(i, e)}
                onPaste={i === 0 ? handlePaste : undefined}
                disabled={isPending}
                className="w-11 h-13 text-center text-xl font-semibold rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
                autoFocus={i === 0}
              />
            ))}
          </div>

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          <button
            type="submit"
            disabled={isPending || code.some(d => d === '')}
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
