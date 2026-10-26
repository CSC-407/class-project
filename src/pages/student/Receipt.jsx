import { useParams } from 'react-router-dom'
import { useApi } from '../../lib/api'
import { Spinner } from '../../components/ui'
import { QRCodeSVG } from 'qrcode.react'
import { Download, Printer, Mail, ArrowLeft } from 'lucide-react'
import { useData } from '../../context/DataContext'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { Button, PageHeader } from '../../components/ui'
import { LogoMark } from '../../components/Logo'
import { METHODS } from '../../components/PaymentBits'
import { naira, formatDateTime } from '../../lib/format'
import { SCHOOL } from '../../lib/data'
import ErrorPage from '../public/ErrorPage'
import { useDocumentTitle } from '../../lib/hooks'

export default function Receipt() {
  const { id } = useParams()
  const { payments } = useData()
  const { user } = useAuth()
  const toast = useToast()
  const cached = payments.find((x) => x.id === id)
  const remote = useApi(cached ? null : `/api/me/payments/${encodeURIComponent(id)}`, { pick: (r) => r.payment })
  const p = cached || remote.data
  useDocumentTitle(p?.receiptNo || 'Receipt')

  if (!cached && remote.loading) return <div className="flex min-h-[40vh] items-center justify-center"><Spinner className="size-7" /></div>

  // Students can only open their own receipts: lookup is scoped to the signed-in user's payments.
  if (!p || p.status !== 'success') return <ErrorPage code={404} inApp />

  const verifyUrl = `${window.location.origin}/verify-receipt?no=${p.receiptNo}`
  const print = () => window.print()

  return (
    <>
      <div className="no-print">
        <PageHeader
          title="Receipt"
          breadcrumbs={[{ label: 'Receipts', to: '/app/receipts' }, { label: p.receiptNo }]}
          actions={
            <>
              <Button variant="secondary" icon={ArrowLeft} to="/app/receipts">All receipts</Button>
              <Button variant="secondary" icon={Mail} onClick={() => toast(`Receipt emailed to ${user.email}`)}>Email to me</Button>
              <Button variant="secondary" icon={Printer} onClick={print}>Print</Button>
              <Button icon={Download} onClick={() => { toast('Choose “Save as PDF” as the destination', { type: 'info' }); setTimeout(print, 300) }}>Download PDF</Button>
            </>
          }
        />
      </div>

      <article className="print-area relative mx-auto max-w-[794px] overflow-hidden rounded-xl border border-line bg-card shadow-soft" aria-label={`Receipt ${p.receiptNo}`}>
        <div className="h-2 bg-brand-800 dark:bg-brand-500" />
        <div className="p-6 sm:p-10">
          {/* Header */}
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-center gap-3">
              <LogoMark className="size-12" />
              <div>
                <p className="text-lg font-bold">{SCHOOL.name}</p>
                <p className="text-xs text-muted">{SCHOOL.bursary} · {SCHOOL.address}</p>
                <p className="text-xs text-muted">{SCHOOL.email} · {SCHOOL.phone}</p>
              </div>
            </div>
            <div className="sm:text-right">
              <p className="text-xs font-semibold tracking-widest text-muted uppercase">Official receipt</p>
              <p className="mt-1 font-mono text-lg font-bold">{p.receiptNo}</p>
              <p className="text-xs text-muted">{formatDateTime(p.date)}</p>
            </div>
          </div>

          {/* PAID stamp */}
          <div className="pointer-events-none absolute top-40 right-8 rotate-[-14deg] rounded-lg border-4 border-emerald-600/70 px-5 py-1.5 text-3xl font-black tracking-[0.2em] text-emerald-600/70 sm:top-32 sm:right-16 sm:text-4xl" aria-hidden>
            PAID
          </div>

          {/* Student */}
          <div className="mt-8 grid gap-4 rounded-xl bg-subtle p-5 text-sm sm:grid-cols-2">
            {[
              ['Received from', user.name],
              ['Matric number', <span className="font-mono">{user.matric}</span>],
              ['Faculty / Department', `${user.faculty} / ${user.department}`],
              ['Level · Session', `${user.level} Level · ${p.session}`],
            ].map(([k, v]) => (
              <div key={k}>
                <p className="text-xs text-muted">{k}</p>
                <p className="font-semibold">{v}</p>
              </div>
            ))}
          </div>

          {/* Items */}
          <table className="mt-8 w-full text-sm">
            <thead>
              <tr className="border-b-2 border-fg/80 text-left">
                <th className="py-2 font-semibold">#</th>
                <th className="py-2 font-semibold">Description</th>
                <th className="py-2 text-right font-semibold">Amount</th>
              </tr>
            </thead>
            <tbody>
              {p.items.map((i, idx) => (
                <tr key={idx} className="border-b border-line">
                  <td className="py-3 text-muted">{idx + 1}</td>
                  <td className="py-3">{i.name}</td>
                  <td className="py-3 text-right num">{naira(i.amount)}</td>
                </tr>
              ))}
              <tr className="border-b border-line">
                <td />
                <td className="py-3 text-muted">Service charge</td>
                <td className="py-3 text-right num">{naira(p.serviceCharge)}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <td />
                <td className="pt-4 text-base font-bold">Total paid</td>
                <td className="pt-4 text-right text-xl font-bold num">{naira(p.amount + p.serviceCharge)}</td>
              </tr>
            </tfoot>
          </table>

          {/* Footer */}
          <div className="mt-10 flex flex-col gap-6 border-t border-line pt-6 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-1 text-sm">
              <p><span className="text-muted">Payment method:</span> <span className="font-medium">{METHODS[p.method].label}{p.last4 ? ` •••• ${p.last4}` : ''}</span></p>
              <p><span className="text-muted">Payment reference:</span> <span className="font-mono font-medium">{p.ref}</span></p>
              <p><span className="text-muted">Status:</span> <span className="font-semibold text-emerald-700 dark:text-emerald-400">Confirmed</span></p>
              <p className="max-w-sm pt-3 text-xs text-muted">
                Computer-generated receipt; no signature required. Verify it at {window.location.host}/verify-receipt or by scanning the QR code.
              </p>
            </div>
            <div className="flex flex-col items-center gap-1.5">
              <div className="rounded-lg bg-white p-2">
                <QRCodeSVG value={verifyUrl} size={104} level="M" />
              </div>
              <p className="text-[10px] font-medium text-muted">Scan to verify</p>
            </div>
          </div>
        </div>
      </article>
    </>
  )
}
