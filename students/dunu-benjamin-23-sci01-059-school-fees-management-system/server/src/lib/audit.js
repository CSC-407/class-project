import { prisma } from '../db.js'
import { sha256 } from './crypto.js'

// Writes are queued so each entry chains to the one before it.
let queue = Promise.resolve()

export const digest = (e) => sha256([e.prevHash, e.at.toISOString(), e.userId ?? '', e.userName, e.role, e.action, e.target, e.ip, e.result].join('|'))

export function audit(req, action, target, result = 'success', actor) {
  const user = actor || req?.user
  const entry = {
    at: new Date(),
    userId: user?.id ?? null,
    userName: user?.name ?? 'anonymous',
    role: user?.role ?? 'guest',
    action,
    target: String(target).slice(0, 200),
    ip: req?.ip ?? '127.0.0.1',
    result,
  }
  queue = queue
    .then(async () => {
      const last = await prisma.auditLog.findFirst({ orderBy: { id: 'desc' }, select: { hash: true } })
      const prevHash = last?.hash ?? 'GENESIS'
      await prisma.auditLog.create({ data: { ...entry, prevHash, hash: digest({ ...entry, prevHash }) } })
    })
    .catch((err) => console.error('[audit] failed to write entry', err))
  return queue
}

/** Recompute the hash chain. Returns the first broken entry id, or null if intact. */
export async function verifyChain() {
  const rows = await prisma.auditLog.findMany({ orderBy: { id: 'asc' } })
  let prev = 'GENESIS'
  for (const r of rows) {
    if (r.prevHash !== prev || digest(r) !== r.hash) return { valid: false, brokenAt: r.id, total: rows.length }
    prev = r.hash
  }
  return { valid: true, brokenAt: null, total: rows.length }
}
