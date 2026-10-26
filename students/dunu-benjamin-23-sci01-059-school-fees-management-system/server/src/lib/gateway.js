// Sandbox payment gateway, a stand-in for a real provider such as Paystack.
// In production the browser sends card details straight to the provider's
// hosted checkout; our API only ever sees the reference and verifies the result
// server-to-server. Here the "provider" runs in the same process but is kept
// separate: its own router (/sandbox-gateway), its own table, and the API talks
// to it only through verify().
import { prisma } from '../db.js'

const TEST_CARDS = {
  '4084084084084081': { status: 'success', code: '00', message: 'Approved' },
  '4000000000000002': { status: 'failed', code: '51', message: 'Insufficient funds' },
  '5060666666666666666': { status: 'pending', code: '09', message: 'Transaction pending at bank' },
}

const OUTCOMES = {
  success: { status: 'success', code: '00', message: 'Approved' },
  failed: { status: 'failed', code: '05', message: 'Do not honour' },
  pending: { status: 'pending', code: '09', message: 'Transaction pending at bank' },
}

export function luhn(num) {
  let sum = 0
  let dbl = false
  for (let i = num.length - 1; i >= 0; i--) {
    let d = Number(num[i])
    if (dbl) {
      d *= 2
      if (d > 9) d -= 9
    }
    sum += d
    dbl = !dbl
  }
  return num.length >= 13 && num.length <= 19 && sum % 10 === 0
}

export function brandOf(num) {
  if (/^4/.test(num)) return 'Visa'
  if (/^(506[01]|507[89]|6500)/.test(num)) return 'Verve'
  if (/^(5[1-5]|2(2[2-9]|[3-6]\d|7[01]|720))/.test(num)) return 'Mastercard'
  return 'Card'
}

/** Our API registers the amount with the gateway before checkout (like Paystack's initialize call). */
export async function initialize(reference, amount) {
  await prisma.gatewayCharge.upsert({
    where: { reference },
    create: { reference, amount, status: 'initialized', code: '', message: 'Awaiting payment', channel: '' },
    update: { amount, status: 'initialized', code: '', message: 'Awaiting payment', checks: 0 },
  })
}

/** Called by the gateway's checkout endpoint. Card numbers are used here and then discarded. */
export async function charge({ reference, method, card, simulate, bank }) {
  const existing = await prisma.gatewayCharge.findUnique({ where: { reference } })
  if (!existing) return { error: 'unknown_reference', message: 'Unknown payment reference.' }
  if (!['initialized', 'failed'].includes(existing.status)) return { error: 'already_processed', message: 'This payment has already been processed.' }
  const amount = existing.amount
  let outcome
  let last4 = null
  let brand = null
  let channel
  if (method === 'card') {
    const digits = String(card?.number || '').replace(/\D/g, '')
    if (!luhn(digits)) return { error: 'invalid_card', message: 'This card number isn’t valid. Check the digits.' }
    const [mm, yy] = String(card.expiry || '').split('/')
    const exp = new Date(2000 + Number(yy), Number(mm))
    if (!(Number(mm) >= 1 && Number(mm) <= 12) || !(exp > new Date())) return { error: 'expired_card', message: 'This card has expired.' }
    if (!/^\d{3,4}$/.test(String(card.cvv || ''))) return { error: 'invalid_cvv', message: 'Enter the 3-digit code on the back of the card.' }
    outcome = TEST_CARDS[digits] || OUTCOMES.success
    last4 = digits.slice(-4)
    brand = brandOf(digits)
    channel = `${brand} ****${last4}`
  } else {
    outcome = OUTCOMES[simulate] || OUTCOMES.success
    channel = method === 'transfer' ? 'Bank transfer · Wema virtual account' : `USSD · *${bank || '737'}#`
  }
  const data = { amount, status: outcome.status, code: outcome.code, message: outcome.message, channel, last4, brand, checks: 0 }
  await prisma.gatewayCharge.upsert({ where: { reference }, create: { reference, ...data }, update: data })
  return { status: outcome.status, message: outcome.message }
}

/** Server-to-server verification, like GET /transaction/verify/:reference on a real gateway. */
export async function verify(reference) {
  const c = await prisma.gatewayCharge.findUnique({ where: { reference } })
  if (!c || c.status !== 'pending') return c
  // Pending charges settle on the second status check, to demo the "Check status" flow.
  const checks = c.checks + 1
  return prisma.gatewayCharge.update({
    where: { reference },
    data: checks >= 2 ? { status: 'success', code: '00', message: 'Approved', checks } : { checks },
  })
}
