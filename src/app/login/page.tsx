'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { loginSchema } from '@/lib/supabase/auth-schemas'
import { login } from './actions'

export default function LoginPage() {
  const searchParams = useSearchParams()
  const next = searchParams.get('next') ?? ''

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({})
  const [serverError, setServerError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setFieldErrors({})
    setServerError(null)

    const result = loginSchema.safeParse({ email, password })
    if (!result.success) {
      const errors = result.error.flatten().fieldErrors
      setFieldErrors({
        email: errors.email?.[0],
        password: errors.password?.[0],
      })
      return
    }

    const formData = new FormData()
    formData.set('email', email)
    formData.set('password', password)
    formData.set('next', next)

    startTransition(async () => {
      const response = await login(formData)
      if (response?.error) {
        setServerError(response.error)
      }
    })
  }

  return (
    <main className="min-h-[60vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-card rounded-[var(--radius-lg)] shadow-[var(--shadow-medium)] p-8">
        <h1 className="font-display text-2xl font-bold text-foreground mb-6">
          Welcome back
        </h1>

        {serverError && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-800 mb-6">
            {serverError}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <input type="hidden" name="next" value={next} />

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
            {fieldErrors.email && (
              <p className="text-sm text-red-600 mt-1">{fieldErrors.email}</p>
            )}
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-foreground mb-1.5">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-border px-3 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="Your password"
                disabled={isPending}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {fieldErrors.password && (
              <p className="text-sm text-red-600 mt-1">{fieldErrors.password}</p>
            )}
            <div className="mt-1.5">
              <Link
                href="/forgot-password"
                className="text-xs text-muted-foreground hover:text-primary hover:underline"
              >
                Forgot your password?
              </Link>
            </div>
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full bg-primary text-primary-foreground rounded-lg px-4 py-2.5 text-sm font-semibold hover:opacity-90 disabled:opacity-60 transition-opacity flex items-center justify-center gap-2"
          >
            {isPending && <Loader2 size={16} className="animate-spin" />}
            Log in
          </button>
        </form>

        <p className="mt-6 text-sm text-center text-muted-foreground">
          Don&apos;t have an account?{' '}
          <Link
            href={next ? `/signup?next=${encodeURIComponent(next)}` : '/signup'}
            className="text-primary font-medium hover:underline"
          >
            Sign up
          </Link>
        </p>
      </div>
    </main>
  )
}
