# School Fees Payment Management System (CSC 407)

A full-stack web app for **Kingsgate University** (fictional). Students view their fees, pay in full or in installments, and download QR-verifiable receipts. Bursary staff manage fee structures, payments, debtors, reports and an audit log.

Built for the course *Building Web Applications: Web Application Security, Testing, Deployment and Review*. The app includes dedicated **Security**, **Testing**, **Deployment** and **Review** pages.

- **Frontend:** React 19, Vite, Tailwind CSS v4, React Router, Recharts
- **Backend:** Node.js 22, Express 5, Prisma ORM, SQLite in development (switchable to PostgreSQL)
- **Security:** bcrypt, HttpOnly/SameSite session cookies, CSRF tokens, Helmet headers, rate limiting, account lockout, staff 2FA, Zod validation, and a hash-chained audit log
- **Payments:** a sandbox gateway (Test Mode). Card details go to the gateway, never to the API, and every result is verified server-to-server.

## Run it

```bash
npm install      # installs frontend + server dependencies
npm run dev      # starts the API (port 4000) and the website (http://localhost:5173)
```

The first `npm run dev` creates `server/.env`, builds the database and seeds demo data automatically.

| Command | What it does |
|---|---|
| `npm run dev` | API + website together |
| `npm test` | 32 automated API tests against a fresh test database |
| `npm run db:reset` | Wipe and reseed the demo database (stop `npm run dev` first) |
| `npm run build` | Production build of the frontend into `dist/` |
| `npm start` | Run the API in production mode (also serves `dist/`) |

## Demo accounts

| Role | Login | Password | One-time code |
|---|---|---|---|
| Student | `21/0345` | `Student@123` | none |
| Bursary Admin | `bursar@kingsgate.edu.ng` | `Admin@123` | `123456` |
| Super Admin | `sysadmin@kingsgate.edu.ng` | `Super@123` | `123456` |

**Test cards** (any future expiry, any CVV): `4084 0840 8408 4081` succeeds, `4000 0000 0000 0002` is declined, `5060 6666 6666 6666 666` is pending (it settles on the second "Check status").

Emails and SMS aren't really sent. They're written to the API log, and in development the one-time links and codes are also shown in the UI.

## Security features (all enforced on the server)

- Passwords hashed with **bcrypt** (cost 12). Login errors are generic, and unknown accounts get a dummy hash comparison so timing gives nothing away.
- **Lockout** after 5 failed logins (5 minutes). The auth endpoints are rate-limited, and so is the whole API.
- **Sessions:** a random token in a `Secure` (production), `HttpOnly`, `SameSite=Strict` cookie. Only its SHA-256 is stored. A 10-minute idle timeout is enforced by the server. "Log out other devices" and password changes revoke sessions.
- **CSRF:** a per-session synchroniser token in `X-CSRF-Token`, plus an Origin allow-list.
- **Role-based access** on every route (student / admin / superadmin). Resources are scoped to their owner, so there's no IDOR. Denials are audit-logged.
- **Input validation** with Zod on every endpoint. The server recalculates every payment amount. Requests carry idempotency keys to prevent double charges.
- **Helmet** security headers (CSP, X-Frame-Options, nosniff, Referrer-Policy; HSTS in production). No stack traces are shown to users.
- An **append-only audit log** with a SHA-256 hash chain; tampering is detected. You can check the chain from the Audit Log page.
- **Backups:** one-click consistent SQLite snapshots from System Health.

## Project structure

```
src/                 React frontend
  lib/api.js         API client (cookies + CSRF header), useApi hook
  context/           Auth (server session) and Data (fees, payments, notifications)
  pages/             public/, student/, admin/, showcase/
server/
  prisma/            schema.prisma, seed.js
  src/app.js         Express app: Helmet, sessions, CSRF, rate limits, routes
  src/routes/        auth, me, payments, gateway (sandbox), public, admin/*
  src/lib/           fees, audit (hash chain), sessions, gateway, crypto
  tests/api.test.js  automated API tests
```

## Switching to PostgreSQL

In `server/prisma/schema.prisma`, set `provider = "postgresql"`, point `DATABASE_URL` in `server/.env` at your database, then run `npm run db:setup` in `server/`.

## Test evidence

Put screenshots in `public/evidence/<TEST-ID>.png` (for example `SC-01.png`). The Testing page shows them in its evidence lightbox.
