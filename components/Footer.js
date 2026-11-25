import Link from 'next/link'
import { BIZ } from '../lib/config'
import { wa } from '../lib/utils'

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container fgrid">
        <div>
          <div className="brand"><span className="logo">N</span><span><b>The Nail Academy</b></span></div>
          <p className="mut" style={{ maxWidth: '32ch' }}>Nail training and nail services in {BIZ.city}, taught by {BIZ.trainer}.</p>
        </div>
        <div><h4>Explore</h4><Link href="/courses">Courses</Link><Link href="/apply">Join Academy</Link><Link href="/services">Services</Link><Link href="/book">Book appointment</Link><Link href="/about">About</Link><Link href="/admin">Admin login</Link></div>
        <div><h4>Visit</h4><span>{BIZ.city}</span><span>{BIZ.hours}</span><span>Sunday closed</span></div>
        <div><h4>Contact</h4><a href={wa('')}>WhatsApp {BIZ.phone}</a><a href={`tel:+91${BIZ.phone}`}>Call {BIZ.phone}</a><a href={BIZ.instagram} target="_blank" rel="noopener noreferrer">Instagram</a></div>
      </div>
      <div className="container fbase">© {new Date().getFullYear()} The Nail Academy. All rights reserved.</div>
    </footer>
  )
}
