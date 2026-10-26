// API test suite. Runs against a fresh, seeded test database (server/prisma/test.db).
// Run with: npm test (inside server/)
import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
Object.assign(process.env, { NODE_ENV: 'test', DATABASE_URL: 'file:./test.db', BCRYPT_ROUNDS: '4', DEMO_OTP: '123456', ALLOWED_ORIGINS: 'http://localhost:5173' })
for (const f of ['prisma/test.db', 'prisma/test.db-journal']) if (fs.existsSync(path.join(root, f))) fs.rmSync(path.join(root, f))
execSync('npx prisma db push --skip-generate', { cwd: root, env: process.env, stdio: 'ignore' })
execSync('node prisma/seed.js', { cwd: root, env: process.env, stdio: 'ignore' })

const { default: request } = await import('supertest')
const { createApp } = await import('../src/app.js')
const { prisma } = await import('../src/db.js')
const app = createApp()

/** Signs in and returns an agent that keeps cookies, plus the CSRF token. */
async function signIn(identifier, password, otp) {
  const agent = request.agent(app)
  let res = await agent.post('/api/auth/login').send({ identifier, password })
  if (otp) res = await agent.post('/api/auth/otp').send({ code: otp })
  assert.equal(res.status, 200, JSON.stringify(res.body))
  return { agent, csrf: res.body.csrfToken, user: res.body.user }
}
const student = () => signIn('21/0345', 'Student@123')
const admin = () => signIn('bursar@kingsgate.edu.ng', 'Admin@123', '123456')

after(() => prisma.$disconnect())

describe('Authentication', () => {
  it('LR-01 valid login returns the user and sets a secure session cookie', async () => {
    const res = await request(app).post('/api/auth/login').send({ identifier: '21/0345', password: 'Student@123' })
    assert.equal(res.status, 200)
    assert.equal(res.body.user.name, 'Chinedu Okafor')
    assert.equal(res.body.user.passwordHash, undefined, 'password hash must never be returned')
    const cookie = res.headers['set-cookie'].join(';')
    assert.match(cookie, /HttpOnly/i)
    assert.match(cookie, /SameSite=Strict/i)
  })

  it('LR-02/03 wrong password and unknown user get the same generic error', async () => {
    const a = await request(app).post('/api/auth/login').send({ identifier: '21/0345', password: 'wrong' })
    const b = await request(app).post('/api/auth/login').send({ identifier: '99/9999', password: 'wrong' })
    assert.equal(a.status, 401)
    assert.equal(b.status, 401)
    assert.equal(a.body.message, 'Invalid login details.')
    assert.equal(a.body.message, b.body.message)
  })

  it('SC-02 SQL injection in the login field is treated as plain text', async () => {
    const res = await request(app).post('/api/auth/login').send({ identifier: "' OR 1=1 --", password: "' OR '1'='1" })
    assert.equal(res.status, 401)
    assert.equal(res.body.user, undefined)
  })

  it('LR-04 locks the account after 5 failed attempts', async () => {
    let res
    for (let i = 0; i < 5; i++) res = await request(app).post('/api/auth/login').send({ identifier: 'lockme@example.com', password: 'nope' })
    assert.equal(res.status, 423)
    assert.ok(res.body.lockedUntil)
    const again = await request(app).post('/api/auth/login').send({ identifier: 'lockme@example.com', password: 'nope' })
    assert.equal(again.status, 423)
  })

  it('LR-05 staff accounts need a one-time code; wrong codes are rejected', async () => {
    const agent = request.agent(app)
    const first = await agent.post('/api/auth/login').send({ identifier: 'bursar@kingsgate.edu.ng', password: 'Admin@123' })
    assert.equal(first.body.otp, true)
    assert.equal((await agent.post('/api/auth/otp').send({ code: '000000' })).status, 401)
    const ok = await agent.post('/api/auth/otp').send({ code: '123456' })
    assert.equal(ok.status, 200)
    assert.equal(ok.body.user.role, 'admin')
  })

  it('FV-01/04 registration validates every field on the server', async () => {
    const res = await request(app).post('/api/auth/register').send({ name: 'X', matric: '2103455', email: 'bad@', phone: '123', faculty: 'Sciences', department: 'Physics', level: '100', password: 'password' })
    assert.equal(res.status, 400)
    for (const f of ['name', 'matric', 'email', 'phone', 'password']) assert.ok(res.body.fields[f], `expected an error for ${f}`)
  })

  it('LR-07 rejects a duplicate matric number', async () => {
    const res = await request(app).post('/api/auth/register').send({ name: 'Copy Cat', matric: '21/0345', email: 'copy@example.com', phone: '08031234567', faculty: 'Sciences', department: 'Physics', level: '100', password: 'Strong@123' })
    assert.equal(res.status, 409)
  })

  it('LR-06/08 new accounts must verify email before logging in', async () => {
    const reg = await request(app).post('/api/auth/register').send({ name: 'Ada Lovelace', matric: '25/9001', email: 'ada@example.com', phone: '08031234567', faculty: 'Sciences', department: 'Physics', level: '100', password: 'Strong@123' })
    assert.equal(reg.status, 201)
    const blocked = await request(app).post('/api/auth/login').send({ identifier: 'ada@example.com', password: 'Strong@123' })
    assert.equal(blocked.body.error, 'unverified')
    assert.equal((await request(app).post('/api/auth/verify-email').send({ token: reg.body.devToken })).status, 200)
    assert.equal((await request(app).post('/api/auth/login').send({ identifier: 'ada@example.com', password: 'Strong@123' })).status, 200)
    const u = await prisma.user.findUnique({ where: { email: 'ada@example.com' } })
    assert.match(u.passwordHash, /^\$2[aby]\$/, 'password stored as a bcrypt hash')
  })

  it('forgot-password responds identically for unknown emails', async () => {
    const a = await request(app).post('/api/auth/forgot').send({ email: 'chinedu.okafor@students.kingsgate.edu.ng' })
    const b = await request(app).post('/api/auth/forgot').send({ email: 'nobody@example.com' })
    assert.equal(a.status, 200)
    assert.deepEqual(Object.keys(a.body).sort(), Object.keys(b.body).sort())
  })

  it('EH-05 expired or fake reset tokens are rejected', async () => {
    const res = await request(app).post('/api/auth/reset').send({ token: 'this-is-not-a-real-token', password: 'Strong@123' })
    assert.equal(res.body.error, 'token_expired')
  })

  it('logout revokes the session on the server', async () => {
    const { agent, csrf } = await student()
    await agent.post('/api/auth/logout').set('X-CSRF-Token', csrf)
    assert.equal((await agent.get('/api/me/fees')).status, 401)
  })
})

