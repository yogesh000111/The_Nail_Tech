import PageHead from '../../components/PageHead'
import { BIZ } from '../../lib/config'

export const metadata = { title: 'Terms & Conditions' }

export default function TermsPage() {
  return (
    <>
      <PageHead eyebrow="Legal" title="Terms & Conditions">
        Terms governing nail studio bookings, academy courses, and online payments at {BIZ.name}.
      </PageHead>
      <section className="section tight">
        <div className="container">
          <div className="card" style={{ maxWidth: 820 }}>
            <h3>1. Studio Appointments</h3>
            <p className="mut">Appointments are available {BIZ.hours} (Sunday closed) and must be booked at least 2 days in advance with a 50% advance payment. Base service prices may vary depending on nail length, extensions, removal of previous work, and custom 3D/hand-painted art, which are settled at the studio.</p>

            <h3>2. Academy Admissions &amp; Training</h3>
            <p className="mut">Course admissions require an in-person visit with a parent or guardian to finalize batch timings with {BIZ.trainer}. Students receive a certificate upon successful completion of all required practical and theory stages in their digital logbook.</p>

            <h3>3. Pricing &amp; Payments</h3>
            <p className="mut">All prices listed on this website are in Indian Rupees (INR). Slots and seats are reserved only upon successful payment confirmation via Razorpay or verified UPI transfer.</p>

            <h3>4. Conduct &amp; Safety</h3>
            <p className="mut">{BIZ.name} reserves the right to reschedule appointments or pause services if client nails show signs of infection or require medical attention prior to cosmetic work.</p>

            <h3>5. Governing Law</h3>
            <p className="mut" style={{ marginBottom: 0 }}>These terms are governed by the laws of India with jurisdiction in {BIZ.city}. Contact: {BIZ.phone}.</p>
          </div>
        </div>
      </section>
    </>
  )
}
