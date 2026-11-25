'use client'
import Link from 'next/link'
import Reveal from '../components/Reveal'
import HeroArt from '../components/HeroArt'
import { useCatalog } from '../lib/catalog'
import { useAuth } from '../components/AuthProvider'
import { BIZ, GALLERY, STAGES } from '../lib/config'
import { inr, wa } from '../lib/utils'

const FAQ = [
  ['Who can join the academy?', `Anyone interested in learning nails can apply. Admission is taken in the presence of a parent, so please come with one when you meet ${BIZ.trainer}.`],
  ['How long are the courses?', 'From 1 month for the basics up to 6 months for the full masters course. Every course is 60% practical and 40% theory, in small batches.'],
  ['Is the certificate free?', 'Yes. Students receive a certificate on completing their course at no extra charge.'],
  ['Can I pay the course fee in instalments?', `Full payment in one go is appreciated, but instalments can be arranged. Speak to ${BIZ.trainer} at admission.`],
  ['When are the classes?', 'There are two 2-hour batches, Monday to Saturday, from 4 PM to 8 PM. Sunday is closed.'],
  ['How do I book a nail service?', `Pick your service and a date at least 2 days ahead, pay the 50% advance, and your booking is sent to ${BIZ.trainer} for confirmation. Heavy art or extras are settled at the appointment.`],
]

