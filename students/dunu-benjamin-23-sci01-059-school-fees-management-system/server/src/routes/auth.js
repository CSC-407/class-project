import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../db.js'
import { config } from '../config.js'
import { parse, rules } from '../middleware/validate.js'
import { requireAuth } from '../middleware/auth.js'
import { authLimiter } from '../middleware/security.js'
import { hashPassword, verifyPassword, dummyVerify, randomToken, sha256, otpCode, safeEqual } from '../lib/crypto.js'
import { createSession, revokeSession, revokeAllSessions, cookieOptions, describeDevice, SESSION_COOKIE, OTP_COOKIE } from '../lib/session.js'
import { publicUser } from '../lib/serialize.js'
import { audit } from '../lib/audit.js'
import { sendMail, exposeDevSecrets } from '../lib/mailer.js'
import { badRequest, conflict, HttpError } from '../lib/errors.js'
import { FACULTIES } from '../lib/constants.js'

const router = Router()

const sessionPayload = (session, user) => ({
  user: publicUser(user),
  session: {
    id: session.id,
    createdAt: session.createdAt,
    previousLogin: session.previousLogin,
    device: describeDevice(session.userAgent),
    idleMinutes: config.idleMinutes,
  },
  csrfToken: session.csrfToken,
})

// ---------- Session ----------
router.get('/session', (req, res) => {
  if (!req.user) return res.json({ user: null, expired: !!req.sessionExpired })
  res.json(sessionPayload(req.session, req.user))
})

router.post('/ping', requireAuth, (req, res) => res.json({ ok: true }))

// ---------- Login with lockout ----------
const throttleKey = (identifier) => identifier.trim().toLowerCase()

async function lockedUntil(key) {
  const t = await prisma.loginThrottle.findUnique({ where: { key } })
  return t?.lockedUntil && t.lockedUntil > new Date() ? t.lockedUntil : null
}

router.get('/lockout', async (req, res) => {
  const id = String(req.query.identifier || '').slice(0, 120)
  const until = id ? await lockedUntil(throttleKey(id)) : null
  res.json({ lockedUntil: until })
})

router.post('/login', authLimiter, async (req, res) => {
  const { identifier, password, remember } = parse(
    z.object({ identifier: z.string().trim().min(1, 'Enter your matric number or email').max(120), password: z.string().min(1, 'Enter your password').max(128), remember: z.boolean().optional() }),
    req.body,
  )
  const key = throttleKey(identifier)
  const until = await lockedUntil(key)
  if (until) throw new HttpError(423, 'locked', 'Too many attempts. Try again later.', { lockedUntil: until })

  // Parameterised lookup: input such as ' OR 1=1 -- is just a string that matches nothing.
  const user = await prisma.user.findFirst({ where: { OR: [{ email: key }, { matric: identifier.trim() }] } })
  const ok = user ? await verifyPassword(password, user.passwordHash) : await dummyVerify(password)

  if (!ok) {
    const t = await prisma.loginThrottle.upsert({ where: { key }, create: { key, count: 1 }, update: { count: { increment: 1 }, lockedUntil: null } })
    audit(req, 'LOGIN_FAILED', `Session: ${identifier.slice(0, 40)}`, 'failure', user ? { id: user.id, name: user.name, role: user.role } : { name: identifier.slice(0, 40), role: 'guest' })
    if (t.count >= config.maxLoginAttempts) {
      const lock = new Date(Date.now() + config.lockoutMinutes * 60_000)
      await prisma.loginThrottle.update({ where: { key }, data: { count: 0, lockedUntil: lock } })
      audit(req, 'ACCOUNT_LOCKED', `Session: ${identifier.slice(0, 40)}`, 'failure', { name: identifier.slice(0, 40), role: 'guest' })
      throw new HttpError(423, 'locked', 'Too many attempts. Try again later.', { lockedUntil: lock })
    }
    // Same message whether the account exists or not (no user enumeration).
    throw new HttpError(401, 'invalid_credentials', 'Invalid login details.', { remaining: config.maxLoginAttempts - t.count })
  }

  await prisma.loginThrottle.deleteMany({ where: { key } })
  if (user.status !== 'active') throw new HttpError(403, 'account_' + user.status, 'This account has been suspended. Contact the Bursary.')
  if (!user.verified) throw new HttpError(403, 'unverified', 'Verify your email before logging in.', { email: user.email })

  if (user.role !== 'student' || user.twoFactor) {
    const code = otpCode()
    const challenge = await prisma.authChallenge.create({
      data: { userId: user.id, codeHash: sha256(code), remember: !!remember, expiresAt: new Date(Date.now() + 10 * 60_000) },
    })
    sendMail(user.email, 'Your sign-in code', `Your Kingsgate Fees code is ${code}. It expires in 10 minutes.`)
    res.cookie(OTP_COOKIE, challenge.id, cookieOptions(10 * 60_000))
    return res.json({ otp: true, email: user.email.replace(/^(.{2}).*(@.*)$/, '$1•••••$2'), ...(exposeDevSecrets && { devOtp: code }) })
  }

  const session = await createSession(req, res, user, !!remember)
  audit(req, 'LOGIN_SUCCESS', 'Session: web', 'success', user)
  res.json(sessionPayload(session, user))
})

