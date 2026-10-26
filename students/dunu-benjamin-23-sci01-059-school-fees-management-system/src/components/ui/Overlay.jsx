import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, AlertTriangle } from 'lucide-react'
import { cn } from '../../lib/format'
import { Button } from './Button'

function useLockScroll(open) {
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])
}

function useFocusTrap(open, ref, onClose) {
  // Keep the latest onClose in a ref so re-renders don't re-run the trap and steal focus.
  const closeRef = useRef(onClose)
  useEffect(() => {
    closeRef.current = onClose
  })
  useEffect(() => {
    if (!open) return
    const prevFocus = document.activeElement
    const node = ref.current
    const focusable = () => node?.querySelectorAll('button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])')
    setTimeout(() => {
      const els = focusable()
      const first = Array.from(els || []).find((el) => el.dataset.autofocus !== undefined) || els?.[0]
      first?.focus()
    }, 20)
    const onKey = (e) => {
      if (e.key === 'Escape') closeRef.current?.()
      if (e.key === 'Tab') {
        const els = Array.from(focusable() || [])
        if (!els.length) return
        const first = els[0]
        const last = els[els.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      prevFocus?.focus?.()
    }
  }, [open, ref])
}

export function Modal({ open, onClose, title, description, children, footer, size = 'md', dismissable = true }) {
  const ref = useRef(null)
  const titleId = useId()
  useLockScroll(open)
  useFocusTrap(open, ref, dismissable ? onClose : undefined)
  if (!open) return null
  const widths = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' }
  return createPortal(
    <div className="no-print fixed inset-0 z-[90] flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-brand-950/50 backdrop-blur-[2px]" onClick={dismissable ? onClose : undefined} aria-hidden />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn('animate-fade-up relative flex max-h-[92vh] w-full flex-col rounded-t-2xl border border-line bg-card shadow-lift sm:rounded-2xl', widths[size])}
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div>
            <h2 id={titleId} className="text-lg font-semibold">{title}</h2>
            {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
          </div>
          {dismissable && (
            <button onClick={onClose} className="-m-2 rounded-lg p-2 text-muted hover:bg-subtle hover:text-fg" aria-label="Close dialog">
              <X className="size-5" />
            </button>
          )}
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex flex-col-reverse gap-2 border-t border-line px-5 py-4 sm:flex-row sm:justify-end">{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}

export function Drawer({ open, onClose, title, description, children, footer, side = 'right', width = 'max-w-lg' }) {
  const ref = useRef(null)
  const titleId = useId()
  useLockScroll(open)
  useFocusTrap(open, ref, onClose)
  if (!open) return null
  return createPortal(
    <div className="no-print fixed inset-0 z-[80]">
      <div className="absolute inset-0 bg-brand-950/50 backdrop-blur-[2px]" onClick={onClose} aria-hidden />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn(
          'absolute top-0 bottom-0 flex w-full flex-col border-line bg-card shadow-lift',
          width,
          side === 'right' ? 'animate-slide-right right-0 border-l' : 'animate-slide-left left-0 border-r',
        )}
      >
        {title && (
          <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
            <div className="min-w-0">
              <h2 id={titleId} className="truncate text-lg font-semibold">{title}</h2>
              {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
            </div>
            <button onClick={onClose} className="-m-2 rounded-lg p-2 text-muted hover:bg-subtle hover:text-fg" aria-label="Close panel">
              <X className="size-5" />
            </button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto">{children}</div>
        {footer && <div className="flex flex-wrap gap-2 border-t border-line px-5 py-4">{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}

export function ConfirmDialog({ open, onClose, onConfirm, title, children, confirmLabel = 'Confirm', tone = 'primary', loading, confirmDisabled }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button variant={tone === 'danger' ? 'destructive' : 'primary'} onClick={onConfirm} loading={loading} disabled={confirmDisabled}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex gap-3">
        {tone === 'danger' && (
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-400">
            <AlertTriangle className="size-5" aria-hidden />
          </div>
        )}
        <div className="min-w-0 flex-1 text-sm text-muted">{children}</div>
      </div>
    </Modal>
  )
}

export function Dropdown({ trigger, children, align = 'right', className }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    if (!open) return
    const onDoc = (e) => !ref.current?.contains(e.target) && setOpen(false)
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])
  return (
    <div ref={ref} className="relative">
      {trigger({ open, toggle: () => setOpen((o) => !o) })}
      {open && (
        <div
          role="menu"
          className={cn(
            'animate-fade-up absolute top-full z-50 mt-2 min-w-56 rounded-xl border border-line bg-card p-1.5 shadow-lift',
            align === 'right' ? 'right-0' : 'left-0',
            className,
          )}
          onClick={(e) => e.target.closest('[data-close]') && setOpen(false)}
        >
          {typeof children === 'function' ? children({ close: () => setOpen(false) }) : children}
        </div>
      )}
    </div>
  )
}

export function MenuItem({ icon: Icon, children, onClick, danger, to, as: As = 'button', ...props }) {
  return (
    <As
      role="menuitem"
      data-close
      onClick={onClick}
      to={to}
      className={cn(
        'flex min-h-10 w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-subtle',
        danger ? 'text-red-600 dark:text-red-400' : 'text-fg',
      )}
      {...props}
    >
      {Icon && <Icon className="size-4 shrink-0 opacity-80" aria-hidden />}
      {children}
    </As>
  )
}
