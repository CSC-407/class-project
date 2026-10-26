import { z } from 'zod'
import { badRequest } from '../lib/errors.js'

/** Parse input with a zod schema; on failure respond 400 with per-field messages. */
export function parse(schema, data) {
  const result = schema.safeParse(data)
  if (result.success) return result.data
  const fields = {}
  for (const issue of result.error.issues) {
    const key = issue.path.join('.') || '_'
    if (!fields[key]) fields[key] = issue.message
  }
  throw badRequest(Object.values(fields)[0] || 'Invalid input', { fields })
}

// Shared field rules (mirror the client-side validation; the server is the source of truth).
export const rules = {
  name: z.string().trim().min(3, 'Enter your full name').max(80, 'Name is too long').refine((v) => v.split(/\s+/).length >= 2, 'Enter your first and last name'),
  matric: z.string().trim().refine((v) => {
    const s = v.trim()
    return /^\d{2}\/\d{4}$/.test(s) || /^\d{2}\/[A-Z]{3,4}\d{0,2}\/\d{3}$/i.test(s) || /^[A-Z0-9]{14}$/i.test(s)
  }, 'Enter a valid matric or JAMB number (e.g. 23/SCI01/059 or a 14-character JAMB number)'),
  email: z.string().trim().toLowerCase().max(120).regex(/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/, 'Enter a valid email address'),
  phone: z
    .string()
    .trim()
    .transform((v) => v.replace(/[\s-]/g, ''))
    .refine((v) => /^(\+234|0)[789][01]\d{8}$/.test(v), 'Enter a valid Nigerian phone number'),
  password: z
    .string()
    .max(128, 'Password is too long')
    .refine((p) => p.length >= 8, 'Password must be at least 8 characters')
    .refine((p) => /[A-Z]/.test(p), 'Password must include an uppercase letter')
    .refine((p) => /[a-z]/.test(p), 'Password must include a lowercase letter')
    .refine((p) => /\d/.test(p), 'Password must include a number')
    .refine((p) => /[^A-Za-z0-9]/.test(p), 'Password must include a symbol'),
  level: z.enum(['100', '200', '300', '400', '500'], { message: 'Select your level' }),
  id: z.string().min(1).max(40),
}
