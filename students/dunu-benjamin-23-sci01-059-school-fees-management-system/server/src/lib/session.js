import { prisma } from '../db.js'
import { config } from '../config.js'
import { randomToken, sha256 } from './crypto.js'

export const SESSION_COOKIE = 'sfp_sid'
export const OTP_COOKIE = 'sfp_otp'

export function cookieOptions(maxAgeMs) {
  return {
    httpOnly: true, // not readable from JavaScript, so XSS can't steal it
    secure: config.cookieSecure, // HTTPS only in production
    sameSite: 'strict', // not sent on cross-site requests (CSRF defence)
    path: '/',
    ...(maxAgeMs ? { maxAge: maxAgeMs } : {}),
  }
}

export async function createSession(req, res, user, remember = false) {
  const token = randomToken(32)
  const absoluteMs = (remember ? 7 * 24 : 12) * 60 * 60 * 1000
  const session = await prisma.session.create({
    data: {
      previousLogin: user.lastLoginAt,
      tokenHash: sha256(token),
      userId: user.id,
      csrfToken: randomToken(24),
      userAgent: String(req.get('user-agent') || '').slice(0, 200),
      ip: req.ip,
      remember,
      expiresAt: new Date(Date.now() + absoluteMs),
    },
  })
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } })
  // A persistent cookie only with "remember me"; otherwise it ends when the browser closes.
  res.cookie(SESSION_COOKIE, token, cookieOptions(remember ? absoluteMs : undefined))
  return session
}

export async function revokeSession(id) {
  await prisma.session.updateMany({ where: { id, revokedAt: null }, data: { revokedAt: new Date() } })
}

export async function revokeAllSessions(userId, exceptId) {
  const { count } = await prisma.session.updateMany({
    where: { userId, revokedAt: null, ...(exceptId ? { id: { not: exceptId } } : {}) },
    data: { revokedAt: new Date() },
  })
  return count
}

export function describeDevice(ua = '') {
  const browser = /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : 'Browser'
  const os = /Windows/.test(ua) ? 'Windows' : /Android/.test(ua) ? 'Android' : /iPhone|iPad/.test(ua) ? 'iOS' : /Mac/.test(ua) ? 'macOS' : /Linux/.test(ua) ? 'Linux' : 'Unknown OS'
  return `${browser} on ${os}`
}
