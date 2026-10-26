import { CreditCard, Landmark, Smartphone, Check, X, Clock } from 'lucide-react'
import { cn, formatDateTime } from '../lib/format'

export const METHODS = {
  card: { label: 'Card', icon: CreditCard },
  transfer: { label: 'Bank transfer', icon: Landmark },
  ussd: { label: 'USSD', icon: Smartphone },
}

export function MethodLabel({ method, last4 }) {
  const m = METHODS[method] || METHODS.card
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-muted">
      <m.icon className="size-4" aria-hidden />
      {m.label}
      {last4 && <span className="font-mono text-xs">•••• {last4}</span>}
    </span>
  )
}

export function Timeline({ steps }) {
  return (
    <ol className="relative space-y-5">
      {steps.map((s, i) => {
        const Icon = s.error ? X : s.done ? Check : Clock
        return (
          <li key={i} className="relative flex gap-3">
            {i < steps.length - 1 && <span className="absolute top-8 bottom-[-20px] left-[15px] w-0.5 bg-line" aria-hidden />}
            <span
              className={cn(
                'relative flex size-8 shrink-0 items-center justify-center rounded-full',
                s.error ? 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300' : s.done ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
              )}
            >
              <Icon className="size-4" aria-hidden />
            </span>
            <div className="pt-1">
              <p className="text-sm font-medium">{s.label}</p>
              <p className="text-xs text-muted">{s.at ? formatDateTime(s.at) : 'Waiting…'}</p>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
