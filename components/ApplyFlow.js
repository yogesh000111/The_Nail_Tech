'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthProvider'
import AuthGate from './AuthGate'
import PageHead from './PageHead'
import Done from './Done'
import { useCatalog } from '../lib/catalog'
import { BIZ, STAGES } from '../lib/config'
import { loadRazorpay } from '../lib/razorpay-client'
import { digits, inr } from '../lib/utils'

export default function ApplyFlow({ initialCourseId }) {
  const { user, profile, displayName, syncPhoneIfEmpty, ready } = useAuth()
  const { courses, live, loading: catLoading } = useCatalog()
  const [courseId, setCourseId] = useState(initialCourseId ? String(initialCourseId) : '')
  const [payOption, setPayOption] = useState('seat')
  const [payMethod, setPayMethod] = useState('razorpay')
  const [rzpReady, setRzpReady] = useState(true)
  const [f, setF] = useState({
    sn: '',
    sp: '',
    age: '',
    city: 'Ludhiana',
    pn: '',
    pp: '',
    batch: '4:00 PM – 6:00 PM',
    exp: 'Complete beginner',
    payPlan: 'Seat reservation online + balance at academy',
    notes: '',
    u: '',
  })
  const [agreed, setAgreed] = useState(false)
  const [existingApps, setExistingApps] = useState([])
  const [bad, setBad] = useState({})
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(null)

  useEffect(() => {
    fetch('/api/razorpay/order')
      .then((r) => r.json())
      .then((d) => {
        if (typeof d?.configured === 'boolean') {
          setRzpReady(d.configured)
          if (!d.configured) setPayMethod('upi')
        }
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (initialCourseId) setCourseId(String(initialCourseId))
  }, [initialCourseId])

  useEffect(() => {
    if (!initialCourseId && courses.length) {
      setCourseId((prev) => prev || String(courses[0].id))
    }
  }, [initialCourseId, courses])

  useEffect(() => {
    const name = profile?.full_name || (displayName && !user?.email?.startsWith(displayName) ? displayName : '')
    setF((prev) => ({
      ...prev,
      sn: prev.sn || name || '',
      sp: prev.sp || profile?.phone || '',
    }))
  }, [profile, displayName, user])

  useEffect(() => {
    if (!user) { setExistingApps([]); return }
    supabase.from('applications').select('*, courses(name)').eq('user_id', user.id).order('created_at', { ascending: false })
      .then(({ data }) => setExistingApps(data || []))
  }, [user, done])

  const course = courses.find((c) => String(c.id) === String(courseId)) || (initialCourseId ? null : courses[0])
  const set = (k) => (e) => { setF({ ...f, [k]: e.target.value }); setBad({ ...bad, [k]: false }) }

  if (!course) {
    return (
      <>
        <PageHead eyebrow="Join Academy" title="Course not found" />
        <div className="container section tight"><Link className="btn" href="/courses">See all courses</Link></div>
      </>
    )
  }

  const payAmount = payOption === 'full'
    ? Number(course.fee_inr)
    : payOption === 'half'
      ? Math.round(Number(course.fee_inr) / 2)
      : 1000
  const payOptionLabel = payOption === 'full'
    ? 'Full course fee'
    : payOption === 'half'
      ? '50% first instalment'
      : 'Seat reservation fee (₹1,000)'

  const activeApp = existingApps.find((a) => String(a.course_id) === String(course.id) && a.status !== 'rejected')

  async function saveApplication(paymentRef, isVerifiedOnline) {
    const { data, error } = await supabase.from('applications').insert({
      course_id: course.id,
      student_name: f.sn.trim(),
      student_phone: f.sp.trim(),
      parent_name: f.pn.trim(),
      parent_phone: f.pp.trim(),
    }).select().single()
    if (error) { setErr(error.message); return false }

    await syncPhoneIfEmpty(f.sp.trim())

    try {
      const { data: sess } = await supabase.auth.getSession()
      const token = sess?.session?.access_token
      await fetch('/api/responses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          kind: 'application',
          applicationId: data.id,
          courseId: course.id,
          courseName: course.name,
          courseFee: course.fee_inr,
          batch: f.batch,
          experience: f.exp,
          payPlan: f.payPlan,
          paymentOption: payOptionLabel,
          paidInr: payAmount,
          paymentMethod: isVerifiedOnline ? 'razorpay' : 'upi',
          paymentRef,
          paymentVerified: isVerifiedOnline,
          studentName: f.sn.trim(),
          studentPhone: f.sp.trim(),
          age: f.age,
          city: f.city.trim(),
          parentName: f.pn.trim(),
          parentPhone: f.pp.trim(),
          notes: f.notes.trim(),
        }),
      })
    } catch {}

    const ref = data.id.slice(0, 6).toUpperCase()
    setDone({
      pending: !isVerifiedOnline,
      title: isVerifiedOnline ? 'Your slot is booked!' : 'Slot request submitted — payment pending',
      text: isVerifiedOnline
        ? `Your ${payOptionLabel.toLowerCase()} of ${inr(payAmount)} was verified via Razorpay and your academy seat for ${course.name} is booked. Bring a parent/guardian when you visit ${BIZ.trainer} to start your batch.`
        : `Your application is saved and waiting for payment verification. Send your UTR on WhatsApp so ${BIZ.trainer} can verify the transfer and confirm your academy slot.`,
      rows: [
        ['Course', `${course.name} (${inr(course.fee_inr)})`],
        ['Batch slot', `${f.batch} (Mon–Sat)`],
        ['Experience', f.exp],
        ['Student', `${f.sn.trim()} (${f.age} yrs, ${f.city.trim()})`],
        ['Parent / Guardian', `${f.pn.trim()} (${f.pp.trim()})`],
        [isVerifiedOnline ? 'Paid now (Razorpay)' : 'Amount claimed (pending)', inr(payAmount)],
        [isVerifiedOnline ? 'Razorpay Payment ID' : 'UTR / Reference', paymentRef],
      ],
      ref,
      msg: `Academy Slot Booking - The Nail Academy\nRef: ${ref}\nCourse: ${course.name} (${inr(course.fee_inr)})\nBatch: ${f.batch}\nExperience: ${f.exp}\nStudent: ${f.sn.trim()}, Age ${f.age}, ${f.city.trim()} (${f.sp.trim()})\nParent: ${f.pn.trim()} (${f.pp.trim()})\nPayment (${payOptionLabel}): Rs ${payAmount}\n${isVerifiedOnline ? 'Razorpay Payment ID' : 'UTR'}: ${paymentRef}${isVerifiedOnline ? ' (Verified)' : '\nPlease verify payment and confirm my slot.'}${f.notes.trim() ? `\nNotes: ${f.notes.trim()}` : ''}`,
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
    return true
  }

  async function submit() {
    const ageNum = Number(f.age)
    const b = {
      sn: f.sn.trim().length < 2,
      sp: digits(f.sp).length < 10,
      age: !f.age || !Number.isFinite(ageNum) || ageNum < 14 || ageNum > 70,
      city: f.city.trim().length < 2,
      pn: f.pn.trim().length < 2,
      pp: digits(f.pp).length < 10,
      u: payMethod === 'upi' && !f.u.trim(),
      agreed: !agreed,
    }
    setBad(b)
    if (Object.values(b).some(Boolean)) {
      if (b.agreed) {
        setErr('Please tick the confirmation box acknowledging the parent visit requirement.')
      } else if (b.u) {
        setErr('Please enter your UPI UTR / transaction ID after paying.')
      } else {
        setErr('Please complete all highlighted fields (valid 10-digit mobile numbers and age 14–70).')
      }
      return
    }

    if (payMethod === 'upi') {
      setBusy(true); setErr('')
      await saveApplication(f.u.trim(), false)
      setBusy(false)
      return
    }

    setBusy(true); setErr('')
    const loaded = await loadRazorpay()
    if (!loaded || !window.Razorpay) {
      setBusy(false)
      setErr('Could not load Razorpay Checkout. Check your internet connection or use UPI QR (Manual check).')
      return
    }

    const orderRes = await fetch('/api/razorpay/order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amountPaise: payAmount * 100,
        serviceName: `Academy · ${course.name} (${payOptionLabel})`,
        date: f.batch,
      }),
    })
    const orderData = await orderRes.json().catch(() => ({}))
    if (!orderRes.ok || !orderData.orderId) {
      setBusy(false)
      setErr(orderData.error || 'Could not start Razorpay payment. Your academy slot has not been booked.')
      return
    }

    const rzp = new window.Razorpay({
      key: orderData.keyId,
      amount: orderData.amount,
      currency: orderData.currency,
      name: BIZ.name,
      description: `${course.name} · ${payOptionLabel}`,
      order_id: orderData.orderId,
      prefill: {
        name: f.sn.trim(),
        email: user?.email || '',
        contact: digits(f.sp).slice(-10),
      },
      theme: { color: '#a85f5a' },
      modal: {
        ondismiss: () => {
          setBusy(false)
          setErr('Payment was cancelled. Your academy slot is not booked until payment succeeds.')
        },
      },
      handler: async (response) => {
        try {
          const verifyRes = await fetch('/api/razorpay/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(response),
          })
          const verifyData = await verifyRes.json().catch(() => ({}))
          if (!verifyRes.ok || !verifyData.verified) {
            setErr(verifyData.error || 'Payment could not be verified. Your academy slot has not been booked.')
            setBusy(false)
            return
          }
          await saveApplication(verifyData.paymentId, true)
        } catch {
          setErr('Could not verify payment with the server. Please contact us with your Razorpay payment ID.')
        } finally {
          setBusy(false)
        }
      },
    })

    rzp.on('payment.failed', (resp) => {
      setBusy(false)
      setErr(resp?.error?.description || 'Payment failed. Your academy slot is not booked until payment succeeds.')
    })

    rzp.open()
  }

  const field = (k, label, opts = {}) => (
    <div className="field">
      <label>{label}</label>
      <input
        className={bad[k] ? 'bad' : ''}
        type={opts.type || 'text'}
        inputMode={opts.inputMode}
        placeholder={opts.placeholder}
        value={f[k]}
        onChange={set(k)}
      />
    </div>
  )

  return (
    <>
      <PageHead eyebrow="Join Academy" title={done ? (done.pending ? 'Slot request submitted' : 'Your slot is booked') : `Join ${course.name}`}>
        Choose your course &amp; batch, enter student and parent details, and pay your seat booking amount to reserve your academy slot.
      </PageHead>
      <section className="section tight">
        <div className="container">
          {done ? <Done d={done} /> : (!ready || catLoading) ? <p className="mut">Loading...</p> : !user ? (
            <AuthGate title="Sign in to join the academy" text="Create an account or sign in with your email to reserve your academy slot and track your logbook." />
          ) : !live ? (
            <div className="card gate"><h3>Applications are paused</h3><p className="mut">We cannot reach our system right now. Please message us on WhatsApp.</p></div>
          ) : (
            <div className="split">
              <div className="grid">
                {activeApp && (
                  <div className="card" style={{ background: 'var(--blush)', borderColor: 'var(--rose)' }}>
                    <div className="item">
                      <b>Existing slot application for {course.name}</b>
                      <span className={'tag' + (activeApp.status === 'approved' ? ' g' : ' w')}>
                        {activeApp.status === 'approved' ? 'Approved' : 'Booked / Under review'}
                      </span>
                    </div>
                    <p className="mut" style={{ margin: '8px 0 12px' }}>
                      You already have an active application under {activeApp.student_name}. You can check its status in your account or pick another course below.
                    </p>
                    <Link className="btn sm" href="/account">View in my account</Link>
                  </div>
                )}

                <div className="card">
                  <h3 style={{ marginBottom: 16 }}><span className="num">1</span>Course &amp; batch preferences</h3>
                  <div className="grid g2">
                    <div className="field">
                      <label>Select course</label>
                      <select value={String(course.id)} onChange={(e) => setCourseId(e.target.value)}>
                        {courses.map((c) => (<option key={c.id} value={c.id}>{c.name} · {inr(c.fee_inr)} ({c.duration_months} mo)</option>))}
                      </select>
                    </div>
                    <div className="field">
                      <label>Preferred batch (Mon–Sat)</label>
                      <select value={f.batch} onChange={set('batch')}>
                        <option>4:00 PM – 6:00 PM</option>
                        <option>6:00 PM – 8:00 PM</option>
                        <option>Flexible (either batch)</option>
                      </select>
                    </div>
                    <div className="field">
                      <label>Prior nail experience</label>
                      <select value={f.exp} onChange={set('exp')}>
                        <option>Complete beginner</option>
                        <option>Self-taught / Hobbyist</option>
                        <option>Working in beauty / salon</option>
                      </select>
                    </div>
                    <div className="field">
                      <label>Payment option</label>
                      <select value={payOption} onChange={(e) => setPayOption(e.target.value)}>
                        <option value="seat">Seat reservation fee · {inr(1000)}</option>
                        <option value="half">50% First instalment · {inr(Math.round(course.fee_inr / 2))}</option>
                        <option value="full">Full course fee · {inr(course.fee_inr)}</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="card">
                  <h3 style={{ marginBottom: 16 }}><span className="num">2</span>Student &amp; parent details</h3>
                  <div className="grid g2">
                    {field('sn', 'Student full name', { placeholder: 'e.g. Simran Kaur' })}
                    {field('sp', 'Student mobile / WhatsApp', { type: 'tel', inputMode: 'numeric', placeholder: '10-digit number' })}
                    {field('age', 'Student age', { type: 'number', inputMode: 'numeric', placeholder: 'e.g. 20' })}
                    {field('city', 'City / Area', { placeholder: 'e.g. Ludhiana' })}
                    {field('pn', 'Parent / Guardian name', { placeholder: 'Mother / Father / Guardian' })}
                    {field('pp', 'Parent / Guardian mobile', { type: 'tel', inputMode: 'numeric', placeholder: '10-digit number' })}
                  </div>
                  <div className="field" style={{ marginBottom: 0 }}>
                    <label>Questions or preferred start date (optional)</label>
                    <textarea rows={2} placeholder="When would you like to start, or any questions for Miss Aashika?" value={f.notes} onChange={set('notes')} />
                  </div>
                </div>

                <div className="card">
                  <h3 style={{ marginBottom: 16 }}><span className="num">3</span>Pay {inr(payAmount)} to book your slot</h3>
                  <div className="tabs" style={{ marginBottom: 14 }}>
                    <button type="button" className={payMethod === 'razorpay' ? 'on' : ''} onClick={() => { setPayMethod('razorpay'); setErr('') }}>Razorpay (Instant)</button>
                    <button type="button" className={payMethod === 'upi' ? 'on' : ''} onClick={() => { setPayMethod('upi'); setErr('') }}>UPI QR (Manual check)</button>
                  </div>
                  {payMethod === 'razorpay' ? (
                    <div className="qrbox">
                      <b>Pay {inr(payAmount)} via Razorpay</b>
                      <p className="note" style={{ margin: '8px 0 0' }}>Supports UPI, Cards, and NetBanking. Your academy slot is booked only after payment succeeds.</p>
                      {!rzpReady && (
                        <div className="alert" style={{ marginTop: 12, marginBottom: 0, textAlign: 'left' }}>
                          Razorpay keys in <code>.env.local</code> are not configured. Add them and restart the server, or use UPI QR below.
                          <div style={{ marginTop: 10 }}>
                            <button type="button" className="btn ghost sm" onClick={() => { setPayMethod('upi'); setErr('') }}>Switch to UPI QR (Manual check)</button>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <>
                      <div className="qrbox">
                        <b>Pay {inr(payAmount)} by UPI</b>
                        <img className="qr" src="/upi-qr.png" alt={`UPI QR code for ${BIZ.trainer}`} />
                        <div className="note">Any UPI app · UPI ID <b>{BIZ.upi}</b></div>
                      </div>
                      <div className="field" style={{ marginTop: 16 }}><label>UTR / transaction ID (after paying)</label><input className={bad.u ? 'bad' : ''} value={f.u} onChange={set('u')} /></div>
                    </>
                  )}
                  <label className={'lb' + (bad.agreed ? ' bad-lb' : '')} style={{ cursor: 'pointer', marginTop: 14, marginBottom: 0 }}>
                    <input type="checkbox" checked={agreed} onChange={(e) => { setAgreed(e.target.checked); setBad({ ...bad, agreed: false }) }} />
                    I understand final batch onboarding happens after meeting {BIZ.trainer} with a parent/guardian.
                  </label>
                </div>
              </div>

              <div className="card sticky">
                <span className="tag">Selected course</span>
                <h3 style={{ margin: '10px 0 6px' }}>{course.name}</h3>
                <div className="kv"><span>Course fee</span><b>{inr(course.fee_inr)}</b></div>
                <div className="kv"><span>Duration</span><b>{course.duration_months} month{course.duration_months > 1 ? 's' : ''}</b></div>
                <div className="kv"><span>Batch</span><b>{f.batch}</b></div>
                <div className="kv"><span>Certificate</span><b>Included free</b></div>
                <div className="total"><span>Pay now ({payOption === 'seat' ? 'Seat fee' : payOption === 'half' ? '50%' : 'Full'})</span><span>{inr(payAmount)}</span></div>
                <div style={{ marginTop: 12 }}>
                  {STAGES.slice(0, course.stages).map((st) => (
                    <span className="chip" key={st.no}>Stage {st.no}: {st.name}</span>
                  ))}
                </div>
                {err && <div className="alert" role="alert" style={{ marginTop: 12 }}>{err}</div>}
                <button className="btn block" style={{ marginTop: 12 }} disabled={busy || !!activeApp} onClick={submit}>
                  {busy
                    ? (payMethod === 'razorpay' ? 'Processing payment...' : 'Submitting...')
                    : activeApp
                      ? 'Slot already applied'
                      : (payMethod === 'razorpay' ? `Pay ${inr(payAmount)} & Book Slot` : `Submit & Verify ${inr(payAmount)}`)}
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
    </>
  )
}
