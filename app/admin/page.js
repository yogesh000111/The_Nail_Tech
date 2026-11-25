'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../components/AuthProvider'
import PageHead from '../../components/PageHead'
import { toast } from '../../components/Toaster'
import { digits, inr, ist, STATUS } from '../../lib/utils'

const BOOKING_FILTERS = [
  ['all', 'All'],
  ['awaiting_advance', 'Awaiting advance'],
  ['confirmed', 'Confirmed'],
  ['completed', 'Completed'],
  ['cancelled', 'Cancelled'],
]
const APP_FILTERS = [
  ['all', 'All'],
  ['pending', 'Pending'],
  ['approved', 'Approved'],
  ['rejected', 'Rejected'],
]
const INQ_FILTERS = [
  ['all', 'All'],
  ['new', 'New'],
  ['replied', 'Replied'],
  ['closed', 'Closed'],
]
const ROLE_FILTERS = [
  ['all', 'All'],
  ['client', 'Clients'],
  ['student', 'Students'],
  ['admin', 'Admins'],
]

export default function Admin() {
  const { role: sbRole } = useAuth()
  const [authState, setAuthState] = useState({ checked: false, authenticated: false, configured: true, email: '' })
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPass, setLoginPass] = useState('')
  const [loginBusy, setLoginBusy] = useState(false)
  const [loginErr, setLoginErr] = useState('')

  const [t, setT] = useState('p')
  const [bk, setBk] = useState([])
  const [apps, setApps] = useState([])
  const [appMeta, setAppMeta] = useState({})
  const [inquiries, setInquiries] = useState([])
  const [visitors, setVisitors] = useState([])
  const [users, setUsers] = useState([])
  const [stages, setStages] = useState([])
  const [skills, setSkills] = useState([])
  const [skillRows, setSkillRows] = useState([])
  const [clash, setClash] = useState(new Set())
  const [privilegedDb, setPrivilegedDb] = useState(true)
  const [q, setQ] = useState('')
  const [bFilter, setBFilter] = useState('all')
  const [aFilter, setAFilter] = useState('all')
  const [iFilter, setIFilter] = useState('all')
  const [uFilter, setUFilter] = useState('all')
  const [selectedUserId, setSelectedUserId] = useState(null)
  const [busySkill, setBusySkill] = useState(null)
  const [loadingData, setLoadingData] = useState(false)
  const [err, setErr] = useState('')

  const checkSession = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/auth')
      const d = await res.json()
      setAuthState({
        checked: true,
        authenticated: !!d.authenticated || sbRole === 'admin',
        configured: d.configured !== false,
        email: d.email || '',
      })
    } catch {
      setAuthState((prev) => ({ ...prev, checked: true, authenticated: sbRole === 'admin' }))
    }
  }, [sbRole])

  useEffect(() => { checkSession() }, [checkSession])

  const getTokenHeader = async () => {
    try {
      const { data } = await supabase.auth.getSession()
      const token = data?.session?.access_token
      return token ? { Authorization: `Bearer ${token}` } : {}
    } catch {
      return {}
    }
  }

  const load = useCallback(async () => {
    if (!authState.authenticated) return
    setLoadingData(true)
    try {
      const headers = await getTokenHeader()
      const res = await fetch('/api/admin/overview', { headers })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) {
        setErr(d.error || 'Could not load admin dashboard.')
        setLoadingData(false)
        return
      }
      setErr(d.dbNote || '')
      setPrivilegedDb(!!d.privilegedDb)
      setBk(d.bookings || [])
      setApps(d.applications || [])
      setAppMeta(Object.fromEntries((d.appMeta || []).map((x) => [String(x.id), x])))
      setInquiries(d.inquiries || [])
      setVisitors(d.visitors || [])
      setUsers(d.profiles || [])
      setClash(new Set(d.clashes || []))
      setStages(d.stages || [])
      setSkills(d.skills || [])
      setSkillRows(d.studentSkills || [])
      if (d.adminEmail) setAuthState((p) => ({ ...p, email: d.adminEmail }))
    } catch {
      setErr('Network error while loading admin dashboard.')
    } finally {
      setLoadingData(false)
    }
  }, [authState.authenticated])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!selectedUserId) return
    const k = (e) => e.key === 'Escape' && setSelectedUserId(null)
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [selectedUserId])

  async function submitAdminLogin(e) {
    e.preventDefault()
    setLoginErr('')
    if (!loginEmail.trim() || !loginPass) {
      setLoginErr('Please enter your admin email and password.')
      return
    }
    setLoginBusy(true)
    const res = await fetch('/api/admin/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: loginEmail.trim(), password: loginPass }),
    })
    const d = await res.json().catch(() => ({}))
    setLoginBusy(false)
    if (!res.ok) {
      setLoginErr(d.error || 'Invalid admin email or password.')
      return
    }
    setLoginPass('')
    toast('Admin signed in')
    setAuthState({ checked: true, authenticated: true, configured: true, email: d.email })
  }

  async function adminLogout() {
    await fetch('/api/admin/auth', { method: 'DELETE' })
    setAuthState((prev) => ({ ...prev, authenticated: sbRole === 'admin', email: '' }))
    toast('Admin signed out')
  }

  async function runAction(payload, okMsg) {
    setErr('')
    const headers = { 'Content-Type': 'application/json', ...(await getTokenHeader()) }
    const res = await fetch('/api/admin/action', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    })
    const d = await res.json().catch(() => ({}))
    if (!res.ok) { setErr(d.error || 'Action failed.'); return false }
    toast(okMsg)
    load()
    return true
  }

  const setStatus = (id, status, msg) => runAction({ action: 'booking_status', id, status }, msg)
  const approve = (id) => runAction({ action: 'application_status', id, status: 'approved' }, 'Admission accepted & approved')
  const reject = (id) => runAction({ action: 'application_status', id, status: 'rejected' }, 'Application rejected')
  const setInquiryStatus = (id, status) => runAction({ action: 'inquiry_status', id, status }, `Inquiry marked ${status}`)
  const setUserRole = (userId, nextRole) => runAction({ action: 'user_role', userId, nextRole }, `Role updated to ${nextRole}`)

  async function toggleSkill(uid, skillId, nextDone) {
    const key = `${uid}:${skillId}`
    setBusySkill(key)
    const exists = skillRows.some((r) => r.user_id === uid && r.skill_id === skillId)
    const ok = await runAction({ action: 'toggle_skill', userId: uid, skillId, nextDone, exists }, nextDone ? 'Skill signed off' : 'Skill marked incomplete')
    setBusySkill(null)
    if (ok) {
      setSkillRows((prev) => {
        const idx = prev.findIndex((r) => r.user_id === uid && r.skill_id === skillId)
        if (idx >= 0) return prev.map((r, i) => (i === idx ? { ...r, done: nextDone } : r))
        return [...prev, { user_id: uid, skill_id: skillId, done: nextDone }]
      })
    }
  }

  const userById = useMemo(() => Object.fromEntries(users.map((u) => [u.id, u])), [users])

  // Group all visitors/applicants across BOTH flows (Join Academy + Book Appointment) by userId, email, or 10-digit phone.
  const bothFlowStats = useMemo(() => {
    const map = new Map()
    const keyFor = (userId, email, phone) => {
      if (userId) return `id:${userId}`
      const em = (email || '').trim().toLowerCase()
      if (em) return `em:${em}`
      const ph = digits(phone).slice(-10)
      if (ph.length === 10) return `ph:${ph}`
      return null
    }

    const ensure = (k, seed) => {
      if (!map.has(k)) {
        map.set(k, {
          key: k,
          userId: seed.userId || null,
          name: seed.name || 'Visitor',
          email: seed.email || '',
          phone: seed.phone || '',
          courses: [],
          bookings: [],
        })
      }
      const rec = map.get(k)
      if (!rec.userId && seed.userId) rec.userId = seed.userId
      if (!rec.email && seed.email) rec.email = seed.email
      if (!rec.phone && seed.phone) rec.phone = seed.phone
      if (rec.name === 'Visitor' && seed.name) rec.name = seed.name
      return rec
    }

    for (const a of apps) {
      const acc = userById[a.user_id]
      const extra = appMeta[String(a.id)]
      const k = keyFor(a.user_id, acc?.email || extra?.userEmail, a.student_phone)
      if (!k) continue
      const rec = ensure(k, {
        userId: a.user_id,
        name: a.student_name,
        email: acc?.email || extra?.userEmail || '',
        phone: a.student_phone,
      })
      rec.courses.push({ ...a, extra })
    }

    for (const b of bk) {
      const acc = userById[b.user_id]
      const k = keyFor(b.user_id, acc?.email || b.client_email, b.client_phone)
      if (!k) continue
      const rec = ensure(k, {
        userId: b.user_id,
        name: b.client_name,
        email: acc?.email || b.client_email || '',
        phone: b.client_phone,
      })
      rec.bookings.push(b)
    }

    const all = Array.from(map.values())
    const courseApplicants = all.filter((v) => v.courses.length > 0)
    const bookingClients = all.filter((v) => v.bookings.length > 0)
    const both = all.filter((v) => v.courses.length > 0 && v.bookings.length > 0)
    return { all, courseApplicants, bookingClients, both }
  }, [apps, bk, users, userById, appMeta])

  const courseCounts = useMemo(() => {
    const counts = {}
    for (const a of apps) {
      const name = a.courses?.name || 'Course'
      counts[name] = (counts[name] || 0) + 1
    }
    return Object.entries(counts)
  }, [apps])

  const enrichedUsers = useMemo(() => {
    return users.map((u) => {
      const uBookings = bk.filter((b) => b.user_id === u.id)
      const uApps = apps.filter((a) => a.user_id === u.id)
      const uInqs = inquiries.filter((i) => i.userId === u.id || (u.email && i.email === u.email))
      const uSkillsDone = skillRows.filter((s) => s.user_id === u.id && s.done).length
      const rawName = (u.full_name || '').trim()
      const cleanName = u.role !== 'admin' && rawName.toLowerCase() === 'miss aashika' ? '' : rawName
      const bestPhone = u.phone || uBookings[0]?.client_phone || uApps[0]?.student_phone || ''
      const bookingPaid = uBookings
        .filter((b) => b.status === 'confirmed' || b.status === 'completed')
        .reduce((sum, b) => sum + Number(b.advance_inr || 0), 0)
      const academyPaid = uApps.reduce((sum, a) => {
        const m = appMeta[String(a.id)]
        return sum + (m?.paymentVerified ? Number(m.paidInr || 0) : 0)
      }, 0)
      return {
        ...u,
        displayName: cleanName || u.email?.split('@')[0] || 'Unnamed user',
        bestPhone,
        bookings: uBookings,
        applications: uApps,
        inquiries: uInqs,
        skillsDone: uSkillsDone,
        totalPaid: bookingPaid + academyPaid,
      }
    }).sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
  }, [users, bk, apps, inquiries, skillRows, appMeta])

  const selectedUser = enrichedUsers.find((u) => u.id === selectedUserId) || null

  if (!authState.checked) {
    return <><PageHead eyebrow="Admin" title="Admin panel" /><div className="container section tight"><p className="mut">Checking admin session...</p></div></>
  }

  if (!authState.authenticated) {
    return (
      <>
        <PageHead eyebrow="Admin Portal" title="Admin sign in">
          Restricted area for The Nail Academy administration. Sign in to review pending responses, approve bookings &amp; admissions, and inspect visitor analytics.
        </PageHead>
        <section className="section tight">
          <div className="container">
            <form className="card gate" style={{ textAlign: 'left' }} onSubmit={submitAdminLogin}>
              <div className="gate-ic" style={{ marginInline: 0 }} aria-hidden="true">✦</div>
              <h3 style={{ marginBottom: 6 }}>Admin login</h3>
              <p className="mut" style={{ marginBottom: 18 }}>Only authorized administrators can access user submissions and payments.</p>
              {!authState.configured && (
                <div className="alert">Set <code>ADMIN_EMAIL</code>, <code>ADMIN_PASSWORD</code>, and <code>ADMIN_SESSION_SECRET</code> in <code>.env.local</code> to enable admin sign-in.</div>
              )}
              <div className="field">
                <label>Admin email</label>
                <input type="email" autoComplete="username" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} placeholder="admin@nailacademy.in" />
              </div>
              <div className="field">
                <label>Admin password</label>
                <input type="password" autoComplete="current-password" value={loginPass} onChange={(e) => setLoginPass(e.target.value)} placeholder="Enter admin password" />
              </div>
              {loginErr && <div className="alert" role="alert">{loginErr}</div>}
              <button className="btn block" type="submit" disabled={loginBusy || !authState.configured}>
                {loginBusy ? 'Signing in...' : 'Sign in to Admin Panel'}
              </button>
            </form>
          </div>
        </section>
      </>
    )
  }

  const pendingBookings = bk.filter((b) => b.status === 'awaiting_advance')
  const pendingApps = apps.filter((a) => a.status === 'pending')
  const newInquiries = inquiries.filter((i) => i.status === 'new')
  const totalPending = pendingBookings.length + pendingApps.length + newInquiries.length

  const bookingRevenue = bk
    .filter((b) => b.status === 'confirmed' || b.status === 'completed')
    .reduce((sum, b) => sum + Number(b.advance_inr || 0), 0)
  const academyRevenue = Object.values(appMeta)
    .filter((m) => m.paymentVerified)
    .reduce((sum, m) => sum + Number(m.paidInr || 0), 0)

  const needle = q.trim().toLowerCase()
  const filteredBookings = bk.filter((b) => {
    if (bFilter !== 'all' && b.status !== bFilter) return false
    if (!needle) return true
    const acc = userById[b.user_id]
    return [b.client_name, b.client_phone, b.utr, b.services?.name, acc?.email, b.client_email].some((v) => String(v || '').toLowerCase().includes(needle))
  })
  const filteredApps = apps.filter((a) => {
    if (aFilter !== 'all' && a.status !== aFilter) return false
    if (!needle) return true
    const acc = userById[a.user_id]
    const extra = appMeta[String(a.id)]
    return [a.student_name, a.student_phone, a.parent_name, a.parent_phone, a.courses?.name, acc?.email, extra?.city, extra?.batch, extra?.paymentRef]
      .some((v) => String(v || '').toLowerCase().includes(needle))
  })
  const filteredInquiries = inquiries.filter((i) => {
    if (iFilter !== 'all' && i.status !== iFilter) return false
    if (!needle) return true
    return [i.name, i.contact, i.topic, i.message, i.email].some((v) => String(v || '').toLowerCase().includes(needle))
  })
  const filteredUsers = enrichedUsers.filter((u) => {
    if (uFilter !== 'all' && (u.role || 'client') !== uFilter) return false
    if (!needle) return true
    return [u.displayName, u.email, u.bestPhone, u.role].some((v) => String(v || '').toLowerCase().includes(needle))
  })
  const filteredBoth = bothFlowStats.both.filter((v) => {
    if (!needle) return true
    return [v.name, v.email, v.phone].some((x) => String(x || '').toLowerCase().includes(needle))
  })

  return (
    <>
      <PageHead eyebrow="Admin Portal" title="Admin panel">
        Signed in as <b>{authState.email || 'Admin'}</b>. Review pending responses, accept applications &amp; bookings, and track visitors across courses and appointments.
      </PageHead>
      <section className="section tight">
        <div className="container">
          <div className="admin-bar" style={{ marginBottom: 20 }}>
            <div className="acts">
              <button className="btn ghost sm" onClick={load} disabled={loadingData}>{loadingData ? 'Refreshing...' : 'Refresh data'}</button>
              <button className="btn ghost sm" onClick={adminLogout}>Admin log out</button>
            </div>
            {!privilegedDb && (
              <span className="note">Showing captured site responses; add <code>SUPABASE_SERVICE_ROLE_KEY</code> in env for full historical Supabase sync.</span>
            )}
          </div>

          <div className="grid g4" style={{ marginBottom: 18 }}>
            <div className="card stat"><b>{totalPending}</b><span>pending to review</span></div>
            <div className="card stat"><b>{bothFlowStats.courseApplicants.length}</b><span>applied Join Academy ({apps.length} total)</span></div>
            <div className="card stat"><b>{bothFlowStats.bookingClients.length}</b><span>booked Appointment ({bk.length} total)</span></div>
            <div className="card stat"><b>{bothFlowStats.both.length}</b><span>applied for BOTH flows</span></div>
          </div>

          <div className="card" style={{ marginBottom: 24, background: 'var(--sand)', padding: '16px 20px' }}>
            <div className="item" style={{ alignItems: 'center', flexWrap: 'wrap' }}>
              <div>
                <b>Visitor &amp; Funnel Summary</b>
                <div className="note" style={{ marginTop: 4 }}>
                  Site sessions tracked: <b>{visitors.length}</b> · Verified payments collected: <b>{inr(bookingRevenue + academyRevenue)}</b> · Registered users: <b>{users.length}</b>
                  {courseCounts.length > 0 && (
                    <> · Courses: {courseCounts.map(([n, c]) => `${n} (${c})`).join(', ')}</>
                  )}
                </div>
              </div>
              <button className="btn sm" onClick={() => setT('both')}>
                View visitors in BOTH ({bothFlowStats.both.length})
              </button>
            </div>
          </div>

          <div className="admin-bar">
            <div className="tabs" style={{ margin: 0 }}>
              <button className={t === 'p' ? 'on' : ''} onClick={() => setT('p')}>Pending ({totalPending})</button>
              <button className={t === 'both' ? 'on' : ''} onClick={() => setT('both')}>Both Flows ({bothFlowStats.both.length})</button>
              <button className={t === 'b' ? 'on' : ''} onClick={() => setT('b')}>Bookings ({bk.length})</button>
              <button className={t === 'a' ? 'on' : ''} onClick={() => setT('a')}>Applications ({apps.length})</button>
              <button className={t === 'i' ? 'on' : ''} onClick={() => setT('i')}>Inquiries ({inquiries.length})</button>
              <button className={t === 'u' ? 'on' : ''} onClick={() => setT('u')}>Users ({users.length})</button>
            </div>
            <input
              className="admin-search"
              type="search"
              placeholder="Search name, email, phone, course, UTR..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>

          {t === 'b' && (
            <div className="filter-row">
              {BOOKING_FILTERS.map(([k, label]) => (
                <button key={k} className={'fchip' + (bFilter === k ? ' on' : '')} onClick={() => setBFilter(k)}>{label}</button>
              ))}
            </div>
          )}
          {t === 'a' && (
            <div className="filter-row">
              {APP_FILTERS.map(([k, label]) => (
                <button key={k} className={'fchip' + (aFilter === k ? ' on' : '')} onClick={() => setAFilter(k)}>{label}</button>
              ))}
            </div>
          )}
          {t === 'i' && (
            <div className="filter-row">
              {INQ_FILTERS.map(([k, label]) => (
                <button key={k} className={'fchip' + (iFilter === k ? ' on' : '')} onClick={() => setIFilter(k)}>{label}</button>
              ))}
            </div>
          )}
          {t === 'u' && (
            <div className="filter-row">
              {ROLE_FILTERS.map(([k, label]) => (
                <button key={k} className={'fchip' + (uFilter === k ? ' on' : '')} onClick={() => setUFilter(k)}>{label}</button>
              ))}
            </div>
          )}

          {err && <div className="alert" role="alert">{err}</div>}

          {t === 'p' && (
            <div className="grid g2" style={{ alignItems: 'start' }}>
              {totalPending === 0 && (
                <div className="card"><p className="mut" style={{ margin: 0 }}>All caught up — no pending bookings, applications, or new inquiries.</p></div>
              )}
              {pendingApps.map((a) => {
                const extra = appMeta[String(a.id)]
                const acc = userById[a.user_id]
                return (
                  <div className="card" key={`pa-${a.id}`}>
                    <div className="item">
                      <div>
                        <span className="tag" style={{ marginBottom: 6 }}>Join Academy · Pending</span>
                        <div><b>{a.student_name}{extra?.age ? ` (${extra.age} yrs)` : ''}</b></div>
                        {(acc?.email || extra?.userEmail) && <div className="note">{acc?.email || extra?.userEmail}</div>}
                      </div>
                      <span className="tag w">Pending</span>
                    </div>
                    <p className="mut" style={{ margin: '8px 0' }}>
                      {a.courses?.name}{a.courses?.fee_inr ? ` · ${inr(a.courses.fee_inr)}` : ''}<br />
                      {extra?.batch && <>Batch: <b>{extra.batch}</b> · {extra.experience}<br /></>}
                      {extra?.paidInr > 0 && <>Paid: <b>{inr(extra.paidInr)}</b> ({extra.paymentVerified ? 'Razorpay' : 'Manual UTR'} · {extra.paymentRef})<br /></>}
                      Student: {a.student_phone} · Parent: {a.parent_name} ({a.parent_phone})
                    </p>
                    <div className="acts">
                      <button className="btn sm" onClick={() => approve(a.id)}>Accept &amp; Approve</button>
                      <button className="btn ghost sm" onClick={() => reject(a.id)}>Reject</button>
                    </div>
                  </div>
                )
              })}
              {pendingBookings.map((b) => (
                <div className="card" key={`pb-${b.id}`}>
                  <div className="item">
                    <div>
                      <span className="tag" style={{ marginBottom: 6 }}>Appointment · Awaiting advance</span>
                      <div><b>{b.client_name}</b></div>
                    </div>
                    <span className="tag w">Pending</span>
                  </div>
                  <p className="mut" style={{ margin: '8px 0' }}>
                    {b.services?.name} · {ist(b.start_at)}<br />
                    Advance {inr(b.advance_inr)} · UTR: {b.utr || '-'}<br />
                    Phone: {b.client_phone}
                  </p>
                  <div className="acts">
                    <button className="btn sm" onClick={() => setStatus(b.id, 'confirmed', 'Booking accepted & confirmed')}>Accept &amp; Confirm</button>
                    <button className="btn ghost sm" onClick={() => setStatus(b.id, 'cancelled', 'Booking cancelled')}>Reject / Cancel</button>
                  </div>
                </div>
              ))}
              {newInquiries.map((inq) => (
                <div className="card" key={`pi-${inq.id}`}>
                  <div className="item">
                    <div>
                      <span className="tag" style={{ marginBottom: 6 }}>Inquiry · New</span>
                      <div><b>{inq.name}</b></div>
                      <div className="note">{inq.topic} · {inq.contact}</div>
                    </div>
                    <span className="tag w">New</span>
                  </div>
                  <p style={{ margin: '8px 0' }}>{inq.message}</p>
                  <div className="acts">
                    <button className="btn sm" onClick={() => setInquiryStatus(inq.id, 'replied')}>Accept / Mark replied</button>
                    <button className="btn ghost sm" onClick={() => setInquiryStatus(inq.id, 'closed')}>Close</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {t === 'both' && (
            <div className="grid g2" style={{ alignItems: 'start' }}>
              {filteredBoth.length === 0 && (
                <div className="card"><p className="mut" style={{ margin: 0 }}>No visitors have applied for both Join Academy and Book Appointment yet.</p></div>
              )}
              {filteredBoth.map((v) => (
                <div className="card" key={v.key}>
                  <div className="item">
                    <div>
                      <b>{v.name}</b>
                      <div className="note">{v.email || 'No email'}{v.phone ? ` · ${v.phone}` : ''}</div>
                    </div>
                    <span className="tag g">Both flows</span>
                  </div>
                  <p className="mut" style={{ margin: '8px 0' }}>
                    <b>Join Academy ({v.courses.length}):</b> {v.courses.map((c) => `${c.courses?.name || 'Course'} (${c.status})`).join(', ')}<br />
                    <b>Book Appointment ({v.bookings.length}):</b> {v.bookings.map((b) => `${b.services?.name || 'Service'} (${STATUS[b.status] || b.status})`).join(', ')}
                  </p>
                  <div className="acts">
                    {v.userId && userById[v.userId] && (
                      <button className="btn sm" onClick={() => setSelectedUserId(v.userId)}>Inspect full profile</button>
                    )}
                    {v.phone && (
                      <a className="btn ghost sm" href={`https://wa.me/91${digits(v.phone).slice(-10)}`} target="_blank" rel="noopener noreferrer">WhatsApp</a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="grid g2" style={{ alignItems: 'start' }}>
            {t === 'b' && filteredBookings.length === 0 && <div className="card"><p className="mut" style={{ margin: 0 }}>No matching bookings.</p></div>}
            {t === 'b' && filteredBookings.map((b) => {
              const rawRef = String(b.utr || '')
              const isRzp = rawRef.startsWith('pay_')
              const acc = userById[b.user_id]
              return (
                <div className="card" key={b.id}>
                  <div className="item">
                    <div>
                      <b>{b.client_name}</b>
                      {(acc?.email || b.client_email) && <div className="note">{acc?.email || b.client_email}</div>}
                    </div>
                    <span className={'tag' + (b.status === 'confirmed' ? ' g' : b.status === 'awaiting_advance' ? ' w' : b.status === 'cancelled' ? ' r' : '')}>{STATUS[b.status] || b.status}</span>
                  </div>
                  <p className="mut" style={{ margin: '8px 0' }}>
                    {b.services?.name}{b.with_removal ? ' + removal' : ''} · {ist(b.start_at)}<br />
                    Advance {inr(b.advance_inr)} · <span className={'tag' + (isRzp ? ' g' : '')}>{isRzp ? 'Razorpay' : 'Manual UTR'}</span> {rawRef}<br />
                    {b.client_phone && (
                      <>
                        <a href={`tel:+91${digits(b.client_phone).slice(-10)}`} style={{ color: 'var(--ink)', marginRight: 12 }}>Call {b.client_phone}</a>
                        <a href={`https://wa.me/91${digits(b.client_phone).slice(-10)}`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--rose-d)' }}>WhatsApp</a>
                      </>
                    )}
                  </p>
                  {clash.has(b.id) && <p className="note" style={{ color: 'var(--warn)' }}>Clash: another booking overlaps this time. Classes also run 4 to 8 PM.</p>}
                  <div className="acts">
                    {b.status === 'awaiting_advance' && <button className="btn sm" onClick={() => setStatus(b.id, 'confirmed', 'Advance accepted & confirmed')}>Accept / Confirm</button>}
                    {b.status === 'confirmed' && <button className="btn sm" onClick={() => setStatus(b.id, 'completed', 'Marked completed')}>Mark completed</button>}
                    {(b.status === 'awaiting_advance' || b.status === 'confirmed') && <button className="btn ghost sm" onClick={() => setStatus(b.id, 'cancelled', 'Booking cancelled')}>Cancel</button>}
                    {acc && <button className="btn ghost sm" onClick={() => setSelectedUserId(acc.id)}>View user</button>}
                  </div>
                </div>
              )
            })}

            {t === 'a' && filteredApps.length === 0 && <div className="card"><p className="mut" style={{ margin: 0 }}>No matching applications.</p></div>}
            {t === 'a' && filteredApps.map((a) => {
              const acc = userById[a.user_id]
              const extra = appMeta[String(a.id)]
              return (
                <div className="card" key={a.id}>
                  <div className="item">
                    <div>
                      <b>{a.student_name}{extra?.age ? ` (${extra.age} yrs)` : ''}</b>
                      {(acc?.email || extra?.userEmail) && <div className="note">{acc?.email || extra?.userEmail}{extra?.city ? ` · ${extra.city}` : ''}</div>}
                    </div>
                    <span className={'tag' + (a.status === 'approved' ? ' g' : a.status === 'rejected' ? ' r' : ' w')}>{a.status}</span>
                  </div>
                  <p className="mut" style={{ margin: '8px 0' }}>
                    {a.courses?.name}{a.courses?.fee_inr ? ` · ${inr(a.courses.fee_inr)}` : ''}<br />
                    {extra?.batch && <>Batch: <b>{extra.batch}</b> · {extra.experience}<br /></>}
                    {extra?.paidInr > 0 && (
                      <>
                        Paid: <b>{inr(extra.paidInr)}</b> ({extra.paymentOption}) · <span className={'tag' + (extra.paymentVerified ? ' g' : ' w')}>{extra.paymentVerified ? 'Razorpay' : 'Manual UTR'}</span> {extra.paymentRef}<br />
                      </>
                    )}
                    Student: <a href={`https://wa.me/91${digits(a.student_phone).slice(-10)}`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--rose-d)' }}>{a.student_phone}</a><br />
                    Parent: {a.parent_name} (<a href={`tel:+91${digits(a.parent_phone).slice(-10)}`} style={{ color: 'var(--rose-d)' }}>{a.parent_phone}</a>)
                    {extra?.notes && <><br /><span className="note">Notes: {extra.notes}</span></>}
                    {a.created_at && <><br /><span className="note">Applied {ist(a.created_at)}</span></>}
                  </p>
                  <div className="acts">
                    {a.status === 'pending' && <button className="btn sm" onClick={() => approve(a.id)}>Accept admission</button>}
                    {a.status === 'pending' && <button className="btn ghost sm" onClick={() => reject(a.id)}>Reject</button>}
                    {acc && <button className="btn ghost sm" onClick={() => setSelectedUserId(acc.id)}>View user</button>}
                  </div>
                </div>
              )
            })}

            {t === 'i' && filteredInquiries.length === 0 && <div className="card"><p className="mut" style={{ margin: 0 }}>No inquiries yet.</p></div>}
            {t === 'i' && filteredInquiries.map((inq) => (
              <div className="card" key={inq.id}>
                <div className="item">
                  <div>
                    <b>{inq.name}</b>
                    <div className="note">{inq.topic} · {inq.contact}</div>
                  </div>
                  <span className={'tag' + (inq.status === 'replied' ? ' g' : inq.status === 'new' ? ' w' : '')}>{inq.status}</span>
                </div>
                <p style={{ margin: '10px 0 8px' }}>{inq.message}</p>
                <div className="note" style={{ marginBottom: 10 }}>{ist(inq.createdAt)}</div>
                <div className="acts">
                  {inq.status === 'new' && <button className="btn sm" onClick={() => setInquiryStatus(inq.id, 'replied')}>Mark replied</button>}
                  {inq.status !== 'closed' && <button className="btn ghost sm" onClick={() => setInquiryStatus(inq.id, 'closed')}>Close</button>}
                  {digits(inq.contact).length >= 10 && (
                    <a className="btn ghost sm" href={`https://wa.me/91${digits(inq.contact).slice(-10)}`} target="_blank" rel="noopener noreferrer">WhatsApp</a>
                  )}
                </div>
              </div>
            ))}

            {t === 'u' && filteredUsers.length === 0 && <div className="card"><p className="mut" style={{ margin: 0 }}>No matching users.</p></div>}
            {t === 'u' && filteredUsers.map((u) => (
              <div className="card" key={u.id}>
                <div className="item">
                  <div>
                    <b>{u.displayName}</b>
                    <div className="note">{u.email || 'No email'}</div>
                  </div>
                  <span className={'tag' + (u.role === 'admin' ? ' r' : u.role === 'student' ? ' g' : '')}>{u.role || 'client'}</span>
                </div>
                <p className="mut" style={{ margin: '8px 0' }}>
                  Phone: {u.bestPhone ? <a href={`https://wa.me/91${digits(u.bestPhone).slice(-10)}`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--rose-d)' }}>{u.bestPhone}</a> : 'Not provided'}<br />
                  {u.bookings.length} booking{u.bookings.length === 1 ? '' : 's'} · {u.applications.length} application{u.applications.length === 1 ? '' : 's'} · {u.inquiries.length} inquir{u.inquiries.length === 1 ? 'y' : 'ies'}
                  {u.totalPaid > 0 && ` · ${inr(u.totalPaid)} paid`}
                  {(u.role === 'student' || u.skillsDone > 0) && ` · ${u.skillsDone}/${skills.length || 58} skills`}
                </p>
                <div className="acts">
                  <button className="btn sm" onClick={() => setSelectedUserId(u.id)}>Inspect details</button>
                  {u.bestPhone && <a className="btn ghost sm" href={`https://wa.me/91${digits(u.bestPhone).slice(-10)}`} target="_blank" rel="noopener noreferrer">WhatsApp</a>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {selectedUser && (
        <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && setSelectedUserId(null)}>
          <div className="modal modal-wide" role="dialog" aria-modal="true" aria-label="User details">
            <button className="x" onClick={() => setSelectedUserId(null)} aria-label="Close">×</button>
            <span className="eyebrow" style={{ marginBottom: 6 }}>User details</span>
            <h2 style={{ marginTop: 0 }}>{selectedUser.displayName}</h2>
            <p className="mut" style={{ marginBottom: 16 }}>
              {selectedUser.email || 'No email'} {selectedUser.bestPhone ? `· ${selectedUser.bestPhone}` : ''}
            </p>

            <div className="card" style={{ background: 'var(--sand)', marginBottom: 18, padding: 16 }}>
              <div className="item" style={{ alignItems: 'center' }}>
                <div>
                  <b>Account role</b>
                  <div className="note">Students see the 58-skill logbook in My Account.</div>
                </div>
                <div className="acts" style={{ marginTop: 0 }}>
                  {['client', 'student', 'admin'].map((r) => (
                    <button
                      key={r}
                      className={'fchip' + ((selectedUser.role || 'client') === r ? ' on' : '')}
                      onClick={() => setUserRole(selectedUser.id, r)}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid g2" style={{ alignItems: 'start', marginBottom: 18 }}>
              <div>
                <h4>Bookings ({selectedUser.bookings.length})</h4>
                {selectedUser.bookings.length === 0 && <p className="mut">No bookings.</p>}
                {selectedUser.bookings.map((b) => (
                  <div className="card" style={{ padding: 14, marginBottom: 10 }} key={b.id}>
                    <div className="item"><b>{b.services?.name}</b><span className={'tag' + (b.status === 'confirmed' ? ' g' : b.status === 'awaiting_advance' ? ' w' : b.status === 'cancelled' ? ' r' : '')}>{STATUS[b.status] || b.status}</span></div>
                    <div className="note" style={{ marginTop: 4 }}>{ist(b.start_at)} · {inr(b.advance_inr)} · {b.utr}</div>
                    {b.status === 'awaiting_advance' && (
                      <div className="acts" style={{ marginTop: 8 }}>
                        <button className="btn sm" onClick={() => setStatus(b.id, 'confirmed', 'Advance accepted & confirmed')}>Confirm</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div>
                <h4>Applications ({selectedUser.applications.length})</h4>
                {selectedUser.applications.length === 0 && <p className="mut">No applications.</p>}
                {selectedUser.applications.map((a) => {
                  const extra = appMeta[String(a.id)]
                  return (
                    <div className="card" style={{ padding: 14, marginBottom: 10 }} key={a.id}>
                      <div className="item"><b>{a.courses?.name}</b><span className={'tag' + (a.status === 'approved' ? ' g' : a.status === 'rejected' ? ' r' : ' w')}>{a.status}</span></div>
                      <div className="note" style={{ marginTop: 4 }}>
                        Student: {a.student_name} ({a.student_phone})<br />
                        Parent: {a.parent_name} ({a.parent_phone})
                        {extra?.batch && <><br />Batch: {extra.batch} · {extra.experience}</>}
                        {extra?.paidInr > 0 && <><br />Paid: {inr(extra.paidInr)} ({extra.paymentRef})</>}
                        {extra?.notes && <><br />Notes: {extra.notes}</>}
                      </div>
                      {a.status === 'pending' && (
                        <div className="acts" style={{ marginTop: 8 }}>
                          <button className="btn sm" onClick={() => approve(a.id)}>Accept</button>
                          <button className="btn ghost sm" onClick={() => reject(a.id)}>Reject</button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {selectedUser.inquiries.length > 0 && (
              <div style={{ marginBottom: 18 }}>
                <h4>Messages / Inquiries ({selectedUser.inquiries.length})</h4>
                {selectedUser.inquiries.map((inq) => (
                  <div className="card" style={{ padding: 14, marginBottom: 10 }} key={inq.id}>
                    <div className="item"><b>{inq.topic}</b><span className="tag">{inq.status}</span></div>
                    <p style={{ margin: '6px 0 4px' }}>{inq.message}</p>
                    <div className="note">{ist(inq.createdAt)}</div>
                  </div>
                ))}
              </div>
            )}

            {stages.length > 0 && skills.length > 0 && (
              <div>
                <h4>Digital logbook ({selectedUser.skillsDone} / {skills.length} skills completed)</h4>
                <div className="grid g2" style={{ alignItems: 'start' }}>
                  {stages.map((st) => {
                    const list = skills.filter((k) => k.stage_no === st.no)
                    const doneMap = Object.fromEntries(
                      skillRows.filter((r) => r.user_id === selectedUser.id).map((r) => [r.skill_id, r.done]),
                    )
                    const d = list.filter((k) => doneMap[k.id]).length
                    return (
                      <div className="card" style={{ padding: 14 }} key={st.no}>
                        <div className="item"><b>Stage {st.no}: {st.name}</b><span className={'tag' + (d === list.length ? ' g' : '')}>{d}/{list.length}</span></div>
                        <div className="bar"><i style={{ width: `${list.length ? (d / list.length) * 100 : 0}%` }} /></div>
                        <div style={{ maxHeight: 220, overflow: 'auto' }}>
                          {list.map((k) => {
                            const isDone = !!doneMap[k.id]
                            const key = `${selectedUser.id}:${k.id}`
                            return (
                              <button
                                key={k.id}
                                type="button"
                                className="sk-btn"
                                disabled={busySkill === key}
                                onClick={() => toggleSkill(selectedUser.id, k.id, !isDone)}
                              >
                                <b className={isDone ? 'd' : ''}>{isDone ? '✓' : ''}</b>
                                <span>{k.code} {k.title}</span>
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
