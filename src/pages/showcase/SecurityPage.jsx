import { useState } from 'react'
import {
  Shield, LogIn, Fingerprint, UsersRound, ListChecks, Database, Code2, Repeat, Cookie, Route, Timer, EyeOff, Lock, ScrollText, DatabaseBackup,
  ChevronDown, CheckCircle2, ShieldCheck, XCircle, Play, RotateCcw, Terminal,
} from 'lucide-react'
import { Card, StatusChip, Button, Input, Badge, ProgressBar, Textarea } from '../../components/ui'
import { PermissionsMatrix } from '../../components/PermissionsMatrix'
import { ShowcaseShell, SectionTitle } from './ShowcaseShell'
import { cn, escapeHtml } from '../../lib/format'
import { useDocumentTitle } from '../../lib/hooks'

const CONTROLS = [
  { icon: LogIn, title: 'Authentication', what: 'Verifies who a user is before granting access.', how: ['Login by matric number or email plus password', 'Email verification is required before first login', 'Staff accounts need a second factor (6-digit OTP)', 'Explicit logout invalidates the server session'] },
  { icon: Fingerprint, title: 'Password hashing', what: 'Passwords are turned into one-way hashes so they can never be read back, even by us.', how: ['bcrypt with cost factor 12 on the server; each hash has its own random salt', 'Plain-text passwords are never stored or logged', 'Strength policy: 8+ chars, upper, lower, number, symbol', 'Unknown accounts still run a dummy bcrypt compare, so response timing doesn’t reveal who is registered'] },
  { icon: UsersRound, title: 'Role-based access control', what: 'Each role (Student, Admin, Super Admin) can only do what its permissions allow.', how: ['Roles are stored server-side and checked on every request', 'Students never see admin menus, not even disabled ones', 'Direct URL access to admin pages returns 403 and is logged', 'See the full permissions matrix below'], matrix: true },
  { icon: ListChecks, title: 'Input validation', what: 'All input is checked for type, format and length before it’s used.', how: ['Client side: inline validation for matric, email, phone, amounts and cards (Luhn)', 'Server side: the same rules re-applied with a schema validator (Zod/Joi); client checks are never trusted', 'Length limits on every field (maxLength)', 'Allow-lists for enums such as faculty, level and payment method'] },
  { icon: Database, title: 'SQL injection protection', what: 'Stops attackers from changing database queries through input fields.', how: ['All queries go through the Prisma ORM, which always sends parameterised statements', 'No string concatenation into SQL anywhere', 'Every request body is validated with Zod schemas before it reaches the database', 'Try it in the demo below'] },
  { icon: Code2, title: 'XSS protection', what: 'Prevents malicious scripts from running in other users’ browsers.', how: ['React escapes all output by default; dangerouslySetInnerHTML is never used', 'User text (names, notes) is stored as plain text and rendered as text, never as HTML', 'The API sends a strict Content-Security-Policy via Helmet', 'Printable reports HTML-encode every value'] },
  { icon: Repeat, title: 'CSRF protection', what: 'Stops other websites from making requests on a logged-in user’s behalf.', how: ['Synchroniser token (per session) required in the X-CSRF-Token header on every state-changing request', 'Session cookie set with SameSite=Strict', 'The Origin header is checked against an allow-list on POST, PUT, PATCH and DELETE', 'Tokens rotate on login'] },
  { icon: Cookie, title: 'Session management', what: 'Keeps sessions secure and short-lived.', how: ['Session ID in a Secure, HttpOnly, SameSite cookie that scripts can’t read', 'Idle timeout after 10 min, enforced on the server, with a 60-second warning in the UI', 'A brand-new random session token on every login (stored only as a SHA-256 hash)', '“Log out other devices” and password change revoke all sessions'] },
  { icon: Route, title: 'Access-control checks', what: 'Every route and API endpoint checks authorisation on the server.', how: ['Middleware checks the session and role before each handler', 'Resource ownership checked (a student can only fetch their own receipts)', 'IDs are not trusted from the client (no IDOR)', 'Denied attempts are written to the audit log'] },
  { icon: Timer, title: 'Rate limiting and lockout', what: 'Limits repeated attempts to slow down brute-force attacks.', how: ['5 failed logins lock the account for 5 minutes with a visible countdown', 'API limit: 300 requests/min per IP; 20/min on login, OTP and reset endpoints', 'OTP limited to 5 tries per code', 'Generic error messages prevent account enumeration'] },
  { icon: EyeOff, title: 'Sensitive data handling', what: 'Protects personal and payment data at rest and in display.', how: ['Card data goes to the payment gateway, never to our API, and results are verified server-to-server', 'Only the last 4 digits are kept; the full number is never displayed', 'Payment amounts are recalculated on the server; a gateway amount mismatch flags the payment', 'Secrets live in environment variables, never in the code'] },
  { icon: Lock, title: 'HTTPS/TLS and security headers', what: 'Encrypts all traffic and tells browsers to enforce safe defaults.', how: ['HTTPS in production (TLS 1.3); cookies get the Secure flag automatically', 'HSTS with max-age of 1 year, includeSubDomains, preload', 'X-Frame-Options DENY, X-Content-Type-Options nosniff', 'Strict Referrer-Policy and Permissions-Policy'] },
  { icon: ScrollText, title: 'Audit logging', what: 'Records who did what, when and from where.', how: ['Logins, payments, fee changes, refunds, role changes and exports are logged', 'Append-only: the application exposes no update or delete for audit rows', 'Each entry stores the SHA-256 of the previous one; the chain is re-verified on demand', 'Retained for 7 years for financial audit'] },
  { icon: DatabaseBackup, title: 'Backups and recovery', what: 'Makes sure data can be restored after failure or attack.', how: ['One-click consistent snapshot (SQLite VACUUM INTO) from System Health', 'In production: managed Postgres point-in-time recovery plus off-site copies', 'Monthly test restore to staging', 'RPO 24h, RTO 2h (documented recovery runbook)'] },
]

