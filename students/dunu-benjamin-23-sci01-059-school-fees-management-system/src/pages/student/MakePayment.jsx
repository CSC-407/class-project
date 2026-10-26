import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  CreditCard, Landmark, Smartphone, ShieldCheck, Lock, ArrowLeft, ArrowRight, Pencil, FlaskConical, Copy, CheckCircle2, XCircle, Clock,
  Download, Mail, RotateCcw, LayoutDashboard, Loader2, AlertTriangle, Info, PartyPopper,
} from 'lucide-react'
import { useData } from '../../context/DataContext'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { Card, PageHeader, Stepper, Button, Badge, Alert, Input, Select, EmptyState, StatusChip, Checkbox } from '../../components/ui'
import { naira, formatDate, formatDateTime, cn, mmss } from '../../lib/format'
import { feeStatus, serviceCharge, MIN_INSTALLMENT, CURRENT_SESSION } from '../../lib/data'
import { api, newIdempotencyKey } from '../../lib/api'
import { useCountdown, useDocumentTitle } from '../../lib/hooks'

const STEPS = ['Select items', 'Review', 'Payment method', 'Checkout']

// ---------- Card helpers (never persisted) ----------
function detectBrand(num) {
  if (/^4/.test(num)) return 'Visa'
  if (/^(506[01]|507[89]|6500)/.test(num)) return 'Verve'
  if (/^(5[1-5]|2(2[2-9]|[3-6]\d|7[01]|720))/.test(num)) return 'Mastercard'
  return null
}
function luhn(num) {
  let sum = 0
  let dbl = false
  for (let i = num.length - 1; i >= 0; i--) {
    let d = Number(num[i])
    if (dbl) {
      d *= 2
      if (d > 9) d -= 9
    }
    sum += d
    dbl = !dbl
  }
  return num.length >= 13 && sum % 10 === 0
}
const formatCard = (v) => v.replace(/\D/g, '').slice(0, 19).replace(/(.{4})/g, '$1 ').trim()

const TEST_CARDS = [
  { number: '4084 0840 8408 4081', outcome: 'success', label: 'Successful payment' },
  { number: '4000 0000 0000 0002', outcome: 'failed', label: 'Declined (insufficient funds)' },
  { number: '5060 6666 6666 6666 666', outcome: 'pending', label: 'Pending bank confirmation' },
]

function BrandMark({ brand }) {
  if (!brand) return <CreditCard className="size-5 text-muted" aria-hidden />
  const cls = { Visa: 'bg-[#1a1f71] text-white', Mastercard: 'bg-[#eb001b] text-white', Verve: 'bg-[#00425f] text-white' }[brand]
  return <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-bold tracking-wide', cls)}>{brand.toUpperCase()}</span>
}

