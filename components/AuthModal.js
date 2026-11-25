'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

function friendly(msg) {
  if (/not authorized/i.test(msg)) return 'This email address cannot receive messages yet while email delivery is being set up. Please try again later.'
  if (/signups not allowed/i.test(msg)) return 'No account found with this email. Please create an account first.'
  if (/rate limit|security purposes|after \d+ seconds/i.test(msg)) return 'Too many requests. Please wait a minute and try again.'
  return msg
}

export default function AuthModal({ mode, setMode, onClose }) {
  const up = mode === 'up'
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [step, setStep] = useState(0)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [wait, setWait] = useState(0)
  const em = email.trim().toLowerCase()

  useEffect(() => {
    const k = (e) => e.key === 'Escape' && onClose()
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', k)
    return () => { document.body.style.overflow = ''; window.removeEventListener('keydown', k) }
  }, [onClose])

  useEffect(() => {
    if (wait <= 0) return
    const t = setTimeout(() => setWait(wait - 1), 1000)
    return () => clearTimeout(t)
  }, [wait])

  async function send() {
    if (up && name.trim().length < 2) { setErr('Please enter your name.'); return }
    if (!/^\S+@\S+\.\S+$/.test(em)) { setErr('Please enter a valid email address.'); return }
    setBusy(true); setErr('')
    const { error } = await supabase.auth.signInWithOtp({
      email: em,
      options: { shouldCreateUser: up, data: up ? { full_name: name.trim() } : undefined, emailRedirectTo: window.location.origin },
    })
    setBusy(false)
    if (error) { setErr(friendly(error.message)); return }
    setStep(1); setWait(60)
  }

  async function verify() {
    if (digits(code).length < 6) { setErr('Please enter the 6-digit code from the email.'); return }
    setBusy(true); setErr('')
    const { error } = await supabase.auth.verifyOtp({ email: em, token: code.trim(), type: 'email' })
    setBusy(false)
    if (error) setErr('That code is not correct or has expired. Please try again.')
  }
  const digits = (v) => v.replace(/\D/g, '')

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={up ? 'Create account' : 'Sign in'}>
        <button className="x" onClick={onClose} aria-label="Close">×</button>
        {step === 0 ? (
          <>
            <div className="seg">
              <button className={!up ? 'on' : ''} onClick={() => { setMode('in'); setErr('') }}>Sign in</button>
              <button className={up ? 'on' : ''} onClick={() => { setMode('up'); setErr('') }}>Sign up</button>
            </div>
            <h2>{up ? 'Create your account' : 'Welcome back'}</h2>
            <p className="mut">{up ? 'Join the academy or book appointments. No password needed.' : 'We will email you a secure link to sign in. No password needed.'}</p>
            {up && (<div className="field"><label>Your name</label><input autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} /></div>)}
            <div className="field"><label>Email address</label><input type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} /></div>
            {err && <div className="alert" role="alert">{err}</div>}
            <button className="btn block" disabled={busy} onClick={send}>{busy ? 'Sending...' : 'Continue with email'}</button>
          </>
        ) : (
          <>
            <div className="mailic" aria-hidden="true">✉</div>
            <h2>Check your inbox</h2>
            <p className="mut">We sent a sign-in email to <b>{em}</b>. Click the link in it to finish. If the email shows a 6-digit code, you can type it below instead.</p>
            <div className="field"><label>6-digit code (optional)</label><input inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && verify()} /></div>
            {err && <div className="alert" role="alert">{err}</div>}
            <button className="btn block" disabled={busy || !code} onClick={verify}>{busy ? 'Checking...' : 'Verify code'}</button>
            <div className="mlinks">
              <button disabled={wait > 0} onClick={send}>{wait > 0 ? `Resend in ${wait}s` : 'Resend email'}</button>
              <button onClick={() => { setStep(0); setCode(''); setErr('') }}>Use a different email</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
