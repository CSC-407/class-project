import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { UserPlus, Upload, FileDown, Ban, CheckCircle2, Send, X, FileSpreadsheet, AlertCircle, Users, SearchX, Download } from 'lucide-react'
import { api, useApi } from '../../lib/api'
import { useToast } from '../../context/ToastContext'
import {
  Card, PageHeader, SearchInput, Select, Table, Th, Td, useSort, usePagination, Pagination, StatusChip, Button, EmptyState, FilterChips,
  SkeletonTable, ErrorState, Modal, Input, Avatar, ConfirmDialog, Alert, Badge,
} from '../../components/ui'
import { naira, downloadCSV, cn } from '../../lib/format'
import { FACULTIES, LEVELS, studentPayStatus } from '../../lib/data'
import { validators, MATRIC_RE, EMAIL_RE } from '../../lib/validation'
import { useDocumentTitle } from '../../lib/hooks'

export function StudentForm({ initial, onSubmit, onCancel, submitLabel = 'Add student' }) {
  const [form, setForm] = useState(initial || { name: '', matric: '', email: '', phone: '', faculty: '', department: '', level: '' })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const set = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.value, ...(k === 'faculty' ? { department: '' } : {}) }))
    setErrors((er) => ({ ...er, [k]: '' }))
  }
  const submit = async (e) => {
    e.preventDefault()
    const errs = {
      name: validators.name(form.name),
      matric: validators.matric(form.matric),
      email: validators.email(form.email),
      phone: form.phone ? validators.phone(form.phone) : '',
      faculty: validators.required('faculty')(form.faculty),
      department: validators.required('department')(form.department),
      level: validators.required('level')(form.level),
    }
    setErrors(errs)
    if (Object.values(errs).some(Boolean)) return
    setLoading(true)
    const err = await onSubmit(form)
    setLoading(false)
    if (err) setErrors(err)
  }
  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <Input label="Full name" required value={form.name} onChange={set('name')} error={errors.name} maxLength={80} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Matric number" required mono placeholder="25/0001" value={form.matric} onChange={set('matric')} error={errors.matric} maxLength={7} />
        <Input label="Phone (optional)" type="tel" value={form.phone} onChange={set('phone')} error={errors.phone} />
      </div>
      <Input label="Email" required type="email" value={form.email} onChange={set('email')} error={errors.email} />
      <div className="grid gap-4 sm:grid-cols-3">
        <Select label="Faculty" required placeholder="Select" options={Object.keys(FACULTIES)} value={form.faculty} onChange={set('faculty')} error={errors.faculty} />
        <Select label="Department" required placeholder="Select" options={form.faculty ? FACULTIES[form.faculty] : []} disabled={!form.faculty} value={form.department} onChange={set('department')} error={errors.department} />
        <Select label="Level" required placeholder="Select" options={LEVELS} value={form.level} onChange={set('level')} error={errors.level} />
      </div>
      <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
        <Button variant="secondary" type="button" onClick={onCancel}>Cancel</Button>
        <Button type="submit" loading={loading}>{submitLabel}</Button>
      </div>
    </form>
  )
}

function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim())
  if (!lines.length) return { rows: [], headerError: 'The file is empty.' }
  const header = lines[0].split(',').map((h) => h.trim().toLowerCase())
  const required = ['name', 'matric', 'email', 'faculty', 'department', 'level']
  const missing = required.filter((r) => !header.includes(r))
  if (missing.length) return { rows: [], headerError: `Missing column${missing.length > 1 ? 's' : ''}: ${missing.join(', ')}` }
  return {
    rows: lines.slice(1, 501).map((line, i) => {
      const cells = line.split(',').map((c) => c.trim().replace(/^"|"$/g, ''))
      const r = Object.fromEntries(header.map((h, j) => [h, cells[j] || '']))
      const errs = []
      if (!r.name || r.name.split(' ').length < 2) errs.push('Full name required')
      if (!MATRIC_RE.test(r.matric)) errs.push('Invalid matric')
      if (!EMAIL_RE.test(r.email)) errs.push('Invalid email')
      if (!FACULTIES[r.faculty]) errs.push('Unknown faculty')
      else if (!FACULTIES[r.faculty].includes(r.department)) errs.push('Department not in faculty')
      if (!LEVELS.includes(r.level)) errs.push('Invalid level')
      return { line: i + 2, ...r, errors: errs }
    }),
  }
}

