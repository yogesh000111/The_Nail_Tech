import { BIZ } from './config'

export const wa = (m) => `https://wa.me/${BIZ.wa}?text=${encodeURIComponent(m || '')}`
export function upiUrl(amount, note) {
  const amt = Number(amount).toFixed(2)
  const cleanNote = String(note || BIZ.name).replace(/[^\w\s-]/g, '').trim().slice(0, 50)
  return `upi://pay?pa=${BIZ.upi}&pn=${encodeURIComponent(BIZ.name)}&am=${amt}&cu=INR&tn=${encodeURIComponent(cleanNote)}`
}
export const fmt = (h) => `${h > 12 ? h - 12 : h}:00 ${h >= 12 ? 'PM' : 'AM'}`
export const inr = (n) => '₹' + Number(n).toLocaleString('en-IN')
export const digits = (v) => (v || '').replace(/\D/g, '')
export const ist = (iso) => new Date(iso).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })
export const STATUS = { awaiting_advance: 'Advance being checked', confirmed: 'Confirmed', completed: 'Completed', cancelled: 'Cancelled', no_show: 'No show' }

export function earliest() {
  const d = new Date()
  d.setDate(d.getDate() + 2)
  if (d.getDay() === 0) d.setDate(d.getDate() + 1)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
