'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../components/AuthProvider'
import AuthGate from '../../components/AuthGate'
import PageHead from '../../components/PageHead'
import Done from '../../components/Done'
import { useCatalog } from '../../lib/catalog'
import { BIZ } from '../../lib/config'
import { loadRazorpay } from '../../lib/razorpay-client'
import { digits, earliest, fmt, inr, wa } from '../../lib/utils'

export default function Book() {
  const { user, profile, displayName, syncPhoneIfEmpty, ready } = useAuth()
  const { services, live, loading: catLoading } = useCatalog()
  const [si, setSi] = useState(0)
  const [rem, setRem] = useState(false)
  const [date, setDate] = useState('')
  const [time, setTime] = useState(null)
  const [busySlots, setBusySlots] = useState([])
  const [payMethod, setPayMethod] = useState('razorpay')
  const [rzpReady, setRzpReady] = useState(true)
  const [f, setF] = useState({ n: '', p: '', u: '' })
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
    const id = new URLSearchParams(window.location.search).get('service')
    if (id) { const i = services.findIndex((s) => String(s.id) === id); if (i >= 0) setSi(i) }
  }, [services])

  useEffect(() => {
    const name = profile?.full_name || (displayName && !user?.email?.startsWith(displayName) ? displayName : '')
    setF((p) => ({
      ...p,
      n: p.n || name || '',
      p: p.p || profile?.phone || '',
    }))
  }, [profile, displayName, user])

  useEffect(() => {
    if (!date) { setBusySlots([]); return }
    fetch(`/api/responses?type=slots&date=${encodeURIComponent(date)}`)
      .then((r) => r.json())
      .then((d) => setBusySlots(Array.isArray(d?.slots) ? d.slots : []))
      .catch(() => setBusySlots([]))
  }, [date, done])

  const s = services[si] || services[0]
  const hours = Math.ceil((s.duration_minutes + (rem ? 60 : 0)) / 60)
  const adv = Math.round(s.price_inr / 2)
  const starts = []
  for (let t = 16; t + hours <= 20; t++) starts.push(t)
  const isTaken = (t) => busySlots.some((b) => t < b.startHour + b.hours && b.startHour < t + hours)
  const set = (k) => (e) => { setF({ ...f, [k]: e.target.value }); setBad({ ...bad, [k]: false }) }

  async function saveBooking(paymentRef, isVerifiedOnline) {
    const start = `${date}T${String(time).padStart(2, '0')}:00:00+05:30`
    const { data, error } = await supabase.from('bookings').insert({
      service_id: s.id, with_removal: rem, start_at: start, client_name: f.n.trim(), client_phone: f.p.trim(), utr: paymentRef,
    }).select().single()
    if (error) { setErr(error.message); return false }
    await syncPhoneIfEmpty(f.p.trim())
    const sv = s.name + (rem ? ' + removal' : '')
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
          kind: 'booking',
          bookingId: data.id,
          clientName: f.n.trim(),
          clientPhone: f.p.trim(),
          serviceName: sv,
          date,
          startHour: time,
          hours,
          advanceInr: adv,
          paymentMethod: isVerifiedOnline ? 'razorpay' : 'upi',
          paymentRef,
          paymentVerified: isVerifiedOnline,
        }),
      })
    } catch {}
    const ref = data.id.slice(0, 6).toUpperCase()
    setDone({
      pending: !isVerifiedOnline,
      title: isVerifiedOnline ? 'Your slot is booked!' : 'Booking request submitted',
      text: isVerifiedOnline
        ? `Your advance payment of ${inr(adv)} was verified via Razorpay and your slot is booked. Send the details on WhatsApp if you have any questions for ${BIZ.trainer}.`
        : `Your booking is pending payment verification. Send your UTR on WhatsApp so ${BIZ.trainer} can verify the transfer and confirm your slot.`,
      rows: [
        ['Service', sv],
        ['Date', new Date(date + 'T00:00:00').toLocaleDateString('en-IN', { dateStyle: 'long' })],
        ['Time', `${fmt(time)} to ${fmt(time + hours)}`],
        [isVerifiedOnline ? 'Advance paid (Razorpay)' : 'Advance claimed (pending)', inr(adv)],
        [isVerifiedOnline ? 'Razorpay Payment ID' : 'UTR / Reference', paymentRef],
      ],
      ref,
      msg: `New booking - The Nail Academy\nRef: ${ref}\nName: ${f.n.trim()} (${f.p.trim()})\nService: ${sv}\nDate: ${date}\nTime: ${fmt(time)} to ${fmt(time + hours)}\nAdvance: Rs ${adv}\n${isVerifiedOnline ? 'Razorpay Payment ID' : 'UTR'}: ${paymentRef}${isVerifiedOnline ? ' (Verified)' : '\nPlease verify my payment and confirm my slot.'}`,
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
    return true
  }

  async function submit() {
    if (!date) { setBad({ d: true }); setErr('Please choose a date.'); return }
    if (date < earliest() || new Date(date + 'T00:00:00').getDay() === 0) { setBad({ d: true }); setErr('Bookings need to be at least 2 days ahead, Monday to Saturday.'); return }
    if (time === null || !starts.includes(time)) { setErr('Please choose a start time.'); return }
    if (isTaken(time)) { setErr('That time slot was just booked. Please pick another start time.'); return }
    const b = {
      n: f.n.trim().length < 2,
      p: digits(f.p).length < 10,
      u: payMethod === 'upi' && !f.u.trim(),
    }
    setBad(b)
    if (Object.values(b).some(Boolean)) {
      setErr(payMethod === 'upi'
        ? 'Please check the highlighted fields. Mobile needs 10 digits, and the UTR is needed after paying.'
        : 'Please check the highlighted fields. Name and 10-digit mobile number are required.')
      return
    }

    if (payMethod === 'upi') {
      setBusy(true); setErr('')
      await saveBooking(f.u.trim(), false)
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
        amountPaise: adv * 100,
        serviceName: s.name + (rem ? ' + removal' : ''),
        date,
      }),
    })
    const orderData = await orderRes.json().catch(() => ({}))
    if (!orderRes.ok || !orderData.orderId) {
      setBusy(false)
      setErr(orderData.error || 'Could not start Razorpay payment. Your booking has not been confirmed.')
      return
    }

    const rzp = new window.Razorpay({
      key: orderData.keyId,
      amount: orderData.amount,
      currency: orderData.currency,
      name: BIZ.name,
      description: `50% Advance · ${s.name}${rem ? ' + removal' : ''}`,
      order_id: orderData.orderId,
      prefill: {
        name: f.n.trim(),
        email: user?.email || '',
        contact: digits(f.p).slice(-10),
      },
      theme: { color: '#a85f5a' },
      modal: {
        ondismiss: () => {
          setBusy(false)
          setErr('Payment was cancelled. Your booking is not confirmed until payment succeeds.')
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
            setErr(verifyData.error || 'Payment could not be verified. Your booking has not been confirmed.')
            setBusy(false)
            return
          }
          await saveBooking(verifyData.paymentId, true)
        } catch {
          setErr('Could not verify payment with the server. Please contact us with your Razorpay payment ID.')
        } finally {
          setBusy(false)
        }
      },
    })

    rzp.on('payment.failed', (resp) => {
      setBusy(false)
      setErr(resp?.error?.description || 'Payment failed. Your booking is not confirmed until payment succeeds.')
    })

    rzp.open()
  }

  return (
    <>
      <PageHead eyebrow="Book appointment" title={done ? 'Thank you' : 'Reserve your slot'}>
        Appointments are Monday to Saturday between 4 and 8 PM, booked at least 2 days ahead with a 50% advance.
      </PageHead>
      <section className="section tight">
        <div className="container">
          {done ? <Done d={done} /> : (!ready || catLoading) ? <p className="mut">Loading...</p> : !user ? (
            <AuthGate title="Sign in to book" text="Sign in with your email to choose a slot and track your bookings." />
          ) : !live ? (
            <div className="card gate"><h3>Booking is paused</h3><p className="mut">We cannot reach our booking system right now. Please message us on WhatsApp and we will book you in.</p><a className="btn" href={wa('Hi, I would like to book an appointment.')}>WhatsApp us</a></div>
          ) : (
            <div className="split">
              <div className="grid">
                <div className="card">
                  <h3 style={{ marginBottom: 16 }}><span className="num">1</span>Choose your service</h3>
                  <div className="field"><select value={si} onChange={(e) => { setSi(+e.target.value); setTime(null) }}>{services.map((x, i) => (<option key={x.id} value={i}>{x.name} · {inr(x.price_inr)}</option>))}</select></div>
                  <label className="lb" style={{ cursor: 'pointer' }}><input type="checkbox" checked={rem} onChange={(e) => { setRem(e.target.checked); setTime(null) }} />Remove my old set first (adds 1 hour)</label>
                </div>
                <div className="card">
                  <h3 style={{ marginBottom: 16 }}><span className="num">2</span>Pick date and time</h3>
                  <div className="field"><label>Date (Monday to Saturday)</label><input className={bad.d ? 'bad' : ''} type="date" min={earliest()} value={date} onChange={(e) => { setDate(e.target.value); setTime(null); setBad({ ...bad, d: false }) }} /></div>
                  <label className="lb">Start time · this booking takes about {hours} hours</label>
                  <div className="slots">{starts.map((t) => {
                    const taken = isTaken(t)
                    return (
                      <button
                        type="button"
                        key={t}
                        disabled={taken}
                        className={'slot' + (time === t ? ' on' : '') + (taken ? ' taken' : '')}
                        onClick={() => setTime(t)}
                      >
                        {fmt(t)}{taken ? ' (Booked)' : ''}
                      </button>
                    )
                  })}</div>
                </div>
                <div className="card">
                  <h3 style={{ marginBottom: 16 }}><span className="num">3</span>Your details and advance</h3>
                  <div className="grid g2">
                    <div className="field"><label>Your name</label><input className={bad.n ? 'bad' : ''} autoComplete="name" value={f.n} onChange={set('n')} /></div>
                    <div className="field"><label>Mobile number</label><input className={bad.p ? 'bad' : ''} type="tel" inputMode="numeric" value={f.p} onChange={set('p')} /></div>
                  </div>
                  <div className="tabs" style={{ marginBottom: 14 }}>
                    <button type="button" className={payMethod === 'razorpay' ? 'on' : ''} onClick={() => { setPayMethod('razorpay'); setErr('') }}>Razorpay (Instant)</button>
                    <button type="button" className={payMethod === 'upi' ? 'on' : ''} onClick={() => { setPayMethod('upi'); setErr('') }}>UPI QR (Manual check)</button>
                  </div>
                  {payMethod === 'razorpay' ? (
                    <div className="qrbox">
                      <b>Pay {inr(adv)} advance securely with Razorpay</b>
                      <p className="note" style={{ margin: '8px 0 0' }}>Supports UPI, Credit/Debit Cards, and NetBanking. Your booking is confirmed only after payment succeeds.</p>
                      {!rzpReady && (
                        <div className="alert" style={{ marginTop: 12, marginBottom: 0, textAlign: 'left' }}>
                          Razorpay keys in <code>.env.local</code> are not set yet (<code>RAZORPAY_KEY_ID</code> and <code>RAZORPAY_KEY_SECRET</code>). Add your keys and restart the server, or use UPI QR below.
                          <div style={{ marginTop: 10 }}>
                            <button type="button" className="btn ghost sm" onClick={() => { setPayMethod('upi'); setErr('') }}>Switch to UPI QR (Manual check)</button>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <>
                      <div className="qrbox">
                        <b>Pay {inr(adv)} advance by UPI</b>
                        <img className="qr" src="/upi-qr.png" alt={`UPI QR code for ${BIZ.trainer}`} />
                        <div className="note">Any UPI app · UPI ID <b>{BIZ.upi}</b></div>
                      </div>
                      <div className="field" style={{ marginTop: 16 }}><label>UTR / transaction ID (after paying)</label><input className={bad.u ? 'bad' : ''} value={f.u} onChange={set('u')} /></div>
                      <p className="note" style={{ margin: 0 }}>Manual UPI requests stay pending until {BIZ.trainer} verifies your UTR.</p>
                    </>
                  )}
                </div>
              </div>
              <div className="card sticky">
                <span className="tag">Your booking</span>
                <h3 style={{ margin: '10px 0 8px' }}>{s.name}{rem ? ' + removal' : ''}</h3>
                <div className="kv"><span>Date</span><b>{date ? new Date(date + 'T00:00:00').toLocaleDateString('en-IN', { dateStyle: 'medium' }) : '-'}</b></div>
                <div className="kv"><span>Time</span><b>{time !== null ? `${fmt(time)} to ${fmt(time + hours)}` : '-'}</b></div>
                <div className="kv"><span>Base price</span><b>{inr(s.price_inr)}</b></div>
                <div className="total"><span>Advance now (50%)</span><span>{inr(adv)}</span></div>
                <p className="note" style={{ marginTop: 10 }}>Heavy art or extras are settled at the appointment. Free cancellation up to 24 hours before.</p>
                {err && <div className="alert" role="alert">{err}</div>}
                <button className="btn block" disabled={busy} onClick={submit}>
                  {busy ? (payMethod === 'razorpay' ? 'Processing Razorpay...' : 'Submitting...') : (payMethod === 'razorpay' ? `Pay ${inr(adv)} & Confirm Booking` : 'Submit for Verification')}
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
    </>
  )
}
