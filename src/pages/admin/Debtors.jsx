import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Send, FileDown, AlertOctagon, CheckCircle2, Mail, MessageSquare } from 'lucide-react'
import { api, useApi } from '../../lib/api'
import { useToast } from '../../context/ToastContext'
import { Card, PageHeader, SearchInput, Select, Table, Th, Td, useSort, usePagination, Pagination, Button, EmptyState, Modal, StatCard, Badge, Checkbox, ProgressBar, SegmentedControl, ErrorState, SkeletonTable } from '../../components/ui'
import { naira, downloadCSV, cn } from '../../lib/format'
import { FACULTIES, studentPayStatus } from '../../lib/data'
import { useDocumentTitle } from '../../lib/hooks'

const BUCKETS = [
  { key: '0-30', label: '0 to 30 days', tone: 'warning' },
  { key: '31-60', label: '31 to 60 days', tone: 'danger' },
  { key: '60+', label: '60+ days', tone: 'danger' },
]

/** Days since the student's oldest unpaid fee fell due (0 if nothing is overdue yet). */
function ageOf(s) {
  if (!s.overdueSince) return 0
  return Math.max(0, Math.floor((Date.now() - new Date(s.overdueSince).getTime()) / 86400000))
}

export default function Debtors() {
  useDocumentTitle('Debtors')
  const { data, loading, error, reload } = useApi('/api/admin/students', { pick: (r) => r.students })
  const toast = useToast()
  const [q, setQ] = useState('')
  const [faculty, setFaculty] = useState('')
  const [bucket, setBucket] = useState('all')
  const [selected, setSelected] = useState(new Set())
  const [preview, setPreview] = useState(false)
  const [channels, setChannels] = useState({ email: true, sms: true })
  const [sending, setSending] = useState(false)

  const debtors = useMemo(
    () =>
      (data || [])
        .filter((s) => studentPayStatus(s) !== 'paid')
        .map((s) => {
          const days = ageOf(s)
          return { ...s, balance: s.total - s.paid, days, bucket: days <= 30 ? '0-30' : days <= 60 ? '31-60' : '60+' }
        }),
    [data],
  )
  const rows = debtors.filter((d) => (bucket === 'all' || d.bucket === bucket) && (!faculty || d.faculty === faculty) && (!q || `${d.name} ${d.matric}`.toLowerCase().includes(q.toLowerCase())))
  const { sorted, sort, onSort } = useSort(rows, { key: 'balance', dir: 'desc' })
  const pg = usePagination(sorted, 10)
  const totalOwed = debtors.reduce((s, d) => s + d.balance, 0)
  const byBucket = Object.fromEntries(BUCKETS.map((b) => [b.key, debtors.filter((d) => d.bucket === b.key)]))
  const recipients = selected.size ? debtors.filter((d) => selected.has(d.id)) : rows
  const first = recipients[0]

  const toggle = (id) => setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })

  return (
    <>
      <PageHeader
        title="Debtors"
        description="Students with outstanding balances, grouped by how long they’ve owed."
        breadcrumbs={[{ label: 'Debtors' }]}
        actions={
          <>
            <Button variant="secondary" icon={FileDown} onClick={() => { downloadCSV('debtors.csv', sorted.map((d) => ({ Name: d.name, Matric: d.matric, Faculty: d.faculty, Level: d.level, Balance: d.balance, 'Days overdue': d.days, Bucket: d.bucket }))); toast('Debtors list exported') }}>Export</Button>
            <Button icon={Send} onClick={() => setPreview(true)} disabled={!rows.length}>Send reminders{selected.size ? ` (${selected.size})` : ''}</Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total outstanding" value={naira(totalOwed, { compact: true })} sub={`${debtors.length} students`} icon={AlertOctagon} tone="danger" />
        {BUCKETS.map((b) => {
          const list = byBucket[b.key]
          const amt = list.reduce((s, d) => s + d.balance, 0)
          return (
            <button key={b.key} onClick={() => setBucket(bucket === b.key ? 'all' : b.key)} className="text-left" aria-pressed={bucket === b.key}>
              <Card className={cn('h-full p-5 transition-colors', bucket === b.key && 'border-brand-500 ring-1 ring-brand-500')}>
                <div className="flex items-center justify-between"><p className="text-sm font-medium text-muted">{b.label}</p><Badge tone={b.tone}>{list.length}</Badge></div>
                <p className="mt-2 text-2xl font-bold tracking-tight num">{naira(amt, { compact: true })}</p>
                <ProgressBar value={(amt / totalOwed) * 100} size="sm" className="mt-3" tone={b.key === '0-30' ? 'warning' : 'danger'} label={`${b.label} share`} />
              </Card>
            </button>
          )
        })}
      </div>

      <Card className="mt-6">
        <div className="flex flex-col gap-3 border-b border-line p-4 lg:flex-row lg:items-center">
          <SearchInput value={q} onChange={setQ} placeholder="Search name or matric" label="Search debtors" className="lg:w-72" />
          <Select aria-label="Faculty" placeholder="All faculties" options={Object.keys(FACULTIES)} value={faculty} onChange={(e) => setFaculty(e.target.value)} className="lg:w-56" />
          <div className="overflow-x-auto lg:ml-auto">
            <SegmentedControl label="Ageing bucket" options={[{ value: 'all', label: 'All' }, ...BUCKETS.map((b) => ({ value: b.key, label: b.key }))]} value={bucket} onChange={setBucket} />
          </div>
        </div>
        {error ? (
          <ErrorState onRetry={() => reload()}>{error.message}</ErrorState>
        ) : loading ? (
          <SkeletonTable rows={8} cols={5} />
        ) : rows.length === 0 ? (
          <EmptyState icon={CheckCircle2} title="No debtors here">Nobody in this group owes fees.</EmptyState>
        ) : (
          <>
            <Table>
              <thead>
                <tr>
                  <Th className="w-10"><span className="sr-only">Select</span></Th>
                  <Th sortKey="name" sort={sort} onSort={onSort}>Student</Th>
                  <Th className="hidden md:table-cell">Faculty</Th>
                  <Th sortKey="days" sort={sort} onSort={onSort}>Overdue</Th>
                  <Th sortKey="balance" sort={sort} onSort={onSort} align="right">Balance</Th>
                </tr>
              </thead>
              <tbody>
                {pg.pageRows.map((d) => (
                  <tr key={d.id} className="hover:bg-subtle/60">
                    <Td><input type="checkbox" className="size-4 accent-brand-700" checked={selected.has(d.id)} onChange={() => toggle(d.id)} aria-label={`Select ${d.name}`} /></Td>
                    <Td><Link to={`/admin/students/${d.id}`} className="font-medium hover:underline">{d.name}</Link><p className="font-mono text-xs text-muted">{d.matric}</p></Td>
                    <Td className="hidden md:table-cell">{d.faculty}</Td>
                    <Td><Badge tone={d.bucket === '0-30' ? 'warning' : 'danger'}>{d.days} days</Badge></Td>
                    <Td align="right" className="font-semibold text-red-700 num dark:text-red-400">{naira(d.balance)}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <div className="border-t border-line"><Pagination {...pg} /></div>
          </>
        )}
      </Card>

      <Modal
        open={preview}
        onClose={() => setPreview(false)}
        title="Send payment reminders"
        description={`${recipients.length} recipient${recipients.length === 1 ? '' : 's'}${selected.size ? ' (selected)' : ' (current filter)'}`}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setPreview(false)}>Cancel</Button>
            <Button
              icon={Send}
              loading={sending}
              disabled={!channels.email && !channels.sms}
              onClick={async () => {
                setSending(true)
                try {
                  const res = await api('/api/admin/students/bulk', { method: 'POST', body: { ids: recipients.map((r) => r.id), action: 'remind' } })
                  setPreview(false)
                  setSelected(new Set())
                  toast(`Reminders sent to ${res.count} students`, { title: 'Reminders queued' })
                } catch (e) {
                  toast(e.message, { type: 'error' })
                } finally {
                  setSending(false)
                }
              }}
            >
              Send to {recipients.length}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="flex flex-wrap gap-5">
            <Checkbox label={<span className="inline-flex items-center gap-1.5"><Mail className="size-4" aria-hidden /> Email</span>} checked={channels.email} onChange={(v) => setChannels((c) => ({ ...c, email: v }))} />
            <Checkbox label={<span className="inline-flex items-center gap-1.5"><MessageSquare className="size-4" aria-hidden /> SMS</span>} checked={channels.sms} onChange={(v) => setChannels((c) => ({ ...c, sms: v }))} />
          </div>
          {first && (
            <div className="rounded-xl border border-line">
              <div className="border-b border-line bg-subtle/60 px-4 py-2.5 text-xs text-muted">
                Preview for <span className="font-medium text-fg">{first.name}</span> · To: {first.email}
              </div>
              <div className="space-y-3 p-4 text-sm">
                <p className="font-semibold">Subject: Reminder: {naira(first.balance)} outstanding on your school fees</p>
                <p>Dear {first.name.split(' ')[0]},</p>
                <p>
                  Our records show an outstanding balance of <span className="font-semibold">{naira(first.balance)}</span> on your 2025/2026 fees, overdue by {first.days} days. Please pay as soon as possible to avoid restrictions on exam card printing and course registration.
                </p>
                <p>Pay securely at <span className="font-medium text-brand-700 dark:text-brand-300">{window.location.host}/app/pay</span>. Installments are available for tuition and hostel fees.</p>
                <p className="text-muted">Office of the Bursar, Kingsgate University</p>
              </div>
            </div>
          )}
          <p className="text-xs text-muted">Placeholders such as name and balance are filled in per student. Messages are sent from a queue and logged in the audit log.</p>
        </div>
      </Modal>
    </>
  )
}
