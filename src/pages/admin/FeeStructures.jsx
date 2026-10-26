import { useEffect, useState } from 'react'
import { Plus, Pencil, Copy, Archive, History, MoreVertical, Send, Layers, Users } from 'lucide-react'
import { api, useApi } from '../../lib/api'
import { useToast } from '../../context/ToastContext'
import {
  Card, PageHeader, Button, StatusChip, Badge, Modal, Input, Select, Toggle, ConfirmDialog, Dropdown, MenuItem, Drawer, Tabs, EmptyState, Alert, SegmentedControl, ErrorState, Skeleton,
} from '../../components/ui'
import { naira, formatDate, formatDateTime } from '../../lib/format'
import { FACULTIES, LEVELS, SESSIONS, SEMESTERS } from '../../lib/data'
import { useDocumentTitle } from '../../lib/hooks'

const EMPTY = { name: '', amount: '', faculty: 'All', department: 'All', level: 'All', session: SESSIONS[0], semester: SEMESTERS[0], dueDate: '', installments: false, minInstallment: '', mandatory: true }

/** Live count of students a fee would apply to, from the API. */
function useAffected(f) {
  const [n, setN] = useState(null)
  useEffect(() => {
    let alive = true
    const t = setTimeout(() => {
      api('/api/admin/fees/impact', { method: 'POST', body: { faculty: f.faculty, department: f.department, level: f.level } })
        .then((r) => alive && setN(r.affected))
        .catch(() => {})
    }, 250)
    return () => {
      alive = false
      clearTimeout(t)
    }
  }, [f.faculty, f.department, f.level])
  return n
}

const toPayload = (f) => ({
  name: f.name,
  category: f.category || 'General',
  amount: Number(f.amount),
  faculty: f.faculty,
  department: f.department,
  level: f.level,
  session: f.session,
  semester: f.semester,
  dueDate: f.dueDate,
  installments: !!f.installments,
  minInstallment: f.installments ? Number(f.minInstallment) : 0,
  mandatory: !!f.mandatory,
})

