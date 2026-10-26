import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../../db.js'
import { parse, rules } from '../../middleware/validate.js'
import { studentBalances, payStatus } from '../../lib/fees.js'
import { paymentOut } from '../../lib/serialize.js'
import { hashPassword, randomToken, sha256 } from '../../lib/crypto.js'
import { revokeAllSessions } from '../../lib/session.js'
import { audit } from '../../lib/audit.js'
import { sendMail } from '../../lib/mailer.js'
import { FACULTIES } from '../../lib/constants.js'
import { conflict, notFound } from '../../lib/errors.js'

const router = Router()

const studentOut = (s, b) => ({
  id: s.id,
  name: s.name,
  matric: s.matric,
  email: s.email,
  phone: s.phone,
  faculty: s.faculty,
  department: s.department,
  level: s.level,
  account: s.status,
  joined: s.createdAt,
  total: b?.total ?? 0,
  paid: b?.paid ?? 0,
  pay: payStatus(b?.total ?? 0, b?.paid ?? 0),
  overdueSince: b?.overdueSince ?? null,
})

const studentSchema = z
  .object({
    name: rules.name,
    matric: rules.matric,
    email: rules.email,
    phone: z.union([rules.phone, z.literal('')]).optional(),
    faculty: z.enum(Object.keys(FACULTIES), { message: 'Select a faculty' }),
    department: z.string().min(1, 'Select a department'),
    level: rules.level,
  })
  .refine((d) => FACULTIES[d.faculty]?.includes(d.department), { message: 'Department doesn’t belong to that faculty', path: ['department'] })

router.get('/', async (req, res) => {
  const students = await prisma.user.findMany({ where: { role: 'student' }, orderBy: { name: 'asc' } })
  const balances = await studentBalances(students)
  res.json({ students: students.map((s) => studentOut(s, balances.get(s.id))) })
})

router.get('/:id', async (req, res) => {
  const s = await prisma.user.findFirst({ where: { id: String(req.params.id), role: 'student' } })
  if (!s) throw notFound('Student not found.')
  const [balances, payments, notes, activity] = await Promise.all([
    studentBalances([s]),
    prisma.payment.findMany({ where: { studentId: s.id }, include: { items: true, student: true }, orderBy: { createdAt: 'desc' } }),
    prisma.studentNote.findMany({ where: { studentId: s.id }, orderBy: { createdAt: 'desc' } }),
    prisma.auditLog.findMany({ where: { userId: s.id }, orderBy: { id: 'desc' }, take: 10 }),
  ])
  res.json({
    student: studentOut(s, balances.get(s.id)),
    payments: payments.map((p) => paymentOut(p, { admin: true })),
    notes: notes.map((n) => ({ id: n.id, text: n.text, by: n.byName, at: n.createdAt })),
    activity: activity.map((a) => ({ text: `${a.action.replaceAll('_', ' ').toLowerCase()} · ${a.target}`, at: a.at, result: a.result })),
  })
})

async function createStudent(data) {
  // New accounts get an unusable random password and must set their own via the reset link.
  return prisma.user.create({
    data: { ...data, phone: data.phone || null, role: 'student', verified: true, passwordHash: await hashPassword(randomToken(24)) },
  })
}

router.post('/', async (req, res) => {
  const data = parse(studentSchema, req.body)
  if (await prisma.user.findUnique({ where: { matric: data.matric } })) throw conflict('matric_taken', 'A student with this matric number already exists', { fields: { matric: 'A student with this matric number already exists' } })
  if (await prisma.user.findUnique({ where: { email: data.email } })) throw conflict('email_taken', 'This email is already registered')
  const s = await createStudent(data)
  audit(req, 'STUDENT_CREATED', `Student: ${s.matric}`)
  sendMail(s.email, 'Your Kingsgate Fees account', 'An account was created for you. Use “Forgot password” to set your password.')
  res.status(201).json({ student: studentOut(s) })
})