describe('Authorisation and CSRF', () => {
  it('rejects unauthenticated requests with 401', async () => {
    assert.equal((await request(app).get('/api/me/fees')).status, 401)
  })

  it('SC-01 a student calling an admin endpoint gets 403 and it is audit-logged', async () => {
    const { agent } = await student()
    const res = await agent.get('/api/admin/payments')
    assert.equal(res.status, 403)
    await new Promise((r) => setTimeout(r, 50))
    const log = await prisma.auditLog.findFirst({ where: { action: 'ACCESS_DENIED' }, orderBy: { id: 'desc' } })
    assert.match(log.target, /\/api\/admin\/payments/)
  })

  it('an admin cannot reach super-admin endpoints', async () => {
    const { agent } = await admin()
    assert.equal((await agent.get('/api/admin/system')).status, 403)
  })

  it('a student cannot read another student’s payment (no IDOR)', async () => {
    const other = await prisma.payment.findFirst({ where: { student: { matric: { not: '21/0345' } } } })
    const { agent } = await student()
    assert.equal((await agent.get(`/api/me/payments/${other.id}`)).status, 404)
  })

  it('state-changing requests without the CSRF token are blocked', async () => {
    const { agent } = await student()
    const res = await agent.post('/api/me/notifications/read-all')
    assert.equal(res.status, 403)
    assert.equal(res.body.error, 'csrf')
  })

  it('requests from an untrusted Origin are blocked', async () => {
    const res = await request(app).post('/api/auth/login').set('Origin', 'https://evil.example').send({ identifier: 'a', password: 'b' })
    assert.equal(res.status, 403)
    assert.equal(res.body.error, 'bad_origin')
  })
})