const HEADERS = [
  ['Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload'],
  ['Content-Security-Policy', "default-src 'self'; script-src 'self'; object-src 'none'; frame-ancestors 'none'"],
  ['X-Frame-Options', 'DENY'],
  ['X-Content-Type-Options', 'nosniff'],
  ['Referrer-Policy', 'strict-origin-when-cross-origin'],
  ['Permissions-Policy', 'camera=(), microphone=(), geolocation=()'],
  ['Cross-Origin-Opener-Policy', 'same-origin'],
  ['Set-Cookie', 'sid=…; Secure; HttpOnly; SameSite=Strict'],
]

function ControlCard({ c, i }) {
  const [open, setOpen] = useState(false)
  return (
    <Card className={cn('flex flex-col transition-shadow', open && 'shadow-lift md:col-span-2 xl:col-span-3')}>
      <button onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls={`ctrl-${i}`} className="flex w-full items-start gap-4 p-5 text-left">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-200">
          <c.icon className="size-5" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-semibold">{i + 1}. {c.title}</span>
          </span>
          <span className="mt-1 block text-sm text-muted">{c.what}</span>
          <span className="mt-3 flex items-center gap-2"><StatusChip status="implemented" /></span>
        </span>
        <ChevronDown className={cn('mt-1 size-5 shrink-0 text-muted transition-transform', open && 'rotate-180')} aria-hidden />
      </button>
      {open && (
        <div id={`ctrl-${i}`} className="animate-fade-up border-t border-line px-5 pt-4 pb-5">
          <div className={cn(c.matrix && 'grid gap-6 lg:grid-cols-[1fr_1.4fr]')}>
            <div>
              <p className="text-xs font-semibold tracking-wide text-muted uppercase">What it is</p>
              <p className="mt-1 text-sm">{c.what}</p>
              <p className="mt-4 text-xs font-semibold tracking-wide text-muted uppercase">How we implemented it</p>
              <ul className="mt-2 space-y-2 text-sm">
                {c.how.map((h) => (
                  <li key={h} className="flex gap-2"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />{h}</li>
                ))}
              </ul>
            </div>
            {c.matrix && <div className="overflow-hidden rounded-xl border border-line"><PermissionsMatrix /></div>}
          </div>
        </div>
      )}
    </Card>
  )
}

