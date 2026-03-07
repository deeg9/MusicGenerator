import { describe, it, vi } from 'vitest'

vi.mock('@/lib/supabase/server')
vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
  revalidatePath: vi.fn(),
}))

describe('resetPassword', () => {
  it.todo('calls resetPasswordForEmail with the provided email')
  it.todo('returns success state regardless of whether email exists')
  it.todo('returns validation error for invalid email format')
})