describe('Payments', () => {
  const feeByName = async (agent, prefix) => (await agent.get('/api/me/fees')).body.fees.find((f) => f.name.startsWith(prefix) && f.session === '2025/2026')

  it('FV-06 rejects an amount above the balance', async () => {
    const { agent, csrf } = await student()
    const fee = await feeByName(agent, 'Tuition fee (Second')
    const res = await agent.post('/api/payments/initiate').set('X-CSRF-Token', csrf).send({ items: [{ feeId: fee.id, amount: 999999 }], method: 'card' })
    assert.equal(res.status, 400)
    assert.match(res.body.message, /more than the balance/)
  })

  it('FV-07 rejects an installment below the minimum', async () => {
    const { agent, csrf } = await student()
    const fee = await feeByName(agent, 'Tuition fee (Second')
    const res = await agent.post('/api/payments/initiate').set('X-CSRF-Token', csrf).send({ items: [{ feeId: fee.id, amount: 500 }], method: 'card' })
    assert.equal(res.status, 400)
    assert.match(res.body.message, /Minimum installment/)
  })

  it('rejects part payment of a fee that must be paid in full', async () => {
    const { agent, csrf } = await student()
    const fee = await feeByName(agent, 'ICT')
    const res = await agent.post('/api/payments/initiate').set('X-CSRF-Token', csrf).send({ items: [{ feeId: fee.id, amount: 5000 }], method: 'card' })
    assert.match(res.body.message, /must be paid in full/)
  })

  it('FV-08 the gateway rejects card numbers that fail the Luhn check', async () => {
    const { agent, csrf } = await student()
    const fee = await feeByName(agent, 'Examination')
    const init = await agent.post('/api/payments/initiate').set('X-CSRF-Token', csrf).send({ items: [{ feeId: fee.id, amount: fee.amount }], method: 'card' })
    const res = await request(app).post('/sandbox-gateway/charge').send({ reference: init.body.payment.ref, method: 'card', card: { number: '4084084084084082', expiry: '12/30', cvv: '123', name: 'X' } })
    assert.equal(res.body.error, 'invalid_card')
  })

  it('FN-02/DB-01 a successful card payment issues a receipt and reduces the balance', async () => {
    const { agent, csrf } = await student()
    const fee = await feeByName(agent, 'Sports')
    const init = await agent.post('/api/payments/initiate').set('X-CSRF-Token', csrf).send({ items: [{ feeId: fee.id, amount: fee.amount - fee.paid }], method: 'card' })
    assert.equal(init.status, 201)
    const ref = init.body.payment.ref
    await request(app).post('/sandbox-gateway/charge').send({ reference: ref, method: 'card', card: { number: '4084 0840 8408 4081', expiry: '12/30', cvv: '123', name: 'C O' } })
    const verify = await agent.post(`/api/payments/${ref}/verify`).set('X-CSRF-Token', csrf)
    assert.equal(verify.body.payment.status, 'success')
    assert.ok(verify.body.payment.receiptNo)
    assert.equal(verify.body.payment.last4, '4081')
    const after = await feeByName(agent, 'Sports')
    assert.equal(after.paid, after.amount)
    const pub = await request(app).get(`/api/receipts/verify/${verify.body.payment.receiptNo}`)
    assert.equal(pub.status, 200)
    assert.equal(pub.body.receipt.student, 'Chinedu O.')
  })

  it('SC-08 the full card number is never stored', async () => {
    const charges = await prisma.gatewayCharge.findMany()
    const payments = await prisma.payment.findMany()
    const all = JSON.stringify([charges, payments])
    assert.ok(!all.includes('4084084084084081'))
  })

  it('EH-01/DB-02 a declined card leaves the balance unchanged', async () => {
    const { agent, csrf } = await student()
    const before = await feeByName(agent, 'ICT')
    const init = await agent.post('/api/payments/initiate').set('X-CSRF-Token', csrf).send({ items: [{ feeId: before.id, amount: before.amount }], method: 'card' })
    const ref = init.body.payment.ref
    await request(app).post('/sandbox-gateway/charge').send({ reference: ref, method: 'card', card: { number: '4000000000000002', expiry: '12/30', cvv: '123', name: 'C O' } })
    const verify = await agent.post(`/api/payments/${ref}/verify`).set('X-CSRF-Token', csrf)
    assert.equal(verify.body.payment.status, 'failed')
    assert.equal((await feeByName(agent, 'ICT')).paid, before.paid)
  })

  it('EH-02 a pending payment settles when the status is checked again', async () => {
    const { agent, csrf } = await student()
    const fee = await feeByName(agent, 'ICT')
    const init = await agent.post('/api/payments/initiate').set('X-CSRF-Token', csrf).send({ items: [{ feeId: fee.id, amount: fee.amount }], method: 'transfer' })
    const ref = init.body.payment.ref
    await request(app).post('/sandbox-gateway/charge').send({ reference: ref, method: 'transfer', simulate: 'pending' })
    assert.equal((await agent.post(`/api/payments/${ref}/verify`).set('X-CSRF-Token', csrf)).body.payment.status, 'pending')
    assert.equal((await agent.post(`/api/payments/${ref}/verify`).set('X-CSRF-Token', csrf)).body.payment.status, 'success')
  })

  it('BUG-01 an Idempotency-Key prevents duplicate payments from double clicks', async () => {
    const { agent, csrf } = await student()
    const fee = await feeByName(agent, 'Departmental')
    const body = { items: [{ feeId: fee.id, amount: fee.amount }], method: 'card' }
    const a = await agent.post('/api/payments/initiate').set('X-CSRF-Token', csrf).set('Idempotency-Key', 'test-key-1').send(body)
    const b = await agent.post('/api/payments/initiate').set('X-CSRF-Token', csrf).set('Idempotency-Key', 'test-key-1').send(body)
    assert.equal(a.body.payment.ref, b.body.payment.ref)
    assert.equal(b.body.reused, true)
  })

  it('admins can refund, and a refund restores the balance', async () => {
    const { agent: s } = await student()
    const before = await feeByName(s, 'Sports')
    const pay = await prisma.payment.findFirst({ where: { status: 'success', refunded: false, items: { some: { feeItemId: before.id } }, student: { matric: '21/0345' } } })
    const { agent, csrf } = await admin()
    const res = await agent.post(`/api/admin/payments/${pay.id}/refund`).set('X-CSRF-Token', csrf).send({ reason: 'Paid twice by mistake, verified with bank' })
    assert.equal(res.status, 200)
    assert.ok((await feeByName(s, 'Sports')).paid < before.paid)
  })
})