export default function Home() {
  const { courses, services } = useCatalog()
  const { openAuth, user, displayName } = useAuth()
  return (
    <>
      <section className="hero">
        <div className="container hero-grid">
          <div>
            {user && displayName && <div className="welcome-pill">✦ Welcome, <b>{displayName}</b></div>}
            <span className="eyebrow">Nail training and studio · Ludhiana</span>
            <h1>Learn the art of nails. <em>Or let us pamper yours.</em></h1>
            <p className="lead">Train with {BIZ.trainer} in small batches, from first manicure to master artistry. Or book a set for yourself in our studio.</p>
            <div className="btns">
              <Link className="btn" href="/apply">Join the academy</Link>
              <Link className="btn ghost" href="/book">Book appointment</Link>
            </div>
            <div className="facts">
              <div><b>4</b>training stages</div><div><b>58</b>skills in the logbook</div><div><b>60%</b>practical learning</div>
            </div>
          </div>
          <div className="artwrap">
            <HeroArt />
            <div className="float a"><i>✦</i>Free certificate</div>
            <div className="float b"><i>✦</i>Small batches</div>
            <div className="float c"><i>✦</i>Individual attention</div>
          </div>
        </div>
      </section>

      <section className="section tight">
        <div className="container grid g2">
          <Reveal className="card path">
            <div className="ic">✎</div>
            <h3>I want to learn nails</h3>
            <p className="mut">Structured courses taught step by step, with your own digital logbook that tracks every skill you master.</p>
            <ul><li>Four stages, basic to masters</li><li>Free certificate on completion</li><li>Apply with a parent, start in a small batch</li></ul>
            <Link className="btn" href="/courses">Explore courses</Link>
          </Reveal>
          <Reveal className="card path" delay={120}>
            <div className="ic">✦</div>
            <h3>I want my nails done</h3>
            <p className="mut">Gel polish, extensions and nail art by an experienced trainer. Choose a slot that suits you.</p>
            <ul><li>Gel, acrylic, polygel and sculpted sets</li><li>Hand-painted and 3D art</li><li>Book at least 2 days ahead</li></ul>
            <Link className="btn" href="/book">Book a slot</Link>
          </Reveal>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <Reveal className="sec-head row">
            <div><span className="eyebrow">Courses</span><h2>Pick the path that fits you</h2></div>
            <Link className="btn ghost" href="/courses">See all courses</Link>
          </Reveal>
          <div className="grid g4">
            {courses.map((c, i) => (
              <Reveal key={c.id} delay={i * 80} className="card ccard">
                <h3>{c.name}</h3>
                <div className="price">{inr(c.fee_inr)}</div>
                <div className="dur">{c.duration_months} month{c.duration_months > 1 ? 's' : ''} · {c.stages} stage{c.stages > 1 ? 's' : ''}</div>
                <Link className="btn ghost sm" href={`/apply/${c.id}`}>Apply</Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="section alt">
        <div className="container">
          <Reveal className="sec-head"><span className="eyebrow">The journey</span><h2>Four stages, one skill at a time</h2><p>Each skill is demonstrated, practised twice and signed off by your trainer before you move on. You can follow all of it in your own logbook.</p></Reveal>
          <div className="tl">
            {STAGES.map((s, i) => (
              <Reveal key={s.no} delay={i * 100} className="st">
                <div className="no">{s.no}</div>
                <h3>{s.name}</h3>
                <p>{s.blurb}</p>
                <span className="tag">{s.skills} skills</span>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <Reveal className="sec-head row">
            <div><span className="eyebrow">Services</span><h2>Beautiful sets, fairly priced</h2></div>
            <Link className="btn ghost" href="/services">Full price list</Link>
          </Reveal>
          <Reveal className="card">
            {services.slice(0, 6).map((s) => (
              <div className="srow" key={s.id}><div><b>{s.name}</b><small>About {s.duration_minutes / 60} hour{s.duration_minutes > 60 ? 's' : ''}</small></div><span className="p">{inr(s.price_inr)}</span></div>
            ))}
            <p className="note" style={{ margin: '14px 0 0' }}>Prices may vary with nail length, design and nail condition. Advance booking required.</p>
          </Reveal>
        </div>
      </section>

      <section className="section alt">
        <div className="container">
          <Reveal className="sec-head"><span className="eyebrow">Our work</span><h2>A little inspiration</h2></Reveal>
          <div className="gal">
            {(GALLERY.length ? GALLERY : ['Gel', 'Extensions', 'Nail art', 'French', 'Chrome', '3D art']).map((g, i) => (
              <Reveal key={i} delay={i * 60} className="tile">{GALLERY.length ? <img src={g} alt={`Nail work ${i + 1}`} loading="lazy" /> : g}</Reveal>
            ))}
          </div>
          <p className="note" style={{ marginTop: 14 }}>See more on <a href={BIZ.instagram} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--rose-d)' }}>Instagram</a>.</p>
        </div>
      </section>

      <section className="section">
        <div className="container grid g2" style={{ alignItems: 'start' }}>
          <Reveal className="sec-head"><span className="eyebrow">Booking made simple</span><h2>Three steps to your slot</h2>
            <div className="steps">
              <div className="step"><em>1</em><div><b>Choose service and time</b><p>Pick a date at least 2 days ahead, Monday to Saturday.</p></div></div>
              <div className="step"><em>2</em><div><b>Pay the 50% advance</b><p>Pay securely via Razorpay or UPI QR to reserve your slot.</p></div></div>
              <div className="step"><em>3</em><div><b>Get confirmed</b><p>{BIZ.trainer} verifies the advance and confirms your slot.</p></div></div>
            </div>
          </Reveal>
          <Reveal delay={120}>
            <span className="eyebrow">Questions</span>
            {FAQ.map(([q, a]) => (<details className="faq" key={q}><summary>{q}</summary><p>{a}</p></details>))}
          </Reveal>
        </div>
      </section>

      <section className="section tight">
        <div className="container">
          <Reveal className="cta">
            <h2>Ready to begin?</h2>
            <p>Create a free account to apply for a course or book your appointment. Questions first? Message us on WhatsApp.</p>
            <div className="btns">
              {!user && <button className="btn light" onClick={() => openAuth('up')}>Create account</button>}
              <a className="btn ghost" href={wa('Hi, I have a question about The Nail Academy.')} target="_blank" rel="noopener noreferrer">WhatsApp us</a>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  )
}
