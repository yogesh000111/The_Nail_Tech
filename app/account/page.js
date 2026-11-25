'use client'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../components/AuthProvider'
import AuthGate from '../../components/AuthGate'
import PageHead from '../../components/PageHead'
import { toast } from '../../components/Toaster'
import { digits, inr, ist, STATUS, wa } from '../../lib/utils'

export default function Account() {
  const { user, profile, displayName, needsName, updateProfile, role, ready, signOut } = useAuth()
  const [bk, setBk] = useState([])
  const [apps, setApps] = useState([])
  const [appMeta, setAppMeta] = useState({})
  const [inquiries, setInquiries] = useState([])
  const [stages, setStages] = useState([])
  const [skills, setSkills] = useState([])
  const [mine, setMine] = useState({})
  const [nameInput, setNameInput] = useState('')
  const [phoneInput, setPhoneInput] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    if (displayName && !needsName) setNameInput(displayName)
    if (profile?.phone) setPhoneInput(profile.phone)
  }, [displayName, needsName, profile?.phone])

  const load = useCallback(async () => {
    if (!user) return
    const b = await supabase.from('bookings').select('*, services(name)').eq('user_id', user.id).order('start_at', { ascending: false })
    setBk(b.data || [])
    const a = await supabase.from('applications').select('*, courses(name,fee_inr)').eq('user_id', user.id).order('created_at', { ascending: false })
    setApps(a.data || [])
    try {
      const { data: sess } = await supabase.auth.getSession()
      const token = sess?.session?.access_token
      if (token) {
        const res = await fetch('/api/responses', { headers: { Authorization: `Bearer ${token}` } })
        if (res.ok) {
          const r = await res.json()
          setAppMeta(Object.fromEntries((r.applications || []).map((x) => [String(x.id), x])))
          setInquiries(r.inquiries || [])
        }
      }
    } catch {}
    if (role === 'student' || role === 'admin') {
      const [st, sk, ss] = await Promise.all([
        supabase.from('stages').select('*').order('no'),
        supabase.from('skills').select('*').order('id'),
        supabase.from('student_skills').select('skill_id,done').eq('user_id', user.id),
      ])
      setStages(st.data || []); setSkills(sk.data || [])
      setMine(Object.fromEntries((ss.data || []).map((r) => [r.skill_id, r.done])))
    }
  }, [user, role])
  useEffect(() => { load() }, [load])

  async function cancel(id) {
    setErr('')
    const { error } = await supabase.rpc('cancel_booking', { b: id })
    if (error) setErr(error.message); else { toast('Booking cancelled'); load() }
  }

  async function saveProfile(e) {
    e.preventDefault()
    setErr('')
    if (phoneInput.trim() && digits(phoneInput).length < 10) {
      setErr('Please enter a valid 10-digit mobile number or leave it blank.')
      return
    }
    setSavingProfile(true)
    const { error } = await updateProfile({ full_name: nameInput, phone: phoneInput })
    setSavingProfile(false)
    if (error) setErr(error); else toast('Profile updated')
  }

  if (!ready) return <><PageHead eyebrow="Account" title="My account" /><div className="container section tight"><p className="mut">Loading...</p></div></>
  if (!user) return <><PageHead eyebrow="Account" title="My account" /><div className="container section tight"><AuthGate /></div></>

  const firstName = displayName ? displayName.split(' ')[0] : ''
  return (
    <>
      <PageHead eyebrow="Account" title={`Hello${firstName ? ', ' + firstName : ''}`}>{user.email} · Role: {role || 'client'}</PageHead>
      <section className="section tight">
        <div className="container">
          <div className="btns" style={{ marginTop: 0, marginBottom: 20 }}>
            <Link className="btn" href="/book">New booking</Link>
            <Link className="btn ghost" href="/apply">Apply for a course</Link>
            {role === 'admin' && <Link className="btn ghost" href="/admin">Admin panel</Link>}
            <button className="btn ghost" onClick={signOut}>Log out</button>
          </div>
          <form className="card name-form" onSubmit={saveProfile}>
            <div className="field" style={{ margin: 0, flex: '1 1 220px' }}>
              <label>{needsName ? 'Set your name (shown at top of the site)' : 'Your name'}</label>
              <input value={nameInput} onChange={(e) => setNameInput(e.target.value)} placeholder="Enter your full name" />
            </div>
            <div className="field" style={{ margin: 0, flex: '1 1 180px' }}>
              <label>Mobile number</label>
              <input type="tel" inputMode="numeric" value={phoneInput} onChange={(e) => setPhoneInput(e.target.value)} placeholder="10-digit number" />
            </div>
            <button className="btn sm" type="submit" disabled={savingProfile}>{savingProfile ? 'Saving...' : 'Save profile'}</button>
          </form>
          {err && <div className="alert" role="alert">{err}</div>}
          <div className="grid g2" style={{ alignItems: 'start' }}>
            <div>
              <h3 style={{ marginBottom: 14 }}>My bookings</h3>
              {bk.length === 0 && <div className="card"><p className="mut" style={{ margin: 0 }}>No bookings yet.</p></div>}
              {bk.map((b) => (
                <div className="card" style={{ marginBottom: 14 }} key={b.id}>
                  <div className="item"><b>{b.services?.name}{b.with_removal ? ' + removal' : ''}</b><span className={'tag' + (b.status === 'confirmed' ? ' g' : b.status === 'awaiting_advance' ? ' w' : b.status === 'cancelled' ? ' r' : '')}>{STATUS[b.status]}</span></div>
                  <p className="mut" style={{ margin: '6px 0 0' }}>{ist(b.start_at)} · Advance {inr(b.advance_inr)}<br />Ref / Payment ID: {b.utr || '-'}</p>
                  <div className="acts" style={{ marginTop: 12 }}>
                    {(b.status === 'awaiting_advance' || b.status === 'confirmed') && <button className="btn ghost sm" onClick={() => cancel(b.id)}>Cancel booking</button>}
                    <a className="btn ghost sm" href={wa(`Hi, checking on my booking (${b.services?.name}) on ${ist(b.start_at)}. Ref: ${b.id.slice(0, 6).toUpperCase()}`)} target="_blank" rel="noopener noreferrer">WhatsApp</a>
                  </div>
                </div>
              ))}
            </div>
            <div>
              <h3 style={{ marginBottom: 14 }}>My applications</h3>
              {apps.length === 0 && <div className="card"><p className="mut" style={{ margin: 0 }}>No applications yet.</p></div>}
              {apps.map((a) => {
                const extra = appMeta[String(a.id)]
                return (
                  <div className="card" style={{ marginBottom: 14 }} key={a.id}>
                    <div className="item">
                      <b>{a.courses?.name} {a.courses?.fee_inr ? `· ${inr(a.courses.fee_inr)}` : ''}</b>
                      <span className={'tag' + (a.status === 'approved' ? ' g' : a.status === 'rejected' ? ' r' : ' w')}>
                        {a.status === 'pending' ? (extra?.paymentVerified ? 'Slot booked · Pending visit' : 'Waiting for review') : a.status === 'approved' ? 'Approved' : 'Not approved'}
                      </span>
                    </div>
                    <p className="mut" style={{ margin: '6px 0 0' }}>
                      Student: {a.student_name} ({a.student_phone})<br />
                      Parent: {a.parent_name} ({a.parent_phone})
                      {extra?.batch && <><br />Batch: {extra.batch} · {extra.experience}</>}
                      {extra?.paidInr > 0 && <><br />Paid: {inr(extra.paidInr)} ({extra.paymentVerified ? 'Razorpay' : 'Manual UTR'} · {extra.paymentRef})</>}
                    </p>
                  </div>
                )
              })}
              {inquiries.length > 0 && (
                <>
                  <h3 style={{ margin: '22px 0 14px' }}>My messages</h3>
                  {inquiries.map((inq) => (
                    <div className="card" style={{ marginBottom: 14 }} key={inq.id}>
                      <div className="item"><b>{inq.topic}</b><span className="tag">{inq.status}</span></div>
                      <p className="mut" style={{ margin: '6px 0 0' }}>{inq.message}</p>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
          {(role === 'student' || role === 'admin') && stages.length > 0 && (
            <>
              <h3 style={{ margin: '32px 0 14px' }}>My logbook</h3>
              <div className="grid g2" style={{ alignItems: 'start' }}>
                {stages.map((st) => {
                  const list = skills.filter((k) => k.stage_no === st.no)
                  const d = list.filter((k) => mine[k.id]).length
                  return (
                    <div className="card" key={st.no}>
                      <div className="item"><h3>Stage {st.no}</h3><span className={'tag' + (d === list.length ? ' g' : '')}>{d} / {list.length}</span></div>
                      <p className="mut" style={{ margin: '4px 0 0' }}>{st.name}</p>
                      <div className="bar"><i style={{ width: `${list.length ? (d / list.length) * 100 : 0}%` }} /></div>
                      {list.map((k) => (<div className="sk" key={k.id}><b className={mine[k.id] ? 'd' : ''}>{mine[k.id] ? '✓' : ''}</b><span>{k.code} {k.title}</span></div>))}
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
      </section>
    </>
  )
}