describe('Data integrity and headers', () => {
  it('SC-03 notes containing markup are stored and returned as plain text in JSON', async () => {
    const { agent, csrf } = await admin()
    const s = await prisma.user.findFirst({ where: { matric: '21/0345' } })
    const payload = '<script>alert(1)</script>'
    const res = await agent.post(`/api/admin/students/${s.id}/notes`).set('X-CSRF-Token', csrf).send({ text: payload })
    assert.equal(res.body.note.text, payload)
    assert.match(res.headers['content-type'], /application\/json/)
  })

  it('DB-04 the audit log hash chain is intact after all the actions above', async () => {
    await new Promise((r) => setTimeout(r, 100))
    const { agent } = await admin()
    const res = await agent.get('/api/admin/audit/verify')
    assert.equal(res.body.valid, true)
  })

  it('tampering with an audit entry is detected', async () => {
    const row = await prisma.auditLog.findFirst({ orderBy: { id: 'asc' } })
    await prisma.auditLog.update({ where: { id: row.id }, data: { action: 'TAMPERED' } })
    const { verifyChain } = await import('../src/lib/audit.js')
    const result = await verifyChain()
    assert.equal(result.valid, false)
    assert.equal(result.brokenAt, row.id)
    await prisma.auditLog.update({ where: { id: row.id }, data: { action: row.action } })
  })

  it('sends security headers on every response', async () => {
    const res = await request(app).get('/api/health')
    assert.ok(res.headers['content-security-policy'])
    assert.equal(res.headers['x-content-type-options'], 'nosniff')
    assert.ok(res.headers['x-frame-options'])
    assert.equal(res.headers['x-powered-by'], undefined)
  })

  it('never exposes stack traces for errors', async () => {
    const res = await request(app).post('/api/auth/login').set('Content-Type', 'application/json').send('{bad json')
    assert.equal(res.status, 400)
    assert.ok(!JSON.stringify(res.body).includes('at '))
  })
})
