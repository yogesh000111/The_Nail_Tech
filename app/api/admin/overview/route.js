import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { requireAdmin } from '../../../../lib/admin-auth'
import { readResponses } from '../../../../lib/responses-store'

function getAdminSupabase(userToken) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim()
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  if (!url || !anonKey) return { sb: null, privileged: false }

  if (serviceKey && !serviceKey.includes('...')) {
    return { sb: createClient(url, serviceKey, { auth: { persistSession: false } }), privileged: true }
  }
  if (userToken) {
    return {
      sb: createClient(url, anonKey, {
        auth: { persistSession: false },
        global: { headers: { Authorization: `Bearer ${userToken}` } },
      }),
      privileged: true,
    }
  }
  return { sb: createClient(url, anonKey, { auth: { persistSession: false } }), privileged: false }
}

export async function GET(req) {
  const admin = await requireAdmin(req)
  if (!admin.ok) {
    return NextResponse.json({ error: 'Admin authentication required.' }, { status: 401 })
  }

  const store = readResponses()
  const { sb, privileged } = getAdminSupabase(admin.token)

  let bookings = []
  let applications = []
  let profiles = []
  let clashes = []
  let stages = []
  let skills = []
  let studentSkills = []
  let dbNote = ''

  if (sb) {
    const [stRes, skRes] = await Promise.all([
      sb.from('stages').select('*').order('no'),
      sb.from('skills').select('*').order('id'),
    ])
    stages = stRes.data || []
    skills = skRes.data || []

    if (privileged) {
      const [bRes, aRes, cRes, pRes, ssRes] = await Promise.all([
        sb.from('bookings').select('*, services(name)').order('start_at', { ascending: false }),
        sb.from('applications').select('*, courses(name,fee_inr)').order('created_at', { ascending: false }),
        sb.from('booking_clashes').select('booking_id'),
        sb.from('profiles').select('*'),
        sb.from('student_skills').select('*'),
      ])
      bookings = bRes.data || []
      applications = aRes.data || []
      clashes = (cRes.data || []).map((r) => r.booking_id)
      profiles = pRes.data || []
      studentSkills = ssRes.data || []
      const firstErr = [bRes.error, aRes.error, pRes.error].find(Boolean)
      if (firstErr) dbNote = firstErr.message
    }
  }

  // Merge local response mirror so admin sees all recorded bookings/applications even without SUPABASE_SERVICE_ROLE_KEY.
  const bkIds = new Set(bookings.map((b) => String(b.id)))
  for (const b of store.bookings) {
    if (!bkIds.has(String(b.id))) {
      const startIso = b.date && Number.isFinite(b.startHour)
        ? `${b.date}T${String(b.startHour).padStart(2, '0')}:00:00+05:30`
        : b.createdAt
      bookings.push({
        id: b.id,
        user_id: b.userId,
        client_name: b.clientName || b.userEmail?.split('@')[0] || 'Client',
        client_phone: b.clientPhone || '',
        client_email: b.userEmail || '',
        services: { name: b.serviceName || 'Nail service' },
        with_removal: false,
        start_at: startIso,
        advance_inr: b.advanceInr || 0,
        utr: b.paymentRef || '',
        status: b.status || 'awaiting_advance',
        created_at: b.createdAt,
        _localOnly: true,
      })
    }
  }

  const appIds = new Set(applications.map((a) => String(a.id)))
  for (const a of store.applications) {
    if (!appIds.has(String(a.id))) {
      applications.push({
        id: a.id,
        user_id: a.userId,
        course_id: a.courseId,
        courses: { name: a.courseName, fee_inr: a.courseFee },
        student_name: a.studentName,
        student_phone: a.studentPhone,
        parent_name: a.parentName,
        parent_phone: a.parentPhone,
        status: a.status || 'pending',
        created_at: a.createdAt,
        _localOnly: true,
      })
    }
  }

  const profileById = Object.fromEntries(profiles.map((p) => [p.id, p]))
  for (const src of [...store.bookings, ...store.applications]) {
    if (src.userId && !profileById[src.userId]) {
      const synthesized = {
        id: src.userId,
        email: src.userEmail || '',
        full_name: src.clientName || src.studentName || src.userEmail?.split('@')[0] || 'User',
        phone: src.clientPhone || src.studentPhone || '',
        role: 'client',
        created_at: src.createdAt,
      }
      profileById[src.userId] = synthesized
      profiles.push(synthesized)
    }
  }

  return NextResponse.json({
    adminEmail: admin.email,
    authMode: admin.mode,
    privilegedDb: privileged,
    dbNote,
    bookings,
    applications,
    appMeta: store.applications,
    inquiries: store.inquiries,
    visitors: store.visitors,
    profiles,
    clashes,
    stages,
    skills,
    studentSkills,
  })
}
