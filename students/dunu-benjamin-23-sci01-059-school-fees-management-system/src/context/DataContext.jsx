import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useAuth } from './AuthContext'
import { api } from '../lib/api'
import { CURRENT_SESSION, feeStatus } from '../lib/data'

// Holds the signed-in user's own fees, payments and notifications, loaded from the API.
// Admin pages load their own data per page with useApi().

const DataContext = createContext(null)
const EMPTY = { fees: [], payments: [], notifications: [] }

export function DataProvider({ children }) {
  const { user } = useAuth()
  const [data, setData] = useState(EMPTY)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const reload = useCallback(async () => {
    if (!user) return
    setError(null)
    try {
      const isStudent = user.role === 'student'
      const [fees, payments, notifications] = await Promise.all([
        isStudent ? api('/api/me/fees') : { fees: [] },
        isStudent ? api('/api/me/payments') : { payments: [] },
        api('/api/me/notifications'),
      ])
      setData({ fees: fees.fees, payments: payments.payments, notifications: notifications.notifications })
    } catch (e) {
      setError(e)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    setData(EMPTY)
    setLoading(true)
    if (user) reload()
  }, [user, reload])

  const reloadNotifications = useCallback(async () => {
    const res = await api('/api/me/notifications')
    setData((d) => ({ ...d, notifications: res.notifications }))
  }, [])

  const markNotification = useCallback(async (id, read = true) => {
    setData((d) => ({ ...d, notifications: d.notifications.map((n) => (id === 'all' || n.id === id ? { ...n, read } : n)) }))
    try {
      if (id === 'all') await api('/api/me/notifications/read-all', { method: 'POST', body: {} })
      else await api(`/api/me/notifications/${id}`, { method: 'PATCH', body: { read } })
    } catch {
      reloadNotifications().catch(() => {})
    }
  }, [reloadNotifications])

  const summary = useMemo(() => {
    const cur = data.fees.filter((f) => f.session === CURRENT_SESSION)
    const total = cur.reduce((s, f) => s + f.amount, 0)
    const paid = cur.reduce((s, f) => s + f.paid, 0)
    const owing = cur.filter((f) => f.amount - f.paid > 0).sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
    const overdue = owing.filter((f) => feeStatus(f) === 'overdue')
    const upcoming = owing.filter((f) => feeStatus(f) !== 'overdue')
    return { total, paid, outstanding: total - paid, percent: total ? Math.round((paid / total) * 100) : 0, next: upcoming[0] || owing[0] || null, overdue }
  }, [data.fees])

  const value = { ...data, loading, error, summary, reload, reloadNotifications, markNotification }
  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export const useData = () => useContext(DataContext)
