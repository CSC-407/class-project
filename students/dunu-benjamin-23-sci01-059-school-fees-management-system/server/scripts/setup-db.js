// Creates/updates the database schema and seeds demo data when the database is empty.
// Usage: node scripts/setup-db.js [--reset]
import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import 'dotenv/config'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const run = (cmd) => execSync(cmd, { cwd: root, stdio: 'inherit', env: process.env })

if (!fs.existsSync(path.join(root, '.env'))) {
  fs.copyFileSync(path.join(root, '.env.example'), path.join(root, '.env'))
  console.log('Created server/.env from .env.example')
  process.env.DATABASE_URL ||= 'file:./dev.db'
}

const url = process.env.DATABASE_URL || ''
if (process.argv.includes('--reset') && url.startsWith('file:')) {
  const file = path.resolve(root, 'prisma', url.slice(5))
  for (const f of [file, `${file}-journal`]) if (fs.existsSync(f)) fs.rmSync(f)
  console.log('Database reset.')
}

run('npx prisma db push --skip-generate')

const { prisma } = await import('../src/db.js')
const users = await prisma.user.count()
await prisma.$disconnect()
if (users === 0) run('node prisma/seed.js')
else console.log(`Database ready (${users} users).`)
