'use client'
import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import AuthModal from './AuthModal'
import { toast } from './Toaster'

const Ctx = createContext(null)
export const useAuth = () => useContext(Ctx)

const isTrainerPlaceholder = (name, role) =>
  role !== 'admin' && (name || '').trim().toLowerCase() === 'miss aashika'

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [checked, setChecked] = useState(false)
  const [profileDone, setProfileDone] = useState(false)
  const [modal, setModal] = useState(null)
  const modalRef = useRef(null)
  modalRef.current = modal

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setUser(data.session?.user ?? null); setChecked(true) })
    const { data: l } = supabase.auth.onAuthStateChange((event, s) => {
      setUser(s?.user ?? null)
      if (event === 'SIGNED_IN' && modalRef.current) { setModal(null); toast('You are signed in') }
    })
    return () => l.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    let alive = true
    setProfileDone(false)
    if (!user) { setProfile(null); setProfileDone(true); return }
    const rawMeta = (user.user_metadata?.full_name || '').trim()
    supabase.from('profiles').select('*').eq('id', user.id).maybeSingle().then(async ({ data }) => {
      if (!alive) return
      const role = data?.role || 'client'
      const rawDb = (data?.full_name || '').trim()
      const dbName = isTrainerPlaceholder(rawDb, role) ? '' : rawDb
      const metaName = isTrainerPlaceholder(rawMeta, role) ? '' : rawMeta
      const preferredName = dbName || metaName

      let resolved = data ? { ...data, full_name: preferredName || null } : { id: user.id, role, email: user.email, full_name: preferredName || null }
      if (preferredName && preferredName !== rawDb) {
        try {
          await (data
            ? supabase.from('profiles').update({ full_name: preferredName }).eq('id', user.id)
            : supabase.from('profiles').upsert({ id: user.id, email: user.email, full_name: preferredName }, { onConflict: 'id' }))
        } catch {}
      }
      if (!alive) return
      setProfile(resolved)
      setProfileDone(true)
    })
    return () => { alive = false }
  }, [user])

  const updateProfile = async ({ full_name, phone }) => {
    if (!user) return { error: 'Not signed in' }
    const payload = {}
    if (full_name !== undefined) {
      const trimmed = full_name.trim()
      if (trimmed.length < 2) return { error: 'Please enter at least 2 characters for your name.' }
      payload.full_name = trimmed
    }
    if (phone !== undefined) {
      payload.phone = phone.trim()
    }
    const { data: updated, error: updErr } = await supabase
      .from('profiles')
      .update(payload)
      .eq('id', user.id)
      .select()
      .maybeSingle()

    let dbErr = updErr
    if (!updErr && !updated) {
      const ins = await supabase.from('profiles').insert({ id: user.id, email: user.email, ...payload })
      dbErr = ins.error
    }

    let authErr = null
    if (payload.full_name) {
      const res = await supabase.auth.updateUser({ data: { full_name: payload.full_name } })
      authErr = res.error
    }
    if (dbErr && authErr) return { error: dbErr.message || authErr.message }
    if (dbErr) return { error: dbErr.message }
    setProfile((prev) => ({ ...(prev || { id: user.id, role: 'client', email: user.email }), ...payload }))
    return { error: null }
  }

  const updateName = async (nextName) => updateProfile({ full_name: nextName })

  const syncPhoneIfEmpty = async (phone) => {
    if (!user || !phone?.trim() || profile?.phone) return
    const cleaned = phone.trim()
    try {
      await supabase.from('profiles').update({ phone: cleaned }).eq('id', user.id)
      setProfile((prev) => (prev ? { ...prev, phone: prev.phone || cleaned } : prev))
    } catch {}
  }

  const signOut = async () => { await supabase.auth.signOut(); toast('You are signed out') }
  const rawMeta = (user?.user_metadata?.full_name || '').trim()
  const safeMeta = isTrainerPlaceholder(rawMeta, profile?.role) ? '' : rawMeta
  const safeProfile = isTrainerPlaceholder(profile?.full_name, profile?.role) ? '' : (profile?.full_name || '').trim()
  const displayName = (safeProfile || safeMeta || user?.email?.split('@')[0] || '').trim()
  const needsName = !!(user && !safeProfile && !safeMeta)
  const value = { user, profile, displayName, needsName, updateName, updateProfile, syncPhoneIfEmpty, role: profile?.role || null, ready: checked && profileDone, openAuth: (m = 'in') => setModal(m), signOut }

  return (
    <Ctx.Provider value={value}>
      {children}
      {modal && <AuthModal mode={modal} setMode={setModal} onClose={() => setModal(null)} />}
    </Ctx.Provider>
  )
}
