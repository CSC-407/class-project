import { forwardRef, useId, useRef, useState } from 'react'
import { Eye, EyeOff, Search, AlertCircle, Lock, ChevronDown, Check, X } from 'lucide-react'
import { cn } from '../../lib/format'
import { PASSWORD_RULES, passwordScore } from '../../lib/validation'

const inputBase =
  'w-full h-11 rounded-lg border bg-card px-3 text-sm text-fg placeholder:text-muted/70 transition-colors outline-none focus:border-brand-500 focus:ring-3 focus:ring-brand-500/20 disabled:bg-subtle disabled:text-muted read-only:bg-subtle'

export function Field({ label, htmlFor, error, hint, required, locked, children, className, labelRight }) {
  return (
    <div className={cn('space-y-1.5', className)}>
      {label && (
        <div className="flex items-center justify-between gap-2">
          <label htmlFor={htmlFor} className="flex items-center gap-1.5 text-sm font-medium text-fg">
            {label}
            {required && <span className="text-red-600" aria-hidden>*</span>}
            {locked && <Lock className="size-3.5 text-muted" aria-label="Read-only" />}
          </label>
          {labelRight}
        </div>
      )}
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} className="flex items-start gap-1.5 text-sm text-red-600 dark:text-red-400" role="alert">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          {error}
        </p>
      ) : hint ? (
        <p id={`${htmlFor}-hint`} className="text-xs text-muted">{hint}</p>
      ) : null}
    </div>
  )
}

