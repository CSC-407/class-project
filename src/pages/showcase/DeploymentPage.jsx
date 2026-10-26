import { useState } from 'react'
import {
  Rocket, Code2, GitBranch, TestTube2, Server, Globe, Copy, Check, Lock, DatabaseBackup, Activity, Undo2, ShieldCheck, Eye, EyeOff, Database, Cloud, CheckCircle2,
} from 'lucide-react'
import { Card, CardHeader, Table, Th, Td, Badge, StatusChip, Button, DefinitionList } from '../../components/ui'
import { ShowcaseShell, SectionTitle } from './ShowcaseShell'
import { useToast } from '../../context/ToastContext'
import { cn } from '../../lib/format'
import { useDocumentTitle } from '../../lib/hooks'

const PIPELINE = [
  { icon: Code2, title: 'Development', sub: 'Local, feature branches', detail: 'Vite dev server, ESLint, Prettier' },
  { icon: GitBranch, title: 'Version control', sub: 'Git + GitHub', detail: 'PR review required on main' },
  { icon: TestTube2, title: 'Build and test', sub: 'GitHub Actions CI', detail: 'Lint → unit → E2E → build → npm audit' },
  { icon: Server, title: 'Staging', sub: 'Auto-deploy from main', detail: 'Smoke tests, ZAP baseline scan' },
  { icon: Globe, title: 'Production', sub: 'Manual promotion', detail: 'Tagged release, zero-downtime' },
]

const ENVS = [
  { env: 'Local', url: 'http://localhost:5173', db: 'PostgreSQL 16 (Docker)', diff: 'Debug logs, seeded demo data, gateway sandbox keys', status: 'active' },
  { env: 'Staging', url: 'https://staging.fees.kingsgate.edu.ng', db: 'Neon Postgres (staging branch)', diff: 'Production-like, anonymised data copy, test gateway', status: 'active' },
  { env: 'Production', url: 'https://fees.kingsgate.edu.ng', db: 'Neon Postgres (primary + read replica)', diff: 'Live gateway keys, error tracking, HSTS preload, no debug', status: 'active' },
]

const ENV_VARS = [
  ['NODE_ENV', 'production'],
  ['DATABASE_URL', 'postgres://kgu_app:s3cr3t@ep-prod.neon.tech/fees'],
  ['SESSION_SECRET', 'b7f2c9…e41a'],
  ['CSRF_SECRET', '91ad3e…0cc2'],
  ['PAYSTACK_SECRET_KEY', 'sk_live_4f…a9'],
  ['PAYSTACK_WEBHOOK_SECRET', 'whsec_…'],
  ['FIELD_ENCRYPTION_KEY', 'aes256:…'],
  ['SMTP_PASSWORD', '…'],
  ['SENTRY_DSN', 'https://…@sentry.io/…'],
  ['ALLOWED_ORIGINS', 'https://fees.kingsgate.edu.ng'],
]

const STEPS = [
  { title: 'Clone and install', cmd: 'git clone https://github.com/Benzone200/School-fees-management-system-CSC407-.git\ncd School-fees-management-system-CSC407-\nnpm install         # also installs server/ dependencies' },
  { title: 'Configure environment', cmd: 'cp server/.env.example server/.env\n# set COOKIE_SECURE=true, unset DEMO_OTP; never commit .env' },
  { title: 'Run database migrations', cmd: 'npm run db:setup     # creates the schema and seeds demo data if empty\nnpm run db:reset     # wipe and reseed (development only)' },
  { title: 'Run the test suite', cmd: 'npm test            # 32 API tests against a fresh test database' },
  { title: 'Build for production', cmd: 'npm run build   # outputs to dist/' },
  { title: 'Deploy', cmd: 'NODE_ENV=production npm start   # API also serves the built frontend from dist/' },
  { title: 'Verify', cmd: 'curl -sI https://fees.kingsgate.edu.ng | grep -i strict-transport\nnpm run smoke -- --env=production' },
]

function CodeBlock({ code }) {
  const [copied, setCopied] = useState(false)
  const toast = useToast()
  return (
    <div className="group relative mt-2 overflow-hidden rounded-lg bg-[#0a1220]">
      <pre className="overflow-x-auto p-4 pr-14 font-mono text-xs leading-relaxed text-slate-200"><code>{code}</code></pre>
      <button
        onClick={() => {
          navigator.clipboard?.writeText(code)
          setCopied(true)
          toast('Command copied', { type: 'info', duration: 1500 })
          setTimeout(() => setCopied(false), 1500)
        }}
        className="absolute top-2 right-2 flex size-9 items-center justify-center rounded-md bg-white/10 text-slate-300 hover:bg-white/20"
        aria-label="Copy command"
      >
        {copied ? <Check className="size-4 text-emerald-400" /> : <Copy className="size-4" />}
      </button>
    </div>
  )
}