router.post('/otp', authLimiter, async (req, res) => {
  const { code } = parse(z.object({ code: z.string().regex(/^\d{6}$/, 'Enter all 6 digits') }), req.body)
  const id = req.cookies?.[OTP_COOKIE]
  const challenge = id && (await prisma.authChallenge.findUnique({ where: { id }, include: { user: true } }))
  if (!challenge || challenge.usedAt || challenge.expiresAt < new Date()) throw new HttpError(410, 'otp_expired', 'Your code has expired. Please log in again.')
  if (challenge.attempts >= 5) throw new HttpError(429, 'otp_locked', 'Too many incorrect codes. Please log in again.')
  if (!safeEqual(sha256(code), challenge.codeHash)) {
    await prisma.authChallenge.update({ where: { id }, data: { attempts: { increment: 1 } } })
    audit(req, 'OTP_FAILED', 'Session: 2FA', 'failure', challenge.user)
    throw new HttpError(401, 'otp_invalid', 'That code is incorrect or has expired.', { remaining: 4 - challenge.attempts })
  }
  await prisma.authChallenge.update({ where: { id }, data: { usedAt: new Date() } })
  res.clearCookie(OTP_COOKIE, { path: '/' })
  const session = await createSession(req, res, challenge.user, challenge.remember)
  audit(req, 'LOGIN_SUCCESS', 'Session: web (2FA)', 'success', challenge.user)
  res.json(sessionPayload(session, challenge.user))
})

router.post('/otp/resend', authLimiter, async (req, res) => {
  const id = req.cookies?.[OTP_COOKIE]
  const old = id && (await prisma.authChallenge.findUnique({ where: { id }, include: { user: true } }))
  if (!old || old.usedAt) throw new HttpError(410, 'otp_expired', 'Please log in again.')
  const code = otpCode()
  const challenge = await prisma.authChallenge.create({
    data: { userId: old.userId, codeHash: sha256(code), remember: old.remember, expiresAt: new Date(Date.now() + 10 * 60_000) },
  })
  await prisma.authChallenge.update({ where: { id }, data: { usedAt: new Date() } })
  sendMail(old.user.email, 'Your sign-in code', `Your Kingsgate Fees code is ${code}.`)
  res.cookie(OTP_COOKIE, challenge.id, cookieOptions(10 * 60_000))
  res.json({ ok: true, ...(exposeDevSecrets && { devOtp: code }) })
})

router.post('/logout', async (req, res) => {
  if (req.session) {
    await revokeSession(req.session.id)
    audit(req, 'LOGOUT', 'Session: web')
  }
  res.clearCookie(SESSION_COOKIE, { path: '/' })
  res.json({ ok: true })
})

// ---------- Registration and email verification ----------
async function issueToken(userId, type, minutes) {
  const token = randomToken(32)
  await prisma.token.create({ data: { userId, type, tokenHash: sha256(token), expiresAt: new Date(Date.now() + minutes * 60_000) } })
  return token
}

