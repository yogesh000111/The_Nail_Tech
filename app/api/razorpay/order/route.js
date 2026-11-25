import { NextResponse } from 'next/server'

function getKeys() {
  const keyId = (process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || '').trim()
  const keySecret = (process.env.RAZORPAY_KEY_SECRET || '').trim()
  const placeholder = !keyId || !keySecret || keyId.includes('...') || keySecret === '...'
  return { keyId, keySecret, placeholder }
}

/** Reports whether real Razorpay keys are configured in the environment. */
export async function GET() {
  const { keyId, placeholder } = getKeys()
  return NextResponse.json({
    configured: !placeholder,
    testMode: !placeholder && keyId.startsWith('rzp_test_'),
  })
}

/** Creates a Razorpay order for the 50% booking advance. */
export async function POST(req) {
  const { keyId, keySecret, placeholder } = getKeys()
  if (placeholder) {
    return NextResponse.json(
      {
        configured: false,
        error: 'Razorpay API keys are not set yet. Replace RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env.local with real Razorpay keys and restart the server.',
      },
      { status: 503 },
    )
  }

  let body
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const amountPaise = Math.round(Number(body?.amountPaise))
  if (!Number.isFinite(amountPaise) || amountPaise < 100) {
    return NextResponse.json({ error: 'Invalid advance amount.' }, { status: 400 })
  }

  const receipt = `na_${Date.now()}`.slice(0, 40)
  const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64')

  const res = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: amountPaise,
      currency: 'INR',
      receipt,
      notes: {
        service: String(body?.serviceName || '').slice(0, 120),
        date: String(body?.date || '').slice(0, 40),
      },
    }),
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok || !data?.id) {
    return NextResponse.json(
      { error: data?.error?.description || 'Could not create Razorpay order.' },
      { status: res.status || 502 },
    )
  }

  return NextResponse.json({
    configured: true,
    orderId: data.id,
    amount: data.amount,
    currency: data.currency || 'INR',
    keyId,
  })
}
