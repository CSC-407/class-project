import { extendTailwindMerge } from 'tailwind-merge'

const nairaFmt = new Intl.NumberFormat('en-NG', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export function naira(value, { compact = false } = {}) {
  const n = Number(value) || 0
  if (compact) {
    const abs = Math.abs(n)
    if (abs >= 1e9) return `₦${(n / 1e9).toFixed(2)}B`
    if (abs >= 1e6) return `₦${(n / 1e6).toFixed(1)}M`
    if (abs >= 1e3) return `₦${(n / 1e3).toFixed(0)}K`
  }
  return `₦${nairaFmt.format(n)}`
}

export function formatDate(value, opts = {}) {
  if (!value) return '—'
  const d = new Date(value)
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', ...opts })
}

export function formatDateTime(value) {
  if (!value) return '—'
  const d = new Date(value)
  return `${formatDate(d)}, ${d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`
}

export function relativeTime(value) {
  const diff = (Date.now() - new Date(value).getTime()) / 1000
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)} hr ago`
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)} day${diff < 172800 ? '' : 's'} ago`
  return formatDate(value)
}

export function daysUntil(value) {
  const ms = new Date(value).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)
  return Math.round(ms / 86400000)
}

export function initials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('')
}

export function pad(n, len = 6) {
  return String(n).padStart(len, '0')
}

export function mmss(totalSeconds) {
  const s = Math.max(0, Math.ceil(totalSeconds))
  return `${pad(Math.floor(s / 60), 2)}:${pad(s % 60, 2)}`
}

const twMerge = extendTailwindMerge({
  extend: { theme: { shadow: ['soft', 'lift'] } },
})

/** Join class names; later Tailwind utilities override conflicting earlier ones. */
export function cn(...classes) {
  return twMerge(classes.filter(Boolean).join(' '))
}

/** Escape HTML special characters: the same output encoding a server template would apply. */
export function escapeHtml(str = '') {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
}

export function downloadCSV(filename, rows) {
  if (!rows.length) return
  const headers = Object.keys(rows[0])
  const esc = (v) => {
    const s = String(v ?? '')
    // Neutralise spreadsheet formula injection and quote values.
    const safe = /^[=+\-@]/.test(s) ? `'${s}` : s
    return `"${safe.replace(/"/g, '""')}"`
  }
  const csv = [headers.join(','), ...rows.map((r) => headers.map((h) => esc(r[h])).join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
