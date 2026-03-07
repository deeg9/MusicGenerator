'use client'

import { useState, useTransition } from 'react'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { updatePasswordSchema } from '@/lib/supabase/auth-schemas'
import { updatePassword } from './actions'

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [fieldError, setFieldError] = useState<string | null>(null)
  const [serverError, setServerError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setFieldError(null)
    setServerError(null)

    const result = updatePasswordSchema.safeParse({ password })
    if (!result.success) {
      setFieldError(result.error.flatten().fieldErrors.password?.[0] ?? null)
      return
    }

    const formData = new FormData()
    formData.set('password', password)

    startTransition(async () => {
      const response = await updatePassword(formData)
      if (response?.error) {
        setServerError(response.error)
      }
    })
  }

  return (
    <main className="min-h-[60vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-card rounded-[var(--radius-lg)] shadow-[var(--shadow-medium)] p-8">
        <h1 className="font-display text-2xl font-bold text-foreground mb-6">
          Set your new password
        </h1>

        {serverError && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-800 mb-6">
            {serverError}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-foreground mb-1.5">
              New password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-border px-3 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="At least 8 characters"
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
            Update password
          </button>
        </form>
      </div>
    </main>
  )
}
