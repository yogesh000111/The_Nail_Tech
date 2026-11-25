import { NextResponse } from 'next/server'
import { getSupabaseAdminUser, requireAdmin } from '../../../lib/admin-auth'
import { readResponses, writeResponses } from '../../../lib/responses-store'

export async function GET(req) {
  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type')
  const date = searchParams.get('date')
  const store = readResponses()

  if (type === 'slots' && date) {
    const busy = store.bookings
      .filter((b) => b.date === date && b.status !== 'cancelled')
      .map((b) => ({ startHour: Number(b.startHour), hours: Number(b.hours) || 2 }))
    return NextResponse.json({ slots: busy })
  }

  if (searchParams.get('admin') === '1') {
    const admin = await requireAdmin(req)
    if (!admin.ok) {
      return NextResponse.json({ error: 'Admin access required.' }, { status: 403 })
    }
    return NextResponse.json(store)
  }

  const { user } = await getSupabaseAdminUser(req)
  if (!user) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })
  }

  return NextResponse.json({
    applications: store.applications.filter((a) => a.userId === user.id),
    bookings: store.bookings.filter((b) => b.userId === user.id),
    inquiries: store.inquiries.filter((i) => i.userId === user.id),
  })
}

export async function POST(req) {
  let body
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 })
  }

  const kind = body?.kind
  const store = readResponses()
  const now = new Date().toISOString()

  if (kind === 'visit') {
    const visitorId = String(body?.visitorId || '').trim().slice(0, 64)
    if (!visitorId) return NextResponse.json({ ok: true })
    const existing = store.visitors.find((v) => v.visitorId === visitorId)
    if (existing) {
      existing.lastSeen = now
      existing.views = Number(existing.views || 1) + 1
    } else {
      store.visitors.unshift({
        visitorId,
        firstPath: String(body?.path || '/').slice(0, 80),
        firstSeen: now,
        lastSeen: now,
        views: 1,
      })
    }
    writeResponses(store)
    return NextResponse.json({ ok: true })
  }

  if (kind === 'inquiry') {
    const name = String(body?.name || '').trim()
    const contact = String(body?.contact || '').trim()
    const topic = String(body?.topic || 'General inquiry').trim()
    const message = String(body?.message || '').trim()
    if (name.length < 2 || contact.length < 5 || message.length < 4) {
      return NextResponse.json({ error: 'Please fill in your name, phone/email, and message.' }, { status: 400 })
    }
    const { user } = await getSupabaseAdminUser(req)
    const entry = {
      id: `inq_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      userId: user?.id || null,
      email: user?.email || null,
      name,
      contact,
      topic,
      message,
      status: 'new',
      createdAt: now,
    }
    store.inquiries.unshift(entry)
    writeResponses(store)
    return NextResponse.json({ ok: true, entry })
  }

  const { user } = await getSupabaseAdminUser(req)
  if (!user) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })
  }

  if (kind === 'application') {
    const entry = {
      id: String(body?.applicationId || `app_${Date.now()}`),
      userId: user.id,
      userEmail: user.email || '',
      courseId: body?.courseId,
      courseName: String(body?.courseName || ''),
      courseFee: Number(body?.courseFee || 0),
      batch: String(body?.batch || ''),
      experience: String(body?.experience || ''),
      payPlan: String(body?.payPlan || ''),
      paymentOption: String(body?.paymentOption || ''),
      paidInr: Number(body?.paidInr || 0),
      paymentMethod: String(body?.paymentMethod || ''),
      paymentRef: String(body?.paymentRef || ''),
      paymentVerified: !!body?.paymentVerified,
      studentName: String(body?.studentName || ''),
      studentPhone: String(body?.studentPhone || ''),
      age: String(body?.age || ''),
      city: String(body?.city || ''),
      parentName: String(body?.parentName || ''),
      parentPhone: String(body?.parentPhone || ''),
      notes: String(body?.notes || ''),
      status: 'pending',
      createdAt: now,
    }
    store.applications.unshift(entry)
    writeResponses(store)
    return NextResponse.json({ ok: true, entry })
  }

  if (kind === 'booking') {
    const entry = {
      id: String(body?.bookingId || `bk_${Date.now()}`),
      userId: user.id,
      userEmail: user.email || '',
      clientName: String(body?.clientName || ''),
      clientPhone: String(body?.clientPhone || ''),
      serviceName: String(body?.serviceName || ''),
      date: String(body?.date || ''),
      startHour: Number(body?.startHour),
      hours: Number(body?.hours || 2),
      advanceInr: Number(body?.advanceInr || 0),
      paymentMethod: String(body?.paymentMethod || ''),
      paymentRef: String(body?.paymentRef || ''),
      paymentVerified: !!body?.paymentVerified,
      status: body?.paymentVerified ? 'confirmed' : 'awaiting_advance',
      createdAt: now,
    }
    store.bookings.unshift(entry)
    writeResponses(store)
    return NextResponse.json({ ok: true, entry })
  }

  return NextResponse.json({ error: 'Unknown response type.' }, { status: 400 })
}

export async function PATCH(req) {
  const admin = await requireAdmin(req)
  if (!admin.ok) {
    return NextResponse.json({ error: 'Admin access required.' }, { status: 403 })
  }

  let body
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 })
  }

  const store = readResponses()
  if (body?.kind === 'inquiry' && body?.id && body?.status) {
    store.inquiries = store.inquiries.map((i) => (i.id === body.id ? { ...i, status: body.status } : i))
    writeResponses(store)
    return NextResponse.json({ ok: true })
  }
  if (body?.kind === 'booking' && body?.id && body?.status) {
    store.bookings = store.bookings.map((b) => (b.id === body.id ? { ...b, status: body.status } : b))
    writeResponses(store)
    return NextResponse.json({ ok: true })
  }
  if (body?.kind === 'application' && body?.id && body?.status) {
    store.applications = store.applications.map((a) => (String(a.id) === String(body.id) ? { ...a, status: body.status } : a))
    writeResponses(store)
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Unsupported update.' }, { status: 400 })
}
