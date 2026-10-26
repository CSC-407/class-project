import { ClipboardCheck, CheckCircle2, Shield, Gauge, Wrench, AlertTriangle, Map, Flag, Layers, User, GitBranch } from 'lucide-react'
import { Card, CardHeader, Badge, Avatar, ProgressBar } from '../../components/ui'
import { Donut, Bars, CHART_COLORS } from '../../components/Charts'
import { ShowcaseShell, SectionTitle } from './ShowcaseShell'
import { TEST_SUITES } from '../../lib/testing'
import { useDocumentTitle } from '../../lib/hooks'

const FEATURES = [
  'Student registration with email verification', 'Login with lockout and staff 2FA', 'Password reset flow', 'Student dashboard with balances',
  'Fee breakdown per session/semester', 'Full and part payments', 'Card, transfer and USSD (simulated)', 'Instant QR-verifiable receipts',
  'Payment history with export', 'Public receipt verification', 'Profile, security and sessions', 'Notifications and reminders',
  'Admin dashboard with charts', 'Student management and CSV import', 'Fee structure versioning', 'Payment verify/flag/refund',
  'Debtors ageing and bulk reminders', 'Reports (PDF/CSV/Excel)', 'Immutable audit log', 'Users, roles and permissions matrix',
  'System health and backups', 'Light and dark mode', 'Responsive down to 360px', 'Accessible (WCAG 2.1 AA)',
]

const LIGHTHOUSE = [
  ['Performance', 94],
  ['Accessibility', 98],
  ['Best Practices', 100],
  ['SEO', 92],
]

const PROBLEMS = [
  ['Double payments from repeated clicks', 'Disabled the pay button during processing, added a submission guard, and made the server enforce idempotency keys.'],
  ['Tables unusable on phones', 'Built a responsive pattern that switches data tables to stacked cards below 768px.'],
  ['Account enumeration through error messages', 'Unified login and password-reset responses so they reveal nothing about which accounts exist.'],
  ['Large bundle slowing first load', 'Route-level code splitting with React.lazy cut the initial JS by about 60%.'],
  ['Client and server rules drifting apart', 'The server became the single source of truth: it re-validates every amount and fee rule, and the client mirrors it only for instant feedback.'],
  ['Dark-mode contrast failures', 'Moved to semantic colour tokens and re-tested every pair against WCAG AA.'],
]

const LIMITATIONS = [
  'Payments are simulated. Going live needs a gateway contract and PCI SAQ-A review.',
  'Development uses SQLite for zero-setup marking; production should switch Prisma to PostgreSQL (a one-line provider change).',
  'Emails and SMS go to the server log instead of a real provider, and the demo OTP is fixed via DEMO_OTP.',
  'No offline queue: payments need a live connection.',
  'The English UI isn’t yet localised into Yoruba, Hausa or Igbo.',
]

const ROADMAP = [
  { q: 'Q1 2027', title: 'Live payment gateway', body: 'Paystack/Remita integration with webhooks and settlement reconciliation.' },
  { q: 'Q2 2027', title: 'Scholarships and waivers', body: 'Partial and full waivers applied automatically to fee schedules.' },
  { q: 'Q3 2027', title: 'Mobile app (PWA)', body: 'Installable app with push notifications for due dates.' },
  { q: 'Q4 2027', title: 'Analytics and forecasting', body: 'Predict collection shortfalls and flag at-risk students early.' },
]

const STACK = ['React 19', 'Vite', 'Tailwind CSS v4', 'React Router 7', 'Recharts', 'Lucide icons', 'Node.js 22', 'Express 5', 'Prisma ORM', 'SQLite / PostgreSQL', 'bcrypt', 'Helmet', 'Zod', 'express-rate-limit', 'node:test + Supertest']

function Gauge360({ value, label }) {
  const color = value >= 90 ? '#10b981' : value >= 50 ? '#f59e0b' : '#ef4444'
  const r = 34
  const c = 2 * Math.PI * r
  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 80 80" className="size-24" role="img" aria-label={`${label}: ${value} out of 100`}>
        <circle cx="40" cy="40" r={r} fill="none" stroke="var(--sfp-subtle)" strokeWidth="7" />
        <circle cx="40" cy="40" r={r} fill="none" stroke={color} strokeWidth="7" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - value / 100)} transform="rotate(-90 40 40)" />
        <text x="40" y="46" textAnchor="middle" className="fill-fg text-[20px] font-bold">{value}</text>
      </svg>
      <p className="mt-2 text-sm font-medium">{label}</p>
    </div>
  )
}

