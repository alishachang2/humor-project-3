/** @jest-environment node */
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/generate-captions/route'

const originalFetch = global.fetch

function makeRequest(body: object, authHeader = 'Bearer test-token') {
  return new NextRequest('http://localhost:3000/api/generate-captions', {
    method: 'POST',
    headers: {
      Authorization: authHeader,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
}

describe('POST /api/generate-captions', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_PIPELINE_URL = 'https://api.almostcrackd.ai'
  })

  afterEach(() => {
    global.fetch = originalFetch
  })

  it('returns 401 when Authorization header is missing', async () => {
    const req = new NextRequest('http://localhost:3000/api/generate-captions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageId: 'abc' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error).toMatch(/missing authorization/i)
  })

  it('returns 500 when NEXT_PUBLIC_PIPELINE_URL is not configured', async () => {
    delete process.env.NEXT_PUBLIC_PIPELINE_URL
    const res = await POST(makeRequest({ imageId: 'abc' }))
    expect(res.status).toBe(500)
    const json = await res.json()
    expect(json.error).toMatch(/pipeline url not configured/i)
  })

  it('returns 502 on network error (Failed to fetch)', async () => {
    global.fetch = jest.fn().mockRejectedValue(new TypeError('Failed to fetch'))
    const res = await POST(makeRequest({ imageId: 'abc' }))
    expect(res.status).toBe(502)
    const json = await res.json()
    expect(json.error).toMatch(/network error/i)
  })

  it('returns 502 when upstream returns non-JSON content-type (HTML error page)', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      status: 502,
      headers: { get: (h: string) => (h === 'content-type' ? 'text/html' : null) },
      text: async () => '<html><body>Bad Gateway</body></html>',
    })
    const res = await POST(makeRequest({ imageId: 'abc' }))
    expect(res.status).toBe(502)
    const json = await res.json()
    expect(json.error).toMatch(/non-JSON response/i)
    expect(json.upstreamStatus).toBe(502)
  })

  it('returns 502 when upstream returns non-JSON with 500 status', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      status: 500,
      headers: { get: (h: string) => (h === 'content-type' ? 'text/plain' : null) },
      text: async () => 'Internal Server Error',
    })
    const res = await POST(makeRequest({ imageId: 'abc' }))
    expect(res.status).toBe(502)
    const json = await res.json()
    expect(json.upstreamStatus).toBe(500)
  })

  it('returns 401 when upstream returns a 3xx redirect (auth failure)', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      status: 307,
      headers: { get: () => null },
    })
    const res = await POST(makeRequest({ imageId: 'abc' }))
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error).toMatch(/redirected/i)
  })

  it('forwards JSON response from upstream on success', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      status: 200,
      headers: { get: (h: string) => (h === 'content-type' ? 'application/json' : null) },
      json: async () => [true, true, true],
    })
    const res = await POST(makeRequest({ imageId: 'abc', humorFlavorId: 1 }))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json).toEqual([true, true, true])
  })

  it('forwards the Authorization header to the upstream pipeline', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      status: 200,
      headers: { get: (h: string) => (h === 'content-type' ? 'application/json' : null) },
      json: async () => [],
    })
    global.fetch = fetchMock
    await POST(makeRequest({ imageId: 'abc' }, 'Bearer my-secret-token'))
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/pipeline/generate-captions'),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer my-secret-token' }),
      })
    )
  })

  it('forwards imageId and humorFlavorId in request body', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      status: 200,
      headers: { get: (h: string) => (h === 'content-type' ? 'application/json' : null) },
      json: async () => [],
    })
    global.fetch = fetchMock
    await POST(makeRequest({ imageId: 'uuid-123', humorFlavorId: 42 }))
    const sentBody = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(sentBody.imageId).toBe('uuid-123')
    expect(sentBody.humorFlavorId).toBe(42)
  })
})
