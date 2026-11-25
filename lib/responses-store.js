import fs from 'node:fs'
import path from 'node:path'

const DIR = path.join(process.cwd(), '.data')
const FILE = path.join(DIR, 'responses.json')

const EMPTY = { applications: [], bookings: [], inquiries: [], visitors: [] }

export function readResponses() {
  try {
    if (!fs.existsSync(FILE)) return { ...EMPTY }
    const raw = JSON.parse(fs.readFileSync(FILE, 'utf8'))
    return {
      applications: Array.isArray(raw?.applications) ? raw.applications : [],
      bookings: Array.isArray(raw?.bookings) ? raw.bookings : [],
      inquiries: Array.isArray(raw?.inquiries) ? raw.inquiries : [],
      visitors: Array.isArray(raw?.visitors) ? raw.visitors : [],
    }
  } catch {
    return { ...EMPTY }
  }
}

export function writeResponses(data) {
  try {
    fs.mkdirSync(DIR, { recursive: true })
    fs.writeFileSync(FILE, JSON.stringify(data, null, 2), 'utf8')
    return true
  } catch {
    return false
  }
}
