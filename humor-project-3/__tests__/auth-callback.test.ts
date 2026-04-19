/** @jest-environment node */
import { NextRequest } from 'next/server'
import { GET } from '@/app/auth/callback/route'

const mockExchangeCodeForSession = jest.fn()

jest.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: {
      exchangeCodeForSession: mockExchangeCodeForSession,
    },
  }),
}))

function makeRequest(code?: string) {
  const url = code
    ? `http://localhost:3000/auth/callback?code=${code}`
    : 'http://localhost:3000/auth/callback'
  return new Request(url)
}

describe('GET /auth/callback', () => {
  beforeEach(() => mockExchangeCodeForSession.mockClear())

  it('redirects to /flavors after successful login', async () => {
    mockExchangeCodeForSession.mockResolvedValue({})
    const response = await GET(makeRequest('valid-code'))
    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toContain('/flavors')
  })

  it('exchanges the code for a session', async () => {
    mockExchangeCodeForSession.mockResolvedValue({})
    await GET(makeRequest('valid-code'))
    expect(mockExchangeCodeForSession).toHaveBeenCalledWith('valid-code')
  })

  it('redirects to /flavors even when code is missing', async () => {
    const response = await GET(makeRequest())
    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toContain('/flavors')
  })

  it('does not call exchangeCodeForSession when code is missing', async () => {
    await GET(makeRequest())
    expect(mockExchangeCodeForSession).not.toHaveBeenCalled()
  })
})
