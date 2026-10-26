import { prisma } from '../db.js'
import { config } from '../config.js'

export function serviceCharge(amount) {
  return Math.min(Math.round(amount * config.serviceChargeRate * 100) / 100, config.serviceChargeCap)
}

export const applies = (fee, s) =>
  (fee.faculty === 'All' || fee.faculty === s.faculty) &&
  (fee.department === 'All' || fee.department === s.department) &&
  (fee.level === 'All' || fee.level === s.level)

/** Map of `${studentId}:${feeItemId}` to amount paid (successful, non-refunded payments only). */
export async function paidMap(studentIds) {
  const items = await prisma.paymentItem.findMany({
    where: { payment: { status: 'success', refunded: false, ...(studentIds ? { studentId: { in: studentIds } } : {}) } },
    select: { feeItemId: true, amount: true, payment: { select: { studentId: true } } },
  })
  const map = new Map()
  for (const i of items) {
    const k = `${i.payment.studentId}:${i.feeItemId}`
    map.set(k, (map.get(k) || 0) + i.amount)
  }
  return map
}

function feesFor(student, feeItems, paid) {
  return feeItems
    .filter((f) => applies(f, student))
    .map((f) => ({
      id: f.id,
      name: f.name,
      category: f.category,
      session: f.session,
      semester: f.semester,
      amount: f.amount,
      paid: Math.min(f.amount, paid.get(`${student.id}:${f.id}`) || 0),
      dueDate: f.dueDate,
      installments: f.installments,
      minInstallment: f.minInstallment,
      mandatory: f.mandatory,
      status: f.status,
    }))
    .filter((f) => f.status === 'published' || f.paid > 0)
}

export async function studentFees(student) {
  const [feeItems, paid] = await Promise.all([
    prisma.feeItem.findMany({ where: { status: { in: ['published', 'archived'] } }, orderBy: { dueDate: 'asc' } }),
    paidMap([student.id]),
  ])
  return feesFor(student, feeItems, paid)
}

/** Current-session totals for many students at once (admin lists, dashboards). */
export async function studentBalances(students) {
  const [feeItems, paid] = await Promise.all([
    prisma.feeItem.findMany({ where: { session: config.currentSession, status: { in: ['published', 'archived'] } } }),
    paidMap(),
  ])
  return new Map(
    students.map((s) => {
      const fees = feesFor(s, feeItems, paid)
      const now = new Date()
      const overdue = fees.filter((f) => f.amount - f.paid > 0 && f.dueDate < now).map((f) => f.dueDate.getTime())
      return [s.id, { total: fees.reduce((a, f) => a + f.amount, 0), paid: fees.reduce((a, f) => a + f.paid, 0), overdueSince: overdue.length ? new Date(Math.min(...overdue)) : null }]
    }),
  )
}

export function payStatus(total, paid) {
  if (paid >= total) return 'paid'
  if (paid > 0) return 'partial'
  return 'owing'
}

export async function countAffected(fee) {
  return prisma.user.count({
    where: {
      role: 'student',
      ...(fee.faculty !== 'All' && { faculty: fee.faculty }),
      ...(fee.department !== 'All' && { department: fee.department }),
      ...(fee.level !== 'All' && { level: fee.level }),
    },
  })
}
