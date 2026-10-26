import { useMemo, useState } from 'react'
import { FlaskConical, CheckCircle2, XCircle, Percent, CalendarClock, Image as ImageIcon, SearchX, Users, Quote, Bug, ChevronLeft, ChevronRight, Timer } from 'lucide-react'
import { Card, CardHeader, StatCard, Tabs, SearchInput, SegmentedControl, Table, Th, Td, StatusChip, EmptyState, Modal, Button, ProgressBar, Badge } from '../../components/ui'
import { Donut, CHART_COLORS } from '../../components/Charts'
import { ShowcaseShell, SectionTitle } from './ShowcaseShell'
import { TEST_SUITES, BUGS, USABILITY } from '../../lib/testing'
import { formatDateTime, cn } from '../../lib/format'
import { daysAgo } from '../../lib/data'
import { useDocumentTitle } from '../../lib/hooks'

const ALL = Object.entries(TEST_SUITES).flatMap(([suite, list]) => list.map((t) => ({ ...t, suite })))
const LAST_RUN = daysAgo(1, 18, 42)

function EvidenceImage({ test }) {
  const [failed, setFailed] = useState(false)
  if (!failed) {
    return <img src={`/evidence/${test.id}.png`} alt={`Screenshot evidence for ${test.id}: ${test.title}`} onError={() => setFailed(true)} className="w-full rounded-lg border border-line" />
  }
  // Placeholder until a real screenshot is added to public/evidence/
  return (
    <div className="overflow-hidden rounded-lg border border-line bg-page" role="img" aria-label={`Evidence preview for ${test.id}`}>
      <div className="flex items-center gap-1.5 border-b border-line bg-subtle px-3 py-2">
        <span className="size-2.5 rounded-full bg-red-400" /><span className="size-2.5 rounded-full bg-amber-400" /><span className="size-2.5 rounded-full bg-emerald-400" />
        <span className="ml-3 truncate rounded bg-card px-2 py-0.5 font-mono text-[10px] text-muted">localhost:5173 · {test.suite}</span>
      </div>
      <div className="space-y-3 p-6">
        <div className="h-3 w-1/3 rounded bg-line" />
        <div className="h-2 w-2/3 rounded bg-line/70" />
        <div className={cn('mt-4 rounded-lg border p-4 text-sm', test.status === 'pass' ? 'border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200' : 'border-red-300 bg-red-50 text-red-900 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200')}>
          <p className="font-semibold">{test.title}</p>
          <p className="mt-1 opacity-90">{test.actual}</p>
        </div>
        <div className="grid grid-cols-3 gap-2 pt-2"><div className="h-12 rounded bg-line/60" /><div className="h-12 rounded bg-line/60" /><div className="h-12 rounded bg-line/60" /></div>
      </div>
      <p className="border-t border-line px-3 py-2 text-[11px] text-muted">Preview · add public/evidence/{test.id}.png to show the real screenshot</p>
    </div>
  )
}

