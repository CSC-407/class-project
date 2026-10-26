import { useState } from 'react'
import { Activity, DatabaseBackup, AlertTriangle, Database, Server, Play, CheckCircle2, Cpu, Gauge, ShieldCheck, RefreshCw } from 'lucide-react'
import { useToast } from '../../context/ToastContext'
import { Card, CardHeader, PageHeader, StatCard, Button, StatusChip, ConfirmDialog, SegmentedControl, ProgressBar, Badge, Spinner, ErrorState } from '../../components/ui'
import { formatDateTime, relativeTime, cn } from '../../lib/format'
import { api, useApi } from '../../lib/api'
import { useDocumentTitle } from '../../lib/hooks'

const LEVEL_CLS = { INFO: 'text-sky-400', WARN: 'text-amber-400', ERROR: 'text-red-400', DEBUG: 'text-brand-300' }

function uptime(s) {
  const d = Math.floor(s / 86400)
  const h = Math.floor((s % 86400) / 3600)
  const m = Math.floor((s % 3600) / 60)
  return d ? `${d}d ${h}h` : h ? `${h}h ${m}m` : `${m}m ${s % 60}s`
}

export default function SystemHealth() {
  useDocumentTitle('System Health')
  const toast = useToast()
  const { data: h, loading, error, reload } = useApi('/api/admin/system')
  const [confirm, setConfirm] = useState(false)
  const [running, setRunning] = useState(false)
  const [level, setLevel] = useState('ALL')

  const runBackup = async () => {
    setConfirm(false)
    setRunning(true)
    try {
      const res = await api('/api/admin/system/backup', { method: 'POST', body: {} })
      toast(`${res.backup.file} (${Math.round(res.backup.size / 1024)} KB) written and checked`, { title: 'Backup successful' })
      reload({ silent: true })
    } catch (e) {
      toast(e.message, { type: 'error' })
    } finally {
      setRunning(false)
    }
  }

  if (loading) return <div className="flex min-h-[40vh] items-center justify-center"><Spinner className="size-7" /></div>
  if (error) return <Card><ErrorState onRetry={() => reload()}>{error.message}</ErrorState></Card>

  const logs = h.logs.filter((l) => level === 'ALL' || l.level === level)
  const heapPct = Math.round((h.memory.heapUsedMb / h.memory.heapTotalMb) * 100)

  return (
    <>
      <PageHeader
        title="System Health"
        description="Live status of the API server, database, backups and logs."
        breadcrumbs={[{ label: 'System Health' }]}
        actions={
          <>
            <Button variant="secondary" icon={RefreshCw} onClick={() => reload({ silent: true })}>Refresh</Button>
            <Button icon={Play} onClick={() => setConfirm(true)} loading={running}>{running ? 'Backing up…' : 'Run backup'}</Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Server uptime" value={uptime(h.uptimeSeconds)} sub={`Node ${h.node}`} icon={Activity} tone="success" />
        <Card className="p-5">
          <div className="flex items-start justify-between"><p className="text-sm font-medium text-muted">Last backup</p><span className="flex size-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"><DatabaseBackup className="size-[18px]" aria-hidden /></span></div>
          <p className="mt-2 text-2xl font-bold tracking-tight">{h.lastBackup ? relativeTime(h.lastBackup.at) : 'Never'}</p>
          <div className="mt-1">{h.lastBackup ? <StatusChip status="success" label={`${Math.round(h.lastBackup.size / 1024)} KB`} /> : <StatusChip status="pending" label="Run your first backup" />}</div>
        </Card>
        <StatCard label="Errors (24h)" value={h.errors24h} sub={`${h.events24h} audited events in 24h`} icon={AlertTriangle} tone={h.errors24h ? 'warning' : 'success'} />
        <StatCard label="Database" value={h.db.status === 'healthy' ? 'Healthy' : 'Down'} sub={`${h.db.engine} · ${h.db.latencyMs} ms`} icon={Database} tone="success" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Recent errors and events" description="Recorded by the server" />
          <ul className="mt-3 divide-y divide-line">
            {h.events.length === 0 && <li className="px-5 py-4 text-sm text-muted">No events recorded.</li>}
            {h.events.map((e) => (
              <li key={e.id} className="flex flex-col gap-2 px-5 py-3.5 sm:flex-row sm:items-center">
                <StatusChip status={e.severity} className="self-start sm:w-24 sm:justify-center" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm">{e.message}</p>
                  <p className="font-mono text-xs text-muted">{e.source}</p>
                </div>
                <span className="text-xs whitespace-nowrap text-muted">{relativeTime(e.at)}</span>
              </li>
            ))}
          </ul>
          <div className="h-2" />
        </Card>
        <Card>
          <CardHeader title="Server resources" description="API process" icon={Server} />
          <div className="space-y-5 p-5">
            <div>
              <div className="mb-1.5 flex items-center justify-between text-sm">
                <span className="flex items-center gap-2"><Gauge className="size-4 text-muted" aria-hidden />Heap memory</span>
                <span className="font-semibold num">{h.memory.heapUsedMb} / {h.memory.heapTotalMb} MB</span>
              </div>
              <ProgressBar value={heapPct} tone={heapPct > 85 ? 'danger' : 'brand'} size="sm" label="Heap usage" />
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2"><Cpu className="size-4 text-muted" aria-hidden />Resident memory</span>
              <span className="font-semibold num">{h.memory.rssMb} MB</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2"><Database className="size-4 text-muted" aria-hidden />Database size</span>
              <span className="font-semibold num">{h.db.sizeBytes ? `${(h.db.sizeBytes / 1024).toFixed(0)} KB` : '—'}</span>
            </div>
            <div className="flex flex-wrap gap-1.5 border-t border-line pt-4">
              {h.auditChain.valid ? (
                <Badge tone="success" icon={ShieldCheck}>Audit chain intact ({h.auditChain.total})</Badge>
              ) : (
                <Badge tone="danger" icon={AlertTriangle}>Audit tampering at #{h.auditChain.brokenAt}</Badge>
              )}
              <Badge tone="success" icon={CheckCircle2}>API responding</Badge>
            </div>
          </div>
        </Card>
      </div>

      <Card className="mt-6 overflow-hidden">
        <CardHeader
          title="Log viewer"
          description={`Live application logs (last ${h.logs.length} lines since the server started)`}
          action={<SegmentedControl label="Log level" value={level} onChange={setLevel} options={['ALL', 'INFO', 'WARN', 'ERROR']} />}
        />
        <div className="m-5 max-h-96 overflow-auto rounded-xl bg-[#0a1220] p-4 font-mono text-xs leading-6 text-slate-300">
          {logs.length === 0 ? (
            <p className="text-slate-500">No {level === 'ALL' ? '' : level} entries.</p>
          ) : (
            logs.map((l, i) => (
              <p key={i} className="break-all whitespace-pre-wrap">
                <span className="text-slate-500">{l.at.replace('T', ' ').slice(0, 19)}</span>{' '}
                <span className={cn('font-semibold', LEVEL_CLS[l.level])}>{l.level.padEnd(5)}</span>{' '}
                <span className="text-slate-400">[{l.source}]</span> {l.message}
              </p>
            ))
          )}
        </div>
      </Card>

      <ConfirmDialog open={confirm} onClose={() => setConfirm(false)} onConfirm={runBackup} title="Run a manual backup?" confirmLabel="Start backup">
        This writes a consistent snapshot of the database to the server’s backups folder while the site stays online. Last backup: {h.lastBackup ? formatDateTime(h.lastBackup.at) : 'never'}.
      </ConfirmDialog>
    </>
  )
}
