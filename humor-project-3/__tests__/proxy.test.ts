/** @jest-environment node */
import { NextRequest } from 'next/server'
import { updateSession } from '@/app/lib/supabase/proxy'

const mockGetClaims = jest.fn()
const mockFrom = jest.fn()

jest.mock('@supabase/ssr', () => ({
  createServerClient: () => ({
    auth: { getClaims: mockGetClaims },
    from: mockFrom,
  }),
}))

function makeRequest(pathname: string) {
  return new NextRequest(`http://localhost:3000${pathname}`)
}

describe('updateSession middleware', () => {
  beforeEach(() => {
    mockGetClaims.mockClear()
    mockFrom.mockClear()
  })

  it('redirects unauthenticated user from protected route to /', async () => {
    mockGetClaims.mockResolvedValue({ data: { claims: null } })
    const response = await updateSession(makeRequest('/flavors'))
    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toContain('/')
  })

  it('allows unauthenticated user to access /', async () => {
    mockGetClaims.mockResolvedValue({ data: { claims: null } })
    const response = await updateSession(makeRequest('/'))
    expect(response.status).not.toBe(307)
  })

  it('allows unauthenticated user to access /auth routes', async () => {
    mockGetClaims.mockResolvedValue({ data: { claims: null } })
    const response = await updateSession(makeRequest('/auth/callback'))
    expect(response.status).not.toBe(307)
  })

  it('redirects non-superadmin from /flavors to /', async () => {
    mockGetClaims.mockResolvedValue({ data: { claims: { sub: 'user-1' } } })
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({ data: { is_superadmin: false } }),
        }),
      }),
    })
    const response = await updateSession(makeRequest('/flavors'))
    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toContain('/')
  })

  it('allows superadmin to access /flavors', async () => {
    mockGetClaims.mockResolvedValue({ data: { claims: { sub: 'user-1' } } })
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({ data: { is_superadmin: true } }),
        }),
      }),
    })
    const response = await updateSession(makeRequest('/flavors'))
    expect(response.status).not.toBe(307)
  })
})
