import { Link } from 'react-router-dom'
import {
  Lock, ReceiptText, UserCheck, ScrollText, UserPlus, Wallet, CreditCard, ArrowRight, ShieldCheck, KeyRound, Fingerprint,
  Timer, CheckCircle2, QrCode, GraduationCap, Building2, Sparkles, Copy,
} from 'lucide-react'
import { Button, Card, ProgressBar, StatusChip, Badge } from '../../components/ui'
import { naira } from '../../lib/format'
import { useToast } from '../../context/ToastContext'

function HeroVisual() {
  return (
    <div className="relative mx-auto w-full max-w-md lg:max-w-none" aria-hidden>
      <div className="absolute -inset-6 rounded-[32px] bg-gradient-to-br from-brand-200/70 via-transparent to-accent-300/40 blur-2xl dark:from-brand-500/20 dark:to-accent-500/10" />
      <Card className="relative overflow-hidden p-0">
        <div className="bg-brand-900 p-5 text-white dark:bg-brand-950">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-brand-200">Outstanding balance · 2025/2026</p>
              <p className="mt-1 text-3xl font-bold num">{naira(392500)}</p>
            </div>
            <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-semibold">65% paid</span>
          </div>
          <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-white/15">
            <div className="h-full w-[65%] rounded-full bg-accent-400" />
          </div>
        </div>
        <div className="divide-y divide-line">
          {[
            ['Tuition fee (Second Semester)', 275000, 'partial'],
            ['Hostel accommodation', 60000, 'overdue'],
            ['Library fee', 0, 'paid'],
          ].map(([name, bal, st]) => (
            <div key={name} className="flex items-center justify-between gap-3 px-5 py-3.5">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{name}</p>
                <p className="text-xs text-muted num">Balance {naira(bal)}</p>
              </div>
              <StatusChip status={st} />
            </div>
          ))}
        </div>
        <div className="p-5 pt-3">
          <div className="flex h-11 items-center justify-center gap-2 rounded-lg bg-accent-500 text-sm font-semibold text-brand-950">
            <CreditCard className="size-4" /> Pay now
          </div>
        </div>
      </Card>
      <Card className="animate-fade-up absolute -bottom-6 -left-4 hidden items-center gap-3 p-3 pr-5 sm:flex">
        <span className="flex size-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
          <CheckCircle2 className="size-5" />
        </span>
        <div>
          <p className="text-sm font-semibold">Payment confirmed</p>
          <p className="font-mono text-xs text-muted">RCP-2026-000163</p>
        </div>
      </Card>
      <Card className="absolute -top-5 -right-3 hidden items-center gap-2 px-3 py-2 sm:flex">
        <Lock className="size-4 text-emerald-600" />
        <span className="text-xs font-semibold">256-bit TLS</span>
      </Card>
    </div>
  )
}

