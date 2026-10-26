// Endpoints for the signed-in user's own data. Every query is scoped to req.user.id,
// so one user can never read another user's records (no IDOR).
import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../db.js'
import { parse, rules } from '../middleware/validate.js'
import { requireRole } from '../middleware/auth.js'
import { studentFees } from '../lib/fees.js'
import { paymentOut, notificationOut, publicUser } from '../lib/serialize.js'
import { hashPassword, verifyPassword } from '../lib/crypto.js'
import { revokeAllSessions, describeDevice } from '../lib/session.js'
import { audit } from '../lib/audit.js'
import { badRequest, notFound, HttpError } from '../lib/errors.js'

const router = Router()
const student = requireRole('student')

router.get('/fees', student, async (req, res) => {
  res.json({ fees: await studentFees(req.user) })
})

router.get('/payments', student, async (req, res) => {
  const rows = await prisma.payment.findMany({ where: { studentId: req.user.id }, include: { items: true }, orderBy: { createdAt: 'desc' } })
  res.json({ payments: rows.map((p) => paymentOut(p)) })
})

router.get('/payments/:id', student, async (req, res) => {
  const p = await prisma.payment.findFirst({ where: { id: String(req.params.id), studentId: req.user.id }, include: { items: true } })
  if (!p) throw notFound('Payment not found.')
  if (p.receiptNo) audit(req, 'RECEIPT_VIEWED', `Receipt: ${p.receiptNo}`)
  res.json({ payment: paymentOut(p) })
})

// ---------- Notifications (all roles) ----------
router.get('/notifications', async (req, res) => {
  const rows = await prisma.notification.findMany({ where: { userId: req.user.id }, orderBy: { createdAt: 'desc' }, take: 100 })
  res.json({ notifications: rows.map(notificationOut) })
})

router.patch('/notifications/:id', async (req, res) => {
  const { read } = parse(z.object({ read: z.boolean() }), req.body)
  const { count } = await prisma.notification.updateMany({ where: { id: String(req.params.id), userId: req.user.id }, data: { read } })
  if (!count) throw notFound()
  res.json({ ok: true })
})

router.post('/notifications/read-all', async (req, res) => {
  await prisma.notification.updateMany({ where: { userId: req.user.id, read: false }, data: { read: true } })
  res.json({ ok: true })
})

// ---------- Profile ----------
router.patch('/profile', async (req, res) => {
  const data = parse(z.object({ phone: rules.phone, address: z.string().trim().max(200).optional().default('') }), req.body)
  const user = await prisma.user.update({ where: { id: req.user.id }, data })
  audit(req, 'PROFILE_UPDATED', `User: ${user.email}`)
  res.json({ user: publicUser(user) })
})

const PHOTO_RE = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/
router.put('/photo', async (req, res) => {
  const { photo } = parse(z.object({ photo: z.string().nullable() }), req.body)
  if (photo !== null) {
    if (!PHOTO_RE.test(photo)) throw badRequest('Upload a JPG, PNG or WebP image.')
    const bytes = Math.floor((photo.length - photo.indexOf(',') - 1) * 0.75)
    if (bytes > 2 * 1024 * 1024) throw badRequest('The maximum image size is 2 MB.')
  }
  const user = await prisma.user.update({ where: { id: req.user.id }, data: { photo } })
  res.json({ user: publicUser(user) })
})

router.get('/prefs', async (req, res) => {
  res.json({ prefs: JSON.parse(req.user.notifPrefs || '{}') })
})

router.put('/prefs', async (req, res) => {
  const prefs = parse(
    z.object({ emailReminders: z.boolean(), smsReminders: z.boolean(), emailReceipts: z.boolean(), announcements: z.boolean() }).partial(),
    req.body,
  )
  const merged = { ...JSON.parse(req.user.notifPrefs || '{}'), ...prefs, securityAlerts: true }
  await prisma.user.update({ where: { id: req.user.id }, data: { notifPrefs: JSON.stringify(merged) } })
  res.json({ prefs: merged })
})

// ---------- Security ----------
router.post('/password', async (req, res) => {
  const { current, next } = parse(z.object({ current: z.string().min(1, 'Enter your current password').max(128), next: rules.password }), req.body)
  if (!(await verifyPassword(current, req.user.passwordHash))) {
    audit(req, 'PASSWORD_CHANGE_FAILED', `User: ${req.user.email}`, 'failure')
    throw new HttpError(400, 'wrong_password', 'Your current password is incorrect', { fields: { current: 'Your current password is incorrect' } })
  }
  if (current === next) throw new HttpError(400, 'same_password', 'Choose a password you haven’t used', { fields: { next: 'Your new password must be different from your current one' } })
  await prisma.user.update({ where: { id: req.user.id }, data: { passwordHash: await hashPassword(next) } })
  const revoked = await revokeAllSessions(req.user.id, req.session.id)
  audit(req, 'PASSWORD_CHANGED', `User: ${req.user.email} (${revoked} other sessions ended)`)
  res.json({ ok: true, revoked })
})

router.patch('/2fa', async (req, res) => {
  const { enabled } = parse(z.object({ enabled: z.boolean() }), req.body)
  if (req.user.role !== 'student' && !enabled) throw new HttpError(403, 'required', 'Two-factor authentication is required for staff accounts.')
  const user = await prisma.user.update({ where: { id: req.user.id }, data: { twoFactor: enabled } })
  audit(req, enabled ? '2FA_ENABLED' : '2FA_DISABLED', `User: ${user.email}`)
  res.json({ user: publicUser(user) })
})

router.get('/sessions', async (req, res) => {
  const rows = await prisma.session.findMany({
    where: { userId: req.user.id, revokedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { lastSeenAt: 'desc' },
  })
  res.json({
    sessions: rows.map((s) => ({
      id: s.id,
      device: describeDevice(s.userAgent),
      ip: s.ip?.replace(/(\d+)\.(\d+)$/, 'xx.xx') ?? '—',
      lastActive: s.lastSeenAt,
      createdAt: s.createdAt,
      current: s.id === req.session.id,
    })),
  })
})

router.post('/sessions/revoke-others', async (req, res) => {
  const count = await revokeAllSessions(req.user.id, req.session.id)
  audit(req, 'SESSIONS_REVOKED', `User: ${req.user.email} (${count})`)
  res.json({ ok: true, count })
})

router.get('/activity', async (req, res) => {
  const rows = await prisma.auditLog.findMany({ where: { userId: req.user.id }, orderBy: { id: 'desc' }, take: 12 })
  res.json({ activity: rows.map((r) => ({ id: r.id, action: r.action, target: r.target, result: r.result, at: r.at, ip: r.ip })) })
})

export default router
