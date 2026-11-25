import { NextResponse } from 'next/server'
import {
  ADMIN_COOKIE,
  createAdminSessionToken,
  getAdminCredentials,
  getAdminFromCookie,
  verifyAdminPassword,
} from '../../../../lib/admin-auth'

export async function GET() {
  const { configured } = getAdminCredentials()
  const session = await getAdminFromCookie()
  return NextResponse.json({
    configured,
    authenticated: !!session,
    email: session?.email || null,
  })
}

export async function POST(req) {
  const { configured } = getAdminCredentials()
  if (!configured) {
    return NextResponse.json(
      { error: 'Admin login is not configured. Set ADMIN_EMAIL, ADMIN_PASSWORD, and ADMIN_SESSION_SECRET.' },
      { status: 503 },
    )
  }

  let body
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const email = String(body?.email || '').trim().toLowerCase()
  const password = String(body?.password || '')
  if (!verifyAdminPassword(email, password)) {
    return NextResponse.json({ error: 'Invalid admin email or password.' }, { status: 401 })
  }

  const token = createAdminSessionToken(email)
  const res = NextResponse.json({ ok: true, email })
  res.cookies.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 7 * 24 * 60 * 60,
  })
  return res
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true })
  res.cookies.set(ADMIN_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  })
  return res
}
