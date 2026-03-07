import { describe, it, vi } from 'vitest'

vi.mock('@/lib/supabase/server')
vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
  revalidatePath: vi.fn(),
}))

describe('signup', () => {
  it.todo('redirects to /dashboard on successful signup')
  it.todo('returns error when email is already taken')
  it.todo('returns validation error for invalid email format')
  it.todo('returns validation error for short password')
})
