import { render, screen, fireEvent } from '@testing-library/react'
import LoginPage from '@/app/page'

const mockSignInWithOAuth = jest.fn()

jest.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: { signInWithOAuth: mockSignInWithOAuth },
  }),
}))

describe('LoginPage', () => {
  beforeEach(() => mockSignInWithOAuth.mockClear())

  it('renders the login button', () => {
    render(<LoginPage />)
    expect(screen.getByText('Login with Google')).toBeInTheDocument()
  })

  it('renders the branding', () => {
    render(<LoginPage />)
    expect(screen.getByText('The Humor Project')).toBeInTheDocument()
    expect(screen.getByText('Prompt Chain Tool')).toBeInTheDocument()
  })

  it('calls signInWithOAuth with google provider on click', async () => {
    render(<LoginPage />)
    fireEvent.click(screen.getByText('Login with Google'))
    expect(mockSignInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: expect.objectContaining({ redirectTo: expect.stringContaining('/auth/callback') }),
    })
  })
})