// ---------- Step 1 ----------
function SelectItems({ payable, selection, setSelection, errors }) {
  const toggle = (id, checked) => setSelection((s) => ({ ...s, [id]: { ...(s[id] || { mode: 'full', custom: '' }), checked } }))
  const allChecked = payable.every((f) => selection[f.id]?.checked)
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <Checkbox
          label={<span className="font-medium">Select all outstanding ({payable.length})</span>}
          checked={allChecked}
          onChange={(v) => setSelection(Object.fromEntries(payable.map((f) => [f.id, { ...(selection[f.id] || { mode: 'full', custom: '' }), checked: v }])))}
        />
      </div>
      {payable.map((f) => {
        const sel = selection[f.id] || {}
        const balance = f.amount - f.paid
        const min = Math.min(f.minInstallment || MIN_INSTALLMENT, balance)
        const status = feeStatus(f)
        return (
          <Card key={f.id} className={cn('p-4 transition-colors', sel.checked && 'border-brand-400 ring-1 ring-brand-400 dark:border-brand-400')}>
            <div className="flex items-start gap-3">
              <Checkbox checked={!!sel.checked} onChange={(v) => toggle(f.id, v)} aria-label={`Select ${f.name}`} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{f.name}</p>
                    <p className="text-xs text-muted">
                      Due {formatDate(f.dueDate)} · {f.semester}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold num">{naira(balance)}</p>
                    <StatusChip status={status} className="mt-1" />
                  </div>
                </div>
                {sel.checked && f.installments && (
                  <div className="mt-4 space-y-3 border-t border-line pt-4">
                    <div role="radiogroup" aria-label={`Amount for ${f.name}`} className="grid gap-2 sm:grid-cols-2">
                      {[
                        ['full', 'Pay full balance', naira(balance)],
                        ['custom', 'Pay part (installment)', `Min ${naira(min)}`],
                      ].map(([mode, label, sub]) => (
                        <label key={mode} className={cn('flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm', (sel.mode || 'full') === mode ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10' : 'border-line')}>
                          <input
                            type="radio"
                            name={`mode-${f.id}`}
                            className="size-4 accent-brand-700"
                            checked={(sel.mode || 'full') === mode}
                            onChange={() => setSelection((s) => ({ ...s, [f.id]: { ...sel, mode } }))}
                          />
                          <span>
                            <span className="block font-medium">{label}</span>
                            <span className="text-xs text-muted num">{sub}</span>
                          </span>
                        </label>
                      ))}
                    </div>
                    {sel.mode === 'custom' && (
                      <Input
                        label="Amount to pay (₦)"
                        inputMode="decimal"
                        mono
                        placeholder={`${min} to ${balance}`}
                        value={sel.custom}
                        onChange={(e) => setSelection((s) => ({ ...s, [f.id]: { ...sel, custom: e.target.value.replace(/[^\d.]/g, '') } }))}
                        error={errors[f.id]}
                        hint={`Between ${naira(min)} and ${naira(balance)}`}
                      />
                    )}
                  </div>
                )}
                {sel.checked && !f.installments && <p className="mt-2 text-xs text-muted">This fee must be paid in full.</p>}
              </div>
            </div>
          </Card>
        )
      })}
    </div>
  )
}

// ---------- Summary sidebar ----------
function Summary({ allocations, subtotal, charge, compact }) {
  return (
    <Card className={cn('p-5', !compact && 'lg:sticky lg:top-24')}>
      <h2 className="font-semibold">Payment summary</h2>
      {allocations.length === 0 ? (
        <p className="mt-3 text-sm text-muted">Select at least one fee item.</p>
      ) : (
        <ul className="mt-3 space-y-2 text-sm">
          {allocations.map((a) => (
            <li key={a.feeId} className="flex justify-between gap-3">
              <span className="text-muted">{a.name}</span>
              <span className="shrink-0 num">{naira(a.amount)}</span>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-4 space-y-2 border-t border-line pt-4 text-sm">
        <div className="flex justify-between"><span className="text-muted">Subtotal</span><span className="num">{naira(subtotal)}</span></div>
        <div className="flex justify-between">
          <span className="text-muted">Service charge <span className="text-xs">(1.5%, max ₦2,000)</span></span>
          <span className="num">{naira(charge)}</span>
        </div>
      </div>
      <div className="mt-4 flex items-end justify-between border-t border-line pt-4">
        <span className="text-sm font-medium">Total</span>
        <span className="text-2xl font-bold tracking-tight num">{naira(subtotal + charge)}</span>
      </div>
      <p className="mt-4 flex items-start gap-2 text-xs text-muted">
        <ShieldCheck className="size-4 shrink-0 text-emerald-600" aria-hidden /> Secured with TLS. Card details go straight to the payment gateway and never touch our servers.
      </p>
    </Card>
  )
}

// ---------- Gateway ----------
function Gateway({ method, total, user, onPay, processing, setProcessing }) {
  const [card, setCard] = useState({ number: '', expiry: '', cvv: '', name: user.name.toUpperCase() })
  const [errors, setErrors] = useState({})
  const [simulate, setSimulate] = useState('success')
  const [bank, setBank] = useState('737')
  const submitting = useRef(false)
  const { seconds } = useCountdown(30 * 60)
  const digits = card.number.replace(/\D/g, '')
  const brand = detectBrand(digits)
  const toast = useToast()

  const validateCard = () => {
    const [mm, yy] = card.expiry.split('/')
    const exp = mm && yy ? new Date(2000 + Number(yy), Number(mm)) : null
    const errs = {
      number: !digits ? 'Enter your card number' : !luhn(digits) ? 'This card number isn’t valid. Check the digits.' : '',
      expiry: !/^\d{2}\/\d{2}$/.test(card.expiry) || Number(mm) < 1 || Number(mm) > 12 ? 'Use MM/YY' : exp < new Date() ? 'This card has expired' : '',
      cvv: !/^\d{3,4}$/.test(card.cvv) ? 'Enter the 3-digit code on the back' : '',
      name: card.name.trim().length < 3 ? 'Enter the name on the card' : '',
    }
    setErrors(errs)
    return !Object.values(errs).some(Boolean)
  }

  const pay = async () => {
    if (submitting.current) return // Guard against double submission
    if (method === 'card' && !validateCard()) return
    submitting.current = true
    setProcessing(true)
    const details = method === 'card' ? { card: { number: digits, expiry: card.expiry, cvv: card.cvv, name: card.name } } : { simulate, bank }
    // Wipe the card data from memory as soon as it has been sent to the gateway.
    if (method === 'card') setCard((c) => ({ ...c, number: '', cvv: '' }))
    const res = await onPay(details)
    setProcessing(false)
    submitting.current = false
    if (res?.cardError) setErrors({ number: res.cardError })
  }

  return (
    <Card className="relative overflow-hidden p-0">
      {/* Gateway header */}
      <div className="flex items-center justify-between gap-3 border-b border-line bg-subtle/60 px-5 py-4">
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-lg bg-emerald-600 text-white">
            <Lock className="size-4" aria-hidden />
          </span>
          <div>
            <p className="text-sm font-semibold">SandboxPay Checkout</p>
            <p className="text-xs text-muted">Kingsgate University · {user.email}</p>
          </div>
        </div>
        <Badge tone="accent" icon={FlaskConical}>Test Mode</Badge>
      </div>
      <div className="px-5 pt-5 text-center">
        <p className="text-sm text-muted">Amount to pay</p>
        <p className="text-3xl font-bold tracking-tight num">{naira(total)}</p>
      </div>

      <div className="p-5">
        {method === 'card' && (
          <form
            noValidate
            onSubmit={(e) => {
              e.preventDefault()
              pay()
            }}
            className="space-y-4"
            autoComplete="off"
          >
            <div className="relative">
              <Input
                label="Card number"
                inputMode="numeric"
                autoComplete="cc-number"
                mono
                placeholder="0000 0000 0000 0000"
                value={card.number}
                onChange={(e) => { setCard((c) => ({ ...c, number: formatCard(e.target.value) })); setErrors((er) => ({ ...er, number: '' })) }}
                error={errors.number}
                inputClassName="pr-24"
                disabled={processing}
              />
              <span className="absolute top-[38px] right-3 flex items-center">
                <BrandMark brand={brand} />
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Expiry"
                inputMode="numeric"
                autoComplete="cc-exp"
                mono
                placeholder="MM/YY"
                value={card.expiry}
                maxLength={5}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, '').slice(0, 4)
                  setCard((c) => ({ ...c, expiry: v.length > 2 ? `${v.slice(0, 2)}/${v.slice(2)}` : v }))
                  setErrors((er) => ({ ...er, expiry: '' }))
                }}
                error={errors.expiry}
                disabled={processing}
              />
              <Input
                label="CVV"
                type="password"
                inputMode="numeric"
                autoComplete="cc-csc"
                mono
                placeholder="•••"
                maxLength={4}
                value={card.cvv}
                onChange={(e) => { setCard((c) => ({ ...c, cvv: e.target.value.replace(/\D/g, '') })); setErrors((er) => ({ ...er, cvv: '' })) }}
                error={errors.cvv}
                disabled={processing}
              />
            </div>
            <Input label="Name on card" autoComplete="cc-name" value={card.name} onChange={(e) => setCard((c) => ({ ...c, name: e.target.value }))} error={errors.name} disabled={processing} maxLength={60} />
            <Button type="submit" size="lg" block variant="success" loading={processing} icon={Lock}>
              {processing ? 'Processing…' : `Pay ${naira(total)}`}
            </Button>
            <div className="rounded-lg border border-dashed border-accent-500/50 bg-accent-50/60 p-3 text-xs dark:bg-accent-500/5">
              <p className="flex items-center gap-1.5 font-semibold text-accent-700 dark:text-accent-300">
                <FlaskConical className="size-3.5" aria-hidden /> Test cards (any future expiry, any CVV)
              </p>
              <ul className="mt-2 space-y-1.5">
                {TEST_CARDS.map((t) => (
                  <li key={t.number} className="flex items-center justify-between gap-2">
                    <button type="button" className="font-mono underline-offset-2 hover:underline" onClick={() => setCard((c) => ({ ...c, number: t.number, expiry: c.expiry || '12/29', cvv: c.cvv || '123' }))}>
                      {t.number}
                    </button>
                    <span className="text-right text-muted">{t.label}</span>
                  </li>
                ))}
              </ul>
            </div>
          </form>
        )}

        {method === 'transfer' && (
          <div className="space-y-4">
            <p className="text-center text-sm text-muted">Transfer the exact amount to this one-time account. It expires in</p>
            <p className="text-center font-mono text-lg font-semibold num">{mmss(seconds)}</p>
            <dl className="divide-y divide-line rounded-xl border border-line">
              {[
                ['Bank', 'Wema Bank (SandboxPay)'],
                ['Account number', '9921 048 337'],
                ['Account name', `KGU Fees / ${user.name}`],
                ['Amount', naira(total)],
              ].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                  <dt className="text-muted">{k}</dt>
                  <dd className="flex items-center gap-2 text-right font-semibold">
                    <span className={k === 'Account number' || k === 'Amount' ? 'font-mono num' : ''}>{v}</span>
                    {k === 'Account number' && (
                      <button onClick={() => { navigator.clipboard?.writeText('9921048337'); toast('Account number copied', { type: 'info', duration: 2000 }) }} className="rounded p-1 text-muted hover:text-fg" aria-label="Copy account number">
                        <Copy className="size-4" />
                      </button>
                    )}
                  </dd>
                </div>
              ))}
            </dl>
            <OutcomeSimulator value={simulate} onChange={setSimulate} />
            <Button size="lg" block variant="success" loading={processing} onClick={pay}>
              {processing ? 'Confirming transfer…' : 'I’ve sent the money'}
            </Button>
          </div>
        )}

        {method === 'ussd' && (
          <div className="space-y-4">
            <Select
              label="Your bank"
              value={bank}
              onChange={(e) => setBank(e.target.value)}
              options={[
                { value: '737', label: 'GTBank (*737#)' },
                { value: '901', label: 'Access Bank (*901#)' },
                { value: '894', label: 'First Bank (*894#)' },
                { value: '966', label: 'Zenith Bank (*966#)' },
                { value: '919', label: 'UBA (*919#)' },
              ]}
            />
            <div className="rounded-xl bg-brand-900 p-5 text-center text-white dark:bg-brand-950">
              <p className="text-xs text-brand-200">Dial this code on the phone linked to your account</p>
              <p className="mt-2 font-mono text-xl font-bold tracking-wide break-all sm:text-2xl">*{bank}*000*{Math.round(total)}*4081#</p>
            </div>
            <OutcomeSimulator value={simulate} onChange={setSimulate} />
            <Button size="lg" block variant="success" loading={processing} onClick={pay}>
              {processing ? 'Waiting for bank…' : 'I’ve completed the USSD payment'}
            </Button>
          </div>
        )}
      </div>

      {processing && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-card/90 p-6 text-center backdrop-blur-sm" role="status" aria-live="assertive">
          <Loader2 className="size-10 animate-spin text-brand-600 dark:text-brand-300" aria-hidden />
          <p className="font-semibold">Processing your payment…</p>
          <p className="max-w-xs text-sm text-muted">Please don’t close this page, refresh, or press back. This usually takes a few seconds.</p>
        </div>
      )}
    </Card>
  )
}