const SAMPLE_CSV = `name,matric,email,faculty,department,level
Ngozi Adeyemi,25/0101,ngozi.adeyemi@students.kingsgate.edu.ng,Sciences,Physics,100
Ibrahim Musa,25/0102,ibrahim.musa@students.kingsgate.edu.ng,Law,Public Law,100
Temi,25/01X3,temi@bad,Arts,Physics,700
Kelechi Obi,25/0104,kelechi.obi@students.kingsgate.edu.ng,Engineering,Civil Engineering,100`

function BulkImport({ open, onClose, onImport }) {
  const fileRef = useRef(null)
  const [result, setResult] = useState(null)
  const [fileName, setFileName] = useState('')
  const [loading, setLoading] = useState(false)
  const reset = () => { setResult(null); setFileName('') }
  const handleText = (text, name) => { setFileName(name); setResult(parseCSV(text)) }
  const onFile = (e) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    if (!/\.csv$/i.test(f.name)) return setResult({ rows: [], headerError: 'Only .csv files are accepted.' })
    if (f.size > 1024 * 1024) return setResult({ rows: [], headerError: 'The file is larger than 1 MB.' })
    const reader = new FileReader()
    reader.onload = () => handleText(String(reader.result), f.name)
    reader.readAsText(f)
  }
  const valid = result?.rows.filter((r) => !r.errors.length) || []
  const invalid = result?.rows.filter((r) => r.errors.length) || []
  return (
    <Modal
      open={open}
      onClose={() => { reset(); onClose() }}
      title="Bulk import students"
      description="Upload a CSV with columns: name, matric, email, faculty, department, level"
      size="xl"
      footer={
        result && !result.headerError ? (
          <>
            <Button variant="secondary" onClick={reset}>Choose another file</Button>
            <Button
              disabled={!valid.length}
              loading={loading}
              onClick={async () => {
                setLoading(true)
                const ok = await onImport(valid)
                setLoading(false)
                if (ok) {
                  reset()
                  onClose()
                }
              }}
            >
              Import {valid.length} valid row{valid.length === 1 ? '' : 's'}
            </Button>
          </>
        ) : null
      }
    >
      {!result || result.headerError ? (
        <div className="space-y-4">
          {result?.headerError && <Alert tone="danger" title="We couldn’t read that file">{result.headerError}</Alert>}
          <button
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault()
              const f = e.dataTransfer.files?.[0]
              if (f) onFile({ target: { files: [f], value: '' } })
            }}
            className="flex w-full flex-col items-center rounded-xl border-2 border-dashed border-line p-10 text-center transition-colors hover:border-brand-400 hover:bg-subtle/60"
          >
            <Upload className="size-8 text-brand-600 dark:text-brand-300" aria-hidden />
            <span className="mt-3 font-medium">Drop a CSV file here, or click to browse</span>
            <span className="mt-1 text-sm text-muted">.csv only, up to 1 MB and 500 rows</span>
          </button>
          <input ref={fileRef} type="file" accept=".csv,text/csv" className="sr-only" onChange={onFile} aria-label="CSV file" />
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" icon={Download} onClick={() => {
              const blob = new Blob([SAMPLE_CSV.split('\n').slice(0, 1).join('\n') + '\n'], { type: 'text/csv' })
              const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'students-template.csv'; a.click()
            }}>Download template</Button>
            <Button variant="ghost" size="sm" icon={FileSpreadsheet} onClick={() => handleText(SAMPLE_CSV, 'sample-students.csv')}>Use sample file (demo)</Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <FileSpreadsheet className="size-4 text-muted" aria-hidden />
            <span className="font-medium">{fileName}</span>
            <Badge tone="success" icon={CheckCircle2}>{valid.length} valid</Badge>
            {invalid.length > 0 && <Badge tone="danger" icon={AlertCircle}>{invalid.length} with errors</Badge>}
          </div>
          {invalid.length > 0 && (
            <Alert tone="warning" title="Validation report">Rows with errors will be skipped. Fix them in your file and import again.</Alert>
          )}
          <div className="max-h-80 overflow-auto rounded-xl border border-line">
            <Table>
              <thead><tr><Th>Line</Th><Th>Name</Th><Th>Matric</Th><Th>Email</Th><Th>Faculty / Dept</Th><Th>Level</Th><Th>Result</Th></tr></thead>
              <tbody>
                {result.rows.map((r) => (
                  <tr key={r.line} className={r.errors.length ? 'bg-red-50/60 dark:bg-red-500/5' : ''}>
                    <Td className="text-muted num">{r.line}</Td>
                    <Td>{r.name}</Td>
                    <Td className="font-mono text-xs">{r.matric}</Td>
                    <Td className="max-w-48 truncate text-xs">{r.email}</Td>
                    <Td className="text-xs">{r.faculty} / {r.department}</Td>
                    <Td>{r.level}</Td>
                    <Td>{r.errors.length ? <span className="text-xs text-red-700 dark:text-red-400">{r.errors.join('; ')}</span> : <StatusChip status="pass" label="OK" />}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        </div>
      )}
    </Modal>
  )
}

