import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { Pencil, Ban, CheckCircle2, KeyRound, Mail, Phone, CalendarDays, Send, StickyNote, ReceiptText } from 'lucide-react'
import { useToast } from '../../context/ToastContext'
import { Card, PageHeader, Button, Avatar, StatusChip, ProgressBar, Tabs, Table, Th, Td, ConfirmDialog, Modal, Textarea, EmptyState, DefinitionList, Spinner, ErrorState } from '../../components/ui'
import { MethodLabel } from '../../components/PaymentBits'
import { StudentForm } from './Students'
import { naira, formatDate, formatDateTime, relativeTime } from '../../lib/format'
import { api, useApi } from '../../lib/api'
import ErrorPage from '../public/ErrorPage'
import { useDocumentTitle } from '../../lib/hooks'

export default function StudentDetail() {
  const { id } = useParams()
  const toast = useToast()
  const { data, loading, error, reload, setData } = useApi(`/api/admin/students/${encodeURIComponent(id)}`)
  const s = data?.student
  useDocumentTitle(s?.name || 'Student')
  const [tab, setTab] = useState('payments')
  const [confirm, setConfirm] = useState(null)
  const [busy, setBusy] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [note, setNote] = useState('')
  const [noteError, setNoteError] = useState('')

  if (loading) return <div className="flex min-h-[40vh] items-center justify-center"><Spinner className="size-7" /></div>
  if (error?.status === 404) return <ErrorPage code={404} inApp />
  if (error) return <Card><ErrorState onRetry={() => reload()}>{error.message}</ErrorState></Card>

  const tx = data.payments
  const notes = data.notes
  const pct = s.total ? Math.round((s.paid / s.total) * 100) : 100

  const act = async () => {
    setBusy(true)
    try {
      if (confirm === 'suspend' || confirm === 'activate') {
        await api('/api/admin/students/bulk', { method: 'POST', body: { ids: [s.id], action: confirm } })
        toast(`${s.name} has been ${confirm === 'suspend' ? 'suspended and signed out' : 'reactivated'}`)
        reload({ silent: true })
      } else if (confirm === 'reset') {
        await api(`/api/admin/students/${s.id}/reset-password`, { method: 'POST', body: {} })
        toast(`Password reset link sent to ${s.email}`)
      }
    } catch (e) {
      toast(e.message, { type: 'error' })
    } finally {
      setBusy(false)
      setConfirm(null)
    }
  }

  const remind = async () => {
    try {
      await api('/api/admin/students/bulk', { method: 'POST', body: { ids: [s.id], action: 'remind' } })
      toast(`Reminder sent to ${s.name}`)
    } catch (e) {
      toast(e.message, { type: 'error' })
    }
  }

  const addNote = async (e) => {
    e.preventDefault()
    if (!note.trim()) return
    try {
      const res = await api(`/api/admin/students/${s.id}/notes`, { method: 'POST', body: { text: note } })
      setData((d) => ({ ...d, notes: [res.note, ...d.notes] }))
      setNote('')
      toast('Note added')
    } catch (err) {
      setNoteError(err.message)
    }
  }

  return (
    <>
      <PageHeader
        title={s.name}
        breadcrumbs={[{ label: 'Students', to: '/admin/students' }, { label: s.name }]}
        actions={
          <>
            <Button variant="secondary" icon={Pencil} onClick={() => setEditOpen(true)}>Edit</Button>
            <Button variant="secondary" icon={KeyRound} onClick={() => setConfirm('reset')}>Reset password</Button>
            {s.account === 'active' ? (
              <Button variant="destructive" icon={Ban} onClick={() => setConfirm('suspend')}>Suspend</Button>
            ) : (
              <Button variant="success" icon={CheckCircle2} onClick={() => setConfirm('activate')}>Activate</Button>
            )}
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex items-center gap-4">
              <Avatar name={s.name} size="lg" />
              <div className="min-w-0">
                <p className="text-lg font-semibold">{s.name}</p>
                <p className="font-mono text-sm text-muted">{s.matric}</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5"><StatusChip status={s.account} /><StatusChip status={s.pay} /></div>
              </div>
            </div>
            <ul className="mt-6 space-y-3 text-sm">
              <li className="flex items-center gap-3"><Mail className="size-4 shrink-0 text-muted" aria-hidden /><span className="truncate">{s.email}</span></li>
              <li className="flex items-center gap-3"><Phone className="size-4 shrink-0 text-muted" aria-hidden />{s.phone || '—'}</li>
              <li className="flex items-center gap-3"><CalendarDays className="size-4 shrink-0 text-muted" aria-hidden />Joined {formatDate(s.joined)}</li>
            </ul>
            <div className="mt-6 border-t border-line pt-5">
              <DefinitionList cols={1} items={[['Faculty', s.faculty], ['Department', s.department], ['Level', `${s.level} Level`]]} />
            </div>
          </Card>
          <Card className="p-6">
            <h2 className="font-semibold">Fee summary · 2025/2026</h2>
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted">Total fees</span><span className="font-medium num">{naira(s.total)}</span></div>
              <div className="flex justify-between"><span className="text-muted">Paid</span><span className="font-medium text-emerald-700 num dark:text-emerald-400">{naira(s.paid)}</span></div>
              <div className="flex justify-between"><span className="text-muted">Outstanding</span><span className="font-semibold text-red-700 num dark:text-red-400">{naira(s.total - s.paid)}</span></div>
            </div>
            <ProgressBar value={pct} className="mt-4" tone={pct === 100 ? 'success' : 'brand'} label="Fees paid" />
            <p className="mt-1.5 text-right text-xs text-muted num">{pct}% paid</p>
            {s.total > s.paid && (
              <Button variant="secondary" block icon={Send} className="mt-4" onClick={remind}>Send payment reminder</Button>
            )}
          </Card>
        </div>

        <Card>
          <div className="px-5 pt-3">
            <Tabs value={tab} onChange={setTab} tabs={[{ value: 'payments', label: 'Payment history', count: tx.length }, { value: 'activity', label: 'Activity' }, { value: 'notes', label: 'Notes', count: notes.length }]} />
          </div>
          {tab === 'payments' &&
            (tx.length === 0 ? (
              <EmptyState icon={ReceiptText} title="No payments recorded">This student hasn’t made any payments yet.</EmptyState>
            ) : (
              <Table>
                <thead><tr><Th>Date</Th><Th>Reference</Th><Th className="hidden sm:table-cell">Description</Th><Th align="right">Amount</Th><Th className="hidden md:table-cell">Method</Th><Th>Status</Th></tr></thead>
                <tbody>
                  {tx.map((t) => (
                    <tr key={t.id} className="hover:bg-subtle/60">
                      <Td className="whitespace-nowrap">{formatDate(t.date)}</Td>
                      <Td className="font-mono text-xs">{t.ref}</Td>
                      <Td className="hidden sm:table-cell">{t.description}</Td>
                      <Td align="right" className="font-semibold num">{naira(t.amount)}</Td>
                      <Td className="hidden md:table-cell"><MethodLabel method={t.method} /></Td>
                      <Td><StatusChip status={t.refunded ? 'refunded' : t.status} /></Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            ))}
          {tab === 'activity' && (
            <ul className="divide-y divide-line">
              {data.activity.length === 0 && <li className="px-5 py-4 text-sm text-muted">No recorded activity.</li>}
              {data.activity.map((a, i) => (
                <li key={i} className="flex items-center justify-between gap-3 px-5 py-3.5 text-sm">
                  <span className="min-w-0 first-letter:uppercase">{a.text}</span>
                  <span className="text-xs whitespace-nowrap text-muted">{relativeTime(a.at)}</span>
                </li>
              ))}
            </ul>
          )}
          {tab === 'notes' && (
            <div className="space-y-4 p-5">
              <form onSubmit={addNote} className="space-y-3">
                <Textarea label="Add an internal note" rows={3} value={note} onChange={(e) => { setNote(e.target.value); setNoteError('') }} error={noteError} placeholder="e.g. Student promised to pay hostel balance by Friday." maxLength={500} />
                <Button type="submit" size="sm" icon={StickyNote} disabled={!note.trim()}>Add note</Button>
              </form>
              {notes.length === 0 ? (
                <p className="text-sm text-muted">No notes yet. Notes are only visible to Bursary staff.</p>
              ) : (
                <ul className="space-y-3">
                  {notes.map((n) => (
                    <li key={n.id} className="rounded-lg bg-subtle p-3 text-sm">
                      {/* Rendered as text, never as HTML, so injected markup is harmless. */}
                      <p className="break-words whitespace-pre-wrap">{n.text}</p>
                      <p className="mt-1 text-xs text-muted">{n.by} · {formatDateTime(n.at)}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </Card>
      </div>

      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit student" size="lg">
        <StudentForm
          initial={{ name: s.name, matric: s.matric, email: s.email, phone: s.phone || '', faculty: s.faculty, department: s.department, level: s.level }}
          submitLabel="Save changes"
          onCancel={() => setEditOpen(false)}
          onSubmit={async (f) => {
            try {
              await api(`/api/admin/students/${s.id}`, { method: 'PATCH', body: f })
              toast('Student details updated')
              setEditOpen(false)
              reload({ silent: true })
            } catch (e) {
              return Object.keys(e.fields).length ? e.fields : { name: e.message }
            }
          }}
        />
      </Modal>

      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={act}
        loading={busy}
        tone={confirm === 'suspend' ? 'danger' : 'primary'}
        title={confirm === 'suspend' ? `Suspend ${s.name}?` : confirm === 'activate' ? `Reactivate ${s.name}?` : 'Send password reset?'}
        confirmLabel={confirm === 'suspend' ? 'Suspend account' : confirm === 'activate' ? 'Reactivate' : 'Send reset link'}
      >
        {confirm === 'suspend'
          ? 'They will be signed out immediately and won’t be able to sign in or pay until reactivated.'
          : confirm === 'activate'
            ? 'They will be able to sign in and make payments again.'
            : `A one-time reset link will be emailed to ${s.email}. It expires in 30 minutes.`}
      </ConfirmDialog>
    </>
  )
}