export default function TestingPage() {
  useDocumentTitle('Testing')
  const [suite, setSuite] = useState('Functional')
  const [status, setStatus] = useState('all')
  const [q, setQ] = useState('')
  const [lightbox, setLightbox] = useState(null) // index into gallery

  const passed = ALL.filter((t) => t.status === 'pass').length
  const failed = ALL.length - passed
  const rate = Math.round((passed / ALL.length) * 1000) / 10

  const rows = useMemo(
    () => TEST_SUITES[suite].map((t) => ({ ...t, suite })).filter((t) => (status === 'all' || t.status === status) && (!q || `${t.id} ${t.title} ${t.steps} ${t.expected}`.toLowerCase().includes(q.toLowerCase()))),
    [suite, status, q],
  )
  const gallery = rows
  const current = lightbox !== null ? gallery[lightbox] : null

  return (
    <ShowcaseShell
      eyebrow="About this system · Testing"
      icon={FlaskConical}
      title="Test results and evidence"
      description="Functional, security, usability, responsive and database tests, each with steps, expected and actual results, and evidence."
      aside={
        <div className="flex items-center gap-4 rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur">
          <div className="size-28">
            <Donut height={112} money={false} data={[{ name: 'Passed', value: passed, color: '#34d399' }, { name: 'Failed', value: failed, color: '#f87171' }]} center={<p className="text-lg font-bold text-white num">{rate}%</p>} />
          </div>
          <div className="text-sm">
            <p className="text-brand-100">Pass rate</p>
            <p className="font-semibold text-white num">{passed} of {ALL.length} passed</p>
            <p className="mt-2 text-xs text-brand-200">Last run {formatDateTime(LAST_RUN)}</p>
          </div>
        </div>
      }
    >
      <div className="mb-10 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard label="Total tests" value={ALL.length} sub={`${Object.keys(TEST_SUITES).length} suites`} icon={FlaskConical} />
        <StatCard label="Passed" value={passed} sub="Meets expected result" icon={CheckCircle2} tone="success" />
        <StatCard label="Failed" value={failed} sub="Logged in the bug log" icon={XCircle} tone="danger" />
        <StatCard label="Last run" value={new Date(LAST_RUN).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} sub="node:test + Supertest + manual" icon={CalendarClock} tone="info" />
      </div>

      <Card className="mb-10 flex flex-col gap-3 p-5 sm:flex-row sm:items-center">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"><CheckCircle2 className="size-5" aria-hidden /></span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">Automated API test suite: 32 tests, all passing</p>
          <p className="text-sm text-muted">Authentication, lockout, OTP, validation, access control, CSRF, payments, refunds and audit-chain integrity run against a fresh database. Run <code className="rounded bg-subtle px-1.5 py-0.5 font-mono text-xs">npm test</code> to reproduce.</p>
        </div>
        <span className="font-mono text-xs text-muted">server/tests/api.test.js</span>
      </Card>

      <section aria-labelledby="cases" className="mb-12">
        <SectionTitle id="cases" title="Test cases" description="Select a suite. Select “View” to open the screenshot evidence." />
        <Card>
          <div className="px-4 pt-2">
            <Tabs
              value={suite}
              onChange={(s) => { setSuite(s); setLightbox(null) }}
              size="sm"
              tabs={Object.entries(TEST_SUITES).map(([k, list]) => ({ value: k, label: k, count: list.length }))}
            />
          </div>
          <div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row sm:items-center">
            <SearchInput value={q} onChange={setQ} placeholder="Search test cases" label="Search test cases" className="sm:w-72" />
            <div className="sm:ml-auto">
              <SegmentedControl label="Status filter" value={status} onChange={setStatus} options={[{ value: 'all', label: 'All' }, { value: 'pass', label: 'Pass' }, { value: 'fail', label: 'Fail' }]} />
            </div>
          </div>
          {rows.length === 0 ? (
            <EmptyState icon={SearchX} title="No test cases match">Try another search or status.</EmptyState>
          ) : (
            <>
              <Table className="hidden lg:block">
                <thead>
                  <tr><Th>ID</Th><Th>Test case</Th><Th>Steps</Th><Th>Expected result</Th><Th>Actual result</Th><Th>Status</Th><Th>Evidence</Th></tr>
                </thead>
                <tbody>
                  {rows.map((t, i) => (
                    <tr key={t.id} className="align-top hover:bg-subtle/60">
                      <Td className="font-mono text-xs font-semibold whitespace-nowrap">{t.id}</Td>
                      <Td className="min-w-40 font-medium">{t.title}</Td>
                      <Td className="min-w-48 text-muted">{t.steps}</Td>
                      <Td className="min-w-48">{t.expected}</Td>
                      <Td className="min-w-48 text-muted">{t.actual}</Td>
                      <Td><StatusChip status={t.status} /></Td>
                      <Td><Button size="sm" variant="ghost" icon={ImageIcon} onClick={() => setLightbox(i)} aria-label={`View screenshot evidence for ${t.id}`}>View</Button></Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
              <ul className="divide-y divide-line lg:hidden">
                {rows.map((t, i) => (
                  <li key={t.id} className="space-y-2 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-medium"><span className="mr-2 font-mono text-xs text-muted">{t.id}</span>{t.title}</p>
                      <StatusChip status={t.status} />
                    </div>
                    <dl className="space-y-1.5 text-sm">
                      <div><dt className="text-xs text-muted">Steps</dt><dd>{t.steps}</dd></div>
                      <div><dt className="text-xs text-muted">Expected</dt><dd>{t.expected}</dd></div>
                      <div><dt className="text-xs text-muted">Actual</dt><dd>{t.actual}</dd></div>
                    </dl>
                    <Button size="sm" variant="secondary" icon={ImageIcon} onClick={() => setLightbox(i)}>View evidence</Button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Card>
      </section>

      <section aria-labelledby="usability" className="mb-12">
        <SectionTitle id="usability" title="Usability testing" description={`${USABILITY.participants} participants: ${USABILITY.profile}`} />
        <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
          <Card>
            <CardHeader title="Task success rate" icon={Users} />
            <ul className="space-y-4 p-5">
              {USABILITY.tasks.map((t) => (
                <li key={t.task}>
                  <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                    <span className="font-medium">{t.task}</span>
                    <span className="flex items-center gap-3 text-muted num"><span className="inline-flex items-center gap-1"><Timer className="size-3.5" aria-hidden />{t.time}</span><span className="font-semibold text-fg">{t.success}%</span></span>
                  </div>
                  <ProgressBar value={t.success} tone={t.success === 100 ? 'success' : 'warning'} size="sm" label={`${t.task} success rate`} />
                </li>
              ))}
            </ul>
          </Card>
          <div className="space-y-4">
            {USABILITY.quotes.map((qt) => (
              <Card key={qt.text} className="p-5">
                <Quote className="size-5 text-accent-500" aria-hidden />
                <p className="mt-2 text-sm">“{qt.text}”</p>
                <p className="mt-2 text-xs font-medium text-muted">{qt.who}</p>
              </Card>
            ))}
          </div>
        </div>
        <Card className="mt-6">
          <CardHeader title="Issues found and fixed" />
          <Table className="mt-3">
            <thead><tr><Th>Issue observed</Th><Th>Change made</Th><Th>Status</Th></tr></thead>
            <tbody>
              {USABILITY.issues.map((i) => (
                <tr key={i.issue}><Td>{i.issue}</Td><Td className="text-muted">{i.fix}</Td><Td><StatusChip status="fixed" /></Td></tr>
              ))}
            </tbody>
          </Table>
        </Card>
      </section>

      <section aria-labelledby="bugs">
        <SectionTitle id="bugs" title="Bug log" description={`${BUGS.filter((b) => b.status === 'fixed').length} of ${BUGS.length} fixed`} action={<Badge tone="neutral" icon={Bug}>{BUGS.length} bugs</Badge>} />
        <Card>
          <Table>
            <thead><tr><Th>ID</Th><Th>Description</Th><Th>Severity</Th><Th>Status</Th><Th className="hidden md:table-cell">Fix</Th></tr></thead>
            <tbody>
              {BUGS.map((b) => (
                <tr key={b.id} className="align-top hover:bg-subtle/60">
                  <Td className="font-mono text-xs font-semibold">{b.id}</Td>
                  <Td className="min-w-52">{b.desc}<p className="mt-1 text-xs text-muted md:hidden">{b.fix}</p></Td>
                  <Td><StatusChip status={b.severity} /></Td>
                  <Td><StatusChip status={b.status} /></Td>
                  <Td className="hidden min-w-56 text-muted md:table-cell">{b.fix}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      </section>

      <Modal
        open={!!current}
        onClose={() => setLightbox(null)}
        size="lg"
        title={current ? `${current.id} · ${current.title}` : ''}
        description={current ? `${current.suite} · Screenshot evidence` : ''}
        footer={
          <>
            <Button variant="secondary" icon={ChevronLeft} disabled={lightbox === 0} onClick={() => setLightbox((i) => i - 1)}>Previous</Button>
            <Button variant="secondary" iconRight={ChevronRight} disabled={lightbox === gallery.length - 1} onClick={() => setLightbox((i) => i + 1)}>Next</Button>
          </>
        }
      >
        {current && (
          <div className="space-y-4">
            <EvidenceImage key={current.id} test={current} />
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="text-muted">{lightbox + 1} of {gallery.length}</span>
              <StatusChip status={current.status} />
            </div>
          </div>
        )}
      </Modal>
    </ShowcaseShell>
  )
}