export default function Students() {
  useDocumentTitle('Students')
  const { data, loading, error, reload } = useApi('/api/admin/students', { pick: (r) => r.students })
  const students = data || []
  const toast = useToast()
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [faculty, setFaculty] = useState('')
  const [department, setDepartment] = useState('')
  const [level, setLevel] = useState('')
  const [pay, setPay] = useState('')
  const [account, setAccount] = useState('')
  const [selected, setSelected] = useState(new Set())
  const [addOpen, setAddOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [bulkAction, setBulkAction] = useState(null)

  const rows = useMemo(
    () =>
      students
        .map((s) => ({ ...s, balance: s.total - s.paid, pay: studentPayStatus(s) }))
        .filter(
          (s) =>
            (!q || `${s.name} ${s.matric} ${s.email}`.toLowerCase().includes(q.toLowerCase())) &&
            (!faculty || s.faculty === faculty) &&
            (!department || s.department === department) &&
            (!level || s.level === level) &&
            (!pay || s.pay === pay) &&
            (!account || s.account === account),
        ),
    [students, q, faculty, department, level, pay, account],
  )
  const { sorted, sort, onSort } = useSort(rows, { key: 'name', dir: 'asc' })
  const pg = usePagination(sorted, 10)
  const allOnPage = pg.pageRows.length > 0 && pg.pageRows.every((r) => selected.has(r.id))

  const toggle = (id) => setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  const togglePage = () => setSelected((s) => { const n = new Set(s); pg.pageRows.forEach((r) => (allOnPage ? n.delete(r.id) : n.add(r.id))); return n })

  const chips = [
    q && { key: 'q', label: `“${q}”`, onRemove: () => setQ('') },
    faculty && { key: 'f', label: faculty, onRemove: () => { setFaculty(''); setDepartment('') } },
    department && { key: 'd', label: department, onRemove: () => setDepartment('') },
    level && { key: 'l', label: `${level} Level`, onRemove: () => setLevel('') },
    pay && { key: 'p', label: `Payment: ${pay}`, onRemove: () => setPay('') },
    account && { key: 'a', label: `Account: ${account}`, onRemove: () => setAccount('') },
  ].filter(Boolean)
  const clearAll = () => { setQ(''); setFaculty(''); setDepartment(''); setLevel(''); setPay(''); setAccount('') }

  const [bulkLoading, setBulkLoading] = useState(false)
  const applyBulk = async () => {
    setBulkLoading(true)
    try {
      const res = await api('/api/admin/students/bulk', { method: 'POST', body: { ids: [...selected], action: bulkAction } })
      if (bulkAction === 'remind') toast(`Payment reminders sent to ${res.count} student${res.count === 1 ? '' : 's'} with a balance`)
      else toast(`${res.count} account${res.count === 1 ? '' : 's'} ${bulkAction === 'suspend' ? 'suspended' : 'activated'}`)
      setSelected(new Set())
      reload({ silent: true })
    } catch (e) {
      toast(e.message, { type: 'error' })
    } finally {
      setBulkLoading(false)
      setBulkAction(null)
    }
  }

  return (
    <>
      <PageHeader
        title="Students"
        description={`${students.length} students registered this session`}
        breadcrumbs={[{ label: 'Students' }]}
        actions={
          <>
            <Button variant="secondary" icon={FileDown} onClick={() => { downloadCSV('students.csv', sorted.map((s) => ({ Name: s.name, Matric: s.matric, Email: s.email, Faculty: s.faculty, Department: s.department, Level: s.level, Total: s.total, Paid: s.paid, Balance: s.balance, Status: s.pay, Account: s.account }))); toast(`Exported ${sorted.length} students`) }}>Export</Button>
            <Button variant="secondary" icon={Upload} onClick={() => setImportOpen(true)}>Bulk import</Button>
            <Button icon={UserPlus} onClick={() => setAddOpen(true)}>Add student</Button>
          </>
        }
      />

      <Card>
        <div className="space-y-3 border-b border-line p-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
            <SearchInput value={q} onChange={setQ} placeholder="Name, matric or email" label="Search students" className="sm:col-span-2" />
            <Select aria-label="Faculty" placeholder="All faculties" options={Object.keys(FACULTIES)} value={faculty} onChange={(e) => { setFaculty(e.target.value); setDepartment('') }} />
            <Select aria-label="Department" placeholder="All departments" options={faculty ? FACULTIES[faculty] : Object.values(FACULTIES).flat()} value={department} onChange={(e) => setDepartment(e.target.value)} />
            <Select aria-label="Level" placeholder="All levels" options={LEVELS.map((l) => ({ value: l, label: `${l} Level` }))} value={level} onChange={(e) => setLevel(e.target.value)} />
            <div className="grid grid-cols-2 gap-3 sm:col-span-2 lg:col-span-1 lg:grid-cols-1">
              <Select aria-label="Payment status" placeholder="Any payment" options={[{ value: 'paid', label: 'Paid' }, { value: 'partial', label: 'Partial' }, { value: 'owing', label: 'Owing' }]} value={pay} onChange={(e) => setPay(e.target.value)} />
              <Select aria-label="Account status" placeholder="Any account" className="lg:hidden" options={[{ value: 'active', label: 'Active' }, { value: 'suspended', label: 'Suspended' }]} value={account} onChange={(e) => setAccount(e.target.value)} />
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <FilterChips chips={chips} onClear={clearAll} />
            <div className="ml-auto hidden w-44 lg:block">
              <Select aria-label="Account status" placeholder="Any account" options={[{ value: 'active', label: 'Active' }, { value: 'suspended', label: 'Suspended' }]} value={account} onChange={(e) => setAccount(e.target.value)} />
            </div>
          </div>
        </div>

        {selected.size > 0 && (
          <div className="animate-fade-up flex flex-wrap items-center gap-2 border-b border-line bg-brand-50 px-4 py-3 dark:bg-brand-500/10" role="region" aria-label="Bulk actions">
            <span className="mr-2 text-sm font-semibold">{selected.size} selected</span>
            <Button size="sm" variant="secondary" icon={Send} onClick={() => setBulkAction('remind')}>Send reminder</Button>
            <Button size="sm" variant="secondary" icon={CheckCircle2} onClick={() => setBulkAction('activate')}>Activate</Button>
            <Button size="sm" variant="secondary" icon={Ban} onClick={() => setBulkAction('suspend')}>Suspend</Button>
            <Button size="sm" variant="ghost" icon={X} onClick={() => setSelected(new Set())} className="ml-auto">Clear</Button>
          </div>
        )}

        {error ? (
          <ErrorState onRetry={() => reload()}>{error.message}</ErrorState>
        ) : loading ? (
          <SkeletonTable rows={8} cols={6} />
        ) : students.length === 0 ? (
          <EmptyState icon={Users} title="No students yet" action={<Button icon={Upload} onClick={() => setImportOpen(true)}>Import students</Button>}>Add students one by one or import a CSV.</EmptyState>
        ) : rows.length === 0 ? (
          <EmptyState icon={SearchX} title="No students match" action={<Button variant="secondary" onClick={clearAll}>Clear filters</Button>}>Try different filters.</EmptyState>
        ) : (
          <>
            <Table className="hidden md:block">
              <thead>
                <tr>
                  <Th className="w-10"><input type="checkbox" className="size-4 accent-brand-700" checked={allOnPage} onChange={togglePage} aria-label="Select all on this page" /></Th>
                  <Th sortKey="name" sort={sort} onSort={onSort}>Name</Th>
                  <Th sortKey="matric" sort={sort} onSort={onSort}>Matric</Th>
                  <Th sortKey="faculty" sort={sort} onSort={onSort} className="hidden lg:table-cell">Faculty / Department</Th>
                  <Th sortKey="level" sort={sort} onSort={onSort}>Level</Th>
                  <Th>Status</Th>
                  <Th sortKey="balance" sort={sort} onSort={onSort} align="right">Balance</Th>
                </tr>
              </thead>
              <tbody>
                {pg.pageRows.map((s) => (
                  <tr key={s.id} className={cn('cursor-pointer transition-colors hover:bg-subtle/60', selected.has(s.id) && 'bg-brand-50/60 dark:bg-brand-500/5')} onClick={() => navigate(`/admin/students/${s.id}`)}>
                    <Td onClick={(e) => e.stopPropagation()}><input type="checkbox" className="size-4 accent-brand-700" checked={selected.has(s.id)} onChange={() => toggle(s.id)} aria-label={`Select ${s.name}`} /></Td>
                    <Td>
                      <div className="flex items-center gap-3">
                        <Avatar name={s.name} size="sm" />
                        <div className="min-w-0">
                          <p className="font-medium">{s.name}</p>
                          <p className="max-w-52 truncate text-xs text-muted">{s.email}</p>
                        </div>
                      </div>
                    </Td>
                    <Td className="font-mono text-xs">{s.matric}</Td>
                    <Td className="hidden lg:table-cell"><p>{s.faculty}</p><p className="text-xs text-muted">{s.department}</p></Td>
                    <Td className="num">{s.level}</Td>
                    <Td><div className="flex flex-col items-start gap-1"><StatusChip status={s.pay} />{s.account === 'suspended' && <StatusChip status="suspended" />}</div></Td>
                    <Td align="right" className={cn('font-semibold num', s.balance > 0 && 'text-red-700 dark:text-red-400')}>{naira(s.balance)}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <ul className="divide-y divide-line md:hidden">
              {pg.pageRows.map((s) => (
                <li key={s.id} className="flex items-start gap-3 p-4">
                  <input type="checkbox" className="mt-3 size-5 accent-brand-700" checked={selected.has(s.id)} onChange={() => toggle(s.id)} aria-label={`Select ${s.name}`} />
                  <button className="min-w-0 flex-1 text-left" onClick={() => navigate(`/admin/students/${s.id}`)}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium">{s.name}</p>
                        <p className="text-xs text-muted"><span className="font-mono">{s.matric}</span> · {s.level} L · {s.department}</p>
                      </div>
                      <StatusChip status={s.pay} />
                    </div>
                    <p className="mt-2 text-sm">Balance <span className="font-semibold num">{naira(s.balance)}</span></p>
                  </button>
                </li>
              ))}
            </ul>
            <div className="border-t border-line"><Pagination {...pg} /></div>
          </>
        )}
      </Card>

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add student" description="The student will receive an email to set their password." size="lg">
        <StudentForm
          onCancel={() => setAddOpen(false)}
          onSubmit={async (f) => {
            try {
              await api('/api/admin/students', { method: 'POST', body: f })
              toast(`${f.name} has been added`)
              setAddOpen(false)
              reload({ silent: true })
            } catch (e) {
              return Object.keys(e.fields).length ? e.fields : { name: e.message }
            }
          }}
        />
      </Modal>

      <BulkImport
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImport={async (rows) => {
          try {
            const body = { rows: rows.map(({ name, matric, email, faculty, department, level }) => ({ name, matric, email, faculty, department, level })) }
            const res = await api('/api/admin/students/import', { method: 'POST', body })
            toast(`${res.imported} students imported${res.skipped ? `, ${res.skipped} skipped (duplicates or invalid)` : ''}`)
            reload({ silent: true })
            return true
          } catch (e) {
            toast(e.message, { type: 'error' })
            return false
          }
        }}
      />

      <ConfirmDialog
        open={!!bulkAction}
        onClose={() => setBulkAction(null)}
        onConfirm={applyBulk}
        loading={bulkLoading}
        tone={bulkAction === 'suspend' ? 'danger' : 'primary'}
        title={bulkAction === 'suspend' ? `Suspend ${selected.size} accounts?` : bulkAction === 'activate' ? `Activate ${selected.size} accounts?` : `Send reminders to ${selected.size} students?`}
        confirmLabel={bulkAction === 'suspend' ? 'Suspend' : bulkAction === 'activate' ? 'Activate' : 'Send reminders'}
      >
        {bulkAction === 'suspend'
          ? 'Suspended students can’t sign in or make payments until reactivated. This action is recorded in the audit log.'
          : bulkAction === 'activate'
            ? 'These students will be able to sign in and make payments again.'
            : 'Each student gets an email and SMS with their outstanding balance and next due date.'}
      </ConfirmDialog>
    </>
  )
}