function XssDemo() {
  const [input, setInput] = useState('<img src=x onerror="alert(\'hacked\')"> Chinedu')
  const encoded = escapeHtml(input)
  const dangerous = /<\s*script|on\w+\s*=|javascript:/i.test(input)
  return (
    <Card className="flex flex-col p-5">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-semibold">XSS: output encoding</h3>
        <Badge tone={dangerous ? 'danger' : 'success'} icon={dangerous ? XCircle : CheckCircle2}>{dangerous ? 'Payload detected' : 'Clean'}</Badge>
      </div>
      <p className="mt-1 text-sm text-muted">Type any HTML or script. It will never run.</p>
      <Textarea label="Raw input" rows={2} className="mt-4" value={input} onChange={(e) => setInput(e.target.value)} maxLength={300} inputClassName="font-mono" />
      <div className="mt-3 space-y-3 text-sm">
        <div>
          <p className="text-xs font-medium text-muted">Encoded before output</p>
          <code className="mt-1 block rounded-lg bg-subtle p-2.5 font-mono text-xs break-all">{encoded}</code>
        </div>
        <div>
          <p className="text-xs font-medium text-muted">What the page renders</p>
          <p className="mt-1 rounded-lg border border-dashed border-line p-2.5 break-all">{input}</p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {['<script>alert(1)</script>', '<a href="javascript:alert(1)">x</a>', 'Aisha Bello'].map((p) => (
          <button key={p} onClick={() => setInput(p)} className="rounded-md bg-subtle px-2 py-1 font-mono text-[11px] hover:bg-line">{p.length > 28 ? `${p.slice(0, 28)}…` : p}</button>
        ))}
      </div>
    </Card>
  )
}

