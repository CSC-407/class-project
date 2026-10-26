import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import express from 'express'
import { createApp } from './app.js'
import { config } from './config.js'
import { prisma } from './db.js'
import { log } from './lib/logger.js'

const app = createApp()

// In production the API also serves the built frontend (single deployable).
const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../dist')
if (config.isProd && fs.existsSync(dist)) {
  app.use(express.static(dist, { index: false, maxAge: '1h' }))
  app.get(/^(?!\/api|\/sandbox-gateway).*/, (req, res) => res.sendFile(path.join(dist, 'index.html')))
}

const server = app.listen(config.port, () => {
  log('INFO', 'server', `API listening on http://localhost:${config.port} (${config.env})`)
  prisma.systemEvent.create({ data: { severity: 'info', source: 'server', message: `Server started (${config.env}, Node ${process.version})` } }).catch(() => {})
})

// Clean up expired sessions and one-time tokens every hour.
setInterval(async () => {
  const now = new Date()
  await prisma.session.deleteMany({ where: { OR: [{ expiresAt: { lt: now } }, { revokedAt: { lt: new Date(now - 7 * 86_400_000) } }] } }).catch(() => {})
  await prisma.token.deleteMany({ where: { expiresAt: { lt: now } } }).catch(() => {})
  await prisma.authChallenge.deleteMany({ where: { expiresAt: { lt: now } } }).catch(() => {})
}, 3_600_000).unref()

const shutdown = () => {
  server.close(() => prisma.$disconnect().finally(() => process.exit(0)))
}
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
