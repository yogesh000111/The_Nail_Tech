import PageHead from '../../components/PageHead'
import { BIZ } from '../../lib/config'

export const metadata = { title: 'Privacy Policy' }

export default function PrivacyPolicy() {
  return (
    <>
      <PageHead eyebrow="Legal" title="Privacy Policy">
        How {BIZ.name} collects, uses, and protects your personal information.
      </PageHead>
      <section className="section tight">
        <div className="container">
          <div className="card" style={{ maxWidth: 820 }}>
            <h3>1. Information We Collect</h3>
            <p className="mut">When you book a nail service, apply for an academy course, or send an inquiry, we collect your name, phone number, email address, and (for academy admissions) parent/guardian contact details, city, and age.</p>

            <h3>2. How We Use Your Information</h3>
            <p className="mut">Your details are used strictly to confirm salon appointments, schedule academy admissions, maintain your student training logbook, and communicate updates via WhatsApp, phone, or email.</p>

            <h3>3. Payment Security</h3>
            <p className="mut">Online payments are processed securely through Razorpay. {BIZ.name} does not store your card, netbanking, or UPI PIN details on our servers. We only store your payment reference ID and transaction status for booking verification.</p>

            <h3>4. Data Sharing &amp; Retention</h3>
            <p className="mut">We do not sell, rent, or share your personal information with third-party marketers. Data is shared only with essential service providers (Supabase for authentication/database and Razorpay for payment processing).</p>

            <h3>5. Contact Us</h3>
            <p className="mut" style={{ marginBottom: 0 }}>For privacy or data deletion requests, contact {BIZ.trainer} at {BIZ.phone} or visit us in {BIZ.city}.</p>
          </div>
        </div>
      </section>
    </>
  )
}
