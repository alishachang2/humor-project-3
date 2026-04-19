'use client'

import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const supabase = createClient()

  const handleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
  }

  return (
    <div style={s.page}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&display=swap" rel="stylesheet" />
      <div style={{ height: 3, backgroundColor: 'var(--green)' }} />

      <header style={s.header}>
        <span style={s.label}>The Humor Project</span>
        <span style={{ ...s.label, color: 'var(--text2)' }}>Prompt Chain Tool</span>
      </header>

      <main style={s.main}>
        <p style={s.eyebrow}>Admin Only</p>
        <h1 style={s.heading}>Humor<br /><em>Flavors.</em></h1>
        <p style={s.body}>
          Build and manage prompt chains that turn images into captions.
          Only superadmins and matrix admins can access this tool.
        </p>
        <button type="button" onClick={handleLogin} style={s.button} className="login-btn">
          Login with Google
        </button>
      </main>

      <footer style={s.footer}>
        <span style={s.label}>© 2026</span>
      </footer>

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .login-btn:hover { background: var(--accent) !important; color: var(--accent-fg) !important; }
      `}</style>
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    backgroundColor: 'var(--bg)',
    color: 'var(--text)',
    display: 'flex',
    flexDirection: 'column',
    animation: 'fadeUp 0.4s cubic-bezier(0.16,1,0.3,1) forwards',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '16px 48px',
    borderBottom: '1px solid var(--border)',
  },
  label: { fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase' as const },
  eyebrow: { fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase' as const, color: 'var(--text2)', marginBottom: 16 },
  main: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    padding: '0 48px',
    maxWidth: 560,
  },
  heading: {
    fontFamily: "'DM Serif Display', serif",
    fontSize: 84,
    fontWeight: 400,
    lineHeight: 0.92,
    letterSpacing: '-0.03em',
    marginBottom: 24,
  },
  body: { fontSize: 14, lineHeight: 1.7, color: 'var(--text2)', marginBottom: 32, maxWidth: 400 },
  button: {
    alignSelf: 'flex-start',
    padding: '11px 28px',
    border: '1px solid var(--accent)',
    background: 'transparent',
    color: 'var(--text)',
    fontSize: 11,
    letterSpacing: '0.08em',
    textTransform: 'uppercase' as const,
    cursor: 'pointer',
    transition: 'background 0.15s, color 0.15s',
  },
  footer: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '14px 48px',
    borderTop: '1px solid var(--border)',
  },
}