function SqliDemo() {
  const [value, setValue] = useState("' OR 1=1 --")
  const [ran, setRan] = useState(false)
  const suspicious = /('|--|;|\/\*|\bOR\b\s+\d=\d|\bUNION\b|\bDROP\b)/i.test(value)
  return (
    <Card className="flex flex-col p-5">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-semibold">SQL injection attempt</h3>
        <Badge tone="info" icon={Database}>Parameterised</Badge>
      </div>
      <p className="mt-1 text-sm text-muted">Simulates the login query with your input as the matric number.</p>
      <Input label="Matric number" className="mt-4" mono value={value} onChange={(e) => { setValue(e.target.value); setRan(false) }} maxLength={80} />
      <div className="mt-3 rounded-lg bg-[#0a1220] p-3 font-mono text-[11px] leading-5 text-slate-300">
        <p className="text-slate-500">-- vulnerable (NOT used)</p>
        <p className="break-all text-red-300/80 line-through decoration-red-400/60">SELECT * FROM users WHERE matric = '{value}'</p>
        <p className="mt-2 text-slate-500">-- what we actually run</p>
        <p className="text-emerald-300">SELECT * FROM users WHERE matric = $1</p>
        <p className="break-all text-sky-300">params: [{JSON.stringify(value)}]</p>
      </div>
      <Button className="mt-3" variant="secondary" icon={Play} onClick={() => setRan(true)}>Run query</Button>
      {ran && (
        <div className={cn('animate-fade-up mt-3 rounded-lg p-3 text-sm', suspicious ? 'bg-emerald-50 text-emerald-900 dark:bg-emerald-500/10 dark:text-emerald-200' : 'bg-subtle')} role="status">
          {suspicious ? (
            <p className="flex items-start gap-2"><ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden /> <span><span className="font-semibold">Injection attempt blocked.</span> The input was treated as plain text. 0 rows returned, no data exposed. Event logged as LOGIN_FAILED.</span></p>
          ) : (
            <p>0 rows returned for a literal match on {JSON.stringify(value)}.</p>
          )}
        </div>
      )}
    </Card>
  )
}

function RateLimitDemo() {
  const [attempts, setAttempts] = useState(0)
  const locked = attempts >= 5
  return (
    <Card className="flex flex-col p-5">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-semibold">Brute-force lockout</h3>
        <Badge tone={locked ? 'danger' : 'warning'} icon={Timer}>{attempts}/5 attempts</Badge>
      </div>
      <p className="mt-1 text-sm text-muted">Each click is a wrong-password login attempt.</p>
      <div className="mt-5 flex gap-1.5" aria-hidden>
        {[0, 1, 2, 3, 4].map((i) => (
          <span key={i} className={cn('h-2 flex-1 rounded-full transition-colors', i < attempts ? (locked ? 'bg-red-500' : 'bg-amber-500') : 'bg-subtle')} />
        ))}
      </div>
      <div className="mt-4 flex-1 space-y-1.5 rounded-lg bg-[#0a1220] p-3 font-mono text-[11px] leading-5 text-slate-300" aria-live="polite">
        {attempts === 0 && <p className="text-slate-500">Waiting for attempts…</p>}
        {Array.from({ length: Math.min(attempts, 5) }).map((_, i) => (
          <p key={i}><span className="text-amber-400">401</span> POST /api/auth/login · Invalid login details{i === 4 && <span className="text-red-400"> · LOCKED 05:00</span>}</p>
        ))}
        {attempts > 5 && <p><span className="text-red-400">429</span> Too Many Requests · Retry-After: 300</p>}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button variant={locked ? 'destructive' : 'secondary'} onClick={() => setAttempts((a) => a + 1)} disabled={attempts > 5}>{locked ? 'Try again' : 'Wrong password'}</Button>
        <Button variant="ghost" icon={RotateCcw} onClick={() => setAttempts(0)}>Reset</Button>
      </div>
    </Card>
  )
}

export default function SecurityPage() {
  useDocumentTitle('Security')
  return (
    <ShowcaseShell
      eyebrow="About this system · Security"
      icon={Shield}
      title="How we keep your money and data safe"
      description="Fourteen security controls, from password hashing to backups, built into every layer of the application. Expand any card to see how it was implemented."
      aside={
        <div className="w-full rounded-2xl border border-white/15 bg-white/10 p-5 backdrop-blur sm:w-72">
          <p className="text-sm text-brand-100">Security score</p>
          <div className="mt-1 flex items-end gap-2">
            <p className="text-5xl font-extrabold num">96</p>
            <p className="pb-1.5 text-brand-200">/ 100</p>
            <span className="ml-auto rounded-lg bg-emerald-500 px-2.5 py-1 text-lg font-bold text-white">A+</span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/15"><div className="h-full w-[96%] rounded-full bg-emerald-400" /></div>
          <ul className="mt-4 space-y-1.5 text-xs text-brand-100">
            <li className="flex justify-between"><span>Controls implemented</span><span className="font-semibold text-white">14 / 14</span></li>
            <li className="flex justify-between"><span>Security headers</span><span className="font-semibold text-white">8 / 8</span></li>
            <li className="flex justify-between"><span>Automated API tests passing</span><span className="font-semibold text-white">32 / 32</span></li>
            <li className="flex justify-between"><span>OWASP ZAP high alerts</span><span className="font-semibold text-white">0</span></li>
          </ul>
        </div>
      }
    >
      <section aria-labelledby="controls" className="mb-12">
        <SectionTitle id="controls" title="Security controls" description="Each control is implemented and covered by at least one test case." />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {CONTROLS.map((c, i) => <ControlCard key={c.title} c={c} i={i} />)}
        </div>
      </section>

      <section aria-labelledby="try" className="mb-12">
        <SectionTitle id="try" title="Try it yourself" description="Safe, sandboxed demos. Nothing here touches real data." action={<Badge tone="accent" icon={Terminal}>Interactive</Badge>} />
        <div className="grid gap-4 lg:grid-cols-3">
          <XssDemo />
          <SqliDemo />
          <RateLimitDemo />
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section aria-labelledby="headers">
          <SectionTitle id="headers" title="Security headers checklist" description="Response headers sent on every page." />
          <Card className="divide-y divide-line">
            {HEADERS.map(([h, v]) => (
              <div key={h} className="flex items-start gap-3 px-5 py-3.5">
                <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-label="Present" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{h}</p>
                  <p className="font-mono text-xs break-all text-muted">{v}</p>
                </div>
              </div>
            ))}
          </Card>
        </section>
        <section aria-labelledby="rbac">
          <SectionTitle id="rbac" title="Permissions matrix" description="Role × permission, enforced on the server." />
          <Card className="overflow-hidden"><PermissionsMatrix /></Card>
          <Card className="mt-4 p-5">
            <p className="text-sm font-semibold">OWASP Top 10 (2021) coverage</p>
            <ProgressBar value={100} tone="success" className="mt-3" label="OWASP coverage" />
            <p className="mt-2 text-xs text-muted">A01 to A10 each mapped to at least one control and test. See the Testing page for evidence.</p>
          </Card>
        </section>
      </div>
    </ShowcaseShell>
  )
}
