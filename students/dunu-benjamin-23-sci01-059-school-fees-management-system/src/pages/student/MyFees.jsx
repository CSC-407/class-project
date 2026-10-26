import { useMemo, useState } from 'react'
import { CreditCard, Wallet, SearchX } from 'lucide-react'
import { useData } from '../../context/DataContext'
import {
  Card, PageHeader, Tabs, SearchInput, Select, Table, Th, Td, useSort, StatusChip, Button, EmptyState, FilterChips, SkeletonTable, ProgressBar,
} from '../../components/ui'
import { naira, formatDate } from '../../lib/format'
import { SESSIONS, feeStatus } from '../../lib/data'
import { useDocumentTitle } from '../../lib/hooks'

const STATUS_OPTS = [
  { value: 'paid', label: 'Paid' },
  { value: 'partial', label: 'Partial' },
  { value: 'unpaid', label: 'Unpaid' },
  { value: 'overdue', label: 'Overdue' },
]

export default function MyFees() {
  useDocumentTitle('My Fees')
  const { fees, loading } = useData()
  const [session, setSession] = useState(SESSIONS[0])
  const [semester, setSemester] = useState('')
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [category, setCategory] = useState('')

  const inSession = useMemo(() => fees.filter((f) => f.session === session).map((f) => ({ ...f, balance: f.amount - f.paid, status: feeStatus(f) })), [fees, session])
  const categories = [...new Set(inSession.map((f) => f.category))]
  const rows = inSession.filter(
    (f) =>
      (!semester || f.semester === semester) &&
      (!status || f.status === status) &&
      (!category || f.category === category) &&
      (!q || f.name.toLowerCase().includes(q.toLowerCase())),
  )
  const { sorted, sort, onSort } = useSort(rows, { key: 'dueDate', dir: 'asc' })
  const totals = rows.reduce((t, f) => ({ amount: t.amount + f.amount, paid: t.paid + f.paid, balance: t.balance + f.balance }), { amount: 0, paid: 0, balance: 0 })
  const payable = rows.filter((f) => f.balance > 0)

  const chips = [
    semester && { key: 'sem', label: semester, onRemove: () => setSemester('') },
    status && { key: 'st', label: `Status: ${STATUS_OPTS.find((s) => s.value === status).label}`, onRemove: () => setStatus('') },
    category && { key: 'cat', label: `Category: ${category}`, onRemove: () => setCategory('') },
    q && { key: 'q', label: `“${q}”`, onRemove: () => setQ('') },
  ].filter(Boolean)
  const clearAll = () => { setSemester(''); setStatus(''); setCategory(''); setQ('') }

  return (
    <>
      <PageHeader
        title="My Fees"
        description="Every fee for your session, what you’ve paid and what’s left."
        breadcrumbs={[{ label: 'My Fees' }]}
        actions={payable.length > 0 && <Button to={`/app/pay?items=${payable.map((f) => f.id).join(',')}`} variant="accent" icon={CreditCard}>Pay outstanding</Button>}
      />

      <Tabs tabs={SESSIONS.map((s) => ({ value: s, label: `${s} session` }))} value={session} onChange={setSession} className="mb-5" />

      <Card>
        <div className="space-y-3 border-b border-line p-4">
          <div className="grid gap-3 md:grid-cols-[1fr_auto_auto_auto]">
            <SearchInput value={q} onChange={setQ} placeholder="Search fee items" label="Search fee items" />
            <Select aria-label="Semester" placeholder="All semesters" options={['First Semester', 'Second Semester']} value={semester} onChange={(e) => setSemester(e.target.value)} />
            <Select aria-label="Status" placeholder="All statuses" options={STATUS_OPTS} value={status} onChange={(e) => setStatus(e.target.value)} />
            <Select aria-label="Category" placeholder="All categories" options={categories} value={category} onChange={(e) => setCategory(e.target.value)} />
          </div>
          <FilterChips chips={chips} onClear={clearAll} />
        </div>

        {loading ? (
          <SkeletonTable rows={6} cols={6} />
        ) : inSession.length === 0 ? (
          <EmptyState icon={Wallet} title="No fees for this session">Fees for {session} haven’t been published yet. You’ll be notified when they are.</EmptyState>
        ) : rows.length === 0 ? (
          <EmptyState icon={SearchX} title="No matching fees" action={<Button variant="secondary" onClick={clearAll}>Clear filters</Button>}>
            Try a different search or remove some filters.
          </EmptyState>
        ) : (
          <>
            {/* Desktop table */}
            <Table className="hidden md:block">
              <thead>
                <tr>
                  <Th sortKey="name" sort={sort} onSort={onSort}>Fee item</Th>
                  <Th sortKey="amount" sort={sort} onSort={onSort} align="right">Amount</Th>
                  <Th align="right">Paid</Th>
                  <Th sortKey="balance" sort={sort} onSort={onSort} align="right">Balance</Th>
                  <Th sortKey="dueDate" sort={sort} onSort={onSort}>Due date</Th>
                  <Th>Status</Th>
                  <Th><span className="sr-only">Action</span></Th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((f) => (
                  <tr key={f.id} className="transition-colors hover:bg-subtle/60">
                    <Td>
                      <p className="font-medium">{f.name}</p>
                      <p className="text-xs text-muted">{f.category} · {f.semester}{f.installments ? ' · Installments allowed' : ''}</p>
                    </Td>
                    <Td align="right" className="num">{naira(f.amount)}</Td>
                    <Td align="right" className="text-muted num">{naira(f.paid)}</Td>
                    <Td align="right" className="font-semibold num">{naira(f.balance)}</Td>
                    <Td className="whitespace-nowrap">{formatDate(f.dueDate)}</Td>
                    <Td><StatusChip status={f.status} /></Td>
                    <Td align="right">
                      {f.balance > 0 ? (
                        <Button to={`/app/pay?items=${f.id}`} size="sm" variant="secondary">Pay this item</Button>
                      ) : (
                        <span className="text-xs text-muted">Cleared</span>
                      )}
                    </Td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-subtle/60 font-semibold">
                  <Td>Total ({rows.length} items)</Td>
                  <Td align="right" className="num">{naira(totals.amount)}</Td>
                  <Td align="right" className="num text-emerald-700 dark:text-emerald-400">{naira(totals.paid)}</Td>
                  <Td align="right" className="num text-red-700 dark:text-red-400">{naira(totals.balance)}</Td>
                  <Td colSpan={3} />
                </tr>
              </tfoot>
            </Table>

            {/* Mobile cards */}
            <ul className="divide-y divide-line md:hidden">
              {sorted.map((f) => (
                <li key={f.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium">{f.name}</p>
                      <p className="text-xs text-muted">Due {formatDate(f.dueDate)}</p>
                    </div>
                    <StatusChip status={f.status} />
                  </div>
                  <dl className="mt-3 grid grid-cols-3 gap-2 text-sm">
                    <div><dt className="text-xs text-muted">Amount</dt><dd className="num">{naira(f.amount)}</dd></div>
                    <div><dt className="text-xs text-muted">Paid</dt><dd className="num">{naira(f.paid)}</dd></div>
                    <div><dt className="text-xs text-muted">Balance</dt><dd className="font-semibold num">{naira(f.balance)}</dd></div>
                  </dl>
                  <ProgressBar value={(f.paid / f.amount) * 100} size="sm" className="mt-3" tone={f.status === 'paid' ? 'success' : f.status === 'overdue' ? 'danger' : 'brand'} label={`${f.name} paid`} />
                  {f.balance > 0 && <Button to={`/app/pay?items=${f.id}`} size="md" variant="secondary" block className="mt-3">Pay this item</Button>}
                </li>
              ))}
              <li className="bg-subtle/60 p-4">
                <div className="flex justify-between text-sm"><span className="text-muted">Total</span><span className="font-semibold num">{naira(totals.amount)}</span></div>
                <div className="mt-1 flex justify-between text-sm"><span className="text-muted">Paid</span><span className="font-semibold num text-emerald-700 dark:text-emerald-400">{naira(totals.paid)}</span></div>
                <div className="mt-1 flex justify-between text-sm"><span className="text-muted">Balance</span><span className="font-semibold num text-red-700 dark:text-red-400">{naira(totals.balance)}</span></div>
              </li>
            </ul>
          </>
        )}
      </Card>
    </>
  )
}