router.patch('/:id', async (req, res) => {
  const data = parse(studentSchema, req.body)
  const id = String(req.params.id)
  const clash = await prisma.user.findFirst({ where: { OR: [{ matric: data.matric }, { email: data.email }], NOT: { id } } })
  if (clash) throw conflict('duplicate', 'Another account already uses this matric number or email', { fields: { matric: 'Another student has this matric number' } })
  const s = await prisma.user.update({ where: { id }, data: { ...data, phone: data.phone || null } })
  audit(req, 'STUDENT_UPDATED', `Student: ${s.matric}`)
  res.json({ student: studentOut(s) })
})

router.post('/import', async (req, res) => {
  const { rows } = parse(z.object({ rows: z.array(z.record(z.string(), z.string())).min(1).max(500) }), req.body)
  const results = []
  for (const [i, raw] of rows.entries()) {
    const r = studentSchema.safeParse(raw)
    if (!r.success) {
      results.push({ line: i + 2, ok: false, errors: [...new Set(r.error.issues.map((x) => x.message))] })
      continue
    }
    const dup = await prisma.user.findFirst({ where: { OR: [{ matric: r.data.matric }, { email: r.data.email }] } })
    if (dup) {
      results.push({ line: i + 2, ok: false, errors: ['Duplicate matric number or email'] })
      continue
    }
    await createStudent(r.data)
    results.push({ line: i + 2, ok: true })
  }
  const imported = results.filter((r) => r.ok).length
  audit(req, 'STUDENTS_IMPORTED', `Student: ${imported} of ${rows.length} rows`)
  res.json({ imported, skipped: rows.length - imported, results })
})

router.post('/bulk', async (req, res) => {
  const { ids, action } = parse(z.object({ ids: z.array(z.string().max(40)).min(1).max(500), action: z.enum(['suspend', 'activate', 'remind']) }), req.body)
  const where = { id: { in: ids }, role: 'student' }
  if (action === 'remind') {
    const students = await prisma.user.findMany({ where })
    const balances = await studentBalances(students)
    const owing = students.filter((s) => balances.get(s.id).total > balances.get(s.id).paid)
    await prisma.notification.createMany({
      data: owing.map((s) => ({ userId: s.id, type: 'reminder', title: 'Reminder: you have outstanding fees', body: `Your outstanding balance is ₦${(balances.get(s.id).total - balances.get(s.id).paid).toLocaleString('en-NG', { minimumFractionDigits: 2 })}. Please pay to avoid restrictions.` })),
    })
    owing.forEach((s) => sendMail(s.email, 'Outstanding fees reminder', 'You have an outstanding balance.'))
    audit(req, 'REMINDER_SENT', `Student: ${owing.length} recipients`)
    return res.json({ ok: true, count: owing.length })
  }
  const status = action === 'suspend' ? 'suspended' : 'active'
  const { count } = await prisma.user.updateMany({ where, data: { status } })
  if (action === 'suspend') for (const id of ids) await revokeAllSessions(id)
  audit(req, action === 'suspend' ? 'STUDENT_SUSPENDED' : 'STUDENT_ACTIVATED', `Student: ${count} accounts`)
  res.json({ ok: true, count })
})

router.post('/:id/notes', async (req, res) => {
  const { text } = parse(z.object({ text: z.string().trim().min(1, 'Write a note').max(500) }), req.body)
  const s = await prisma.user.findFirst({ where: { id: String(req.params.id), role: 'student' } })
  if (!s) throw notFound('Student not found.')
  // Stored as plain text and rendered as text by React, so markup is harmless.
  const n = await prisma.studentNote.create({ data: { studentId: s.id, text, byName: req.user.name } })
  audit(req, 'NOTE_ADDED', `Student: ${s.matric}`)
  res.status(201).json({ note: { id: n.id, text: n.text, by: n.byName, at: n.createdAt } })
})

router.post('/:id/reset-password', async (req, res) => {
  const s = await prisma.user.findFirst({ where: { id: String(req.params.id), role: 'student' } })
  if (!s) throw notFound('Student not found.')
  const token = randomToken(32)
  await prisma.token.create({ data: { userId: s.id, type: 'reset_password', tokenHash: sha256(token), expiresAt: new Date(Date.now() + 30 * 60_000) } })
  sendMail(s.email, 'Reset your password', `Open /reset-password?token=${token}`)
  audit(req, 'PASSWORD_RESET', `Student: ${s.matric} (link sent by admin)`)
  res.json({ ok: true })
})

export default router
