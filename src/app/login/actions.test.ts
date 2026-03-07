import { describe, it, vi } from 'vitest'

vi.mock('@/lib/supabase/server')
vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
  revalidatePath: vi.fn(),
}))

describe('login', () => {
  it.todo('redirects to / on successful login')
  it.todo('returns error when credentials are invalid')
  it.todo('returns error when email is not registered')
})

describe('signOut', () => {
  it.todo('calls supabase.auth.signOut and redirects to /')
})
