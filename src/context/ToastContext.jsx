import { createContext, useCallback, useContext, useState } from 'react'
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react'

const ToastContext = createContext(null)

const STYLES = {
  success: { icon: CheckCircle2, cls: 'text-emerald-600 dark:text-emerald-400' },
  error: { icon: XCircle, cls: 'text-red-600 dark:text-red-400' },
  warning: { icon: AlertTriangle, cls: 'text-amber-600 dark:text-amber-400' },
  info: { icon: Info, cls: 'text-sky-600 dark:text-sky-400' },
}

let nextId = 1

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const dismiss = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), [])

  const toast = useCallback(
    (message, { type = 'success', title, duration = 4000 } = {}) => {
      const id = nextId++
      setToasts((t) => [...t.slice(-3), { id, message, type, title }])
      if (duration) setTimeout(() => dismiss(id), duration)
    },
    [dismiss],
  )

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div aria-live="polite" className="no-print pointer-events-none fixed inset-x-0 bottom-20 z-[100] flex flex-col items-center gap-2 px-4 sm:bottom-6 sm:right-6 sm:left-auto sm:items-end">
        {toasts.map((t) => {
          const { icon: Icon, cls } = STYLES[t.type] || STYLES.info
          return (
            <div key={t.id} role="status" className="animate-fade-up pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border border-line bg-card p-4 shadow-lift">
              <Icon className={`mt-0.5 size-5 shrink-0 ${cls}`} aria-hidden />
              <div className="min-w-0 flex-1 text-sm">
                {t.title && <p className="font-semibold">{t.title}</p>}
                <p className="text-muted">{t.message}</p>
              </div>
              <button onClick={() => dismiss(t.id)} className="-m-1 rounded-md p-1 text-muted hover:text-fg" aria-label="Dismiss notification">
                <X className="size-4" />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)
