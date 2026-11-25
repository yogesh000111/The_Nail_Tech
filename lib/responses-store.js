import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const LOCAL_DIR = path.join(process.cwd(), '.data')
const TMP_DIR = path.join(os.tmpdir(), 'nail-academy-data')
const EMPTY = { applications: [], bookings: [], inquiries: [], visitors: [] }

function getStoreDir() {
  return process.env.VERCEL ? TMP_DIR : LOCAL_DIR
}

export function readResponses() {
  for (const dir of [getStoreDir(), LOCAL_DIR, TMP_DIR]) {
    try {
      const file = path.join(dir, 'responses.json')
      if (!fs.existsSync(file)) continue
      const raw = JSON.parse(fs.readFileSync(file, 'utf8'))
      return {
        applications: Array.isArray(raw?.applications) ? raw.applications : [],
        bookings: Array.isArray(raw?.bookings) ? raw.bookings : [],
        inquiries: Array.isArray(raw?.inquiries) ? raw.inquiries : [],
        visitors: Array.isArray(raw?.visitors) ? raw.visitors : [],
      }
    } catch {}
  }
  return { ...EMPTY }
}

export function writeResponses(data) {
  for (const dir of [getStoreDir(), TMP_DIR]) {
    try {
      fs.mkdirSync(dir, { recursive: true })
      fs.writeFileSync(path.join(dir, 'responses.json'), JSON.stringify(data, null, 2), 'utf8')
      return true
    } catch {}
  }
  return false
}
