import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (!authHeader) {
    return NextResponse.json({ error: 'Missing authorization header' }, { status: 401 })
  }

  const pipelineUrl = process.env.NEXT_PUBLIC_PIPELINE_URL
  if (!pipelineUrl) {
    return NextResponse.json({ error: 'Pipeline URL not configured' }, { status: 500 })
  }

  const body = await req.json()
  // Force HTTPS — Vercel env vars sometimes have http:// which causes a 308 redirect
  const targetUrl = `${pipelineUrl.replace(/^http:\/\//i, 'https://')}/pipeline/generate-captions`

  let upstream: Response
  try {
    upstream = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      redirect: 'manual',
    })
  } catch (err: any) {
    return NextResponse.json({
      error: `Network error reaching pipeline`,
      detail: err.message,
      url: targetUrl,
    }, { status: 502 })
  }

  const status = upstream.status
  const contentType = upstream.headers.get('content-type') ?? ''

  if (status >= 300 && status < 400) {
    const location = upstream.headers.get('location') ?? '(none)'
    return NextResponse.json({
      error: `Pipeline redirected — not authenticated with pipeline API`,
      upstreamStatus: status,
      redirectTo: location,
    }, { status: 401 })
  }

  if (!contentType.includes('application/json')) {
    const text = await upstream.text().catch(() => '')
    return NextResponse.json({
      error: `Pipeline returned non-JSON response`,
      upstreamStatus: status,
      upstreamContentType: contentType,
      upstreamBody: text.slice(0, 800),
    }, { status: 502 })
  }

  const data = await upstream.json().catch(() => null)
  return NextResponse.json(data, { status })
}
