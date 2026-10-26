import express from 'express'
import helmet from 'helmet'
import cookieParser from 'cookie-parser'
import { config } from './config.js'
import { loadSession, requireAuth } from './middleware/auth.js'
import { csrfProtection, apiLimiter } from './middleware/security.js'
import { errorHandler, notFoundHandler } from './middleware/errors.js'
import { log } from './lib/logger.js'
import authRoutes from './routes/auth.js'
import meRoutes from './routes/me.js'
import paymentRoutes from './routes/payments.js'
import publicRoutes from './routes/public.js'
import adminRoutes from './routes/admin/index.js'
import gatewayRoutes from './routes/gateway.js'

export function createApp() {
  const app = express()
  app.disable('x-powered-by')
  app.set('trust proxy', 1) // correct client IPs behind the dev proxy / load balancer

  // Security headers: CSP, HSTS, X-Frame-Options, nosniff, Referrer-Policy, ...
  app.use(
    helmet({
      contentSecurityPolicy: { directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] } },
      hsts: config.isProd ? { maxAge: 31536000, includeSubDomains: true, preload: true } : false,
      crossOriginResourcePolicy: { policy: 'same-origin' },
    }),
  )
  app.use((req, res, next) => {
    res.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
    res.set('Cache-Control', 'no-store')
    next()
  })

  // Request log
  app.use((req, res, next) => {
    const start = Date.now()
    res.on('finish', () => {
      if (req.path !== '/api/auth/ping') log(res.statusCode >= 500 ? 'ERROR' : res.statusCode >= 400 ? 'WARN' : 'INFO', 'http', `${req.method} ${req.path} ${res.statusCode} ${Date.now() - start}ms${req.user ? ` user=${req.user.id.slice(-6)}` : ''}`)
    })
    next()
  })

  app.use(express.json({ limit: '3mb' })) // room for a 2 MB profile photo
  app.use(cookieParser())
  app.use(loadSession)
  app.use(csrfProtection)

  app.use('/api', apiLimiter)
  app.use('/api/auth', authRoutes)
  app.use('/api', publicRoutes)
  app.use('/api/me', requireAuth, meRoutes)
  app.use('/api/payments', requireAuth, paymentRoutes)
  app.use('/api/admin', requireAuth, adminRoutes)
  app.use('/sandbox-gateway', gatewayRoutes)

  app.use(['/api', '/sandbox-gateway'], notFoundHandler)
  app.use(errorHandler)
  return app
}