function OutcomeSimulator({ value, onChange }) {
  return (
    <div className="rounded-lg border border-dashed border-accent-500/50 bg-accent-50/60 p-3 dark:bg-accent-500/5">
      <Select
        label={<span className="flex items-center gap-1.5"><FlaskConical className="size-3.5" aria-hidden /> Test Mode: simulate result</span>}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        options={[
          { value: 'success', label: 'Successful' },
          { value: 'failed', label: 'Failed' },
          { value: 'pending', label: 'Pending' },
        ]}
      />
    </div>
  )
}

// ---------- Result ----------
function Result({ payment, onRetry, onChangeMethod, onCheckStatus, checking }) {
  const navigate = useNavigate()
  const toast = useToast()
  const { user } = useAuth()
  if (payment.status === 'success') {
    return (
      <Card className="mx-auto max-w-xl p-6 text-center sm:p-10">
        <div className="animate-pop mx-auto flex size-20 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-500/15">
          <svg viewBox="0 0 24 24" className="size-10 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path className="check-draw" d="M5 12.5l4.5 4.5L19 7.5" />
          </svg>
        </div>
        <h2 className="mt-6 flex items-center justify-center gap-2 text-2xl font-bold tracking-tight">
          Payment successful <PartyPopper className="size-6 text-accent-500" aria-hidden />
        </h2>
        <p className="mt-2 text-muted">Your payment of <span className="font-semibold text-fg num">{naira(payment.amount + payment.serviceCharge)}</span> has been confirmed and your balance is updated.</p>
        <dl className="mt-6 divide-y divide-line rounded-xl border border-line text-left text-sm">
          {[
            ['Reference', payment.ref],
            ['Receipt number', payment.receiptNo],
            ['Date', formatDateTime(payment.date)],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between gap-3 px-4 py-3">
              <dt className="text-muted">{k}</dt>
              <dd className="font-mono font-medium">{v}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-6 grid gap-2 sm:grid-cols-2">
          <Button onClick={() => navigate(`/app/receipts/${payment.id}`)} icon={Download} size="lg">Download receipt</Button>
          <Button variant="secondary" size="lg" icon={Mail} onClick={() => toast(`Receipt emailed to ${user.email}`, { type: 'success' })}>Email receipt</Button>
        </div>
        <Button to="/app" variant="ghost" className="mt-3" icon={LayoutDashboard}>Back to dashboard</Button>
      </Card>
    )
  }
  if (payment.status === 'failed') {
    return (
      <Card className="mx-auto max-w-xl p-6 text-center sm:p-10">
        <div className="animate-pop mx-auto flex size-20 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-400">
          <XCircle className="size-10" aria-hidden />
        </div>
        <h2 className="mt-6 text-2xl font-bold tracking-tight">Payment failed</h2>
        <p className="mt-2 text-muted">Your bank declined this payment. <span className="font-medium text-fg">You have not been charged.</span></p>
        <Alert tone="danger" className="mt-6 text-left" title="Reason">
          {payment.failureReason}
          <span className="mt-1 block font-mono text-xs">Ref: {payment.ref}</span>
        </Alert>
        <div className="mt-6 grid gap-2 sm:grid-cols-2">
          <Button size="lg" icon={RotateCcw} onClick={onRetry}>Try again</Button>
          <Button size="lg" variant="secondary" onClick={onChangeMethod}>Change payment method</Button>
        </div>
        <Button to="/app/help" variant="ghost" className="mt-3">Get help</Button>
      </Card>
    )
  }
  return (
    <Card className="mx-auto max-w-xl p-6 text-center sm:p-10">
      <div className="mx-auto flex size-20 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300">
        <Clock className="size-10" aria-hidden />
      </div>
      <h2 className="mt-6 text-2xl font-bold tracking-tight">Payment pending</h2>
      <p className="mt-2 text-muted">We’re waiting for your bank to confirm. This can take a few minutes. Please don’t pay again. We’ll notify you when it’s confirmed.</p>
      <p className="mt-4 font-mono text-sm">Ref: {payment.ref}</p>
      <div className="mt-6 grid gap-2 sm:grid-cols-2">
        <Button size="lg" icon={RotateCcw} loading={checking} onClick={onCheckStatus}>Check status</Button>
        <Button size="lg" variant="secondary" to="/app/history">View history</Button>
      </div>
    </Card>
  )
}

// ---------- Page ----------
export default function MakePayment() {
  useDocumentTitle('Make Payment')
  const { fees, reload, loading } = useData()
  const { user } = useAuth()
  const toast = useToast()
  const [params] = useSearchParams()
  const [step, setStep] = useState(0)
  const [method, setMethod] = useState('card')
  const [processing, setProcessing] = useState(false)
  const [result, setResult] = useState(null)
  const [checking, setChecking] = useState(false)
  const [errors, setErrors] = useState({})
  const [pageError, setPageError] = useState(null)
  const checkout = useRef(null) // { ref, method } of the payment being checked out
  const topRef = useRef(null)

  const payable = useMemo(
    () => fees.filter((f) => f.session === CURRENT_SESSION && f.amount - f.paid > 0).sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate)),
    [fees],
  )
  const [selection, setSelection] = useState(() => {
    const pre = (params.get('items') || '').split(',').filter(Boolean)
    return Object.fromEntries(pre.map((id) => [id, { checked: true, mode: 'full', custom: '' }]))
  })

  const allocations = payable
    .filter((f) => selection[f.id]?.checked)
    .map((f) => {
      const sel = selection[f.id]
      const balance = f.amount - f.paid
      const amount = f.installments && sel.mode === 'custom' ? Number(sel.custom) || 0 : balance
      return { feeId: f.id, name: amount < balance ? `${f.name} (part payment)` : f.name, amount, balance, fee: f }
    })
  const subtotal = allocations.reduce((s, a) => s + a.amount, 0)
  const charge = subtotal > 0 ? serviceCharge(subtotal) : 0

  // Warn before leaving mid-payment.
  useEffect(() => {
    if (step < 3 || result) return
    const onBeforeUnload = (e) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [step, result])

  const go = (s) => {
    // Changing the selection or method means a new payment reference at checkout.
    if (s < 3) checkout.current = null
    setPageError(null)
    setStep(s)
    topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const validateStep1 = () => {
    const errs = {}
    allocations.forEach((a) => {
      const sel = selection[a.feeId]
      if (a.fee.installments && sel.mode === 'custom') {
        const min = Math.min(a.fee.minInstallment || MIN_INSTALLMENT, a.balance)
        if (!sel.custom) errs[a.feeId] = 'Enter an amount'
        else if (a.amount > a.balance) errs[a.feeId] = `Amount can’t be more than the balance of ${naira(a.balance)}`
        else if (a.amount < min) errs[a.feeId] = `Minimum installment is ${naira(min)}`
      }
    })
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  /**
   * 1. Our API creates the payment and re-checks every amount (idempotent).
   * 2. The browser sends the card to the gateway, not to our API.
   * 3. Our API verifies the outcome with the gateway, server-to-server.
   */
  const onPay = async (details) => {
    setPageError(null)
    try {
      if (!checkout.current || checkout.current.method !== method) {
        const res = await api('/api/payments/initiate', {
          method: 'POST',
          headers: { 'Idempotency-Key': newIdempotencyKey() },
          body: { items: allocations.map((a) => ({ feeId: a.feeId, amount: a.amount })), method },
        })
        checkout.current = { ref: res.payment.ref, method }
      }
      const { ref } = checkout.current
      try {
        await api('/sandbox-gateway/charge', { method: 'POST', body: { reference: ref, method, ...details } })
      } catch (e) {
        if (['invalid_card', 'expired_card', 'invalid_cvv', 'card_required'].includes(e.code)) return { cardError: e.message }
        throw e
      }
      const v = await api(`/api/payments/${ref}/verify`, { method: 'POST', body: {} })
      setResult(v.payment)
      reload()
      topRef.current?.scrollIntoView({ block: 'start' })
    } catch (e) {
      setPageError(e.message)
    }
    return null
  }

  if (loading) {
    return (
      <>
        <PageHeader title="Make Payment" breadcrumbs={[{ label: 'Make Payment' }]} />
        <Card className="p-10"><div className="flex justify-center"><Loader2 className="size-7 animate-spin text-brand-600" aria-label="Loading" /></div></Card>
      </>
    )
  }

  if (payable.length === 0 && !result) {
    return (
      <>
        <PageHeader title="Make Payment" breadcrumbs={[{ label: 'Make Payment' }]} />
        <Card>
          <EmptyState icon={CheckCircle2} title="You’re all paid up!" action={<Button to="/app/receipts" variant="secondary">View receipts</Button>}>
            You have no outstanding fees for the {CURRENT_SESSION} session.
          </EmptyState>
        </Card>
      </>
    )
  }

  return (
    <div ref={topRef} className="scroll-mt-24">
      <PageHeader title="Make Payment" description="Pay one or more fees in full or in installments." breadcrumbs={[{ label: 'Make Payment' }]} />

      {result ? (
        <Result
          payment={result}
          checking={checking}
          onRetry={() => { setResult(null); go(3) }}
          onChangeMethod={() => { setResult(null); go(2) }}
          onCheckStatus={async () => {
            setChecking(true)
            try {
              const v = await api(`/api/payments/${result.ref}/verify`, { method: 'POST', body: {} })
              setResult(v.payment)
              if (v.payment.status === 'success') {
                toast('Your bank has confirmed the payment.', { type: 'success' })
                reload()
              } else toast('Still waiting for your bank. Try again in a moment.', { type: 'info' })
            } catch (e) {
              toast(e.message, { type: 'error' })
            } finally {
              setChecking(false)
            }
          }}
        />
      ) : (
        <>
          <Card className="mb-6 p-4 sm:p-5">
            <Stepper steps={STEPS} current={step} />
          </Card>

          <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
            <div className="min-w-0">
              {step === 0 && (
                <>
                  <SelectItems payable={payable} selection={selection} setSelection={(s) => { setSelection(s); setErrors({}) }} errors={errors} />
                  <div className="mt-6 flex justify-end">
                    <Button size="lg" iconRight={ArrowRight} disabled={allocations.length === 0} onClick={() => validateStep1() && go(1)} className="w-full sm:w-auto">
                      Continue to review
                    </Button>
                  </div>
                </>
              )}

              {step === 1 && (
                <Card>
                  <div className="flex items-center justify-between border-b border-line px-5 py-4">
                    <h2 className="font-semibold">Review your payment</h2>
                    <Button variant="ghost" size="sm" icon={Pencil} onClick={() => go(0)}>Edit selection</Button>
                  </div>
                  <ul className="divide-y divide-line">
                    {allocations.map((a) => (
                      <li key={a.feeId} className="flex items-center justify-between gap-4 px-5 py-4">
                        <div className="min-w-0">
                          <p className="font-medium">{a.name}</p>
                          <p className="text-xs text-muted num">
                            Balance {naira(a.balance)}
                            {a.amount < a.balance && ` · ${naira(a.balance - a.amount)} will remain`}
                          </p>
                        </div>
                        <p className="font-semibold num">{naira(a.amount)}</p>
                      </li>
                    ))}
                    <li className="flex justify-between px-5 py-3 text-sm">
                      <span className="text-muted">Service charge</span>
                      <span className="num">{naira(charge)}</span>
                    </li>
                  </ul>
                  <div className="flex items-end justify-between border-t border-line bg-subtle/50 px-5 py-5">
                    <span className="font-medium">Total to pay</span>
                    <span className="text-3xl font-bold tracking-tight num sm:text-4xl">{naira(subtotal + charge)}</span>
                  </div>
                  <div className="flex flex-col-reverse gap-2 border-t border-line p-5 sm:flex-row sm:justify-between">
                    <Button variant="secondary" icon={ArrowLeft} onClick={() => go(0)}>Back</Button>
                    <Button iconRight={ArrowRight} onClick={() => go(2)}>Choose payment method</Button>
                  </div>
                </Card>
              )}

              {step === 2 && (
                <Card className="p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className="font-semibold">How would you like to pay?</h2>
                    <Badge tone="accent" icon={FlaskConical}>Test Mode: no real money moves</Badge>
                  </div>
                  <div role="radiogroup" aria-label="Payment method" className="mt-4 grid gap-3">
                    {[
                      ['card', CreditCard, 'Debit or credit card', 'Visa, Mastercard, Verve. Instant confirmation.'],
                      ['transfer', Landmark, 'Bank transfer', 'Transfer to a one-time account number.'],
                      ['ussd', Smartphone, 'USSD', 'Dial a code from your phone. No internet needed.'],
                    ].map(([v, Icon, title, sub]) => (
                      <label key={v} className={cn('flex min-h-16 cursor-pointer items-center gap-4 rounded-xl border p-4 transition-colors', method === v ? 'border-brand-500 bg-brand-50 ring-1 ring-brand-500 dark:bg-brand-500/10' : 'border-line hover:bg-subtle')}>
                        <input type="radio" name="method" className="sr-only" checked={method === v} onChange={() => setMethod(v)} />
                        <span className={cn('flex size-11 items-center justify-center rounded-lg', method === v ? 'bg-brand-700 text-white dark:bg-brand-400 dark:text-brand-950' : 'bg-subtle text-muted')}>
                          <Icon className="size-5" aria-hidden />
                        </span>
                        <span className="flex-1">
                          <span className="block font-medium">{title}</span>
                          <span className="block text-sm text-muted">{sub}</span>
                        </span>
                        <span className={cn('flex size-5 items-center justify-center rounded-full border-2', method === v ? 'border-brand-600 dark:border-brand-300' : 'border-line')} aria-hidden>
                          {method === v && <span className="size-2.5 rounded-full bg-brand-600 dark:bg-brand-300" />}
                        </span>
                      </label>
                    ))}
                  </div>
                  <Alert tone="info" icon={Info} className="mt-5">You’ll be taken to a secure checkout. We never see or store your full card number.</Alert>
                  <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
                    <Button variant="secondary" icon={ArrowLeft} onClick={() => go(1)}>Back</Button>
                    <Button iconRight={ArrowRight} onClick={() => go(3)}>Continue to checkout</Button>
                  </div>
                </Card>
              )}

              {step === 3 && (
                <>
                  {pageError && <Alert tone="danger" className="mb-4" title="Payment couldn’t be completed">{pageError}</Alert>}
                  <Gateway method={method} total={subtotal + charge} user={user} onPay={onPay} processing={processing} setProcessing={setProcessing} />
                  <div className="mt-4 flex items-center justify-between gap-3">
                    <Button variant="ghost" icon={ArrowLeft} onClick={() => go(2)} disabled={processing}>Change method</Button>
                    <p className="flex items-center gap-1.5 text-xs text-muted">
                      <AlertTriangle className="size-3.5" aria-hidden /> Don’t refresh during payment
                    </p>
                  </div>
                </>
              )}
            </div>

            <aside className={cn(step === 0 ? 'block' : 'hidden lg:block')}>
              <Summary allocations={allocations} subtotal={subtotal} charge={charge} />
            </aside>
          </div>
        </>
      )}
    </div>
  )
}
