let sdkPromise = null

/** Preloads and deduplicates the Razorpay Checkout SDK script in the browser. */
export function loadRazorpay() {
  if (typeof window === 'undefined') return Promise.resolve(false)
  if (window.Razorpay) return Promise.resolve(true)
  if (sdkPromise) return sdkPromise

  sdkPromise = new Promise((resolve) => {
    const existing = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]')
    if (existing) {
      if (existing.dataset.failed === '1') {
        existing.remove()
      } else {
        existing.addEventListener('load', () => resolve(!!window.Razorpay), { once: true })
        existing.addEventListener('error', () => {
          existing.dataset.failed = '1'
          sdkPromise = null
          resolve(false)
        }, { once: true })
        setTimeout(() => {
          if (!window.Razorpay) sdkPromise = null
          resolve(!!window.Razorpay)
        }, 4000)
        return
      }
    }
    const s = document.createElement('script')
    s.src = 'https://checkout.razorpay.com/v1/checkout.js'
    s.async = true
    s.onload = () => resolve(!!window.Razorpay)
    s.onerror = () => {
      s.dataset.failed = '1'
      sdkPromise = null
      resolve(false)
    }
    document.head.appendChild(s)
  })
  return sdkPromise
}

/** Creates a Razorpay order, opens mobile-friendly Checkout, and verifies payment server-side. */
export async function startRazorpayPayment({
  businessName,
  amountInr,
  description,
  serviceName,
  date,
  prefill,
  onVerified,
  onError,
  onDone,
}) {
  let handedOffToModal = false
  try {
    const loaded = await loadRazorpay()
    if (!loaded || !window.Razorpay) {
      onError('Could not load Razorpay Checkout. Check your connection or use UPI App / QR.')
      return
    }

    const orderRes = await fetch('/api/razorpay/order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amountPaise: Math.round(Number(amountInr) * 100),
        serviceName,
        date,
      }),
    })
    const orderData = await orderRes.json().catch(() => ({}))
    if (!orderRes.ok || !orderData.orderId) {
      onError(orderData.error || 'Could not start Razorpay payment. Your slot has not been booked.')
      return
    }

    const cleanPrefill = {}
    if (prefill?.name && String(prefill.name).trim()) {
      cleanPrefill.name = String(prefill.name).trim()
    }
    const contactDigits = String(prefill?.contact || '').replace(/\D/g, '').slice(-10)
    if (contactDigits.length === 10) {
      cleanPrefill.contact = `+91${contactDigits}`
    }
    const cleanEmail = String(prefill?.email || '').trim()
    if (cleanEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      cleanPrefill.email = cleanEmail
    }

    let failureReason = ''

    const rzp = new window.Razorpay({
      key: orderData.keyId,
      amount: orderData.amount,
      currency: orderData.currency,
      name: businessName,
      description,
      order_id: orderData.orderId,
      prefill: cleanPrefill,
      theme: { color: '#a85f5a' },
      retry: { enabled: true, max_count: 3 },
      modal: {
        backdropclose: false,
        escape: true,
        confirm_close: true,
        ondismiss: () => {
          onError(failureReason || 'Payment was cancelled. Your slot is not booked until payment succeeds.')
          onDone?.()
        },
      },
      handler: async (response) => {
        try {
          const verifyRes = await fetch('/api/razorpay/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(response),
          })
          const verifyData = await verifyRes.json().catch(() => ({}))
          if (!verifyRes.ok || !verifyData.verified) {
            onError(verifyData.error || 'Payment could not be verified. Your slot has not been booked.')
            return
          }
          await onVerified(verifyData.paymentId)
        } catch {
          onError('Could not verify payment with the server. Please contact us with your Razorpay payment ID.')
        } finally {
          onDone?.()
        }
      },
    })

    rzp.on('payment.failed', (resp) => {
      const desc = resp?.error?.description || 'Payment failed. Your slot is not booked until payment succeeds.'
      const isTestVpa = /vpa|upi/i.test(desc) && String(orderData.keyId || '').startsWith('rzp_test_')
      failureReason = isTestVpa ? `${desc} (In Razorpay Test Mode, enter test UPI ID success@razorpay.)` : desc
      onError(failureReason)
      onDone?.()
    })

    handedOffToModal = true
    rzp.open()
  } catch (err) {
    onError(err?.message || 'Could not open Razorpay Checkout. Try again or use UPI App / QR.')
  } finally {
    if (!handedOffToModal) onDone?.()
  }
}
