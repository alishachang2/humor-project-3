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

  let upstream: Response
  try {
    upstream = await fetch(`${pipelineUrl}/pipeline/generate-captions`, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
  } catch (err: any) {
    return NextResponse.json({ error: `Network error: ${err.message}` }, { status: 502 })
  }

  if (upstream.status >= 300 && upstream.status < 400) {
    return NextResponse.json(
      { error: `Pipeline API authentication failed. Status: ${upstream.status}` },
      { status: 401 }
    )
  }

  const contentType = upstream.headers.get('content-type') ?? ''
  if (!contentType.includes('application/json')) {
    const text = await upstream.text().catch(() => '')
    return NextResponse.json(
      { error: `Pipeline API error (${upstream.status}): ${text.slice(0, 200)}` },
      { status: 502 }
    )
  }

  const data = await upstream.json().catch(() => null)
  return NextResponse.json(data, { status: upstream.status })
}
