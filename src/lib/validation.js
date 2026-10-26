export const MATRIC_RE = /^\d{2}\/\d{4}$/
export const MATRIC_ALT_RE = /^\d{2}\/[A-Z]{3,4}\d{0,2}\/\d{3}$/i
export const JAMB_RE = /^[A-Z0-9]{14}$/i
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
export const PHONE_RE = /^(\+234|0)[789][01]\d{8}$/

export const ID_RE = (v = '') => {
  const s = v.trim()
  return MATRIC_RE.test(s) || MATRIC_ALT_RE.test(s) || JAMB_RE.test(s)
}

export const PASSWORD_RULES = [
  { id: 'len', label: 'At least 8 characters', test: (p) => p.length >= 8 },
  { id: 'upper', label: 'One uppercase letter', test: (p) => /[A-Z]/.test(p) },
  { id: 'lower', label: 'One lowercase letter', test: (p) => /[a-z]/.test(p) },
  { id: 'num', label: 'One number', test: (p) => /\d/.test(p) },
  { id: 'sym', label: 'One symbol (e.g. ! @ # $)', test: (p) => /[^A-Za-z0-9]/.test(p) },
]

export function passwordScore(p = '') {
  return PASSWORD_RULES.filter((r) => r.test(p)).length
}

export function passwordError(p) {
  if (!p) return 'Enter a password'
  const failed = PASSWORD_RULES.find((r) => !r.test(p))
  if (!failed) return ''
  const map = {
    len: 'Password must be at least 8 characters',
    upper: 'Password must include an uppercase letter',
    lower: 'Password must include a lowercase letter',
    num: 'Password must include a number',
    sym: 'Password must include a symbol',
  }
  return map[failed.id]
}

export const normalisePhone = (v = '') => v.replace(/[\s-]/g, '')

export const validators = {
  name: (v) => (!v.trim() ? 'Enter your full name' : v.trim().split(/\s+/).length < 2 ? 'Enter your first and last name' : v.length > 80 ? 'Name is too long' : ''),
  matric: (v) => (!v ? 'Enter your matric/JAMB number' : !ID_RE(v) ? 'Enter a valid matric or JAMB number (e.g. 23/SCI01/059 or 14-character JAMB number)' : ''),
  email: (v) => (!v ? 'Enter your email address' : !EMAIL_RE.test(v.trim()) ? 'Enter a valid email, like name@example.com' : ''),
  phone: (v) => (!v ? 'Enter your phone number' : !PHONE_RE.test(normalisePhone(v)) ? 'Enter a valid Nigerian number, like 0803 412 7788' : ''),
  required: (label) => (v) => (!v ? `Select your ${label}` : ''),
}
