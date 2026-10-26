import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Lock, FileDown, ScrollText, SearchX } from 'lucide-react'
import { useApi } from '../../lib/api'
import { useToast } from '../../context/ToastContext'
import { Card, PageHeader, SearchInput, Select, Input, Table, Th, Td, useSort, usePagination, Pagination, StatusChip, Button, EmptyState, FilterChips, Alert, Badge, SkeletonTable, ErrorState } from '../../components/ui'
import { formatDateTime, downloadCSV } from '../../lib/format'
import { useDocumentTitle } from '../../lib/hooks'

const ROLE_TONE = { student: 'neutral', admin: 'brand', superadmin: 'accent', system: 'info' }

export default function AuditLog() {
  useDocumentTitle('Audit Log')
  const { data, loading, error, reload } = useApi('/api/admin/audit', { pick: (r) => r.logs })
  const chain = useApi('/api/admin/audit/verify')
  const logs = data || []
  const toast = useToast()
  const [params] = useSearchParams()
  const [q, setQ] = useState('')
  const [action, setAction] = useState(params.get('action') || '')
  const [role, setRole] = useState('')
  const [result, setResult] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const actions = useMemo(() => [...new Set(logs.map((l) => l.action))].sort(), [logs])
  const rows = logs.filter((l) => {
    const d = new Date(l.at)
    return (
      (!q || `${l.user} ${l.target} ${l.ip}`.toLowerCase().includes(q.toLowerCase())) &&
      (!action || l.action === action) &&
      (!role || l.role === role) &&
      (!result || l.result === result) &&
      (!from || d >= new Date(from)) &&
      (!to || d <= new Date(`${to}T23:59:59`))
    )
  })
  const { sorted, sort, onSort } = useSort(rows, { key: 'at', dir: 'desc' })
  const pg = usePagination(sorted, 15)

  const chips = [
    q && { key: 'q', label: `“${q}”`, onRemove: () => setQ('') },
    action && { key: 'a', label: action, onRemove: () => setAction('') },
    role && { key: 'r', label: `Role: ${role}`, onRemove: () => setRole('') },
    result && { key: 'res', label: `Result: ${result}`, onRemove: () => setResult('') },
    from && { key: 'f', label: `From ${from}`, onRemove: () => setFrom('') },
    to && { key: 't', label: `To ${to}`, onRemove: () => setTo('') },
  ].filter(Boolean)

  return (
    <>
      <PageHeader
        title="Audit Log"
        description="A permanent record of every sensitive action in the system."
        breadcrumbs={[{ label: 'Audit Log' }]}
        actions={<Button variant="secondary" icon={FileDown} onClick={() => { downloadCSV('audit-log.csv', sorted.map((l) => ({ ID: l.id, Timestamp: l.at, User: l.user, Role: l.role, Action: l.action, Target: l.target, IP: l.ip, Result: l.result }))); toast(`Exported ${sorted.length} log entries`) }}>Export</Button>}
      />
      <Alert tone="info" icon={Lock} className="mb-6" title="This log is read-only and append-only">
        Entries can’t be edited or deleted by anyone, including Super Admins. Each entry is chained to the previous one with a SHA-256 hash, so any tampering is detectable. Logs are kept for 7 years.
        {chain.data && (
          <span className="mt-2 block">
            {chain.data.valid ? (
              <StatusChip status="verified" label={`Hash chain verified · ${chain.data.total} entries intact`} />
            ) : (
              <StatusChip status="failed" label={`Tampering detected at entry #${chain.data.brokenAt}`} />
            )}
          </span>
        )}
      </Alert>
      <Card>
        <div className="space-y-3 border-b border-line p-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
            <SearchInput value={q} onChange={setQ} placeholder="User, target or IP" label="Search audit log" className="sm:col-span-2" />
            <Select aria-label="Action" placeholder="All actions" options={actions} value={action} onChange={(e) => setAction(e.target.value)} />
            <Select aria-label="Role" placeholder="All roles" options={['student', 'admin', 'superadmin', 'system']} value={role} onChange={(e) => setRole(e.target.value)} />
            <Input aria-label="From date" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            <Input aria-label="To date" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <FilterChips chips={chips} onClear={() => { setQ(''); setAction(''); setRole(''); setResult(''); setFrom(''); setTo('') }} />
            <div className="ml-auto w-40"><Select aria-label="Result" placeholder="Any result" options={['success', 'failure']} value={result} onChange={(e) => setResult(e.target.value)} /></div>
          </div>
        </div>
        {error ? (
          <ErrorState onRetry={() => reload()}>{error.message}</ErrorState>
        ) : loading ? (
          <SkeletonTable rows={10} cols={6} />
        ) : logs.length === 0 ? (
          <EmptyState icon={ScrollText} title="No log entries">Activity will be recorded here.</EmptyState>
        ) : rows.length === 0 ? (
          <EmptyState icon={SearchX} title="No matching entries">Try different filters.</EmptyState>
        ) : (
          <>
            <Table>
              <thead>
                <tr>
                  <Th sortKey="at" sort={sort} onSort={onSort}>Timestamp</Th>
                  <Th sortKey="user" sort={sort} onSort={onSort}>User</Th>
                  <Th sortKey="action" sort={sort} onSort={onSort}>Action</Th>
                  <Th className="hidden md:table-cell">Target</Th>
                  <Th className="hidden lg:table-cell">IP address</Th>
                  <Th>Result</Th>
                </tr>
              </thead>
              <tbody className="font-mono text-xs">
                {pg.pageRows.map((l) => (
                  <tr key={l.id} className="hover:bg-subtle/60">
                    <Td className="whitespace-nowrap">{formatDateTime(l.at)}</Td>
                    <Td className="font-sans text-sm">
                      <p className="font-medium">{l.user}</p>
                      <Badge tone={ROLE_TONE[l.role]} className="mt-0.5">{l.role}</Badge>
                    </Td>
                    <Td className="font-semibold whitespace-nowrap">{l.action}</Td>
                    <Td className="hidden max-w-72 truncate md:table-cell">{l.target}</Td>
                    <Td className="hidden lg:table-cell">{l.ip}</Td>
                    <Td className="font-sans"><StatusChip status={l.result} /></Td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <div className="border-t border-line"><Pagination {...pg} /></div>
          </>
        )}
      </Card>
    </>
  )
}
