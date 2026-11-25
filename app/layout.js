import './globals.css'
import { Cormorant_Garamond, DM_Sans } from 'next/font/google'
import AuthProvider from '../components/AuthProvider'
import Header from '../components/Header'
import Footer from '../components/Footer'
import Toaster from '../components/Toaster'
import VisitTracker from '../components/VisitTracker'
import { wa } from '../lib/utils'

const display = Cormorant_Garamond({ subsets: ['latin'], weight: ['500', '600', '700'], variable: '--font-display' })
const body = DM_Sans({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-body' })

export const metadata = {
  title: { default: 'The Nail Academy · Ludhiana', template: '%s · The Nail Academy' },
  description: 'Nail training courses and nail services in Ludhiana, Punjab. Learn from the basics to master artistry, or book your appointment.',
}
export const viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover', themeColor: '#fbf6f0' }

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body>
        <AuthProvider>
          <VisitTracker />
          <Header />
          <main>{children}</main>
          <Footer />
          <Toaster />
          <a className="wafab" href={wa('Hi, I have a question about The Nail Academy.')} target="_blank" rel="noopener noreferrer" aria-label="Chat on WhatsApp">
            <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor" aria-hidden="true"><path d="M12 3a9 9 0 0 0-7.8 13.5L3 21l4.6-1.2A9 9 0 1 0 12 3zm0 2a7 7 0 1 1-3.7 13l-.3-.2-2.4.6.6-2.3-.2-.3A7 7 0 0 1 12 5zm-2.2 3.4c-.2 0-.4.1-.6.3-.2.3-.8.8-.8 2s.9 2.3 1 2.5c.1.2 1.7 2.7 4.2 3.7 2 .8 2.4.6 2.8.6.5 0 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.6-.3l-1.7-.8c-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1-.3-.1-1.1-.4-2-1.3-.8-.7-1.3-1.5-1.4-1.8-.1-.2 0-.4.1-.5l.4-.5.2-.4c.1-.2 0-.3 0-.5l-.8-1.9c-.2-.5-.4-.4-.6-.4z" /></svg>
          </a>
        </AuthProvider>
      </body>
    </html>
  )
}
