import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../../db.js'
import { parse } from '../../middleware/validate.js'
import { studentBalances } from '../../lib/fees.js'
import { audit } from '../../lib/audit.js'
import { FACULTIES } from '../../lib/constants.js'

const router = Router()
const TITLES = { daily: 'Daily collection', faculty: 'Collection per faculty', fee: 'Collection per fee item', debtors: 'Debtors list', recon: 'Reconciliation' }

router.get('/history', async (req, res) => {
  const rows = await prisma.reportLog.findMany({ orderBy: { createdAt: 'desc' }, take: 20 })
  res.json({ history: rows.map((r) => ({ id: r.id, report: r.report, range: r.range, format: r.format, rows: r.rows, by: r.byName, at: r.createdAt, status: 'success' })) })
})

router.post('/:type', async (req, res) => {
  const { type } = parse(z.object({ type: z.enum(Object.keys(TITLES), { message: 'Unknown report type' }) }), req.params)
  const { from, to, format } = parse(z.object({ from: z.coerce.date(), to: z.coerce.date(), format: z.enum(['pdf', 'csv', 'excel']) }), req.body)
  const end = new Date(to)
  end.setHours(23, 59, 59, 999)
  const where = { createdAt: { gte: from, lte: end } }
  let rows = []

  if (type === 'daily' || type === 'fee' || type === 'recon') {
    const payments = await prisma.payment.findMany({ where, include: { items: true }, orderBy: { createdAt: 'desc' } })
    const ok = payments.filter((p) => p.status === 'success' && !p.refunded)
    if (type === 'daily') {
      const by = {}
      for (const p of ok) {
        const k = p.createdAt.toISOString().slice(0, 10)
        by[k] ||= { Date: k, Transactions: 0, Card: 0, Transfer: 0, USSD: 0, Total: 0 }
        by[k].Transactions++
        by[k][{ card: 'Card', transfer: 'Transfer', ussd: 'USSD' }[p.method]] += p.amount
        by[k].Total += p.amount
      }
      rows = Object.values(by)
    } else if (type === 'fee') {
      const by = {}
      for (const p of ok) for (const i of p.items) {
        const k = i.name.replace(' (part payment)', '')
        by[k] ||= { 'Fee item': k, Payments: 0, Total: 0 }
        by[k].Payments++
        by[k].Total += i.amount
      }
      rows = Object.values(by).sort((a, b) => b.Total - a.Total)
    } else {
      rows = payments.map((p) => ({
        Reference: p.ref,
        Date: p.createdAt.toISOString().slice(0, 10),
        Amount: p.amount,
        'Gateway status': p.refunded ? 'refunded' : p.status,
        'Bank settled': p.status === 'success' ? (p.verification === 'verified' ? 'Yes' : 'Pending') : 'No',
        Match: p.flagged ? 'Flagged' : p.status === 'success' && p.verification !== 'verified' ? 'Check' : 'OK',
      }))
    }
  } else {
    const students = await prisma.user.findMany({ where: { role: 'student' }, orderBy: { name: 'asc' } })
    const balances = await studentBalances(students)
    if (type === 'faculty') {
      rows = Object.keys(FACULTIES).map((f) => {
        const list = students.filter((s) => s.faculty === f)
        const expected = list.reduce((a, s) => a + balances.get(s.id).total, 0)
        const collected = list.reduce((a, s) => a + balances.get(s.id).paid, 0)
        return { Faculty: f, Students: list.length, Expected: expected, Collected: collected, Outstanding: expected - collected, 'Rate %': expected ? Math.round((collected / expected) * 1000) / 10 : 0 }
      })
    } else {
      rows = students
        .filter((s) => balances.get(s.id).total > balances.get(s.id).paid)
        .map((s) => ({ Name: s.name, Matric: s.matric, Faculty: s.faculty, Department: s.department, Level: s.level, Total: balances.get(s.id).total, Paid: balances.get(s.id).paid, Balance: balances.get(s.id).total - balances.get(s.id).paid }))
    }
  }

  const range = `${from.toISOString().slice(0, 10)} to ${to.toISOString().slice(0, 10)}`
  if (rows.length) {
    await prisma.reportLog.create({ data: { report: TITLES[type], range, format, rows: rows.length, byName: req.user.name } })
    audit(req, 'REPORT_EXPORTED', `Report: ${TITLES[type]} (${format.toUpperCase()}, ${rows.length} rows)`)
  }
  res.json({ title: TITLES[type], range, rows })
})

export default router
