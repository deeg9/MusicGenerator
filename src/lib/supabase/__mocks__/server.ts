import { vi } from 'vitest'

export const mockSupabaseAuth = {
  signUp: vi.fn(),
  signInWithPassword: vi.fn(),
  signOut: vi.fn(),
  resetPasswordForEmail: vi.fn(),
  updateUser: vi.fn(),
  getUser: vi.fn(),
  verifyOtp: vi.fn(),
}

export const createClient = vi.fn().mockResolvedValue({
  auth: mockSupabaseAuth,
})
