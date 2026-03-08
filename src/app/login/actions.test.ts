import { describe, it, expect, vi, beforeEach } from 'vitest'

// ─────────────────────────────────────────────────────────────────────────────
// Hoisted mock variables
// ─────────────────────────────────────────────────────────────────────────────

const {
  mockSignInWithPassword,
  mockSignInWithOAuth,
  mockSignOut,
  mockCreateClient,
} = vi.hoisted(() => {
  const mockSignInWithPassword = vi.fn()
  const mockSignInWithOAuth = vi.fn()
  const mockSignOut = vi.fn()
  const mockCreateClient = vi.fn(() =>
    Promise.resolve({
      auth: {
        signInWithPassword: mockSignInWithPassword,
        signInWithOAuth: mockSignInWithOAuth,
        signOut: mockSignOut,
      },
    })
  )

  return {
    mockSignInWithPassword,
    mockSignInWithOAuth,
    mockSignOut,
    mockCreateClient,
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// Mocks
// ─────────────────────────────────────────────────────────────────────────────

vi.mock('@/lib/supabase/server', () => ({
  createClient: mockCreateClient,
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

// Next.js redirect throws internally — mock to throw so we can detect it
vi.mock('next/navigation', () => ({
  redirect: vi.fn(() => {
    throw new Error('NEXT_REDIRECT')
  }),
}))

// Mock headers() from next/headers
const { mockHeadersGet } = vi.hoisted(() => {
  const mockHeadersGet = vi.fn()
  return { mockHeadersGet }
})

vi.mock('next/headers', () => ({
  headers: vi.fn(() =>
    Promise.resolve({
      get: mockHeadersGet,
    })
  ),
}))

// ─────────────────────────────────────────────────────────────────────────────
// Imports — after mocks
// ─────────────────────────────────────────────────────────────────────────────

import { login, signOut, signInWithGoogle } from './actions'

// ─────────────────────────────────────────────────────────────────────────────
// Setup
// ─────────────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
  // Default: origin header is present
  mockHeadersGet.mockReturnValue('https://example.com')
})

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('login', () => {
  it.todo('redirects to / on successful login')
  it.todo('returns error when credentials are invalid')
  it.todo('returns error when email is not registered')
})

describe('signOut', () => {
  it.todo('calls supabase.auth.signOut and redirects to /')
})

describe('signInWithGoogle', () => {
  beforeEach(() => {
    // Default: signInWithOAuth succeeds and returns a URL
    mockSignInWithOAuth.mockResolvedValue({
      data: { url: 'https://accounts.google.com/o/oauth2/auth?...' },
      error: null,
    })
  })

  it('calls signInWithOAuth with provider google', async () => {
    await expect(signInWithGoogle()).rejects.toThrow('NEXT_REDIRECT')

    expect(mockSignInWithOAuth).toHaveBeenCalledWith(
      expect.objectContaining({ provider: 'google' })
    )
  })

  it('includes /auth/callback in the redirectTo URL', async () => {
    await expect(signInWithGoogle()).rejects.toThrow('NEXT_REDIRECT')

    const callArgs = mockSignInWithOAuth.mock.calls[0][0]
    expect(callArgs.options.redirectTo).toContain('/auth/callback')
  })

  it('threads next param into the callback URL as a search param', async () => {
    await expect(signInWithGoogle('/dashboard')).rejects.toThrow('NEXT_REDIRECT')

    const callArgs = mockSignInWithOAuth.mock.calls[0][0]
    expect(callArgs.options.redirectTo).toContain('next=%2Fdashboard')
  })

  it('redirects to data.url on success', async () => {
    const { redirect } = await import('next/navigation')

    try {
      await signInWithGoogle()
    } catch {
      // redirect throws
    }

    expect(redirect).toHaveBeenCalledWith(
      'https://accounts.google.com/o/oauth2/auth?...'
    )
  })

  it('redirects to /auth/error when origin header is missing', async () => {
    mockHeadersGet.mockReturnValue(null)

    const { redirect } = await import('next/navigation')

    try {
      await signInWithGoogle()
    } catch {
      // redirect throws
    }

    const redirectArg = (redirect as ReturnType<typeof vi.fn>).mock.calls[0][0] as string
    expect(redirectArg).toContain('/auth/error')
  })

  it('redirects to /auth/error when signInWithOAuth returns an error', async () => {
    mockSignInWithOAuth.mockResolvedValue({
      data: { url: null },
      error: { message: 'OAuth provider error' },
    })

    const { redirect } = await import('next/navigation')

    try {
      await signInWithGoogle()
    } catch {
      // redirect throws
    }

    const redirectArg = (redirect as ReturnType<typeof vi.fn>).mock.calls[0][0] as string
    expect(redirectArg).toContain('/auth/error')
  })
})