function DemoAccounts() {
  const toast = useToast()
  const accounts = [
    { role: 'Student', icon: GraduationCap, id: '21/0345', pw: 'Student@123', note: 'Chinedu Okafor, Computer Engineering' },
    { role: 'Bursary Admin', icon: Building2, id: 'bursar@kingsgate.edu.ng', pw: 'Admin@123', note: 'Requires OTP: 123456' },
    { role: 'Super Admin', icon: KeyRound, id: 'sysadmin@kingsgate.edu.ng', pw: 'Super@123', note: 'Requires OTP: 123456' },
  ]
  const copy = (text) => {
    navigator.clipboard?.writeText(text)
    toast(`Copied “${text}”`, { type: 'info', duration: 2000 })
  }
  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6" aria-labelledby="demo-heading">
      <Card className="overflow-hidden">
        <div className="flex flex-col gap-2 border-b border-line bg-subtle/60 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 id="demo-heading" className="flex items-center gap-2 text-lg font-semibold">
              <Sparkles className="size-5 text-accent-500" aria-hidden /> Demo accounts for reviewers
            </h2>
            <p className="text-sm text-muted">Use these to explore each role. All payments run in Test Mode.</p>
          </div>
          <Badge tone="accent">Test Mode</Badge>
        </div>
        <div className="grid divide-y divide-line md:grid-cols-3 md:divide-x md:divide-y-0">
          {accounts.map((a) => (
            <div key={a.role} className="p-6">
              <div className="flex items-center gap-2">
                <a.icon className="size-5 text-brand-600 dark:text-brand-300" aria-hidden />
                <p className="font-semibold">{a.role}</p>
              </div>
              <p className="mt-1 text-xs text-muted">{a.note}</p>
              <dl className="mt-4 space-y-2 text-sm">
                {[['Login', a.id], ['Password', a.pw]].map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between gap-2 rounded-lg bg-subtle px-3 py-2">
                    <dt className="text-muted">{k}</dt>
                    <dd className="flex min-w-0 items-center gap-1">
                      <span className="truncate font-mono text-xs">{v}</span>
                      <button onClick={() => copy(v)} className="rounded p-1 text-muted hover:text-fg" aria-label={`Copy ${k.toLowerCase()} for ${a.role}`}>
                        <Copy className="size-3.5" />
                      </button>
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
        </div>
      </Card>
    </section>
  )
}

export default function Landing() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[520px] bg-gradient-to-b from-brand-50 to-transparent dark:from-brand-950/60" aria-hidden />
        <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-4 pt-12 pb-20 sm:px-6 lg:grid-cols-2 lg:pt-20 lg:pb-28">
          <div>
            <Badge tone="brand" icon={ShieldCheck}>Official Kingsgate University fees portal</Badge>
            <h1 className="mt-5 text-4xl leading-[1.1] font-extrabold tracking-tight sm:text-5xl lg:text-[56px]">
              Pay school fees <span className="text-brand-600 dark:text-brand-300">securely</span>, from anywhere.
            </h1>
            <p className="mt-5 max-w-xl text-lg text-muted">
              See exactly what you owe, pay in full or in installments, and get an instant receipt that anyone can verify. No queues, no lost paper.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button to="/login" size="lg" iconRight={ArrowRight}>Log in</Button>
              <Button to="/register" size="lg" variant="secondary" icon={UserPlus}>Create account</Button>
            </div>
            <p className="mt-6 flex items-center gap-2 text-sm text-muted">
              <Timer className="size-4" aria-hidden /> Most students pay in under 60 seconds after signing in.
            </p>
          </div>
          <HeroVisual />
        </div>
      </section>

      {/* Trust strip */}
      <section aria-label="Why it’s safe" className="border-y border-line bg-card">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-4 py-8 sm:px-6 md:grid-cols-4">
          {[
            [Lock, 'Encrypted', 'TLS 1.3 everywhere'],
            [ReceiptText, 'Instant receipts', 'QR-verifiable PDFs'],
            [UserCheck, 'Role-based access', 'Student, Admin, Super Admin'],
            [ScrollText, 'Audit trail', 'Every change is recorded'],
          ].map(([Icon, title, sub]) => (
            <div key={title} className="flex items-center gap-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-200">
                <Icon className="size-5" aria-hidden />
              </span>
              <div>
                <p className="text-sm font-semibold">{title}</p>
                <p className="text-xs text-muted">{sub}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6" aria-labelledby="how-heading">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold tracking-wider text-accent-600 uppercase dark:text-accent-400">How it works</p>
          <h2 id="how-heading" className="mt-2 text-3xl font-bold tracking-tight">Three steps to a cleared balance</h2>
        </div>
        <ol className="relative mt-12 grid gap-6 md:grid-cols-3">
          <div className="absolute top-10 right-[16%] left-[16%] hidden h-0.5 bg-gradient-to-r from-brand-200 via-brand-300 to-brand-200 md:block dark:from-brand-700 dark:via-brand-600 dark:to-brand-700" aria-hidden />
          {[
            [UserPlus, 'Register', 'Create your account with your matric number and verify your email.'],
            [Wallet, 'View your fees', 'See every fee for your session, what you’ve paid, and what’s due next.'],
            [CreditCard, 'Pay and get a receipt', 'Pay by card, transfer or USSD. Your receipt is ready instantly.'],
          ].map(([Icon, title, body], i) => (
            <li key={title} className="relative">
              <Card className="h-full p-6 text-center">
                <span className="relative mx-auto flex size-14 items-center justify-center rounded-2xl bg-brand-800 text-white shadow-lg dark:bg-brand-500">
                  <Icon className="size-6" aria-hidden />
                  <span className="absolute -top-2 -right-2 flex size-6 items-center justify-center rounded-full bg-accent-500 text-xs font-bold text-brand-950">{i + 1}</span>
                </span>
                <h3 className="mt-5 text-lg font-semibold">{title}</h3>
                <p className="mt-2 text-sm text-muted">{body}</p>
              </Card>
            </li>
          ))}
        </ol>
      </section>

      {/* Security preview */}
      <section className="bg-brand-900 text-white dark:bg-[#0c1626]" aria-labelledby="sec-heading">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[1fr_1.3fr] lg:items-center">
          <div>
            <p className="text-sm font-semibold tracking-wider text-accent-300 uppercase">Security first</p>
            <h2 id="sec-heading" className="mt-2 text-3xl font-bold tracking-tight">Built to protect your money and your data</h2>
            <p className="mt-4 text-brand-100">
              Fourteen security controls are built into this platform, from hashed passwords to rate limiting. Each one is documented, and you can try some of them yourself.
            </p>
            <Button to="/project/security" variant="accent" className="mt-8" iconRight={ArrowRight}>See how we keep you safe</Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              [Fingerprint, 'Hashed passwords', 'bcrypt with per-user salt. We can’t see your password.'],
              [KeyRound, 'Two-factor for staff', 'Admin sign-in requires a one-time code.'],
              [Timer, 'Lockout and rate limits', '5 failed logins locks the account for 5 minutes.'],
              [QrCode, 'Verifiable receipts', 'Scan the QR code to confirm any receipt is genuine.'],
            ].map(([Icon, title, body]) => (
              <div key={title} className="rounded-xl border border-white/10 bg-white/5 p-5">
                <Icon className="size-6 text-accent-300" aria-hidden />
                <h3 className="mt-3 font-semibold">{title}</h3>
                <p className="mt-1 text-sm text-brand-200">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <DemoAccounts />

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6">
        <Card className="flex flex-col items-start justify-between gap-6 bg-gradient-to-br from-brand-50 to-card p-8 sm:flex-row sm:items-center dark:from-brand-500/10">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Ready to clear your fees?</h2>
            <p className="mt-1 text-muted">Have a receipt to check? <Link to="/verify-receipt" className="font-medium text-brand-700 underline dark:text-brand-300">Verify it here</Link>.</p>
          </div>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <Button to="/register" size="lg" variant="accent">Create account</Button>
            <Button to="/login" size="lg" variant="secondary">Log in</Button>
          </div>
        </Card>
        <div className="mt-10">
          <p className="text-center text-sm text-muted">Collection progress this session</p>
          <div className="mx-auto mt-2 max-w-md">
            <ProgressBar value={71} label="Collection progress" tone="success" />
            <p className="mt-2 text-center text-xs text-muted num">71% of {naira(4870000000, { compact: true })} expected fees collected</p>
          </div>
        </div>
      </section>
    </>
  )
}
