import { Router } from 'express'
import { prisma } from '../../db.js'
import { studentBalances, payStatus } from '../../lib/fees.js'
import { paymentOut } from '../../lib/serialize.js'
import { FACULTIES } from '../../lib/constants.js'

const router = Router()
const DAY = 86_400_000

router.get('/', async (req, res) => {
  const days = [7, 30, 90].includes(Number(req.query.range)) ? Number(req.query.range) : 30
  const since = new Date(Date.now() - days * DAY)
  const startOfToday = new Date(new Date().setHours(0, 0, 0, 0))

  const [students, inRange, today, unverified, flagged, blocked, recent] = await Promise.all([
    prisma.user.findMany({ where: { role: 'student' } }),
    prisma.payment.findMany({ where: { createdAt: { gte: since } }, select: { amount: true, method: true, status: true, refunded: true, createdAt: true } }),
    prisma.payment.findMany({ where: { createdAt: { gte: startOfToday }, status: 'success', refunded: false }, select: { amount: true } }),
    prisma.payment.count({ where: { verification: 'unverified' } }),
    prisma.payment.count({ where: { flagged: true } }),
    prisma.auditLog.count({ where: { action: { in: ['LOGIN_FAILED', 'ACCOUNT_LOCKED'] }, at: { gte: new Date(Date.now() - DAY) } } }),
    prisma.payment.findMany({ orderBy: { createdAt: 'desc' }, take: 6, include: { items: true, student: true } }),
  ])

  const balances = await studentBalances(students)
  const byFaculty = Object.fromEntries(Object.keys(FACULTIES).map((f) => [f, { expected: 0, collected: 0 }]))
  const statusCount = { paid: 0, partial: 0, owing: 0 }
  for (const s of students) {
    const b = balances.get(s.id)
    if (byFaculty[s.faculty]) {
      byFaculty[s.faculty].expected += b.total
      byFaculty[s.faculty].collected += b.paid
    }
    statusCount[payStatus(b.total, b.paid)]++
  }
  const expected = Object.values(byFaculty).reduce((a, f) => a + f.expected, 0)
  const collected = Object.values(byFaculty).reduce((a, f) => a + f.collected, 0)

  const ok = inRange.filter((p) => p.status === 'success' && !p.refunded)
  const seriesDays = Math.min(days, 30)
  const series = Array.from({ length: seriesDays }, (_, i) => {
    const d = new Date(Date.now() - (seriesDays - 1 - i) * DAY)
    const key = d.toDateString()
    return {
      day: d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
      amount: ok.filter((p) => p.createdAt.toDateString() === key).reduce((a, p) => a + p.amount, 0),
    }
  })

  res.json({
    expected,
    collected,
    outstanding: expected - collected,
    rate: expected ? Math.round((collected / expected) * 1000) / 10 : 0,
    todayCount: today.length,
    todayAmount: today.reduce((a, p) => a + p.amount, 0),
    failed: inRange.filter((p) => p.status === 'failed').length,
    methodSplit: ['card', 'transfer', 'ussd'].map((m) => ({ m, value: ok.filter((p) => p.method === m).reduce((a, p) => a + p.amount, 0) })),
    statusCount,
    students: students.length,
    unverified,
    flagged,
    blocked,
    series,
    faculty: Object.entries(byFaculty).map(([f, v]) => ({ faculty: f.replace(' Sciences', ' Sci.'), fullName: f, ...v })),
    recent: recent.map((p) => paymentOut(p, { admin: true })),
  })
})

export default router
