'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { forgotPasswordSchema } from '@/lib/supabase/auth-schemas'
import { resetPassword } from './actions'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [fieldError, setFieldError] = useState<string | null>(null)
  const [serverError, setServerError] = useState<string | null>(null)
  const [successEmail, setSuccessEmail] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setFieldError(null)
    setServerError(null)

    const result = forgotPasswordSchema.safeParse({ email })
    if (!result.success) {
      setFieldError(result.error.flatten().fieldErrors.email?.[0] ?? null)
      return
    }

    const formData = new FormData()
    formData.set('email', email)

    startTransition(async () => {
      const response = await resetPassword(formData)
      if (response?.error) {
        setServerError(response.error)
      } else if (response?.success) {
        setSuccessEmail(email)
      }
    })
  }

  if (successEmail) {
    return (
      <main className="min-h-[60vh] flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md bg-card rounded-[var(--radius-lg)] shadow-[var(--shadow-medium)] p-8 text-center">
          <h1 className="font-display text-2xl font-bold text-foreground mb-3">
            Check your inbox
          </h1>
          <p className="text-sm text-foreground mb-2">
            We sent a password reset link to <span className="font-medium">{successEmail}</span>.
          </p>
          <p className="text-xs text-muted-foreground mb-6">
            Open the link on this device for it to work.
          </p>
          <Link href="/login" className="text-sm text-primary font-medium hover:underline">
            Back to log in
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-[60vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-card rounded-[var(--radius-lg)] shadow-[var(--shadow-medium)] p-8">
        <h1 className="font-display text-2xl font-bold text-foreground mb-2">
          Reset your password
        </h1>
        <p className="text-sm text-muted-foreground mb-6">
          Enter your email and we&apos;ll send you a link to reset your password.
        </p>

        {serverError && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-800 mb-6">
            {serverError}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1.5">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="you@example.com"
              disabled={isPending}
            />
            {fieldError && (
              <p className="text-sm text-red-600 mt-1">{fieldError}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full bg-primary text-primary-foreground rounded-lg px-4 py-2.5 text-sm font-semibold hover:opacity-90 disabled:opacity-60 transition-opacity flex items-center justify-center gap-2"
          >
            {isPending && <Loader2 size={16} className="animate-spin" />}
            Send reset link
          </button>
        </form>
      </div>
    </main>
  )
}
