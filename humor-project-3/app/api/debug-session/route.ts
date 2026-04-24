import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function GET(request: Request) {
  if (process.env.NODE_ENV === 'production') {
    return new NextResponse('Not found', { status: 404 })
  }

  const cookieHeader = request.headers.get('cookie') ?? ''
  const parsedCookies = cookieHeader.split(';').flatMap(c => {
    const eq = c.indexOf('=')
    if (eq === -1) return []
    return [{ name: c.slice(0, eq).trim(), value: c.slice(eq + 1).trim() }]
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return parsedCookies },
        setAll() {},
      },
    }
  )

  const { data } = await supabase.auth.getClaims()

  return NextResponse.json({
    cookieNames: parsedCookies.map(c => c.name),
    claims: data?.claims ?? null,
  })
}
