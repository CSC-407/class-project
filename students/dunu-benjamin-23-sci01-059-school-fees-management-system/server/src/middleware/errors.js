import { HttpError } from '../lib/errors.js'
import { log } from '../lib/logger.js'
import { prisma } from '../db.js'

export function notFoundHandler(req, res) {
  res.status(404).json({ error: 'not_found', message: 'Endpoint not found.' })
}

// Never leak stack traces or internals to the client.
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.code, message: err.message, ...err.extra })
  }
  if (err?.type === 'entity.too.large') return res.status(413).json({ error: 'too_large', message: 'The request is too large.' })
  if (err?.type === 'entity.parse.failed') return res.status(400).json({ error: 'bad_json', message: 'Malformed request body.' })
  const incident = Math.random().toString(36).slice(2, 8).toUpperCase()
  log('ERROR', 'http', `${req.method} ${req.originalUrl} incident=${incident} ${err?.stack || err}`)
  prisma.systemEvent
    .create({ data: { severity: 'error', source: 'http', message: `Unhandled error on ${req.method} ${req.path} (incident ${incident})` } })
    .catch(() => {})
  res.status(500).json({ error: 'server_error', message: 'Something went wrong on our side. Please try again.', incident })
}
