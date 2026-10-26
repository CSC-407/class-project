import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, ChevronLeft, ChevronsUpDown, ChevronUp, ChevronDown, Check, X, Home } from 'lucide-react'
import { cn, initials } from '../../lib/format'

export function Card({ className, children, as: As = 'div', ...props }) {
  return (
    <As className={cn('min-w-0 rounded-xl border border-line bg-card shadow-soft', className)} {...props}>
      {children}
    </As>
  )
}

export function CardHeader({ title, description, action, className, icon: Icon }) {
  return (
    <div className={cn('flex flex-wrap items-start justify-between gap-3 px-5 pt-5', className)}>
      <div className="flex min-w-0 items-start gap-3">
        {Icon && (
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-200">
            <Icon className="size-5" aria-hidden />
          </div>
        )}
        <div className="min-w-0">
          <h2 className="text-base font-semibold">{title}</h2>
          {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
        </div>
      </div>
      {action}
    </div>
  )
}

export function PageHeader({ title, description, actions, breadcrumbs, children }) {
  return (
    <div className="mb-6">
      {breadcrumbs && <Breadcrumbs items={breadcrumbs} />}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight sm:text-[28px]">{title}</h1>
          {description && <p className="mt-1 text-sm text-muted sm:text-base">{description}</p>}
          {children}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
    </div>
  )
}

export function Breadcrumbs({ items }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-3">
      <ol className="flex flex-wrap items-center gap-1 text-sm text-muted">
        <li>
          <Link to="/app" className="flex items-center rounded p-0.5 hover:text-fg" aria-label="Home">
            <Home className="size-4" />
          </Link>
        </li>
        {items.map((it, i) => (
          <li key={i} className="flex items-center gap-1">
            <ChevronRight className="size-4 opacity-60" aria-hidden />
            {it.to && i < items.length - 1 ? (
              <Link to={it.to} className="hover:text-fg">{it.label}</Link>
            ) : (
              <span aria-current={i === items.length - 1 ? 'page' : undefined} className={i === items.length - 1 ? 'font-medium text-fg' : ''}>
                {it.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}

export function Tabs({ tabs, value, onChange, className, size = 'md' }) {
  return (
    <div className={cn('-mx-4 overflow-x-auto px-4 scrollbar-thin sm:mx-0 sm:px-0', className)}>
      <div role="tablist" className="inline-flex min-w-full gap-1 border-b border-line sm:min-w-0">
        {tabs.map((t) => {
          const v = typeof t === 'string' ? t : t.value
          const label = typeof t === 'string' ? t : t.label
          const active = v === value
          return (
            <button
              key={v}
              role="tab"
              aria-selected={active}
              onClick={() => onChange(v)}
              className={cn(
                'relative flex min-h-11 items-center gap-2 px-3 font-medium whitespace-nowrap transition-colors',
                size === 'sm' ? 'text-sm' : 'text-sm sm:text-[15px]',
                active ? 'text-brand-700 dark:text-brand-200' : 'text-muted hover:text-fg',
              )}
            >
              {t.icon && <t.icon className="size-4" aria-hidden />}
              {label}
              {t.count != null && (
                <span className={cn('rounded-full px-1.5 py-0.5 text-xs num', active ? 'bg-brand-100 text-brand-800 dark:bg-brand-500/20 dark:text-brand-100' : 'bg-subtle')}>{t.count}</span>
              )}
              {active && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-brand-700 dark:bg-brand-300" />}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function SegmentedControl({ options, value, onChange, label }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-lg border border-line bg-subtle p-1">
      {options.map((o) => {
        const v = typeof o === 'string' ? o : o.value
        const l = typeof o === 'string' ? o : o.label
        return (
          <button
            key={v}
            role="radio"
            aria-checked={value === v}
            onClick={() => onChange(v)}
            className={cn(
              'flex min-h-9 items-center gap-1.5 rounded-md px-3 text-sm font-medium transition-colors',
              value === v ? 'bg-card text-fg shadow-sm' : 'text-muted hover:text-fg',
            )}
          >
            {o.icon && <o.icon className="size-4" aria-hidden />}
            {l}
          </button>
        )
      })}
    </div>
  )
}

export function Stepper({ steps, current }) {
  return (
    <>
      <div className="sm:hidden" aria-live="polite">
        <p className="text-sm font-medium text-muted">
          Step {current + 1} of {steps.length}
        </p>
        <p className="font-semibold">{steps[current]}</p>
        <div className="mt-2 flex gap-1.5">
          {steps.map((_, i) => (
            <span key={i} className={cn('h-1.5 flex-1 rounded-full', i <= current ? 'bg-brand-600 dark:bg-brand-400' : 'bg-subtle')} />
          ))}
        </div>
      </div>
      <ol className="hidden items-center sm:flex" aria-label="Progress">
        {steps.map((s, i) => {
          const done = i < current
          const active = i === current
          return (
            <li key={s} className={cn('flex items-center', i < steps.length - 1 && 'flex-1')}>
              <div className="flex items-center gap-2.5" aria-current={active ? 'step' : undefined}>
                <span
                  className={cn(
                    'flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-colors',
                    done && 'bg-brand-700 text-white dark:bg-brand-400 dark:text-brand-950',
                    active && 'bg-brand-50 text-brand-800 ring-2 ring-brand-600 dark:bg-brand-500/20 dark:text-brand-100 dark:ring-brand-300',
                    !done && !active && 'bg-subtle text-muted',
                  )}
                >
                  {done ? <Check className="size-4" aria-hidden /> : i + 1}
                </span>
                <span className={cn('text-sm font-medium whitespace-nowrap', active || done ? 'text-fg' : 'text-muted')}>
                  {s}
                  {done && <span className="sr-only"> (completed)</span>}
                </span>
              </div>
              {i < steps.length - 1 && <span className={cn('mx-3 h-0.5 flex-1 rounded-full', done ? 'bg-brand-600 dark:bg-brand-400' : 'bg-line')} />}
            </li>
          )
        })}
      </ol>
    </>
  )
}

export function Avatar({ name, src, size = 'md', className }) {
  const sizes = { sm: 'size-8 text-xs', md: 'size-10 text-sm', lg: 'size-16 text-xl', xl: 'size-24 text-3xl' }
  return src ? (
    <img src={src} alt={name} className={cn('shrink-0 rounded-full object-cover', sizes[size], className)} />
  ) : (
    <span
      className={cn('flex shrink-0 items-center justify-center rounded-full bg-brand-100 font-semibold text-brand-800 dark:bg-brand-500/20 dark:text-brand-100', sizes[size], className)}
      aria-label={name}
      role="img"
    >
      {initials(name)}
    </span>
  )
}

export function StatCard({ label, value, sub, icon: Icon, tone = 'brand', trend, className }) {
  const tones = {
    brand: 'bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-200',
    success: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300',
    warning: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300',
    danger: 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300',
    info: 'bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300',
  }
  return (
    <Card className={cn('p-5', className)}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-muted">{label}</p>
        {Icon && (
          <span className={cn('flex size-9 items-center justify-center rounded-lg', tones[tone])}>
            <Icon className="size-[18px]" aria-hidden />
          </span>
        )}
      </div>
      <p className="mt-2 text-2xl font-bold tracking-tight num sm:text-[26px]">{value}</p>
      {(sub || trend) && (
        <p className="mt-1 flex flex-wrap items-center gap-1.5 text-sm text-muted">
          {trend}
          {sub}
        </p>
      )}
    </Card>
  )
}

// ---------- Tables ----------
export function Table({ children, className }) {
  return (
    <div className={cn('overflow-x-auto scrollbar-thin', className)}>
      <table className="w-full min-w-full border-separate border-spacing-0 text-sm">{children}</table>
    </div>
  )
}

export function Th({ children, sortKey, sort, onSort, className, align = 'left' }) {
  const active = !!sortKey && sort?.key === sortKey
  const Icon = !active ? ChevronsUpDown : sort.dir === 'asc' ? ChevronUp : ChevronDown
  return (
    <th
      scope="col"
      aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined}
      className={cn(
        'sticky top-0 z-10 border-b border-line bg-subtle/95 px-4 py-3 text-xs font-semibold tracking-wide text-muted uppercase backdrop-blur',
        align === 'right' ? 'text-right' : 'text-left',
        className,
      )}
    >
      {sortKey ? (
        <button onClick={() => onSort(sortKey)} className={cn('inline-flex items-center gap-1 uppercase hover:text-fg', align === 'right' && 'flex-row-reverse')}>
          {children}
          <Icon className="size-3.5" aria-hidden />
        </button>
      ) : (
        children
      )}
    </th>
  )
}

export function Td({ children, className, align = 'left', ...props }) {
  return (
    <td className={cn('border-b border-line px-4 py-3 align-middle', align === 'right' && 'text-right', className)} {...props}>
      {children}
    </td>
  )
}

export function useSort(rows, initial) {
  const [sort, setSort] = useState(initial)
  const sorted = useMemo(() => {
    if (!sort) return rows
    const arr = [...rows]
    arr.sort((a, b) => {
      const av = typeof sort.get === 'function' ? sort.get(a) : a[sort.key]
      const bv = typeof sort.get === 'function' ? sort.get(b) : b[sort.key]
      const cmp = typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av).localeCompare(String(bv), undefined, { numeric: true })
      return sort.dir === 'asc' ? cmp : -cmp
    })
    return arr
  }, [rows, sort])
  const onSort = (key) => setSort((s) => ({ key, dir: s?.key === key && s.dir === 'asc' ? 'desc' : 'asc' }))
  return { sorted, sort, onSort }
}

export function usePagination(rows, pageSize = 10) {
  const [page, setPage] = useState(1)
  const pages = Math.max(1, Math.ceil(rows.length / pageSize))
  useEffect(() => {
    if (page > pages) setPage(1)
  }, [pages, page])
  const pageRows = rows.slice((page - 1) * pageSize, page * pageSize)
  return { page, setPage, pages, pageRows, total: rows.length, pageSize }
}

export function Pagination({ page, pages, setPage, total, pageSize }) {
  if (total === 0) return null
  const from = (page - 1) * pageSize + 1
  const to = Math.min(total, page * pageSize)
  const nums = []
  for (let i = 1; i <= pages; i++) {
    if (i === 1 || i === pages || Math.abs(i - page) <= 1) nums.push(i)
    else if (nums[nums.length - 1] !== '…') nums.push('…')
  }
  return (
    <nav aria-label="Pagination" className="flex flex-col items-center justify-between gap-3 px-4 py-3 text-sm sm:flex-row">
      <p className="text-muted num">
        Showing <span className="font-medium text-fg">{from}</span> to <span className="font-medium text-fg">{to}</span> of{' '}
        <span className="font-medium text-fg">{total}</span>
      </p>
      <div className="flex items-center gap-1">
        <button onClick={() => setPage(page - 1)} disabled={page === 1} className="flex size-9 items-center justify-center rounded-lg border border-line hover:bg-subtle disabled:opacity-40" aria-label="Previous page">
          <ChevronLeft className="size-4" />
        </button>
        {nums.map((n, i) =>
          n === '…' ? (
            <span key={`e${i}`} className="px-1 text-muted">…</span>
          ) : (
            <button
              key={n}
              onClick={() => setPage(n)}
              aria-current={n === page ? 'page' : undefined}
              className={cn('flex size-9 items-center justify-center rounded-lg num', n === page ? 'bg-brand-800 font-semibold text-white dark:bg-brand-500' : 'hover:bg-subtle')}
            >
              {n}
            </button>
          ),
        )}
        <button onClick={() => setPage(page + 1)} disabled={page === pages} className="flex size-9 items-center justify-center rounded-lg border border-line hover:bg-subtle disabled:opacity-40" aria-label="Next page">
          <ChevronRight className="size-4" />
        </button>
      </div>
    </nav>
  )
}

export function FilterChips({ chips, onClear }) {
  if (!chips.length) return null
  return (
    <div className="flex flex-wrap items-center gap-2">
      {chips.map((c) => (
        <span key={c.key} className="inline-flex items-center gap-1 rounded-full border border-brand-200 bg-brand-50 py-1 pr-1 pl-3 text-xs font-medium text-brand-800 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-100">
          {c.label}
          <button onClick={c.onRemove} className="rounded-full p-0.5 hover:bg-brand-100 dark:hover:bg-brand-500/20" aria-label={`Remove filter ${c.label}`}>
            <X className="size-3.5" />
          </button>
        </span>
      ))}
      <button onClick={onClear} className="text-xs font-medium text-brand-700 hover:underline dark:text-brand-300">
        Clear all
      </button>
    </div>
  )
}

/** Simulates a network fetch so skeleton states are visible on first view. */
export function useFakeLoad(ms = 550, deps = []) {
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    setLoading(true)
    const t = setTimeout(() => setLoading(false), ms)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
  return loading
}

export function DefinitionList({ items, cols = 2 }) {
  return (
    <dl className={cn('grid gap-x-6 gap-y-4', cols === 2 ? 'sm:grid-cols-2' : cols === 3 ? 'sm:grid-cols-3' : '')}>
      {items.map(([k, v]) => (
        <div key={k} className="min-w-0">
          <dt className="text-xs font-medium tracking-wide text-muted uppercase">{k}</dt>
          <dd className="mt-1 text-sm font-medium break-words">{v}</dd>
        </div>
      ))}
    </dl>
  )
}
