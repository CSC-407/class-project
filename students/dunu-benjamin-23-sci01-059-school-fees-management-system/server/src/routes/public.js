import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../db.js'
import { parse, rules } from '../middleware/validate.js'
import { requireAuth } from '../middleware/auth.js'
import { authLimiter } from '../middleware/security.js'
import { audit } from '../lib/audit.js'
import { notFound } from '../lib/errors.js'
import { config } from '../config.js'

const router = Router()

router.get('/health', async (req, res) => {
  await prisma.$queryRaw`SELECT 1`
  res.json({ status: 'ok', uptime: Math.round(process.uptime()), env: config.env })
})

router.get('/config', (req, res) => {
  res.json({ currentSession: config.currentSession, minInstallment: config.minInstallment, serviceChargeRate: config.serviceChargeRate, serviceChargeCap: config.serviceChargeCap, idleMinutes: config.idleMinutes })
})

// Public receipt verification. Personal details are partly masked.
router.get('/receipts/verify/:no', authLimiter, async (req, res) => {
  const no = String(req.params.no).toUpperCase()
  if (!/^RCP-\d{4}-\d{6}$/.test(no)) throw notFound('Receipt not found.')
  const p = await prisma.payment.findUnique({ where: { receiptNo: no }, include: { items: true, student: true } })
  if (!p || p.status !== 'success' || p.refunded) throw notFound('Receipt not found.')
  const [first, ...rest] = p.student.name.split(' ')
  res.json({
    receipt: {
      receiptNo: p.receiptNo,
      ref: p.ref,
      student: [first, ...rest.map((r) => `${r[0]}.`)].join(' '),
      matric: p.student.matric?.replace(/\d{2}$/, '••'),
      amount: p.amount,
      date: p.confirmedAt || p.createdAt,
      description: p.items.map((i) => i.name).join(', '),
    },
  })
})

router.post('/contact', authLimiter, async (req, res) => {
  const data = parse(
    z.object({
      name: z.string().trim().min(1, 'Enter your name').max(80),
      email: rules.email,
      topic: z.string().trim().min(1, 'Choose a topic').max(60),
      message: z.string().trim().min(10, 'Tell us a bit more (at least 10 characters)').max(2000),
    }),
    req.body,
  )
  const ticket = `TKT-${Date.now().toString().slice(-6)}`
  await prisma.contactMessage.create({ data: { ...data, ticket } })
  res.status(201).json({ ok: true, ticket })
})

// The client reports route-level denials (e.g. a student opening an admin page).
router.post('/audit/client-denied', requireAuth, async (req, res) => {
  const { path } = parse(z.object({ path: z.string().max(200) }), req.body)
  audit(req, 'ACCESS_DENIED', `Route: ${path}`, 'failure')
  res.json({ ok: true })
})

export default router
