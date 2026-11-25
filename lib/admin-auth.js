import crypto from 'node:crypto'
import { cookies } from 'next/headers'

export const ADMIN_COOKIE = 'na_admin_session'
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000

function getAdminSecret() {
  return (process.env.ADMIN_SESSION_SECRET || '').trim()
}

export function getAdminCredentials() {
  const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase()
  const password = (process.env.ADMIN_PASSWORD || '').trim()
  const secret = getAdminSecret()
  const configured = !!(email && password && secret && !password.includes('...'))
  return { email, password, secret, configured }
}

function signPayload(payloadB64, secret) {
  return crypto.createHmac('sha256', secret).update(payloadB64).digest('base64url')
}

export function createAdminSessionToken(email) {
  const secret = getAdminSecret()
  if (!secret) throw new Error('ADMIN_SESSION_SECRET is not configured.')
  const payload = Buffer.from(
    JSON.stringify({ email, exp: Date.now() + SESSION_TTL_MS }),
    'utf8',
  ).toString('base64url')
  const sig = signPayload(payload, secret)
  return `${payload}.${sig}`
}

export function verifyAdminSessionToken(token) {
  const secret = getAdminSecret()
  if (!token || !secret || !token.includes('.')) return null
  const [payload, sig] = token.split('.')
  if (!payload || !sig) return null
  const expected = signPayload(payload, secret)
  const a = Buffer.from(expected, 'utf8')
  const b = Buffer.from(sig, 'utf8')
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null
  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
    if (!parsed?.email || !parsed?.exp || Date.now() > parsed.exp) return null
    return { email: parsed.email }
  } catch {
    return null
  }
}

export function verifyAdminPassword(inputEmail, inputPassword) {
  const { email, password, configured } = getAdminCredentials()
  if (!configured) return false
  const e1 = Buffer.from(String(inputEmail || '').trim().toLowerCase(), 'utf8')
  const e2 = Buffer.from(email, 'utf8')
  const p1 = Buffer.from(String(inputPassword || ''), 'utf8')
  const p2 = Buffer.from(password, 'utf8')
  if (e1.length !== e2.length || p1.length !== p2.length) return false
  return crypto.timingSafeEqual(e1, e2) && crypto.timingSafeEqual(p1, p2)
}

export async function getAdminFromCookie() {
  try {
    const jar = await cookies()
    const token = jar.get(ADMIN_COOKIE)?.value || ''
    return verifyAdminSessionToken(token)
  } catch {
    return null
  }
}

export async function getSupabaseAdminUser(req) {
  const auth = req.headers.get('authorization') || ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : ''
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  if (!token || !url || !key) return { user: null, role: null, token: '' }

  try {
    const uRes = await fetch(`${url}/auth/v1/user`, {
      headers: { apikey: key, Authorization: `Bearer ${token}` },
    })
    if (!uRes.ok) return { user: null, role: null, token: '' }
    const user = await uRes.json()
    if (!user?.id) return { user: null, role: null, token: '' }

    const pRes = await fetch(`${url}/rest/v1/profiles?id=eq.${encodeURIComponent(user.id)}&select=role`, {
      headers: { apikey: key, Authorization: `Bearer ${token}` },
    })
    const rows = await pRes.json().catch(() => [])
    const role = Array.isArray(rows) && rows[0]?.role ? rows[0].role : 'client'
    return { user, role, token }
  } catch {
    return { user: null, role: null, token: '' }
  }
}

export async function requireAdmin(req) {
  const cookieAdmin = await getAdminFromCookie()
  if (cookieAdmin) return { ok: true, mode: 'cookie', email: cookieAdmin.email, token: '' }
  const sb = await getSupabaseAdminUser(req)
  if (sb.user && sb.role === 'admin') {
    return { ok: true, mode: 'supabase', email: sb.user.email, userId: sb.user.id, token: sb.token }
  }
  return { ok: false, mode: null, email: '', token: '' }
}
