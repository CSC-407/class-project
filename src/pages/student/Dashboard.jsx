import { Link } from 'react-router-dom'
import {
  Wallet, CheckCircle2, AlertCircle, CalendarClock, CreditCard, Download, ListChecks, ArrowRight, Megaphone, AlertTriangle, ReceiptText, Sparkles, ChevronRight,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useData } from '../../context/DataContext'
import { Card, CardHeader, StatCard, ProgressBar, Button, StatusChip, Badge, EmptyState, SkeletonCards, Skeleton } from '../../components/ui'
import { MethodLabel } from '../../components/PaymentBits'
import { naira, formatDate, daysUntil } from '../../lib/format'
import { CURRENT_SESSION } from '../../lib/data'
import { useDocumentTitle } from '../../lib/hooks'

function greeting() {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}

export default function Dashboard() {
  useDocumentTitle('Dashboard')
  const { user } = useAuth()
  const { summary, payments, loading } = useData()
  const recent = payments.slice(0, 5)
  const lastReceipt = payments.find((p) => p.status === 'success')
  const next = summary.next
  const dueIn = next ? daysUntil(next.dueDate) : null
  const cleared = summary.outstanding <= 0

  return (
    <>
      {/* Greeting */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-muted">{greeting()},</p>
          <h1 className="text-2xl font-bold tracking-tight sm:text-[28px]">{user.name.split(' ')[0]} 👋</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted">
            <span className="font-mono num">{user.matric}</span>
            <span aria-hidden>·</span>
            <span>{user.level} Level</span>
            <span aria-hidden>·</span>
            <span>{user.department}</span>
            <Badge tone="brand" icon={CalendarClock}>{CURRENT_SESSION} · Second Semester</Badge>
          </div>
        </div>
        <Button to="/app/pay" variant="accent" size="lg" icon={CreditCard} className="w-full sm:w-auto" disabled={cleared}>
          {cleared ? 'All fees paid' : 'Pay now'}
        </Button>
      </div>

      {loading ? (
        <>
          <SkeletonCards />
          <Card className="mt-6 p-6">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="mt-4 h-4 w-full" />
          </Card>
        </>
      ) : (
        <>
          {summary.overdue.length > 0 && (
            <div className="mb-6 flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 p-4 sm:flex-row sm:items-center dark:border-red-500/30 dark:bg-red-500/10">
              <AlertTriangle className="size-5 shrink-0 text-red-600 dark:text-red-400" aria-hidden />
              <p className="flex-1 text-sm text-red-900 dark:text-red-200">
                <span className="font-semibold">{summary.overdue.length} fee{summary.overdue.length > 1 ? 's are' : ' is'} overdue.</span>{' '}
                {summary.overdue.map((f) => f.name).join(', ')}: {naira(summary.overdue.reduce((s, f) => s + f.amount - f.paid, 0))} outstanding.
              </p>
              <Button to={`/app/pay?items=${summary.overdue.map((f) => f.id).join(',')}`} size="sm" variant="destructive">Pay overdue</Button>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Total fees" value={naira(summary.total)} sub={`${CURRENT_SESSION} session`} icon={Wallet} tone="brand" />
            <StatCard label="Amount paid" value={naira(summary.paid)} sub={`${summary.percent}% of total`} icon={CheckCircle2} tone="success" />
            <StatCard label="Outstanding balance" value={naira(summary.outstanding)} sub={cleared ? 'Nothing owed' : 'Across all fee items'} icon={AlertCircle} tone={cleared ? 'success' : 'danger'} />
            <StatCard
              label="Next due date"
              value={next ? formatDate(next.dueDate, { year: undefined }) : '—'}
              sub={next ? (dueIn < 0 ? <span className="font-medium text-red-600 dark:text-red-400">{Math.abs(dueIn)} days overdue</span> : `in ${dueIn} days · ${next.name}`) : 'No upcoming payments'}
              icon={CalendarClock}
              tone={dueIn != null && dueIn < 0 ? 'danger' : 'warning'}
            />
          </div>

          <Card className="mt-6 p-5 sm:p-6">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold">Payment progress</h2>
                <p className="text-sm text-muted num">
                  {naira(summary.paid)} of {naira(summary.total)} paid
                </p>
              </div>
              <p className="text-3xl font-bold tracking-tight num">{summary.percent}%</p>
            </div>
            <ProgressBar value={summary.percent} size="lg" className="mt-4" tone={summary.percent === 100 ? 'success' : 'brand'} label="Percentage of fees paid" />
            <div className="mt-3 flex justify-between text-xs text-muted">
              <span>Paid</span>
              <span className="num">{naira(summary.outstanding)} remaining</span>
            </div>
          </Card>

          <div className="mt-6 grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader title="Recent payments" description="Your last 5 transactions" action={payments.length > 0 && <Button to="/app/history" variant="ghost" size="sm" iconRight={ArrowRight}>View all</Button>} />
              {recent.length === 0 ? (
                <EmptyState
                  icon={ReceiptText}
                  title="No payments yet"
                  action={<Button to="/app/pay" icon={CreditCard}>Pay your first fee</Button>}
                >
                  When you make a payment, it will show up here with its receipt.
                </EmptyState>
              ) : (
                <ul className="mt-3 divide-y divide-line">
                  {recent.map((p) => (
                    <li key={p.id}>
                      <Link to={p.receiptNo ? `/app/receipts/${p.id}` : `/app/history?open=${p.id}`} className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-subtle">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{p.description}</p>
                          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted">
                            <span className="font-mono">{p.ref}</span>
                            <span aria-hidden>·</span>
                            <span>{formatDate(p.date)}</span>
                            <span className="hidden sm:inline" aria-hidden>·</span>
                            <span className="hidden sm:inline"><MethodLabel method={p.method} /></span>
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <p className="text-sm font-semibold num">{naira(p.amount)}</p>
                          <StatusChip status={p.status} />
                        </div>
                        <ChevronRight className="hidden size-4 text-muted sm:block" aria-hidden />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              <div className="h-2" />
            </Card>

            <div className="space-y-6">
              <Card>
                <CardHeader title="Quick links" />
                <div className="grid gap-2 p-5 pt-4">
                  <Button to={lastReceipt ? `/app/receipts/${lastReceipt.id}` : '/app/receipts'} variant="secondary" icon={Download} className="justify-start" disabled={!lastReceipt}>
                    Download last receipt
                  </Button>
                  <Button to="/app/fees" variant="secondary" icon={ListChecks} className="justify-start">View fee breakdown</Button>
                  <Button to="/app/help" variant="secondary" icon={Sparkles} className="justify-start">Help & FAQ</Button>
                </div>
              </Card>
              <Card>
                <CardHeader title="Notices" icon={Megaphone} />
                <ul className="space-y-3 p-5 pt-4 text-sm">
                  {next && (
                    <li className="flex gap-3 rounded-lg bg-amber-50 p-3 dark:bg-amber-500/10">
                      <CalendarClock className="mt-0.5 size-4 shrink-0 text-amber-700 dark:text-amber-300" aria-hidden />
                      <span>
                        <span className="font-medium">{next.name}</span>: {naira(next.amount - next.paid)} due {formatDate(next.dueDate)}.
                      </span>
                    </li>
                  )}
                  <li className="flex gap-3 rounded-lg bg-sky-50 p-3 dark:bg-sky-500/10">
                    <Megaphone className="mt-0.5 size-4 shrink-0 text-sky-700 dark:text-sky-300" aria-hidden />
                    <span>Second semester examinations begin in 6 weeks. Students must clear tuition to print exam cards.</span>
                  </li>
                  <li className="flex gap-3 rounded-lg bg-subtle p-3">
                    <StatusChip status="info" label="Tip" />
                    <span className="text-muted">Tuition and hostel fees can be paid in installments of at least {naira(10000)}.</span>
                  </li>
                </ul>
              </Card>
            </div>
          </div>
        </>
      )}
    </>
  )
}
