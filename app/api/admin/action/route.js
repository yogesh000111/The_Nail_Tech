import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { requireAdmin } from '../../../../lib/admin-auth'
import { readResponses, writeResponses } from '../../../../lib/responses-store'

function getAdminSupabase(userToken) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim()
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  if (!url || !anonKey) return null

  if (serviceKey && !serviceKey.includes('...')) {
    return createClient(url, serviceKey, { auth: { persistSession: false } })
  }
  if (userToken) {
    return createClient(url, anonKey, {
      auth: { persistSession: false },
      global: { headers: { Authorization: `Bearer ${userToken}` } },
    })
  }
  return null
}

export async function POST(req) {
  const admin = await requireAdmin(req)
  if (!admin.ok) {
    return NextResponse.json({ error: 'Admin authentication required.' }, { status: 401 })
  }

  let body
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const sb = getAdminSupabase(admin.token)
  const store = readResponses()
  const action = body?.action

  if (action === 'booking_status') {
    const { id, status } = body
    if (!id || !status) return NextResponse.json({ error: 'Missing booking ID or status.' }, { status: 400 })
    if (sb) {
      const { error } = await sb.from('bookings').update({ status }).eq('id', id)
      if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    }
    store.bookings = store.bookings.map((b) => (String(b.id) === String(id) ? { ...b, status } : b))
    writeResponses(store)
    return NextResponse.json({ ok: true })
  }

  if (action === 'application_status') {
    const { id, status } = body
    if (!id || !['approved', 'rejected'].includes(status)) {
      return NextResponse.json({ error: 'Invalid application action.' }, { status: 400 })
    }
    if (sb) {
      const res = status === 'approved'
        ? await sb.rpc('approve_application', { app: id })
        : await sb.from('applications').update({ status: 'rejected' }).eq('id', id)
      if (res.error) return NextResponse.json({ error: res.error.message }, { status: 400 })
    }
    store.applications = store.applications.map((a) => (String(a.id) === String(id) ? { ...a, status } : a))
    writeResponses(store)
    return NextResponse.json({ ok: true })
  }

  if (action === 'inquiry_status') {
    const { id, status } = body
    if (!id || !status) return NextResponse.json({ error: 'Missing inquiry ID or status.' }, { status: 400 })
    store.inquiries = store.inquiries.map((i) => (String(i.id) === String(id) ? { ...i, status } : i))
    writeResponses(store)
    return NextResponse.json({ ok: true })
  }

  if (action === 'user_role') {
    const { userId, nextRole } = body
    if (!userId || !['client', 'student', 'admin'].includes(nextRole)) {
      return NextResponse.json({ error: 'Invalid user role update.' }, { status: 400 })
    }
    if (admin.userId && userId === admin.userId && nextRole !== 'admin') {
      return NextResponse.json({ error: 'You cannot remove admin access from your own account.' }, { status: 400 })
    }
    if (!sb) {
      return NextResponse.json({ error: 'Set SUPABASE_SERVICE_ROLE_KEY in .env.local or sign in with a Supabase admin account to update user roles in Supabase.' }, { status: 400 })
    }
    const { error } = await sb.from('profiles').update({ role: nextRole }).eq('id', userId)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ ok: true })
  }

  if (action === 'toggle_skill') {
    const { userId, skillId, nextDone, exists } = body
    if (!userId || !skillId) return NextResponse.json({ error: 'Missing skill details.' }, { status: 400 })
    if (!sb) {
      return NextResponse.json({ error: 'Set SUPABASE_SERVICE_ROLE_KEY in .env.local or sign in with a Supabase admin account to update student logbooks.' }, { status: 400 })
    }
    const { error } = exists
      ? await sb.from('student_skills').update({ done: !!nextDone }).eq('user_id', userId).eq('skill_id', skillId)
      : await sb.from('student_skills').insert({ user_id: userId, skill_id: skillId, done: !!nextDone })
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Unknown admin action.' }, { status: 400 })
}