function FeeForm({ initial, onSave, onCancel }) {
  const [f, setF] = useState(initial ? { ...initial, amount: String(initial.amount), minInstallment: String(initial.minInstallment || ''), dueDate: initial.dueDate?.slice(0, 10) || '' } : EMPTY)
  const [errors, setErrors] = useState({})
  const set = (k) => (e) => {
    const v = e?.target ? e.target.value : e
    setF((x) => ({ ...x, [k]: v, ...(k === 'faculty' ? { department: 'All' } : {}) }))
    setErrors((er) => ({ ...er, [k]: '' }))
  }
  const submit = (e, publish) => {
    e?.preventDefault()
    const amount = Number(f.amount)
    const min = Number(f.minInstallment)
    const errs = {
      name: f.name.trim().length < 3 ? 'Enter a fee name (at least 3 characters)' : '',
      amount: !f.amount ? 'Enter an amount' : !(amount > 0) ? 'Amount must be greater than zero' : amount > 10_000_000 ? 'Amount looks too high. Check the figure.' : '',
      dueDate: !f.dueDate ? 'Choose a due date' : '',
      minInstallment: f.installments && !(min > 0) ? 'Enter a minimum installment' : f.installments && min >= amount ? 'Must be less than the full amount' : '',
    }
    setErrors(errs)
    if (Object.values(errs).some(Boolean)) return
    onSave({ ...f, amount, minInstallment: f.installments ? min : 0, dueDate: new Date(`${f.dueDate}T23:59:00`).toISOString() }, publish)
  }
  const affected = useAffected(f)
  return (
    <form onSubmit={(e) => submit(e, true)} noValidate className="space-y-4">
      <Input label="Fee name" required value={f.name} onChange={set('name')} error={errors.name} placeholder="e.g. Tuition fee" maxLength={80} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Amount (₦)" required inputMode="decimal" mono value={f.amount} onChange={(e) => set('amount')(e.target.value.replace(/[^\d.]/g, ''))} error={errors.amount} hint={f.amount ? naira(f.amount) : undefined} />
        <Input label="Due date" required type="date" value={f.dueDate} onChange={set('dueDate')} error={errors.dueDate} />
      </div>
      <fieldset className="rounded-xl border border-line p-4">
        <legend className="px-1 text-sm font-semibold">Who pays this fee</legend>
        <div className="grid gap-4 sm:grid-cols-3">
          <Select label="Faculty" options={['All', ...Object.keys(FACULTIES)]} value={f.faculty} onChange={set('faculty')} />
          <Select label="Department" options={['All', ...(f.faculty !== 'All' ? FACULTIES[f.faculty] : [])]} value={f.department} onChange={set('department')} disabled={f.faculty === 'All'} />
          <Select label="Level" options={['All', ...LEVELS]} value={f.level} onChange={set('level')} />
        </div>
        <p className="mt-3 flex items-center gap-1.5 text-sm text-muted"><Users className="size-4" aria-hidden /> Applies to about <span className="font-semibold text-fg num">{affected == null ? '…' : affected.toLocaleString()}</span> students</p>
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-2">
        <Select label="Session" options={SESSIONS} value={f.session} onChange={set('session')} />
        <Select label="Semester" options={SEMESTERS} value={f.semester} onChange={set('semester')} />
      </div>
      <div className="space-y-3 rounded-xl border border-line p-4">
        <Toggle label="Allow installments" description="Students can pay this fee in parts" checked={f.installments} onChange={set('installments')} />
        {f.installments && <Input label="Minimum installment (₦)" inputMode="decimal" mono value={f.minInstallment} onChange={(e) => set('minInstallment')(e.target.value.replace(/[^\d.]/g, ''))} error={errors.minInstallment} />}
        <div className="flex items-center justify-between gap-3 pt-1">
          <span className="text-sm font-medium">Requirement</span>
          <SegmentedControl label="Requirement" options={[{ value: 'mandatory', label: 'Mandatory' }, { value: 'optional', label: 'Optional' }]} value={f.mandatory ? 'mandatory' : 'optional'} onChange={(v) => set('mandatory')(v === 'mandatory')} />
        </div>
      </div>
      <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button type="button" variant="secondary" onClick={(e) => submit(e, false)}>Save as draft</Button>
        <Button type="submit" icon={Send}>{initial ? 'Save and publish' : 'Publish fee'}</Button>
      </div>
    </form>
  )
}