export const Input = forwardRef(function Input({ label, error, hint, required, locked, className, inputClassName, id, icon: Icon, labelRight, mono, ...props }, ref) {
  const autoId = useId()
  const fid = id || autoId
  return (
    <Field label={label} htmlFor={fid} error={error} hint={hint} required={required} locked={locked} className={className} labelRight={labelRight}>
      <div className="relative">
        {Icon && <Icon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" aria-hidden />}
        <input
          ref={ref}
          id={fid}
          readOnly={locked}
          aria-invalid={!!error || undefined}
          aria-describedby={error ? `${fid}-error` : hint ? `${fid}-hint` : undefined}
          className={cn(inputBase, error ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : 'border-line', Icon && 'pl-9', mono && 'font-mono num', inputClassName)}
          {...props}
        />
      </div>
    </Field>
  )
})

export const PasswordInput = forwardRef(function PasswordInput({ label = 'Password', error, hint, id, required, labelRight, ...props }, ref) {
  const [show, setShow] = useState(false)
  const autoId = useId()
  const fid = id || autoId
  return (
    <Field label={label} htmlFor={fid} error={error} hint={hint} required={required} labelRight={labelRight}>
      <div className="relative">
        <input
          ref={ref}
          id={fid}
          type={show ? 'text' : 'password'}
          aria-invalid={!!error || undefined}
          aria-describedby={error ? `${fid}-error` : undefined}
          className={cn(inputBase, 'pr-12', error ? 'border-red-500' : 'border-line')}
          {...props}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="absolute top-0 right-0 flex h-11 w-11 items-center justify-center rounded-r-lg text-muted hover:text-fg"
          aria-label={show ? 'Hide password' : 'Show password'}
          aria-pressed={show}
        >
          {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
    </Field>
  )
})

export function PasswordStrength({ value }) {
  const score = passwordScore(value)
  const levels = [
    { label: 'Too weak', cls: 'bg-red-500', text: 'text-red-600 dark:text-red-400' },
    { label: 'Weak', cls: 'bg-red-500', text: 'text-red-600 dark:text-red-400' },
    { label: 'Fair', cls: 'bg-amber-500', text: 'text-amber-700 dark:text-amber-400' },
    { label: 'Good', cls: 'bg-amber-500', text: 'text-amber-700 dark:text-amber-400' },
    { label: 'Strong', cls: 'bg-emerald-500', text: 'text-emerald-700 dark:text-emerald-400' },
    { label: 'Very strong', cls: 'bg-emerald-600', text: 'text-emerald-700 dark:text-emerald-400' },
  ]
  const lvl = levels[score]
  return (
    <div className="space-y-2" aria-live="polite">
      <div className="flex items-center gap-3">
        <div className="flex flex-1 gap-1" aria-hidden>
          {[1, 2, 3, 4, 5].map((i) => (
            <span key={i} className={cn('h-1.5 flex-1 rounded-full transition-colors', i <= score ? lvl.cls : 'bg-subtle')} />
          ))}
        </div>
        <span className={cn('min-w-20 text-right text-xs font-semibold', value ? lvl.text : 'text-muted')}>{value ? lvl.label : 'Strength'}</span>
      </div>
      <ul className="grid grid-cols-1 gap-1 sm:grid-cols-2">
        {PASSWORD_RULES.map((r) => {
          const ok = r.test(value)
          return (
            <li key={r.id} className={cn('flex items-center gap-1.5 text-xs', ok ? 'text-emerald-700 dark:text-emerald-400' : 'text-muted')}>
              {ok ? <Check className="size-3.5" aria-hidden /> : <X className="size-3.5" aria-hidden />}
              <span>
                {r.label}
                <span className="sr-only">{ok ? ' (met)' : ' (not met)'}</span>
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export const Select = forwardRef(function Select({ label, error, hint, required, locked, options = [], placeholder, className, id, ...props }, ref) {
  const autoId = useId()
  const fid = id || autoId
  return (
    <Field label={label} htmlFor={fid} error={error} hint={hint} required={required} locked={locked} className={className}>
      <div className="relative">
        <select
          ref={ref}
          id={fid}
          disabled={locked || props.disabled}
          aria-invalid={!!error || undefined}
          aria-describedby={error ? `${fid}-error` : undefined}
          className={cn(inputBase, 'appearance-none pr-10', error ? 'border-red-500' : 'border-line')}
          {...props}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((o) => {
            const v = typeof o === 'string' ? o : o.value
            const l = typeof o === 'string' ? o : o.label
            return (
              <option key={v} value={v}>
                {l}
              </option>
            )
          })}
        </select>
        <ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted" aria-hidden />
      </div>
    </Field>
  )
})

export function Textarea({ label, error, hint, required, id, className, inputClassName, ...props }) {
  const autoId = useId()
  const fid = id || autoId
  return (
    <Field label={label} htmlFor={fid} error={error} hint={hint} required={required} className={className}>
      <textarea
        id={fid}
        aria-invalid={!!error || undefined}
        className={cn(inputBase, 'h-auto min-h-24 py-2.5', error ? 'border-red-500' : 'border-line', inputClassName)}
        {...props}
      />
    </Field>
  )
}

export function SearchInput({ value, onChange, placeholder = 'Search', className, label = 'Search' }) {
  return (
    <div className={cn('relative', className)}>
      <label className="sr-only">{label}</label>
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" aria-hidden />
      <input
        type="search"
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(inputBase, 'border-line pl-9')}
      />
    </div>
  )
}

export function Checkbox({ label, checked, onChange, id, description, className, ...props }) {
  const autoId = useId()
  const fid = id || autoId
  return (
    <label htmlFor={fid} className={cn('flex cursor-pointer items-start gap-3', className)}>
      <input
        id={fid}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange?.(e.target.checked, e)}
        className="mt-0.5 size-5 shrink-0 cursor-pointer rounded border-line accent-brand-700 dark:accent-brand-400"
        {...props}
      />
      {(label || description) && (
        <span className="text-sm">
          <span className="text-fg">{label}</span>
          {description && <span className="block text-muted">{description}</span>}
        </span>
      )}
    </label>
  )
}

export function Toggle({ checked, onChange, label, description, disabled }) {
  const id = useId()
  return (
    <div className="flex items-center justify-between gap-4 py-1">
      <div className="min-w-0">
        <label htmlFor={id} className="text-sm font-medium text-fg">{label}</label>
        {description && <p className="text-sm text-muted">{description}</p>}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors disabled:opacity-50',
          checked ? 'bg-brand-700 dark:bg-brand-500' : 'bg-line',
        )}
      >
        <span className={cn('inline-block size-5 rounded-full bg-white shadow transition-transform', checked ? 'translate-x-6' : 'translate-x-1')} />
      </button>
    </div>
  )
}

export function OTPInput({ length = 6, value, onChange, error, disabled }) {
  const refs = useRef([])
  const digits = Array.from({ length }, (_, i) => value[i] || '')
  const setAt = (i, ch) => {
    const arr = value.split('')
    arr[Math.min(i, arr.length)] = ch
    onChange(arr.join('').slice(0, length))
    refs.current[Math.min(i, value.length) + 1]?.focus()
  }
  return (
    <div className="flex justify-between gap-2 sm:justify-center" role="group" aria-label="One-time code">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => (refs.current[i] = el)}
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          maxLength={1}
          disabled={disabled}
          aria-label={`Digit ${i + 1}`}
          value={d}
          onChange={(e) => {
            const ch = e.target.value.replace(/\D/g, '').slice(-1)
            if (ch) setAt(i, ch)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Backspace') {
              e.preventDefault()
              if (d) onChange(value.slice(0, i) + value.slice(i + 1))
              else if (i > 0) {
                onChange(value.slice(0, i - 1) + value.slice(i))
                refs.current[i - 1]?.focus()
              }
            } else if (e.key === 'ArrowLeft') refs.current[i - 1]?.focus()
            else if (e.key === 'ArrowRight') refs.current[i + 1]?.focus()
          }}
          onPaste={(e) => {
            e.preventDefault()
            const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length)
            onChange(text)
            refs.current[Math.min(text.length, length - 1)]?.focus()
          }}
          className={cn(
            'h-12 w-full max-w-14 min-w-0 flex-1 rounded-lg border bg-card text-center font-mono text-xl font-semibold outline-none focus:border-brand-500 focus:ring-3 focus:ring-brand-500/20 sm:h-14',
            error ? 'border-red-500' : 'border-line',
          )}
        />
      ))}
    </div>
  )
}
