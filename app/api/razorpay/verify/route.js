import crypto from 'node:crypto'
import { NextResponse } from 'next/server'

function getKeys() {
  const keyId = (process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || '').trim()
  const keySecret = (process.env.RAZORPAY_KEY_SECRET || '').trim()
  const placeholder = !keyId || !keySecret || keyId.includes('...') || keySecret === '...'
  return { keyId, keySecret, placeholder }
}

/** Verifies Razorpay payment signature and confirms payment capture status via Razorpay API. */
export async function POST(req) {
  const { keyId, keySecret, placeholder } = getKeys()
  if (placeholder) {
    return NextResponse.json({ verified: false, error: 'Razorpay is not configured.' }, { status: 503 })
  }

  let body
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ verified: false, error: 'Invalid request body.' }, { status: 400 })
  }

  const orderId = String(body?.razorpay_order_id || '').trim()
  const paymentId = String(body?.razorpay_payment_id || '').trim()
  const signature = String(body?.razorpay_signature || '').trim()

  if (!orderId || !paymentId || !signature) {
    return NextResponse.json({ verified: false, error: 'Missing payment confirmation details.' }, { status: 400 })
  }

  const expected = crypto.createHmac('sha256', keySecret).update(`${orderId}|${paymentId}`).digest('hex')
  const expectedBuf = Buffer.from(expected, 'utf8')
  const sigBuf = Buffer.from(signature, 'utf8')

  if (expectedBuf.length !== sigBuf.length || !crypto.timingSafeEqual(expectedBuf, sigBuf)) {
    return NextResponse.json({ verified: false, error: 'Payment signature verification failed.' }, { status: 400 })
  }

  const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64')
  const payRes = await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(paymentId)}`, {
    headers: { Authorization: `Basic ${auth}` },
  })
  const payment = await payRes.json().catch(() => ({}))

  if (!payRes.ok || payment.order_id !== orderId) {
    return NextResponse.json(
      { verified: false, error: payment?.error?.description || 'Payment does not match this booking order.' },
      { status: 400 },
    )
  }

  let finalStatus = payment.status
  if (finalStatus === 'authorized') {
    const capRes = await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(paymentId)}/capture`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: payment.amount,
        currency: payment.currency || 'INR',
      }),
    })
    const capData = await capRes.json().catch(() => ({}))
    if (capRes.ok && capData?.status === 'captured') {
      finalStatus = 'captured'
    } else {
      const recheckRes = await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(paymentId)}`, {
        headers: { Authorization: `Basic ${auth}` },
      })
      const recheckData = await recheckRes.json().catch(() => ({}))
      if (recheckRes.ok && recheckData?.status) {
        finalStatus = recheckData.status
      }
    }
  }

  if (finalStatus !== 'captured') {
    return NextResponse.json(
      { verified: false, error: payment?.error?.description || 'Payment has not been captured by Razorpay.' },
      { status: 400 },
    )
  }

  return NextResponse.json({
    verified: true,
    paymentId,
    orderId,
    status: finalStatus,
  })
}
