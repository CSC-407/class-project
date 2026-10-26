// Shared constants and small helpers. All records (users, fees, payments, audit
// logs) come from the API; nothing here is used as a data source.

export const SCHOOL = {
  name: 'Kingsgate University',
  short: 'KGU',
  bursary: 'Office of the Bursar',
  address: 'Km 8, University Road, Ikeja, Lagos State',
  email: 'bursary@kingsgate.edu.ng',
  phone: '+234 809 555 0142',
  hours: 'Mon to Fri, 8:00am to 4:00pm',
}

export const CURRENT_SESSION = '2025/2026'
export const SESSIONS = ['2025/2026', '2024/2025']
export const SEMESTERS = ['First Semester', 'Second Semester']

export const FACULTIES = {
  Engineering: ['Computer Engineering', 'Electrical Engineering', 'Mechanical Engineering', 'Civil Engineering', 'Chemical Engineering'],
  Sciences: ['Computer Science', 'Mathematics', 'Physics', 'Microbiology', 'Biochemistry'],
  Law: ['Private and Property Law', 'Public Law'],
  'Social Sciences': ['Economics', 'Political Science', 'Sociology', 'Mass Communication'],
  'Management Sciences': ['Accounting', 'Business Administration', 'Banking and Finance'],
  Arts: ['English', 'History and International Studies', 'Theatre Arts'],
}
export const LEVELS = ['100', '200', '300', '400', '500']

// Mirrors the server's rules, for display only; the server recalculates every amount.
export const SERVICE_CHARGE_RATE = 0.015
export const SERVICE_CHARGE_CAP = 2000
export const MIN_INSTALLMENT = 10000

export function serviceCharge(amount) {
  return Math.min(Math.round(amount * SERVICE_CHARGE_RATE * 100) / 100, SERVICE_CHARGE_CAP)
}

export function feeStatus(fee) {
  const balance = fee.amount - fee.paid
  if (balance <= 0) return 'paid'
  if (new Date(fee.dueDate) < new Date()) return 'overdue'
  if (fee.paid > 0) return 'partial'
  return 'unpaid'
}

export function studentPayStatus(s) {
  if (s.paid >= s.total) return 'paid'
  if (s.paid > 0) return 'partial'
  return 'owing'
}

const DAY = 86400000
export const daysAgo = (d, h = 10, m = 0) => {
  const date = new Date(Date.now() - d * DAY)
  date.setHours(h, m, 0, 0)
  return date.toISOString()
}

export const PERMISSIONS = [
  { key: 'View own fees and payments', student: true, admin: true, superadmin: true },
  { key: 'Make payments', student: true, admin: false, superadmin: false },
  { key: 'Download own receipts', student: true, admin: true, superadmin: true },
  { key: 'View all students', student: false, admin: true, superadmin: true },
  { key: 'Manage fee structures', student: false, admin: true, superadmin: true },
  { key: 'Verify, flag or refund payments', student: false, admin: true, superadmin: true },
  { key: 'Generate reports', student: false, admin: true, superadmin: true },
  { key: 'View audit log', student: false, admin: true, superadmin: true },
  { key: 'Manage admin accounts and roles', student: false, admin: false, superadmin: true },
  { key: 'System health and backups', student: false, admin: false, superadmin: true },
]
