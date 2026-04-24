import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

// Only available outside of production — used by Playwright global setup
export async function GET(request: Request) {
  if (process.env.NODE_ENV === 'production') {
    return new NextResponse('Not found', { status: 404 })
  }

  const url = new URL(request.url)
  const email = url.searchParams.get('email')
  const password = url.searchParams.get('password')

  if (!email || !password) {
    return new NextResponse('Missing email or password', { status: 400 })
  }

  const redirectResponse = NextResponse.redirect(new URL('/flavors', request.url))

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return [] },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            redirectResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) return new NextResponse(`Auth failed: ${error.message}`, { status: 400 })

  return redirectResponse
}
