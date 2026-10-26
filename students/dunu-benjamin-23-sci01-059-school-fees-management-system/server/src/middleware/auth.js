import { prisma } from '../db.js'
import { config } from '../config.js'
import { sha256 } from '../lib/crypto.js'
import { SESSION_COOKIE } from '../lib/session.js'
import { unauthorized, forbidden } from '../lib/errors.js'
import { audit } from '../lib/audit.js'

/** Resolve the session cookie to req.session and req.user. Never throws. */
export async function loadSession(req, res, next) {
  const token = req.cookies?.[SESSION_COOKIE]
  if (!token) return next()
  const session = await prisma.session.findUnique({ where: { tokenHash: sha256(token) }, include: { user: true } })
  const now = Date.now()
  const idleMs = config.idleMinutes * 60 * 1000
  const valid =
    session &&
    !session.revokedAt &&
    session.expiresAt.getTime() > now &&
    now - session.lastSeenAt.getTime() < idleMs &&
    session.user.status === 'active'
  if (!valid) {
    if (session && !session.revokedAt) await prisma.session.update({ where: { id: session.id }, data: { revokedAt: new Date() } })
    res.clearCookie(SESSION_COOKIE, { path: '/' })
    req.sessionExpired = true
    return next()
  }
  req.session = session
  req.user = session.user
  // Sliding idle window; write at most every 30 seconds.
  if (now - session.lastSeenAt.getTime() > 30_000) {
    await prisma.session.update({ where: { id: session.id }, data: { lastSeenAt: new Date() } })
  }
  next()
}

export function requireAuth(req, res, next) {
  if (!req.user) {
    const err = unauthorized(req.sessionExpired ? 'Your session expired. Please log in again.' : undefined)
    err.code = req.sessionExpired ? 'session_expired' : 'unauthorized'
    return next(err)
  }
  next()
}

/** Server-side authorisation: runs on every protected route, whatever the UI shows. */
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return requireAuth(req, res, next)
    if (!roles.includes(req.user.role)) {
      audit(req, 'ACCESS_DENIED', `Route: ${req.method} ${req.originalUrl}`, 'failure')
      return next(forbidden())
    }
    next()
  }
}
