import { Router } from 'express'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { z } from 'zod'
import { prisma } from '../../db.js'
import { parse, rules } from '../../middleware/validate.js'
import { requireRole } from '../../middleware/auth.js'
import { audit, verifyChain } from '../../lib/audit.js'
import { recentLogs, log } from '../../lib/logger.js'
import { hashPassword, randomToken } from '../../lib/crypto.js'
import { revokeAllSessions } from '../../lib/session.js'
import { sendMail } from '../../lib/mailer.js'
import { badRequest, conflict, forbidden, notFound } from '../../lib/errors.js'

const router = Router()
const serverDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')
const backupDir = path.join(serverDir, 'backups')

// ---------- Audit log (admin + superadmin, read-only) ----------
router.get('/audit', async (req, res) => {
  const rows = await prisma.auditLog.findMany({ orderBy: { id: 'desc' }, take: 1000 })
  res.json({ logs: rows.map((r) => ({ id: `log-${r.id}`, at: r.at, user: r.userName, role: r.role, action: r.action, target: r.target, ip: r.ip, result: r.result })) })
})

router.get('/audit/verify', async (req, res) => {
  res.json(await verifyChain())
})

// ---------- Users and roles (superadmin only) ----------
const superadmin = requireRole('superadmin')

router.get('/users', superadmin, async (req, res) => {
  const users = await prisma.user.findMany({ where: { role: { in: ['admin', 'superadmin'] } }, orderBy: { createdAt: 'asc' } })
  res.json({ users: users.map((u) => ({ id: u.id, name: u.name, email: u.email, role: u.role, status: u.status === 'active' ? 'active' : 'deactivated', lastLogin: u.lastLoginAt, twoFactor: u.twoFactor })) })
})

router.post('/users', superadmin, async (req, res) => {
  const data = parse(
    z.object({
      name: rules.name,
      email: rules.email.refine((e) => e.endsWith('@kingsgate.edu.ng'), 'Staff accounts must use a @kingsgate.edu.ng email'),
      role: z.enum(['admin', 'superadmin']),
    }),
    req.body,
  )
  if (await prisma.user.findUnique({ where: { email: data.email } })) throw conflict('email_taken', 'This email already has an account', { fields: { email: 'This email already has an account' } })
  const u = await prisma.user.create({ data: { ...data, verified: true, twoFactor: true, passwordHash: await hashPassword(randomToken(24)) } })
  sendMail(u.email, 'You’ve been invited to Kingsgate Fees', 'Use “Forgot password” to set your password.')
  audit(req, 'ADMIN_CREATED', `User: ${u.email} (${u.role})`)
  res.status(201).json({ ok: true })
})

router.patch('/users/:id', superadmin, async (req, res) => {
  const body = parse(z.object({ role: z.enum(['admin', 'superadmin']).optional(), status: z.enum(['active', 'deactivated']).optional() }), req.body)
  const id = String(req.params.id)
  if (id === req.user.id) throw forbidden('You can’t change your own role or status.')
  const target = await prisma.user.findFirst({ where: { id, role: { in: ['admin', 'superadmin'] } } })
  if (!target) throw notFound('User not found.')
  const u = await prisma.user.update({ where: { id }, data: body })
  if (body.status === 'deactivated') await revokeAllSessions(id)
  if (body.role) audit(req, 'ROLE_CHANGED', `User: ${u.email} → ${body.role}`)
  if (body.status) audit(req, body.status === 'active' ? 'ADMIN_ACTIVATED' : 'ADMIN_DEACTIVATED', `User: ${u.email}`)
  res.json({ ok: true })
})

// ---------- System health (superadmin only) ----------
function lastBackup() {
  if (!fs.existsSync(backupDir)) return null
  const files = fs.readdirSync(backupDir).filter((f) => f.endsWith('.db')).sort()
  if (!files.length) return null
  const f = files[files.length - 1]
  const st = fs.statSync(path.join(backupDir, f))
  return { file: f, at: st.mtime, size: st.size }
}

function dbFile() {
  const url = process.env.DATABASE_URL || ''
  if (!url.startsWith('file:')) return null
  return path.resolve(serverDir, 'prisma', url.slice(5))
}

router.get('/system', superadmin, async (req, res) => {
  const started = Date.now()
  await prisma.$queryRaw`SELECT 1`
  const dbLatency = Date.now() - started
  const [events, chain, errors24h, requests] = await Promise.all([
    prisma.systemEvent.findMany({ orderBy: { createdAt: 'desc' }, take: 12 }),
    verifyChain(),
    prisma.systemEvent.count({ where: { severity: { in: ['error', 'critical'] }, createdAt: { gte: new Date(Date.now() - 86_400_000) } } }),
    prisma.auditLog.count({ where: { at: { gte: new Date(Date.now() - 86_400_000) } } }),
  ])
  const file = dbFile()
  const mem = process.memoryUsage()
  res.json({
    uptimeSeconds: Math.round(process.uptime()),
    node: process.version,
    db: { status: 'healthy', latencyMs: dbLatency, engine: file ? 'SQLite (Prisma)' : 'PostgreSQL (Prisma)', sizeBytes: file && fs.existsSync(file) ? fs.statSync(file).size : null },
    memory: { rssMb: Math.round(mem.rss / 1048576), heapUsedMb: Math.round(mem.heapUsed / 1048576), heapTotalMb: Math.round(mem.heapTotal / 1048576) },
    lastBackup: lastBackup(),
    auditChain: chain,
    errors24h,
    events24h: requests,
    events: events.map((e) => ({ id: e.id, at: e.createdAt, severity: e.severity, source: e.source, message: e.message })),
    logs: recentLogs(60),
  })
})

router.post('/system/backup', superadmin, async (req, res) => {
  const file = dbFile()
  if (!file) throw badRequest('Backups for PostgreSQL run through the database host (pg_dump / point-in-time recovery).')
  fs.mkdirSync(backupDir, { recursive: true })
  const name = `backup-${new Date().toISOString().replace(/[:.]/g, '-')}.db`
  // VACUUM INTO writes a consistent snapshot even while the app is running.
  const target = path.join(backupDir, name).replace(/\\/g, '/')
  await prisma.$executeRawUnsafe(`VACUUM INTO '${target.replace(/'/g, "''")}'`)
  const size = fs.statSync(path.join(backupDir, name)).size
  await prisma.systemEvent.create({ data: { severity: 'info', source: 'backup', message: `Manual backup ${name} (${Math.round(size / 1024)} KB) by ${req.user.name}` } })
  log('INFO', 'backup', `Snapshot ${name} written (${size} bytes)`)
  audit(req, 'BACKUP_RUN', `System: ${name}`)
  res.json({ ok: true, backup: lastBackup() })
})

export default router
