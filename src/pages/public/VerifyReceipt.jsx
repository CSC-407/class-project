import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ScanLine, ShieldCheck, ShieldX, Search } from 'lucide-react'
import { Card, Input, Button, DefinitionList } from '../../components/ui'
import { api } from '../../lib/api'

const RECEIPT_RE = /^RCP-\d{4}-\d{6}$/
import { naira, formatDateTime } from '../../lib/format'
import { useDocumentTitle } from '../../lib/hooks'

export default function VerifyReceipt() {
  useDocumentTitle('Verify receipt')
  const [params, setParams] = useSearchParams()
  const [no, setNo] = useState(params.get('no') || '')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null) // { valid, receipt }

  const check = async (value = no) => {
    const v = value.trim().toUpperCase()
    if (!RECEIPT_RE.test(v)) {
      setError('Enter a receipt number in the format RCP-2026-000123')
      setResult(null)
      return
    }
    setError('')
    setLoading(true)
    try {
      const res = await api(`/api/receipts/verify/${encodeURIComponent(v)}`)
      setResult({ valid: true, receipt: res.receipt, no: v })
    } catch (err) {
      if (err.status === 404) setResult({ valid: false, no: v })
      else setError(err.message)
    } finally {
      setLoading(false)
    }
    setParams({ no: v }, { replace: true })
  }

  useEffect(() => {
    if (params.get('no')) check(params.get('no'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="mx-auto max-w-2xl px-4 py-14 sm:px-6 sm:py-20">
      <div className="text-center">
        <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-200">
          <ScanLine className="size-8" aria-hidden />
        </div>
        <h1 className="mt-5 text-3xl font-bold tracking-tight">Verify a receipt</h1>
        <p className="mt-2 text-muted">Enter the receipt number, or scan the QR code on the receipt, to confirm it was issued by Kingsgate University.</p>
      </div>
      <Card className="mt-8 p-6">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            check()
          }}
          noValidate
          className="flex flex-col gap-3 sm:flex-row sm:items-start"
        >
          <Input
            label="Receipt number"
            className="flex-1"
            mono
            placeholder="RCP-2026-000163"
            value={no}
            onChange={(e) => { setNo(e.target.value); setError('') }}
            error={error}
            maxLength={15}
            autoCapitalize="characters"
          />
          <Button type="submit" loading={loading} icon={Search} className="sm:mt-7">Verify</Button>
        </form>
        <p className="mt-3 text-xs text-muted">
          Try <button className="font-mono underline" onClick={() => { setNo('RCP-2026-000163'); check('RCP-2026-000163') }}>RCP-2026-000163</button> (valid) or{' '}
          <button className="font-mono underline" onClick={() => { setNo('RCP-2026-999999'); check('RCP-2026-999999') }}>RCP-2026-999999</button> (invalid).
        </p>
      </Card>

      <div aria-live="polite">
        {result && (
          result.valid ? (
            <Card className="animate-fade-up mt-6 overflow-hidden border-emerald-300 dark:border-emerald-500/40">
              <div className="flex items-center gap-3 bg-emerald-50 px-6 py-4 dark:bg-emerald-500/10">
                <ShieldCheck className="size-7 text-emerald-600 dark:text-emerald-400" aria-hidden />
                <div>
                  <p className="font-semibold text-emerald-900 dark:text-emerald-200">Valid receipt</p>
                  <p className="text-sm text-emerald-800 dark:text-emerald-300">This receipt is genuine and matches our records.</p>
                </div>
              </div>
              <div className="p-6">
                <DefinitionList
                  items={[
                    ['Receipt number', <span className="font-mono">{result.receipt.receiptNo}</span>],
                    ['Payment reference', <span className="font-mono">{result.receipt.ref}</span>],
                    ['Student', `${result.receipt.student} (${result.receipt.matric})`],
                    ['Amount', <span className="num">{naira(result.receipt.amount)}</span>],
                    ['Date paid', formatDateTime(result.receipt.date)],
                    ['Description', result.receipt.description],
                  ]}
                />
                <p className="mt-5 text-xs text-muted">Personal details are partly hidden to protect the student’s privacy.</p>
              </div>
            </Card>
          ) : (
            <Card className="animate-fade-up mt-6 overflow-hidden border-red-300 dark:border-red-500/40">
              <div className="flex items-center gap-3 bg-red-50 px-6 py-4 dark:bg-red-500/10">
                <ShieldX className="size-7 text-red-600 dark:text-red-400" aria-hidden />
                <div>
                  <p className="font-semibold text-red-900 dark:text-red-200">Receipt not found</p>
                  <p className="text-sm text-red-800 dark:text-red-300">
                    <span className="font-mono">{result.no}</span> doesn’t match any receipt we issued. It may be mistyped or not genuine. Contact the Bursary if you think this is wrong.
                  </p>
                </div>
              </div>
            </Card>
          )
        )}
      </div>
    </div>
  )
}
