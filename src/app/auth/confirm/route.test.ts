import { describe, it, vi } from 'vitest'

vi.mock('@/lib/supabase/server')
vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
  revalidatePath: vi.fn(),
}))

describe('GET /auth/confirm', () => {
  it.todo('calls verifyOtp with token_hash and type from search params')
  it.todo('redirects to /update-password on recovery type OTP verification')
  it.todo('redirects to /auth/error when token is invalid')
  it.todo('redirects to /auth/error when token_hash is missing')
  it.todo('redirects to /auth/error when type is missing')
})
