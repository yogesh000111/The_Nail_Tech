'use client'
import { useEffect, useState } from 'react'
import { supabase } from './supabase'

// Shown if the database cannot be reached, so public pages never go blank.
// Booking and applications need the live database.
export const FB_COURSES = [
  { id: 1, name: 'Basic', fee_inr: 5000, duration_months: 1, stages: 1, summary: 'Stage 1' },
  { id: 2, name: 'Basic to Intermediate', fee_inr: 10000, duration_months: 2, stages: 2, summary: 'Stages 1 to 2' },
  { id: 3, name: 'Basic to Professional', fee_inr: 18000, duration_months: 3, stages: 3, summary: 'Stages 1 to 3' },
  { id: 4, name: 'Masters in Nail Art', fee_inr: 25000, duration_months: 6, stages: 4, summary: 'All 4 stages' },
]
export const FB_SERVICES = [
  ['Gel Polish', 350, 60], ['Gel Polish (Hands + Feet)', 650, 120], ['Natural Nail Overlay', 599, 120],
  ['Temporary Extensions', 699, 120], ['Gel Extensions', 999, 120], ['Acrylic Extensions', 1199, 120],
  ['Soft Gel / TikTok Extensions', 1199, 120], ['Polygel Extensions', 1399, 120], ['Sculpted Extensions', 1499, 120], ['Feet Extensions', 599, 120],
].map(([name, price_inr, duration_minutes], i) => ({ id: i + 1, name, price_inr, duration_minutes }))

export function useCatalog() {
  const [d, setD] = useState({ courses: FB_COURSES, services: FB_SERVICES, live: false, loading: true })
  useEffect(() => {
    let alive = true
    ;(async () => {
      const [c, s] = await Promise.all([
        supabase.from('courses').select('*').eq('active', true).order('id'),
        supabase.from('services').select('*').eq('active', true).order('id'),
      ])
      if (!alive) return
      const ok = !!(c.data?.length && s.data?.length)
      setD({ courses: c.data?.length ? c.data : FB_COURSES, services: s.data?.length ? s.data : FB_SERVICES, live: ok, loading: false })
    })()
    return () => { alive = false }
  }, [])
  return d
}
