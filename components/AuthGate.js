'use client'
import { useAuth } from './AuthProvider'

export default function AuthGate({ title = 'Please sign in to continue', text = 'It takes a few seconds. We only need your email.' }) {
  const { openAuth } = useAuth()
  return (
    <div className="card gate">
      <div className="gate-ic" aria-hidden="true">✦</div>
      <h3>{title}</h3>
      <p className="mut">{text}</p>
      <button className="btn" onClick={() => openAuth('in')}>Sign in</button>
      <button className="btn ghost" onClick={() => openAuth('up')}>Create account</button>
    </div>
  )
}
