import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../db.js'
import { config } from '../config.js'
import { parse } from '../middleware/validate.js'
import { requireRole } from '../middleware/auth.js'
import { studentFees, serviceCharge } from '../lib/fees.js'
import { paymentOut } from '../lib/serialize.js'
import { audit } from '../lib/audit.js'
import * as gateway from '../lib/gateway.js'
import { badRequest, notFound, HttpError } from '../lib/errors.js'
import { log } from '../lib/logger.js'
import { sendMail } from '../lib/mailer.js'

const router = Router()
const naira = (n) => `₦${Number(n).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

async function nextRef() {
  const year = new Date().getFullYear()
  const last = await prisma.payment.findFirst({ where: { ref: { startsWith: `SFP-${year}-` } }, orderBy: { ref: 'desc' }, select: { ref: true } })
  const n = last ? Number(last.ref.slice(-6)) + 1 : 1
  return `SFP-${year}-${String(n).padStart(6, '0')}`
}

const step = (label, extra = {}) => ({ label, at: new Date().toISOString(), done: true, ...extra })

// ---------- Initiate ----------
router.post('/initiate', requireRole('student'), async (req, res) => {
  const body = parse(
    z.object({
      items: z.array(z.object({ feeId: z.string().min(1).max(40), amount: z.number().positive().max(100_000_000) })).min(1, 'Select at least one fee').max(20),
      method: z.enum(['card', 'transfer', 'ussd']),
    }),
    req.body,
  )
  const key = String(req.get('idempotency-key') || '').slice(0, 80) || null
  if (key) {
    const existing = await prisma.payment.findUnique({ where: { idempotencyKey: key }, include: { items: true } })
    if (existing && existing.studentId === req.user.id) return res.json({ payment: paymentOut(existing), reused: true })
  }

  // Amounts are re-checked against live balances on the server; the client's figures are never trusted.
  const fees = await studentFees(req.user)
  const errors = {}
  const allocations = body.items.map((it, i) => {
    const fee = fees.find((f) => f.id === it.feeId && f.session === config.currentSession && f.status === 'published')
    if (!fee) {
      errors[`items.${i}`] = 'This fee isn’t payable.'
      return null
    }
    const balance = Math.round((fee.amount - fee.paid) * 100) / 100
    const min = Math.min(fee.minInstallment || config.minInstallment, balance)
    if (balance <= 0) errors[`items.${i}`] = `${fee.name} is already paid.`
    else if (it.amount > balance) errors[`items.${i}`] = `Amount can’t be more than the balance of ${naira(balance)}.`
    else if (it.amount < balance && !fee.installments) errors[`items.${i}`] = `${fee.name} must be paid in full.`
    else if (it.amount < min) errors[`items.${i}`] = `Minimum installment is ${naira(min)}.`
    return { fee, amount: Math.round(it.amount * 100) / 100, balance }
  })
  if (Object.keys(errors).length) throw badRequest(Object.values(errors)[0], { fields: errors })
  if (new Set(body.items.map((i) => i.feeId)).size !== body.items.length) throw badRequest('Each fee can only appear once.')

  const amount = allocations.reduce((s, a) => s + a.amount, 0)
  const charge = serviceCharge(amount)
  let payment
  for (let attempt = 0; attempt < 3 && !payment; attempt++) {
    try {
      payment = await prisma.payment.create({
        data: {
          ref: await nextRef(),
          studentId: req.user.id,
          amount,
          serviceCharge: charge,
          method: body.method,
          status: 'pending',
          session: config.currentSession,
          ip: req.ip,
          idempotencyKey: key,
          timeline: JSON.stringify([step('Payment initiated')]),
          items: { create: allocations.map((a) => ({ feeItemId: a.fee.id, name: a.amount < a.balance ? `${a.fee.name} (part payment)` : a.fee.name, amount: a.amount })) },
        },
        include: { items: true },
      })
    } catch (e) {
      if (e.code !== 'P2002') throw e // retry only on a reference collision
    }
  }
  await gateway.initialize(payment.ref, amount + charge)
  audit(req, 'PAYMENT_INITIATED', `Transaction: ${payment.ref}`)
  res.status(201).json({ payment: paymentOut(payment) })
})

// ---------- Verify (server-to-server with the gateway) ----------
router.post('/:ref/verify', requireRole('student'), async (req, res) => {
  const ref = String(req.params.ref).slice(0, 20)
  const payment = await prisma.payment.findUnique({ where: { ref }, include: { items: true } })
  if (!payment || payment.studentId !== req.user.id) throw notFound('Payment not found.')
  if (payment.status === 'success') return res.json({ payment: paymentOut(payment) })

  const result = await gateway.verify(ref)
  if (!result || result.status === 'initialized') throw new HttpError(409, 'not_charged', 'No payment has been made for this reference yet.')

  const timeline = JSON.parse(payment.timeline)
  if (!timeline.some((t) => t.label === 'Processing at gateway')) timeline.push(step('Processing at gateway'))
  let data

  if (result.status === 'success') {
    // Guard against tampering: the settled amount must match what we asked for.
    if (Math.abs(result.amount - (payment.amount + payment.serviceCharge)) > 0.01) {
      await prisma.payment.update({ where: { id: payment.id }, data: { flagged: true, flagReason: 'Gateway amount mismatch' } })
      audit(req, 'PAYMENT_AMOUNT_MISMATCH', `Transaction: ${ref}`, 'failure')
      log('WARN', 'payments', `Amount mismatch on ${ref}`)
      throw new HttpError(409, 'amount_mismatch', 'Payment amount mismatch. The Bursary has been alerted.')
    }
    timeline.push(step('Confirmed and receipt issued'))
    data = {
      status: 'success',
      receiptNo: ref.replace('SFP', 'RCP'),
      confirmedAt: new Date(),
      verification: payment.method === 'transfer' ? 'unverified' : 'verified',
      gatewayCode: result.code,
      gatewayMessage: result.message,
      authCode: String(100000 + Math.floor(Math.random() * 900000)),
      channel: result.channel,
      last4: result.last4,
      failureReason: null,
    }
  } else if (result.status === 'failed') {
    timeline.push(step('Declined by issuing bank', { error: true }))
    data = { status: 'failed', gatewayCode: result.code, gatewayMessage: result.message, channel: result.channel, last4: result.last4, failureReason: `${result.message} (code ${result.code})` }
  } else {
    if (!timeline.some((t) => t.label === 'Awaiting bank confirmation')) timeline.push({ label: 'Awaiting bank confirmation', at: null, done: false })
    data = { status: 'pending', gatewayCode: result.code, gatewayMessage: result.message, channel: result.channel, last4: result.last4 }
  }

  const updated = await prisma.$transaction(async (tx) => {
    const p = await tx.payment.update({ where: { id: payment.id }, data: { ...data, timeline: JSON.stringify(timeline.filter((t) => data.status !== 'success' || t.done)) }, include: { items: true } })
    if (data.status !== 'pending' && payment.status !== data.status) {
      const total = naira(p.amount + p.serviceCharge)
      await tx.notification.create({
        data: {
          userId: req.user.id,
          type: data.status === 'success' ? 'success' : 'failed',
          title: data.status === 'success' ? `Payment confirmed: ${total}` : `Payment failed: ${total}`,
          body: data.status === 'success' ? `Receipt ${p.receiptNo} is ready to download.` : `${ref} was declined. You were not charged.`,
        },
      })
    }
    return p
  })
  if (data.status === 'success') {
    audit(req, 'PAYMENT_CONFIRMED', `Transaction: ${ref}`)
    sendMail(req.user.email, `Receipt ${updated.receiptNo}`, `We received ${naira(updated.amount + updated.serviceCharge)}. Thank you.`)
  } else if (data.status === 'failed') audit(req, 'PAYMENT_FAILED', `Transaction: ${ref}`, 'failure')
  res.json({ payment: paymentOut(updated) })
})

export default router
