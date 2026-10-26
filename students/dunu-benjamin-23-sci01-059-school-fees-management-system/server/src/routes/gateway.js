// The sandbox gateway's public checkout endpoint. In production this would be
// the provider's own domain; the card number goes there, never to our API.
import { Router } from 'express'
import { z } from 'zod'
import { parse } from '../middleware/validate.js'
import { authLimiter } from '../middleware/security.js'
import * as gateway from '../lib/gateway.js'
import { HttpError } from '../lib/errors.js'
import { log } from '../lib/logger.js'

const router = Router()

router.post('/charge', authLimiter, async (req, res) => {
  const body = parse(
    z.object({
      reference: z.string().regex(/^SFP-\d{4}-\d{6}$/),
      method: z.enum(['card', 'transfer', 'ussd']),
      card: z.object({ number: z.string().max(23), expiry: z.string().max(5), cvv: z.string().max(4), name: z.string().max(60) }).optional(),
      simulate: z.enum(['success', 'failed', 'pending']).optional(),
      bank: z.string().regex(/^\d{3}$/).optional(),
    }),
    req.body,
  )
  if (body.method === 'card' && !body.card) throw new HttpError(400, 'card_required', 'Enter your card details.')
  const result = await gateway.charge(body)
  // Card data is used above and dropped here; it's never logged or stored.
  if (result.error) throw new HttpError(400, result.error, result.message)
  log('INFO', 'gateway', `charge ${body.reference} → ${result.status}`)
  res.json(result)
})

export default router
