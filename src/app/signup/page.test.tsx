import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import SignupPage from './page'

// ─────────────────────────────────────────────────────────────────────────────
// Mocks
// ─────────────────────────────────────────────────────────────────────────────

vi.mock('next/navigation', () => ({
  useSearchParams: vi.fn(() => ({
    get: vi.fn(() => null),
  })),
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
  })),
}))

vi.mock('@/app/login/actions', () => ({
  signInWithGoogle: vi.fn(),
}))

vi.mock('./actions', () => ({
  signup: vi.fn(),
}))

// ─────────────────────────────────────────────────────────────────────────────
// Setup
// ─────────────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
})

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('SignupPage', () => {
  it('renders a "Continue with Google" button', () => {
    render(<SignupPage />)
    expect(screen.getByText('Continue with Google')).toBeInTheDocument()
  })

  it('renders an "or" divider between the Google button and email form', () => {
    render(<SignupPage />)
    expect(screen.getByText('or')).toBeInTheDocument()
  })

  it('renders the email form (non-regression)', () => {
    render(<SignupPage />)
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText('At least 8 characters')).toBeInTheDocument()
  })

  it('renders the "Sign up" submit button', () => {
    render(<SignupPage />)
    expect(screen.getByRole('button', { name: /sign up/i })).toBeInTheDocument()
  })

  it('renders a link to the login page', () => {
    render(<SignupPage />)
    expect(screen.getByRole('link', { name: /log in/i })).toBeInTheDocument()
  })
})