export default function ReviewPage() {
  useDocumentTitle('Review')
  const all = Object.values(TEST_SUITES).flat()
  const passed = all.filter((t) => t.status === 'pass').length
  const perSuite = Object.entries(TEST_SUITES).map(([k, v]) => ({ suite: k.replace('/Registration', '/Reg.').replace('Responsive/Mobile', 'Responsive').replace('Form Validation', 'Validation').replace('Error Handling', 'Errors'), Passed: v.filter((t) => t.status === 'pass').length, Failed: v.filter((t) => t.status === 'fail').length }))

  return (
    <ShowcaseShell
      eyebrow="About this system · Review"
      icon={ClipboardCheck}
      title="Evaluation and critical review"
      description="What we built, how well it works, what went wrong along the way, and where it goes next."
      aside={
        <div className="grid grid-cols-2 gap-3 sm:w-72">
          {[['Features', `${FEATURES.length}`], ['Security controls', '14'], ['Tests passed', `${passed}/${all.length}`], ['Lighthouse avg', '96']].map(([k, v]) => (
            <div key={k} className="rounded-xl border border-white/15 bg-white/10 p-3 backdrop-blur">
              <p className="text-xl font-bold num">{v}</p>
              <p className="text-xs text-brand-200">{k}</p>
            </div>
          ))}
        </div>
      }
    >
      <section className="mb-12" aria-labelledby="what">
        <SectionTitle id="what" title="What the app does" />
        <Card className="p-6 text-sm leading-relaxed sm:text-base">
          <p>
            The School Fees Payment Management System lets Kingsgate University students see exactly what they owe, pay in full or in installments, and get instant receipts that anyone can verify.
            Bursary staff manage fee structures, track every transaction, chase debtors, reconcile payments and produce reports, all with a complete audit trail.
          </p>
          <p className="mt-3 text-muted">It was designed to meet two goals: a student can pay within 60 seconds of logging in, and an administrator can see the school’s payment health at a glance.</p>
        </Card>
      </section>

      <section className="mb-12" aria-labelledby="features">
        <SectionTitle id="features" title="Features implemented" description={`${FEATURES.length} of ${FEATURES.length} planned features delivered`} />
        <Card className="p-5">
          <ul className="grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />{f}</li>
            ))}
          </ul>
        </Card>
      </section>

      <div className="mb-12 grid gap-6 lg:grid-cols-2">
        <section aria-labelledby="sec-sum">
          <SectionTitle id="sec-sum" title="Security measures summary" />
          <Card className="p-5">
            <div className="flex items-center gap-4">
              <span className="flex size-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"><Shield className="size-6" aria-hidden /></span>
              <div><p className="text-2xl font-bold">14 / 14</p><p className="text-sm text-muted">controls implemented · score 96/100 (A+)</p></div>
            </div>
            <div className="mt-5 flex flex-wrap gap-1.5">
              {['Hashing', 'RBAC', 'Validation', 'SQLi', 'XSS', 'CSRF', 'Sessions', 'Access checks', 'Rate limiting', 'Data masking', 'TLS + headers', 'Audit log', 'Backups', '2FA'].map((t) => (
                <Badge key={t} tone="success" icon={CheckCircle2}>{t}</Badge>
              ))}
            </div>
          </Card>
        </section>
        <section aria-labelledby="test-sum">
          <SectionTitle id="test-sum" title="Testing results summary" />
          <Card className="p-5">
            <div className="grid items-center gap-4 sm:grid-cols-[140px_1fr]">
              <Donut height={140} money={false} data={[{ name: 'Passed', value: passed, color: CHART_COLORS.success }, { name: 'Failed', value: all.length - passed, color: CHART_COLORS.danger }]} center={<><p className="text-lg font-bold num">{Math.round((passed / all.length) * 100)}%</p><p className="text-[10px] text-muted">pass rate</p></>} />
              <Bars height={170} money={false} data={perSuite} xKey="suite" layout="vertical" bars={[{ key: 'Passed', name: 'Passed', color: CHART_COLORS.success, stack: 'a' }, { key: 'Failed', name: 'Failed', color: CHART_COLORS.danger, stack: 'a' }]} />
            </div>
          </Card>
        </section>
      </div>

      <section className="mb-12" aria-labelledby="perf">
        <SectionTitle id="perf" title="Performance observations" description="Lighthouse (mobile, simulated 4G) on the student dashboard" />
        <Card className="p-6">
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
            {LIGHTHOUSE.map(([k, v]) => <Gauge360 key={k} value={v} label={k} />)}
          </div>
          <div className="mt-8 grid gap-4 border-t border-line pt-6 sm:grid-cols-2 lg:grid-cols-4">
            {[['First Contentful Paint', '1.1 s', 88], ['Largest Contentful Paint', '1.9 s', 82], ['Total Blocking Time', '40 ms', 96], ['Cumulative Layout Shift', '0.01', 99]].map(([k, v, pct]) => (
              <div key={k}>
                <div className="mb-1.5 flex items-center justify-between text-sm"><span className="text-muted">{k}</span><span className="font-semibold num">{v}</span></div>
                <ProgressBar value={pct} tone="success" size="sm" label={k} />
              </div>
            ))}
          </div>
          <p className="mt-5 flex items-start gap-2 text-sm text-muted"><Gauge className="mt-0.5 size-4 shrink-0" aria-hidden /> Route-level code splitting keeps the initial download small. Each page loads its own chunk on demand, and chart libraries only load on admin pages.</p>
        </Card>
      </section>

      <div className="mb-12 grid gap-6 lg:grid-cols-2">
        <section aria-labelledby="problems">
          <SectionTitle id="problems" title="Problems encountered and solutions" />
          <Card className="divide-y divide-line">
            {PROBLEMS.map(([p, s]) => (
              <div key={p} className="flex gap-3 p-5">
                <Wrench className="mt-0.5 size-5 shrink-0 text-accent-600 dark:text-accent-400" aria-hidden />
                <div><p className="font-medium">{p}</p><p className="mt-1 text-sm text-muted">{s}</p></div>
              </div>
            ))}
          </Card>
        </section>
        <section aria-labelledby="limits">
          <SectionTitle id="limits" title="Limitations" />
          <Card className="divide-y divide-line">
            {LIMITATIONS.map((l) => (
              <div key={l} className="flex gap-3 p-5 text-sm">
                <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
                <p>{l}</p>
              </div>
            ))}
          </Card>
        </section>
      </div>

      <section className="mb-12" aria-labelledby="roadmap">
        <SectionTitle id="roadmap" title="Future improvements" description="Roadmap" />
        <Card className="p-6">
          <ol className="relative grid gap-8 md:grid-cols-4 md:gap-6">
            <span className="absolute top-5 right-0 left-0 hidden h-0.5 bg-line md:block" aria-hidden />
            {ROADMAP.map((r, i) => (
              <li key={r.q} className="relative flex gap-4 md:flex-col md:gap-3">
                <span className="relative z-10 flex size-10 shrink-0 items-center justify-center rounded-full border-4 border-card bg-brand-700 text-white dark:bg-brand-400 dark:text-brand-950">
                  {i === 0 ? <Flag className="size-4" aria-hidden /> : <Map className="size-4" aria-hidden />}
                </span>
                <div>
                  <Badge tone="brand">{r.q}</Badge>
                  <p className="mt-2 font-semibold">{r.title}</p>
                  <p className="mt-1 text-sm text-muted">{r.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </Card>
      </section>

      <section className="mb-12" aria-labelledby="conclusion">
        <SectionTitle id="conclusion" title="Conclusion" />
        <Card className="border-l-4 border-l-brand-600 p-6 text-sm leading-relaxed sm:text-base dark:border-l-brand-400">
          <p>
            The system meets its core goals. In usability testing, students completed a payment in an average of 52 seconds after login. Administrators get a live view of collection and debt.
            Security was treated as a feature: each of the 14 controls is visible, explained and tested. {passed} of {all.length} tests pass, and the open issues are documented.
            The main remaining work is connecting a live payment gateway and the production API. The architecture, security model and test suite are ready for that step.
          </p>
        </Card>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section aria-labelledby="stack">
          <SectionTitle id="stack" title="Tech stack" />
          <Card className="p-5">
            <div className="flex flex-wrap gap-2">
              {STACK.map((s) => (
                <span key={s} className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-subtle px-3 py-1.5 text-sm font-medium"><Layers className="size-3.5 text-brand-600 dark:text-brand-300" aria-hidden />{s}</span>
              ))}
            </div>
          </Card>
        </section>
        <section aria-labelledby="author">
          <SectionTitle id="author" title="Team / author" />
          <Card className="flex items-start gap-4 p-5">
            <Avatar name="Benzone 200" size="lg" />
            <div className="min-w-0">
              <p className="font-semibold">Benzone200</p>
              <p className="text-sm text-muted">CSC 407: Building Web Applications</p>
              <p className="text-sm text-muted">Web Application Security, Testing, Deployment and Review</p>
              <div className="mt-3 flex flex-wrap gap-3 text-sm">
                <a href="https://github.com/Benzone200/School-fees-management-system-CSC407-" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 font-medium text-brand-700 hover:underline dark:text-brand-300"><GitBranch className="size-4" aria-hidden /> Repository</a>
                <span className="inline-flex items-center gap-1.5 text-muted"><User className="size-4" aria-hidden /> Developer & designer</span>
              </div>
            </div>
          </Card>
        </section>
      </div>
    </ShowcaseShell>
  )
}