export default function FeeStructures() {
  useDocumentTitle('Fee Structures')
  const { data, loading, error, reload } = useApi('/api/admin/fees', { pick: (r) => r.fees })
  const [busy, setBusy] = useState(false)
  const [historyData, setHistoryData] = useState([])
  const toast = useToast()
  const [session, setSession] = useState(SESSIONS[0])
  const [showArchived, setShowArchived] = useState(false)
  const [form, setForm] = useState(null) // { fee?: object }
  const [pending, setPending] = useState(null) // { data, publish, fee }
  const [archive, setArchive] = useState(null)
  const [historyFor, setHistoryFor] = useState(null)

  const fees = (data || []).filter((f) => f.session === session && (showArchived || f.status !== 'archived'))

  const run = async (fn, success) => {
    setBusy(true)
    try {
      const res = await fn()
      toast(typeof success === 'function' ? success(res) : success)
      reload({ silent: true })
      return res
    } catch (e) {
      toast(e.message, { type: 'error' })
      return null
    } finally {
      setBusy(false)
    }
  }

  const commit = async ({ data, publish, fee, draftPublish }) => {
    let ok
    if (draftPublish) ok = await run(() => api(`/api/admin/fees/${fee.id}/publish`, { method: 'POST', body: {} }), `${fee.name} published`)
    else if (fee) ok = await run(() => api(`/api/admin/fees/${fee.id}`, { method: 'PATCH', body: { ...toPayload(data), publish } }), publish ? `${data.name} updated and published` : `${data.name} saved`)
    else ok = await run(() => api('/api/admin/fees', { method: 'POST', body: { ...toPayload(data), publish } }), (r) => (publish ? `${data.name} published to ${r.fee.affected.toLocaleString()} students` : `${data.name} saved as draft`))
    setPending(null)
    if (ok) setForm(null)
  }

  const openPending = async (p) => {
    const d = p.data
    const r = await api('/api/admin/fees/impact', { method: 'POST', body: { faculty: d.faculty, department: d.department, level: d.level } }).catch(() => ({ affected: null }))
    setPending({ ...p, affected: r.affected })
  }

  const openHistory = async (f) => {
    setHistoryFor(f)
    setHistoryData([])
    const r = await api(`/api/admin/fees/${f.id}/history`).catch(() => ({ versions: [] }))
    setHistoryData(r.versions)
  }

  return (
    <>
      <PageHeader
        title="Fee Structures"
        description="Define what each faculty, department and level pays per session."
        breadcrumbs={[{ label: 'Fee Structures' }]}
        actions={<Button icon={Plus} onClick={() => setForm({})}>Create fee</Button>}
      />

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <Tabs value={session} onChange={setSession} tabs={SESSIONS.map((s) => ({ value: s, label: `${s} session` }))} />
        <Toggle label="Show archived" checked={showArchived} onChange={setShowArchived} />
      </div>

      {error ? (
        <Card><ErrorState onRetry={() => reload()}>{error.message}</ErrorState></Card>
      ) : loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{[1, 2, 3].map((i) => <Card key={i} className="p-5"><Skeleton className="h-5 w-40" /><Skeleton className="mt-4 h-8 w-32" /><Skeleton className="mt-4 h-4 w-full" /></Card>)}</div>
      ) : fees.length === 0 ? (
        <Card><EmptyState icon={Layers} title="No fees for this session" action={<Button icon={Plus} onClick={() => setForm({})}>Create fee</Button>}>Create the first fee for {session}.</EmptyState></Card>
      ) : (
        SEMESTERS.map((sem) => {
          const list = fees.filter((f) => f.semester === sem)
          if (!list.length) return null
          const total = list.filter((f) => f.status === 'published' && f.faculty === 'All').reduce((s, f) => s + f.amount, 0)
          return (
            <section key={sem} className="mb-8">
              <div className="mb-3 flex items-baseline justify-between gap-3">
                <h2 className="text-lg font-semibold">{sem}</h2>
                <p className="text-sm text-muted">Base total (all students): <span className="font-semibold text-fg num">{naira(total)}</span></p>
              </div>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {list.map((f) => (
                  <Card key={f.id} className={`flex flex-col p-5 ${f.status === 'archived' ? 'opacity-60' : ''}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="font-semibold">{f.name}</h3>
                        <p className="mt-0.5 text-xs text-muted">v{f.version} · Due {formatDate(f.dueDate)}</p>
                      </div>
                      <Dropdown trigger={({ toggle, open }) => (
                        <button onClick={toggle} aria-expanded={open} className="-m-1 flex size-9 items-center justify-center rounded-lg text-muted hover:bg-subtle" aria-label={`Actions for ${f.name}`}><MoreVertical className="size-4" /></button>
                      )}>
                        <MenuItem icon={Pencil} onClick={() => setForm({ fee: f })}>Edit</MenuItem>
                        <MenuItem icon={Copy} onClick={() => run(() => api(`/api/admin/fees/${f.id}/duplicate`, { method: 'POST', body: {} }), (r) => `Duplicated as draft: ${r.fee.name}`)}>Duplicate</MenuItem>
                        <MenuItem icon={History} onClick={() => openHistory(f)}>Version history</MenuItem>
                        {f.status !== 'archived' && <MenuItem icon={Archive} danger onClick={() => setArchive(f)}>Archive</MenuItem>}
                      </Dropdown>
                    </div>
                    <p className="mt-4 text-2xl font-bold tracking-tight num">{naira(f.amount)}</p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      <StatusChip status={f.status} />
                      <Badge tone={f.mandatory ? 'brand' : 'neutral'}>{f.mandatory ? 'Mandatory' : 'Optional'}</Badge>
                      {f.installments && <Badge tone="info">Installments · min {naira(f.minInstallment, { compact: true })}</Badge>}
                    </div>
                    <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-line pt-4 text-xs">
                      <div><dt className="text-muted">Faculty</dt><dd className="truncate font-medium">{f.faculty}</dd></div>
                      <div><dt className="text-muted">Dept</dt><dd className="truncate font-medium">{f.department}</dd></div>
                      <div><dt className="text-muted">Level</dt><dd className="font-medium">{f.level}</dd></div>
                    </dl>
                    <p className="mt-3 flex items-center gap-1.5 text-xs text-muted"><Users className="size-3.5" aria-hidden /> {f.affected.toLocaleString()} students</p>
                    {f.status === 'draft' && (
                      <Button size="sm" className="mt-4" icon={Send} onClick={() => openPending({ data: f, publish: true, fee: f, draftPublish: true })}>Publish</Button>
                    )}
                  </Card>
                ))}
              </div>
            </section>
          )
        })
      )}

      <Modal open={!!form} onClose={() => setForm(null)} title={form?.fee ? `Edit ${form.fee.name}` : 'Create fee'} description="Changes to published fees update every affected student’s balance." size="lg">
        {form && <FeeForm initial={form.fee} onCancel={() => setForm(null)} onSave={(d, publish) => (publish ? openPending({ data: d, publish, fee: form.fee }) : commit({ data: d, publish, fee: form.fee }))} />}
      </Modal>

      <ConfirmDialog
        open={!!pending}
        onClose={() => setPending(null)}
        onConfirm={() => commit(pending)}
        loading={busy}
        title={pending?.fee ? 'Publish changes?' : 'Publish this fee?'}
        confirmLabel="Publish"
      >
        {pending && (
          <>
            <Alert tone="warning" className="mb-3" title={`This affects ${pending.affected == null ? 'the matching' : pending.affected.toLocaleString()} students`}>
              Their balances will update immediately and they’ll be notified.
            </Alert>
            <p>
              <span className="font-medium text-fg">{pending.data.name}</span>: {naira(pending.data.amount)}, due {formatDate(pending.data.dueDate)}.
              {pending.fee && pending.fee.amount !== pending.data.amount && <> Previously {naira(pending.fee.amount)}.</>}
            </p>
          </>
        )}
      </ConfirmDialog>

      <ConfirmDialog
        open={!!archive}
        onClose={() => setArchive(null)}
        tone="danger"
        confirmLabel="Archive fee"
        title={`Archive ${archive?.name}?`}
        loading={busy}
        onConfirm={async () => {
          await run(() => api(`/api/admin/fees/${archive.id}/archive`, { method: 'POST', body: {} }), `${archive.name} archived`)
          setArchive(null)
        }}
      >
        Archived fees stop appearing on new students’ schedules. Existing payments and receipts are kept. You can view archived fees at any time.
      </ConfirmDialog>

      <Drawer open={!!historyFor} onClose={() => setHistoryFor(null)} title="Version history" description={historyFor?.name}>
        <ol className="space-y-4 p-5">
          {historyData.length === 0 && <li className="text-sm text-muted">Loading…</li>}
          {historyData.map((h) => (
            <li key={h.v} className="rounded-xl border border-line p-4">
              <div className="flex items-center justify-between">
                <Badge tone={h.v === historyFor.version ? 'success' : 'neutral'}>v{h.v}{h.v === historyFor.version ? ' · current' : ''}</Badge>
                <span className="text-xs text-muted">{formatDateTime(h.at)}</span>
              </div>
              <p className="mt-2 text-sm">{h.change}</p>
              <p className="text-xs text-muted">by {h.by}</p>
            </li>
          ))}
        </ol>
      </Drawer>
    </>
  )
}
