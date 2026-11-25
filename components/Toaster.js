'use client'
import { useEffect, useState } from 'react'

export function toast(m) {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('na-toast', { detail: m }))
}

export default function Toaster() {
  const [t, setT] = useState(null)
  useEffect(() => {
    let timer
    const h = (e) => { setT(e.detail); clearTimeout(timer); timer = setTimeout(() => setT(null), 2400) }
    window.addEventListener('na-toast', h)
    return () => { window.removeEventListener('na-toast', h); clearTimeout(timer) }
  }, [])
  return t ? <div className="toast" role="status">{t}</div> : null
}
