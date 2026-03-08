import { describe, it, expect, vi, beforeEach } from 'vitest'

// ─────────────────────────────────────────────────────────────────────────────
// Hoisted mock variables
// ─────────────────────────────────────────────────────────────────────────────

const {
  mockExchangeCodeForSession,
  mockGetUser,
  mockCreateClient,
  mockCookiesGet,
  mockDbUpdate,
  mockDbUpdateSet,
  mockDbUpdateSetWhere,
} = vi.hoisted(() => {
  const mockExchangeCodeForSession = vi.fn()
  const mockGetUser = vi.fn()
  const mockCreateClient = vi.fn(() =>
    Promise.resolve({
      auth: {
        exchangeCodeForSession: mockExchangeCodeForSession,
        getUser: mockGetUser,
      },
    })
  )

  const mockCookiesGet = vi.fn(() => undefined)

  const mockDbUpdateSetWhere = vi.fn()
  const mockDbUpdateSet = vi.fn(() => ({ where: mockDbUpdateSetWhere }))
  const mockDbUpdate = vi.fn(() => ({ set: mockDbUpdateSet }))

  return {
    mockExchangeCodeForSession,
    mockGetUser,
    mockCreateClient,
    mockCookiesGet,
    mockDbUpdate,
    mockDbUpdateSet,
    mockDbUpdateSetWhere,
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// Mocks
// ─────────────────────────────────────────────────────────────────────────────

vi.mock('@/lib/supabase/server', () => ({
  createClient: mockCreateClient,
}))

vi.mock('next/headers', () => ({
  cookies: vi.fn(() =>
    Promise.resolve({
      get: mockCookiesGet,
    })
  ),
}))

vi.mock('@/db', () => ({
  db: {
    update: mockDbUpdate,
  },
}))

vi.mock('@/db/schema', () => ({
  songs: {},
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((col, val) => ({ col, val, type: 'eq' })),
  and: vi.fn((...args) => ({ args, type: 'and' })),
  isNull: vi.fn((col) => ({ col, type: 'isNull' })),
}))

// ─────────────────────────────────────────────────────────────────────────────
// Imports — after mocks
// ─────────────────────────────────────────────────────────────────────────────

import { GET } from './route'
import { NextRequest } from 'next/server'

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function makeRequest(params: Record<string, string> = {}): NextRequest {
  const url = new URL('http://localhost:3000/auth/callback')
  for (const [key, val] of Object.entries(params)) {
    url.searchParams.set(key, val)
  }
  return new NextRequest(url.toString())
}

// ─────────────────────────────────────────────────────────────────────────────
// Setup
// ─────────────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()

  // Rebuild mock chains after clearAllMocks
  mockDbUpdate.mockReturnValue({ set: mockDbUpdateSet })
  mockDbUpdateSet.mockReturnValue({ where: mockDbUpdateSetWhere })
  mockDbUpdateSetWhere.mockResolvedValue([])

  // Default: successful code exchange
  mockExchangeCodeForSession.mockResolvedValue({ error: null })
  // Default: user returned after exchange
  mockGetUser.mockResolvedValue({
    data: { user: { id: 'user-id-123' } },
  })
  // Default: no session cookie
  mockCookiesGet.mockReturnValue(undefined)
})

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /auth/callback', () => {
  describe('code exchange', () => {
    it('calls exchangeCodeForSession with the code from query params', async () => {
      const req = makeRequest({ code: 'oauth-code-abc', next: '/dashboard' })
      await GET(req)

      expect(mockExchangeCodeForSession).toHaveBeenCalledWith('oauth-code-abc')
    })

    it('redirects to next param after successful code exchange', async () => {
      const req = makeRequest({ code: 'oauth-code-abc', next: '/dashboard' })
      const response = await GET(req)

      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toContain('/dashboard')
    })

    it('redirects to /dashboard when no next param is provided', async () => {
      const req = makeRequest({ code: 'oauth-code-abc' })
      const response = await GET(req)

      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toContain('/dashboard')
    })
  })

  describe('error paths', () => {
    it('redirects to /auth/error when no code is provided', async () => {
      const req = makeRequest({})
      const response = await GET(req)

      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toContain('/auth/error')
      expect(mockExchangeCodeForSession).not.toHaveBeenCalled()
    })

    it('redirects to /auth/error when exchangeCodeForSession fails', async () => {
      mockExchangeCodeForSession.mockResolvedValue({
        error: { message: 'Invalid OAuth code' },
      })

      const req = makeRequest({ code: 'bad-code' })
      const response = await GET(req)

      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toContain('/auth/error')
    })

    it('includes error message in /auth/error redirect URL', async () => {
      mockExchangeCodeForSession.mockResolvedValue({
        error: { message: 'Token expired' },
      })

      const req = makeRequest({ code: 'expired-code' })
      const response = await GET(req)

      const location = response.headers.get('location') ?? ''
      expect(location).toContain('error=')
    })
  })

  describe('next param sanitization', () => {
    it('sanitizes next param — must start with /', async () => {
      const req = makeRequest({ code: 'code-abc', next: 'http://evil.com' })
      const response = await GET(req)

      const location = response.headers.get('location') ?? ''
      expect(location).not.toContain('evil.com')
      expect(location).toContain('/dashboard')
    })

    it('allows valid relative next param starting with /', async () => {
      const req = makeRequest({ code: 'code-abc', next: '/quiz/step-1' })
      const response = await GET(req)

      const location = response.headers.get('location') ?? ''
      expect(location).toContain('/quiz/step-1')
    })
  })

  describe('anonymous song claim', () => {
    it('claims anonymous songs when notevra_session cookie exists', async () => {
      mockCookiesGet.mockReturnValue({ value: 'anon-session-token-xyz' })

      const req = makeRequest({ code: 'oauth-code-abc' })
      await GET(req)

      expect(mockDbUpdate).toHaveBeenCalled()
      expect(mockDbUpdateSet).toHaveBeenCalledWith({
        userId: 'user-id-123',
        sessionToken: null,
      })
    })

    it('does NOT call db.update when no notevra_session cookie', async () => {
      mockCookiesGet.mockReturnValue(undefined)

      const req = makeRequest({ code: 'oauth-code-abc' })
      await GET(req)

      expect(mockDbUpdate).not.toHaveBeenCalled()
    })

    it('still redirects even if claim DB update throws (non-fatal)', async () => {
      mockCookiesGet.mockReturnValue({ value: 'session-token-abc' })
      mockDbUpdateSetWhere.mockRejectedValue(new Error('DB claim failed'))

      const req = makeRequest({ code: 'oauth-code-abc', next: '/dashboard' })
      const response = await GET(req)

      // Should still redirect successfully, not throw
      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toContain('/dashboard')
    })

    it('does NOT claim songs when no user is returned after exchange', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } })
      mockCookiesGet.mockReturnValue({ value: 'session-token-abc' })

      const req = makeRequest({ code: 'oauth-code-abc' })
      await GET(req)

      expect(mockDbUpdate).not.toHaveBeenCalled()
    })
  })
})
