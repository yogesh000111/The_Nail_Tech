'use client'
import Link from 'next/link'
import PageHead from '../../components/PageHead'
import Reveal from '../../components/Reveal'
import { useCatalog } from '../../lib/catalog'
import { ADDONS, BIZ } from '../../lib/config'
import { inr } from '../../lib/utils'

export default function Services() {
  const { services } = useCatalog()
  const gel = services.filter((s) => /gel polish|overlay/i.test(s.name))
  const ext = services.filter((s) => !gel.includes(s))
  const Group = ({ title, list }) => (
    <Reveal className="card">
      <h3 style={{ marginBottom: 6 }}>{title}</h3>
      {list.map((s) => (
        <Link className="srow" key={s.id} href={`/book?service=${s.id}`} style={{ textDecoration: 'none' }}>
          <div><b>{s.name}</b><small>About {s.duration_minutes / 60} hour{s.duration_minutes > 60 ? 's' : ''} · tap to book</small></div>
          <span className="p">{inr(s.price_inr)}</span>
        </Link>
      ))}
    </Reveal>
  )
  return (
    <>
      <PageHead eyebrow="Services" title="Nail services, beautifully done">
        Gel, extensions and nail art by {BIZ.trainer}. A new set takes about 2 hours, and removal plus a new set about 3 hours.
      </PageHead>
      <section className="section tight">
        <div className="container grid g2" style={{ alignItems: 'start' }}>
          <div className="grid">
            <Group title="Gel and natural nails" list={gel} />
            <Reveal className="card">
              <h3 style={{ marginBottom: 6 }}>Nail art and removal</h3>
              {ADDONS.map(([n, p]) => (<div className="srow" key={n}><b>{n}</b><span className="p" style={{ fontSize: 20 }}>{p}</span></div>))}
            </Reveal>
          </div>
          <div className="grid">
            <Group title="Extensions" list={ext} />
            <Reveal className="card" style={{ background: 'var(--blush)' }}>
              <h3 style={{ marginBottom: 8 }}>Please note</h3>
              <ul style={{ margin: 0, paddingLeft: 18, color: 'var(--mut)' }}>
                <li>Prices may vary with nail length, design and nail condition.</li>
                <li>Advance booking is required, at least 2 days ahead.</li>
                <li>Removal of previous work may be charged separately.</li>
              </ul>
              <div className="btns"><Link className="btn" href="/book">Book appointment</Link></div>
            </Reveal>
          </div>
        </div>
      </section>
    </>
  )
}
