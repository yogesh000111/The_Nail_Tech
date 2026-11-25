import PageHead from '../../components/PageHead'
import Reveal from '../../components/Reveal'
import ContactForm from '../../components/ContactForm'
import { BIZ } from '../../lib/config'
import { wa } from '../../lib/utils'

export const metadata = { title: 'About' }

export default function About() {
  return (
    <>
      <PageHead eyebrow="About us" title="Where nail artists are made" />
      <section className="section tight">
        <div className="container grid g2" style={{ alignItems: 'start' }}>
          <Reveal className="card">
            <p>The Nail Academy in Ludhiana, Punjab, is run by trainer {BIZ.trainer}, who teaches nail care, extensions and nail art step by step.</p>
            <p>Classes are small, with 60% practical work and 40% theory, so every student gets individual attention.</p>
            <p>Courses run from the basics to master level, and each student receives a free certificate on completion.</p>
            <p style={{ margin: 0 }}>The same studio takes appointments for gel, extension and nail art services.</p>
          </Reveal>
          <Reveal delay={120} className="card">
            <h3 style={{ marginBottom: 10 }}>Visit and contact</h3>
            <div className="kv"><span>Location</span><b>{BIZ.city}</b></div>
            <div className="kv"><span>Timings</span><b>{BIZ.hours}</b></div>
            <div className="kv"><span>Sunday</span><b>Closed</b></div>
            <div className="kv"><span>Phone / WhatsApp</span><b>{BIZ.phone}</b></div>
            <div className="btns">
              <a className="btn" href={wa('')} target="_blank" rel="noopener noreferrer">Chat on WhatsApp</a>
              <a className="btn ghost" href={BIZ.instagram} target="_blank" rel="noopener noreferrer">Instagram</a>
            </div>
          </Reveal>
        </div>
        <div className="container" style={{ marginTop: 28 }}>
          <ContactForm />
        </div>
      </section>
    </>
  )
}
