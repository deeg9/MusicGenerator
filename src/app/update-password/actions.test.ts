import { describe, it, vi } from 'vitest'

vi.mock('@/lib/supabase/server')
vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
  revalidatePath: vi.fn(),
}))

describe('updatePassword', () => {
  it.todo('calls supabase.auth.updateUser with the new password')
  it.todo('redirects to /dashboard on successful password update')
  it.todo('returns error when update fails')
  it.todo('returns validation error for short password')
})
