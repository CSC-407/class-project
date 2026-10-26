// Seeds the database with demo accounts, fee structures, students, payments and an
// audit trail. Deterministic: the same data is produced on every run.
import { prisma } from '../src/db.js'
import { hashPassword, randomToken } from '../src/lib/crypto.js'
import { digest } from '../src/lib/audit.js'
import { applies, serviceCharge } from '../src/lib/fees.js'
import { FACULTIES } from '../src/lib/constants.js'

// ---------- Seeded RNG ----------
function mulberry32(seed) {
  return () => {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const rand = mulberry32(407)
const pick = (arr) => arr[Math.floor(rand() * arr.length)]
const between = (a, b) => Math.floor(a + rand() * (b - a + 1))
const DAY = 86_400_000
const daysAgo = (d, h = 10, m = 0) => {
  const date = new Date(Date.now() - d * DAY)
  date.setHours(h, m, 0, 0)
  return date
}
const ref = (n) => `SFP-2026-${String(n).padStart(6, '0')}`

async function main() {
  console.log('Seeding database…')
  const t0 = Date.now()

  // ---------- Accounts ----------
  const [studentPw, adminPw, superPw, unusable] = await Promise.all([hashPassword('Student@123'), hashPassword('Admin@123'), hashPassword('Super@123'), hashPassword(randomToken(24))])

  const chinedu = await prisma.user.create({
    data: {
      role: 'student', name: 'Chinedu Okafor', matric: '21/0345', email: 'chinedu.okafor@students.kingsgate.edu.ng', phone: '08034127788',
      faculty: 'Engineering', department: 'Computer Engineering', level: '400', address: '14 Adeniran Close, Yaba, Lagos',
      passwordHash: studentPw, verified: true, createdAt: daysAgo(900), lastLoginAt: daysAgo(2, 18, 24),
    },
  })
  const aisha = await prisma.user.create({
    data: { role: 'admin', name: 'Aisha Bello', email: 'bursar@kingsgate.edu.ng', staffId: 'KGU/BUR/0112', title: 'Senior Finance Officer', phone: '08123304410', passwordHash: adminPw, verified: true, twoFactor: true, lastLoginAt: daysAgo(1, 7, 45) },
  })
  const tunde = await prisma.user.create({
    data: { role: 'superadmin', name: 'Tunde Adeyemi', email: 'sysadmin@kingsgate.edu.ng', staffId: 'KGU/ICT/0007', title: 'System Administrator', phone: '07051189021', passwordHash: superPw, verified: true, twoFactor: true, lastLoginAt: daysAgo(1, 8, 2) },
  })
  const musa = await prisma.user.create({ data: { role: 'admin', name: 'Musa Garba', email: 'm.garba@kingsgate.edu.ng', staffId: 'KGU/BUR/0140', title: 'Finance Officer', passwordHash: unusable, verified: true, twoFactor: true, lastLoginAt: daysAgo(1, 16, 12) } })
  await prisma.user.create({ data: { role: 'admin', name: 'Funmilayo Adebayo', email: 'f.adebayo@kingsgate.edu.ng', staffId: 'KGU/BUR/0151', title: 'Accounts Officer', passwordHash: unusable, verified: true, twoFactor: true, lastLoginAt: daysAgo(3, 10, 30) } })
  await prisma.user.create({ data: { role: 'admin', name: 'Kelechi Ibekwe', email: 'k.ibekwe@kingsgate.edu.ng', staffId: 'KGU/BUR/0098', passwordHash: unusable, verified: true, twoFactor: false, status: 'deactivated', lastLoginAt: daysAgo(64) } })

  // ---------- Fee structures ----------
  const F = {}
  const fee = async (key, data, extraVersions = []) => {
    const f = await prisma.feeItem.create({ data: { status: 'published', ...data, version: 1 + extraVersions.length } })
    const versions = [{ version: 1, change: `Created at ₦${data.amount.toLocaleString('en-NG')}.00`, byName: 'Aisha Bello', createdAt: daysAgo(200) }, ...extraVersions.map((e, i) => ({ version: i + 2, byName: 'Musa Garba', createdAt: daysAgo(150 - i * 40), ...e }))]
    await prisma.feeVersion.createMany({ data: versions.map((v) => ({ feeItemId: f.id, snapshot: JSON.stringify(data), ...v })) })
    F[key] = f
  }
  const S = '2025/2026'
  await fee('tuition1', { name: 'Tuition fee (First Semester)', category: 'Tuition', amount: 425000, session: S, semester: 'First Semester', dueDate: daysAgo(130, 23, 59), installments: true, minInstallment: 50000 }, [{ change: 'Amount ₦400,000.00 → ₦425,000.00' }, { change: 'Due date changed' }])
  await fee('engSurcharge', { name: 'Engineering laboratory levy', category: 'Tuition', amount: 75000, faculty: 'Engineering', session: S, semester: 'First Semester', dueDate: daysAgo(130, 23, 59), installments: true, minInstallment: 25000 })
  await fee('hostel', { name: 'Hostel accommodation', category: 'Accommodation', amount: 120000, session: S, semester: 'First Semester', dueDate: daysAgo(9, 23, 59), installments: true, minInstallment: 30000, mandatory: false }, [{ change: 'Amount ₦110,000.00 → ₦120,000.00' }])
  await fee('library', { name: 'Library fee', category: 'Services', amount: 15000, session: S, semester: 'First Semester', dueDate: daysAgo(120, 23, 59) })
  await fee('medical', { name: 'Medical and health', category: 'Services', amount: 25000, session: S, semester: 'First Semester', dueDate: daysAgo(120, 23, 59) })
  await fee('sports', { name: 'Sports and recreation', category: 'Services', amount: 10000, session: S, semester: 'First Semester', dueDate: daysAgo(-14, 23, 59) })
  await fee('acceptance', { name: 'Acceptance fee', category: 'Admission', amount: 50000, level: '100', session: S, semester: 'First Semester', dueDate: daysAgo(210, 23, 59) })
  await fee('tuition2', { name: 'Tuition fee (Second Semester)', category: 'Tuition', amount: 425000, session: S, semester: 'Second Semester', dueDate: daysAgo(-21, 23, 59), installments: true, minInstallment: 50000 }, [{ change: 'Amount ₦400,000.00 → ₦425,000.00' }])
  await fee('ceDues', { name: 'Departmental dues', category: 'Departmental', amount: 12500, faculty: 'Engineering', department: 'Computer Engineering', session: S, semester: 'Second Semester', dueDate: daysAgo(-30, 23, 59) })
  await fee('ict', { name: 'ICT and e-learning', category: 'Services', amount: 20000, session: S, semester: 'Second Semester', dueDate: daysAgo(-30, 23, 59) })
  await fee('exams', { name: 'Examination and results', category: 'Academic', amount: 15000, session: S, semester: 'Second Semester', dueDate: daysAgo(-45, 23, 59) })
  await fee('lawLevy', { name: 'Law School preparatory levy', category: 'Academic', amount: 35000, faculty: 'Law', level: '500', session: S, semester: 'Second Semester', dueDate: daysAgo(-60, 23, 59), status: 'draft' })
  const P = '2024/2025'
  await fee('oldTuition1', { name: 'Tuition fee (First Semester)', category: 'Tuition', amount: 400000, session: P, semester: 'First Semester', dueDate: daysAgo(480, 23, 59), installments: true, minInstallment: 50000, status: 'archived' })
  await fee('oldHostel', { name: 'Hostel accommodation', category: 'Accommodation', amount: 110000, session: P, semester: 'First Semester', dueDate: daysAgo(470, 23, 59), installments: true, minInstallment: 30000, mandatory: false, status: 'archived' })
  await fee('oldLibrary', { name: 'Library fee', category: 'Services', amount: 15000, session: P, semester: 'First Semester', dueDate: daysAgo(470, 23, 59), status: 'archived' })
  await fee('oldTuition2', { name: 'Tuition fee (Second Semester)', category: 'Tuition', amount: 400000, session: P, semester: 'Second Semester', dueDate: daysAgo(330, 23, 59), installments: true, minInstallment: 50000, status: 'archived' })
  await fee('oldDues', { name: 'Departmental dues', category: 'Departmental', amount: 10000, session: P, semester: 'Second Semester', dueDate: daysAgo(320, 23, 59), status: 'archived' })

  // ---------- Payments helper ----------
  const payment = async ({ n, student, date, items, method, status, session = S, verification, flagged = false }) => {
    const amount = items.reduce((s, i) => s + i.amount, 0)
    const last4 = method === 'card' ? pick(['4081', '5399', '0021', '7714', '3321']) : null
    const t = date.getTime()
    const timeline = [
      { label: 'Payment initiated', at: new Date(t).toISOString(), done: true },
      { label: 'Processing at gateway', at: new Date(t + 20000).toISOString(), done: true },
      status === 'success'
        ? { label: 'Confirmed and receipt issued', at: new Date(t + 45000).toISOString(), done: true }
        : status === 'failed'
          ? { label: 'Declined by issuing bank', at: new Date(t + 40000).toISOString(), done: true, error: true }
          : { label: 'Awaiting bank confirmation', at: null, done: false },
    ]
    const failed = pick([['51', 'Insufficient funds'], ['05', 'Do not honour'], ['91', 'Issuer unavailable']])
    await prisma.payment.create({
      data: {
        ref: ref(n),
        receiptNo: status === 'success' ? ref(n).replace('SFP', 'RCP') : null,
        studentId: student.id,
        amount,
        serviceCharge: serviceCharge(amount),
        method,
        last4,
        status,
        session,
        verification: verification || (status === 'success' ? (method === 'transfer' && Date.now() - t < 3 * DAY ? 'unverified' : 'verified') : status === 'pending' ? 'unverified' : 'n/a'),
        flagged,
        flagReason: flagged ? 'Multiple cards used from the same IP within minutes' : null,
        failureReason: status === 'failed' ? `${failed[1]} (code ${failed[0]})` : null,
        gatewayCode: status === 'success' ? '00' : status === 'failed' ? failed[0] : '09',
        gatewayMessage: status === 'success' ? 'Approved' : status === 'failed' ? failed[1] : 'Transaction pending at bank',
        authCode: status === 'success' ? String(between(100000, 999999)) : null,
        channel: method === 'card' ? `Card ****${last4}` : method === 'transfer' ? `Bank transfer · ${pick(['GTBank', 'Access', 'Zenith', 'UBA', 'First Bank'])}` : `USSD · *${pick(['737', '901', '894'])}#`,
        ip: `102.89.${between(1, 254)}.${between(1, 254)}`,
        timeline: JSON.stringify(timeline),
        createdAt: date,
        confirmedAt: status === 'success' ? new Date(t + 45000) : null,
        items: { create: items.map((i) => ({ feeItemId: i.fee.id, name: i.name || i.fee.name, amount: i.amount })) },
      },
    })
  }

  // Chinedu's history (the demo student)
  const c = chinedu
  await payment({ n: 22, student: c, date: daysAgo(482, 11, 5), items: [{ fee: F.oldTuition1, amount: 400000 }], method: 'transfer', status: 'success', session: P })
  await payment({ n: 41, student: c, date: daysAgo(470, 9, 40), items: [{ fee: F.oldHostel, amount: 110000 }, { fee: F.oldLibrary, amount: 15000 }], method: 'card', status: 'success', session: P })
  await payment({ n: 88, student: c, date: daysAgo(330, 14, 12), items: [{ fee: F.oldTuition2, amount: 400000 }, { fee: F.oldDues, amount: 10000 }], method: 'transfer', status: 'success', session: P })
  await payment({ n: 101, student: c, date: daysAgo(126, 10, 20), items: [{ fee: F.tuition1, amount: 425000 }], method: 'transfer', status: 'success' })
  await payment({ n: 118, student: c, date: daysAgo(120, 15, 2), items: [{ fee: F.engSurcharge, amount: 75000 }], method: 'card', status: 'success' })
  await payment({ n: 126, student: c, date: daysAgo(118, 12, 48), items: [{ fee: F.library, amount: 15000 }, { fee: F.medical, amount: 25000 }], method: 'card', status: 'success' })
  await payment({ n: 140, student: c, date: daysAgo(40, 16, 30), items: [{ fee: F.hostel, amount: 60000, name: 'Hostel accommodation (part payment)' }], method: 'ussd', status: 'success' })
  await payment({ n: 152, student: c, date: daysAgo(12, 11, 15), items: [{ fee: F.hostel, amount: 60000 }], method: 'card', status: 'failed' })
  await payment({ n: 163, student: c, date: daysAgo(6, 14, 3), items: [{ fee: F.tuition2, amount: 150000, name: 'Tuition fee (Second Semester) (part payment)' }], method: 'card', status: 'success' })

  // ---------- Other students ----------
  const FIRST = ['Aisha', 'Tunde', 'Ngozi', 'Emeka', 'Fatima', 'Segun', 'Blessing', 'Ibrahim', 'Chioma', 'Yusuf', 'Funmilayo', 'Obinna', 'Zainab', 'Kelechi', 'Adaeze', 'Musa', 'Temitope', 'Uche', 'Halima', 'Babajide', 'Amaka', 'Sani', 'Oluwaseun', 'Ifeoma', 'Abdullahi', 'Kemi', 'Nnamdi', 'Hauwa', 'Damilola']
  const LAST = ['Okafor', 'Bello', 'Adeyemi', 'Eze', 'Nwosu', 'Abubakar', 'Ogunleye', 'Okonkwo', 'Mohammed', 'Balogun', 'Umar', 'Chukwu', 'Adebayo', 'Lawal', 'Obi', 'Olawale', 'Danjuma', 'Onyekachi', 'Afolabi', 'Garba', 'Ibekwe', 'Salami']
  const allFees = await prisma.feeItem.findMany({ where: { session: S, status: 'published' }, orderBy: { dueDate: 'asc' } })
  const usedMatric = new Set(['21/0345'])
  const pending = []
  for (let i = 1; i < 64; i++) {
    const faculty = pick(Object.keys(FACULTIES))
    const first = pick(FIRST)
    const last = pick(LAST)
    const level = pick(['100', '200', '300', '400'])
    const year = 25 - (Number(level) / 100 - 1)
    let matric
    do matric = `${year}/${String(between(100, 2400)).padStart(4, '0')}`
    while (usedMatric.has(matric))
    usedMatric.add(matric)
    const s = await prisma.user.create({
      data: {
        role: 'student', name: `${first} ${last}`, matric, email: `${first}.${last}${i}@students.kingsgate.edu.ng`.toLowerCase(),
        phone: `080${between(1, 9)}${between(1000000, 9999999)}`, faculty, department: pick(FACULTIES[faculty]), level,
        passwordHash: unusable, verified: true, status: rand() < 0.06 ? 'suspended' : 'active', createdAt: daysAgo(between(200, 1400)),
      },
    })
    // Decide how much of the applicable fees this student has paid, then allocate in due-date order.
    const mine = allFees.filter((f) => applies(f, s) && (f.mandatory || rand() < 0.6))
    const total = mine.reduce((a, f) => a + f.amount, 0)
    const r = rand()
    let budget = r < 0.36 ? total : r < 0.75 ? Math.round((total * between(20, 85)) / 100 / 5000) * 5000 : 0
    const allocs = []
    for (const f of mine) {
      if (budget <= 0) break
      const amt = Math.min(f.amount, budget)
      if (amt < f.amount && !f.installments) break
      allocs.push({ fee: f, amount: amt, name: amt < f.amount ? `${f.name} (part payment)` : f.name })
      budget -= amt
    }
    // Split into 1 to 3 payments
    const chunks = Math.min(allocs.length, between(1, 3))
    for (let k = 0; k < chunks; k++) {
      const items = allocs.filter((_, idx) => idx % chunks === k)
      if (items.length) pending.push({ student: s, items, method: pick(['card', 'card', 'card', 'transfer', 'transfer', 'ussd']), status: 'success', d: Math.floor(Math.pow(rand(), 1.5) * 75) })
    }
    // Some failed or pending attempts
    const owed = mine.find((f) => !allocs.some((a) => a.fee.id === f.id))
    if (owed && rand() < 0.3) pending.push({ student: s, items: [{ fee: owed, amount: owed.amount }], method: pick(['card', 'transfer']), status: rand() < 0.65 ? 'failed' : 'pending', d: between(0, 20) })
  }
  pending.sort((a, b) => b.d - a.d)
  let n = 200
  for (const p of pending) {
    await payment({ n: n++, student: p.student, date: daysAgo(p.d, between(7, 20), between(0, 59)), items: p.items, method: p.method, status: p.status, flagged: p.status === 'success' && rand() < 0.03 })
  }

  // ---------- Notifications ----------
  await prisma.notification.createMany({
    data: [
      { userId: c.id, type: 'reminder', title: 'Sports and recreation fee due in 14 days', body: '₦10,000.00 is due soon. Pay early to avoid a late fee.', createdAt: daysAgo(0, 8, 5) },
      { userId: c.id, type: 'security', title: 'New sign-in from Chrome on Windows', body: 'Lagos, Nigeria · IP 102.89.xx.xx. If this wasn’t you, change your password.', createdAt: daysAgo(0, 7, 42) },
      { userId: c.id, type: 'overdue', title: 'Hostel accommodation is overdue', body: 'A balance of ₦60,000.00 was due 9 days ago.', createdAt: daysAgo(1) },
      { userId: c.id, type: 'success', title: 'Payment confirmed: ₦152,000.00', body: 'Receipt RCP-2026-000163 is ready to download.', createdAt: daysAgo(6, 14, 4), read: true },
      { userId: c.id, type: 'failed', title: 'Payment failed: ₦60,900.00', body: 'SFP-2026-000152 was declined by your bank. You were not charged.', createdAt: daysAgo(12, 11, 16), read: true },
      { userId: c.id, type: 'announcement', title: 'Second semester fee schedule published', body: 'The Bursary has released the 2025/2026 second semester fee schedule.', createdAt: daysAgo(20), read: true },
      ...[aisha, tunde].flatMap((u) => [
        { userId: u.id, type: 'failed', title: 'Failed payments need attention', body: 'Several payments were declined this week, mostly for insufficient funds.', createdAt: daysAgo(0, 9, 10) },
        { userId: u.id, type: 'reminder', title: 'Bank transfers awaiting verification', body: 'Recent transfers need to be matched against the bank statement.', createdAt: daysAgo(1) },
        { userId: u.id, type: 'success', title: 'Nightly backup completed', body: 'Database snapshot saved and verified.', createdAt: daysAgo(0, 2, 0), read: true },
      ]),
    ],
  })

  // ---------- Audit trail (hash-chained) ----------
  const actors = [
    { user: aisha, actions: [['LOGIN_SUCCESS', 'Session: web (2FA)'], ['PAYMENT_VERIFIED', `Transaction: ${ref(between(200, 300))}`], ['REPORT_EXPORTED', 'Report: Daily collection (PDF, 7 rows)'], ['FEE_UPDATED', 'Fee structure: Tuition fee (Second Semester) (v2)']] },
    { user: musa, actions: [['LOGIN_SUCCESS', 'Session: web (2FA)'], ['PAYMENT_FLAGGED', `Transaction: ${ref(between(200, 300))} (duplicate card use)`], ['REMINDER_SENT', 'Student: 18 recipients']] },
    { user: tunde, actions: [['LOGIN_SUCCESS', 'Session: web (2FA)'], ['BACKUP_RUN', 'System: nightly snapshot'], ['ROLE_CHANGED', 'User: f.adebayo@kingsgate.edu.ng → admin']] },
    { user: c, actions: [['LOGIN_SUCCESS', 'Session: web'], ['PAYMENT_CONFIRMED', 'Transaction: SFP-2026-000163'], ['RECEIPT_VIEWED', 'Receipt: RCP-2026-000163'], ['ACCESS_DENIED', 'Route: /admin/payments']] },
  ]
  const entries = []
  for (let i = 0; i < 70; i++) {
    const a = pick(actors)
    const [action, target] = pick(a.actions)
    entries.push({ at: new Date(Date.now() - (70 - i) * between(30, 120) * 60_000), userId: a.user.id, userName: a.user.name, role: a.user.role, action, target, ip: `102.89.${between(1, 254)}.${between(1, 254)}`, result: action === 'ACCESS_DENIED' ? 'failure' : 'success' })
  }
  entries.push({ at: daysAgo(0, 6, 30), userId: null, userName: '22/1180', role: 'guest', action: 'ACCOUNT_LOCKED', target: 'Session: 22/1180', ip: '197.210.54.12', result: 'failure' })
  entries.sort((x, y) => x.at - y.at)
  let prevHash = 'GENESIS'
  for (const e of entries) {
    const hash = digest({ ...e, prevHash })
    await prisma.auditLog.create({ data: { ...e, prevHash, hash } })
    prevHash = hash
  }

  // ---------- System events and report history ----------
  await prisma.systemEvent.createMany({
    data: [
      { severity: 'warning', source: 'payments.verify', message: 'Gateway verification retried (attempt 2/3) for a pending transfer', createdAt: daysAgo(0, 9, 14) },
      { severity: 'critical', source: 'auth.rate-limit', message: 'Brute-force threshold hit for account 22/1180; lockout applied', createdAt: daysAgo(0, 6, 31) },
      { severity: 'info', source: 'jobs.reminders', message: 'Sent 1,284 due-date reminder emails', createdAt: daysAgo(1, 22, 3) },
      { severity: 'error', source: 'reports.export', message: 'PDF export timed out after 30s (Reconciliation, 12k rows); retried successfully', createdAt: daysAgo(1, 14, 47) },
      { severity: 'info', source: 'backup', message: 'Weekly full backup verified via test restore', createdAt: daysAgo(3, 3, 0) },
    ],
  })
  await prisma.reportLog.createMany({
    data: [
      { report: 'Daily collection', range: 'Last 7 days', format: 'pdf', rows: 7, byName: 'Aisha Bello', createdAt: daysAgo(1, 16, 5) },
      { report: 'Debtors list', range: 'Current session', format: 'excel', rows: 36, byName: 'Musa Garba', createdAt: daysAgo(3, 11, 40) },
      { report: 'Reconciliation', range: 'Last 30 days', format: 'csv', rows: 118, byName: 'Aisha Bello', createdAt: daysAgo(6, 9, 12) },
    ],
  })

  const counts = await Promise.all([prisma.user.count(), prisma.feeItem.count(), prisma.payment.count(), prisma.auditLog.count()])
  console.log(`Seeded ${counts[0]} users, ${counts[1]} fees, ${counts[2]} payments, ${counts[3]} audit entries in ${((Date.now() - t0) / 1000).toFixed(1)}s`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
