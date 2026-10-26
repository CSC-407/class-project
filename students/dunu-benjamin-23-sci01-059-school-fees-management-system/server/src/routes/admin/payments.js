import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../../db.js'
import { parse } from '../../middleware/validate.js'
import { paymentOut } from '../../lib/serialize.js'
import { audit } from '../../lib/audit.js'
import { sendMail } from '../../lib/mailer.js'
import { badRequest, notFound } from '../../lib/errors.js'

const router = Router()
const include = { items: true, student: true }
const naira = (n) => `₦${Number(n).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`
const step = (label) => ({ label, at: new Date().toISOString(), done: true })

router.get('/', async (req, res) => {
  const rows = await prisma.payment.findMany({ include, orderBy: { createdAt: 'desc' }, take: 2000 })
  res.json({ payments: rows.map((p) => paymentOut(p, { admin: true })) })
})

async function load(id) {
  const p = await prisma.payment.findUnique({ where: { id: String(id) }, include })
  if (!p) throw notFound('Transaction not found.')
  return p
}

async function update(p, data, label) {
  const timeline = JSON.parse(p.timeline)
  if (label) timeline.push(step(label))
  const u = await prisma.payment.update({ where: { id: p.id }, data: { ...data, timeline: JSON.stringify(timeline) }, include })
  return paymentOut(u, { admin: true })
}

router.post('/:id/verify', async (req, res) => {
  const p = await load(req.params.id)
  if (p.status !== 'success') throw badRequest('Only successful payments can be verified.')
  const out = await update(p, { verification: 'verified' }, `Manually verified by ${req.user.name}`)
  audit(req, 'PAYMENT_VERIFIED', `Transaction: ${p.ref}`)
  res.json({ payment: out })
})

router.post('/:id/flag', async (req, res) => {
  const { reason } = parse(z.object({ reason: z.string().trim().min(1, 'Give a reason for flagging').max(300) }), req.body)
  const p = await load(req.params.id)
  const flagged = !p.flagged
  const out = await update(p, { flagged, flagReason: flagged ? reason : null }, flagged ? `Flagged: ${reason.slice(0, 60)}` : `Flag removed: ${reason.slice(0, 60)}`)
  audit(req, flagged ? 'PAYMENT_FLAGGED' : 'PAYMENT_UNFLAGGED', `Transaction: ${p.ref} (${reason.slice(0, 60)})`)
  res.json({ payment: out })
})

router.post('/:id/refund', async (req, res) => {
  const { reason } = parse(z.object({ reason: z.string().trim().min(10, 'Explain the refund (at least 10 characters)').max(300) }), req.body)
  const p = await load(req.params.id)
  if (p.status !== 'success' || p.refunded) throw badRequest('This payment can’t be refunded.')
  // A refunded payment stops counting towards the student's balance.
  const out = await update(p, { refunded: true, refundReason: reason }, `Refund issued: ${reason.slice(0, 50)}`)
  await prisma.notification.create({ data: { userId: p.studentId, type: 'announcement', title: `Refund issued: ${naira(p.amount)}`, body: `${p.ref} was refunded to your original payment method.` } })
  audit(req, 'PAYMENT_REFUNDED', `Transaction: ${p.ref}`)
  res.json({ payment: out })
})

router.post('/:id/resend', async (req, res) => {
  const p = await load(req.params.id)
  if (!p.receiptNo) throw badRequest('This payment has no receipt.')
  sendMail(p.student.email, `Receipt ${p.receiptNo}`, `Your receipt for ${naira(p.amount)}.`)
  audit(req, 'RECEIPT_RESENT', `Transaction: ${p.ref}`)
  res.json({ ok: true })
})

export default router