export default function DeploymentPage() {
  useDocumentTitle('Deployment')
  const [reveal, setReveal] = useState(false)
  return (
    <ShowcaseShell
      eyebrow="About this system · Deployment"
      icon={Rocket}
      title="From commit to production"
      description="An automated pipeline with separate environments, managed secrets, HTTPS everywhere, monitoring, backups and a tested rollback plan."
      aside={
        <div className="grid grid-cols-2 gap-3 sm:w-72">
          {[['Deploys / month', '24'], ['Avg. pipeline', '6m 40s'], ['Change fail rate', '4%'], ['Time to restore', '< 15m']].map(([k, v]) => (
            <div key={k} className="rounded-xl border border-white/15 bg-white/10 p-3 backdrop-blur">
              <p className="text-xl font-bold num">{v}</p>
              <p className="text-xs text-brand-200">{k}</p>
            </div>
          ))}
        </div>
      }
    >
      <section aria-labelledby="pipeline" className="mb-12">
        <SectionTitle id="pipeline" title="CI/CD pipeline" description="Every change goes through the same automated gates." />
        <Card className="p-5 sm:p-8">
          <ol className="flex flex-col gap-0 md:flex-row md:items-start">
            {PIPELINE.map((p, i) => (
              <li key={p.title} className="relative flex flex-1 gap-4 pb-8 md:flex-col md:items-center md:pb-0 md:text-center">
                {i < PIPELINE.length - 1 && (
                  <span className="absolute top-12 bottom-0 left-6 w-0.5 bg-gradient-to-b from-brand-400 to-brand-200 md:top-6 md:right-[-50%] md:bottom-auto md:left-[50%] md:h-0.5 md:w-auto md:bg-gradient-to-r dark:from-brand-400 dark:to-brand-700" aria-hidden />
                )}
                <span className={cn('relative z-10 flex size-12 shrink-0 items-center justify-center rounded-2xl shadow-soft', i === PIPELINE.length - 1 ? 'bg-emerald-600 text-white' : 'bg-brand-800 text-white dark:bg-brand-500')}>
                  <p.icon className="size-5" aria-hidden />
                </span>
                <div className="md:mt-3 md:px-2">
                  <p className="text-xs font-semibold text-muted">STAGE {i + 1}</p>
                  <p className="font-semibold">{p.title}</p>
                  <p className="text-sm text-muted">{p.sub}</p>
                  <p className="mt-1 text-xs text-muted">{p.detail}</p>
                </div>
              </li>
            ))}
          </ol>
        </Card>
      </section>

      <section aria-labelledby="envs" className="mb-12">
        <SectionTitle id="envs" title="Environments" />
        <Card>
          <Table>
            <thead><tr><Th>Environment</Th><Th>URL</Th><Th className="hidden md:table-cell">Database</Th><Th className="hidden lg:table-cell">Configuration differences</Th><Th>Status</Th></tr></thead>
            <tbody>
              {ENVS.map((e) => (
                <tr key={e.env} className="align-top hover:bg-subtle/60">
                  <Td className="font-semibold">{e.env}</Td>
                  <Td className="font-mono text-xs break-all">{e.url}</Td>
                  <Td className="hidden md:table-cell">{e.db}</Td>
                  <Td className="hidden text-muted lg:table-cell">{e.diff}</Td>
                  <Td><StatusChip status={e.status} label="Healthy" /></Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      </section>

      <section aria-labelledby="config" className="mb-12">
        <SectionTitle id="config" title="Configuration overview" />
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader
              title="Environment variables"
              description="Secrets are stored in the host’s encrypted vault, never in Git."
              icon={Lock}
              action={<Button size="sm" variant="ghost" icon={reveal ? EyeOff : Eye} onClick={() => setReveal((r) => !r)}>{reveal ? 'Hide names only' : 'Show names'}</Button>}
            />
            <ul className="mt-3 divide-y divide-line font-mono text-xs">
              {ENV_VARS.map(([k]) => (
                <li key={k} className="flex items-center justify-between gap-3 px-5 py-2.5">
                  <span className="font-semibold">{reveal ? k : `${k.slice(0, 3)}${'•'.repeat(Math.max(3, k.length - 3))}`}</span>
                  <span className="tracking-widest text-muted" aria-label="Value hidden">••••••</span>
                </li>
              ))}
            </ul>
            <p className="px-5 py-4 text-xs text-muted">Values are never shown in the UI. Rotating a secret triggers a redeploy.</p>
          </Card>
          <div className="space-y-6">
            <Card>
              <CardHeader title="Database" icon={Database} />
              <div className="p-5"><DefinitionList items={[['Engine', 'PostgreSQL 16 (Neon)'], ['Pooling', 'PgBouncer, 20 connections'], ['Encryption', 'AES-256 at rest, TLS in transit'], ['Migrations', 'Prisma Migrate, versioned'], ['App DB role', 'Least privilege (no DDL)'], ['Region', 'eu-central-1']]} /></div>
            </Card>
            <Card>
              <CardHeader title="Server and hosting" icon={Cloud} />
              <div className="p-5"><DefinitionList items={[['Frontend', 'Vercel (edge CDN)'], ['API', 'Node.js 22 on Render'], ['Domain', 'fees.kingsgate.edu.ng'], ['DNS', 'Cloudflare (DNSSEC on)'], ['Compression', 'Brotli + gzip'], ['WAF', 'Cloudflare managed rules']]} /></div>
            </Card>
          </div>
        </div>
      </section>

      <section aria-labelledby="steps" className="mb-12">
        <SectionTitle id="steps" title="Deployment steps" description="Run these in order. Every command is copyable." />
        <Card className="p-5 sm:p-6">
          <ol className="space-y-6">
            {STEPS.map((s, i) => (
              <li key={s.title} className="flex gap-4">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-800 dark:bg-brand-500/20 dark:text-brand-100">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="pt-1 font-semibold">{s.title}</p>
                  <CodeBlock code={s.cmd} />
                </div>
              </li>
            ))}
          </ol>
        </Card>
      </section>

      <section aria-labelledby="ops">
        <SectionTitle id="ops" title="Operations" />
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader title="HTTPS / SSL certificate" icon={ShieldCheck} action={<StatusChip status="active" label="Valid" />} />
            <div className="p-5"><DefinitionList items={[['Issuer', "Let's Encrypt (R11)"], ['Protocol', 'TLS 1.3 only'], ['Issued', '14 Aug 2026'], ['Expires', '12 Nov 2026 (auto-renews)'], ['SSL Labs grade', <Badge tone="success">A+</Badge>], ['HSTS', 'Preloaded']]} /></div>
          </Card>
          <Card>
            <CardHeader title="Backup strategy" icon={DatabaseBackup} />
            <div className="p-5"><DefinitionList items={[['Frequency', 'Nightly snapshot + continuous WAL'], ['Retention', '7 daily, 4 weekly, 12 monthly'], ['Storage', 'Encrypted, off-site (separate region)'], ['Restore test', 'Monthly, to staging'], ['RPO / RTO', '24 h / 2 h']]} />
              <p className="mt-4 text-sm text-muted"><span className="font-medium text-fg">Restore:</span> pick a snapshot → restore to a new branch → run integrity checks → switch DATABASE_URL → verify with smoke tests.</p>
            </div>
          </Card>
          <Card>
            <CardHeader title="Monitoring and logging" icon={Activity} />
            <ul className="space-y-3 p-5 text-sm">
              {[
                ['Error tracking', 'Sentry: alerts on new issues and error spikes'],
                ['Uptime', 'Better Stack: 1-min checks from 3 regions, SMS on-call'],
                ['Logs', 'Structured JSON → Logtail, 30-day retention; audit log in DB for 7 years'],
                ['Metrics', 'p95 latency, error rate and payment success rate dashboards'],
              ].map(([k, v]) => (
                <li key={k} className="flex gap-2"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden /><span><span className="font-medium">{k}:</span> <span className="text-muted">{v}</span></span></li>
              ))}
            </ul>
          </Card>
          <Card>
            <CardHeader title="Rollback plan" icon={Undo2} />
            <ol className="list-decimal space-y-2 p-5 pl-10 text-sm">
              <li>Detect: alert fires or smoke test fails after release.</li>
              <li>Promote the previous build instantly (<span className="font-mono text-xs">vercel rollback</span> / Render “Rollback”).</li>
              <li>Migrations are backward-compatible (expand, then contract), so the old code runs against the new schema.</li>
              <li>If data is affected: point-in-time restore to a branch, reconcile, then switch.</li>
              <li>Post-incident review within 48 h, recorded in the Review page.</li>
            </ol>
          </Card>
        </div>
      </section>
    </ShowcaseShell>
  )
}
