'use client'
import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

export default function VisitTracker() {
  const path = usePathname()

  useEffect(() => {
    if (typeof window === 'undefined' || path?.startsWith('/admin')) return
    try {
      let vid = window.sessionStorage.getItem('na_vid')
      const isNew = !vid
      if (!vid) {
        vid = `v_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
        window.sessionStorage.setItem('na_vid', vid)
      }
      if (!isNew) return
      fetch('/api/responses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: 'visit', visitorId: vid, path }),
      }).catch(() => {})
    } catch {}
  }, [path])

  return null
}
