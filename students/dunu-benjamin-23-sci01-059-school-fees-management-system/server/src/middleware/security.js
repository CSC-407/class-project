import rateLimit from 'express-rate-limit'
import { config } from '../config.js'
import { safeEqual } from '../lib/crypto.js'
import { HttpError } from '../lib/errors.js'

const SAFE = new Set(['GET', 'HEAD', 'OPTIONS'])
const DEV_ORIGIN = /^http:\/\/(localhost|127\.0\.0\.1):\d+$/

// Production uses the explicit allow-list only; development also accepts any local port.
const originAllowed = (origin) => config.allowedOrigins.includes(origin) || (!config.isProd && !config.isTest && DEV_ORIGIN.test(origin))

/**
 * CSRF protection:
 * 1. State-changing requests must come from an allowed Origin.
 * 2. Signed-in requests must carry the session's synchroniser token in X-CSRF-Token.
 * The session cookie is also SameSite=Strict.
 */
export function csrfProtection(req, res, next) {
  if (SAFE.has(req.method)) return next()
  const origin = req.get('origin')
  if (origin && !originAllowed(origin)) {
    return next(new HttpError(403, 'bad_origin', 'Request blocked: untrusted origin.'))
  }
  if (req.session && !safeEqual(req.get('x-csrf-token'), req.session.csrfToken)) {
    return next(new HttpError(403, 'csrf', 'Security check failed. Refresh the page and try again.'))
  }
  next()
}

const limitHandler = (req, res, next, options) =>
  res.status(429).json({ error: 'rate_limited', message: 'Too many requests. Please slow down and try again shortly.', retryAfter: Math.ceil(options.windowMs / 1000) })

export const apiLimiter = rateLimit({
  windowMs: 60_000,
  limit: config.isTest ? 10_000 : 300,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: limitHandler,
})

export const authLimiter = rateLimit({
  windowMs: 60_000,
  limit: config.isTest ? 10_000 : config.isProd ? 20 : 60,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: limitHandler,
})
