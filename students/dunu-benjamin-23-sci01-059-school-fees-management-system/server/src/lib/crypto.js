import crypto from 'node:crypto'
import bcrypt from 'bcryptjs'
import { config } from '../config.js'

export const randomToken = (bytes = 32) => crypto.randomBytes(bytes).toString('base64url')
export const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex')

export const hashPassword = (password) => bcrypt.hash(password, config.bcryptRounds)
export const verifyPassword = (password, hash) => bcrypt.compare(password, hash)

// A real hash to compare against when the user doesn't exist, so the response
// takes the same time either way (stops account enumeration by timing).
let dummyHash
export async function dummyVerify(password) {
  dummyHash ||= await bcrypt.hash('not-a-real-password', config.bcryptRounds)
  await bcrypt.compare(password, dummyHash)
  return false
}

export function otpCode() {
  if (config.demoOtp) return config.demoOtp
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, '0')
}

/** Constant-time string comparison. */
export function safeEqual(a = '', b = '') {
  const ba = Buffer.from(String(a))
  const bb = Buffer.from(String(b))
  return ba.length === bb.length && crypto.timingSafeEqual(ba, bb)
}
