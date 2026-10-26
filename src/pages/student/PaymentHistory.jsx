import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { FileDown, FileText, ReceiptText, Eye, SearchX, History as HistoryIcon, RotateCcw } from 'lucide-react'
import { useData } from '../../context/DataContext'
import { useToast } from '../../context/ToastContext'
import {
  Card, PageHeader, SearchInput, Select, Input, Table, Th, Td, useSort, usePagination, Pagination, StatusChip, Button, EmptyState, FilterChips,
  SkeletonTable, Drawer, DefinitionList,
} from '../../components/ui'
import { MethodLabel, Timeline, METHODS } from '../../components/PaymentBits'
import { naira, formatDate, formatDateTime, downloadCSV } from '../../lib/format'
import { useDocumentTitle } from '../../lib/hooks'

export function PaymentDetail({ payment, onClose, actions }) {
  return (
    <Drawer
      open={!!payment}
      onClose={onClose}
      title="Transaction details"
      description={payment?.ref}
      footer={actions}
    >
      {payment && (
        <div className="space-y-6 p-5">
          <div className="rounded-xl bg-subtle p-5 text-center">
            <p className="text-sm text-muted">Amount</p>
            <p className="text-3xl font-bold tracking-tight num">{naira(payment.amount)}</p>
            <div className="mt-2 flex justify-center"><StatusChip status={payment.status} /></div>
          </div>
          <DefinitionList
            items={[
              ['Reference', <span className="font-mono">{payment.ref}</span>],
              ['Receipt number', payment.receiptNo ? <span className="font-mono">{payment.receiptNo}</span> : '—'],
              ['Date', formatDateTime(payment.date)],
              ['Method', <MethodLabel method={payment.method} last4={payment.last4} />],
              ['Session', payment.session],
              ['Service charge', <span className="num">{naira(payment.serviceCharge)}</span>],
            ]}
          />
          <div>
            <h3 className="mb-2 text-sm font-semibold">Breakdown</h3>
            <ul className="divide-y divide-line rounded-xl border border-line text-sm">
              {payment.items.map((i, idx) => (
                <li key={idx} className="flex justify-between gap-3 px-4 py-2.5">
                  <span className="text-muted">{i.name}</span>
                  <span className="num">{naira(i.amount)}</span>
                </li>
              ))}
              <li className="flex justify-between gap-3 px-4 py-2.5">
                <span className="text-muted">Service charge</span>
                <span className="num">{naira(payment.serviceCharge)}</span>
              </li>
              <li className="flex justify-between gap-3 bg-subtle/60 px-4 py-2.5 font-semibold">
                <span>Total charged</span>
                <span className="num">{payment.status === 'failed' ? naira(0) : naira(payment.amount + payment.serviceCharge)}</span>
              </li>
            </ul>
          </div>
          {payment.failureReason && (
            <p className="rounded-lg bg-red-50 p-3 text-sm text-red-800 dark:bg-red-500/10 dark:text-red-300">
              <span className="font-semibold">Failure reason:</span> {payment.failureReason}
            </p>
          )}
          <div>
            <h3 className="mb-3 text-sm font-semibold">Timeline</h3>
            <Timeline steps={payment.timeline} />
          </div>
        </div>
      )}
    </Drawer>
  )
}

