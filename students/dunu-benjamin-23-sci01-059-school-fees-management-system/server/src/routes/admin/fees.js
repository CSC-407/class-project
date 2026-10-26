import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../../db.js'
import { parse } from '../../middleware/validate.js'
import { countAffected } from '../../lib/fees.js'
import { audit } from '../../lib/audit.js'
import { FACULTIES, LEVELS, SESSIONS, SEMESTERS } from '../../lib/constants.js'
import { notFound } from '../../lib/errors.js'

const router = Router()
const naira = (n) => `₦${Number(n).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`

const feeSchema = z
  .object({
    name: z.string().trim().min(3, 'Enter a fee name (at least 3 characters)').max(80),
    category: z.string().trim().max(40).optional().default('General'),
    amount: z.number({ message: 'Enter an amount' }).positive('Amount must be greater than zero').max(10_000_000, 'Amount looks too high. Check the figure.'),
    faculty: z.enum(['All', ...Object.keys(FACULTIES)]),
    department: z.string().max(60),
    level: z.enum(['All', ...LEVELS]),
    session: z.enum(SESSIONS),
    semester: z.enum(SEMESTERS),
    dueDate: z.coerce.date({ message: 'Choose a due date' }),
    installments: z.boolean(),
    minInstallment: z.number().min(0).default(0),
    mandatory: z.boolean(),
    publish: z.boolean().default(false),
  })
  .refine((f) => f.department === 'All' || FACULTIES[f.faculty]?.includes(f.department), { message: 'Department doesn’t belong to that faculty', path: ['department'] })
  .refine((f) => !f.installments || (f.minInstallment > 0 && f.minInstallment < f.amount), { message: 'Minimum installment must be above zero and less than the amount', path: ['minInstallment'] })

async function feeOut(f) {
  return { ...f, affected: await countAffected(f) }
}

router.get('/', async (req, res) => {
  const fees = await prisma.feeItem.findMany({ orderBy: [{ session: 'desc' }, { dueDate: 'asc' }] })
  res.json({ fees: await Promise.all(fees.map(feeOut)) })
})

// Preview how many students a fee would apply to (for the confirmation dialog).
router.post('/impact', async (req, res) => {
  const f = parse(z.object({ faculty: z.string(), department: z.string(), level: z.string() }), req.body)
  res.json({ affected: await countAffected(f) })
})

router.post('/', async (req, res) => {
  const { publish, ...data } = parse(feeSchema, req.body)
  const fee = await prisma.feeItem.create({
    data: {
      ...data,
      minInstallment: data.installments ? data.minInstallment : 0,
      status: publish ? 'published' : 'draft',
      versions: { create: { version: 1, snapshot: JSON.stringify(data), change: `Created at ${naira(data.amount)}`, byName: req.user.name } },
    },
  })
  audit(req, publish ? 'FEE_PUBLISHED' : 'FEE_DRAFTED', `Fee structure: ${fee.name}`)
  res.status(201).json({ fee: await feeOut(fee) })
})

router.patch('/:id', async (req, res) => {
  const { publish, ...data } = parse(feeSchema, req.body)
  const old = await prisma.feeItem.findUnique({ where: { id: String(req.params.id) } })
  if (!old) throw notFound('Fee not found.')
  const changes = []
  if (old.amount !== data.amount) changes.push(`Amount ${naira(old.amount)} → ${naira(data.amount)}`)
  if (old.dueDate.getTime() !== data.dueDate.getTime()) changes.push('Due date changed')
  if (old.name !== data.name) changes.push(`Renamed from “${old.name}”`)
  const version = old.version + 1
  const fee = await prisma.feeItem.update({
    where: { id: old.id },
    data: {
      ...data,
      minInstallment: data.installments ? data.minInstallment : 0,
      status: publish ? 'published' : old.status === 'published' ? 'published' : 'draft',
      version,
      versions: { create: { version, snapshot: JSON.stringify(data), change: changes.join('; ') || 'Details updated', byName: req.user.name } },
    },
  })
  audit(req, 'FEE_UPDATED', `Fee structure: ${fee.name} (v${version})`)
  res.json({ fee: await feeOut(fee) })
})

router.post('/:id/publish', async (req, res) => {
  const fee = await prisma.feeItem.update({ where: { id: String(req.params.id) }, data: { status: 'published' } })
  audit(req, 'FEE_PUBLISHED', `Fee structure: ${fee.name}`)
  res.json({ fee: await feeOut(fee) })
})

router.post('/:id/archive', async (req, res) => {
  const fee = await prisma.feeItem.update({ where: { id: String(req.params.id) }, data: { status: 'archived' } })
  audit(req, 'FEE_ARCHIVED', `Fee structure: ${fee.name}`)
  res.json({ fee: await feeOut(fee) })
})

router.post('/:id/duplicate', async (req, res) => {
  const f = await prisma.feeItem.findUnique({ where: { id: String(req.params.id) } })
  if (!f) throw notFound('Fee not found.')
  const { id, createdAt, updatedAt, version, status, ...rest } = f // eslint-disable-line no-unused-vars
  const copy = await prisma.feeItem.create({
    data: { ...rest, name: `${f.name} (copy)`, status: 'draft', versions: { create: { version: 1, snapshot: JSON.stringify(rest), change: `Duplicated from “${f.name}”`, byName: req.user.name } } },
  })
  audit(req, 'FEE_DUPLICATED', `Fee structure: ${f.name}`)
  res.status(201).json({ fee: await feeOut(copy) })
})

router.get('/:id/history', async (req, res) => {
  const versions = await prisma.feeVersion.findMany({ where: { feeItemId: String(req.params.id) }, orderBy: { version: 'desc' } })
  res.json({ versions: versions.map((v) => ({ v: v.version, change: v.change, by: v.byName, at: v.createdAt })) })
})

export default router
