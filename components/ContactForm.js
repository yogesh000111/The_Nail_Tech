'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthProvider'
import { toast } from './Toaster'

export default function ContactForm() {
  const { user, profile, displayName } = useAuth()
  const [name, setName] = useState('')
  const [contact, setContact] = useState('')
  const [topic, setTopic] = useState('Course admission inquiry')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    const cleanName = profile?.full_name || (displayName && !user?.email?.startsWith(displayName) ? displayName : '')
    if (cleanName) setName((p) => p || cleanName)
    if (profile?.phone || user?.email) setContact((p) => p || profile?.phone || user?.email || '')
  }, [profile, displayName, user])

  async function submit(e) {
    e.preventDefault()
    setErr('')
    if (name.trim().length < 2 || contact.trim().length < 5 || message.trim().length < 4) {
      setErr('Please enter your name, phone or email, and a short message.')
      return
    }
    setBusy(true)
    let token = ''
    try {
      const { data } = await supabase.auth.getSession()
      token = data?.session?.access_token || ''
    } catch {}

    const res = await fetch('/api/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        kind: 'inquiry',
        name: name.trim(),
        contact: contact.trim(),
        topic,
        message: message.trim(),
      }),
    })
    const data = await res.json().catch(() => ({}))
    setBusy(false)
    if (!res.ok) {
      setErr(data.error || 'Could not send message. Please try WhatsApp.')
      return
    }
    setSent(true)
    setMessage('')
    toast('Message sent to the academy')
  }

  return (
    <form className="card" onSubmit={submit}>
      <h3 style={{ marginBottom: 8 }}>Send a message / Request callback</h3>
      <p className="mut" style={{ fontSize: 14, marginBottom: 16 }}>Ask about course batches, instalments, or bridal nail appointments. Our admin sees every inquiry directly.</p>
      <div className="grid g2">
        <div className="field"><label>Your name</label><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" /></div>
        <div className="field"><label>Phone or email</label><input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="10-digit mobile or email" /></div>
      </div>
      <div className="field">
        <label>Topic</label>
        <select value={topic} onChange={(e) => setTopic(e.target.value)}>
          <option>Course admission inquiry</option>
          <option>Nail service / Bridal booking</option>
          <option>Fee / Instalment question</option>
          <option>Other question</option>
        </select>
      </div>
      <div className="field"><label>Message</label><textarea rows={3} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="How can we help you?" /></div>
      {err && <div className="alert" role="alert">{err}</div>}
      {sent && <div className="card" style={{ background: '#dcefe2', color: '#2f6a43', padding: '10px 14px', marginBottom: 14, border: 0 }}>Message received! We will get back to you shortly.</div>}
      <button className="btn" type="submit" disabled={busy}>{busy ? 'Sending...' : 'Send message'}</button>
    </form>
  )
}
