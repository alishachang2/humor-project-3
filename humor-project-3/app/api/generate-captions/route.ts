import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (!authHeader) {
    return NextResponse.json({ error: 'Missing authorization header' }, { status: 401 })
  }

  const body = await req.json()
  const rawUrl = process.env.NEXT_PUBLIC_PIPELINE_URL

  if (!rawUrl) {
    return NextResponse.json({ error: 'Pipeline URL not configured' }, { status: 500 })
  }

  // force HTTPS — .env.local uses http:// but Vercel env var may too
  const pipelineUrl = rawUrl.replace(/^http:\/\//i, 'https://')

  const cookieHeader = req.headers.get('cookie') ?? ''

  let upstream: Response
  try {
    upstream = await fetch(`${pipelineUrl}/pipeline/generate-captions`, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
        ...(cookieHeader ? { 'Cookie': cookieHeader } : {}),
      },
      body: JSON.stringify(body),
      redirect: 'manual',
    })
  } catch (err: any) {
    return NextResponse.json({ error: `Network error: ${err.message}` }, { status: 502 })
  }

  // redirect means the API rejected the token and sent us to /login
  if (upstream.status >= 300 && upstream.status < 400) {
    const cookieNames = cookieHeader
      .split(';')
      .map(c => c.trim().split('=')[0])
      .filter(Boolean)
    return NextResponse.json(
      {
        error: `Pipeline API requires authentication (redirected to login). Status: ${upstream.status}`,
        debug: {
          redirectLocation: upstream.headers.get('location'),
          cookieNamesForwarded: cookieNames,
          hasCookies: cookieNames.length > 0,
        },
      },
      { status: 401 }
    )
  }

  const contentType = upstream.headers.get('content-type') ?? ''
  if (!contentType.includes('application/json')) {
    const text = await upstream.text().catch(() => '')
    return NextResponse.json(
      { error: `Pipeline API returned non-JSON response (${upstream.status}): ${text.slice(0, 200)}` },
      { status: 502 }
    )
  }

  const data = await upstream.json().catch(() => null)
  return NextResponse.json(data, { status: upstream.status })
}
