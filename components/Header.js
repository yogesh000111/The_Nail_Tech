'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useAuth } from './AuthProvider'

const LINKS = [
  ['/', 'Home'],
  ['/courses', 'Courses'],
  ['/apply', 'Join Academy'],
  ['/services', 'Services'],
  ['/book', 'Book'],
  ['/about', 'About'],
  ['/admin', 'Admin'],
]

export default function Header() {
  const path = usePathname()
  const { user, displayName, ready, openAuth, signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const [menu, setMenu] = useState(false)
  const [solid, setSolid] = useState(false)

  useEffect(() => { setOpen(false); setMenu(false) }, [path])
  useEffect(() => {
    const s = () => setSolid(window.scrollY > 8)
    s(); window.addEventListener('scroll', s, { passive: true })
    return () => window.removeEventListener('scroll', s)
  }, [])
  useEffect(() => {
    if (!menu) return
    const c = (e) => { if (!e.target.closest('.avwrap')) setMenu(false) }
    document.addEventListener('mousedown', c)
    return () => document.removeEventListener('mousedown', c)
  }, [menu])

  const on = (h) => (h === '/' ? path === '/' : path.startsWith(h))
  const name = displayName || user?.email || 'Account'
  const initial = (name[0] || '?').toUpperCase()

  return (
    <header className={'site-header' + (solid ? ' solid' : '')}>
      <div className="container hbar">
        <Link href="/" className="brand"><span className="logo">N</span><span><b>The Nail Academy</b><small>Ludhiana</small></span></Link>
        <nav className="dnav" aria-label="Main">
          {LINKS.map(([h, l]) => (<Link key={h} href={h} className={on(h) ? 'on' : ''}>{l}</Link>))}
        </nav>
        <div className="hauth">
          {ready && (user ? (
            <div className="avwrap">
              <button className="user-pill" onClick={() => setMenu(!menu)} aria-label="Account menu" aria-expanded={menu}>
                <span className="avatar">{initial}</span>
                <span className="uname">{name}</span>
              </button>
              {menu && (
                <div className="pop">
                  <div className="pop-h">{name}<small>{user.email}</small></div>
                  <Link href="/account">My account</Link>
                  <Link href="/admin">Admin login</Link>
                  <button onClick={signOut}>Log out</button>
                </div>
              )}
            </div>
          ) : (
            <>
              <button className="btn ghost sm hide-s" onClick={() => openAuth('in')}>Sign in</button>
              <button className="btn sm" onClick={() => openAuth('up')}>Sign up</button>
            </>
          ))}
          <button className={'burger' + (open ? ' open' : '')} aria-label="Menu" aria-expanded={open} onClick={() => setOpen(!open)}><span /><span /><span /></button>
        </div>
      </div>
      {open && (
        <div className="drawer">
          {LINKS.map(([h, l]) => (<Link key={h} href={h} className={on(h) ? 'on' : ''}>{l === 'Admin' ? 'Admin login' : l}</Link>))}
          {ready && (user ? (
            <div className="drawer-acts">
              <Link href="/account" className={on('/account') ? 'on' : ''}>My account ({name})</Link>
              <button className="btn ghost block" onClick={() => { setOpen(false); signOut() }}>Log out</button>
            </div>
          ) : (
            <div className="drawer-acts">
              <button className="btn block" onClick={() => { setOpen(false); openAuth('up') }}>Create account</button>
              <button className="btn ghost block" onClick={() => { setOpen(false); openAuth('in') }}>Sign in</button>
            </div>
          ))}
        </div>
      )}
    </header>
  )
}
