import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Target, Wallet, AlertCircle, Percent, Zap, XCircle, ArrowRight, ShieldAlert, Clock, AlertTriangle, ChevronRight } from 'lucide-react'
import { useApi } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'
import { Card, CardHeader, StatCard, PageHeader, SegmentedControl, StatusChip, Button, SkeletonCards, Skeleton, ErrorState, Badge, Table, Th, Td } from '../../components/ui'
import { AreaTrend, Donut, DonutLegend, Bars, CHART_COLORS } from '../../components/Charts'
import { MethodLabel } from '../../components/PaymentBits'
import { naira, formatDateTime } from '../../lib/format'
import { CURRENT_SESSION } from '../../lib/data'
import { useDocumentTitle } from '../../lib/hooks'

const RANGES = [
  { value: '7', label: '7D' },
  { value: '30', label: '30D' },
  { value: '90', label: '90D' },
]

export default function AdminDashboard() {
  useDocumentTitle('Admin Dashboard')
  const { user } = useAuth()
  const [range, setRange] = useState('30')
  const { data: stats, loading, error, reload } = useApi(`/api/admin/dashboard?range=${range}`)
  const recent = stats?.recent || []

  return (
    <>
      <PageHeader
        title={`Welcome, ${user.name.split(' ')[0]}`}
        description="The school’s payment health at a glance."
        actions={
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
            <Badge tone="brand">{CURRENT_SESSION} session</Badge>
            <SegmentedControl label="Date range" options={RANGES} value={range} onChange={setRange} />
          </div>
        }
      />

      {error ? (
        <Card><ErrorState onRetry={() => reload()}>{error.message}</ErrorState></Card>
      ) : loading || !stats ? (
        <>
          <SkeletonCards count={6} />
          <div className="mt-6 grid gap-6 lg:grid-cols-3">
            <Card className="p-5 lg:col-span-2"><Skeleton className="h-64 w-full" /></Card>
            <Card className="p-5"><Skeleton className="h-64 w-full" /></Card>
          </div>
        </>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
            <StatCard label="Total expected" value={naira(stats.expected, { compact: true })} sub={`${CURRENT_SESSION} session`} icon={Target} />
            <StatCard label="Total collected" value={naira(stats.collected, { compact: true })} sub={`${stats.statusCount.paid} students fully paid`} icon={Wallet} tone="success" />
            <StatCard label="Outstanding" value={naira(stats.outstanding, { compact: true })} sub={`${stats.statusCount.owing + stats.statusCount.partial} students owing`} icon={AlertCircle} tone="danger" />
            <StatCard label="Collection rate" value={`${stats.rate}%`} sub="Target 85%" icon={Percent} tone="info" />
            <StatCard label="Payments today" value={stats.todayCount} sub={naira(stats.todayAmount, { compact: true })} icon={Zap} tone="warning" />
            <StatCard label="Failed payments" value={stats.failed} sub={`Last ${range} days`} icon={XCircle} tone="danger" />
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader title="Collection over time" description={`Daily confirmed payments, last ${Math.min(Number(range), 30)} days`} />
              <div className="p-3 pt-4 sm:p-5">
                <AreaTrend data={stats.series} />
              </div>
            </Card>
            <Card>
              <CardHeader title="Payment methods" description="Share of collected value" />
              <div className="p-5">
                {(() => {
                  const data = [
                    { name: 'Card', value: stats.methodSplit[0].value, color: CHART_COLORS.brand },
                    { name: 'Bank transfer', value: stats.methodSplit[1].value, color: CHART_COLORS.accent },
                    { name: 'USSD', value: stats.methodSplit[2].value, color: CHART_COLORS.sky },
                  ]
                  const total = data.reduce((s, d) => s + d.value, 0)
                  return (
                    <>
                      <Donut data={data} center={<><p className="text-xs text-muted">Total</p><p className="text-lg font-bold num">{naira(total, { compact: true })}</p></>} />
                      <div className="mt-4"><DonutLegend data={data} /></div>
                    </>
                  )
                })()}
              </div>
            </Card>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader title="Collection by faculty" description="Expected vs collected this session" />
              <div className="p-3 pt-4 sm:p-5">
                <Bars
                  data={stats.faculty}
                  xKey="faculty"
                  bars={[
                    { key: 'collected', name: 'Collected', color: CHART_COLORS.brand },
                    { key: 'expected', name: 'Expected', color: CHART_COLORS.brandSoft },
                  ]}
                />
              </div>
            </Card>
            <Card>
              <CardHeader title="Paid vs owing students" description={`${stats.students} students in sample`} />
              <div className="p-5">
                {(() => {
                  const data = [
                    { name: 'Fully paid', value: stats.statusCount.paid, color: CHART_COLORS.success },
                    { name: 'Partly paid', value: stats.statusCount.partial, color: CHART_COLORS.warning },
                    { name: 'Owing', value: stats.statusCount.owing, color: CHART_COLORS.danger },
                  ]
                  return (
                    <>
                      <Donut data={data} money={false} center={<><p className="text-xs text-muted">Paid</p><p className="text-lg font-bold num">{Math.round((stats.statusCount.paid / stats.students) * 100)}%</p></>} />
                      <div className="mt-4"><DonutLegend data={data} money={false} /></div>
                    </>
                  )
                })()}
              </div>
            </Card>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader title="Recent transactions" action={<Button to="/admin/payments" variant="ghost" size="sm" iconRight={ArrowRight}>All payments</Button>} />
              <Table className="mt-3">
                <thead>
                  <tr>
                    <Th>Student</Th>
                    <Th className="hidden md:table-cell">Reference</Th>
                    <Th align="right">Amount</Th>
                    <Th className="hidden sm:table-cell">Method</Th>
                    <Th>Status</Th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((t) => (
                    <tr key={t.id} className="hover:bg-subtle/60">
                      <Td>
                        <Link to={`/admin/payments?open=${t.id}`} className="font-medium hover:underline">{t.student}</Link>
                        <p className="text-xs text-muted">{formatDateTime(t.date)}</p>
                      </Td>
                      <Td className="hidden font-mono text-xs md:table-cell">{t.ref}</Td>
                      <Td align="right" className="font-semibold num">{naira(t.amount)}</Td>
                      <Td className="hidden sm:table-cell"><MethodLabel method={t.method} /></Td>
                      <Td><StatusChip status={t.status} /></Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card>
            <Card>
              <CardHeader title="Alerts" description="Items that need attention" />
              <ul className="space-y-2 p-5">
                {[
                  { icon: XCircle, tone: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10', title: `${stats.failed} failed payments`, sub: `In the last ${range} days`, to: '/admin/payments?status=failed' },
                  { icon: Clock, tone: 'text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-500/10', title: `${stats.unverified} unverified payments`, sub: 'Bank transfers awaiting check', to: '/admin/payments?verification=unverified' },
                  { icon: ShieldAlert, tone: 'text-brand-700 dark:text-brand-200 bg-brand-50 dark:bg-brand-500/15', title: `${stats.blocked} blocked login attempts`, sub: 'Failed or locked sign-ins, last 24h', to: '/admin/audit?action=LOGIN_FAILED' },
                  { icon: AlertTriangle, tone: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10', title: `${stats.flagged} flagged as suspicious`, sub: 'Review and resolve', to: '/admin/payments?flagged=1' },
                ].map((a) => (
                  <li key={a.title}>
                    <Link to={a.to} className="flex items-center gap-3 rounded-lg p-2.5 transition-colors hover:bg-subtle">
                      <span className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${a.tone}`}><a.icon className="size-[18px]" aria-hidden /></span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium">{a.title}</span>
                        <span className="block text-xs text-muted">{a.sub}</span>
                      </span>
                      <ChevronRight className="size-4 text-muted" aria-hidden />
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </>
      )}
    </>
  )
}