export default function PaymentHistory() {
  useDocumentTitle('Payment History')
  const { payments, loading } = useData()
  const toast = useToast()
  const [params, setParams] = useSearchParams()
  const [q, setQ] = useState(params.get('q') || '')
  const [status, setStatus] = useState('')
  const [method, setMethod] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [openId, setOpenId] = useState(params.get('open'))

  useEffect(() => {
    const pq = params.get('q')
    if (pq !== null) setQ(pq)
  }, [params])

  const rows = useMemo(
    () =>
      payments.filter((p) => {
        const d = new Date(p.date)
        return (
          (!q || p.ref.toLowerCase().includes(q.toLowerCase()) || p.description.toLowerCase().includes(q.toLowerCase())) &&
          (!status || p.status === status) &&
          (!method || p.method === method) &&
          (!from || d >= new Date(from)) &&
          (!to || d <= new Date(`${to}T23:59:59`))
        )
      }),
    [payments, q, status, method, from, to],
  )
  const { sorted, sort, onSort } = useSort(rows, { key: 'date', dir: 'desc' })
  const pg = usePagination(sorted, 8)
  const open = payments.find((p) => p.id === openId)

  const chips = [
    q && { key: 'q', label: `“${q}”`, onRemove: () => { setQ(''); setParams({}) } },
    status && { key: 's', label: `Status: ${status}`, onRemove: () => setStatus('') },
    method && { key: 'm', label: `Method: ${METHODS[method].label}`, onRemove: () => setMethod('') },
    from && { key: 'f', label: `From ${formatDate(from)}`, onRemove: () => setFrom('') },
    to && { key: 't', label: `To ${formatDate(to)}`, onRemove: () => setTo('') },
  ].filter(Boolean)
  const clearAll = () => { setQ(''); setStatus(''); setMethod(''); setFrom(''); setTo(''); setParams({}) }

  const exportCSV = () => {
    downloadCSV(
      `payment-history-${new Date().toISOString().slice(0, 10)}.csv`,
      sorted.map((p) => ({ Date: formatDateTime(p.date), Reference: p.ref, Description: p.description, Amount: p.amount, 'Service charge': p.serviceCharge, Method: METHODS[p.method].label, Status: p.status, Receipt: p.receiptNo || '' })),
    )
    toast(`Exported ${sorted.length} transactions to CSV`)
  }

  return (
    <>
      <PageHeader
        title="Payment History"
        description="Every payment you’ve made, including failed and pending attempts."
        breadcrumbs={[{ label: 'Payment History' }]}
        actions={
          <>
            <Button variant="secondary" icon={FileDown} onClick={exportCSV} disabled={!sorted.length}>Export CSV</Button>
            <Button variant="secondary" icon={FileText} onClick={() => { toast('Choose “Save as PDF” in the print dialog', { type: 'info' }); setTimeout(() => window.print(), 300) }} disabled={!sorted.length}>
              Export PDF
            </Button>
          </>
        }
      />

      <Card>
        <div className="no-print space-y-3 border-b border-line p-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr_1fr]">
            <SearchInput value={q} onChange={setQ} placeholder="Search by reference" label="Search by reference" className="sm:col-span-2 lg:col-span-1" />
            <Select aria-label="Status" placeholder="All statuses" options={[{ value: 'success', label: 'Successful' }, { value: 'pending', label: 'Pending' }, { value: 'failed', label: 'Failed' }]} value={status} onChange={(e) => setStatus(e.target.value)} />
            <Select aria-label="Method" placeholder="All methods" options={Object.entries(METHODS).map(([value, m]) => ({ value, label: m.label }))} value={method} onChange={(e) => setMethod(e.target.value)} />
            <Input aria-label="From date" type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} />
            <Input aria-label="To date" type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} />
          </div>
          <FilterChips chips={chips} onClear={clearAll} />
        </div>

        {loading ? (
          <SkeletonTable />
        ) : payments.length === 0 ? (
          <EmptyState icon={HistoryIcon} title="No payments yet" action={<Button to="/app/pay">Pay your first fee</Button>}>
            Your payment history will appear here after your first payment.
          </EmptyState>
        ) : rows.length === 0 ? (
          <EmptyState icon={SearchX} title="No matching payments" action={<Button variant="secondary" icon={RotateCcw} onClick={clearAll}>Clear filters</Button>}>
            No payments match these filters.
          </EmptyState>
        ) : (
          <>
            <Table className="hidden md:block">
              <thead>
                <tr>
                  <Th sortKey="date" sort={sort} onSort={onSort}>Date</Th>
                  <Th>Reference</Th>
                  <Th>Description</Th>
                  <Th sortKey="amount" sort={sort} onSort={onSort} align="right">Amount</Th>
                  <Th>Method</Th>
                  <Th sortKey="status" sort={sort} onSort={onSort}>Status</Th>
                  <Th align="right" className="no-print">Actions</Th>
                </tr>
              </thead>
              <tbody>
                {pg.pageRows.map((p) => (
                  <tr key={p.id} className="cursor-pointer transition-colors hover:bg-subtle/60" onClick={() => setOpenId(p.id)}>
                    <Td className="whitespace-nowrap">{formatDate(p.date)}</Td>
                    <Td className="font-mono text-xs whitespace-nowrap">{p.ref}</Td>
                    <Td className="max-w-64"><p className="truncate">{p.description}</p></Td>
                    <Td align="right" className="font-semibold num">{naira(p.amount)}</Td>
                    <Td><MethodLabel method={p.method} /></Td>
                    <Td><StatusChip status={p.status} /></Td>
                    <Td align="right" className="no-print" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-1">
                        <Button size="icon-sm" variant="ghost" onClick={() => setOpenId(p.id)} aria-label={`View ${p.ref}`}><Eye className="size-4" /></Button>
                        {p.receiptNo && <Button size="icon-sm" variant="ghost" to={`/app/receipts/${p.id}`} aria-label={`Receipt for ${p.ref}`}><ReceiptText className="size-4" /></Button>}
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <ul className="divide-y divide-line md:hidden">
              {pg.pageRows.map((p) => (
                <li key={p.id}>
                  <button onClick={() => setOpenId(p.id)} className="w-full p-4 text-left hover:bg-subtle/60">
                    <div className="flex items-start justify-between gap-3">
                      <p className="min-w-0 truncate font-medium">{p.description}</p>
                      <p className="shrink-0 font-semibold num">{naira(p.amount)}</p>
                    </div>
                    <div className="mt-1.5 flex items-center justify-between gap-2">
                      <p className="text-xs text-muted"><span className="font-mono">{p.ref}</span> · {formatDate(p.date)}</p>
                      <StatusChip status={p.status} />
                    </div>
                  </button>
                </li>
              ))}
            </ul>
            <div className="no-print border-t border-line"><Pagination {...pg} /></div>
          </>
        )}
      </Card>

      <PaymentDetail
        payment={open}
        onClose={() => { setOpenId(null); if (params.get('open')) setParams({}) }}
        actions={open?.receiptNo && <Button to={`/app/receipts/${open.id}`} icon={ReceiptText} block>View receipt</Button>}
      />
    </>
  )
}
