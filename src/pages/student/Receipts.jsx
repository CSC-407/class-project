import { useState } from 'react'
import { ReceiptText, Download, SearchX } from 'lucide-react'
import { useData } from '../../context/DataContext'
import { Card, PageHeader, SearchInput, Button, EmptyState, Skeleton, Badge } from '../../components/ui'
import { naira, formatDate } from '../../lib/format'
import { useDocumentTitle } from '../../lib/hooks'

export default function Receipts() {
  useDocumentTitle('Receipts')
  const { payments, loading } = useData()
  const [q, setQ] = useState('')
  const receipts = payments.filter((p) => p.status === 'success')
  const rows = receipts.filter((p) => !q || p.receiptNo.toLowerCase().includes(q.toLowerCase()) || p.description.toLowerCase().includes(q.toLowerCase()))

  return (
    <>
      <PageHeader title="Receipts" description="Official, QR-verifiable receipts for every successful payment." breadcrumbs={[{ label: 'Receipts' }]} />
      <div className="mb-5 max-w-md">
        <SearchInput value={q} onChange={setQ} placeholder="Search receipt number or item" label="Search receipts" />
      </div>
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="p-5"><Skeleton className="h-4 w-32" /><Skeleton className="mt-4 h-7 w-40" /><Skeleton className="mt-4 h-9 w-full" /></Card>
          ))}
        </div>
      ) : receipts.length === 0 ? (
        <Card>
          <EmptyState icon={ReceiptText} title="No receipts yet" action={<Button to="/app/pay">Make a payment</Button>}>
            A receipt is issued automatically after every successful payment.
          </EmptyState>
        </Card>
      ) : rows.length === 0 ? (
        <Card><EmptyState icon={SearchX} title="No matching receipts">Try a different receipt number.</EmptyState></Card>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((p) => (
            <li key={p.id}>
              <Card className="flex h-full flex-col p-5">
                <div className="flex items-start justify-between gap-3">
                  <span className="flex size-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                    <ReceiptText className="size-5" aria-hidden />
                  </span>
                  <Badge tone="neutral">{p.session}</Badge>
                </div>
                <p className="mt-4 font-mono text-sm font-semibold">{p.receiptNo}</p>
                <p className="mt-1 line-clamp-2 text-sm text-muted">{p.description}</p>
                <p className="mt-3 text-xl font-bold num">{naira(p.amount + p.serviceCharge)}</p>
                <p className="text-xs text-muted">{formatDate(p.date)}</p>
                <div className="mt-auto pt-4">
                  <Button to={`/app/receipts/${p.id}`} variant="secondary" block icon={Download}>View & download</Button>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
