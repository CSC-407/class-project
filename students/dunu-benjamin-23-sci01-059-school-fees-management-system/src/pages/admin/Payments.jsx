import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { FileDown, FileText, ShieldCheck, Flag, RotateCcw, Mail, SlidersHorizontal, SearchX, Banknote } from 'lucide-react'
import { api, useApi } from '../../lib/api'
import { useToast } from '../../context/ToastContext'
import {
  Card, PageHeader, SearchInput, Select, Input, Table, Th, Td, useSort, usePagination, Pagination, StatusChip, Button, EmptyState, FilterChips,
  SkeletonTable, ErrorState, Drawer, DefinitionList, ConfirmDialog, Textarea, Badge,
} from '../../components/ui'
import { MethodLabel, Timeline, METHODS } from '../../components/PaymentBits'
import { naira, formatDate, formatDateTime, downloadCSV, cn } from '../../lib/format'
import { FACULTIES } from '../../lib/data'
import { useDocumentTitle } from '../../lib/hooks'

export default function Payments() {
  useDocumentTitle('Payments')
  const { data, loading, error, reload, setData } = useApi('/api/admin/payments', { pick: (r) => r.payments })
  const transactions = data || []
  const [busy, setBusy] = useState(false)
  const toast = useToast()
  const [params, setParams] = useSearchParams()
  const [f, setF] = useState(() => ({
    q: params.get('q') || '',
    status: params.get('status') || '',
    method: '',
    faculty: '',
    verification: params.get('verification') || '',
    flagged: params.get('flagged') === '1',
    from: '',
    to: '',
    min: '',
    max: '',
  }))
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [openId, setOpenId] = useState(params.get('open'))
  const [confirm, setConfirm] = useState(null) // 'verify' | 'flag' | 'refund'
  const [reason, setReason] = useState('')
  const [reasonError, setReasonError] = useState('')

  useEffect(() => {
    const q = params.get('q')
    if (q !== null) setF((x) => ({ ...x, q }))
  }, [params])

  const set = (k) => (v) => setF((x) => ({ ...x, [k]: v?.target ? v.target.value : v }))

  const rows = useMemo(
    () =>
      transactions.filter((t) => {
        const d = new Date(t.date)
        const q = f.q.toLowerCase()
        return (
          (!q || t.ref.toLowerCase().includes(q) || t.matric.includes(q) || t.student.toLowerCase().includes(q)) &&
          (!f.status || (f.status === 'refunded' ? t.refunded : t.status === f.status)) &&
          (!f.method || t.method === f.method) &&
          (!f.faculty || t.faculty === f.faculty) &&
          (!f.verification || t.verification === f.verification) &&
          (!f.flagged || t.flagged) &&
          (!f.from || d >= new Date(f.from)) &&
          (!f.to || d <= new Date(`${f.to}T23:59:59`)) &&
          (!f.min || t.amount >= Number(f.min)) &&
          (!f.max || t.amount <= Number(f.max))
        )
      }),
    [transactions, f],
  )
  const { sorted, sort, onSort } = useSort(rows, { key: 'date', dir: 'desc' })
  const pg = usePagination(sorted, 12)
  const open = transactions.find((t) => t.id === openId)
  const totals = rows.filter((t) => t.status === 'success' && !t.refunded).reduce((s, t) => s + t.amount, 0)

  const chips = [
    f.q && { key: 'q', label: `“${f.q}”`, onRemove: () => { set('q')(''); setParams({}) } },
    f.status && { key: 's', label: `Status: ${f.status}`, onRemove: () => set('status')('') },
    f.method && { key: 'm', label: METHODS[f.method].label, onRemove: () => set('method')('') },
    f.faculty && { key: 'fa', label: f.faculty, onRemove: () => set('faculty')('') },
    f.verification && { key: 'v', label: `Verification: ${f.verification}`, onRemove: () => set('verification')('') },
    f.flagged && { key: 'fl', label: 'Flagged only', onRemove: () => set('flagged')(false) },
    f.from && { key: 'from', label: `From ${formatDate(f.from)}`, onRemove: () => set('from')('') },
    f.to && { key: 'to', label: `To ${formatDate(f.to)}`, onRemove: () => set('to')('') },
    f.min && { key: 'min', label: `≥ ${naira(f.min)}`, onRemove: () => set('min')('') },
    f.max && { key: 'max', label: `≤ ${naira(f.max)}`, onRemove: () => set('max')('') },
  ].filter(Boolean)
  const clearAll = () => { setF({ q: '', status: '', method: '', faculty: '', verification: '', flagged: false, from: '', to: '', min: '', max: '' }); setParams({}) }

  const update = (payment) => setData((list) => list.map((t) => (t.id === payment.id ? payment : t)))

  const doAction = async () => {
    if (confirm === 'flag' && !reason.trim()) return setReasonError('Give a reason for flagging')
    if (confirm === 'refund' && reason.trim().length < 10) return setReasonError('Explain the refund (at least 10 characters)')
    setBusy(true)
    try {
      const res = await api(`/api/admin/payments/${open.id}/${confirm}`, { method: 'POST', body: confirm === 'verify' ? {} : { reason: reason.trim() } })
      update(res.payment)
      if (confirm === 'verify') toast(`${open.ref} marked as verified`)
      else if (confirm === 'flag') toast(res.payment.flagged ? `${open.ref} flagged for review` : 'Flag removed', { type: res.payment.flagged ? 'warning' : 'success' })
      else toast(`Refund of ${naira(open.amount)} issued for ${open.ref}`)
      setConfirm(null)
      setReason('')
      setReasonError('')
    } catch (e) {
      if (e.fields?.reason) setReasonError(e.fields.reason)
      else toast(e.message, { type: 'error' })
    } finally {
      setBusy(false)
    }
  }

  const exportCSV = () => {
    downloadCSV(
      `payments-${new Date().toISOString().slice(0, 10)}.csv`,
      sorted.map((t) => ({ Date: formatDateTime(t.date), Reference: t.ref, Student: t.student, Matric: t.matric, Faculty: t.faculty, Description: t.description, Amount: t.amount, Method: METHODS[t.method].label, Status: t.refunded ? 'refunded' : t.status, Verification: t.verification, Flagged: t.flagged ? 'yes' : 'no' })),
    )
    toast(`Exported ${sorted.length} transactions`)
  }

  return (
    <>
      <PageHeader
        title="Payments"
        description="Every transaction across all students. Verify, flag or refund."
        breadcrumbs={[{ label: 'Payments' }]}
        actions={
          <>
            <Button variant="secondary" icon={FileDown} onClick={exportCSV}>Export CSV</Button>
            <Button variant="secondary" icon={FileText} onClick={() => window.print()}>Export PDF</Button>
          </>
        }
      />

      <Card>
        <div className="no-print space-y-3 border-b border-line p-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr_auto]">
            <SearchInput value={f.q} onChange={set('q')} placeholder="Reference, matric or name" label="Search payments" className="sm:col-span-2 lg:col-span-1" />
            <Select aria-label="Status" placeholder="All statuses" options={[{ value: 'success', label: 'Successful' }, { value: 'pending', label: 'Pending' }, { value: 'failed', label: 'Failed' }, { value: 'refunded', label: 'Refunded' }]} value={f.status} onChange={set('status')} />
            <Select aria-label="Method" placeholder="All methods" options={Object.entries(METHODS).map(([value, m]) => ({ value, label: m.label }))} value={f.method} onChange={set('method')} />
            <Select aria-label="Faculty" placeholder="All faculties" options={Object.keys(FACULTIES)} value={f.faculty} onChange={set('faculty')} />
            <Button variant={showAdvanced ? 'primary' : 'secondary'} icon={SlidersHorizontal} onClick={() => setShowAdvanced((s) => !s)} aria-expanded={showAdvanced}>More</Button>
          </div>
          {showAdvanced && (
            <div className="animate-fade-up grid gap-3 rounded-xl bg-subtle/60 p-3 sm:grid-cols-2 lg:grid-cols-6">
              <Input label="From" type="date" value={f.from} onChange={set('from')} />
              <Input label="To" type="date" value={f.to} onChange={set('to')} />
              <Input label="Min amount (₦)" inputMode="numeric" mono value={f.min} onChange={(e) => set('min')(e.target.value.replace(/\D/g, ''))} />
              <Input label="Max amount (₦)" inputMode="numeric" mono value={f.max} onChange={(e) => set('max')(e.target.value.replace(/\D/g, ''))} />
              <Select label="Verification" placeholder="Any" options={[{ value: 'verified', label: 'Verified' }, { value: 'unverified', label: 'Unverified' }]} value={f.verification} onChange={set('verification')} />
              <label className="flex items-center gap-2 pt-7 text-sm">
                <input type="checkbox" className="size-4 accent-brand-700" checked={f.flagged} onChange={(e) => set('flagged')(e.target.checked)} /> Flagged only
              </label>
            </div>
          )}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <FilterChips chips={chips} onClear={clearAll} />
            <p className="ml-auto text-sm text-muted num">{rows.length} transactions · <span className="font-semibold text-fg">{naira(totals)}</span> collected</p>
          </div>
        </div>

        {error ? (
          <ErrorState onRetry={() => reload()}>{error.message}</ErrorState>
        ) : loading ? (
          <SkeletonTable rows={10} cols={7} />
        ) : transactions.length === 0 ? (
          <EmptyState icon={Banknote} title="No transactions yet">Payments will appear here as students pay.</EmptyState>
        ) : rows.length === 0 ? (
          <EmptyState icon={SearchX} title="No matching transactions" action={<Button variant="secondary" onClick={clearAll}>Clear filters</Button>}>Try widening your filters.</EmptyState>
        ) : (
          <>
            <Table className="hidden md:block">
              <thead>
                <tr>
                  <Th sortKey="date" sort={sort} onSort={onSort}>Date</Th>
                  <Th>Reference</Th>
                  <Th sortKey="student" sort={sort} onSort={onSort}>Student</Th>
                  <Th sortKey="amount" sort={sort} onSort={onSort} align="right">Amount</Th>
                  <Th className="hidden xl:table-cell">Method</Th>
                  <Th>Status</Th>
                  <Th className="hidden lg:table-cell">Verification</Th>
                </tr>
              </thead>
              <tbody>
                {pg.pageRows.map((t) => (
                  <tr key={t.id} className={cn('cursor-pointer transition-colors hover:bg-subtle/60', t.flagged && 'bg-red-50/50 dark:bg-red-500/5')} onClick={() => setOpenId(t.id)}>
                    <Td className="whitespace-nowrap">{formatDateTime(t.date)}</Td>
                    <Td className="font-mono text-xs whitespace-nowrap">{t.ref}{t.flagged && <Flag className="ml-1.5 inline size-3.5 text-red-600" aria-label="Flagged" />}</Td>
                    <Td><p className="font-medium">{t.student}</p><p className="font-mono text-xs text-muted">{t.matric}</p></Td>
                    <Td align="right" className="font-semibold num">{naira(t.amount)}</Td>
                    <Td className="hidden xl:table-cell"><MethodLabel method={t.method} /></Td>
                    <Td><StatusChip status={t.refunded ? 'refunded' : t.status} /></Td>
                    <Td className="hidden lg:table-cell"><StatusChip status={t.verification} /></Td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <ul className="divide-y divide-line md:hidden">
              {pg.pageRows.map((t) => (
                <li key={t.id}>
                  <button onClick={() => setOpenId(t.id)} className="w-full p-4 text-left hover:bg-subtle/60">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0"><p className="font-medium">{t.student}</p><p className="font-mono text-xs text-muted">{t.ref}</p></div>
                      <p className="font-semibold num">{naira(t.amount)}</p>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <span className="text-xs text-muted">{formatDateTime(t.date)}</span>
                      <StatusChip status={t.refunded ? 'refunded' : t.status} />
                    </div>
                  </button>
                </li>
              ))}
            </ul>
            <div className="no-print border-t border-line"><Pagination {...pg} /></div>
          </>
        )}
      </Card>

      <Drawer
        open={!!open}
        onClose={() => { setOpenId(null); if (params.get('open')) setParams({}) }}
        title="Transaction details"
        description={open?.ref}
        footer={
          open && (
            <>
              {open.status === 'success' && open.verification !== 'verified' && <Button icon={ShieldCheck} variant="success" onClick={() => setConfirm('verify')}>Mark verified</Button>}
              <Button icon={Flag} variant="secondary" onClick={() => setConfirm('flag')}>{open.flagged ? 'Remove flag' : 'Flag suspicious'}</Button>
              {open.status === 'success' && !open.refunded && <Button icon={RotateCcw} variant="secondary" onClick={() => setConfirm('refund')}>Issue refund</Button>}
              {open.receiptNo && <Button icon={Mail} variant="ghost" onClick={async () => { try { await api(`/api/admin/payments/${open.id}/resend`, { method: 'POST', body: {} }) } catch (e) { return toast(e.message, { type: 'error' }) } toast(`Receipt ${open.receiptNo} resent to ${open.student}`) }}>Resend receipt</Button>}
            </>
          )
        }
      >
        {open && (
          <div className="space-y-6 p-5">
            <div className="rounded-xl bg-subtle p-5 text-center">
              <p className="text-sm text-muted">{open.description}</p>
              <p className="text-3xl font-bold tracking-tight num">{naira(open.amount)}</p>
              <div className="mt-2 flex flex-wrap justify-center gap-1.5">
                <StatusChip status={open.refunded ? 'refunded' : open.status} />
                <StatusChip status={open.verification} />
                {open.flagged && <StatusChip status="flagged" />}
              </div>
            </div>
            <DefinitionList
              items={[
                ['Student', `${open.student} (${open.matric})`],
                ['Faculty', open.faculty],
                ['Date', formatDateTime(open.date)],
                ['Method', <MethodLabel method={open.method} />],
                ['Receipt', open.receiptNo ? <span className="font-mono">{open.receiptNo}</span> : '—'],
                ['Service charge', <span className="num">{naira(open.serviceCharge)}</span>],
              ]}
            />
            <div>
              <h3 className="mb-2 text-sm font-semibold">Gateway response</h3>
              <pre className="overflow-x-auto rounded-xl bg-brand-950 p-4 font-mono text-xs leading-relaxed text-brand-100">
{JSON.stringify({ provider: open.gateway.provider, reference: open.ref, response_code: open.gateway.code, message: open.gateway.message, auth_code: open.gateway.authCode, channel: open.gateway.channel, amount_kobo: open.amount * 100, currency: 'NGN', customer_ip: open.gateway.ip, signature_valid: true }, null, 2)}
              </pre>
            </div>
            <div>
              <h3 className="mb-3 text-sm font-semibold">Timeline</h3>
              <Timeline steps={open.timeline} />
            </div>
            {open.refunded && <Badge tone="info" icon={RotateCcw}>Refunded</Badge>}
          </div>
        )}
      </Drawer>

      <ConfirmDialog
        open={!!confirm}
        onClose={() => { setConfirm(null); setReason(''); setReasonError('') }}
        onConfirm={doAction}
        loading={busy}
        tone={confirm === 'refund' || (confirm === 'flag' && !open?.flagged) ? 'danger' : 'primary'}
        title={confirm === 'verify' ? 'Mark as verified?' : confirm === 'refund' ? `Refund ${open ? naira(open.amount) : ''}?` : open?.flagged ? 'Remove flag?' : 'Flag as suspicious?'}
        confirmLabel={confirm === 'verify' ? 'Mark verified' : confirm === 'refund' ? 'Issue refund' : open?.flagged ? 'Remove flag' : 'Flag payment'}
      >
        {confirm === 'verify' ? (
          <p>Confirm you’ve matched <span className="font-mono">{open?.ref}</span> against the bank statement. This is recorded in the audit log.</p>
        ) : (
          <div className="space-y-3">
            <p>
              {confirm === 'refund'
                ? `The money goes back to the student through the original payment method, and their balance increases by ${open ? naira(open.amount) : ''}. This can’t be undone.`
                : 'Explain why, for the audit record.'}
            </p>
            <Textarea label="Reason" required rows={3} value={reason} onChange={(e) => { setReason(e.target.value); setReasonError('') }} error={reasonError} maxLength={300} />
          </div>
        )}
      </ConfirmDialog>
    </>
  )
}
