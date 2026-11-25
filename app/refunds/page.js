import PageHead from '../../components/PageHead'
import { BIZ } from '../../lib/config'

export const metadata = { title: 'Refund & Cancellation Policy' }

export default function RefundsPage() {
  return (
    <>
      <PageHead eyebrow="Legal" title="Refund & Cancellation Policy">
        Clear rules for appointment rescheduling, cancellations, and academy fee refunds.
      </PageHead>
      <section className="section tight">
        <div className="container">
          <div className="card" style={{ maxWidth: 820 }}>
            <h3>1. Nail Appointment Cancellations</h3>
            <p className="mut">You may cancel or reschedule your nail appointment free of charge at least <b>24 hours</b> before your scheduled slot time. Cancellations made within 24 hours of the slot or no-shows may forfeit the 50% advance.</p>

            <h3>2. Academy Course &amp; Seat Reservation Fee</h3>
            <p className="mut">The online seat reservation fee or instalment reserves a small-batch seat for your chosen course. If admission is not finalized after your parent visit with {BIZ.trainer}, or if a batch cannot be accommodated, the booking fee is eligible for a full refund. Once classes commence, course fees are non-refundable.</p>

            <h3>3. Refund Processing Timeline</h3>
            <p className="mut">Approved refunds for online Razorpay payments are initiated back to the original payment method (UPI, card, or bank account) within <b>5–7 business days</b>.</p>

            <h3>4. How to Request a Cancellation or Refund</h3>
            <p className="mut" style={{ marginBottom: 0 }}>Signed-in users can cancel eligible bookings directly from My Account, or you can contact {BIZ.trainer} on WhatsApp / phone at {BIZ.phone} with your booking reference ID.</p>
          </div>
        </div>
      </section>
    </>
  )
}
