'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import PageHead from '../../components/PageHead'
import Reveal from '../../components/Reveal'
import { supabase } from '../../lib/supabase'
import { useCatalog } from '../../lib/catalog'
import { BIZ, STAGES } from '../../lib/config'
import { inr } from '../../lib/utils'

export default function Courses() {
  const { courses } = useCatalog()
  const [stages, setStages] = useState([])
  const [skills, setSkills] = useState([])
  const [openStage, setOpenStage] = useState(1)

  useEffect(() => {
    let alive = true
    Promise.all([
      supabase.from('stages').select('*').order('no'),
      supabase.from('skills').select('*').order('id'),
    ]).then(([st, sk]) => {
      if (!alive) return
      if (st.data?.length) setStages(st.data)
      if (sk.data?.length) setSkills(sk.data)
    })
    return () => { alive = false }
  }, [])

  const stageList = stages.length ? stages : STAGES
  return (
    <>
      <PageHead eyebrow="Courses" title="Learn nails from the basics to master level">
        Small batches, 60% practical and 40% theory, and a free certificate when you complete your course.
      </PageHead>
      <section className="section tight">
        <div className="container grid g2">
          {courses.map((c, i) => (
            <Reveal key={c.id} delay={(i % 2) * 100} className={'card ccard' + (c.stages === 3 ? ' hot' : '')}>
              {c.stages === 3 && <span className="tag ribbon">Most popular</span>}
              <h3>{c.name}</h3>
              <div className="price">{inr(c.fee_inr)}</div>
              <div className="dur">{c.duration_months} month{c.duration_months > 1 ? 's' : ''} · full payment preferred, instalments available</div>
              <div style={{ marginBottom: 18 }}>
                {STAGES.slice(0, c.stages).map((s) => (<span className="chip" key={s.no}>Stage {s.no}: {s.name}</span>))}
              </div>
              <Link className="btn" href={`/apply/${c.id}`}>Apply for this course</Link>
            </Reveal>
          ))}
        </div>
      </section>
      <section className="section alt">
        <div className="container grid g2" style={{ alignItems: 'start' }}>
          <Reveal>
            <span className="eyebrow">Your digital logbook</span>
            <h2>Every skill tracked, signed and yours</h2>
            <p className="lead" style={{ marginTop: 14 }}>For each skill your trainer records the demonstration, your two practice sessions and the final sign-off. Stages unlock in order, and you can see your progress anytime from your account.</p>
            <div style={{ marginTop: 22 }}>
              {stageList.map((st) => {
                const list = skills.filter((k) => k.stage_no === st.no)
                const isOpen = openStage === st.no
                const meta = STAGES.find((x) => x.no === st.no)
                return (
                  <div className="card" key={st.no} style={{ marginBottom: 12, padding: '16px 20px' }}>
                    <button
                      type="button"
                      className="syl-btn"
                      onClick={() => setOpenStage(isOpen ? 0 : st.no)}
                      aria-expanded={isOpen}
                    >
                      <span><b>Stage {st.no}:</b> {st.name}</span>
                      <span className="tag">{list.length || meta?.skills || 0} skills</span>
                    </button>
                    {isOpen && (
                      <div style={{ marginTop: 12 }}>
                        {meta?.blurb && <p className="mut" style={{ fontSize: 14 }}>{meta.blurb}</p>}
                        {list.length > 0 && (
                          <div className="syl-grid">
                            {list.map((k) => (<div className="syl-item" key={k.id}><b>{k.code}</b> {k.title}</div>))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </Reveal>
          <Reveal delay={120} className="card">
            <h3 style={{ marginBottom: 12 }}>How admission works</h3>
            <div className="step"><em>1</em><div><b>Apply online</b><p>Choose your course, preferred batch, and share your parent&apos;s details.</p></div></div>
            <div className="step"><em>2</em><div><b>Meet {BIZ.trainer} with a parent</b><p>She will call you to arrange a visit and confirm your seat.</p></div></div>
            <div className="step"><em>3</em><div><b>Start your batch</b><p>Classes run Monday to Saturday in two 2-hour batches, 4 to 8 PM.</p></div></div>
            <div className="btns" style={{ marginTop: 16 }}>
              <Link className="btn" href="/apply">Open application form</Link>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  )
}
