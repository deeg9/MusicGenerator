import { vi } from 'vitest'

export const createClient = vi.fn().mockReturnValue({
  auth: {
    onAuthStateChange: vi.fn(),
    getUser: vi.fn(),
  },
})