router.post('/register', authLimiter, async (req, res) => {
  const data = parse(
    z
      .object({
        name: rules.name,
        matric: rules.matric,
        email: rules.email,
        phone: rules.phone,
        faculty: z.enum(Object.keys(FACULTIES), { message: 'Select your faculty' }),
        department: z.string().min(1, 'Select your department'),
        level: rules.level,
        password: rules.password,
      })
      .refine((d) => FACULTIES[d.faculty]?.includes(d.department), { message: 'Department doesn’t belong to that faculty', path: ['department'] }),
    req.body,
  )
  if (await prisma.user.findUnique({ where: { matric: data.matric } })) throw conflict('matric_taken', 'An account with this matric number already exists.')
  if (await prisma.user.findUnique({ where: { email: data.email } })) throw conflict('email_taken', 'An account with this email already exists.')
  const user = await prisma.user.create({
    data: { ...data, role: 'student', passwordHash: await hashPassword(data.password), password: undefined },
  })
  await prisma.notification.create({
    data: { userId: user.id, type: 'announcement', title: 'Welcome to the Kingsgate Fees portal', body: `Your ${config.currentSession} fee schedule is ready. You can pay in full or in installments.` },
  })
  const token = await issueToken(user.id, 'verify_email', 24 * 60)
  sendMail(user.email, 'Verify your email', `Open /verify-email?token=${token}`)
  audit(req, 'USER_REGISTERED', `User: ${user.matric}`, 'success', user)
  res.status(201).json({ ok: true, email: user.email, ...(exposeDevSecrets && { devToken: token }) })
})

router.post('/verify-email', authLimiter, async (req, res) => {
  const { token } = parse(z.object({ token: z.string().min(10).max(100) }), req.body)
  const t = await prisma.token.findUnique({ where: { tokenHash: sha256(token) } })
  if (!t || t.type !== 'verify_email' || t.usedAt || t.expiresAt < new Date()) throw badRequest('This verification link is invalid or has expired.')
  await prisma.$transaction([
    prisma.token.update({ where: { id: t.id }, data: { usedAt: new Date() } }),
    prisma.user.update({ where: { id: t.userId }, data: { verified: true } }),
  ])
  res.json({ ok: true })
})

router.post('/resend-verification', authLimiter, async (req, res) => {
  const { email } = parse(z.object({ email: rules.email }), req.body)
  const user = await prisma.user.findUnique({ where: { email } })
  let token = randomToken(32) // decoy so the response looks the same for unknown emails
  if (user && !user.verified) {
    token = await issueToken(user.id, 'verify_email', 24 * 60)
    sendMail(user.email, 'Verify your email', `Open /verify-email?token=${token}`)
  }
  res.json({ ok: true, ...(exposeDevSecrets && { devToken: token }) })
})

// ---------- Password reset ----------
router.post('/forgot', authLimiter, async (req, res) => {
  const { email } = parse(z.object({ email: rules.email }), req.body)
  const user = await prisma.user.findUnique({ where: { email } })
  let token = randomToken(32) // decoy: identical response whether or not the account exists
  if (user) {
    token = await issueToken(user.id, 'reset_password', 30)
    sendMail(user.email, 'Reset your password', `Open /reset-password?token=${token}`)
    audit(req, 'PASSWORD_RESET_REQUESTED', `User: ${user.email}`, 'success', user)
  }
  res.json({ ok: true, ...(exposeDevSecrets && { devToken: token }) })
})

router.post('/reset', authLimiter, async (req, res) => {
  const { token, password } = parse(z.object({ token: z.string().min(10).max(100), password: rules.password }), req.body)
  const t = await prisma.token.findUnique({ where: { tokenHash: sha256(token) }, include: { user: true } })
  if (!t || t.type !== 'reset_password' || t.usedAt || t.expiresAt < new Date()) throw new HttpError(400, 'token_expired', 'This reset link has expired or was already used.')
  await prisma.$transaction([
    prisma.token.update({ where: { id: t.id }, data: { usedAt: new Date() } }),
    prisma.user.update({ where: { id: t.userId }, data: { passwordHash: await hashPassword(password) } }),
  ])
  await revokeAllSessions(t.userId)
  audit(req, 'PASSWORD_RESET', `User: ${t.user.email}`, 'success', t.user)
  res.json({ ok: true })
})

export default router
